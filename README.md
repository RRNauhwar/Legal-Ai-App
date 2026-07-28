# AI Courtroom Project

This is an AI-powered moot courtroom simulator and legal education suite.

## How to Start the App

### 1. Install Dependencies
Run the following command in the root directory to install dependencies for both the frontend and backend:
```bash
npm run install:all
```

### 2. Configure Environment Variables
1. **Backend**: Copy `backend/.env.example` to `backend/.env` and add your `GEMINI_API_KEY`.
   ```bash
   cp backend/.env.example backend/.env
   ```
2. **Frontend**: Copy `frontend/.env.example` to `frontend/.env` (optional; leave blank to use the app in Guest Mode).
   ```bash
   cp frontend/.env.example frontend/.env
   ```

### 3. Run the Application

#### Start the Backend Server:
```bash
npm start --prefix backend
```

#### Start the Frontend Server:
```bash
npm run dev --prefix frontend
```

Once both servers are running, open your browser and navigate to:
**http://localhost:5173**
