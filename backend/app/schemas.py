from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from backend.app.models import BookingStatus, CRMSyncStatus


class BookingCreate(BaseModel):
    check_in: date
    check_out: date
    spot_id: int
    guests_count: int = Field(ge=1)
    full_name: str = Field(min_length=2, max_length=180)
    phone: str = Field(min_length=6, max_length=30)
    email: EmailStr
    comment: str | None = Field(default=None, max_length=3000)
    vehicle_number: str | None = Field(default=None, max_length=50)
    transport_type: str | None = Field(default=None, max_length=50)
    anti_spam_token: str | None = None
    hidden_field: str | None = None

    @field_validator("check_out")
    @classmethod
    def validate_dates(cls, value: date, info):
        check_in = info.data.get("check_in")
        if check_in and value <= check_in:
            raise ValueError("Дата выезда должна быть позже даты заезда")
        return value


class BookingOut(BaseModel):
    id: int
    check_in: date
    check_out: date
    guests_count: int
    status: BookingStatus
    crm_sync_status: CRMSyncStatus
    comment: str | None
    spot_id: int
    customer_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class BookingStatusUpdate(BaseModel):
    status: BookingStatus


class BlockCreate(BaseModel):
    spot_id: int
    date_from: date
    date_to: date
    reason: str | None = None


class SpotOut(BaseModel):
    id: int
    name: str
    type: str
    capacity: int
    is_active: bool

    model_config = {"from_attributes": True}


class AvailabilityRequest(BaseModel):
    spot_id: int
    check_in: date
    check_out: date


class AvailabilityResponse(BaseModel):
    available: bool
    reason: str | None = None


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"


class BookingGridItem(BaseModel):
    booking_id: int
    spot_id: int
    check_in: date
    check_out: date
    status: BookingStatus
    customer_name: str
