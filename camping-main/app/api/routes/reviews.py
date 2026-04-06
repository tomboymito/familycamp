from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import backend.BD.BD_alchemy as models
from backend.BD.bd_connect import get_db
from backend.schemes.pyschemes import ReviewCreate, ReviewResponse

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.post("", response_model=ReviewResponse)
async def create_review(review: ReviewCreate, db: Session = Depends(get_db)):
    db_review = models.Review(**review.model_dump())
    db.add(db_review)
    try:
        db.commit()
        db.refresh(db_review)
        return db_review
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Review with this external_id already exists")


@router.get("", response_model=list[ReviewResponse])
async def get_reviews(approved_only: bool = True, db: Session = Depends(get_db)):
    query = db.query(models.Review)
    if approved_only:
        query = query.filter(models.Review.is_approved.is_(True))
    return query.order_by(models.Review.created_at.desc()).all()


@router.patch("/{review_id}/approval", response_model=ReviewResponse)
async def toggle_review_approval(review_id: int, is_approved: bool, db: Session = Depends(get_db)):
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
