from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  
    pool_size=10,         
    max_overflow=20       
)

Sessionlocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency
def get_db():
    db = Sessionlocal()
    try:
        yield db   # give the session to the request
    finally:
        db.close()  # close it after request is done
