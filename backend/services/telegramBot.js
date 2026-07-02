import { ask, generateCase } from './claudeService.js';
import db from './db.js';
import { store } from '../routes/cases.js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.log('🤖 Telegram Bot Token not set. Polling listener disabled.');
} else {
  console.log('🤖 Telegram Bot Polling Listener starting with SYSTEM CONTROL capabilities...');
  startPolling();
}

async function startPolling() {
  let offset = 0;
  while (true) {
    try {
      const url = `https://api.telegram.org/bot${token}/getUpdates?timeout=15&offset=${offset}`;
      const res = await fetch(url);
      if (!res.ok) {
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      const data = await res.json();
      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          if (update.message && update.message.text) {
            await handleMessage(update.message);
          }
        }
      }
    } catch (err) {
      console.error('🤖 Telegram Bot Error during polling:', err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const userId = `telegram_${msg.from.id}`;
  const userName = msg.from.first_name || 'Advocate';

  // AI Router equipped with System Controls
  const systemPrompt = `You are the NyayaSim AI system controller and developer assistant.
You have complete control over the production unit workspace. You can read files, write/edit files, run terminal commands, manage mock trials, and write forum posts.
Determine the user's intent. If they want to inspect the codebase, run a script, generate briefs, or modify files, return the correct action.

Return ONLY a valid JSON object matching this schema:
{
  "action": "get_stats" | "get_leaderboard" | "generate_case" | "list_cases" | "create_post" | "list_posts" | "read_file" | "write_file" | "run_command" | "chat",
  "caseType": "criminal" | "civil" | "constitutional" | "family" | "cyber",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "postTitle": "string",
  "postContent": "string",
  "filePath": "relative/path/to/file.js",
  "fileContent": "string (the full content to write to the file)",
  "command": "terminal command to run",
  "replyText": "short conversational fallback reply text if action is chat"
}`;

  try {
    // Send typing status
    await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' })
    });

    const aiResponse = await ask(systemPrompt, text, 800);
    let parsed;
    try {
      const cleanJson = aiResponse.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      parsed = { action: 'chat', replyText: aiResponse };
    }

    let reply = '';
    
    // 1. READ FILE ACTION
    if (parsed.action === 'read_file') {
      if (!parsed.filePath) {
        reply = `❌ *Error*: File path is missing in request.`;
      } else {
        const targetPath = path.resolve(PROJECT_ROOT, parsed.filePath);
        if (!targetPath.startsWith(PROJECT_ROOT)) {
          reply = `❌ *Security Error*: Access denied. Path is outside project directory.`;
        } else {
          try {
            const content = await fs.readFile(targetPath, 'utf-8');
            const codeBlock = content.slice(0, 3600);
            reply = `📄 *File*: \`${parsed.filePath}\`\n\n\`\`\`javascript\n${codeBlock}\n\`\`\``;
            if (content.length > 3600) {
              reply += `\n\n*(Truncated due to Telegram 4096-character limit)*`;
            }
          } catch (err) {
            reply = `❌ *Failed to read file*: ${err.message}`;
          }
        }
      }
    }
    
    // 2. WRITE FILE ACTION
    else if (parsed.action === 'write_file') {
      if (!parsed.filePath || !parsed.fileContent) {
        reply = `❌ *Error*: File path or content is missing.`;
      } else {
        const targetPath = path.resolve(PROJECT_ROOT, parsed.filePath);
        if (!targetPath.startsWith(PROJECT_ROOT)) {
          reply = `❌ *Security Error*: Access denied. Path is outside project directory.`;
        } else {
          try {
            await fs.mkdir(path.dirname(targetPath), { recursive: true });
            await fs.writeFile(targetPath, parsed.fileContent, 'utf-8');
            reply = `✅ *Successfully wrote file*: \`${parsed.filePath}\``;
          } catch (err) {
            reply = `❌ *Failed to write file*: ${err.message}`;
          }
        }
      }
    }
    
    // 3. RUN TERMINAL COMMAND ACTION
    else if (parsed.action === 'run_command') {
      const cmd = parsed.command;
      if (!cmd) {
        reply = `❌ *Error*: Command string is missing.`;
      } else {
        reply = `⏳ *Running terminal command*: \`${cmd}\`...`;
        await sendTelegramMessage(chatId, reply);
        
        try {
          const result = await new Promise((resolve) => {
            exec(cmd, { cwd: PROJECT_ROOT, timeout: 20000 }, (error, stdout, stderr) => {
              resolve({ error, stdout, stderr });
            });
          });
          
          let out = result.stdout ? `*Output*:\n\`\`\`\n${result.stdout.slice(0, 1800)}\n\`\`\`` : '';
          let err = result.stderr ? `*Error Output*:\n\`\`\`\n${result.stderr.slice(0, 1800)}\n\`\`\`` : '';
          let status = result.error ? `❌ *Failed (Code ${result.error.code})*` : `✅ *Success*`;
          
          reply = `💻 *Command Executed*: \`${cmd}\`\nStatus: ${status}\n\n${out}${err}`;
        } catch (err) {
          reply = `❌ *Execution failed*: ${err.message}`;
        }
      }
    }
    
    // 4. GET STATISTICS
    else if (parsed.action === 'get_stats') {
      const performances = db.findMany('performances', p => p.userId === userId);
      const count = performances.length;
      if (count === 0) {
        reply = `⚖️ *NyayaSim Profile: ${userName}*\n\nNo courtroom trials completed yet. Start practicing in the app!`;
      } else {
        let totalScore = 0;
        let wins = 0;
        performances.forEach(p => {
          totalScore += p.overallScore;
          if (p.outcome === 'win') wins++;
        });
        const avg = Math.round(totalScore / count);
        const badge = performances[count - 1]?.badge || 'Advocate';
        reply = `⚖️ *NyayaSim Profile: ${userName}*\n\n• Completed Trials: *${count}*\n• Average Score: *${avg}/100*\n• Win Ratio: *${wins}:${count - wins}*\n• Current Badge: *🏅 ${badge}*`;
      }
    }
    
    // 5. GET LEADERBOARD
    else if (parsed.action === 'get_leaderboard') {
      const all = db.findMany('performances', () => true);
      const users = {};
      all.forEach(p => {
        if (!users[p.userId]) users[p.userId] = { name: p.userName, scores: [], wins: 0 };
        users[p.userId].scores.push(p.overallScore);
        if (p.outcome === 'win') users[p.userId].wins++;
      });
      const ranked = Object.entries(users).map(([uid, u]) => {
        const avg = Math.round(u.scores.reduce((a,b)=>a+b, 0) / u.scores.length);
        return { uid, name: u.name, avg, count: u.scores.length, wins: u.wins };
      }).sort((a,b) => b.avg - a.avg).slice(0, 5);

      if (ranked.length === 0) {
        reply = `🏆 *Advocate Leaderboard*\n\nNo performances logged yet. Be the first!`;
      } else {
        reply = `🏆 *Top 5 Advocate Leaderboard*\n\n` + ranked.map((r, i) => `${i+1}. *${r.name}* · Avg: *${r.avg}/100* (${r.count} trials)`).join('\n');
      }
    }
    
    // 6. LIST CASES
    else if (parsed.action === 'list_cases') {
      const casesList = Array.from(store.values());
      reply = `📁 *NyayaSim Case Library*\n\n` + casesList.map((c, i) => `${i+1}. *${c.title}* (${c.caseType} · ${c.difficulty})`).join('\n');
    }
    
    // 7. GENERATE CASE
    else if (parsed.action === 'generate_case') {
      const cType = parsed.caseType || 'criminal';
      const cDiff = parsed.difficulty || 'intermediate';
      reply = `⏳ *Generating new ${cDiff} ${cType} case brief...*`;
      await sendTelegramMessage(chatId, reply);
      
      const caseBrief = await generateCase(cType, cDiff);
      const caseId = `gen-${Date.now()}`;
      const newCaseObj = { ...caseBrief, id: caseId, createdAt: new Date().toISOString() };
      store.set(caseId, newCaseObj);
      
      reply = `✅ *Case Generated & Saved!*\n\n• *Title*: ${newCaseObj.title}\n• *Type*: ${newCaseObj.caseType}\n• *Difficulty*: ${newCaseObj.difficulty}\n• *Case No*: ${newCaseObj.caseNumber}\n\nOpen your Case Library in the app to practice on this brief!`;
    }
    
    // 8. CREATE COMMUNITY POST
    else if (parsed.action === 'create_post') {
      const title = parsed.postTitle || 'Update from Telegram';
      const content = parsed.postContent || text;
      const post = db.insert('posts', {
        userId,
        userName,
        title,
        content,
        category: 'discussion',
        likesCount: 0
      });
      reply = `📝 *Community Post Published!*\n\n• *Title*: ${post.title}\n• *Author*: ${userName}\n\nCheck the Forum Feed in the app to read it!`;
    }
    
    // 9. LIST COMMUNITY POSTS
    else if (parsed.action === 'list_posts') {
      const posts = db.findMany('posts', () => true).slice(-5).reverse();
      if (posts.length === 0) {
        reply = `💬 *Community Forum Feed*\n\nNo posts published yet. Be the first!`;
      } else {
        reply = `💬 *Latest Community Posts*\n\n` + posts.map((p, i) => `${i+1}. *${p.title}* by ${p.userName}\n   "${p.content.slice(0, 60)}..."`).join('\n');
      }
    }
    
    // 10. GENERAL CHAT FALLBACK
    else {
      reply = parsed.replyText || 'I can help you monitor stats, edit codes, read files, run terminal scripts, list cases, and post to the community. Try asking: "show stats" or "read server.js"';
    }

    await sendTelegramMessage(chatId, reply);
  } catch (err) {
    console.error('🤖 Telegram Handler Error:', err);
    await sendTelegramMessage(chatId, `⚠️ Sorry, I encountered an error processing that request: ${err.message}`);
  }
}

async function sendTelegramMessage(chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' })
    });
  } catch (err) {
    console.error('🤖 Failed to send Telegram message:', err.message);
  }
}
