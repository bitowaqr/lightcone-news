# Lightcone News

**AI-powered news aggregator and forecasting platform: navigate by numbers, not narratives.**

Lightcone News is a full-stack application that curates important global news stories and pairs them with probabilistic forecasts from prediction markets, forecasting communities, and custom AI agents. It scrapes news from 13+ international publications, generates synthesized articles using a multi-agent AI pipeline, and links them to relevant prediction market scenarios — giving readers a forward-looking, quantitative lens on current events.

> Lightcone News was an active project from March to July 2025, built by [PRIORB GmbH](https://priorb.com). Due to the high operational costs of its AI features and a lack of funding, the site is no longer being actively maintained.

---

## Table of Contents

- [How It Works](#how-it-works)
- [Key Features](#key-features)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Data Pipelines](#data-pipelines)
- [AI Agents](#ai-agents)
- [News Sources](#news-sources)
- [Prediction Market Integration](#prediction-market-integration)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)

---

## How It Works

Lightcone News operates through three automated pipelines that run on cron schedules:

1. **Newsfeed Pipeline** (every 3 hours) — Scrapes RSS feeds from international news outlets, curates the most relevant stories, generates synthesized articles via a chain of AI agents (journalist → contextualiser → copy editor), and publishes them to the feed.

2. **Scenario Scraping Pipeline** (every 2 hours) — Pulls prediction market questions from Polymarket, Metaculus, and Manifold Markets. Labels them with improved descriptions, generates vector embeddings, and stores them in ChromaDB for semantic matching against articles.

3. **Forecast Update Pipeline** (every 30 minutes) — Dispatches 9 independent AI forecasting agents to generate probability estimates and research dossiers for tracked scenarios, with intelligent scheduling based on time-to-resolution.

---

## Key Features

- **Curated AI-generated newsfeed** — Articles synthesized from multiple international sources, not just reposted
- **Probabilistic forecasts** — Every article linked to relevant prediction market scenarios (0–100% probabilities)
- **9 AI forecasting agents** — Each with a distinct analytical persona and approach, producing independent probability estimates with research dossiers
- **Semantic article–scenario matching** — Vector embeddings (OpenAI `text-embedding-3-large`) + ChromaDB find relevant forecasts for each article
- **Multi-source aggregation** — 13 international news outlets scraped via RSS + Exa API
- **3 prediction market platforms** — Polymarket, Metaculus, Manifold Markets
- **AI chat** — Gemini-powered chat with web search grounding on article pages
- **User accounts** — Registration, bookmarks, read tracking, forecast request submissions
- **Admin dashboard** — Full CRUD for all collections, editorial workflow management, manual pipeline triggers
- **PWA support** — Installable as a mobile app with offline capability
- **Dark mode** — Full light/dark theme support
- **GDPR-compliant** — Cookie consent banner, privacy controls on analytics

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        SCHEDULED WORKERS                         │
│                                                                  │
│  Newsfeed (3h)    Scenarios (2h)    Forecasts (30min)            │
│       │                 │                  │                     │
│       ▼                 ▼                  ▼                     │
│  ┌─────────┐     ┌───────────┐     ┌──────────────┐            │
│  │ 13 RSS  │     │ Polymarket│     │ 9 Forecaster │            │
│  │ Feeds   │     │ Metaculus │     │ AI Agents    │            │
│  │ + Exa   │     │ Manifold  │     └──────┬───────┘            │
│  └────┬────┘     └─────┬─────┘            │                     │
│       │                │                  │                     │
│       ▼                ▼                  │                     │
│  ┌─────────┐     ┌───────────┐            │                     │
│  │ AI Agent│     │ Embedding │            │                     │
│  │ Pipeline│     │ + ChromaDB│            │                     │
│  │ (4 step)│     └─────┬─────┘            │                     │
│  └────┬────┘           │                  │                     │
│       │                │                  │                     │
│       ▼                ▼                  ▼                     │
│  ┌─────────────────────────────────────────────┐                │
│  │              MongoDB (Primary DB)            │                │
│  │  Articles, Scenarios, Forecasters, Users...  │                │
│  └─────────────────────────────────────────────┘                │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     NUXT 3 APPLICATION                           │
│                                                                  │
│  Frontend (Vue 3 + Tailwind)    Server API (H3)                 │
│  ├── Newsfeed page              ├── /api/articles               │
│  ├── Article detail             ├── /api/scenarios              │
│  ├── Forecasts browser          ├── /api/forecasters            │
│  ├── Forecaster profiles        ├── /api/auth                   │
│  ├── User profile               ├── /api/bookmarks             │
│  └── Admin dashboard            └── /api/admin                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Nuxt 3 / Vue 3 |
| **Styling** | Tailwind CSS, Headless UI, Nuxt UI |
| **State** | Pinia |
| **Database** | MongoDB (Mongoose ODM) |
| **Vector DB** | ChromaDB |
| **LLM orchestration** | LangChain |
| **Primary LLM** | Google Gemini 2.5 Pro |
| **Embeddings** | Azure OpenAI `text-embedding-3-large` |
| **Web scraping** | Exa API, Cheerio, Puppeteer |
| **Auth** | JWT + bcrypt (HttpOnly cookies) |
| **Email** | AWS SES |
| **Scheduling** | node-cron |
| **Charts** | Chart.js + vue-chartjs |
| **Rich text** | Tiptap |
| **Containerization** | Docker Compose |
| **PWA** | @vite-pwa/nuxt |

---

## Project Structure

```
lightcone-news/
├── assets/css/            # Global styles
├── components/
│   ├── Admin/             # Admin dashboard & editors
│   ├── Article/           # Article display, teasers, sources
│   ├── Scenario/          # Scenario cards, charts, request forms
│   └── ...                # Layout, auth, common components
├── composables/           # Vue composables (dark mode, scenario data)
├── layouts/               # Nuxt layouts
├── middleware/             # Auth & admin route guards
├── pages/                 # Route pages (newsfeed, articles, scenarios, admin)
├── plugins/               # Nuxt plugins
├── public/                # Static assets, PWA icons, favicons
├── scripts/               # DB seed, wipe, admin toggle scripts
├── server/
│   ├── agents/            # 28 AI agents (journalism, forecasting, curation)
│   ├── api/               # REST API endpoints
│   ├── middleware/         # Server auth middleware
│   ├── models/            # Mongoose schemas (User, Article, Scenario, etc.)
│   ├── scrapers/          # News source RSS scrapers
│   ├── scraper-scenarios/ # Prediction market scrapers
│   ├── services/          # Business logic (MongoDB, embeddings, ChromaDB, forecasts)
│   ├── tools/             # LLM tools (Exa search)
│   └── utils/             # Rate limiting, retry logic
├── stores/                # Pinia stores (auth, bookmarks, read tracking)
├── workers/               # Scheduled pipelines & cron jobs
├── docker-compose.yml     # MongoDB + ChromaDB services
├── nuxt.config.ts         # Nuxt configuration
└── tailwind.config.js     # Tailwind configuration
```

---

## Data Pipelines

### Newsfeed Creation (every 3 hours)

1. **Scrape feeds** — RSS from 13 international news sources (~1000 items)
2. **Curate sources** — AI filters to most relevant items per publisher
3. **Create lineup** — `lineupCreator` agent produces 3–5 story ideas with priorities
4. **Write articles** — For each story idea:
   - Scrape full article text from sources via Exa API (cached in SourceDocument collection)
   - `journalist` agent synthesizes a draft from all sources
   - `contextualiser` agent adds suggested prompts and tags
   - `copyEditor` agent refines the final article
   - Semantic search matches relevant prediction market scenarios via ChromaDB
5. **Handle updates** — `updateWriter` merges new content into existing articles when a story develops
6. **Feed curation** — `feedCurator` agent assigns publish/archive status and priority ordering

### Scenario Scraping (every 2 hours)

1. Scrape Polymarket, Metaculus, and Manifold APIs in parallel
2. Upsert to MongoDB with unified schema
3. Label scenarios with improved question text via `scenariosLabeller` agent
4. Generate vector embeddings for new/changed scenarios
5. Store in ChromaDB; remove resolved/canceled scenarios

### Forecast Updates (every 30 minutes)

1. Identify open scenarios needing updates (smart scheduling: more frequent for short-term scenarios)
2. Dispatch up to 10 forecasts per run across 9 AI agents
3. Each agent independently researches and produces a probability estimate + rationale + dossier
4. Results stored in scenario's `probabilityHistory` array

---

## AI Agents

The system uses **28 specialized AI agents**, primarily powered by Gemini 2.5 Pro:

### Content Pipeline Agents
| Agent | Role |
|-------|------|
| `journalist` | Synthesizes articles from scraped sources |
| `copyEditor` | Refines and polishes article drafts |
| `updateWriter` | Merges new developments into existing articles |
| `contextualiser` | Generates discussion prompts and tags |
| `lineupCreator` | Produces the daily editorial lineup |
| `feedCurator` | Assigns publish/archive status and priorities |
| `publisherCurator` | Scores and filters content per publisher |
| `scenariosLabeller` | Rewrites scenario questions for clarity |
| `sourceScreener` | Evaluates source quality and relevance |

### Forecasting Agents (9 agents)
Each forecaster has a distinct analytical persona and produces independent probability estimates with research dossiers:

| Agent | Theme |
|-------|-------|
| `forecasterStrange` | Superforecasting methodology |
| `forecasterManhattan` | Manhattan Project analytical rigor |
| `forecasterMoirae` | Greek Fates — pattern recognition |
| `forecasterMuaddib` | Dune prescience — geopolitical focus |
| `forecasterOrunmila` | Yoruba divination — wisdom tradition |
| `forecasterSaruman` | LOTR — strategic intelligence |
| `forecasterSibyl` | Ancient oracle — historical parallels |
| `forecasterTiresias` | Blind prophet — contrarian analysis |
| `forecasterGaladriel` | LOTR — long-range foresight |

---

## News Sources

RSS feeds are scraped from 13 international outlets:

- Al Jazeera, BBC, CBC, DW (Deutsche Welle), Euronews, France 24, NHK, NPR, Semafor, Tagesschau, Times of India, WELT, ZDFheute

Full article content is retrieved via the **Exa API** with live crawling, cached in MongoDB for 7 days.

---

## Prediction Market Integration

Scenarios are scraped from three platforms and normalized to a unified schema:

| Platform | Data | Filter |
|----------|------|--------|
| **Polymarket** | Binary & categorical markets | Excludes sports, sorted by volume |
| **Metaculus** | Binary questions | Open questions, sorted by date |
| **Manifold Markets** | Binary contracts | Open contracts, sorted by liquidity |

Scenarios are embedded as vectors and stored in ChromaDB for semantic matching against article content.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (for MongoDB and ChromaDB)
- API keys (see [Environment Variables](#environment-variables))

### Setup

```bash
# Install dependencies
npm install

# Start databases
docker-compose up -d

# Seed the database (optional)
npm run db:seed

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Running Workers

Workers are standalone Node.js processes that run the data pipelines:

```bash
# Newsfeed creation scheduler (every 3 hours)
node workers/createNewsfeedScheduler.js

# Scenario scraping scheduler (every 2 hours)
node workers/scrapeScenariosScheduler.js

# Forecast update scheduler (every 30 minutes)
node workers/updateForecastScheduler.js
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `MONGO_USERNAME` | MongoDB auth username |
| `MONGO_PASSWORD` | MongoDB auth password |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `GEMINI_API_KEY` | Google Gemini API key (primary LLM) |
| `OPENAI_API_KEY` | OpenAI API key |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI key (embeddings) |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint URL |
| `EXA_API_KEY` | Exa search/scraping API key |
| `CHROMA_URL` | ChromaDB endpoint (default: `http://localhost:8000`) |
| `METACULUS_API_TOKEN` | Metaculus API token |
| `AWS_ACCESS_KEY_ID` | AWS credentials for SES email |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials for SES email |
| `AWS_REGION` | AWS region for SES |
| `GTAG_ID` | Google Analytics tag ID |
| `WORKER_MODEL` | Override default LLM model for workers |

---

## Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Run ESLint
npm run format           # Run Prettier

npm run db:seed          # Seed the database
npm run db:wipe          # Wipe the database
npm run db:query-users   # List all users
npm run db:toggle-admin  # Toggle admin role for a user
```

---

## License

This is a private repository. All rights reserved by PRIORB GmbH.
