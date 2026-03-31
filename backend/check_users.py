import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "mysql+aiomysql://root:1122@localhost:3306/workforce_management"
engine = create_async_engine(DATABASE_URL, echo=False)

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT id, first_name, role FROM users LIMIT 3;"))
        print("Users:", res.fetchall())
        
        await conn.execute(text("DROP TABLE IF EXISTS activity_logs;"))
        print("Dropped old activity_logs table.")

asyncio.run(check())
