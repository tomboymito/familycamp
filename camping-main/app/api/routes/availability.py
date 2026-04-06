from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import app.models as models
from app.db import get_db

router = APIRouter(prefix="/availability", tags=["Availability"])

ACTIVE_BOOKING_STATUSES = (
    models.BookingStatus.new,
    models.BookingStatus.pending,
    models.BookingStatus.confirmed,
)


@router.get("/{accommodation_type_id}")
async def check_legacy_availability(accommodation_type_id: int, date: str, db: Session = Depends(get_db)):
    try:
        check_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    availability = db.query(models.AvailabilityCache).filter(
        models.AvailabilityCache.accommodation_type_id == accommodation_type_id,
        models.AvailabilityCache.date == check_date,
    ).first()

    if availability:
        return {
            "accommodation_type_id": accommodation_type_id,
            "date": check_date,
            "available_quantity": availability.available_quantity,
            "updated_at": availability.updated_at,
        }

    return {
        "accommodation_type_id": accommodation_type_id,
        "date": check_date,
        "available_quantity": 0,
        "message": "No availability data found",
    }


@router.get("/spot/{spot_id}")
async def check_spot_availability(
    spot_id: int,
    check_in: str = Query(..., description="YYYY-MM-DD"),
    check_out: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    try:
        start = datetime.strptime(check_in, "%Y-%m-%d").date()
        end = datetime.strptime(check_out, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    if end <= start:
        raise HTTPException(status_code=422, detail="Check-out date must be later than check-in date")

    spot = db.query(models.Spot).filter(models.Spot.id == spot_id, models.Spot.is_active.is_(True)).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found or inactive")

    overlapping_booking = (
        db.query(models.Booking)
        .filter(
            models.Booking.spot_id == spot_id,
            models.Booking.status.in_(ACTIVE_BOOKING_STATUSES),
            models.Booking.check_in < end,
            models.Booking.check_out > start,
        )
        .first()
    )

    return {
        "spot_id": spot_id,
        "check_in": start,
        "check_out": end,
        "is_available": overlapping_booking is None,
    }
