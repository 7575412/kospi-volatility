import requests
from bs4 import BeautifulSoup
from datetime import datetime
from typing import Optional

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    "Referer": "https://finance.naver.com/",
}


def _parse_date(text: str) -> Optional[datetime]:
    for fmt in ("%Y.%m.%d %H:%M", "%Y.%m.%d"):
        try:
            return datetime.strptime(text.strip(), fmt)
        except ValueError:
            continue
    return None


def fetch_news(ticker: str, start_dt: datetime, end_dt: datetime) -> list[dict]:
    """네이버 금융에서 ticker의 start_dt ~ end_dt 구간 뉴스 반환."""
    articles = []
    page = 1

    while True:
        resp = requests.get(
            "https://finance.naver.com/item/news_news.nhn",
            headers=HEADERS,
            params={"code": ticker, "page": page},
            timeout=10,
        )
        soup = BeautifulSoup(resp.text, "lxml")
        rows = soup.select("table.type5 tr")

        found_any = False
        stop = False

        for row in rows:
            a_tag = row.select_one("td.title a")
            date_tag = row.select_one("td.date")
            if not a_tag or not date_tag:
                continue

            pub_dt = _parse_date(date_tag.text)
            if pub_dt is None:
                continue

            if pub_dt > end_dt:
                continue
            if pub_dt < start_dt:
                stop = True
                break

            found_any = True
            href = a_tag.get("href", "")
            articles.append({
                "title":    a_tag.text.strip(),
                "date":     pub_dt.strftime("%Y.%m.%d %H:%M"),
                "url":      "https://finance.naver.com" + href if href.startswith("/") else href,
            })

        if stop or not found_any or page >= 20:
            break
        page += 1

    return articles
