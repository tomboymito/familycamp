from fastapi import APIRouter

from app.api.routes import accommodation, availability, bookings, guests, reviews, system

api_router = APIRouter()
api_router.include_router(system.router)
api_router.include_router(accommodation.router)
api_router.include_router(guests.router)
api_router.include_router(bookings.router)
api_router.include_router(reviews.router)
api_router.include_router(availability.router)
