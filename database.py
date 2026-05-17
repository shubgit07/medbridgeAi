from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os

load_dotenv() 

DATABASE_URL = os.getenv("SUPABASE_URL") 

engine = create_engine(
    DATABASE_URL,
    connect_args={"sslmode": "require"},
    pool_pre_ping=True  
)

SessionLocal = sessionmaker(bind=engine)

Base = declarative_base()