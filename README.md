# ⚖️ NyayaSim v2 — Virtual Courtroom AI

India's AI-powered virtual courtroom simulation platform for law students.

---

## 🚀 Quick Setup (5 minutes)

### Step 1 — Backend
```bash
cd backend
npm install
cp .env.example .env
# Open .env → paste your ANTHROPIC_API_KEY
npm run dev
# ✅  NyayaSim Backend running on http://localhost:3001
```

### Step 2 — Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Open .env → paste Supabase URL + key (optional — app works without it)
npm run dev
# ✅  Open http://localhost:5173
```

---

## 🔑 Environment Variables

### `backend/.env`
```env
# REQUIRED — Get free at https://console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE

# IMPORTANT — Use haiku (free tier, fast)
AI_MODEL=claude-haiku-4-5-20251001

PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=25
```

### `frontend/.env`
```env
# OPTIONAL — Get free at https://supabase.com
# If not set, app works in guest mode
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

VITE_API_URL=http://localhost:3001
```

---

## ✅ What Works Without API Key (Offline Mode)

When there is no API key or backend is down, the app automatically uses the **offline engine**:

| Feature | Online (AI) | Offline |
|---------|-------------|---------|
| 4 pre-built cases | ✅ | ✅ |
| AI case generation | ✅ | ❌ |
| AI Judge responses | ✅ | ✅ (scripted) |
| AI Lawyer opponent | ✅ | ✅ (scripted) |
| Objection rulings | ✅ | ✅ (rule-based) |
| Witness examination | ✅ | ✅ (scripted) |
| Performance analysis | ✅ | ✅ (calculated) |
| Judgment delivery | ✅ | ✅ (template) |
| Legal Drafter eval | ✅ | ✅ (basic checks) |
| Study Guide + Quiz | ✅ | ✅ |
| Legal Suggestions | ✅ | ✅ (static tips) |

---

## 🆓 Free Tier Notes

- **Anthropic free tier** → Use `claude-haiku-4-5-20251001` (set in `AI_MODEL`)
- **Supabase free tier** → 500MB database, unlimited auth, 50,000 MAU
- **Voice input** → Uses browser's built-in Web Speech API (Chrome/Edge only, completely free)

---

## 📁 Project Structure

```
nyayasim2/
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── server.js                  ← Express server
│   ├── routes/
│   │   ├── ai.js                  ← 9 AI endpoints
│   │   └── cases.js               ← Case storage (4 offline + saved)
│   └── services/
│       └── claudeService.js       ← All Claude AI functions
│
└── frontend/
    ├── .env.example
    ├── package.json
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx                ← Router + sidebar + AI status
        ├── context/
        │   └── AuthContext.jsx    ← Supabase auth + guest mode
        ├── data/
        │   └── offlineEngine.js   ← Full offline logic (no AI needed)
        ├── hooks/
        │   └── useVoice.js        ← Web Speech API hook
        ├── pages/
        │   ├── AuthPage.jsx       ← Login / Signup / Guest
        │   ├── Dashboard.jsx      ← Home with stats and quick actions
        │   ├── Cases.jsx          ← Browse + AI generate cases
        │   ├── Courtroom.jsx      ← Full trial simulation
        │   ├── StudyGuide.jsx     ← IPC/CrPC/Constitution + Quiz
        │   ├── Drafter.jsx        ← Legal document drafting
        │   └── Leaderboard.jsx    ← Rankings (real users only)
        ├── styles/
        │   └── global.css         ← Full design system
        └── utils/
            ├── api.js             ← All API calls
            └── supabase.js        ← Supabase client (graceful null)
```

---

## 🛠️ Common Fixes

| Problem | Fix |
|---------|-----|
| `401 Unauthorized` from Anthropic | Wrong API key — copy exact key from console.anthropic.com |
| `Model not found` error | Set `AI_MODEL=claude-haiku-4-5-20251001` in backend/.env |
| `rate_limit_error` | Free tier limit hit — wait 60 seconds or use offline mode |
| CORS error in browser | Backend must be running on port 3001 before starting frontend |
| Voice input not working | Must use Chrome or Edge — Firefox doesn't support Web Speech API |
| Supabase auth error | Leave `.env` Supabase vars blank — app auto-uses guest mode |
| `nodemon: not found` | Run `npm install` in backend folder first |

---

## 🧱 Supabase Setup (Optional, Free)

1. Go to [supabase.com](https://supabase.com) → New project
2. Settings → API → copy **Project URL** and **anon public key**
3. Paste into `frontend/.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
4. In Supabase → Authentication → Providers → enable **Email** and optionally **Google**
5. That's it — signup/login now works with real accounts

Without Supabase configured, the app runs in **Guest Mode** — fully functional, no account needed.
