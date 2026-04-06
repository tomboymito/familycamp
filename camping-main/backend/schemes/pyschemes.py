from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class BookingStatus(str, Enum):
    new = "new"
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"
    crm_error = "crm_error"


class AccommodationTypeBase(BaseModel):
    name: str
    code: str
    base_price: int
    capacity: int
    description: Optional[str] = None
    is_active: bool = True


class AccommodationTypeCreate(AccommodationTypeBase):
    pass


class AccommodationTypeResponse(AccommodationTypeBase):
    id: int

    class Config:
        from_attributes = True


class GuestDataBase(BaseModel):
    name: str
    surname: str
    email: EmailStr
    number_phone: int


class GuestDataCreate(GuestDataBase):
    pass


class GuestDataResponse(GuestDataBase):
    id: int

    class Config:
        from_attributes = True


class BookingBase(BaseModel):
    accommodation_type_id: Optional[int] = None
    guest_data_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    number_nights: Optional[int] = None
    total_amount: Optional[float] = None

    spot_id: int
    check_in: date
    check_out: date
    guests_count: int = Field(ge=1, le=20)
    comment: Optional[str] = None

    customer_name: str
    customer_phone: str = Field(min_length=7, max_length=32)
    customer_email: EmailStr
    website: Optional[str] = None  # honeypot field


class BookingCreate(BookingBase):
    pass


class BookingResponse(BaseModel):
    id: int
    public_order_id: Optional[str] = None

    spot_id: Optional[int] = None
    customer_id: Optional[int] = None
    check_in: Optional[date] = None
    check_out: Optional[date] = None
    guests_count: Optional[int] = None
    comment: Optional[str] = None
    crm_sync_status: str

    status: BookingStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReviewBase(BaseModel):
    external_id: str
    author_name: str
    avatar_url: Optional[str] = None
    rating: int
    text: Optional[str] = None
    created_at: datetime


class ReviewCreate(ReviewBase):
    pass


class ReviewResponse(ReviewBase):
    id: int
    parsed_at: datetime
    is_approved: bool

    class Config:
        from_attributes = True


class AvailabilityResponse(BaseModel):
    accommodation_type_id: int
    date: date
    available_quantity: int
    updated_at: datetime
