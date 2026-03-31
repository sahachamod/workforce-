import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from common.database import engine
from sqlalchemy import text

async def remove_sample_shifts():
    async with engine.begin() as conn:
        print("Existing shifts before deletion:")
        result = await conn.execute(text("SELECT id, name FROM shifts"))
        shifts = result.fetchall()
        for row in shifts:
            print(f"ID: {row[0]}, Name: {row[1]}")
            
        print("\nDeleting sample shifts (IDs like shift-00x)...")
        # Soft delete or hard delete? User says "remove", I'll just delete them.
        # Note: If they have assignments, it might fail FK check.
        # But for development cleanup, I'll delete assignments too if needed.
        await conn.execute(text("DELETE FROM shift_assignments WHERE shift_id LIKE 'shift-%'"))
        res = await conn.execute(text("DELETE FROM shifts WHERE id LIKE 'shift-%'"))
        print(f"Removed {res.rowcount} sample shifts.")

if __name__ == "__main__":
    asyncio.run(remove_sample_shifts())
