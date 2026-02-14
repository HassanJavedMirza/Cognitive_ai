# import json
# import subprocess  # ✅ CORRECT - Add this at the top with other imports
# from pathlib import Path
# from fastapi import FastAPI, Depends, HTTPException, Query, File, Response, UploadFile, Form
# from fastapi.responses import FileResponse, JSONResponse, StreamingResponse 
# import os

# from flask import jsonify
# import pandas as pd  # Add this
# import os
# import json


# from pydantic import BaseModel, validator
# from sympy import re
# from models import Users,Student,Teacher,Sessions,Session_records,Session_results,Admin,Attendent,Courses,Student_Courses,AdminResponses
# from database import Base, engine, Sessionlocal

# from sqlalchemy.orm import Session
# from typing import Optional

# from datetime import datetime, date, time

# from fastapi.middleware.cors import CORSMiddleware
# from urllib.parse import unquote
# import eeg_streaming

# import asyncio

# from pylsl import StreamInlet, resolve_byprop

# import asyncio
# from contextlib import asynccontextmanager

import json
import os
import asyncio
import shutil
import subprocess
import logging
import traceback
from pathlib import Path
from datetime import datetime, date, time
from typing import Optional, Union
from urllib.parse import unquote
from contextlib import asynccontextmanager

import pandas as pd
import numpy as np
from flask import jsonify
from pydantic import BaseModel, validator
from sympy import re
from fastapi import (
    FastAPI, Depends, HTTPException, Query, File, Response, 
    UploadFile, Form, Request
)
from fastapi.responses import (
    FileResponse, JSONResponse, StreamingResponse
)
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload

# Local imports
from database import Base, engine, Sessionlocal
from models import (
    Users, Student, Teacher, Sessions, Session_records, 
    Session_results, Admin, Attendent, Courses, Student_Courses,
    AdminResponses, Session_Annotations
)
import eeg_streaming
from config import settings

notification_queue = asyncio.Queue(maxsize=100)
active_sse_connections = set()



# At the top of your FastAPI file, after creating the app
app = FastAPI()

# Update CORS configuration
allow_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

# Add CORS middleware with proper configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
    expose_headers=["*"],  # Expose all headers
    max_age=600,  # Cache preflight requests for 10 minutes
)

@app.get("/")
def home():
    return {"message": "Hello from FastAPI!"}



def get_db():
    db=Sessionlocal()
    try:
        yield db
    finally:
        db.close()    


@app.get("/all_admins")
def all_admins():
    db=Sessionlocal()
    all_admins=db.query(Admin).all()
    db.close()
    return all_admins

class admin_class(BaseModel):
    admin_id:int
    user_id:int
    name:str

@app.get("/admins_by_id/{a_id}")
def admin_by_id(a_id:int):
    db=Sessionlocal()
    admin=db.query(Admin).filter(Admin.user_id==a_id).first()
    db.close()
    return {"admin_id":admin.admin_id,
            "name":admin.name,
            
            }

@app.get("/events/session")
async def session_events():
    """Server-Sent Events endpoint with proper error handling"""
    async def event_generator():
        try:
            while True:
                try:
                    # Use asyncio.wait_for with timeout
                    message = await asyncio.wait_for(
                        notification_queue.get(), 
                        timeout=30.0  # 30 second timeout
                    )
                    yield f"data: {message}\n\n"
                except asyncio.TimeoutError:
                    # Send keep-alive comment
                    yield ": keepalive\n\n"
                except asyncio.CancelledError:
                    # Client disconnected
                    print("SSE: Client disconnected")
                    break
                except Exception as e:
                    print(f"SSE Error: {e}")
                    # Send error message
                    yield f"data: {{'error': 'Stream error: {str(e)[:50]}'}}\n\n"
                    break
        except asyncio.CancelledError:
            print("SSE: Generator cancelled")
            raise
        finally:
            print("SSE: Generator cleanup")
    
    response = StreamingResponse(
        event_generator(), 
        media_type="text/event-stream",
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'  # Disable buffering for nginx
        }
    )
    return response

@app.get("/all_Courses")
def all_Courses():
    db=Sessionlocal()
    all_Courses=db.query(Courses).all()
    db.close()
    return all_Courses


@app.get("/Course_by_Name/{c_name}")
def Course_by_Name(c_name:str):
    db=Sessionlocal()
    all_Courses=db.query(Courses).all()
    for c in all_Courses:
        if c.course_name==c_name:
            db.close()
            return c
    db.close()
    return {"error":"Not found!"}    
    
@app.get("/Course_by_id/{cid}")
def Course_by_id(cid:int):
  db=Sessionlocal()
  course_name=db.query(Courses).filter(Courses.course_id==cid).first()
  if not course_name:
      db.close()
      return{"error":"data not found"}
  db.close()
  return course_name

@app.get("/all_Attendents")
def all_Attendents():
    db=Sessionlocal()
    all_attendents=db.query(Attendent).all()
    db.close()
    return all_attendents

@app.get("/Attendent_by_id/{aid}")
def get_attendent_by_id(aid: int):
    db = Sessionlocal()
    try:
        attendent = db.query(Attendent).filter(Attendent.user_id == aid).first()
        if not attendent:
            return {"error": "Attendent not found!"}
        
        # Return complete attendent data
        return {
            "attendent_id": attendent.attendant_id,
            "user_id": attendent.user_id,
            "name": attendent.name,
            # Add other fields as needed
        }
    finally:
        db.close()

@app.get("/sessions_with_details")
def get_sessions_with_details():
    """
    Returns all sessions with teacher, student, and course names included
    Reduces frontend API calls significantly
    """
    db = Sessionlocal()
    try:
        sessions = db.query(Sessions).all()
        detailed_sessions = []
        
        for session in sessions:
            teacher = db.query(Teacher).filter(Teacher.teacher_id == session.teacher_id).first()
            student = db.query(Student).filter(Student.student_id == session.student_id).first()
            course = db.query(Courses).filter(Courses.course_id == session.course_id).first()
            
            detailed_sessions.append({
                "session_id": session.session_id,
                "course_id": session.course_id,
                "course_name": course.course_name if course else "Unknown",
                "teacher_id": session.teacher_id,
                "teacher_name": teacher.name if teacher else "Unknown",
                "student_id": session.student_id,
                "student_name": student.name if student else "Unknown",
                "date": str(session.date),
                "start_time": session.start_time,
                "end_time": session.end_time,
                "venue": session.venue,
                "admin_id": session.admin_id
            })
        
        return detailed_sessions
    except Exception as e:
        return {"error": str(e)}
    finally:
        db.close()


import os
import shutil

STUDENT_DIR = settings.STUDENT_DIR
TEACHER_DIR = settings.TEACHER_DIR
EEG_DIR = settings.EEG_DIR

for folder in [STUDENT_DIR, TEACHER_DIR, EEG_DIR]:
    os.makedirs(folder, exist_ok=True)
