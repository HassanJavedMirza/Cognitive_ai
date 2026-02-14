# Cognitive Load Analysis System - Project Overview

## 1. Introduction
This project is a **Cognitive Load Analysis System** designed to monitor and analyze the cognitive states of students during learning sessions. It leverages **EEG data** (from Muse headsets) and **video recordings** (Teacher & Student) to assess engagement, focus, and cognitive load.

## 2. Tech Stack

### Backend
- **Framework**: Python, FastAPI
- **Database**: MySQL (accessed via SQLAlchemy ORM)
- **Data Schemas**: Pydantic
- **Machine Learning**: RandomForest Classifier (`cognitive_load_model.pkl`) for classifying cognitive states.
- **Data Processing**: Pandas, NumPy, scikit-learn.
- **EEG Integration**: `muselsl` for streaming and recording EEG data.

### Frontend
- **Framework**: React.js (Vite)
- **Styling**: Tailwind CSS (inferred), standard CSS.
- **Visualization**: Chart.js, Recharts (for real-time EEG and analytics graphs).
- **HTTP Client**: Axios.

### Hardware
- **EEG Headset**: Muse (interfaced via LSL - Lab Streaming Layer).

## 3. Project Structure

```
FYP Cognitive load/
├── backend/                  # FastAPI Application
│   ├── routers/              # Modular endpoints (students, teachers, sessions)
│   ├── config.py             # Environment configuration
│   ├── database.py           # DB connection logic
│   ├── main.py               # App entry point
│   ├── models.py             # SQLAlchemy Database Models
│   ├── schemas.py            # Pydantic Response/Request Models
│   └── ...                   # ML models (.pkl) & scripts
├── front end/                # React Application (Vite)
│   ├── cognitive load/       # Main frontend package
│   └── ...
└── view_screens/             # UI Mockups/Reference Images
```

## 4. Key Workflows

### Data Collection (Session)
1.  **Session Start**: Teacher initiates a session.
2.  **Streaming**: EEG data is streamed from the Muse headset via BlueMuse/LSL.
3.  **Recording**:
    - Student Webcam Video
    - Teacher Webcam Video
    - EEG Data (saved as CSV)
4.  **Upload**: At the end of the session, all files are uploaded to the backend.

### Analysis
1.  **Processing**: The backend processes the uploaded CSVs.
2.  **Classification**: The `cognitive_load_model.pkl` predicts cognitive load (High/Low/Medium) based on EEG features.
3.  **Storage**: Results and file paths are stored in the MySQL database.

### Visualization (Dashboard)
- **Teachers**: View student engagement levels, attention dips, and overall class performance.
- **Students**: View their own session history and focus metrics.

## 5. Environment Setup
The backend requires a `.env` file for configuration:
```ini
DATABASE_URL=mysql+pymysql://root:1234@localhost/cognitive_load
STUDENT_DIR=D:\CV\DATASET\STUDENTS_DATA
TEACHER_DIR=D:\CV\DATASET\teacher_activity_dataset\Teaching
EEG_DIR=C:\Users\HP\Desktop\FYP_PROJECT\BACK END\output
```

## 6. Future Improvements
- **Optimization**: The `sessions` endpoint currently needs optimization (N+1 query fix planned).
- **Real-time**: Adding WebSockets for real-time cognitive load graphing during the session.
