# 🧠 NyayaSim v2 — Project Brain & Knowledge Base

This document serves as the single source of truth for the codebase architecture, features, workflows, and integrations of NyayaSim v2. Refer to this to avoid redundant file reads.

---

## 🛠️ Tech Stack & Architecture

### Backend (Express API)
- **Runtime**: Node.js (ES Modules, `"type": "module"`).
- **Core Dependencies**:
  - `express`: REST API framework.
  - `cors`: Cross-Origin Resource Sharing.
  - `dotenv`: Environment variable loader.
  - `express-rate-limit`: Prevents API key quota exhaustion.
  - `@anthropic-ai/sdk`: Client SDK for Claude models.
- **Entry Point**: `server.js` (runs on Port `3001` in dev).
- **Routing**:
  - `routes/ai.js`: Routes all AI-powered simulation steps.
  - `routes/cases.js`: File-based case database and custom case persistence.
  - `routes/rooms.js`: Multiplayer courtroom session configurations.
  - `routes/community.js`: Community discussions, likes, and comments API.
  - `routes/ratings.js`: Case file star ratings and reviews API.
  - `routes/stats.js`: User statistics history, global leaderboard, active rooms list, and admin logs API.
- **Database Layer (`services/db.js`)**:
  - Pure-JavaScript file-backed JSON database (`backend/data/db.json`) written with synchronous atomic updates.
  - Collections: `performances`, `posts`, `post_likes`, `post_comments`, `case_ratings`, and `audit_logs`.

### Frontend (React/Vite)
- **Framework**: React 18, Vite 5.
- **Routing**: `react-router-dom` (Version 6).
- **State & Context**:
  - `context/AuthContext.jsx`: Interacts with Supabase Auth. Fallbacks to Guest Mode if Supabase credentials are missing. Synchronizes user credentials to `localStorage` for API access.
- **Styling**: Vanilla CSS in `src/styles/global.css` plus component-level scoped `<style>` overlays.
- **Integrations**:
  - **Supabase**: Backend Database-as-a-Service for persistent auth.
  - **Web Speech API**: Browser-native voice recognition (speech-to-text) hook (`hooks/useVoice.js`).
  - **WebRTC Camera Stream**: Audio/video camera ingestion via `navigator.mediaDevices.getUserMedia()` inside courtroom grid frames.
  - **Web Speech Synthesis**: Native text-to-speech narration hook (`hooks/useSpeechPlayback.js`) with active speaker highlighting.

---

## 🤖 AI Routing Engine (`backend/services/claudeService.js`)

NyayaSim supports multiple AI backends, routing requests sequentially based on active keys in `backend/.env`.

### Routing Hierarchy
1. **OpenAI** (checked first if `OPENAI_API_KEY` is present)
2. **Gemini** (checked if `GEMINI_API_KEY` is present)
3. **Anthropic** (checked if `ANTHROPIC_API_KEY` is present)

### Default Configs & Fallbacks
- **OpenAI Model**: Configured via `AI_MODEL` or defaults to `gpt-4o-mini`. Requests are made via the native `fetch` API.
- **Gemini Model**: Configured via `AI_MODEL` or defaults to `gemini-2.5-flash`. Requests are made via native `fetch` to Google.
- **Anthropic Model**: Configured via `AI_MODEL` or defaults to `claude-haiku-4-5-20251001` using the official Node SDK.

---

## 🔌 API Endpoints & Core Workflows

### AI Endpoints (`routes/ai.js`)
- `POST /api/ai/generate-case`: Generates case documents including facts, charges, evidence, witnesses, and arguments. Supports `criminal`, `civil`, `constitutional`, `family`, and `cyber` types.
- `POST /api/ai/judge-respond`: AI Judge response to the user's argument, citing legal acts (IPC, CrPC, etc.).
- `POST /api/ai/lawyer-respond`: Generates rebuttal arguments for the AI Opposing Counsel.
- `POST /api/ai/objection`: Checks a trial objection, returning a Sustained/Overruled verdict with a legal reason.
- `POST /api/ai/analyze-performance`: Evaluates case arguments, citations, logical reasoning, and outputs a scorecard.
- `POST /api/ai/legal-suggestions`: Returns real-time strategy tips and case law precedents for current arguments.
- `POST /api/ai/witness-answer`: Simulates a witness response based on backstory, role, and prior testimony.
- `POST /api/ai/evaluate-draft`: Evaluates legal drafts and outputs a score, corrections, and improved openings.
- `POST /api/ai/deliver-judgment`: Returns a formal final judgment containing Facts, Issues, Analysis, and Orders.
- `POST /api/ai/precedents`: Identifies 3 historical Indian court precedents relevant to the trial transcript.

