from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import backend.BD.BD_alchemy as models
from backend.BD.bd_connect import get_db
from backend.schemes.pyschemes import AccommodationTypeCreate, AccommodationTypeResponse

router = APIRouter(prefix="/accommodation-types", tags=["Accommodation Types"])


@router.get("", response_model=list[AccommodationTypeResponse])
async def get_accommodation_types(db: Session = Depends(get_db)):
    types = db.query(models.AccommodationType).filter(models.AccommodationType.is_active.is_(True)).all()
    return types


@router.get("/{type_id}", response_model=AccommodationTypeResponse)
async def get_accommodation_type(type_id: int, db: Session = Depends(get_db)):
    accommodation_type = db.query(models.AccommodationType).filter(models.AccommodationType.id == type_id).first()
    if not accommodation_type:
        raise HTTPException(status_code=404, detail="Accommodation type not found")
    return accommodation_type


@router.post("", response_model=AccommodationTypeResponse)
async def create_accommodation_type(accommodation: AccommodationTypeCreate, db: Session = Depends(get_db)):
    db_accommodation = models.AccommodationType(**accommodation.model_dump())
    db.add(db_accommodation)
    try:
        db.commit()
        db.refresh(db_accommodation)
        return db_accommodation
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Name or code already exists")
