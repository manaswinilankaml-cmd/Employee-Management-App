"""
utils.py — Helper functions used across the project.

These are small "tools" that other files can borrow when they need them.
"""

import hashlib


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
    Scrambles a password so nobody can read it.

    Example: "mysecretpassword" → "240be518fabd2724ddb6f04eeb1da5967..."

    We store only the scrambled version. When someone logs in,
    we scramble what they typed and compare the two scrambled versions.
    """
    return hashlib.sha256(password.encode()).hexdigest()
