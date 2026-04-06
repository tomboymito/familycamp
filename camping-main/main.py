import uvicorn
from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import backend.BD.BD_alchemy as models
from backend.BD.bd_connect import get_db, engine
import uuid

# Импортируем ваши схемы
from backend.schemes.pyschemes import (
    AccommodationTypeCreate,
    AccommodationTypeResponse,
    GuestDataCreate,
    GuestDataResponse,
    BookingCreate,
    BookingResponse,
    ReviewCreate,
    ReviewResponse,
    BookingStatus
)

# Создаем таблицы в БД (если они еще не созданы)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Camping BD API",
    description="API системы бронирования кемпинга",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)


# Эндпоинты для типов размещения
@app.get("/accommodation-types", response_model=List[AccommodationTypeResponse], tags=["Accommodation Types"])
async def get_accommodation_types(db: Session = Depends(get_db)):
    """Получить все активные типы размещения"""
    types = db.query(models.AccommodationType).filter(models.AccommodationType.is_active == True).all()
    return types


@app.get("/accommodation-types/{type_id}", response_model=AccommodationTypeResponse, tags=["Accommodation Types"])
async def get_accommodation_type(type_id: int, db: Session = Depends(get_db)):
    """Получить тип размещения по ID"""
    accommodation_type = db.query(models.AccommodationType).filter(models.AccommodationType.id == type_id).first()
    if not accommodation_type:
        raise HTTPException(status_code=404, detail="Accommodation type not found")
    return accommodation_type


@app.post("/accommodation-types", response_model=AccommodationTypeResponse, tags=["Accommodation Types"])
async def create_accommodation_type(accommodation: AccommodationTypeCreate, db: Session = Depends(get_db)):
    """Создать новый тип размещения"""
    db_accommodation = models.AccommodationType(**accommodation.dict())
    db.add(db_accommodation)
    try:
        db.commit()
        db.refresh(db_accommodation)
        return db_accommodation
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Name or code already exists")


# Эндпоинты для гостей
@app.post("/guests", response_model=GuestDataResponse, tags=["Guests"])
async def create_guest(guest: GuestDataCreate, db: Session = Depends(get_db)):
    """Создать нового гостя"""
    db_guest = models.GuestData(**guest.dict())
    db.add(db_guest)
    try:
        db.commit()
        db.refresh(db_guest)
        return db_guest
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email or phone already exists")


@app.get("/guests", response_model=List[GuestDataResponse], tags=["Guests"])
async def get_guests(db: Session = Depends(get_db)):
    """Получить всех гостей"""
    guests = db.query(models.GuestData).all()
    return guests


@app.get("/guests/{guest_id}", response_model=GuestDataResponse, tags=["Guests"])
async def get_guest(guest_id: int, db: Session = Depends(get_db)):
    """Получить гостя по ID"""
    guest = db.query(models.GuestData).filter(models.GuestData.id == guest_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    return guest


# Эндпоинты для бронирований
@app.post("/bookings", response_model=BookingResponse, tags=["Bookings"])
async def create_booking(booking: BookingCreate, db: Session = Depends(get_db)):
    """Создать новое бронирование"""
    # Проверяем существование типа размещения и гостя
    accommodation = db.query(models.AccommodationType).filter(
        models.AccommodationType.id == booking.accommodation_type_id
    ).first()
    if not accommodation:
        raise HTTPException(status_code=404, detail="Accommodation type not found")

    guest = db.query(models.GuestData).filter(
        models.GuestData.id == booking.guest_data_id
    ).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    # Генерируем публичный ID
    public_order_id = f"ORDER_{uuid.uuid4().hex[:12].upper()}"

    db_booking = models.Booking(
        public_order_id=public_order_id,
        **booking.dict()
    )

    db.add(db_booking)
    try:
        db.commit()
        db.refresh(db_booking)
        return db_booking
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/bookings", response_model=List[BookingResponse], tags=["Bookings"])
async def get_bookings(status: Optional[BookingStatus] = None, db: Session = Depends(get_db)):
    """Получить все бронирования"""
    query = db.query(models.Booking)
    if status:
        query = query.filter(models.Booking.status == status)
    bookings = query.all()
    return bookings


@app.get("/bookings/{booking_id}", response_model=BookingResponse, tags=["Bookings"])
async def get_booking(booking_id: int, db: Session = Depends(get_db)):
    """Получить бронирование по ID"""
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@app.patch("/bookings/{booking_id}/status", response_model=BookingResponse, tags=["Bookings"])
async def update_booking_status(booking_id: int, status: BookingStatus, db: Session = Depends(get_db)):
    """Обновить статус бронирования"""
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.status = status
    try:
        db.commit()
        db.refresh(booking)
        return booking
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# Эндпоинты для отзывов
@app.post("/reviews", response_model=ReviewResponse, tags=["Reviews"])
async def create_review(review: ReviewCreate, db: Session = Depends(get_db)):
    """Создать новый отзыв"""
    db_review = models.Review(**review.dict())
    db.add(db_review)
    try:
        db.commit()
        db.refresh(db_review)
        return db_review
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Review with this external_id already exists")


@app.get("/reviews", response_model=List[ReviewResponse], tags=["Reviews"])
async def get_reviews(approved_only: bool = True, db: Session = Depends(get_db)):
    """Получить отзывы (только одобренные по умолчанию)"""
    query = db.query(models.Review)
    if approved_only:
        query = query.filter(models.Review.is_approved == True)
    reviews = query.order_by(models.Review.created_at.desc()).all()
    return reviews


@app.patch("/reviews/{review_id}/approval", response_model=ReviewResponse, tags=["Reviews"])
async def toggle_review_approval(review_id: int, is_approved: bool, db: Session = Depends(get_db)):
    """Изменить статус одобрения отзыва"""
    review = db.query(models.Review).filter(models.Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    review.is_approved = is_approved
    try:
        db.commit()
        db.refresh(review)
        return review
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# Эндпоинты для проверки доступности
@app.get("/availability/{accommodation_type_id}", tags=["Availability"])
async def check_availability(accommodation_type_id: int, date: str, db: Session = Depends(get_db)):
    """Проверить доступность типа размещения на конкретную дату"""
    try:
        check_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    availability = db.query(models.AvailabilityCache).filter(
        models.AvailabilityCache.accommodation_type_id == accommodation_type_id,
        models.AvailabilityCache.date == check_date
    ).first()

    if availability:
        return {
            "accommodation_type_id": accommodation_type_id,
            "date": check_date,
            "available_quantity": availability.available_quantity,
            "updated_at": availability.updated_at
        }
    else:
        return {
            "accommodation_type_id": accommodation_type_id,
            "date": check_date,
            "available_quantity": 0,
            "message": "No availability data found"
        }


# Системные эндпоинты
@app.get("/health", tags=["System"])
async def health_check(db: Session = Depends(get_db)):
    """Проверка здоровья API и подключения к БД"""
    try:
        # Пробуем выполнить простой запрос к БД
        db.execute(text('SELECT 1'))
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")


@app.get("/", tags=["System"])
async def root():
    """Корневой эндпоинт"""
    return {
        "message": "Camping BD API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }


if __name__ == "__main__":
    uvicorn.run("main:app", reload=True)
