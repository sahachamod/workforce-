import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "mysql+aiomysql://root:1122@localhost:3306/workforce_management"
engine = create_async_engine(DATABASE_URL, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def check():
    async with async_session() as session:
        try:
            res = await session.execute(text("DESCRIBE activity_logs;"))
            rows = res.fetchall()
            for r in rows:
                print(r)
        except Exception as e:
            print("Error:", e)

asyncio.run(check())
