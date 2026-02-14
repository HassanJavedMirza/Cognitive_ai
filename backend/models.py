from sqlalchemy import CheckConstraint, Column, Float, Integer, String,DATE
from database import Base
from datetime import datetime
import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy import Time
class Student(Base):
    __tablename__="students"

    student_id=Column(Integer,primary_key=True, index=True, autoincrement=True)
    arid_no=Column(String(100))
    user_id=Column(Integer)
    name=Column(String(100))
    batch=Column(String(100))
    gender=Column(String(50))
    cgpa=Column(Float)
    section=Column(String(100))


class Admin(Base):
    __tablename__="admins"
    admin_id=Column(Integer,primary_key=True, index=True, autoincrement=True)
    user_id=Column(Integer)
    name=Column(String)

class Teacher(Base):
    __tablename__="teachers"
    teacher_id=Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id=Column(Integer)
    name=Column(String)

class Users(Base):
    __tablename__="users"
    user_id =Column(Integer, primary_key=True, index=True, autoincrement=True)
    email=Column(String)
    password=Column(String(100))
    role=Column(String(50))


class Attendent(Base):
    __tablename__="attendants"
    attendant_id=Column(Integer, primary_key=True, index=True, autoincrement=True)
    name=Column(String(100))
    user_id=Column(Integer)

class Sessions(Base):
    __tablename__="sessions"
    session_id=Column(Integer, primary_key=True, index=True,autoincrement=True)
    course_id=Column(Integer, ForeignKey("courses.course_id"))
    teacher_id=Column(Integer, ForeignKey("teachers.teacher_id"))
    student_id=Column(Integer, ForeignKey("students.student_id"))
    
    teacher = relationship("Teacher", backref="sessions")
    student = relationship("Student", backref="sessions")
    course = relationship("Courses", backref="sessions")
    
    date=Column(DATE)
    start_time=Column(Time)
    end_time=Column(Time)    
    venue=Column(String(50))
    admin_id=Column(Integer)

class Courses(Base):
    __tablename__="courses"
    course_id=Column(Integer,primary_key=True,index=True)
    course_name=Column(String)
    course_code=Column(String)
    teacher_id=Column(Integer)


class Session_records(Base):
    __tablename__="session_records"
    session_record_id=Column(Integer,primary_key=True,index=True,autoincrement=True)
    session_id=Column(Integer)
    teacher_id=Column(Integer)
    student_id=Column(Integer)              
    course_id=Column(Integer)
    attendant_id=Column(Integer)


class Session_results(Base):
     __tablename__="session_results" 
     result_id= Column(Integer,primary_key=True,index=True)
     session_record_id=Column(Integer)
     teacher_video_path=Column(String(500))
     student_video_path=Column(String(500))
     eeg_data_path=Column(String(500))
   

class Student_Courses(Base):
    __tablename__="student_courses"
    id=Column(Integer,primary_key=True,index=True)
    student_id=Column(Integer)
    course_id=Column(Integer)


class Session_Annotations(Base):
    __tablename__ = "session_annotations"
    
    annotation_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(Integer)  # FK to Sessions
    timestamp = Column(Float)  # Time in seconds where annotation was made
    annotation_type = Column(String(50))  # 'bookmark', 'note', 'flag'
    title = Column(String(200))
    description = Column(String(1000))
    created_by_user_id = Column(Integer)  # Who created it
    created_at = Column(String(100))  # ISO datetime string
    color = Column(String(20))  # For UI highlighting

class AdminResponses(Base):
    __tablename__ = "admin_responses"
    
    response_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(Integer, nullable=False)
    admin_id = Column(Integer, nullable=False)
    response = Column(Text)
    rating = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        CheckConstraint('rating >= 1 AND rating <= 5', name='check_rating_range'),
    )


class Student_Progress(Base):
    __tablename__ = "student_progress"
    
    progress_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer)
    session_id = Column(Integer)
    engagement_score = Column(Float)
    focus_percentage = Column(Float)
    attention_dips = Column(Integer)
    brainwave_beta_alpha_ratio = Column(Float)
    overall_score = Column(Float)
    recorded_at = Column(String(100))  # ISO datetime string


