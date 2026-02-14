from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas

router = APIRouter(
    prefix="/students",
    tags=["students"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[schemas.StudentResponse])
def get_all_students(db: Session = Depends(get_db)):
    return db.query(models.Student).all()

@router.get("/{student_id}", response_model=schemas.StudentResponse)
def get_one_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.student_id == student_id).first()
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

@router.get("/by-section/{section}", response_model=List[schemas.StudentResponse])
def get_std_by_section(section: str, db: Session = Depends(get_db)):
    students = db.query(models.Student).filter(models.Student.section == section).all()
    return students

@router.post("/", response_model=schemas.StudentResponse)
def create_new_student(student: schemas.StudentCreate, db: Session = Depends(get_db)):
    db_student = models.Student(**student.dict())
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

@router.put("/{sid}", response_model=schemas.StudentResponse)
def update_student(sid: int, student: schemas.StudentUpdate, db: Session = Depends(get_db)):
    db_student = db.query(models.Student).filter(models.Student.student_id == sid).first()
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    update_data = student.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_student, key, value)
    
    db.commit()
    db.refresh(db_student)
    return db_student
