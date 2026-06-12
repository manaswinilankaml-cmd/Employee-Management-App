"""
database.py — Sets up the connection to the PostgreSQL database.

Think of this file like plugging in a cable between your app and the database.
Once plugged in, your app can talk to the database (read, write, update, delete).
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os

# ─── Step 1: Read the .env file to find where our database lives ─────────────
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# ─── Step 2: Create the "engine" (the cable that connects us to the database) ─
# echo=True prints every SQL query to the terminal so you can see what's happening
engine = create_engine(DATABASE_URL, echo=True)

# ─── Step 3: Create a "session factory" ──────────────────────────────────────
# A session is like opening a notebook to write things.
# When you're done writing, you close the notebook (close the session).
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

# ─── Step 4: Base class for all our database table models ─────────────────────
# Every table we create will inherit from this Base class.
Base = declarative_base()


def get_db():
    """
    This function gives us a fresh database session (notebook) to work with.
    After we are done, it automatically closes the session.

    Used with FastAPI's Depends() so every route gets its own session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
