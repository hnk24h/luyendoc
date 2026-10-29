"""Small NHK Easy article fetcher. Verify source terms and robots policy before scheduled use."""
from bs4 import BeautifulSoup
import httpx
from urllib.parse import urljoin

def fetch_article(url: str) -> dict:
    response=httpx.get(url,timeout=20,headers={"User-Agent":"KotobaReader/0.1 (learning prototype)"})
    response.raise_for_status(); soup=BeautifulSoup(response.text,"html.parser")
    title=soup.select_one(".article-main__title, h1")
    body=soup.select(".article-main__text, .article-body p")
    image=soup.select_one(".article-main__image img, article img")
    return {"title":title.get_text(" ",strip=True) if title else "","body":"\n".join(p.get_text(" ",strip=True) for p in body),"published_at":(soup.select_one("time") or {}).get("datetime") if soup.select_one("time") else None,"image_url":urljoin(url,image.get("src","")) if image else "","source_url":url}
