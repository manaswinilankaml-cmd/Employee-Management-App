"""
utils.py — Helper functions used across the project.

These are small "tools" that other files can borrow when they need them.
"""

import bcrypt


def generate_employee_id(org_code: str, year: int, number: int) -> str:
    """
    Creates a nice employee ID like "IM-2026-0001".

    - org_code: Short company code (e.g., "IM" for Imaginary Corp)
    - year: The current year (e.g., 2026)
    - number: The employee's sequence number (1, 2, 3, ...)

    zfill(4) pads with zeros so 1 becomes "0001", 42 becomes "0042", etc.
    """
    return f"{org_code}-{year}-{str(number).zfill(4)}"


def hash_password(password: str) -> str:
    """
    Scrambles a password using bcrypt so nobody can read it.
    Bcrypt includes a salt automatically.
    """
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Checks if a plain-text password matches the stored scrambled version.
    """
    plain_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(plain_bytes, hashed_bytes)
