from fastapi import APIRouter
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.exceptions import HTTPException
from pathlib import Path
import glob

router = APIRouter()

STATIC_DIR = Path(__file__).parent.parent / "static"
PROJECT_ROOT = Path(__file__).parent.parent.parent


def _latest_apk() -> Path | None:
    apks = sorted(
        PROJECT_ROOT.glob("kospi-smartinvest-*.apk"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    return apks[0] if apks else None


@router.get("/", response_class=HTMLResponse)
def installer_page():
    html = (STATIC_DIR / "index.html").read_text()
    return HTMLResponse(content=html)


@router.get("/download/apk/info")
def apk_info():
    apk = _latest_apk()
    if not apk:
        raise HTTPException(status_code=404, detail="APK not found")
    return {"filename": apk.name, "size_mb": round(apk.stat().st_size / 1024 / 1024, 1)}


@router.get("/download/apk")
def download_apk():
    apk = _latest_apk()
    if not apk:
        raise HTTPException(status_code=404, detail="APK not found")
    return FileResponse(
        path=str(apk),
        media_type="application/vnd.android.package-archive",
        filename=apk.name,
    )
