from datetime import date, datetime
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, String, Date, Text, JSON, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker, Session
from pydantic import BaseModel, HttpUrl
from pydantic_settings import BaseSettings
from .nlp import analyze_text, grammar_details, translate_to_vietnamese, vocabulary_meaning
from .scraper import fetch_article

class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://reader:reader@db:5432/reader"
    class Config: env_file = ".env"
settings = Settings()
engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False)
class Base(DeclarativeBase): pass
class Source(Base):
    __tablename__ = "article_sources"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    url: Mapped[str] = mapped_column(Text, unique=True)
    enabled: Mapped[bool] = mapped_column(default=True)
    last_crawled_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    last_status: Mapped[str] = mapped_column(Text, default="Chưa chạy")

class SourceInput(BaseModel):
    name: str
    url: HttpUrl
    enabled: bool = True

class SourceUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[HttpUrl] = None
    enabled: Optional[bool] = None

class Article(Base):
    __tablename__ = "articles"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(300))
    published_at: Mapped[date] = mapped_column(Date)
    body: Mapped[str] = mapped_column(Text)
    image_url: Mapped[str] = mapped_column(Text, default="")
    source_url: Mapped[str] = mapped_column(Text, default="")
    level: Mapped[str] = mapped_column(String(2), default="N4")
    sentences: Mapped[list] = mapped_column(JSON, default=list)
