from datetime import date
from pathlib import Path

from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from backend.app.config import settings
from backend.app.database import Base, SessionLocal, engine, get_db
from backend.app.models import Booking, BookingStatus, Spot, SpotBlock
from backend.app.schemas import (
    AvailabilityRequest,
    AvailabilityResponse,
    BlockCreate,
    BookingCreate,
    BookingGridItem,
    BookingOut,
    BookingStatusUpdate,
    LoginRequest,
    SpotOut,
    TokenResponse,
)
from backend.app.security import create_access_token, decode_access_token
from backend.app.services import (
    enforce_rate_limit,
    get_or_create_customer,
    has_date_overlap,
    payload_fingerprint,
    prevent_duplicate_submission,
    sync_booking_to_crm,
)

app = FastAPI(title=settings.app_name)
security = HTTPBearer(auto_error=False)
FRONTEND_DIR = Path("frontend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if db.scalar(select(Spot.id).limit(1)) is None:
            db.add_all(
                [
                    Spot(name="A1", type="autodom", capacity=4),
                    Spot(name="A2", type="autodom", capacity=4),
                    Spot(name="T1", type="tent", capacity=3),
                    Spot(name="T2", type="tent", capacity=3),
                ]
            )
            db.commit()


@app.get("/")
def serve_home() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/admin")
def serve_admin() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "admin.html")


app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")


def require_admin_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Требуется авторизация")
    try:
        payload = decode_access_token(credentials.credentials)
        return str(payload["sub"])
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Некорректный токен") from exc


@app.post(f"{settings.api_prefix}/admin/login", response_model=TokenResponse)
def admin_login(payload: LoginRequest) -> TokenResponse:
    if payload.username != settings.admin_username or payload.password != settings.admin_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный логин или пароль")
    return TokenResponse(access_token=create_access_token(payload.username))


@app.get(f"{settings.api_prefix}/spots", response_model=list[SpotOut])
def list_spots(db: Session = Depends(get_db)) -> list[Spot]:
    return db.scalars(select(Spot).where(Spot.is_active.is_(True)).order_by(Spot.name)).all()


@app.post(f"{settings.api_prefix}/availability", response_model=AvailabilityResponse)
def check_availability(payload: AvailabilityRequest, db: Session = Depends(get_db)) -> AvailabilityResponse:
    if has_date_overlap(db, payload.spot_id, payload.check_in, payload.check_out):
        return AvailabilityResponse(available=False, reason="Место недоступно на выбранные даты")
    return AvailabilityResponse(available=True)


@app.post(f"{settings.api_prefix}/bookings", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: BookingCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    x_forwarded_for: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> Booking:
    if payload.hidden_field:
        raise HTTPException(status_code=400, detail="Подозрительный запрос")

    client_ip = (x_forwarded_for.split(",")[0].strip() if x_forwarded_for else request.client.host) or "unknown"
    try:
        enforce_rate_limit(client_ip)
        prevent_duplicate_submission(payload_fingerprint(payload.model_dump(mode="json", exclude={"anti_spam_token", "hidden_field"})))
    except ValueError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc

    if has_date_overlap(db, payload.spot_id, payload.check_in, payload.check_out):
        raise HTTPException(status_code=409, detail="Выбранные даты уже заняты")

    customer = get_or_create_customer(db, payload.full_name, payload.phone, payload.email)
    booking = Booking(
        customer_id=customer.id,
        spot_id=payload.spot_id,
        check_in=payload.check_in,
        check_out=payload.check_out,
        guests_count=payload.guests_count,
        status=BookingStatus.NEW,
        comment=payload.comment,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    background_tasks.add_task(sync_booking_to_crm, db, booking)
    return booking


@app.get(f"{settings.api_prefix}/bookings", response_model=list[BookingOut])
def list_bookings(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    status_filter: BookingStatus | None = Query(default=None),
    spot_id: int | None = Query(default=None),
    _: str = Depends(require_admin_token),
    db: Session = Depends(get_db),
) -> list[Booking]:
    query = select(Booking).options(joinedload(Booking.customer)).order_by(Booking.check_in.desc())
    if date_from:
        query = query.where(Booking.check_in >= date_from)
    if date_to:
        query = query.where(Booking.check_out <= date_to)
    if status_filter:
        query = query.where(Booking.status == status_filter)
    if spot_id:
        query = query.where(Booking.spot_id == spot_id)
    return db.scalars(query).all()


@app.get(f"{settings.api_prefix}/bookings/grid", response_model=list[BookingGridItem])
def bookings_grid(
    date_from: date,
    date_to: date,
    _: str = Depends(require_admin_token),
    db: Session = Depends(get_db),
) -> list[BookingGridItem]:
    query = (
        select(Booking)
        .options(joinedload(Booking.customer))
        .where(Booking.check_in < date_to, Booking.check_out > date_from)
        .where(Booking.status != BookingStatus.CANCELLED)
    )
    items = db.scalars(query).all()
    return [
        BookingGridItem(
            booking_id=item.id,
            spot_id=item.spot_id,
            check_in=item.check_in,
            check_out=item.check_out,
            status=item.status,
            customer_name=item.customer.full_name,
        )
        for item in items
    ]


@app.get(f"{settings.api_prefix}/bookings/{{booking_id}}", response_model=BookingOut)
def booking_details(booking_id: int, _: str = Depends(require_admin_token), db: Session = Depends(get_db)) -> Booking:
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Бронь не найдена")
    return booking


@app.patch(f"{settings.api_prefix}/bookings/{{booking_id}}/status", response_model=BookingOut)
def update_booking_status(
    booking_id: int,
    payload: BookingStatusUpdate,
    _: str = Depends(require_admin_token),
    db: Session = Depends(get_db),
) -> Booking:
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Бронь не найдена")
    booking.status = payload.status
    db.commit()
    db.refresh(booking)
    return booking


@app.post(f"{settings.api_prefix}/bookings/{{booking_id}}/resync-crm", response_model=BookingOut)
async def resync_crm(booking_id: int, _: str = Depends(require_admin_token), db: Session = Depends(get_db)) -> Booking:
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Бронь не найдена")
    await sync_booking_to_crm(db, booking)
    db.refresh(booking)
    return booking


@app.post(f"{settings.api_prefix}/blocks", status_code=status.HTTP_201_CREATED)
def create_block(payload: BlockCreate, _: str = Depends(require_admin_token), db: Session = Depends(get_db)) -> dict:
    if payload.date_to <= payload.date_from:
        raise HTTPException(status_code=422, detail="Неверный диапазон дат")
    if has_date_overlap(db, payload.spot_id, payload.date_from, payload.date_to):
        raise HTTPException(status_code=409, detail="Нельзя заблокировать: есть активная бронь")
    block = SpotBlock(
        spot_id=payload.spot_id,
        date_from=payload.date_from,
        date_to=payload.date_to,
        reason=payload.reason,
        created_by="admin",
    )
    db.add(block)
    db.commit()
    return {"ok": True, "message": "Блокировка создана"}