### Forum & Engagement Endpoints (`routes/community.js`)
- `GET /api/community/posts`: Lists posts (discussions, groups, challenges) with likes and comments.
- `POST /api/community/posts`: Creates a new post. (Requires auth).
- `POST /api/community/posts/:id/like`: Toggles post like. (Requires auth, prevents duplicates).
- `GET /api/community/posts/:id/comments`: Lists post replies.
- `POST /api/community/posts/:id/comments`: Adds comment reply. (Requires auth).

### Ratings Endpoints (`routes/ratings.js`)
- `GET /api/ratings/cases/:caseId`: Get average star rating and reviews list.
- `POST /api/ratings/cases/:caseId`: Add/update case rating & review (1-5 stars). (Requires auth, unique per user-case).

### Stats & Logging Endpoints (`routes/stats.js`)
- `POST /api/stats/performances`: Save completed courtroom mock trial scorecards.
- `GET /api/stats/me`: Calculates user trial counts, win ratios, averages, and unlocks badges.
- `GET /api/stats/leaderboard`: Rank users globally by their mock trial averages.
- `GET /api/stats/active-rooms`: Query currently active multiplayer rooms.
- `GET /api/stats/admin/logs`: Serve server incoming request audits.

---

## 📴 Offline Legal Engine (`frontend/src/data/offlineEngine.js`)

If the backend is offline or no API keys are configured, the app falls back to a mock legal engine to maintain functionality:
- **Case Library**: Loads 8 offline pre-built cases, including landmark Indian trials: Kesavananda Bharati (Basic Structure), Aarushi Murder Trial, Shreya Singhal (Section 66A IT), and Shayara Bano (Triple Talaq).
- **Simulated Responses**: Uses pre-defined responses and rule-based template logic for the Judge, opposing lawyer, witness testimonies, and objection rulings.
- **Calculated Scoring**: Computes performance scores using deterministic formulas based on objection rates, trial duration, and argument counts.

---

## 📂 Key Frontend Pages & Components

1. **Dashboard (`/`)**: Displays user statistics (win ratio, average score, trial count, earned badges), recent trial history table, active multiplayer moot rooms, active case files, and market watch.
2. **Case Library (`/cases`)**: Lists all civil, criminal, and constitutional cases. Allows users to request instant AI-generation of new case files, read summaries, view reviews, and rate case files.
3. **Live Courtroom (`/courtroom`)**: Houses the trial simulator. Includes:
   - **Zoom Chamber Gallery Grid**: Large gallery grid cards rendering AI Judge, Prosecution, Defense, and Witness stand. Speaking rings highlight active characters.
   - **YouTube-Style Chat Sidebar**: Tabbed right side panel mirroring live stream reactions. Contains three tabs:
     - `💬 Live Chat`: Circular participant avatars and message bubbles showing the oral record. Housing the user input methods (Typing textarea OR ChatGPT continuous Voice mode waves) at the bottom.
     - `📁 Case Files`: Displays fact briefs, claims, statutes, and precedents.
     - `💡 AI Help`: Lists courtroom rules and real-time strategies.
   - **WebRTC Webcam Capture**: Feeds real-time local video when camera toggles are enabled.
   - **Default Enabled TTS**: Speech playback defaults to active so AI speaks automatically. Integrates interruptible speech for instant replies.
4. **Drafting Desk (`/drafter`)**: An editor page where users draft petitions, notices, or contracts, receiving grading breakdowns and drop-in corrections from the AI.
5. **AI Legal Assistant (`/study`)**: Educational suite containing databases of IPC sections, constitutional articles, citation searchers, and interactive flashcard drills.
6. **Academy (`/academy`)**: Milestone certification hub (Certified Trial Advocate, Appellate Master) unlocking dynamically from completed session stats.
7. **Judge Beaks Path (`/judge-beaks`)**: A dedicated gamified skill tree UI to guide students through learning modules step-by-step.
8. **Billing & Recruiters (`/career`)**: Workspace operations displaying membership details, top verified candidates calculated from real database scores, and system audit logs.