@app.post("/upload_files/")
async def upload_files(
    session_id: int = Form(...),
    student_video: UploadFile = File(...),
    teacher_video: UploadFile = File(...),
    eeg_data: UploadFile = File(...),
    overwrite: bool = Form(False)
):
    db: Session = Sessionlocal()
    try:
        res = db.query(Session_results).filter(Session_results.session_record_id == session_id).first()

        if res and not overwrite:
            return {"status": "exists", "message": "Data already exists for this session. Do you want to overwrite?", "session_id": session_id}

        # File paths for new uploads
        student_video_path = os.path.join(STUDENT_DIR, student_video.filename)
        teacher_video_path = os.path.join(TEACHER_DIR, teacher_video.filename)
        eeg_data_path = os.path.join(EEG_DIR, eeg_data.filename)

        # -----------------------------
        # 1. Save new files first
        # -----------------------------
        for file, path in zip([student_video, teacher_video, eeg_data],
                              [student_video_path, teacher_video_path, eeg_data_path]):
            with open(path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

        # -----------------------------
        # 2. Close UploadFile streams
        # -----------------------------
        for f in [student_video, teacher_video, eeg_data]:
            await f.close()  # async close is safe

        # -----------------------------
        # 3. Remove old files if overwriting
        # -----------------------------
        if res and overwrite:
            for path in [res.student_video_path, res.teacher_video_path, res.eeg_data_path]:
                if path and os.path.exists(path):
                    try:
                        os.remove(path)
                    except PermissionError:
                        # Sometimes Windows locks files for a short time; ignore if cannot delete
                        pass

        # -----------------------------
        # 4. Update or create DB entry
        # -----------------------------
        if res:
            res.student_video_path = student_video_path
            res.teacher_video_path = teacher_video_path
            res.eeg_data_path = eeg_data_path
            db.commit()
            db.refresh(res)
            return {"status": "updated", "message": "Files updated successfully!", "result_id": res.result_id, "session_id": session_id}
        else:
            new_result = Session_results(
                session_record_id=session_id,
                student_video_path=student_video_path,
                teacher_video_path=teacher_video_path,
                eeg_data_path=eeg_data_path
            )
            db.add(new_result)
            db.commit()
            db.refresh(new_result)
            return {"status": "created", "message": "Files uploaded successfully!", "result_id": new_result.result_id, "session_id": session_id}

    except Exception as e:
        db.rollback()
        # Clean up new files if any error occurred
        for path in [student_video_path, teacher_video_path, eeg_data_path]:
            if path and os.path.exists(path):
                os.remove(path)
        return {"status": "error", "error": f"Upload failed: {str(e)}"}

    finally:
        db.close()









# ----------------Student----------------------------
@app.get("/all_students")
def get_all_students():
    db=Sessionlocal()
    Students=db.query(Student).all()
    db.close()
    return Students

@app.get("/get_student_name_by_id/{id}")
def get_student_name(id:int):
    db=Sessionlocal()
    student_id=db.query(Student).filter(Student.student_id==id).first()
    if not student_id:
        db.close()
        return {"error":"not found!"}
    name=student_id.name
    db.close()
    return name
@app.get("/get_one_student/{student_id}") #user id coming from student dashboard page
def get_one_student(student_id:int):
    db=Sessionlocal()
    Students=db.query(Student).filter(Student.user_id==student_id).first()
    if not Students:
        db.close()
        return {"error":"Not found!"}
    db.close()
    return Students
      
@app.get("/get_student_by_section/{section}")
def get_std_by_section(section:str):
    db=Sessionlocal()
    students=db.query(Student).filter(Student.section==section).all()
    if not students:
        db.close()
        return {"error":"Not Found"} 
    db.close()
    return students   
class create_student(BaseModel):
    arid_no: str
    user_id: int
    name: str
    batch: str
    gender: str
    cgpa: float

@app.post("/create_new_student")
def create_new_student(student: create_student):
    db = Sessionlocal()

    
    existing = db.query(Student).filter(Student.user_id == student.user_id).first()
    if existing:
        db.close()
        return {"error": "Student already exists"}

    new_student = Student(
        arid_no=student.arid_no,
        user_id=student.user_id,
        name=student.name,
        batch=student.batch,
        gender=student.gender,
        cgpa=student.cgpa
    )

    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    db.close()

    return {
        "message": "Student added successfully!",
        "student_id": new_student.student_id  
    }

class update_student(BaseModel):
   arid_no: Optional[str]
   user_id: Optional[int]
   name: Optional[str]
   batch: Optional[str]
   gender: Optional[str]
   cgpa: Optional[float]

@app.put("/update-student/{sid}")
def Update_Student(sid:int, student:update_student):
    db=Sessionlocal()
    Students=db.query(Student).all()
    for s in Students:
        if s.student_id==sid:
            if s.arid_no is not None:
                s.arid_no=s.arid_no
            if s.user_id is not None:
                s.user_id=s.user_id
            if s.name is not None:
                s.name=s.name
            if s.batch is not None:
                s.batch=s.batch
            if s.gender is not None:
                s.gender=s.gender
            if s.cgpa is not None:
                s.cgpa=s.cgpa
            db.commit()
            db.refresh(s)
            db.close()    
            return {"messege":"Updated Successfully!"}
    db.close()
    return {"error":"Student not Found!"}

# teacher-----------------------------------------------------

@app.get("/get_all_teachers")
def get_all_teachers():
    db=Sessionlocal()
    Teachers=db.query(Teacher).all()
    db.close()
    return Teachers


@app.get("/get_teachers_sessions_by_id/{tid}")
def teacher_sessions_by_id(tid:int):
    db=Sessionlocal()
    sessions=db.query(Sessions).filter(Sessions.teacher_id==tid).all()
    if not sessions:
        db.close()
        return {"message":"no sessions found !"}
    db.close()
    return sessions

@app.get("/serve_video")
def serve_video(path: str):
    
    decoded_path = unquote(path)
    print(f"Decoded path: {decoded_path}")
    
    
    normalized_path = os.path.normpath(decoded_path)
    print(f"Normalized path: {normalized_path}")
    
    if os.path.exists(normalized_path):
        return FileResponse(
            normalized_path,
            media_type="video/mp4",
            headers={"Accept-Ranges": "bytes"}
        )
    
    print(f"File not found: {normalized_path}")
    return {"error": "File not found", "path": normalized_path}

@app.get("/serve_csv")
async def serve_csv(path: str):
    return FileResponse(path, media_type="text/csv")


@app.get("/api/eeg-data/{session_id}")
def get_eeg_data(session_id: int):
    """
    Get EEG data for a session by reading the CSV file
    """
    db = Sessionlocal()
    try:
        # Get the EEG file path from session_results
        session = db.query(Sessions).filter(Sessions.session_id == session_id).first()
        if not session:
            return {"error": "Session not found"}
        
        # Get session_record
        session_record = db.query(Session_records).filter(
            Session_records.session_id == session_id
        ).first()
        
        if not session_record:
            return {"error": "No session record found"}
        
        # Get session_results
        result = db.query(Session_results).filter(
            Session_results.session_record_id == session_record.session_record_id
        ).first()
        
        if not result or not result.eeg_data_path:
            return {"error": "No EEG data found for this session"}
        
        eeg_file_path = result.eeg_data_path
        
        # Read the CSV file
        try:
            import pandas as pd
            df = pd.read_csv(eeg_file_path)
            data = df.to_dict(orient='records')
            
            return {
                "session_id": session_id,
                "file_path": eeg_file_path,
                "data": data,
                "columns": list(df.columns),
                "row_count": len(data)
            }
        except Exception as e:
            import csv
            data = []
            with open(eeg_file_path, 'r', encoding='utf-8') as file:
                csv_reader = csv.DictReader(file)
                for row in csv_reader:
                    data.append(row)
            
            return {
                "session_id": session_id,
                "file_path": eeg_file_path,
                "data": data,
                "columns": list(data[0].keys()) if data else [],
                "row_count": len(data)
            }
                
    except Exception as e:
        return {"error": str(e)}
    finally:
        db.close()


@app.get("/teacher_session_results_by_sid/{sid}")
def teacher_session_result_by_sid(sid: int):
    """
    Get session results by session_id (proper flow)
    Flow: Sessions -> Session_records -> Session_results
    """
    db = Sessionlocal()
    try:
        # Step 1: Check if session exists
        session = db.query(Sessions).filter(Sessions.session_id == sid).first()
        
        if not session:
            return {"error": "Session not found!"}
        
        # Step 2: Get session_record linked to this session
        session_record = db.query(Session_records).filter(
            Session_records.session_id == sid
        ).first()
        
        if not session_record:
            return {"error": "No session record found for this session!"}
        
        # Step 3: Get session_results linked to this session_record
        results = db.query(Session_results).filter(
            Session_results.session_record_id == session_record.session_record_id
        ).all()
        
        if not results:
            return {"error": "No results found for this session!"}
        
        # Step 4: Build response with full context
        output = []
        for r in results:
            db.refresh(r)
            output.append({
                "result_id": r.result_id,
                "session_id": session.session_id,  # Original session_id
                "session_record_id": r.session_record_id,
                "teacher_path": r.teacher_video_path,
                "student_path": r.student_video_path,
                "eeg_path": r.eeg_data_path,
                # Extra context from session
                "session_info": {
                    "course_id": session.course_id,
                    "teacher_id": session.teacher_id,
                    "student_id": session.student_id,
                    "date": str(session.date),
                    "venue": session.venue
                }
            })
        
        return output
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
    finally:
        db.close()


@app.get("/student_session_results_by_sid/{session_id}/{student_id}")
def student_session_results_by_sid(session_id: int, student_id: int):
    """
    Get session results by session_id and student_id (for student access)
    Flow: Sessions -> Session_records -> Session_results
    """
    db = Sessionlocal()
    try:
        # Step 1: Check if session exists and belongs to student
        session = db.query(Sessions).filter(
            Sessions.session_id == session_id,
            Sessions.student_id == student_id
        ).first()
        
        if not session:
            return {"error": "Session not found or doesn't belong to this student!"}
        
        # Step 2: Get session_record linked to this session
        session_record = db.query(Session_records).filter(
            Session_records.session_id == session_id
        ).first()
        
        if not session_record:
            return {"error": "No session record found for this session!"}
        
        # Step 3: Get session_results linked to this session_record
        result = db.query(Session_results).filter(
            Session_results.session_record_id == session_record.session_record_id
        ).first()
        
        if not result:
            return {"error": "No results found for this session!"}
        
        # Step 4: Read EEG data from file if exists
        eeg_data = None
        if result.eeg_data_path and os.path.exists(result.eeg_data_path):
            try:
                with open(result.eeg_data_path, 'r') as f:
                    eeg_data = json.load(f)
            except Exception as e:
                print(f"Error reading EEG file: {str(e)}")
                eeg_data = {"error": "Failed to read EEG data file"}
        
        # Build response
        output = {
            "result_id": result.result_id,
            "session_id": session.session_id,
            "session_record_id": result.session_record_id,
            "teacher_video_path": result.teacher_video_path,
            "student_video_path": result.student_video_path,
            "eeg_data_path": result.eeg_data_path,
            "eeg_data": eeg_data,
            "created_at": str(result.created_at) if result.created_at else None,
            "session_info": {
                "course_id": session.course_id,
                "teacher_id": session.teacher_id,
                "student_id": session.student_id,
                "date": str(session.date),
                "venue": session.venue,
                "start_time": str(session.start_time),
                "end_time": str(session.end_time)
            }
        }
        
        return output
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
    finally:
        db.close()


@app.get("/student/{student_id}/all_eeg_sessions")
def get_student_eeg_sessions(student_id: int):
    """
    Get all sessions with EEG data for a student
    """
    db = Sessionlocal()
    try:
        # Get all sessions for student
        sessions = db.query(Sessions).filter(
            Sessions.student_id == student_id
        ).all()
        
        sessions_with_eeg = []
        
        for session in sessions:
            # Get session_record
            session_record = db.query(Session_records).filter(
                Session_records.session_id == session.session_id
            ).first()
            
            if session_record:
                # Get results
                result = db.query(Session_results).filter(
                    Session_results.session_record_id == session_record.session_record_id
                ).first()
                
                if result and result.eeg_data_path and os.path.exists(result.eeg_data_path):
                    try:
                        with open(result.eeg_data_path, 'r') as f:
                            eeg_data = json.load(f)
                            
                        sessions_with_eeg.append({
                            "session_id": session.session_id,
                            "date": str(session.date),
                            "course_id": session.course_id,
                            "eeg_data": eeg_data,
                            "eeg_data_path": result.eeg_data_path,
                            "has_eeg": True,
                            "session_info": {
                                "venue": session.venue,
                                "start_time": str(session.start_time),
                                "end_time": str(session.end_time)
                            }
                        })
                    except Exception as e:
                        print(f"Error reading EEG for session {session.session_id}: {str(e)}")
        
        return {
            "student_id": student_id,
            "total_sessions": len(sessions),
            "sessions_with_eeg": len(sessions_with_eeg),
            "eeg_sessions": sessions_with_eeg
        }
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return {"error": str(e)}
    finally:
        db.close()

@app.get("/student_session_eeg_check/{session_id}/{student_id}")
def check_student_session_eeg(session_id: int, student_id: int):
    """
    Check if EEG data exists for a student's session (lightweight check)
    """
    db = Sessionlocal()
    try:
        # Check if session exists and belongs to student
        session = db.query(Sessions).filter(
            Sessions.session_id == session_id,
            Sessions.student_id == student_id
        ).first()
        
        if not session:
            return {"has_eeg": False, "error": "Session not found"}
        
        # Get session_record
        session_record = db.query(Session_records).filter(
            Session_records.session_id == session_id
        ).first()
        
        if not session_record:
            return {"has_eeg": False}
        
        # Get result
        result = db.query(Session_results).filter(
            Session_results.session_record_id == session_record.session_record_id
        ).first()
        
        if not result or not result.eeg_data_path:
            return {"has_eeg": False}
        
        # Check if file exists
        has_eeg = os.path.exists(result.eeg_data_path) if result.eeg_data_path else False
        
        return {"has_eeg": has_eeg}
        
    except Exception as e:
        return {"has_eeg": False, "error": str(e)}
    finally:
        db.close()


# BONUS: Alternative version using SQLAlchemy JOIN (more efficient)
@app.get("/teacher_session_results_by_sid_v2/{sid}")
def teacher_session_result_by_sid_v2(sid: int):
    """
    Get session results using JOIN (more efficient)
    """
    db = Sessionlocal()
    try:
        # Single query with joins
        results = db.query(
            Session_results,
            Session_records,
            Sessions
        ).join(
            Session_records,
            Session_results.session_record_id == Session_records.session_record_id
        ).join(
            Sessions,
            Session_records.session_id == Sessions.session_id
        ).filter(
            Sessions.session_id == sid
        ).all()
        
        if not results:
            return {"error": "No results found for this session!"}
        
        output = []
        for result, record, session in results:
            output.append({
                "result_id": result.result_id,
                "session_id": session.session_id,
                "session_record_id": result.session_record_id,
                "teacher_path": result.teacher_video_path,
                "student_path": result.student_video_path,
                "eeg_path": result.eeg_data_path,
                "session_info": {
                    "course_id": session.course_id,
                    "teacher_id": session.teacher_id,
                    "student_id": session.student_id,
                    "date": str(session.date),
                    "start_time": session.start_time,
                    "end_time": session.end_time,
                    "venue": session.venue
                }
            })
        
        return output
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
    finally:
        db.close()

import numpy as np 
import pandas as pd 

# @app.get("/teacher_session_results_by_sid/{sid}")
# def teacher_session_result_by_sid(
#     sid: int):
    
#         db=Sessionlocal()
#         result=db.query(Session_results).filter(Session_results.session_record_id==sid).all()
#         if not result:
#             db.close()
#             return{"error":"no session found!"}
#         db.close()
#         return result
    
    
       
    
@app.get("/get_one_teacher/{tid}")
def get_a_teacher(tid:int):
   db=Sessionlocal()
   Teachers=db.query(Teacher).filter(Teacher.teacher_id==tid).first()
   if not Teachers:
       db.close()
       return {"messege":"not found!"}
   db.close()
   return Teachers


@app.get("/get_teacher_courses/{t_id}")
def get_teachers_courses(t_id:int):
  db=Sessionlocal()
  all_teachers=db.query(Teacher).all()
  for t in all_teachers:
      if t.teacher_id==t_id:
          t_courses=db.query(Courses).filter(Courses.teacher_id==t_id).all()
          db.close()
          return {"teacher name":t.name,
                  "teacher's Courses":[c for c in t_courses]
                  }
  db.close()    
  return {"messege":"Not found!"}        
              
@app.get("/get_Teacher_name/{t_id}")
def get_teacher_name(t_id:int):
    db=Sessionlocal()
    results=db.query(Teacher).all()
    for r in results:
        if r.teacher_id==t_id:
            
            name=r.name
            db.close()
            return name
    db.close()
    return {"error":"Not found!"}

@app.get("/get_Teacher_id/{tname}")
def get_teacher_id(tname:str):
    db=Sessionlocal()
    results=db.query(Teacher).all()
    for r in results:
        if r.name==tname:
            db.close()
            return{"result":r.teacher_id}
    db.close()
    return {"error":"Not found!"}

class new_teacher(BaseModel):
    
    user_id: int
    name: str

@app.post("/create_new_teacher")
def create_new_teacher(teacher_data: new_teacher):
    db = Sessionlocal()

    existing = db.query(Teacher).filter(Teacher.user_id == teacher_data.user_id).first()
    if existing:
        db.close()
        return {"error": "Teacher already exists!"}

    
    new_teacher = Teacher(
        user_id=teacher_data.user_id,
        name=teacher_data.name
    )

    db.add(new_teacher)
    db.commit()
    db.refresh(new_teacher)
    db.close()

    return {
        "message": "Teacher added successfully!",
        "teacher_id": new_teacher.teacher_id
    }


# USERS
class User(BaseModel):

   email:str
   password:str
   role:str

class login_class(BaseModel):
    email:str
    password:str


@app.post("/login_Check")
def Login_Check(data: login_class): 
    db = Sessionlocal()

    user = db.query(Users).filter(Users.email == data.email).first()

    if not user:
        db.close()
        return {"error": "User not found!"}
    
    if user.password != data.password:
        db.close()
        return {"error": "Incorrect password!"}
    db.close()
    return {
        "message": "Login Successful!",
        "role": user.role,
        "id":user.user_id

    }
    

@app.post("/new_user")
def new_user(user:User):
    db=Sessionlocal()
    user_data=db.query(Users).all()
    for u in user_data:
        if u.email==user.email:
            db.close()
            return {"error":"User already exists"}
     
    new_user_data = Users(
        email=user.email,
        password=user.password,
        role=user.role
    )
   
    db.add(new_user_data)
    db.commit()
    db.refresh(new_user_data) 
    # user_role_work(new_user_data.user_id,new_user_data.role)
    db.close()
    return {"messege":"User Added Successfully!",
            "user_id":new_user_data.user_id }   





# @app.get("/all_Sessions_by_name")
# def Sessions_by_name():
#     db=Sessionlocal()
#     Session_names=db.quer(Sessions).all

#     for s in Session_names:
        


@app.get("/all_Sessions_Results")
def all_Sessions_Results():
    db=Sessionlocal()
    all_Sessions_results=db.query(Session_results).all()
    db.close()
    return all_Sessions_results


def all_Sessions_names(students_list):
   print("student list:",students_list)
   students_list_updated=[]
   db=Sessionlocal()
   for s in students_list:
         course=db.query(Courses).filter(Courses.course_id==s.course_id).first()
         teacher=db.query(Teacher).filter(Teacher.teacher_id==s.teacher_id).first()
         student=db.query(Student).filter(Student.student_id==s.student_id).first()
         updated_list={
             "session_id":s.session_id,
             "course_name":course.course_name,
             "teacher_name":teacher.name,
             "student_name":student.name,
             "date":s.date,
             "start_time":s.start_time,
             "end_time":s.end_time,
             "venue":s.venue,
             "admin":s.admin_id
         }
         students_list_updated.append(updated_list)
   db.close() 
   return students_list_updated     

@app.get("/all_Sessions")
def all_Sessions():
    db=Sessionlocal()
    db.expire_all()
    all_Sessions=db.query(Sessions).all()
    print("all sessions",all_Sessions)
    result=all_Sessions_names(all_Sessions)
    
    db.close()

    return result

@app.get("/Sessions_by_sid/{sessionId}")
def Sessions_by_sid(sessionId:int):
    db=Sessionlocal()
    db.expire_all()
    session=db.query(Sessions).filter(Sessions.session_id==sessionId).all()
    if not session:
        db.close()
        return {"messege":"not found!"}
    db.close()
    return session

@app.get("/all_Sessions_Records")
def all_Sessions_Records():
    db=Sessionlocal()
    all_Sessions_rec=db.query(Session_records).all()
    # result=all_Sessions_names(all_Sessions_rec)
    db.close()
    return all_Sessions_rec


class Sessions_class(BaseModel):
    
    session_id:int
    course_id:int
    teacher_id:int
    student_id:int
    
    date:str
    start_time:str
    end_time:str   
    venue:str
    admin_id:int

@app.get("/teachers_session/{tid}")
def Teachers_Session(tid:int):
    db=Sessionlocal()
    sessions=db.query(Sessions).filter(Sessions.teacher_id==tid).all()

    if not sessions:
        db.close()
        return {"error":"Not found!"}
    db.close()
    return sessions

@app.get("/Students_session/{sid}")
def Students_Session(sid:int):
    db=Sessionlocal()
    
    sessions=db.query(Sessions).filter(Sessions.student_id==sid).all()

    if not sessions:
        db.close()
        return {"error":"Not found!"}
    db.close()
    return sessions

@app.get("/get_students_by_course")
def get_students_by_course(cid: int):
    db = Sessionlocal()
    try:
        students = db.query(Student).join(
            Student_Courses, Student_Courses.student_id == Student.student_id
        ).filter(
            Student_Courses.course_id == cid
        ).all()
        return students
    finally:
        db.close()

@app.get("/get_courses_by_teacher")
def get_courses_by_teacher(tid: int):
    db = Sessionlocal()
    try:
        courses = db.query(Courses).filter(Courses.teacher_id == tid).all()
        if not courses:
            return {"messege":"nothing found!"}
        return courses
    finally:
        db.close()


@app.get("/Session_by_Venue/{venue}")
def Session_by_Venue(venue:str):
    db=Sessionlocal()
    sessions=db.query(Sessions).filter(Sessions.venue==venue).all()

    if not sessions:
        db.close()
        return {"error":"Not found!"}
    db.close()
    return sessions

@app.get("/Sessions_by_tid/{tid}")
def Session_by_teacherid(tid: int):
    db = Sessionlocal()
    try:
        # CORRECTED QUERY: Use filter method properly
        sessions = db.query(Sessions).filter(Sessions.teacher_id == tid).all()
        
        if not sessions:
            return {"message": "No sessions found for this teacher!"}
        
        return sessions
    except Exception as e:
        return {"error": str(e)}
    finally:
        db.close()

@app.get("/teacher_sessions_with_details/{teacher_id}")
def get_teacher_sessions_with_details(teacher_id: int):
    """
    Get all sessions for a specific teacher with full details
    """
    db = Sessionlocal()
    try:
        # Get sessions for the teacher
        sessions = db.query(Sessions).filter(Sessions.teacher_id == teacher_id).all()
        
        detailed_sessions = []
        
        for session in sessions:
            # Get student details
            student = db.query(Student).filter(Student.student_id == session.student_id).first()
            
            # Get course details
            course = db.query(Courses).filter(Courses.course_id == session.course_id).first()
            
            # Check for EEG data
            has_eeg = False
            session_record = db.query(Session_records).filter(
                Session_records.session_id == session.session_id
            ).first()
            
            if session_record:
                result = db.query(Session_results).filter(
                    Session_results.session_record_id == session_record.session_record_id
                ).first()
                has_eeg = bool(result and result.eeg_data_path)
            
            # Get admin response
            admin_response = db.query(AdminResponses).filter(
                AdminResponses.session_id == session.session_id
            ).first()
            
            detailed_sessions.append({
                "session_id": session.session_id,
                "date": str(session.date),
                "start_time": str(session.start_time) if session.start_time else None,
                "end_time": str(session.end_time) if session.end_time else None,
                "venue": session.venue,
                "student_id": session.student_id,
                "student_name": student.name if student else "Unknown",
                "course_id": session.course_id,
                "course_name": course.course_name if course else "Unknown",
                "has_eeg": has_eeg,
                "admin_rating": admin_response.rating if admin_response else None,
                "admin_feedback": admin_response.response if admin_response else None
            })
        
        return detailed_sessions
        
    except Exception as e:
        return {"error": str(e)}
    finally:
        db.close()

 


class Create_Sessions_class(BaseModel):
    course_id: int
    teacher_id: int
    student_id: int
    date: date
    start_time: time
    end_time: time
    venue: str
    admin_id: int
    attendant_id: Optional[int] = 1

  
@app.post("/Create_new_Session")
async def Create_Session(session: Create_Sessions_class):
    db = Sessionlocal()

    try:
        existing = db.query(Sessions).filter(
            Sessions.teacher_id == session.teacher_id,
            Sessions.start_time == session.start_time,
            Sessions.date == session.date,
            Sessions.venue == session.venue
        ).first()

        if existing:
            return {"error": "Session already exists at same time!"}

        new_session = Sessions(
            course_id=session.course_id,
            teacher_id=session.teacher_id,
            student_id=session.student_id,
            date=session.date,
            start_time=session.start_time,   # already datetime.time
            end_time=session.end_time,       # already datetime.time
            venue=session.venue,
            admin_id=session.admin_id
        )

        db.add(new_session)
        db.commit()
        db.refresh(new_session)

        new_session_record = Session_records(
            session_id=new_session.session_id,
            teacher_id=session.teacher_id,
            student_id=session.student_id,
            course_id=session.course_id,
            attendant_id=session.attendant_id
        )

        db.add(new_session_record)
        db.commit()
        db.refresh(new_session_record)

        await notification_queue.put(
            f"A new session has been created on {session.date}."
        )

        return {
            "message": "Session created successfully!",
            "session_id": new_session.session_id,
            "session_record_id": new_session_record.session_record_id
        }

    except Exception as e:
        db.rollback()
        return {"error": f"Failed to create session: {str(e)}"}

    finally:
        db.close()

class UpdateSession(BaseModel):
    course_id: Optional[int] = None
    teacher_id: Optional[int] = None
    student_id: Optional[int] = None
    date: Optional[datetime] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    venue: Optional[str] = None
    admin_id: Optional[int] = None


@app.put("/update_session/{session_id}")
async def update_session(session_id: int, data: UpdateSession):
    db = Sessionlocal()
    try:
        session = db.query(Sessions).filter(Sessions.session_id == session_id).first()

        if not session:
            return {"error": "Session not found!"}

        # Update fields only if provided
        if data.course_id is not None:
            session.course_id = data.course_id
        if data.teacher_id is not None:
            session.teacher_id = data.teacher_id
        if data.student_id is not None:
            session.student_id = data.student_id
        if data.date is not None:
            session.date = data.date
        if data.start_time is not None:
            session.start_time = data.start_time
        if data.end_time is not None:
            session.end_time = data.end_time
        if data.venue is not None:
            session.venue = data.venue
        if data.admin_id is not None:
            session.admin_id = data.admin_id

        db.commit()
        db.refresh(session)

        # UPDATE linked Session_records
        record = db.query(Session_records).filter(
            Session_records.session_id == session_id
        ).first()

        if record:
            if data.teacher_id is not None:
                record.teacher_id = data.teacher_id
            if data.student_id is not None:
                record.student_id = data.student_id
            if data.course_id is not None:
                record.course_id = data.course_id

            db.commit()

        return {"message": "Session updated successfully!"}

    except Exception as e:
        db.rollback()
        return {"error": str(e)}
    finally:
        db.close()


@app.delete("/delete_session/{session_id}")
async def delete_session(session_id: int):
    db = Sessionlocal()
    try:
        session = db.query(Sessions).filter(Sessions.session_id == session_id).first()

        if not session:
            return {"error": "Session not found!"}

        # Delete Session_records
        record = db.query(Session_records).filter(
            Session_records.session_id == session_id
        ).first()

        if record:
            # Delete session results first
            results = db.query(Session_results).filter(
                Session_results.session_record_id == record.session_record_id
            ).all()

            for r in results:
                db.delete(r)

            db.delete(record)

        # Delete session
        db.delete(session)
        db.commit()

        return {"message": "Session deleted successfully!"}

    except Exception as e:
        db.rollback()
        return {"error": str(e)}
    finally:
        db.close()


@app.post("/Create_Teacher_Sessions")
def Create_Teacher_Sessions(session: Create_Sessions_class):
    db = Sessionlocal()
    
    try:
        # Check for duplicates
        existing = db.query(Sessions).filter(
            Sessions.teacher_id == session.teacher_id,
            Sessions.start_time == session.start_time,
            Sessions.date == session.date,
            Sessions.venue == session.venue
        ).first()
        
        if existing:
            return {"error": "Session already exists at same time!"}
        
        # Create session
        new_session = Sessions(
            course_id=session.course_id,
            teacher_id=session.teacher_id,
            student_id=session.student_id,
            date=session.date,
            start_time=session.start_time,
            end_time=session.end_time,
            venue=session.venue,
            admin_id=session.admin_id
        )
        
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        
        # âœ… CREATE SESSION RECORD
        new_record = Session_records(
            session_id=new_session.session_id,
            teacher_id=session.teacher_id,
            student_id=session.student_id,
            course_id=session.course_id,
            attendant_id=session.attendant_id if hasattr(session, 'attendant_id') and session.attendant_id else 1
        )
        
        db.add(new_record)
        db.commit()
        db.refresh(new_record)
        
        return {
            "message": "Session created successfully!",
            "session_id": new_session.session_id,
            "session_record_id": new_record.session_record_id
        }
        
    except Exception as e:
        db.rollback()
        return {"error": f"Failed to create session: {str(e)}"}
    finally:
        db.close()


class Create_Student_Session(BaseModel):
    course_id: int
    student_id: int
    teacher_id: Optional[int] = None  # optional, student may not choose
    date: date
    start_time: time
    end_time: time
    venue: str
    admin_id: Optional[int] = None
    attendant_id: Optional[int] = 1  # default


@app.post("/Create_Student_Session")
async def create_student_session(session: Create_Student_Session):
    db = Sessionlocal()
    try:
        # Check for duplicate sessions for this student at the same time
        existing = db.query(Sessions).filter(
            Sessions.student_id == session.student_id,
            Sessions.start_time == session.start_time,
            Sessions.date == session.date,
            Sessions.venue == session.venue
        ).first()
        
        if existing:
            return {"error": "You already have a session at this time!"}

        # Create the session
        new_session = Sessions(
            course_id=session.course_id,
            teacher_id=session.teacher_id,
            student_id=session.student_id,
            date=session.date,
            start_time=session.start_time,
            end_time=session.end_time,
            venue=session.venue,
            admin_id=session.admin_id
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)

        # Create linked session record
        new_record = Session_records(
            session_id=new_session.session_id,
            teacher_id=session.teacher_id,
            student_id=session.student_id,
            course_id=session.course_id,
            attendant_id=session.attendant_id
        )
        db.add(new_record)
        db.commit()
        db.refresh(new_record)

        # Optional: notification
        await notification_queue.put(
            f"Student-created session on {session.date}."
        )

        return {
            "message": "Student session created successfully!",
            "session_id": new_session.session_id,
            "session_record_id": new_record.session_record_id
        }

    except Exception as e:
        db.rollback()
        return {"error": f"Failed to create student session: {str(e)}"}
    finally:
        db.close()


@app.get("/teacher/{tid}")
def get_teacher(tid:int):
    db=Sessionlocal()
    teacher=db.query(Teacher).filter(Teacher.teacher_id==tid).first()
    if not teacher:
        return {"error":"Teacher not found"}
    return teacher

@app.post("/Create_Teacher_Sessions")
def Create_Teacher_Sessions(session:Create_Sessions_class):
  db=Sessionlocal()

  # ... existing duplicate check ...

  new_session=Sessions(...)
  db.add(new_session)
  db.commit()
  db.refresh(new_session)

  # âœ… FIX: Remove session_record_id assignment
  new_record = Session_records(
      session_id=new_session.session_id,  # âœ… Correct FK
      teacher_id=session.teacher_id,
      student_id=session.student_id,
      course_id=session.course_id,
      attendant_id=None
      # âŒ DON'T set session_record_id manually
  )

  db.add(new_record)
  db.commit()
  db.refresh(new_record)

  db.close()

  return {
      "message": "Session created successfully!",
      "session_id": new_session.session_id,
      "session_record_id": new_record.session_record_id  # âœ… Return auto-generated ID
  }

@app.get("/student/{sid}")
def get_student(sid:int):
    db=Sessionlocal()
    student=db.query(Student).filter(Student.student_id==sid).first()
    if not student:
        return {"error":"Student not found"}
    return student


@app.get("/student_course_id")
def std_course_id():
    db=Sessionlocal()
    std_course=db.query(Student_Courses).all()  
    db.add(std_course)
    db.commit()
    db.refresh()
    db.close()

@app.get("/get_courses_by_student")
def get_courses_by_student(sid: int):
    db = Sessionlocal()
    try:
        result = (
            db.query(
                Courses.course_id,
                Courses.course_name,
                Teacher.teacher_id,
                Teacher.name.label("teacher_name"),
            )
            .join(Student_Courses, Student_Courses.course_id == Courses.course_id)
            .join(Teacher, Teacher.teacher_id == Courses.teacher_id)
            .filter(Student_Courses.student_id == sid)
            .all()
        )

        courses_list = [
            {
                "course_id": r.course_id,
                "course_name": r.course_name,
                "teacher_id": r.teacher_id,
                "teacher_name": r.teacher_name,
            }
            for r in result
        ]

        return courses_list

    finally:
        db.close()


from sqlalchemy.orm import joinedload

@app.get("/get_teacher_by_course")
def get_teacher_by_course(sid: int):
    db = Sessionlocal()
    try:
        # Query teachers along with their course info
        results = db.query(
            Teacher.teacher_id,
            Teacher.name,
            Courses.course_id,
            Courses.course_name,
            Courses.course_code
        ).join(
            Courses, Courses.teacher_id == Teacher.teacher_id
        ).join(
            Student_Courses, Student_Courses.course_id == Courses.course_id
        ).filter(
            Student_Courses.student_id == sid
        ).all()
        
        # Convert to list of dictionaries
        teachers_list = [
            {
                "teacher_id": r.teacher_id,
                "name": r.name,
                "course_id": r.course_id,
                "course_name": r.course_name,
                "course_code": r.course_code
            }
            for r in results
        ]
        
        return teachers_list
    finally:
        db.close()


@app.post("/api/eeg/test_connection")
async def test_eeg_connection():
    """Check if Muse is already streaming - don't start a new process!"""
    try:
        from pylsl import resolve_byprop
        import time
        
        print("🧠 Checking for existing Muse stream...")
        
        # STEP 1: Look for existing LSL streams (fast check)
        streams = resolve_byprop('type', 'EEG', timeout=3)
        
        if streams:
            print(f"✅ Found existing EEG stream: {len(streams)} streams")
            
            # Test if we can get data
            try:
                from pylsl import StreamInlet
                inlet = StreamInlet(streams[0])
                sample, timestamp = inlet.pull_sample(timeout=0.5)
                
                if sample is not None:
                    return {
                        "success": True,
                        "connected": True,
                        "message": f"Muse streaming! {len(sample)} channels active.",
                        "immediate_data": True
                    }
                else:
                    return {
                        "success": True,
                        "connected": True,
                        "message": f"Muse stream found ({len(streams)} streams). Starting up...",
                        "immediate_data": False
                    }
            except Exception as e:
                print(f"⚠️ Stream check error: {e}")
                return {
                    "success": True,
                    "connected": True,
                    "message": f"Muse stream detected",
                    "immediate_data": False
                }
        
        # STEP 2: If no stream found, check if we should start one
        print("❌ No existing EEG stream found")
        
        return {
            "success": False,
            "connected": False,
            "message": "No Muse stream found.\n\nPlease do this FIRST:\n1. Open a terminal\n2. Run: muselsl stream\n3. Wait for 'Streaming EEG...'\n4. Then click Connect here"
        }
        
    except Exception as e:
        print(f"❌ Connection check error: {e}")
        return {
            "success": False,
            "connected": False,
            "message": f"Error checking connection: {str(e)}"
        }
           
class EEGStartRequest(BaseModel):
    student_name: str  # Changed from 'name'
    teacher_name: str  # NEW - add this
    arid_no: str
    duration: int  # Already in seconds âœ…
    test_connection: bool = False



@app.post("/api/eeg/force_stop")
async def force_stop_eeg():
    """Force stop all EEG streaming (emergency)"""
    try:
        import subprocess
        import os
        import sys
        
        # Kill all muselsl processes
        if sys.platform == "win32":
            os.system('taskkill /f /im muselsl.exe 2>nul')
            os.system('taskkill /f /im python.exe /fi "WINDOWTITLE eq muselsl*" 2>nul')
        else:
            os.system('pkill -f muselsl 2>/dev/null')
        
        # Reset streaming state
        from eeg_streaming import reset_streaming, streaming_lock
        if streaming_lock.locked():
            streaming_lock.release()
        
        result = reset_streaming()
        
        return {
            "success": True,
            "message": "All EEG processes stopped and reset",
            "details": result
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}
    
@app.post("/api/eeg/start")
async def start_eeg_streaming(request: EEGStartRequest):
    """
    Start EEG streaming
    - Validates input
    - Converts time to seconds
    - Starts EEG device connection
    - Returns success/error response
    """
    try:
        # Validate inputs
        if not request.student_name or not request.student_name.strip():
            raise HTTPException(status_code=400, detail="Student name is required")

        if not request.teacher_name or not request.teacher_name.strip():
            raise HTTPException(status_code=400, detail="Teacher name is required")

        if not request.arid_no or not request.arid_no.strip():
            raise HTTPException(status_code=400, detail="ARID number is required")

        if request.duration <= 0:
            raise HTTPException(status_code=400, detail="Duration must be greater than 0")

        # Start streaming (this connects to Muse EEG device)
        result = eeg_streaming.start_streaming(
            student_name=request.student_name,
            teacher_name=request.teacher_name,
            arid_no=request.arid_no,
            duration=request.duration
        )

        # If backend returns error
        if isinstance(result, dict) and "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start streaming: {str(e)}")

