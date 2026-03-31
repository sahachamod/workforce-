import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from common.database import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        print("Columns in shift_assignments:")
        result = await conn.execute(text("DESCRIBE shift_assignments"))
        for row in result:
            print(row)

if __name__ == "__main__":
    asyncio.run(check())
