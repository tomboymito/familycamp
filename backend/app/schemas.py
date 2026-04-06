from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

BOOKING_STATUSES = {"new", "pending", "confirmed", "cancelled", "crm_error"}


class BookingCreate(BaseModel):
    check_in: date
    check_out: date
    spot_id: int | None = None
    spot_type: str | None = None
    guests: int = Field(alias="guests_count", ge=1)
    customer_name: str = Field(min_length=2)
    customer_phone: str = Field(min_length=7, max_length=32)
    customer_email: EmailStr
    comment: str = ""
    website: str = ""

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("check_out")
    @classmethod
    def validate_dates(cls, value: date, info):
        check_in = info.data.get("check_in")
        if check_in and value <= check_in:
            raise ValueError("check_out must be after check_in")
        return value


class BookingStatusPatch(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str):
        if value not in BOOKING_STATUSES:
            raise ValueError("invalid status")
        return value


class BookingOut(BaseModel):
    id: int
    customer_id: int
    spot_id: int
    check_in: date
    check_out: date
    guests: int
    status: str
    comment: str
    crm_status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AvailabilityOut(BaseModel):
    available: bool
    reason: str | None = None
    conflicting_booking_id: int | None = None
