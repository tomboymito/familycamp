from datetime import datetime, date
from enum import Enum

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database import Base


class BookingStatus(str, Enum):
    NEW = "new"
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    BLOCKED = "blocked"
    CRM_ERROR = "crm_error"


class CRMSyncStatus(str, Enum):
    PENDING = "pending"
    SUCCESS = "success"
    ERROR = "error"


class Spot(Base):
    __tablename__ = "spots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    service_params: Mapped[str | None] = mapped_column(Text)

    bookings: Mapped[list["Booking"]] = relationship(back_populates="spot")


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    full_name: Mapped[str] = mapped_column(String(180), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    bookings: Mapped[list["Booking"]] = relationship(back_populates="customer")


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False)
    spot_id: Mapped[int] = mapped_column(ForeignKey("spots.id"), nullable=False)
    check_in: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    check_out: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    guests_count: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[BookingStatus] = mapped_column(SAEnum(BookingStatus), default=BookingStatus.NEW)
    comment: Mapped[str | None] = mapped_column(Text)
    crm_sync_status: Mapped[CRMSyncStatus] = mapped_column(SAEnum(CRMSyncStatus), default=CRMSyncStatus.PENDING)
    crm_entity_id: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer: Mapped[Customer] = relationship(back_populates="bookings")
    spot: Mapped[Spot] = relationship(back_populates="bookings")
    crm_logs: Mapped[list["CRMLog"]] = relationship(back_populates="booking")


class SpotBlock(Base):
    __tablename__ = "spot_blocks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    spot_id: Mapped[int] = mapped_column(ForeignKey("spots.id"), nullable=False)
    date_from: Mapped[date] = mapped_column(Date, nullable=False)
    date_to: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[str] = mapped_column(String(100), default="system")


class CRMLog(Base):
    __tablename__ = "crm_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id"), nullable=False)
    request_payload: Mapped[str] = mapped_column(Text, nullable=False)
    response_payload: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    booking: Mapped[Booking] = relationship(back_populates="crm_logs")
