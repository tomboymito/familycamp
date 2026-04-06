from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from enum import Enum


class BookingStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"
    failed = "failed"


# Accommodation Types
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


# Guest Data
class GuestDataBase(BaseModel):
    name: str
    surname: str
    email: str
    number_phone: int


class GuestDataCreate(GuestDataBase):
    pass


class GuestDataResponse(GuestDataBase):
    id: int

    class Config:
        from_attributes = True


# Bookings
class BookingBase(BaseModel):
    accommodation_type_id: int
    guest_data_id: int
    start_date: datetime
    end_date: datetime
    number_nights: int
    total_amount: float


class BookingCreate(BookingBase):
    pass


class BookingResponse(BookingBase):
    id: int
    public_order_id: Optional[str] = None
    status: BookingStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Reviews
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


# Availability
class AvailabilityResponse(BaseModel):
    accommodation_type_id: int
    date: date
    available_quantity: int
    updated_at: datetime