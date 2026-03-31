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
            res = await session.execute(text("SELECT id, user_id, start_time FROM activity_logs LIMIT 5;"))
            rows = res.fetchall()
            print(f"Total rows fetched: {len(rows)}")
            for r in rows:
                print(dict(r._mapping))
                
            res2 = await session.execute(text("SELECT count(*) FROM activity_logs;"))
            count = res2.scalar()
            print(f"Total records in activity_logs: {count}")
            
            # Check for today
            res3 = await session.execute(text("SELECT count(*) FROM activity_logs WHERE DATE(start_time) = CURDATE();"))
            today_count = res3.scalar()
            print(f"Total records TODAY in activity_logs: {today_count}")
        except Exception as e:
            print("Error:", e)

asyncio.run(check())
