from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas

router = APIRouter(
    prefix="/teachers",
    tags=["teachers"],
    responses={404: {"description": "Not found"}},
)

@router.get("/")
def get_all_teachers(db: Session = Depends(get_db)):
    return db.query(models.Teacher).all()
