# Cognitive Load Analysis - Backend

This project uses FastAPI for the backend.

## Setup

1.  **Install Dependencies**:
    ```bash
    pip install fastapi uvicorn sqlalchemy python-dotenv
    ```
    *(Ideally, use a requirements.txt but for now ensure these are installed)*

2.  **Environment Variables**:
    - The `.env` file in `backend/` contains configuration like database URL and file paths.
    - Update `.env` to match your local setup if needed.

3.  **Run the Server**:
    Navigate to `backend/` folder and run:
    ```bash
    uvicorn main:app --reload
    ```
    Access documentation at: `http://localhost:8000/docs`

## Structure

- `main.py`: Entry point, includes routers.
- `routers/`: Modular route definitions (`students.py`, `teachers.py`, `sessions.py`).
- `models.py`: SQLAlchemy database models.
- `schemas.py`: Pydantic data schemas.
- `database.py`: Database connection logic.
- `config.py`: Configuration loader.
