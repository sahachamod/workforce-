import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from common.database import engine
from sqlalchemy import text

async def clear_all():
    async with engine.begin() as conn:
        # Assignments first due to FK
        await conn.execute(text("DELETE FROM shift_assignments"))
        # Then shifts
        await conn.execute(text("DELETE FROM shifts"))
        print("Successfully cleared all shifts and assignments.")

if __name__ == "__main__":
    asyncio.run(clear_all())
