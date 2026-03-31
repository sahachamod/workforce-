import asyncio
import uuid
from datetime import datetime, timedelta
import random

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import MetaData, Table, Column, String, Integer, DateTime

DATABASE_URL = "mysql+aiomysql://root:1122@localhost:3306/workforce_management"
engine = create_async_engine(DATABASE_URL, echo=False)
metadata = MetaData()

activity_logs = Table(
    'activity_logs', metadata,
    Column('id', String(36), primary_key=True),
    Column('user_id', String(36), nullable=False),
    Column('activity_type', String(20), default='active'),
    Column('app_name', String(200)),
    Column('window_title', String(500)),
    Column('url', String(1000)),
    Column('start_time', DateTime, nullable=False),
    Column('end_time', DateTime),
    Column('duration_seconds', Integer, default=0),
    Column('created_at', DateTime, nullable=False)
)

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(metadata.create_all)
        print("Created activity_logs table.")
        
        user_id = 'user-emp-1'
        now = datetime.now()
        
        apps = [
            ("VS Code", "backend/routes.py - employee-project", None, 'active'),
            ("Chrome", "Stack Overflow - FastAPI async queries", "https://stackoverflow.com", 'active'),
            ("Slack", "engineering-team channel", None, 'idle'),
            ("Figma", "Dashboard Redesign", None, 'active'),
            ("Terminal", "npm run dev", None, 'active'),
            ("Spotify", "Lo-Fi Beats", None, 'idle'),
            ("Chrome", "GitHub - PR #405", "https://github.com", 'active'),
        ]
        
        for i in range(25):
            app = random.choice(apps)
            start = now - timedelta(hours=random.randint(0, 8), minutes=random.randint(0, 59))
            dur = random.randint(30, 1800)
            end = start + timedelta(seconds=dur)
            
            await conn.execute(activity_logs.insert().values(
                id=str(uuid.uuid4()),
                user_id=user_id,
                activity_type=app[3],
                app_name=app[0],
                window_title=app[1],
                url=app[2],
                start_time=start,
                end_time=end,
                duration_seconds=dur,
                created_at=start
            ))
            
        print("Inserted logs.")

asyncio.run(seed())
