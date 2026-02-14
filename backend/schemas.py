from typing import Optional, List
from pydantic import BaseModel

class AdminCreate(BaseModel):
    user_id: int
    name: str

class AdminResponse(BaseModel):
    admin_id: int
    user_id: int
    name: str

    class Config:
        orm_mode = True

class StudentCreate(BaseModel):
    arid_no: str
    user_id: int
    name: str
    batch: str
    gender: str
    cgpa: float

class StudentUpdate(BaseModel):
    arid_no: Optional[str] = None
    user_id: Optional[int] = None
    name: Optional[str] = None
    batch: Optional[str] = None
    gender: Optional[str] = None
    cgpa: Optional[float] = None

class StudentResponse(BaseModel):
    student_id: int
    arid_no: str
    user_id: int
    name: str
    batch: str
    gender: str
    cgpa: float
    # section: Optional[str] = None

    class Config:
        orm_mode = True

class CourseResponse(BaseModel):
    course_id: int
    course_name: str
    course_code: str
    teacher_id: int

    class Config:
        orm_mode = True
