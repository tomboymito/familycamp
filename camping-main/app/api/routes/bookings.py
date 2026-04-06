import json
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, joinedload

import backend.BD.BD_alchemy as models
from app.services.crm import sync_booking_to_crm
from app.services.request_guard import idempotency_store, rate_limiter
from backend.BD.bd_connect import get_db
from backend.schemes.pyschemes import BookingCreate, BookingResponse, BookingStatus

router = APIRouter(prefix="/bookings", tags=["Bookings"])

ACTIVE_BOOKING_STATUSES = (
    models.BookingStatus.new,
    models.BookingStatus.pending,
    models.BookingStatus.confirmed,
)


def _sync_to_crm_and_log(db: Session, booking: models.Booking) -> models.Booking:
    booking_with_relations = (
        db.query(models.Booking)
        .options(joinedload(models.Booking.customer), joinedload(models.Booking.spot))
        .filter(models.Booking.id == booking.id)
        .first()
    )

    sync_result = sync_booking_to_crm(booking_with_relations)

    crm_log = models.CrmSyncLog(
        booking_id=booking.id,
        request_payload=json.dumps({"booking_id": booking.id}),
        response_payload=sync_result.response_payload,
        status=sync_result.status,
        error_message=sync_result.error_message,
    )
    db.add(crm_log)

    if sync_result.ok:
        booking.crm_sync_status = "synced"
        if booking.status == models.BookingStatus.new:
            booking.status = models.BookingStatus.pending
    else:
        booking.crm_sync_status = "error"
        booking.status = models.BookingStatus.crm_error

    db.commit()
    db.refresh(booking)
    return booking


@router.post("", response_model=BookingResponse)
async def create_booking(
    booking: BookingCreate,
    request: Request,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
):
    client_ip = request.client.host if request.client else "unknown"
    if not rate_limiter.allow(client_ip):
        raise HTTPException(status_code=429, detail="Too many booking attempts. Please try again later")

    if booking.website:
        raise HTTPException(status_code=400, detail="Spam detected")

    if idempotency_key:
        existing_booking_id = idempotency_store.get(idempotency_key)
        if existing_booking_id:
            existing_booking = db.query(models.Booking).filter(models.Booking.id == existing_booking_id).first()
            if existing_booking:
                return existing_booking

    if booking.check_out <= booking.check_in:
        raise HTTPException(status_code=422, detail="Check-out date must be later than check-in date")

    spot = db.query(models.Spot).filter(models.Spot.id == booking.spot_id, models.Spot.is_active.is_(True)).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found or inactive")

    if booking.guests_count > spot.capacity:
        raise HTTPException(status_code=400, detail="Guests count exceeds spot capacity")

    overlapping_booking = (
        db.query(models.Booking)
        .filter(
            models.Booking.spot_id == booking.spot_id,
            models.Booking.status.in_(ACTIVE_BOOKING_STATUSES),
            models.Booking.check_in < booking.check_out,
            models.Booking.check_out > booking.check_in,
        )
        .first()
    )
    if overlapping_booking:
        raise HTTPException(status_code=409, detail="Selected dates are unavailable")

    customer = (
        db.query(models.Customer)
        .filter(
            or_(
                models.Customer.email == booking.customer_email,
                and_(
                    models.Customer.phone == booking.customer_phone,
                    models.Customer.name == booking.customer_name,
                ),
            )
        )
        .first()
    )

    if not customer:
        customer = models.Customer(
            name=booking.customer_name,
            phone=booking.customer_phone,
            email=booking.customer_email,
        )
        db.add(customer)
        db.flush()

    public_order_id = f"ORDER_{uuid.uuid4().hex[:12].upper()}"
    nights = (booking.check_out - booking.check_in).days

    db_booking = models.Booking(
        public_order_id=public_order_id,
        status=models.BookingStatus.new,
        crm_sync_status="pending",
        customer_id=customer.id,
        spot_id=booking.spot_id,
        check_in=booking.check_in,
        check_out=booking.check_out,
        guests_count=booking.guests_count,
        comment=booking.comment,
        accommodation_type_id=booking.accommodation_type_id,
        guest_data_id=booking.guest_data_id,
        start_date=datetime.combine(booking.check_in, datetime.min.time()),
        end_date=datetime.combine(booking.check_out, datetime.min.time()),
        number_nights=nights,
        total_amount=booking.total_amount,
    )

    db.add(db_booking)
    try:
        db.commit()
        db.refresh(db_booking)
        synced_booking = _sync_to_crm_and_log(db, db_booking)
        if idempotency_key:
            idempotency_store.set(idempotency_key, synced_booking.id)
        return synced_booking
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create booking: {str(e)}")


@router.get("", response_model=list[BookingResponse])
async def get_bookings(
    status: BookingStatus | None = None,
    spot_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(models.Booking)
    if status:
        query = query.filter(models.Booking.status == status)
    if spot_id:
        query = query.filter(models.Booking.spot_id == spot_id)
    return query.order_by(models.Booking.created_at.desc()).all()


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(booking_id: int, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@router.patch("/{booking_id}/status", response_model=BookingResponse)
async def update_booking_status(booking_id: int, status: BookingStatus, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.status = models.BookingStatus(status.value)
    try:
        db.commit()
        db.refresh(booking)
        return booking
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{booking_id}/crm/resend", response_model=BookingResponse)
async def resend_booking_to_crm(booking_id: int, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    try:
        return _sync_to_crm_and_log(db, booking)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
