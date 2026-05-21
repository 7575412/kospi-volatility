from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from routers import volatility, news

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 서버 시작 시 백그라운드로 캐시 워밍업
    from services.volatility_service import compute_top10_volatility
    asyncio.get_event_loop().run_in_executor(None, compute_top10_volatility, None)
    yield

app = FastAPI(title="KOSPI Volatility API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(volatility.router, prefix="/api")
app.include_router(news.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
