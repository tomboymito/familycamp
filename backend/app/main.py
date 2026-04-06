from collections import defaultdict, deque
from datetime import date, datetime, timedelta
import os
from fastapi import Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session, joinedload
import secrets

from .crm import CrmGateway, write_crm_log
from .db import Base, engine, get_db
from .models import Booking, Customer, Spot
from .schemas import AvailabilityOut, BookingCreate, BookingOut, BookingStatusPatch

app = FastAPI(title="FamilyCamp API", version="1.0.0")
security = HTTPBasic()
crm = CrmGateway()
RATE_WINDOW_SECONDS = 60
RATE_LIMIT_PER_IP = 8
rate_buckets: dict[str, deque[datetime]] = defaultdict(deque)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    seed_spots()


def seed_spots():
    with next(get_db()) as db:
        if db.query(Spot).count() > 0:
            return
        db.add_all([
            Spot(name="Палаточное место", type="tent", capacity=4, is_active=True),
            Spot(name="Семейный домик", type="family_house", capacity=6, is_active=True),
            Spot(name="Домик у озера", type="lake_house", capacity=4, is_active=True),
        ])
        db.commit()


def enforce_rate_limit(request: Request):
    ip = request.client.host if request.client else "unknown"
    now = datetime.utcnow()
    bucket = rate_buckets[ip]
    while bucket and now - bucket[0] > timedelta(seconds=RATE_WINDOW_SECONDS):
        bucket.popleft()
    if len(bucket) >= RATE_LIMIT_PER_IP:
        raise HTTPException(status_code=429, detail="Too many requests")
    bucket.append(now)


def get_admin_user(credentials: HTTPBasicCredentials = Depends(security)):
    username = os.getenv("ADMIN_USERNAME", "admin")
    password = os.getenv("ADMIN_PASSWORD", "admin123")
    ok = secrets.compare_digest(credentials.username, username) and secrets.compare_digest(credentials.password, password)
    if not ok:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return credentials.username


def find_conflict(db: Session, spot_id: int, check_in: date, check_out: date, exclude_booking_id: int | None = None):
    predicates = [
        Booking.spot_id == spot_id,
        Booking.status != "cancelled",
        and_(Booking.check_in < check_out, Booking.check_out > check_in),
    ]
    if exclude_booking_id is not None:
        predicates.append(Booking.id != exclude_booking_id)
    return db.scalar(select(Booking).where(*predicates).limit(1))


@app.get("/availability", response_model=AvailabilityOut)
def availability(check_in: date, check_out: date, spot_id: int | None = None, spot_type: str | None = None, db: Session = Depends(get_db)):
    if check_out <= check_in:
        raise HTTPException(status_code=422, detail="check_out must be after check_in")
    spot = None
    if spot_id:
        spot = db.get(Spot, spot_id)
    elif spot_type:
        spot = db.scalar(select(Spot).where(Spot.type == spot_type, Spot.is_active.is_(True)).limit(1))
    if not spot:
        raise HTTPException(status_code=404, detail="spot not found")

    conflict = find_conflict(db, spot.id, check_in, check_out)
    if conflict:
        return AvailabilityOut(available=False, reason="dates_busy", conflicting_booking_id=conflict.id)
    return AvailabilityOut(available=True)


@app.post("/booking", response_model=BookingOut, status_code=201)
def create_booking(payload: BookingCreate, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(request)
    if payload.website:
        raise HTTPException(status_code=400, detail="spam detected")

    spot = db.get(Spot, payload.spot_id) if payload.spot_id else None
    if not spot and payload.spot_type:
        spot = db.scalar(select(Spot).where(Spot.type == payload.spot_type, Spot.is_active.is_(True)).limit(1))
    if not spot:
        raise HTTPException(status_code=404, detail="spot not found")
    if payload.guests > spot.capacity:
        raise HTTPException(status_code=422, detail="guests exceeds spot capacity")

    conflict = find_conflict(db, spot.id, payload.check_in, payload.check_out)
    if conflict:
        raise HTTPException(status_code=409, detail="dates busy")

    customer = Customer(name=payload.customer_name, phone=payload.customer_phone, email=payload.customer_email)
    db.add(customer)
    db.flush()

    booking = Booking(
        customer_id=customer.id,
        spot_id=spot.id,
        check_in=payload.check_in,
        check_out=payload.check_out,
        guests=payload.guests,
        status="new",
        comment=payload.comment,
        crm_status="pending",
    )
    db.add(booking)
    db.flush()

    booking = db.scalar(select(Booking).options(joinedload(Booking.customer), joinedload(Booking.spot)).where(Booking.id == booking.id))
    sent, message, crm_payload = crm.send(booking)
    booking.crm_status = "sent" if sent else "crm_error"
    if not sent:
        booking.status = "crm_error"
    write_crm_log(db, booking.id, booking.crm_status, "" if sent else message, crm_payload)

    db.commit()
    db.refresh(booking)
    return booking


@app.get("/admin/bookings", response_model=list[BookingOut])
def admin_bookings(
    _: str = Depends(get_admin_user),
    status_filter: str | None = Query(default=None, alias="status"),
    spot_id: int | None = None,
    customer_phone: str | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    db: Session = Depends(get_db),
):
    q = select(Booking)
    if status_filter:
        q = q.where(Booking.status == status_filter)
    if spot_id:
        q = q.where(Booking.spot_id == spot_id)
    if customer_phone:
        q = q.join(Customer).where(Customer.phone.contains(customer_phone))
    if from_date:
        q = q.where(Booking.check_out >= from_date)
    if to_date:
        q = q.where(Booking.check_in <= to_date)
    q = q.order_by(Booking.check_in.asc())
    return list(db.scalars(q).all())


@app.patch("/booking/{booking_id}", response_model=BookingOut)
def patch_booking(booking_id: int, payload: BookingStatusPatch, _: str = Depends(get_admin_user), db: Session = Depends(get_db)):
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="booking not found")
    booking.status = payload.status
    db.commit()
    db.refresh(booking)
    return booking


@app.post("/crm/retry", response_model=BookingOut)
def retry_crm(booking_id: int, _: str = Depends(get_admin_user), db: Session = Depends(get_db)):
    booking = db.scalar(select(Booking).options(joinedload(Booking.customer), joinedload(Booking.spot)).where(Booking.id == booking_id))
    if not booking:
        raise HTTPException(status_code=404, detail="booking not found")
    sent, message, crm_payload = crm.send(booking)
    booking.crm_status = "sent" if sent else "crm_error"
    booking.status = booking.status if sent else "crm_error"
    write_crm_log(db, booking.id, booking.crm_status, "" if sent else message, crm_payload)
    db.commit()
    db.refresh(booking)
    return booking
