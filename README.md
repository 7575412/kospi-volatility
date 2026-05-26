# KOSPI 스마트투자

KOSPI 변동성·기술지표·스마트 랭킹 분석 앱

## 서버 실행

### Docker (권장 — Windows/Mac/Linux 공통)

```bash
docker-compose up --build
```
→ http://localhost:8000/api/volatility

### 직접 실행 (Python 3.11+)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Windows 단독 실행 파일 (Python 없이)

1. Mac/Linux에서 빌드: `cd backend && bash build_exe.sh`
2. `dist/kospi-server.exe`를 Windows로 복사
3. `run_server.bat` 더블클릭

## 모바일 앱 빌드 (Android APK)

```bash
cd frontend
npm install -g eas-cli
eas login          # expo.dev 계정 필요
eas build --platform android --profile preview
```
빌드 완료 후 APK 다운로드 링크가 반환됩니다.

## API 엔드포인트

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /api/volatility` | KOSPI 변동성 TOP 20 |
| `GET /api/kospi/smart-ranking` | 스마트 랭킹 TOP 15 + 매수/매도 추천 |
| `GET /api/analysis/{ticker}` | 한국 종목 기술 분석 |
| `GET /api/analysis/{ticker}/us-peers` | 동일 업종 미국 대응주 |
| `GET /api/analysis/{ticker}/similar-signals` | 과거 유사 패턴 종목 |
| `GET /api/us/analysis/{ticker}` | 미국 종목 기술 분석 |
| `GET /api/news/{ticker}` | 종목 뉴스 |
