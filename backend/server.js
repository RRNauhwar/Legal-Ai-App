import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import aiRoutes from './routes/ai.js';
import caseRoutes from './routes/cases.js';
import roomRoutes from './routes/rooms.js';
import communityRoutes from './routes/community.js';
import ratingRoutes from './routes/ratings.js';
import statRoutes from './routes/stats.js';
import './services/telegramBot.js';
import {
  auditLog,
  csrfGuard,
  requireAuth,
  securityHeaders,
  validateJsonBody,
  validateUploadMetadata
} from './middleware/security.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../frontend/dist');

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(securityHeaders);
app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-CSRF-Cookie', 'X-Demo-Role', 'X-Demo-User-Id', 'X-Demo-User-Name', 'X-Demo-College-Id']
}));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '2mb', strict: true }));
app.use('/api/', rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please wait a moment.' }
}));
app.use('/api/', validateJsonBody, csrfGuard, requireAuth, validateUploadMetadata);

app.use('/api/ai', auditLog('ai_request'), aiRoutes);
app.use('/api/cases', auditLog('case_activity'), caseRoutes);
app.use('/api/rooms', auditLog('courtroom_room_activity'), roomRoutes);
app.use('/api/community', auditLog('community_activity'), communityRoutes);
app.use('/api/ratings', auditLog('rating_activity'), ratingRoutes);
app.use('/api/stats', auditLog('stats_activity'), statRoutes);

const healthPayload = () => ({
  ok: true, model: process.env.AI_MODEL || (process.env.OPENAI_API_KEY ? 'gpt-4o-mini' : 'gemini-2.5-flash'),
  aiEnabled: !!(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY)
});

app.get('/health', (_, res) => res.json(healthPayload()));
app.get('/api/health', (_, res) => res.json(healthPayload()));

app.use(express.static(frontendDist));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) next();
  });
});

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const safeMessage = status >= 500 ? 'Internal server error' : err.message;
  console.error('[server]', { requestId: req.requestId, status, message: err.message });
  res.status(status).json({ success: false, error: safeMessage, requestId: req.requestId });
});

app.listen(PORT, () => {
  console.log(`⚖️  NyayaSim v2 — http://localhost:${PORT}`);
  console.log(`   Model : ${process.env.AI_MODEL || (process.env.OPENAI_API_KEY ? 'gpt-4o-mini' : 'gemini-2.5-flash')}`);
  console.log(`   AI    : ${process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY ? '✅ enabled' : '❌ offline mode only'}`);
});
