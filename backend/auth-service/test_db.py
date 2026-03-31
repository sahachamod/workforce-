import asyncio
from sqlalchemy.ext.asyncio import create_async_engine

async def test():
    engine = create_async_engine('mysql+aiomysql://root:1122@localhost:3306/workforce_management')
    async with engine.connect() as conn:
        print('Connected!')

asyncio.run(test())