from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Date,
    Boolean,
    ForeignKey,
    Enum as SQLEnum,
    DECIMAL,
    SmallInteger,
    Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base
import enum


class BookingStatus(enum.Enum):
    new = "new"
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"
    crm_error = "crm_error"


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    external_id = Column(String(255), unique=True, nullable=False)
    author_name = Column(String(255), nullable=False)
    avatar_url = Column(Text)
    rating = Column(Integer, nullable=False)
    text = Column(Text)
    created_at = Column(DateTime, nullable=False)
    parsed_at = Column(DateTime, server_default=func.now())
    is_approved = Column(Boolean, default=True)


# Legacy table. Keep during migration window.
class AccommodationType(Base):
    __tablename__ = "accommodation_types"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    base_price = Column(Integer, nullable=False)
    capacity = Column(SmallInteger, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)


# Target table for v1 booking flow.
class Spot(Base):
    __tablename__ = "spots"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    type = Column(String(50), nullable=False)
    capacity = Column(SmallInteger, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class AvailabilityCache(Base):
    __tablename__ = "availability_cache"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    accommodation_type_id = Column(Integer, ForeignKey("accommodation_types.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    available_quantity = Column(Integer, default=0)
    updated_at = Column(DateTime, server_default=func.now())

    accommodation_type = relationship("AccommodationType")


# Legacy table. Keep during migration window.
class GuestData(Base):
    __tablename__ = "guest_data"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255))
    surname = Column(String(255))
    email = Column(String(255), unique=True)
    number_phone = Column(Integer)


# Target table for v1 booking flow.
class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(32), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    public_order_id = Column(String(50), unique=True, index=True, comment="Публичный UUID для платежей")

    # Legacy links (kept for compatibility during migration)
    accommodation_type_id = Column(Integer, ForeignKey("accommodation_types.id", ondelete="CASCADE"), nullable=True)
    guest_data_id = Column(Integer, ForeignKey("guest_data.id"), nullable=True)

    # Target links
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)
    spot_id = Column(Integer, ForeignKey("spots.id", ondelete="SET NULL"), nullable=True, index=True)

    # Legacy fields
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    number_nights = Column(Integer)
    total_amount = Column(DECIMAL(10, 2))

    # Target fields
    check_in = Column(Date, nullable=True, index=True)
    check_out = Column(Date, nullable=True, index=True)
    guests_count = Column(SmallInteger, nullable=True)
    comment = Column(Text, nullable=True)
    crm_sync_status = Column(String(32), nullable=False, default="pending", server_default="pending")

    status = Column(SQLEnum(BookingStatus), default=BookingStatus.new, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    accommodation_type = relationship("AccommodationType")
    guest_data = relationship("GuestData")
    customer = relationship("Customer")
    spot = relationship("Spot")

    __table_args__ = (
        Index("ix_bookings_dates_status", "check_in", "check_out", "status"),
    )


class CrmSyncLog(Base):
    __tablename__ = "crm_sync_log"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    request_payload = Column(Text, nullable=True)
    response_payload = Column(Text, nullable=True)
    status = Column(String(32), nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    booking = relationship("Booking")
