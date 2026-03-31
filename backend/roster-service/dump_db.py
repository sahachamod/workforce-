import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from common.database import engine, Base
from app.models import Shift, ShiftAssignment, User
from sqlalchemy import select, update

async def dump():
    async with engine.begin() as conn:
        # Fix all to True
        await conn.execute(update(Shift).values(is_active=True))
        
        result = await conn.execute(select(Shift))
        shifts = result.all()
        print(f"Total shifts: {len(shifts)}")
        for s in shifts:
            print(f"ID: {s.id}, Name: {s.name}, Active: {s.is_active}")

if __name__ == "__main__":
    asyncio.run(dump())
