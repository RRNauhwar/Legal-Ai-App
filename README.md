# ⚖️ NyayaSim v2 — AI Moot Court Simulator & Legal Education Suite

An interactive virtual courtroom simulator, AI-assisted legal drafting desk, and comprehensive growth/training platform designed specifically for law students.

---

## 🚀 Key Features

### 1. Simulation Suite
* **Virtual Courtroom**: Participate in live AI and multiplayer hearings. Includes witness cross-examinations, objections, timers, voice controls, and performance scoring.
* **Case Library**: Criminal, civil, constitutional, and AI-generated cases complete with structured case sheets, facts, and court-ready files.

### 2. AI Workflows
* **Drafting Desk**: Create petitions, bail applications, contracts, and legal notices with real-time feedback on formatting, legal arguments, and structural soundness.
* **AI Legal Assistant**: Ask research questions, explore explainers for IPC/BNS and the Constitution, find citations, and utilize drafting prompts.

### 3. Growth Network & SaaS Operations
* **Legal Academy**: Daily challenges, mock exams, and milestone-based certifications.
* **Community Arena**: Local college competitions, public profile showcases, performance badges, and global rankings (scoring confidence, accuracy, fluency, and win ratios).
* **Recruiter & Pro Portal**: SaaS features including subscription plans, AI credits, verified resumes, and recruiter visibility dashboard.

---

## 🛠️ Architecture & Tech Stack

```
nyayasim-monorepo/
├── backend/             # Express.js API server
│   ├── routes/          # AI, cases, rooms, community, ratings, academy, and stats endpoints
│   ├── middleware/      # Security guards, auth, rate limiting, and CSRF protection
│   └── services/        # AI orchestration (Gemini/OpenAI) and logging
│
├── frontend/            # React.js SPA (Vite)
│   ├── src/
│   │   ├── pages/       # Courtroom, Academy, Cases, Drafter, Dashboard, Community, Career
│   │   ├── components/  # Navbars, Command Palette, UI widgets
│   │   └── context/     # Auth (Supabase Client integration)
```

* **Frontend**: React (Vite), React Router DOM, React Hot Toast, Tailwind CSS / Custom Variables.
* **Backend**: Node.js, Express, Rate-Limit, CORS.
* **Database/Auth**: Supabase (PostgreSQL & GoTrue Auth).
* **LLM Engine**: Gemini API & OpenAI API integration.

---

## ⚙️ Setup & Installation

### 📋 Prerequisites
* **Node.js** v20 or higher
* **npm** v10 or higher

### 📥 1. Clone & Install Dependencies
Clone the repository and install dependencies for both the frontend and backend in one command:
```bash
git clone https://github.com/RRNauhwar/Legal-Ai-App.git
cd nyayasim
npm run install:all
```

### 🔑 2. Environment Configuration

#### Backend Setup
Copy `backend/.env.example` to `backend/.env` and configure your API keys:
```bash
cp backend/.env.example backend/.env
```
Key configuration values in `backend/.env`:
* `GEMINI_API_KEY`: Required Gemini API Key (Get from [Google AI Studio](https://aistudio.google.com/app/apikey))
* `OPENAI_API_KEY`: Optional OpenAI API Key
* `PORT`: Defaults to `3001`

#### Frontend Setup
Copy `frontend/.env.example` to `frontend/.env`:
```bash
cp frontend/.env.example frontend/.env
```
Key configuration values in `frontend/.env`:
* `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY`: Supabase project coordinates. If left blank, the application automatically cascades into **Guest Mode** for local testing.
* `VITE_API_URL`: Defaults to `http://localhost:3001` (backend URL)

---

## 🏃 Running Locally

### Start Backend Server
```bash
npm start --prefix backend
# Or development mode:
npm run dev --prefix backend
```

### Start Frontend Dev Server
```bash
npm run dev --prefix frontend
```
The application will be accessible at **http://localhost:5173**.

---

## 🌐 Deployment
The monorepo includes a `render.yaml` configuration for quick zero-config deployment to [Render](https://render.com).

* **Build Command**: `npm install --prefix backend && npm install --prefix frontend && npm run build --prefix frontend`
* **Start Command**: `npm start --prefix backend`
* **Static Fallback**: Express serves pre-built React static files on production environments.
