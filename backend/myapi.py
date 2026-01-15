from fastapi import FastAPI
from typing import Optional
from pydantic import BaseModel


app = FastAPI()

students = {
    1: {
        "name": "hassan",
        "age": "22",
        "year": "2002"
    },
     2: {
        "name": "ali",
        "age": "21",
        "year": "2001"
    }
}

class Student(BaseModel):
   name:str
   age:int
   year:str

class Update_student(BaseModel):
   name:Optional[str]=None
   age:Optional[int]=None
   year:Optional[str]=None

@app.get("/get-all-students")
def all_students():
    return students

# variable parameters
@app.get("/{student_id}")
def get_student(student_id: int ):
    return students[student_id]

# Query Parameters
@app.get("/get-by-name/{student_id}")    
def get_by_name(*,student_id:int,name:Optional[str] =None, age=int):   # always write optional arguments after required arguments but if we use * in start the sequence of optional,required does'nt matter
  for student_id in students:
     if students[student_id]["name"]==name:
        return students[student_id]
  return {"Data ":"not found!"}    

# gt=>, lt=<, ge>=, le <= 
@app.get("/get_student_by_sections/{section}")
def get_section(section:str):
  
  
  return None
 

# Resuest Body and Post Parameters
@app.post("/create-students/{student_id}")
def create_Students(student_id:int,student:Student):
   if student_id in students:
      return {"Error":"Student Already Exists!"}    
   students[student_id]=student
   return students[student_id] 

@app.put("/update_student/{student_id}")
def Update_student(*,student_id:int, student:Update_student):
  if student_id not in students:
     return {"data":"Student does not exits!"}
#   students[student_id].update(student.dict(exclude_unset=True)) # only changes fields which user updates all others remain old ones 
  if student.name != None:
     students[student_id]["name"]=student.name
  if student.age != None:
     students[student_id]["age"]=student.age 
  if student.year != None:
     students[student_id]["year"]=student.year     
  return students[student_id]  


@app.delete("/delete-student/{student_id}")
def delete_student(student_id:int):
   if student_id not in students:
      return{"Erorr":"Student does not exist"}
   del students[student_id]
   return {"Messege":"Student Deleted Successfully!"}

         
   