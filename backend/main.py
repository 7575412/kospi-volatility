from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from routers import volatility, news, analysis, us_stocks, smart_ranking, peers, portfolio


def _warm(fn, arg=None):
    try:
        fn(arg)
    except Exception:
        pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    from services.volatility_service import compute_top10_volatility
    from services.smart_ranking_service import compute_smart_ranking
    loop = asyncio.get_running_loop()
    loop.run_in_executor(None, _warm, compute_top10_volatility)
    loop.run_in_executor(None, _warm, compute_smart_ranking)
    yield

app = FastAPI(title="KOSPI Volatility API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(volatility.router,     prefix="/api")
app.include_router(news.router,           prefix="/api")
app.include_router(analysis.router,       prefix="/api")
app.include_router(us_stocks.router,      prefix="/api")
app.include_router(smart_ranking.router,  prefix="/api")
app.include_router(peers.router,          prefix="/api")
app.include_router(portfolio.router,      prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
