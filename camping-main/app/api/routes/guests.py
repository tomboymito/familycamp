from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import app.models as models
from app.db import get_db
from app.schemas import GuestDataCreate, GuestDataResponse

router = APIRouter(prefix="/guests", tags=["Guests"])


@router.post("", response_model=GuestDataResponse)
async def create_guest(guest: GuestDataCreate, db: Session = Depends(get_db)):
    db_guest = models.GuestData(**guest.model_dump())
    db.add(db_guest)
    try:
        db.commit()
        db.refresh(db_guest)
        return db_guest
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email or phone already exists")


@router.get("", response_model=list[GuestDataResponse])
async def get_guests(db: Session = Depends(get_db)):
    return db.query(models.GuestData).all()


@router.get("/{guest_id}", response_model=GuestDataResponse)
async def get_guest(guest_id: int, db: Session = Depends(get_db)):
    guest = db.query(models.GuestData).filter(models.GuestData.id == guest_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    return guest
