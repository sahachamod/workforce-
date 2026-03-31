import asyncio
import sys
import os

# Add the parent directory to sys.path to import common
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from common.database import engine
from sqlalchemy import text

async def upgrade():
    print("Checking for work_mode column...")
    async with engine.begin() as conn:
        try:
            # Check if column exists (MySQL specific)
            result = await conn.execute(text("SHOW COLUMNS FROM shift_assignments LIKE 'work_mode'"))
            column_exists = result.fetchone()
            
            if not column_exists:
                print("Adding work_mode column...")
                # Note: We use VARCHAR(20) to be safe since Enum creation can be tricky in raw SQL if it doesn't exist
                await conn.execute(text("ALTER TABLE shift_assignments ADD COLUMN work_mode VARCHAR(20) DEFAULT 'office'"))
                print("Column added successfully.")
            else:
                print("work_mode column already exists.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(upgrade())
