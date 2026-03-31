import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from common.config import settings
from sqlalchemy.ext.asyncio import create_async_engine

async def test():
    print(f"DATABASE_URL: {settings.DATABASE_URL}")
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.connect() as conn:
        from sqlalchemy import text
        result = await conn.execute(text("SELECT 1"))
        print("Connected!")

asyncio.run(test())