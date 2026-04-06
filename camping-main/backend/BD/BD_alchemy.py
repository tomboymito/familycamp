from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Boolean, ForeignKey, Enum as SQLEnum, DECIMAL, SmallInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.BD.bd_connect import Base
import enum

class BookingStatus(enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"
    failed = "failed"

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    external_id = Column(String(255), unique=True, nullable=False)
    author_name = Column(String(255), nullable=False)
    avatar_url = Column(Text)
    rating = Column(Integer, nullable=False)  # CHECK constraint будет в БД
    text = Column(Text)
    created_at = Column(DateTime, nullable=False)
    parsed_at = Column(DateTime, server_default=func.now())
    is_approved = Column(Boolean, default=True)

class AccommodationType(Base):
    __tablename__ = "accommodation_types"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    base_price = Column(Integer, nullable=False)
    capacity = Column(SmallInteger, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)

class AvailabilityCache(Base):
    __tablename__ = "availability_cache"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    accommodation_type_id = Column(Integer, ForeignKey('accommodation_types.id', ondelete='CASCADE'), nullable=False)
    date = Column(Date, nullable=False)
    available_quantity = Column(Integer, default=0)
    updated_at = Column(DateTime, server_default=func.now())

    accommodation_type = relationship("AccommodationType")

class GuestData(Base):
    __tablename__ = "guest_data"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255))
    surname = Column(String(255))
    email = Column(String(255), unique=True)
    number_phone = Column(Integer)  # Изменено с BIGINT на Integer для совместимости

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    public_order_id = Column(String(50), comment="Публичный UUID для платежей")
    accommodation_type_id = Column(Integer, ForeignKey('accommodation_types.id', ondelete='CASCADE'), nullable=False)
    guest_data_id = Column(Integer, ForeignKey('guest_data.id'), nullable=False)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    number_nights = Column(Integer)
    total_amount = Column(DECIMAL(10, 2))
    status = Column(SQLEnum(BookingStatus), default=BookingStatus.pending)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    accommodation_type = relationship("AccommodationType")
    guest_data = relationship("GuestData")