app = FastAPI(title="Kotoba Reading API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_methods=["*"], allow_headers=["*"])
def get_db():
    db=SessionLocal()
    try: yield db
    finally: db.close()
@app.on_event("startup")
def startup():
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if db.scalar(select(Article.id).limit(1)) is None:
            samples=[("春の公園で桜が咲き始めました","春になると、公園の桜が少しずつ咲き始めます。近くの人たちは、花を見ながら写真を撮っていました。", "N4"), ("日本の朝ごはん","日本では、朝ごはんにご飯やみそ汁を食べる人がいます。最近はパンを食べる人も増えています。", "N5"), ("町の図書館が新しくなりました","駅の近くにある図書館が、今月リニューアルしました。新しい図書館には、子どもが本を読めるスペースもあります。", "N3")]
            for title,body,level in samples:
                db.add(Article(title=title,published_at=date.today(),body=body,level=level,image_url="",source_url="https://www3.nhk.or.jp/news/easy/",sentences=analyze_text(body)))
            db.commit()
@app.get("/api/health")
def health(): return {"status":"ok"}
@app.get("/api/articles")
def list_articles(page:int=Query(1,ge=1), limit:int=Query(12,ge=1,le=50), level:Optional[str]=None, db:Session=Depends(get_db)):
    q=select(Article)
    if level and level.upper() in {f"N{i}" for i in range(1,6)}: q=q.where(Article.level==level.upper())
    total=len(db.scalars(q).all())
    rows=db.scalars(q.order_by(Article.published_at.desc(),Article.id.desc()).offset((page-1)*limit).limit(limit)).all()
    return {"items":[{"id":a.id,"title":a.title,"published_at":a.published_at,"level":a.level,"image_url":a.image_url,"source_url":a.source_url,"excerpt":a.body[:90]} for a in rows],"page":page,"limit":limit,"total":total}
@app.get("/api/articles/{article_id}")
def get_article(article_id:int, db:Session=Depends(get_db)):
    a=db.get(Article,article_id)
    if not a: raise HTTPException(404,"Article not found")
    sentences = a.sentences or analyze_text(a.body)
    for sentence in sentences:
        for token in sentence.get("tokens", []):
            if not token.get("meaning") or token.get("meaning") == "辞書データ未接続":
                token["meaning"] = vocabulary_meaning(token)
        for point in sentence.get("grammar", []):
            for key, value in grammar_details(point.get("pattern", "")).items():
                point.setdefault(key, value)
        if not sentence.get("translation_vi"):
            sentence["translation_vi"] = translate_to_vietnamese(sentence.get("text", ""))
    return {"id":a.id,"title":a.title,"published_at":a.published_at,"body":a.body,"image_url":a.image_url,"source_url":a.source_url,"level":a.level,"sentences":sentences}


@app.get("/api/admin/sources")
def list_sources(db: Session = Depends(get_db)):
    rows = db.scalars(select(Source).order_by(Source.id.desc())).all()
    return [{"id":s.id,"name":s.name,"url":s.url,"enabled":s.enabled,"last_crawled_at":s.last_crawled_at,"last_status":s.last_status} for s in rows]

@app.post("/api/admin/sources", status_code=201)
def create_source(data: SourceInput, db: Session = Depends(get_db)):
    if not data.name.strip():
        raise HTTPException(422, "Tên nguồn không được để trống")
    url = str(data.url)
    if db.scalar(select(Source).where(Source.url == url)):
        raise HTTPException(409, "URL nguồn này đã tồn tại")
    source = Source(name=data.name.strip(), url=url, enabled=data.enabled, last_status="Sẵn sàng")
    db.add(source)
    db.commit()
    db.refresh(source)
    return {"id":source.id,"name":source.name,"url":source.url,"enabled":source.enabled,"last_crawled_at":source.last_crawled_at,"last_status":source.last_status}

@app.patch("/api/admin/sources/{source_id}")
def update_source(source_id: int, data: SourceUpdate, db: Session = Depends(get_db)):
    source = db.get(Source, source_id)
    if not source:
        raise HTTPException(404, "Không tìm thấy nguồn")
    values = data.model_dump(exclude_unset=True)
    if "name" in values:
        if not values["name"].strip():
            raise HTTPException(422, "Tên nguồn không được để trống")
        source.name = values["name"].strip()
    if "url" in values:
        url = str(values["url"])
        duplicate = db.scalar(select(Source).where(Source.url == url, Source.id != source_id))
        if duplicate:
            raise HTTPException(409, "URL nguồn này đã tồn tại")
        source.url = url
    if "enabled" in values:
        source.enabled = values["enabled"]
    db.commit()
    db.refresh(source)
    return {"id":source.id,"name":source.name,"url":source.url,"enabled":source.enabled,"last_crawled_at":source.last_crawled_at,"last_status":source.last_status}

@app.delete("/api/admin/sources/{source_id}", status_code=204)
def delete_source(source_id: int, db: Session = Depends(get_db)):
    source = db.get(Source, source_id)
    if not source:
        raise HTTPException(404, "Không tìm thấy nguồn")
    db.delete(source)
    db.commit()

@app.post("/api/admin/sources/{source_id}/crawl")
def crawl_source(source_id: int, db: Session = Depends(get_db)):
    source = db.get(Source, source_id)
    if not source:
        raise HTTPException(404, "Không tìm thấy nguồn")
    if not source.enabled:
        raise HTTPException(400, "Nguồn đang tắt")
    try:
        result = fetch_article(source.url)
        if not result["title"] or not result["body"].strip():
            raise ValueError("Không tìm thấy tiêu đề hoặc nội dung bài viết. URL cần trỏ trực tiếp đến bài viết.")
        published = date.fromisoformat(result["published_at"][:10]) if result.get("published_at") else date.today()
        article = db.scalar(select(Article).where(Article.source_url == source.url))
        if article:
            article.title = result["title"]
            article.body = result["body"]
            article.published_at = published
            article.image_url = result["image_url"]
            article.sentences = analyze_text(result["body"])
            action = "updated"
        else:
            article = Article(title=result["title"], body=result["body"], published_at=published, image_url=result["image_url"], source_url=source.url, level="N4", sentences=analyze_text(result["body"]))
            db.add(article)
            action = "created"
        source.last_crawled_at = datetime.utcnow()
        source.last_status = f"Thành công: {result['title']}"
        db.commit()
        db.refresh(article)
        return {"status":"ok","action":action,"article_id":article.id,"title":article.title}
    except Exception as exc:
        db.rollback()
        source = db.get(Source, source_id)
        if source:
            source.last_crawled_at = datetime.utcnow()
            source.last_status = f"Lỗi: {str(exc)[:300]}"
            db.commit()
        if isinstance(exc, HTTPException):
            raise exc
        raise HTTPException(502, f"Không crawl được nguồn: {str(exc)[:300]}")