@app.get("/api/eeg/ready")
async def check_eeg_ready():
    """Check if EEG is ready for camera sync"""
    try:
        status = eeg_streaming.get_streaming_status()
        
        # Consider these states as "ready for camera"
        ready_states = ['recording', 'connecting', 'processing']
        
        return {
            "ready": status['status'] in ready_states,
            "status": status['status'],
            "device_connected": status['device_connected'],
            "message": status['message']
        }
    except Exception as e:
        return {"ready": False, "error": str(e)}


@app.post("/api/eeg/pause")
async def pause_eeg_streaming():
    """
    Pause EEG streaming
    - Pauses data collection
    - Time does not count while paused
    """
    try:
        result = eeg_streaming.pause_streaming()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to pause streaming: {str(e)}")

@app.post("/api/eeg/resume")
async def resume_eeg_streaming():
    """
    Resume EEG streaming
    - Continues data collection from where it was paused
    """
    try:
        result = eeg_streaming.resume_streaming()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to resume streaming: {str(e)}")


@app.post("/api/eeg/stop")
async def stop_eeg_streaming():
    """
    Stop EEG streaming
    - Stops data collection immediately
    - Saves whatever data has been collected
    """
    try:
        result = eeg_streaming.stop_streaming()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop streaming: {str(e)}")
    

@app.get("/api/sse/status")
async def sse_status():
    """Check SSE connection status"""
    return {
        "queue_size": notification_queue.qsize(),
        "active_connections": len(active_sse_connections),
        "max_queue_size": 100,
        "status": "healthy" if notification_queue.qsize() < 90 else "warning"
    }
@app.post("/api/eeg/reset")
async def reset_eeg():
    """
    Reset EEG streaming state
    - Clears all streaming data
    - Resets to idle state
    """
    try:
        result = eeg_streaming.reset_streaming()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset: {str(e)}")

