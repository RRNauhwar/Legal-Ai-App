# 🤖 n8n Telegram Agent for NyayaSim

This directory contains the n8n workflow configuration to control your NyayaSim app directly from a Telegram Bot. By importing this workflow, you can chat with your Telegram Bot to query trial stats, browse and generate cases, check the global leaderboard, and write community posts.

## 🛠️ How it works
1. **Telegram Trigger**: A user sends a message to your Telegram Bot.
2. **AI Agent (n8n)**: An n8n AI Agent node (configured with OpenAI, Gemini, or Anthropic) parses the user's intent.
3. **App Tools**: The AI Agent invokes dedicated HTTP tools to communicate with the NyayaSim backend.
4. **Dynamic Session Mapping**: The workflow automatically maps the sender's Telegram User ID and name into the `X-Demo-User-Id` and `X-Demo-User-Name` headers, authenticating them seamlessly as a Guest user in the database.
5. **Interactive Replies**: The agent formats the backend JSON response into a natural language message and replies to the Telegram user.

---

## 🚀 Setup Instructions

### 1. Create a Telegram Bot
1. Open Telegram and search for `@BotFather`.
2. Send the command `/newbot` and follow the instructions to set a name and username.
3. Copy the **HTTP API Token** (e.g., `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`).

### 2. Import the n8n Workflow
1. Open your n8n dashboard.
2. Click on **Workflows** → **New Workflow**.
3. In the top-right menu, select **Import from File** and select the [telegram_agent.json](file:///Users/rahulchaudhary/Desktop/nyayasim2%20copy/n8n/telegram_agent.json) file.

### 3. Configure Credentials in n8n
- **Telegram Receiver/Sender Nodes**: Click on these nodes and create a new Telegram credential using your Bot Token.
- **AI Agent Model Node**: Connect your preferred AI Provider node (e.g. OpenAI, Google Gemini, or Anthropic) and enter your API keys.

### 4. Expose your Local Backend (if running locally)
For n8n to reach your local backend running at `http://localhost:3001`, you must expose it publicly or set n8n to connect to your local network:
- **Option A (ngrok)**: Run `ngrok http 3001` in your terminal, and copy the forwarding HTTPS URL.
- **Option B (Cloudflare Tunnel)**: Run `cloudflared tunnel --url http://localhost:3001`.
- **Set Env Var**: In n8n, set the `BACKEND_URL` parameter in the HTTP Request node templates to your tunnel URL.

---

## 🗣️ Things you can say to your Telegram Bot:
- *"Show my mock trial stats and win ratio"*
- *"Who is currently leading the global leaderboard?"*
- *"Generate a new constitutional case for intermediate level"*
- *"List the active case library files"*
- *"Post 'Glad to join the community!' on the discussion feed"*
