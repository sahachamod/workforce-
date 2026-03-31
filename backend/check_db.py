import asyncio
import sys
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "sqlite+aiosqlite:///d:/projects/employee/backend/employee.db"
engine = create_async_engine(DATABASE_URL, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def check():
    async with async_session() as session:
        res = await session.execute(text("SELECT id, user_id, start_time FROM activity_logs LIMIT 5;"))
        rows = res.fetchall()
        print(f"Total rows fetched: {len(rows)}")
        for r in rows:
            print(dict(r._mapping))
            
        res2 = await session.execute(text("SELECT count(*) FROM activity_logs;"))
        print(f"Total records in activity_logs: {res2.scalar()}")

asyncio.run(check())
