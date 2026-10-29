# ことば (Kotoba) — Japanese Reading Practice MVP

A decoupled Next.js 14 App Router frontend and FastAPI backend for reading Japanese stories. The interface includes a reading library, furigana toggle, sentence-by-sentence Vietnamese translations, sentence study panel, browser text-to-speech, and a basic save-word interaction. The API stores stories and sentence analysis in PostgreSQL.

## Run with Docker Compose

From this directory:

```sh
docker compose up --build
```

- Web app: http://localhost:3000
- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/api/health
- Source management: http://localhost:3000/admin/sources

The first backend start creates database tables and inserts three example articles. The source management page lets you add, edit, enable/disable, remove, and manually crawl direct article URLs; successful crawls create or update an article. PostgreSQL data persists in the `postgres_data` volume. To reset the sample database, use `docker compose down -v`.

## Run services locally

### Backend

Python 3.11+ recommended. SudachiPy and its core dictionary are installed from pip; no system MeCab library is needed.

```sh
cd backend
python -m venv .venv
source .venv/bin/activate             # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export DATABASE_URL='postgresql+psycopg://reader:reader@localhost:5432/reader'
uvicorn app.main:app --reload --port 8000
```

Start a PostgreSQL 16 database first, with database/user/password `reader` (or change `DATABASE_URL`). `GET /api/articles?page=1&limit=12&level=N4` lists articles; `GET /api/articles/{id}` returns an article with sentence tokens, grammar notes, and `translation_vi` for each sentence. The reader has a `Dịch VI` toggle to show or hide translations.

### Frontend

```sh
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

Open http://localhost:3000. The homepage and reader have local sample fallbacks so the UI remains inspectable when the API is unavailable.

## Source management

Open `/admin/sources` to configure crawl sources. The current scraper expects a direct article page URL rather than a section or index page. The admin endpoints are `/api/admin/sources`; this MVP has no authentication, so keep the service on a trusted development network and add authentication before public deployment.

## Pipeline notes

- `backend/app/scraper.py` contains an NHK Easy page fetch/extraction function for title, body, date, image, and source URL. Site markup can change; inspect and test the selectors against permitted pages before production crawling. Respect the source's terms, robots policy, and request limits.
- `backend/app/nlp.py` tokenizes with SudachiPy and attaches Vietnamese translations to each sentence. The bundled example articles have curated sample translations. For other content, configure a LibreTranslate-compatible Japanese-to-Vietnamese endpoint with `LIBRETRANSLATE_URL` (and optionally `LIBRETRANSLATE_API_KEY`) in the environment before starting Docker Compose. If no service is configured or it fails, the API returns an explicit “translation not configured” message for that sentence.
- If SudachiPy is unavailable, tokenization falls back to a coarse regex tokenizer. Grammar notes are deliberately rule-based starter explanations; lexical meanings currently say “dictionary data not connected.” Add a licensed dictionary/curated lexicon and reviewed grammar content (or an LLM service) before treating explanations as authoritative.
- Furigana in the demo reader uses a small local reading map for sample words. For broad article coverage, create ruby spans from analyzer readings and validate ambiguity/okurigana before rendering.
- TTS uses the browser's Japanese speech synthesis voice when available. Save-word currently demonstrates the UI state; persistent user accounts and wordbook storage are outside this MVP.

## Structure

```text
backend/  FastAPI API, SQLAlchemy model, Sudachi NLP, scraper
frontend/ Next.js 14, TypeScript, Tailwind, reader UI
docker-compose.yml
```