@app.post("/api/get_eeg_file")
async def get_eeg_file(request: dict):
    """
    Return EEG file contents for upload
    """
    try:
        file_path = request.get('file_path')
        
        if not file_path or not os.path.exists(file_path):
            return JSONResponse(
                status_code=404,
                content={'error': 'EEG file not found'}
            )
        
        # Read file and return as response
        with open(file_path, 'rb') as f:
            file_data = f.read()
        
        return Response(
            content=file_data,
            media_type='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename="{os.path.basename(file_path)}"'
            }
        )
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={'error': str(e)}
        )
    
from typing import Union
from fastapi import File, Form, UploadFile
import logging

# Add logging at the top
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.post("/api/upload_video")
async def upload_video(
    # Required fields
    session_id: int = Form(...),
    student_name: str = Form(...),
    teacher_name: str = Form(...),
    arid_no: str = Form(...),
    
    # ALL FILES NOW OPTIONAL
    eeg_file: Union[UploadFile, None] = File(None),
    teacher_video: Union[UploadFile, None] = File(None),
    student_video: Union[UploadFile, None] = File(None),
    
    # Edit mode flag
    edit_mode: bool = Form(False)
):
    try:
        db = Sessionlocal()

        # Get session_record_id
        record = db.query(Session_records).filter(
            Session_records.session_id == session_id
        ).first()

        if not record:
            db.close()
            return JSONResponse(
                status_code=404,
                content={'success': False, 'error': "Session record not found"}
            )

        session_record_id = record.session_record_id

        # Check if results already exist
        existing_result = db.query(Session_results).filter(
            Session_results.session_record_id == session_record_id
        ).first()

        # Create session folder
        out = Path.cwd() / "output"
        out.mkdir(exist_ok=True)

        folder_name = f"{student_name}_{arid_no}"
        existing_folders = [f for f in out.iterdir() if f.is_dir() and f.name.startswith(folder_name)]

        if existing_folders:
            session_path = max(existing_folders, key=lambda x: x.stat().st_ctime)
        else:
            folder = f"{folder_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            session_path = out / folder
            session_path.mkdir(exist_ok=True)

        # Helper to save file
        async def save_file(file, filename: str):
            if not file or not hasattr(file, 'filename') or not file.filename:
                return None
            
            filepath = session_path / filename
            data = await file.read()
            
            if len(data) == 0:
                return None
                
            with open(filepath, "wb") as f:
                f.write(data)
                
            return str(filepath)

        # Process uploads (only save files that are provided)
        uploaded = []
        
        teacher_video_path = None
        student_video_path = None
        eeg_data_path = None

        if eeg_file:
            eeg_data_path = await save_file(eeg_file, f"{student_name}_{arid_no}_EEG_cleaned.csv")
            if eeg_data_path:
                uploaded.append("eeg_file")

        if teacher_video:
            teacher_video_path = await save_file(teacher_video, f"{teacher_name}_{student_name}_{arid_no}_teacher.webm")
            if teacher_video_path:
                uploaded.append("teacher_video")

        if student_video:
            student_video_path = await save_file(student_video, f"{student_name}_{arid_no}_student.webm")
            if student_video_path:
                uploaded.append("student_video")

        # Validation: At least one file required
        if not uploaded:
            db.close()
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "At least one file must be uploaded!"}
            )

        # Save to DB
        if existing_result:
            # UPDATE MODE: Only update fields that have new files
            if teacher_video_path:
                existing_result.teacher_video_path = teacher_video_path
            if student_video_path:
                existing_result.student_video_path = student_video_path
            if eeg_data_path:
                existing_result.eeg_data_path = eeg_data_path
                
            db.commit()
            db.refresh(existing_result)
            msg = f"Updated: {', '.join(uploaded)}"
        else:
            # CREATE MODE
            new = Session_results(
                session_record_id=session_record_id,
                teacher_video_path=teacher_video_path,
                student_video_path=student_video_path,
                eeg_data_path=eeg_data_path
            )
            db.add(new)
            db.commit()
            db.refresh(new)
            msg = "Files uploaded successfully"

        db.close()

        return JSONResponse(content={
            "success": True,
            "message": msg,
            "uploaded": uploaded
        })

    except Exception as e:
        if "db" in locals():
            db.rollback()
            db.close()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
        

    
@app.get("/api/sessions/list")
async def list_sessions():
    """List all recorded sessions"""
    import os
    import json
    
    try:
        output_dir = r"C:\Users\HP\Desktop\FYP_PROJECT\BACK END\output"
        
        if not os.path.exists(output_dir):
            return JSONResponse(content={'sessions': []})
        
        sessions = []
        
        for folder_name in os.listdir(output_dir):
            folder_path = os.path.join(output_dir, folder_name)
            
            if not os.path.isdir(folder_path):
                continue
            
            metadata_file = os.path.join(folder_path, "session_metadata.json")
            
            if os.path.exists(metadata_file):
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
                    
                # Check if files exist
                metadata['has_eeg'] = os.path.exists(metadata.get('eeg_file', ''))
                metadata['has_predictions'] = os.path.exists(metadata.get('predicted_file', ''))
                metadata['has_student_video'] = os.path.exists(metadata.get('student_video', ''))
                metadata['has_teacher_video'] = os.path.exists(metadata.get('teacher_video', ''))
                metadata['folder_name'] = folder_name
                
                sessions.append(metadata)
        
        # Sort by start_time (most recent first)
        sessions.sort(key=lambda x: x.get('start_time', ''), reverse=True)
        
        return JSONResponse(content={'sessions': sessions})
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={'error': str(e)}
        )


muselsl_process = None

muselsl_process = None
stream_thread = None

# @app.post("/api/eeg/test_connection")
# async def test_eeg_connection():
#     """Simple, reliable Muse connection test."""
#     try:
#         import subprocess
#         import time
#         from pylsl import resolve_byprop
#         import os
        
#         print("=" * 60)
#         print("🧠 MUSE CONNECTION TEST - SIMPLIFIED VERSION")
#         print("=" * 60)
        
#         # STEP 1: Clean up old processes
#         print("🔧 Step 1: Cleaning up old processes...")
#         try:
#             if os.name == 'nt':  # Windows
#                 subprocess.run(['taskkill', '/F', '/IM', 'muselsl.exe'], 
#                              stdout=subprocess.DEVNULL, 
#                              stderr=subprocess.DEVNULL)
#                 subprocess.run(['taskkill', '/F', '/IM', 'python.exe', '/FI', 'WINDOWTITLE eq muselsl*'], 
#                              stdout=subprocess.DEVNULL, 
#                              stderr=subprocess.DEVNULL)
#             time.sleep(2)
#         except:
#             pass
        
#         # STEP 2: Check for existing streams first
#         print("📡 Step 2: Checking for existing EEG streams...")
#         streams = resolve_byprop('type', 'EEG', timeout=3)
        
#         if streams:
#             print(f"✅ Found {len(streams)} existing stream(s)!")
#             return {
#                 "success": True,
#                 "connected": True,
#                 "message": f"Muse already streaming! Found {len(streams)} stream(s).",
#                 "streams_count": len(streams),
#                 "immediate": True
#             }
        
#         # STEP 3: Start muselsl
#         print("🚀 Step 3: Starting muselsl...")
#         process = None
#         try:
#             process = subprocess.Popen(
#                 "muselsl stream",
#                 shell=True,
#                 stdout=subprocess.PIPE,
#                 stderr=subprocess.PIPE,
#                 creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0,
#                 text=True,
#                 bufsize=1
#             )
            
#             # STEP 4: Wait for stream to appear (with patience)
#             print("⏳ Step 4: Waiting for Muse stream (be patient, takes 5-15 seconds)...")
            
#             for attempt in range(20):  # 20 seconds max
#                 print(f"   Attempt {attempt + 1}/20...")
                
#                 streams = resolve_byprop('type', 'EEG', timeout=1)
#                 if streams:
#                     print(f"🎉 SUCCESS! Found {len(streams)} stream(s) after {attempt + 1} seconds")
                    
#                     # DON'T verify data - just return success
#                     # The stream existing means Muse is connected
                    
#                     # Keep the process running for later use
#                     return {
#                         "success": True,
#                         "connected": True,
#                         "message": f"Muse connected successfully! Found {len(streams)} stream(s).",
#                         "streams_count": len(streams),
#                         "immediate": False,
#                         "process_active": process.poll() is None
#                     }
                
#                 time.sleep(1)
            
#             # If we get here, timeout
#             print("❌ Timeout after 20 seconds")
#             if process and process.poll() is None:
#                 process.terminate()
#                 time.sleep(1)
            
#             return {
#                 "success": False,
#                 "connected": False,
#                 "message": "Muse not detected after 20 seconds.\n\nTroubleshooting:\n1. Make sure Muse is ON and paired\n2. LEDs should be blinking\n3. Try: 'muselsl stream' in terminal first"
#             }
            
#         except Exception as e:
#             print(f"❌ Error: {e}")
#             if process:
#                 process.terminate()
#             return {
#                 "success": False,
#                 "connected": False,
#                 "message": f"Failed to start Muse: {str(e)}"
#             }
            
#     except Exception as e:
#         print(f"❌ Unexpected error: {e}")
#         import traceback
#         traceback.print_exc()
#         return {
#             "success": False,
#             "connected": False,
#             "message": f"Connection test failed: {str(e)}"
#         }

@app.get("/api/session/{folder_name}")
async def get_session(folder_name: str):
    """Get detailed session information"""
    import os
    import json
    
    try:
        output_dir = r"C:\Users\HP\Desktop\FYP_PROJECT\BACK END\output"
        session_path = os.path.join(output_dir, folder_name)
        
        if not os.path.exists(session_path):
            return JSONResponse(
                status_code=404,
                content={'error': 'Session not found'}
            )
        
        metadata_file = os.path.join(session_path, "session_metadata.json")
        
        if not os.path.exists(metadata_file):
            return JSONResponse(
                status_code=404,
                content={'error': 'Session metadata not found'}
            )
        
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)
        
        return JSONResponse(content=metadata)
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={'error': str(e)}
        )

@app.get("/get_students_of_a_Section")
def get_sections_students(section: str):
    db = Sessionlocal()
    try:
        students_list = db.query(Student).filter(Student.section == section).all()
        if not students_list:
            return {"message": "no student found for this section!"}
        return students_list
    finally:
        db.close()
@app.get("/check_session_result/{result_id}")
def check_session_result(result_id: int, db: Session = Depends(get_db)):
    result = db.query(Session_results).filter(Session_results.result_id == result_id).first()

    if not result:
        raise HTTPException(status_code=404, detail="Session Result not found")

    # All fields and their stored values
    result_values = {
        "teacher_video_path": result.teacher_video_path,
        "student_video_path": result.student_video_path,
        "eeg_data_path": result.eeg_data_path
    }

    # Detect missing vs filled
    missing_fields = [field for field, value in result_values.items() if not value]
    filled_fields = {field: value for field, value in result_values.items() if value}

    return {
        "result_id": result_id,
        "summary": {
            "is_complete": len(missing_fields) == 0,
            "missing_fields": missing_fields,
            "filled_fields": list(filled_fields.keys())
        },
        "values": filled_fields   # return actual stored paths for verification
    }
@app.delete("/clear_session_result/{result_id}")
def clear_session_result(result_id: int, db: Session = Depends(get_db)):
    result = db.query(Session_results).filter(Session_results.result_id == result_id).first()

    if not result:
        raise HTTPException(status_code=404, detail="Session Result not found")

    # Clear all fields but keep ID & session_record_id
    result.teacher_video_path = None
    result.student_video_path = None
    result.eeg_data_path = None

    db.commit()

    return {
        "message": "All session result data cleared except ID",
        "result_id": result_id
    }
# from fastapi import HTTPException

@app.put("/update_session_result/{result_id}")
def update_session_result(
    result_id: int,
    teacher_video_path: str = None,
    student_video_path: str = None,
    eeg_data_path: str = None,
    db: Session = Depends(get_db)
):
    result = db.query(Session_results).filter(Session_results.result_id == result_id).first()

    if not result:
        raise HTTPException(status_code=404, detail="Session Result not found")

    if teacher_video_path is not None:
        result.teacher_video_path = teacher_video_path

    if student_video_path is not None:
        result.student_video_path = student_video_path

    if eeg_data_path is not None:
        result.eeg_data_path = eeg_data_path

    db.commit()

    return {"message": "Session result updated successfully", "result_id": result_id}

@app.get("/has_session_results/{session_id}")
def has_session_results(session_id: int):
    """
    Quick check if session has uploaded results
    """
    db = Sessionlocal()
    try:
        # Get session_record
        record = db.query(Session_records).filter(
            Session_records.session_id == session_id
        ).first()
        
        if not record:
            return {"has_results": False, "message": "No session record found"}
        
        # Check for results
        result = db.query(Session_results).filter(
            Session_results.session_record_id == record.session_record_id
        ).first()
        
        if not result:
            return {"has_results": False, "can_upload": True}
        
        # Check which files exist
        return {
            "has_results": True,
            "result_id": result.result_id,
            "has_teacher_video": bool(result.teacher_video_path),
            "has_student_video": bool(result.student_video_path),
            "has_eeg_data": bool(result.eeg_data_path),
            "can_edit": True
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        db.close()


@app.get("/attendent_sessions/{attendent_id}")
def get_attendent_sessions(attendent_id: int):
    """
    Get sessions assigned to a specific attendent
    """
    db = Sessionlocal()
    try:
        # Get sessions through Session_records
        records = db.query(Session_records).filter(
            Session_records.attendant_id == attendent_id
        ).all()
        
        if not records:
            return {"message": "No sessions found for this attendent"}
        
        detailed_sessions = []
        for record in records:
            session = db.query(Sessions).filter(
                Sessions.session_id == record.session_id
            ).first()
            
            if not session:
                continue
                
            teacher = db.query(Teacher).filter(Teacher.teacher_id == session.teacher_id).first()
            student = db.query(Student).filter(Student.student_id == session.student_id).first()
            course = db.query(Courses).filter(Courses.course_id == session.course_id).first()
            
            detailed_sessions.append({
                "session_id": session.session_id,
                "session_record_id": record.session_record_id,
                "course_name": course.course_name if course else "Unknown",
                "teacher_name": teacher.name if teacher else "Unknown",
                "student_name": student.name if student else "Unknown",
                "date": str(session.date),
                "start_time": session.start_time,
                "end_time": session.end_time,
                "venue": session.venue
            })
        
        return detailed_sessions
    except Exception as e:
        return {"error": str(e)}
    finally:
        db.close()
 
@app.get("/session_statistics")
def get_session_statistics():
    """
    Get session statistics for dashboard display
    """
    db = Sessionlocal()
    try:
        from datetime import date
        
        today = date.today()
        all_sessions = db.query(Sessions).all()
        
        today_count = sum(1 for s in all_sessions if s.date == today)
        upcoming_count = sum(1 for s in all_sessions if s.date > today)
        recent_count = sum(1 for s in all_sessions if s.date < today)
        
        # Count sessions with results
        results_count = db.query(Session_results).count()
        
        return {
            "today": today_count,
            "upcoming": upcoming_count,
            "recent": recent_count,
            "total": len(all_sessions),
            "with_results": results_count,
            "pending_results": max(0, recent_count - results_count)
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        db.close()
@app.get("/api/eeg/verify_completion")
async def verify_completion():
    """
    Verify if backend recording has truly completed
    Frontend should poll this after stopping to confirm
    """
    try:
        status = eeg_streaming.get_streaming_status()
        
        # Additional verification flags from eeg_streaming module
        completion_status = {
            "backend_status": status['status'],
            "device_connected": status['device_connected'],
            "elapsed_time": status['elapsed_time'],
            "total_duration": status['total_duration'],
            # Add these to eeg_streaming module:
            # "cleanup_complete": getattr(eeg_streaming, 'recording_cleanup_done', False),
            # "thread_alive": getattr(eeg_streaming, 'streaming_thread', None) and 
            #                eeg_streaming.streaming_thread.is_alive()
        }
        
        # Determine if safe to stop camera
        safe_to_stop = False
        if status['status'] in ['completed', 'stopped', 'error']:
            safe_to_stop = True
        elif status['status'] == 'recording' and status['elapsed_time'] >= status['total_duration']:
            safe_to_stop = True
        
        return {
            "safe_to_stop_camera": safe_to_stop,
            "backend_state": completion_status,
            "message": "Camera can be stopped" if safe_to_stop else "Wait for backend to finish"
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )    
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Backend is running'})

@app.post("/api/eeg/check_connection")
async def check_eeg_connection():
    """
    Check if EEG device is connected AND start streaming if not already running
    """
    try:
        import subprocess
        import time
        import sys
        import os
        from pylsl import resolve_byprop, StreamInlet
        
        print("=" * 60)
        print("🧠 EEG CONNECTION & STREAMING CHECK")
        print("=" * 60)
        
        # STEP 1: Kill any zombie processes
        print("1️⃣ Cleaning up old processes...")
        try:
            if sys.platform == "win32":
                subprocess.run(['taskkill', '/F', '/IM', 'muselsl.exe'], 
                             capture_output=True, timeout=3)
                subprocess.run(['taskkill', '/F', '/IM', 'python.exe', '/FI', 
                             'WINDOWTITLE eq muselsl*'], 
                             capture_output=True, timeout=3)
            else:
                subprocess.run(['pkill', '-f', 'muselsl'], 
                             capture_output=True, timeout=3)
            time.sleep(2)
            print("   ✅ Cleanup complete")
        except Exception as e:
            print(f"   ⚠️ Cleanup warning: {e}")
        
        # STEP 2: Check for existing streams (quick check)
        print("2️⃣ Checking for existing EEG streams...")
        streams = resolve_byprop('type', 'EEG', timeout=3)
        
        if streams:
            print(f"   ✅ Found {len(streams)} existing stream(s)")
            
            # Verify data is flowing
            try:
                inlet = StreamInlet(streams[0])
                sample, timestamp = inlet.pull_sample(timeout=2.0)
                
                if sample is not None:
                    print(f"   ✅ Data flowing: {len(sample)} channels")
                    return {
                        "success": True,
                        "connected": True,
                        "streaming": True,
                        "message": f"✅ Muse connected and streaming!\n\n📊 {len(sample)} EEG channels active\n🎯 Ready to record"
                    }
                else:
                    print("   ⚠️ Stream exists but no data yet")
            except Exception as e:
                print(f"   ⚠️ Data check failed: {e}")
        
        # STEP 3: No existing stream - need to start one
        print("3️⃣ No active stream found. Starting muselsl...")
        
        # First, verify Muse device is available
        print("   🔍 Scanning for Muse devices...")
        try:
            python_exe = sys.executable
            list_result = subprocess.run(
                f'"{python_exe}" -m muselsl list',
                shell=True,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            print(f"   muselsl list output:\n{list_result.stdout}")
            
            if "Muse-" not in list_result.stdout and "No Muse" in list_result.stdout:
                return {
                    "success": False,
                    "connected": False,
                    "streaming": False,
                    "message": "❌ No Muse device found via Bluetooth.\n\n🔧 Troubleshooting:\n1. Turn ON Muse (press power button)\n2. LEDs should blink blue\n3. Ensure Bluetooth is enabled\n4. Pair Muse in Windows Bluetooth settings\n5. Wait 10 seconds and try again"
                }
            
            print("   ✅ Muse device detected!")
            
        except Exception as e:
            print(f"   ⚠️ Device scan warning: {e}")
        
        # STEP 4: Start muselsl stream process
        print("4️⃣ Starting muselsl stream process...")
        try:
            # Use CREATE_NO_WINDOW on Windows to run in background
            creationflags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
            
            process = subprocess.Popen(
                f'"{python_exe}" -m muselsl stream',
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=creationflags,
                text=True
            )
            
            print("   ⏳ Process started, waiting for stream...")
            
            # STEP 5: Wait for stream to appear (with patience)
            max_wait = 30  # 30 seconds max wait
            for attempt in range(max_wait):
                time.sleep(1)
                print(f"   ⏳ Attempt {attempt + 1}/{max_wait}...")
                
                streams = resolve_byprop('type', 'EEG', timeout=1)
                if streams:
                    print(f"   🎉 Stream detected after {attempt + 1} seconds!")
                    
                    # Give extra time for data to start flowing
                    time.sleep(3)
                    
                    # Verify data
                    try:
                        inlet = StreamInlet(streams[0])
                        sample, timestamp = inlet.pull_sample(timeout=2.0)
                        
                        if sample is not None:
                            print(f"   ✅ SUCCESS! Data flowing: {len(sample)} channels")
                            return {
                                "success": True,
                                "connected": True,
                                "streaming": True,
                                "message": f"✅ Muse connected and streaming!\n\n📊 {len(sample)} EEG channels active\n⏱️ Started after {attempt + 1} seconds\n🎯 Ready to record"
                            }
                        else:
                            print("   ⚠️ Stream exists but waiting for first data packet...")
                            # Continue waiting
                    except Exception as e:
                        print(f"   ⚠️ Data check error: {e}")
                        # Continue waiting
                
                # Check if process died
                if process.poll() is not None:
                    stdout, stderr = process.communicate()
                    print(f"   ❌ Process terminated unexpectedly")
                    print(f"   stdout: {stdout[:200] if stdout else 'none'}")
                    print(f"   stderr: {stderr[:200] if stderr else 'none'}")
                    
                    return {
                        "success": False,
                        "connected": False,
                        "streaming": False,
                        "message": f"❌ muselsl process failed.\n\n🔧 Try manually:\n1. Open terminal\n2. Run: muselsl stream\n3. Look for 'Streaming EEG...'\n4. Then click Connect again"
                    }
            
            # Timeout reached
            print("   ❌ Timeout after 30 seconds")
            
            # Kill the process
            if process.poll() is None:
                process.terminate()
                time.sleep(1)
                if process.poll() is None:
                    process.kill()
            
            return {
                "success": False,
                "connected": False,
                "streaming": False,
                "message": "❌ Timeout waiting for Muse stream.\n\n🔧 Troubleshooting:\n1. Ensure Muse is ON and paired\n2. LEDs should blink blue\n3. Try manually: muselsl stream\n4. Check if other apps are using Muse\n5. Restart Muse device"
            }
            
        except Exception as e:
            print(f"   ❌ Error starting stream: {e}")
            import traceback
            traceback.print_exc()
            
            return {
                "success": False,
                "connected": False,
                "streaming": False,
                "message": f"❌ Failed to start stream: {str(e)}\n\nTry running 'muselsl stream' manually first."
            }
                
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        
        return {
            "success": False,
            "connected": False,
            "streaming": False,
            "message": f"❌ Connection test failed: {str(e)}"
        }

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "message": "FastAPI backend is running"}
     
@app.post("/api/eeg/check_stream_quality")
async def check_stream_quality():
    """Check if EEG stream has good data quality."""
    try:
        from pylsl import resolve_byprop, StreamInlet
        import time
        
        streams = resolve_byprop('type', 'EEG', timeout=3)
        
        if not streams:
            return {
                "success": False,
                "has_stream": False,
                "message": "No EEG stream found"
            }
        
        inlet = StreamInlet(streams[0])
        
        # Try to get samples for 2 seconds
        samples = []
        start_time = time.time()
        
        while time.time() - start_time < 2.0:
            sample, timestamp = inlet.pull_sample(timeout=0.1)
            if sample is not None:
                samples.append(sample)
        
        if not samples:
            return {
                "success": True,
                "has_stream": True,
                "data_quality": "poor",
                "message": "Stream exists but no data flowing",
                "samples_count": 0
            }
        
        # Analyze sample quality
        channel_count = len(samples[0])
        sample_rate = len(samples) / 2.0  # samples per second
        
        quality = "good"
        if sample_rate < 10:
            quality = "poor"
        elif sample_rate < 50:
            quality = "fair"
        
        return {
            "success": True,
            "has_stream": True,
            "data_quality": quality,
            "message": f"Stream quality: {quality}. {len(samples)} samples in 2s (~{sample_rate:.1f} Hz). Channels: {channel_count}",
            "samples_count": len(samples),
            "estimated_hz": sample_rate,
            "channels": channel_count
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"Stream check error: {str(e)}"
        }

# ============================================================
# ENDPOINT 1: Check/Start EEG Connection (Device + Stream Setup)
# ============================================================
@app.post("/api/eeg/connect")
async def connect_eeg_device():
    """
    Step 1: Connect to Muse device and start LSL stream
    This prepares the device but does NOT start recording data
    """
    try:
        import subprocess
        import time
        import sys
        import os
        from pylsl import resolve_byprop, StreamInlet
        
        print("=" * 60)
        print("🧠 EEG DEVICE CONNECTION")
        print("=" * 60)
        
        # STEP 1: Kill any zombie processes
        print("1️⃣ Cleaning up old processes...")
        try:
            if sys.platform == "win32":
                subprocess.run(['taskkill', '/F', '/IM', 'muselsl.exe'], 
                             capture_output=True, timeout=3)
                subprocess.run(['taskkill', '/F', '/IM', 'python.exe', '/FI', 
                             'WINDOWTITLE eq muselsl*'], 
                             capture_output=True, timeout=3)
            else:
                subprocess.run(['pkill', '-f', 'muselsl'], 
                             capture_output=True, timeout=3)
            time.sleep(2)
            print("   ✅ Cleanup complete")
        except Exception as e:
            print(f"   ⚠️ Cleanup warning: {e}")
        
        # STEP 2: Check for existing streams
        print("2️⃣ Checking for existing EEG streams...")
        streams = resolve_byprop('type', 'EEG', timeout=3)
        
        if streams:
            print(f"   ✅ Found {len(streams)} existing stream(s)")
            
            # Verify data is flowing
            try:
                inlet = StreamInlet(streams[0])
                sample, timestamp = inlet.pull_sample(timeout=2.0)
                
                if sample is not None:
                    print(f"   ✅ Data flowing: {len(sample)} channels")
                    return {
                        "success": True,
                        "connected": True,
                        "streaming": True,
                        "channels": len(sample),
                        "message": f"✅ Muse already connected!\n\n📊 {len(sample)} EEG channels active\n🎯 Ready to start recording"
                    }
            except Exception as e:
                print(f"   ⚠️ Data check failed: {e}")
        
        # STEP 3: Start muselsl stream
        print("3️⃣ Starting muselsl stream...")
        
        try:
            python_exe = sys.executable
            creationflags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
            
            process = subprocess.Popen(
                f'"{python_exe}" -m muselsl stream',
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=creationflags,
                text=True
            )
            
            print("   ⏳ Process started, waiting for stream...")
            
            # Wait for stream (max 30 seconds)
            max_wait = 30
            for attempt in range(max_wait):
                time.sleep(1)
                print(f"   ⏳ Attempt {attempt + 1}/{max_wait}...")
                
                streams = resolve_byprop('type', 'EEG', timeout=1)
                if streams:
                    print(f"   🎉 Stream detected after {attempt + 1} seconds!")
                    
                    # Give time for data to start
                    time.sleep(3)
                    
                    # Verify data
                    try:
                        inlet = StreamInlet(streams[0])
                        sample, timestamp = inlet.pull_sample(timeout=2.0)
                        
                        if sample is not None:
                            print(f"   ✅ SUCCESS! Data flowing: {len(sample)} channels")
                            return {
                                "success": True,
                                "connected": True,
                                "streaming": True,
                                "channels": len(sample),
                                "wait_time": attempt + 1,
                                "message": f"✅ Muse connected successfully!\n\n📊 {len(sample)} EEG channels active\n⏱️ Connection time: {attempt + 1}s\n🎯 Ready to start recording"
                            }
                    except Exception as e:
                        print(f"   ⚠️ Data check error: {e}")
                
                # Check if process died
                if process.poll() is not None:
                    stdout, stderr = process.communicate()
                    print(f"   ❌ Process terminated unexpectedly")
                    
                    return {
                        "success": False,
                        "connected": False,
                        "streaming": False,
                        "message": "❌ muselsl process failed.\n\n🔧 Try:\n1. Ensure Muse is ON and paired\n2. Run 'muselsl stream' manually\n3. Click Connect again"
                    }
            
            # Timeout
            print("   ❌ Timeout after 30 seconds")
            if process.poll() is None:
                process.terminate()
            
            return {
                "success": False,
                "connected": False,
                "streaming": False,
                "message": "❌ Timeout waiting for Muse.\n\n🔧 Troubleshooting:\n1. Ensure Muse is ON (blue LEDs blinking)\n2. Check Bluetooth pairing\n3. Try: muselsl list\n4. Restart Muse device"
            }
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            import traceback
            traceback.print_exc()
            
            return {
                "success": False,
                "connected": False,
                "streaming": False,
                "message": f"❌ Connection failed: {str(e)}"
            }
                
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        
        return {
            "success": False,
            "connected": False,
            "streaming": False,
            "message": f"❌ Connection error: {str(e)}"
        }

@app.get("/api/eeg/status")
async def get_eeg_status():
    """
    Get current EEG streaming status
    - Returns real-time status updates
    - Called every second by frontend
    
    Returns:
        {
            'status': 'idle' | 'connecting' | 'recording' | 'paused' | 'stopped' | 'completed' | 'error',
            'message': 'Status message',
            'elapsed_time': int (seconds),
            'total_duration': int (seconds),
            'current_label': 'Sleepy' | 'Relaxed' | 'Focused' | 'Stressed' | 'Neutral',
            'device_connected': bool,
            'output_filename': 'path/to/file.csv'
        }
    """
    try:
        status = eeg_streaming.get_streaming_status()
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")


# ============================================================
# ENDPOINT 2: Start EEG Recording (Begins Data Collection)
# ============================================================
# @app.post("/api/eeg/start_recording")
# async def start_eeg_recording(request: dict):
#     student_name = request.get('student_name')
#     teacher_name = request.get('teacher_name')
#     arid_no = request.get('arid_no')
#     duration = int(request.get('duration', 20))

#     if not all([student_name, teacher_name, arid_no, duration]):
#         return {"success": False, "error": "Missing required fields"}

#     # Update global state
#     eeg_state.update({
#         "streaming": True,
#         "recording": True,
#         "duration": duration,
#         "elapsed": 0,
#         "samples_collected": 0,
#         "current_student": student_name,
#         "current_teacher": teacher_name,
#         "arid": arid_no
#     })

#     # Resolve EEG stream
#     streams = resolve_byprop('type', 'EEG', timeout=3)
#     if not streams:
#         eeg_state["streaming"] = False
#         eeg_state["recording"] = False
#         return {"success": False, "error": "No EEG stream detected"}

#     inlet = StreamInlet(streams[0])

#     print(f"🎬 Recording started for {duration}s")
#     for second in range(duration):
#         sample, timestamp = inlet.pull_sample(timeout=1.0)
#         if sample is not None:
#             eeg_state["samples_collected"] += 1
#         eeg_state["elapsed"] = second + 1
#         await asyncio.sleep(1)

#     eeg_state["recording"] = False
#     eeg_state["elapsed"] = duration

#     print("🎬 Recording finished")
#     return {"success": True, "message": "Recording complete", "samples_collected": eeg_state["samples_collected"]}

# ============================================================
# BONUS: Quick Connection Status Check (No Connection Attempt)
# ============================================================
@app.get("/api/eeg/connection_status")
async def check_eeg_connection_status():
    """
    Quick check: Is EEG device currently connected and streaming?
    Does NOT attempt to connect - just checks current state
    """
    try:
        from pylsl import resolve_byprop, StreamInlet
        
        streams = resolve_byprop('type', 'EEG', timeout=2)
        
        if not streams:
            return {
                "connected": False,
                "streaming": False,
                "message": "No EEG stream detected"
            }
        
        # Check if data is flowing
        try:
            inlet = StreamInlet(streams[0])
            sample, timestamp = inlet.pull_sample(timeout=1.0)
            
            if sample is not None:
                return {
                    "connected": True,
                    "streaming": True,
                    "channels": len(sample),
                    "message": f"✅ Connected - {len(sample)} channels active"
                }
            else:
                return {
                    "connected": True,
                    "streaming": False,
                    "message": "Stream exists but no data"
                }
        except Exception as e:
            return {
                "connected": True,
                "streaming": False,
                "error": str(e),
                "message": "Stream exists but data check failed"
            }
            
    except Exception as e:
        return {
            "connected": False,
            "streaming": False,
            "error": str(e),
            "message": f"Error checking status: {str(e)}"
        }    

@app.get("/api/session_summary/{session_id}")
def get_session_summary(session_id: int):
    """
    Generate comprehensive session summary with EEG statistics
    """
    db = Sessionlocal()
    try:
        # Get session results
        session = db.query(Sessions).filter(Sessions.session_id == session_id).first()
        if not session:
            return {"error": "Session not found"}
        
        session_record = db.query(Session_records).filter(
            Session_records.session_id == session_id
        ).first()
        
        if not session_record:
            return {"error": "No session record found"}
        
        result = db.query(Session_results).filter(
            Session_results.session_record_id == session_record.session_record_id
        ).first()
        
        if not result or not result.eeg_data_path:
            return {"error": "No EEG data found"}
        
        # Read and analyze EEG CSV
        import pandas as pd
        import os
        from datetime import datetime
        
        if not os.path.exists(result.eeg_data_path):
            return {"error": "EEG file not found"}
        
        df = pd.read_csv(result.eeg_data_path)
        
        # DEBUG: Print column names and sample
        print("CSV Columns:", df.columns.tolist())
        print("First few rows:")
        print(df.head())
        
        # Clean column names (remove spaces, lowercase)
        df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')
        
        # Check if we have time column
        time_column = None
        for col in ['time', 'timestamp', 't']:
            if col in df.columns:
                time_column = col
                break
        
        # Calculate duration PROPERLY
        total_duration = 0
        if time_column and time_column in df.columns:
            # Convert time strings to seconds
            def time_to_seconds(time_str):
                try:
                    # Handle HH:MM:SS format
                    if isinstance(time_str, str) and ':' in time_str:
                        parts = time_str.split(':')
                        if len(parts) == 3:  # HH:MM:SS
                            h, m, s = parts
                            return int(h) * 3600 + int(m) * 60 + float(s)
                        elif len(parts) == 2:  # MM:SS
                            m, s = parts
                            return int(m) * 60 + float(s)
                    # If it's already a number
                    return float(time_str)
                except:
                    return 0
            
            df['time_seconds'] = df[time_column].apply(time_to_seconds)
            
            # Calculate actual duration
            if len(df) > 1:
                total_duration = df['time_seconds'].max() - df['time_seconds'].min()
            else:
                total_duration = 0
        else:
            # Fallback: assume 1 sample per second
            total_duration = len(df)
        
        # Ensure label column exists (case-insensitive)
        label_column = None
        for col in ['label', 'cognitive_load', 'load']:
            if col in df.columns:
                label_column = col
                break
        
        if not label_column:
            return {"error": "No label/cognitive load column found in EEG data"}
        
        # Clean labels
        df['clean_label'] = df[label_column].astype(str).str.strip().str.lower()
        
        # Cognitive load distribution
        label_counts = df['clean_label'].value_counts().to_dict()
        label_percentages = {
            label: (count / len(df)) * 100 
            for label, count in label_counts.items()
        }
        
        # Brainwave columns (case-insensitive)
        brainwave_bands = {}
        band_mapping = {
            'delta': ['delta'],
            'theta': ['theta'],
            'alpha': ['alpha'],
            'beta': ['beta'],
            'gamma': ['gamma']
        }
        
        for band, possible_names in band_mapping.items():
            for name in possible_names:
                if name in df.columns:
                    brainwave_bands[band] = name
                    break
        
        # Brainwave averages
        brainwave_stats = {}
        for band, col_name in brainwave_bands.items():
            if col_name in df.columns:
                brainwave_stats[band] = {
                    'mean': float(df[col_name].mean()),
                    'max': float(df[col_name].max()),
                    'min': float(df[col_name].min())
                }
            else:
                brainwave_stats[band] = {
                    'mean': 0.0,
                    'max': 0.0,
                    'min': 0.0
                }
        
        # Engagement score (custom formula)
        high_load_percentage = (
            label_percentages.get('very high', 0) + 
            label_percentages.get('high', 0)
        )
        engagement_score = min(100, int(high_load_percentage * 1.5))
        
        # Attention dips (low/very low cognitive load segments)
        attention_dips = []
        current_dip_start = None
        
        for idx, row in df.iterrows():
            if row['clean_label'] in ['low', 'very low']:
                if current_dip_start is None:
                    current_dip_start = idx
            else:
                if current_dip_start is not None:
                    # Get actual timestamps
                    start_idx = current_dip_start
                    end_idx = idx - 1 if idx > 0 else idx
                    
                    # Calculate using time_seconds if available
                    if 'time_seconds' in df.columns:
                        start_time = float(df.loc[start_idx, 'time_seconds'])
                        end_time = float(df.loc[end_idx, 'time_seconds'])
                        duration = end_time - start_time
                    else:
                        # Fallback to index
                        start_time = float(start_idx)
                        end_time = float(end_idx)
                        duration = end_time - start_time
                    
                    attention_dips.append({
                        'start_time': start_time,
                        'end_time': end_time,
                        'duration': duration
                    })
                    current_dip_start = None
        
        # Handle last dip if exists
        if current_dip_start is not None:
            start_idx = current_dip_start
            end_idx = len(df) - 1
            
            if 'time_seconds' in df.columns:
                start_time = float(df.loc[start_idx, 'time_seconds'])
                end_time = float(df.loc[end_idx, 'time_seconds'])
                duration = end_time - start_time
            else:
                start_time = float(start_idx)
                end_time = float(end_idx)
                duration = end_time - start_time
            
            attention_dips.append({
                'start_time': start_time,
                'end_time': end_time,
                'duration': duration
            })
        
        # Peak moments (FIXED - handle time conversion properly)
        peak_moments = {}
        for band in ['delta', 'alpha', 'beta']:
            if band in brainwave_bands and brainwave_bands[band] in df.columns:
                max_idx = df[brainwave_bands[band]].idxmax()
                if 'time_seconds' in df.columns:
                    peak_time = float(df.loc[max_idx, 'time_seconds'])
                elif time_column and time_column in df.columns:
                    # Try to convert original time string
                    time_val = df.loc[max_idx, time_column]
                    try:
                        if isinstance(time_val, str) and ':' in time_val:
                            parts = time_val.split(':')
                            if len(parts) == 3:
                                h, m, s = parts
                                peak_time = int(h) * 3600 + int(m) * 60 + float(s)
                            elif len(parts) == 2:
                                m, s = parts
                                peak_time = int(m) * 60 + float(s)
                            else:
                                peak_time = float(time_val)
                        else:
                            peak_time = float(time_val)
                    except:
                        peak_time = float(max_idx)
                else:
                    peak_time = float(max_idx)
                
                peak_moments[band] = peak_time
            else:
                peak_moments[band] = 0.0
        
        # Format duration
        if total_duration >= 3600:
            hours = int(total_duration // 3600)
            minutes = int((total_duration % 3600) // 60)
            seconds = int(total_duration % 60)
            duration_formatted = f"{hours}h {minutes}m {seconds}s"
        elif total_duration >= 60:
            minutes = int(total_duration // 60)
            seconds = int(total_duration % 60)
            duration_formatted = f"{minutes}m {seconds}s"
        else:
            duration_formatted = f"{int(total_duration)}s"
        
        return {
            "session_id": session_id,
            "duration_seconds": float(total_duration),
            "duration_formatted": duration_formatted,
            "cognitive_load_distribution": label_percentages,
            "brainwave_statistics": brainwave_stats,
            "engagement_score": engagement_score,
            "attention_dips_count": len(attention_dips),
            "attention_dips": attention_dips[:10],  # Return top 10
            "peak_moments": peak_moments
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": f"Error processing EEG data: {str(e)}"}
    finally:
        db.close()
        
from models import Session_Annotations

class AnnotationCreate(BaseModel):
    session_id: int
    timestamp: float
    annotation_type: str  # 'bookmark', 'note', 'flag'
    title: str
    description: Optional[str] = ""
    color: Optional[str] = "#3b82f6"

@app.post("/api/annotations/create")
def create_annotation(annotation: AnnotationCreate):
    """Create a new annotation for a session"""
    db = Sessionlocal()
    try:
        from datetime import datetime
        
        new_annotation = Session_Annotations(
            session_id=annotation.session_id,
            timestamp=annotation.timestamp,
            annotation_type=annotation.annotation_type,
            title=annotation.title,
            description=annotation.description,
            created_by_user_id=1,  # TODO: Get from auth token
            created_at=datetime.now().isoformat(),
            color=annotation.color
        )
        
        db.add(new_annotation)
        db.commit()
        db.refresh(new_annotation)
        
        return {
            "success": True,
            "annotation_id": new_annotation.annotation_id,
            "message": "Annotation created successfully"
        }
    except Exception as e:
        db.rollback()
        return {"success": False, "error": str(e)}
    finally:
        db.close()

@app.get("/api/annotations/{session_id}")
def get_session_annotations(session_id: int):
    """Get all annotations for a session"""
    db = Sessionlocal()
    try:
        annotations = db.query(Session_Annotations).filter(
            Session_Annotations.session_id == session_id
        ).order_by(Session_Annotations.timestamp).all()
        
        return {
            "success": True,
            "annotations": [
                {
                    "annotation_id": a.annotation_id,
                    "timestamp": a.timestamp,
                    "type": a.annotation_type,
                    "title": a.title,
                    "description": a.description,
                    "color": a.color,
                    "created_at": a.created_at
                }
                for a in annotations
            ]
        }
    finally:
        db.close()

@app.delete("/api/annotations/{annotation_id}")
def delete_annotation(annotation_id: int):
    """Delete an annotation"""
    db = Sessionlocal()
    try:
        annotation = db.query(Session_Annotations).filter(
            Session_Annotations.annotation_id == annotation_id
        ).first()
        
        if not annotation:
            return {"success": False, "error": "Annotation not found"}
        
        db.delete(annotation)
        db.commit()
        
        return {"success": True, "message": "Annotation deleted"}
    except Exception as e:
        db.rollback()
        return {"success": False, "error": str(e)}
    finally:
        db.close()

from fastapi.responses import StreamingResponse
import io

@app.get("/api/export/session_report/{session_id}")
def export_session_report(session_id: int, format: str = "pdf"):
    """
    Export session report as PDF or JSON
    """
    db = Sessionlocal()
    try:
        # Get session summary
        import requests
        summary = requests.get(f"{settings.INTERNAL_API_BASE}/api/session_summary/{session_id}").json()
        
        if "error" in summary:
            return {"error": summary["error"]}
        
        # Get session details
        session = db.query(Sessions).filter(Sessions.session_id == session_id).first()
        teacher = db.query(Teacher).filter(Teacher.teacher_id == session.teacher_id).first()
        student = db.query(Student).filter(Student.student_id == session.student_id).first()
        course = db.query(Courses).filter(Courses.course_id == session.course_id).first()
        
        if format == "json":
            return {
                "session_info": {
                    "session_id": session_id,
                    "date": str(session.date),
                    "teacher": teacher.name,
                    "student": student.name,
                    "course": course.course_name
                },
                "summary": summary
            }
        
        elif format == "pdf":
            # Use reportlab for PDF generation
            from reportlab.lib.pagesizes import letter
            from reportlab.pdfgen import canvas
            from reportlab.lib.units import inch
            
            buffer = io.BytesIO()
            c = canvas.Canvas(buffer, pagesize=letter)
            width, height = letter
            
            # Title
            c.setFont("Helvetica-Bold", 16)
            c.drawString(1*inch, height - 1*inch, f"Session Report #{session_id}")
            
            # Session Info
            c.setFont("Helvetica", 12)
            y = height - 1.5*inch
            c.drawString(1*inch, y, f"Date: {session.date}")
            y -= 0.3*inch
            c.drawString(1*inch, y, f"Teacher: {teacher.name}")
            y -= 0.3*inch
            c.drawString(1*inch, y, f"Student: {student.name}")
            y -= 0.3*inch
            c.drawString(1*inch, y, f"Course: {course.course_name}")
            
            # Statistics
            y -= 0.6*inch
            c.setFont("Helvetica-Bold", 14)
            c.drawString(1*inch, y, "Session Statistics")
            
            y -= 0.4*inch
            c.setFont("Helvetica", 11)
            c.drawString(1*inch, y, f"Duration: {summary['duration_formatted']}")
            y -= 0.3*inch
            c.drawString(1*inch, y, f"Engagement Score: {summary['engagement_score']}/100")
            y -= 0.3*inch
            c.drawString(1*inch, y, f"Attention Dips: {summary['attention_dips_count']}")
            
            # Cognitive Load Distribution
            y -= 0.6*inch
            c.setFont("Helvetica-Bold", 14)
            c.drawString(1*inch, y, "Cognitive Load Distribution")
            
            y -= 0.4*inch
            c.setFont("Helvetica", 11)
            for label, percentage in summary['cognitive_load_distribution'].items():
                c.drawString(1.2*inch, y, f"{label.capitalize()}: {percentage:.1f}%")
                y -= 0.25*inch
            
            c.save()
            buffer.seek(0)
            
            return StreamingResponse(
                buffer,
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename=session_{session_id}_report.pdf"}
            )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
    finally:
        db.close()





# ========== CREATE ==========
@app.post("/responses/")
def create_response(session_id: int, admin_id: int, response: str = None, rating: int = None):
    """
    Create a new response
    """
    db = Sessionlocal()
    try:
        # Check rating range
        if rating and (rating < 1 or rating > 5):
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
        
        # Create new response
        new_response = AdminResponses(
            session_id=session_id,
            admin_id=admin_id,
            response=response,
            rating=rating,
            created_at=datetime.utcnow()
        )
        
        db.add(new_response)
        db.commit()
        db.refresh(new_response)
        
        return {
            "message": "Response created successfully",
            "response_id": new_response.response_id,
            "session_id": new_response.session_id,
            "admin_id": new_response.admin_id
        }
    finally:
        db.close()

# ========== READ (Get All) ==========
@app.get("/responses/")
def get_all_responses():
    """
    Get all responses
    """
    db = Sessionlocal()
    try:
        responses = db.query(AdminResponses).all()
        
        # Convert to list of dictionaries
        result = []
        for resp in responses:
            result.append({
                "response_id": resp.response_id,
                "session_id": resp.session_id,
                "admin_id": resp.admin_id,
                "response": resp.response,
                "rating": resp.rating,
                "created_at": resp.created_at
            })
        
        return {"responses": result, "total": len(result)}
    finally:
        db.close()

# ========== READ (Get Single) ==========
@app.get("/responses/{response_id}")
def get_response(response_id: int):
    """
    Get a single response by ID
    """
    db = Sessionlocal()
    try:
        response = db.query(AdminResponses).filter(
            AdminResponses.response_id == response_id
        ).first()
        
        if not response:
            raise HTTPException(status_code=404, detail="Response not found")
        
        return {
            "response_id": response.response_id,
            "session_id": response.session_id,
            "admin_id": response.admin_id,
            "response": response.response,
            "rating": response.rating,
            "created_at": response.created_at
        }
    finally:
        db.close()

# ========== UPDATE ==========
@app.put("/responses/{response_id}")
def update_response(response_id: int, response: str = None, rating: int = None):
    """
    Update a response
    """
    db = Sessionlocal()
    try:
        # Check rating range
        if rating and (rating < 1 or rating > 5):
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
        
        # Find the response
        db_response = db.query(AdminResponses).filter(
            AdminResponses.response_id == response_id
        ).first()
        
        if not db_response:
            raise HTTPException(status_code=404, detail="Response not found")
        
        # Update fields
        if response is not None:
            db_response.response = response
        if rating is not None:
            db_response.rating = rating
        
        db.commit()
        db.refresh(db_response)
        
        return {
            "message": "Response updated successfully",
            "response_id": db_response.response_id
        }
    finally:
        db.close()

# ========== DELETE ==========
@app.delete("/responses/{response_id}")
def delete_response(response_id: int):
    """
    Delete a response
    """
    db = Sessionlocal()
    try:
        # Find the response
        db_response = db.query(AdminResponses).filter(
            AdminResponses.response_id == response_id
        ).first()
        
        if not db_response:
            raise HTTPException(status_code=404, detail="Response not found")
        
        db.delete(db_response)
        db.commit()
        
        return {"message": "Response deleted successfully"}
    finally:
        db.close()


# Add this endpoint to main.py
@app.get("/sessions/{session_id}/check-response")
def check_session_response(session_id: int, admin_id: int = 1):  # You might want to get admin_id from auth
    """
    Check if admin has responded to a session
    """
    db = Sessionlocal()
    try:
        response = db.query(AdminResponses).filter(
            AdminResponses.session_id == session_id
        ).first()
        
        if response:
            return {
                "has_response": True,
                "response_id": response.response_id,
                "response": response.response,
                "rating": response.rating,
                "created_at": response.created_at
            }
        else:
            return {"has_response": False}
    finally:
        db.close()



# In main.py - Add these endpoints:

@app.get("/api/student/{student_id}/progress")
def get_student_progress_overview(student_id: int):
    """
    Get overall progress summary for a student
    Returns:
    - List of all sessions with basic metrics
    - Improvement trends
    - Overall engagement score changes
    """
    db = Sessionlocal()
    try:
        # 1. Get all sessions for student
        sessions = db.query(Sessions).filter(
            Sessions.student_id == student_id
        ).order_by(Sessions.date).all()
        
        if not sessions:
            return {"error": "No sessions found for this student"}
        
        # 2. For each session, get EEG summary
        session_progress = []
        for session in sessions:
            # Try to get EEG summary
            try:
                import requests
                summary_response = requests.get(
                    f"http://localhost:8000/api/session_summary/{session.session_id}"
                ).json()
                
                if "error" not in summary_response:
                    session_progress.append({
                        "session_id": session.session_id,
                        "date": str(session.date),
                        "duration": summary_response.get("duration_seconds", 0),
                        "engagement_score": summary_response.get("engagement_score", 0),
                        "cognitive_load_distribution": summary_response.get("cognitive_load_distribution", {}),
                        "attention_dips_count": summary_response.get("attention_dips_count", 0),
                        "brainwave_statistics": summary_response.get("brainwave_statistics", {})
                    })
            except:
                # Skip sessions without EEG data
                continue
        
        if not session_progress:
            return {"error": "No EEG data found for any sessions"}
        
        # 3. Calculate progress metrics
        if len(session_progress) >= 2:
            first_session = session_progress[0]
            last_session = session_progress[-1]
            
            # Engagement improvement
            engagement_improvement = last_session["engagement_score"] - first_session["engagement_score"]
            
            # Attention improvement (less dips is better)
            attention_improvement = first_session["attention_dips_count"] - last_session["attention_dips_count"]
            
            # Focus time analysis (percentage of time in Focused/Relaxed states)
            def calculate_focus_percentage(cognitive_dist):
                focused = cognitive_dist.get("focused", 0)
                relaxed = cognitive_dist.get("relaxed", 0)
                return focused + relaxed
            
            first_focus = calculate_focus_percentage(first_session["cognitive_load_distribution"])
            last_focus = calculate_focus_percentage(last_session["cognitive_load_distribution"])
            focus_improvement = last_focus - first_focus
            
            # Brainwave changes (beta/alpha ratio for focus)
            def get_brainwave_ratio(session_data):
                beta = session_data["brainwave_statistics"].get("beta", {}).get("mean", 1)
                alpha = session_data["brainwave_statistics"].get("alpha", {}).get("mean", 1)
                return beta / alpha if alpha != 0 else 0
            
            first_ratio = get_brainwave_ratio(first_session)
            last_ratio = get_brainwave_ratio(last_session)
            
            return {
                "student_id": student_id,
                "total_sessions": len(session_progress),
                "session_progress": session_progress,
                "improvement_metrics": {
                    "engagement": {
                        "first": first_session["engagement_score"],
                        "last": last_session["engagement_score"],
                        "change": engagement_improvement,
                        "percentage_change": (engagement_improvement / first_session["engagement_score"] * 100) if first_session["engagement_score"] > 0 else 0
                    },
                    "attention": {
                        "first_dips": first_session["attention_dips_count"],
                        "last_dips": last_session["attention_dips_count"],
                        "improvement": attention_improvement,
                        "percentage_reduction": (attention_improvement / first_session["attention_dips_count"] * 100) if first_session["attention_dips_count"] > 0 else 0
                    },
                    "focus": {
                        "first_percentage": first_focus,
                        "last_percentage": last_focus,
                        "improvement": focus_improvement
                    },
                    "brainwave_ratio": {
                        "first_ratio": first_ratio,
                        "last_ratio": last_ratio,
                        "change": last_ratio - first_ratio
                    }
                },
                "overall_progress_score": calculate_overall_progress_score(session_progress)
            }
        
        return {
            "student_id": student_id,
            "total_sessions": len(session_progress),
            "session_progress": session_progress,
            "message": "Need at least 2 sessions for progress comparison"
        }
        
    except Exception as e:
        return {"error": str(e)}
    finally:
        db.close()

def calculate_overall_progress_score(session_progress):
    """Calculate an overall progress score from 0-100"""
    if len(session_progress) < 2:
        return 50  # Neutral score for single session
    
    scores = []
    
    # Engagement trend
    engagement_scores = [s["engagement_score"] for s in session_progress]
    if len(engagement_scores) >= 2:
        engagement_trend = (engagement_scores[-1] - engagement_scores[0]) / 100 * 25  # 25% weight
        scores.append(max(0, min(25, 12.5 + engagement_trend)))
    
    # Attention improvement (less dips)
    attention_dips = [s["attention_dips_count"] for s in session_progress]
    if len(attention_dips) >= 2:
        attention_improvement = (attention_dips[0] - attention_dips[-1]) / max(attention_dips[0], 1) * 25
        scores.append(max(0, min(25, 12.5 + attention_improvement)))
    
    # Focus consistency
    focus_scores = []
    for session in session_progress:
        dist = session["cognitive_load_distribution"]
        focus = dist.get("focused", 0) + dist.get("relaxed", 0)
        focus_scores.append(focus)
    
    if focus_scores:
        avg_focus = sum(focus_scores) / len(focus_scores)
        scores.append(min(25, avg_focus * 0.25))  # 25% weight
    
    # Session completion rate
    scores.append(25)  # Assume all sessions have EEG data for now
    
    return min(100, sum(scores))

@app.get("/api/student/{student_id}/session_comparison")
def compare_two_sessions(student_id: int, session1_id: int, session2_id: int):
    """
    Compare two specific sessions in detail
    """
    db = Sessionlocal()
    try:
        # Verify both sessions belong to the same student
        session1 = db.query(Sessions).filter(
            Sessions.session_id == session1_id,
            Sessions.student_id == student_id
        ).first()
        
        session2 = db.query(Sessions).filter(
            Sessions.session_id == session2_id,
            Sessions.student_id == student_id
        ).first()
        
        if not session1 or not session2:
            return {"error": "One or both sessions not found or don't belong to student"}
        
        # Get EEG summaries
        import requests
        summary1 = requests.get(
            f"http://localhost:8000/api/session_summary/{session1_id}"
        ).json()
        
        summary2 = requests.get(
            f"http://localhost:8000/api/session_summary/{session2_id}"
        ).json()
        
        if "error" in summary1 or "error" in summary2:
            return {"error": "Could not retrieve EEG data for one or both sessions"}
        
        # Calculate comparison metrics
        comparison = {
            "session1": {
                "id": session1_id,
                "date": str(session1.date),
                "summary": summary1
            },
            "session2": {
                "id": session2_id,
                "date": str(session2.date),
                "summary": summary2
            },
            "comparisons": {
                "engagement": {
                    "session1": summary1.get("engagement_score", 0),
                    "session2": summary2.get("engagement_score", 0),
                    "difference": summary2.get("engagement_score", 0) - summary1.get("engagement_score", 0),
                    "improvement": summary2.get("engagement_score", 0) > summary1.get("engagement_score", 0)
                },
                "attention_dips": {
                    "session1": summary1.get("attention_dips_count", 0),
                    "session2": summary2.get("attention_dips_count", 0),
                    "difference": summary1.get("attention_dips_count", 0) - summary2.get("attention_dips_count", 0),
                    "improvement": summary2.get("attention_dips_count", 0) < summary1.get("attention_dips_count", 0)
                },
                "focus_time": {
                    "session1": calculate_focus_percentage(summary1.get("cognitive_load_distribution", {})),
                    "session2": calculate_focus_percentage(summary2.get("cognitive_load_distribution", {})),
                    "difference": calculate_focus_percentage(summary2.get("cognitive_load_distribution", {})) - 
                                 calculate_focus_percentage(summary1.get("cognitive_load_distribution", {})),
                    "improvement": calculate_focus_percentage(summary2.get("cognitive_load_distribution", {})) > 
                                  calculate_focus_percentage(summary1.get("cognitive_load_distribution", {}))
                }
            }
        }
        
        return comparison
        
    except Exception as e:
        return {"error": str(e)}
    finally:
        db.close()

def calculate_focus_percentage(cognitive_dist):
    """Calculate percentage of time in focused/relaxed states"""
    focused = cognitive_dist.get("focused", 0)
    relaxed = cognitive_dist.get("relaxed", 0)
    stressed = cognitive_dist.get("stressed", 0)
    sleepy = cognitive_dist.get("sleepy", 0)
    
    total = focused + relaxed + stressed + sleepy
    if total == 0:
        return 0
    return (focused + relaxed) / total * 100        


# Get progress data for a session
# @app.get("/session_progress/{session_id}")
# def get_session_progress(session_id: int):
#     db = Sessionlocal()
#     try:
#         progress = db.query(Student_Progress).filter(
#             Student_Progress.session_id == session_id
#         ).first()
        
#         if not progress:
#             return {"error": "No progress data found"}
        
#         return {
#             "engagement_score": progress.engagement_score,
#             "focus_percentage": progress.focus_percentage,
#             "attention_dips": progress.attention_dips,
#             "brainwave_beta_alpha_ratio": progress.brainwave_beta_alpha_ratio,
#             "overall_score": progress.overall_score
#         }
#     finally:
#         db.close()

# Get all admin responses for a student
@app.get("/student/{student_id}/admin-responses")
def get_student_admin_responses(student_id: int):
    db = Sessionlocal()
    try:
        # Get all sessions for the student
        sessions = db.query(Sessions).filter(
            Sessions.student_id == student_id
        ).all()
        
        session_ids = [s.session_id for s in sessions]
        
        # Get responses for these sessions
        responses = db.query(AdminResponses).filter(
            AdminResponses.session_id.in_(session_ids)
        ).order_by(AdminResponses.created_at.desc()).all()
        
        result = []
        for resp in responses:
            result.append({
                "response_id": resp.response_id,
                "session_id": resp.session_id,
                "admin_id": resp.admin_id,
                "response": resp.response,
                "rating": resp.rating,
                "created_at": resp.created_at
            })
        
        return {"responses": result, "total": len(result)}
    finally:
        db.close()


# Example FastAPI endpoint
# 
@app.get("/get_eeg_data/{session_id}")
def get_eeg_data(session_id: int):
    """
    Get EEG data for a session
    """
    db = Sessionlocal()
    try:
        # Find session_record
        session_record = db.query(Session_records).filter(
            Session_records.session_id == session_id
        ).first()
        
        if not session_record:
            return {"error": "No session record found"}
        
        # Find results
        result = db.query(Session_results).filter(
            Session_results.session_record_id == session_record.session_record_id
        ).first()
        
        if not result:
            return {"error": "No results found"}
        
        # Check EEG data path
        if not result.eeg_data_path:
            return {"error": "No EEG data path in database"}
        
        eeg_path = result.eeg_data_path
        
        # Check if file exists
        if not os.path.exists(eeg_path):
            return {"error": f"EEG data file not found at: {eeg_path}"}
        
        if not os.path.isfile(eeg_path):
            return {"error": f"EEG data path is not a file: {eeg_path}"}
        
        # Try to read the file
        try:
            with open(eeg_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Try to parse as JSON
            try:
                eeg_data = json.loads(content)
                return {"eeg_data": eeg_data}
            except json.JSONDecodeError as json_err:
                # If not JSON, return error
                return {"error": f"Invalid JSON in EEG file: {str(json_err)}"}
                
        except Exception as e:
            return {"error": f"Failed to read EEG file: {str(e)}"}
        
    except Exception as e:
        return {"error": f"Server error: {str(e)}"}
    finally:
        db.close()


@app.get("/get_eeg_sample/{session_id}")
def get_eeg_sample(session_id: int):
    """
    Provide sample EEG data structure for testing
    """
    import random
    import time
    
    # Generate sample EEG data structure
    sample_eeg = {
        "channels": {
            "Fp1": [random.uniform(-50, 50) for _ in range(100)],
            "Fp2": [random.uniform(-50, 50) for _ in range(100)],
            "F3": [random.uniform(-50, 50) for _ in range(100)],
            "F4": [random.uniform(-50, 50) for _ in range(100)],
            "C3": [random.uniform(-50, 50) for _ in range(100)],
            "C4": [random.uniform(-50, 50) for _ in range(100)],
            "O1": [random.uniform(-50, 50) for _ in range(100)],
            "O2": [random.uniform(-50, 50) for _ in range(100)],
        },
        "timestamps": [i * 0.004 for i in range(100)],  # 250Hz sample rate
        "sample_rate": 250,
        "duration": 0.4,
        "metrics": {
            "attention": random.uniform(0, 100),
            "meditation": random.uniform(0, 100),
            "alpha_power": random.uniform(0, 50),
            "beta_power": random.uniform(0, 30),
            "theta_power": random.uniform(0, 40),
            "delta_power": random.uniform(0, 60),
            "signal_quality": random.randint(80, 100)
        },
        "frequency_bands": {
            "delta": random.uniform(0, 60),
            "theta": random.uniform(0, 40),
            "alpha": random.uniform(0, 50),
            "beta": random.uniform(0, 30),
            "gamma": random.uniform(0, 20)
        },
        "metadata": {
            "session_id": session_id,
            "generated_at": time.time(),
            "is_sample": True,
            "note": "This is sample EEG data for testing"
        }
    }
    
    return {"eeg_data": sample_eeg, "is_sample": True}


@app.get("/check_eeg_data/{session_id}")
def check_eeg_data(session_id: int):
    """
    Check if EEG data exists for a session
    """
    db = Sessionlocal()
    try:
        session_record = db.query(Session_records).filter(
            Session_records.session_id == session_id
        ).first()
        
        if not session_record:
            return {"has_eeg": False}
        
        result = db.query(Session_results).filter(
            Session_results.session_record_id == session_record.session_record_id
        ).first()
        
        if not result or not result.eeg_data_path:
            return {"has_eeg": False}
        
        has_eeg = os.path.exists(result.eeg_data_path) if result.eeg_data_path else False
        
        return {"has_eeg": has_eeg}
        
    except Exception as e:
        return {"has_eeg": False, "error": str(e)}
    finally:
        db.close()


@app.get("/debug_eeg_data/{session_id}")
def debug_eeg_data(session_id: int):
    """
    Debug endpoint to see what's happening with EEG data
    """
    db = Sessionlocal()
    try:
        # Find session_record
        session_record = db.query(Session_records).filter(
            Session_records.session_id == session_id
        ).first()
        
        if not session_record:
            return {"error": "No session record found"}
        
        # Find results
        result = db.query(Session_results).filter(
            Session_results.session_record_id == session_record.session_record_id
        ).first()
        
        if not result:
            return {"error": "No results found"}
        
        # Debug info
        debug_info = {
            "session_id": session_id,
            "session_record_id": session_record.session_record_id,
            "result_id": result.result_id if result else None,
            "eeg_data_path": result.eeg_data_path if result else None,
            "path_exists": os.path.exists(result.eeg_data_path) if result and result.eeg_data_path else False,
            "is_file": os.path.isfile(result.eeg_data_path) if result and result.eeg_data_path and os.path.exists(result.eeg_data_path) else False,
        }
        
        # Try to read the file if it exists
        if result and result.eeg_data_path and os.path.exists(result.eeg_data_path):
            try:
                # Try to read as text
                with open(result.eeg_data_path, 'r', encoding='utf-8') as f:
                    first_line = f.readline().strip()
                    debug_info["first_line_preview"] = first_line[:100]  # First 100 chars
                
                # Check file size
                debug_info["file_size"] = os.path.getsize(result.eeg_data_path)
                
            except Exception as e:
                debug_info["read_error"] = str(e)
        
        return debug_info
        
    except Exception as e:
        return {"error": str(e)}
    finally:
        db.close()


# Add these endpoints to your existing FastAPI backend

@app.get("/teacher/{teacher_id}/session_results")
def get_teacher_session_results(teacher_id: int):
    """
    Get all session results for a teacher's sessions
    """
    db = Sessionlocal()
    try:
        # Get teacher's sessions
        sessions = db.query(Sessions).filter(
            Sessions.teacher_id == teacher_id
        ).all()
        
        results_data = []
        
        for session in sessions:
            # Check if session has results
            session_record = db.query(Session_records).filter(
                Session_records.session_id == session.session_id
            ).first()
            
            if session_record:
                result = db.query(Session_results).filter(
                    Session_results.session_record_id == session_record.session_record_id
                ).first()
                
                if result and result.eeg_data_path:
                    # Get EEG summary
                    try:
                        # Read and analyze EEG file
                        import pandas as pd
                        if os.path.exists(result.eeg_data_path):
                            df = pd.read_csv(result.eeg_data_path)
                            
                            # Simple analysis
                            label_counts = {}
                            if 'label' in df.columns:
                                label_counts = df['label'].value_counts().to_dict()
                            
                            results_data.append({
                                "session_id": session.session_id,
                                "date": str(session.date),
                                "student_id": session.student_id,
                                "has_eeg": True,
                                "label_distribution": label_counts,
                                "total_samples": len(df)
                            })
                    except:
                        pass
        
        return {"results": results_data, "total": len(results_data)}
        
    except Exception as e:
        return {"error": str(e)}
    finally:
        db.close()

@app.get("/teacher/{teacher_id}/admin_feedback")
def get_teacher_admin_feedback(teacher_id: int):
    """
    Get all admin feedback for a teacher's sessions
    """
    db = Sessionlocal()
    try:
        # Get teacher's sessions
        sessions = db.query(Sessions).filter(
            Sessions.teacher_id == teacher_id
        ).all()
        
        session_ids = [s.session_id for s in sessions]
        
        # Get responses for these sessions
        responses = db.query(AdminResponses).filter(
            AdminResponses.session_id.in_(session_ids)
        ).order_by(AdminResponses.created_at.desc()).all()
        
        feedback_data = []
        for resp in responses:
            feedback_data.append({
                "response_id": resp.response_id,
                "session_id": resp.session_id,
                "admin_id": resp.admin_id,
                "response": resp.response,
                "rating": resp.rating,
                "created_at": str(resp.created_at)
            })
        
        return {"feedback": feedback_data, "total": len(feedback_data)}
        
    except Exception as e:
        return {"error": str(e)}
    finally:
        db.close()

@app.get("/teacher/{teacher_id}/performance_metrics")
def get_teacher_performance_metrics(teacher_id: int):
    """
    Get performance metrics and analytics for a teacher
    """
    db = Sessionlocal()
    try:
        # Get teacher's sessions
        sessions = db.query(Sessions).filter(
            Sessions.teacher_id == teacher_id
        ).all()
        
        total_sessions = len(sessions)
        completed_sessions = len([s for s in sessions if s.date < datetime.now().date()])
        
        # Get average ratings
        session_ids = [s.session_id for s in sessions]
        responses = db.query(AdminResponses).filter(
            AdminResponses.session_id.in_(session_ids)
        ).all()
        
        ratings = [r.rating for r in responses if r.rating]
        avg_rating = sum(ratings) / len(ratings) if ratings else 0
        
        # Get EEG data summary
        sessions_with_eeg = 0
        for session in sessions:
            session_record = db.query(Session_records).filter(
                Session_records.session_id == session.session_id
            ).first()
            
            if session_record:
                result = db.query(Session_results).filter(
                    Session_results.session_record_id == session_record.session_record_id
                ).first()
                
                if result and result.eeg_data_path and os.path.exists(result.eeg_data_path):
                    sessions_with_eeg += 1
        
        return {
            "total_sessions": total_sessions,
            "completed_sessions": completed_sessions,
            "upcoming_sessions": total_sessions - completed_sessions,
            "average_rating": round(avg_rating, 1),
            "total_ratings": len(ratings),
            "sessions_with_eeg": sessions_with_eeg,
            "eeg_coverage": round((sessions_with_eeg / completed_sessions * 100) if completed_sessions > 0 else 0, 1)
        }
        
    except Exception as e:
        return {"error": str(e)}
    finally:
        db.close()

@app.get("/get_teacher_by_user_id/{user_id}")
def get_teacher_by_user_id(user_id: int):
    """
    Get teacher by user_id (for login integration)
    """
    db = Sessionlocal()
    try:
        teacher = db.query(Teacher).filter(Teacher.user_id == user_id).first()
        
        if not teacher:
            return {"error": "Teacher not found for this user ID"}
        
        return {
            "teacher_id": teacher.teacher_id,
            "user_id": teacher.user_id,
            "name": teacher.name
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        db.close()


@app.get("/section/{section}/overall_ratings")
def get_section_overall_ratings(section: str):
    """
    Get overall ratings and statistics for a specific section
    """
    db = Sessionlocal()
    try:
        # 1. Get all students in the section
        students = db.query(Student).filter(Student.section == section).all()
        
        if not students:
            return {"error": f"No students found in section {section}"}
        
        student_ids = [student.student_id for student in students]
        
        # 2. Get all sessions for these students
        sessions = db.query(Sessions).filter(
            Sessions.student_id.in_(student_ids)
        ).all()
        
        session_ids = [session.session_id for session in sessions]
        
        if not session_ids:
            return {
                "section": section,
                "total_students": len(students),
                "total_sessions": 0,
                "average_rating": 0,
                "rating_distribution": {},
                "message": "No sessions found for students in this section"
            }
        
        # 3. Get all admin responses for these sessions
        responses = db.query(AdminResponses).filter(
            AdminResponses.session_id.in_(session_ids)
        ).all()
        
        # 4. Calculate statistics
        ratings = [r.rating for r in responses if r.rating is not None]
        
        # Rating distribution
        rating_dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for rating in ratings:
            if 1 <= rating <= 5:
                rating_dist[rating] += 1
        
        # Calculate averages
        avg_rating = sum(ratings) / len(ratings) if ratings else 0
        
        # 5. Get session completion statistics
        total_completed_sessions = len([s for s in sessions if s.date < datetime.now().date()])
        sessions_with_ratings = len(ratings)
        
        # 6. Get course-wise breakdown
        course_stats = {}
        for session in sessions:
            course = db.query(Courses).filter(Courses.course_id == session.course_id).first()
            if course:
                course_name = course.course_name
                if course_name not in course_stats:
                    course_stats[course_name] = {"sessions": 0, "total_rating": 0, "count": 0}
                
                course_stats[course_name]["sessions"] += 1
                
                # Get rating for this session
                response = db.query(AdminResponses).filter(
                    AdminResponses.session_id == session.session_id
                ).first()
                
                if response and response.rating:
                    course_stats[course_name]["total_rating"] += response.rating
                    course_stats[course_name]["count"] += 1
        
        # Calculate course averages
        for course_name, stats in course_stats.items():
            if stats["count"] > 0:
                stats["average_rating"] = stats["total_rating"] / stats["count"]
            else:
                stats["average_rating"] = 0
        
        # 7. Get student-wise performance
        student_performance = []
        for student in students:
            student_sessions = db.query(Sessions).filter(
                Sessions.student_id == student.student_id
            ).all()
            
            student_session_ids = [s.session_id for s in student_sessions]
            student_responses = db.query(AdminResponses).filter(
                AdminResponses.session_id.in_(student_session_ids)
            ).all()
            
            student_ratings = [r.rating for r in student_responses if r.rating is not None]
            student_avg = sum(student_ratings) / len(student_ratings) if student_ratings else 0
            
            student_performance.append({
                "student_id": student.student_id,
                "name": student.name,
                "arid_no": student.arid_no,
                "total_sessions": len(student_sessions),
                "sessions_with_ratings": len(student_ratings),
                "average_rating": round(student_avg, 1),
                "ratings": student_ratings
            })
        
        # 8. Sort students by average rating
        student_performance.sort(key=lambda x: x["average_rating"], reverse=True)
        
        # 9. Calculate section level stats
        feedback_count = len([r for r in responses if r.response and r.response.strip()])
        
        return {
            "section": section,
            "total_students": len(students),
            "total_sessions": len(sessions),
            "completed_sessions": total_completed_sessions,
            "sessions_with_ratings": sessions_with_ratings,
            "sessions_with_feedback": feedback_count,
            "average_rating": round(avg_rating, 2),
            "rating_distribution": rating_dist,
            "course_breakdown": course_stats,
            "student_performance": student_performance,
            "top_performing_students": student_performance[:3],  # Top 3
            "need_improvement_students": [s for s in student_performance if s["average_rating"] < 3][:3],  # Bottom 3
            "summary": {
                "excellent": rating_dist[5],
                "good": rating_dist[4],
                "average": rating_dist[3],
                "below_average": rating_dist[2],
                "poor": rating_dist[1]
            }
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
    finally:
        db.close()



# Add this to your main.py (append to existing endpoints)

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import asyncio
import json

# Global queue for real-time EEG data
eeg_data_queue = asyncio.Queue(maxsize=100)

@app.get("/api/eeg/stream")
async def stream_eeg_data():
    """
    Server-Sent Events endpoint for real-time EEG data streaming
    """
    async def event_generator():
        try:
            while True:
                try:
                    # Wait for new EEG data with timeout
                    data = await asyncio.wait_for(
                        eeg_data_queue.get(), 
                        timeout=2.0
                    )
                    
                    # Send data as SSE format
                    yield f"data: {json.dumps(data)}\n\n"
                    
                except asyncio.TimeoutError:
                    # Send keepalive ping
                    yield ": keepalive\n\n"
                    
                except asyncio.CancelledError:
                    print("🔌 Client disconnected from EEG stream")
                    break
                    
                except Exception as e:
                    print(f"❌ Stream error: {e}")
                    yield f"data: {json.dumps({'error': str(e)})}\n\n"
                    break
                    
        except Exception as e:
            print(f"❌ Generator error: {e}")
        finally:
            print("🧹 Stream cleanup")
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
            'Access-Control-Allow-Origin': '*'
        }
    )

# @app.get("/api/eeg/latest")
# async def get_latest_eeg_data():
#     """
#     Get the most recent EEG reading (polling alternative to SSE)
#     """
#     try:
#         status = eeg_streaming.get_streaming_status()
        
#         if status['status'] != 'recording':
#             return {
#                 "success": False,
#                 "message": "Not currently recording"
#             }
        
#         # Get latest data from streaming module
#         latest_data = getattr(eeg_streaming, 'latest_eeg_data', None)
        
#         if not latest_data:
#             return {
#                 "success": False,
#                 "message": "No data available yet"
#             }
        
#         return {
#             "success": True,
#             "data": latest_data,
#             "timestamp": status['elapsed_time']
#         }
        
#     except Exception as e:
#         return {
#             "success": False,
#             "error": str(e)
#         }


# ============================================================
# ADD THESE TWO ENDPOINTS TO THE END OF YOUR main.py FILE
# DO NOT REPLACE ANYTHING - JUST APPEND AT THE BOTTOM
# ============================================================

@app.get("/api/eeg/latest_live_data")
async def get_latest_live_data():
    """
    NEW ENDPOINT - Get latest EEG reading for real-time display
    This doesn't interfere with existing status endpoint
    """
    try:
        # Get latest data from eeg_streaming module
        latest = getattr(eeg_streaming, 'latest_eeg_data', None)
        
        if not latest:
            return {
                "success": False,
                "message": "No data available"
            }
        
        return {
            "success": True,
            "data": latest
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/api/eeg/realtime")
async def get_realtime_eeg():
    """
    Polling endpoint for latest EEG data (alternative to SSE)
    Returns the most recent EEG reading
    """
    latest = eeg_streaming.get_latest_eeg_data()
    
    return {
        "success": True if latest['timestamp'] else False,
        "data": latest,
        "streaming": eeg_streaming.is_broadcasting(),
        "clients": eeg_streaming.get_active_clients_count(),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/eeg/broadcast/status")
async def get_broadcast_status():
    """
    Get broadcast system status
    """
    return {
        "broadcasting": eeg_streaming.is_broadcasting(),
        "active_clients": eeg_streaming.get_active_clients_count(),
        "queue_size": eeg_streaming.get_eeg_broadcast_queue().qsize(),
        "latest_update": eeg_streaming.get_latest_eeg_data().get('timestamp'),
        "streaming_status": eeg_streaming.get_streaming_status()['status']
    }

@app.get("/api/eeg/live")
async def eeg_live_stream():
    """Real-time EEG data streaming via Server-Sent Events"""
    async def event_generator():
        # Create a queue for this client
        client_queue = asyncio.Queue(maxsize=10)
        eeg_streaming.connected_clients.add(client_queue)
        
        try:
            # Send initial connection message
            yield f"data: {json.dumps({'type': 'connected', 'message': 'EEG stream connected'})}\n\n"
            
            # Keep sending data while connected
            while True:
                try:
                    # Wait for data with timeout
                    data = await asyncio.wait_for(client_queue.get(), timeout=2.0)
                    yield f"data: {data}\n\n"
                    
                except asyncio.TimeoutError:
                    # Send heartbeat to keep connection alive
                    yield ": heartbeat\n\n"
                    
                except asyncio.CancelledError:
                    print("Client disconnected from EEG stream")
                    break
                    
        except Exception as e:
            print(f"Stream error: {e}")
        finally:
            # Clean up
            eeg_streaming.connected_clients.discard(client_queue)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
            'Access-Control-Allow-Origin': '*'
        }
    )


@app.get("/api/eeg/latest")
async def get_latest_eeg():
    """Get the latest EEG reading (for polling)"""
    status = eeg_streaming.get_streaming_status()
    
    # Check if we have latest data
    latest_data = status.get('latest_data', {})
    
    return {
        "success": True if latest_data else False,
        "timestamp": datetime.now().isoformat(),
        "data": latest_data,
        "label": status.get('current_label', 'N/A'),
        "streaming": status['status'] == 'recording'
    }



