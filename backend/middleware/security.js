import crypto from 'crypto';
import db from '../services/db.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const ALLOWED_UPLOAD_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

export const ROLES = Object.freeze({
  STUDENT: 'student',
  LAWYER: 'lawyer',
  JUDGE: 'judge',
  ADMIN: 'admin',
  COLLEGE: 'college',
  RECRUITER: 'recruiter'
});

export function securityHeaders(req, res, next) {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = requestId;

  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(), payment=(self)');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://api.anthropic.com",
      "media-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  );

  next();
}

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!token && process.env.REQUIRE_API_AUTH === 'true') {
    return res.status(401).json({ success: false, error: 'Authentication required', requestId: req.requestId });
  }

  let verifiedUser = null;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (token && supabaseUrl && supabaseAnonKey) {
    try {
      const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseAnonKey
        }
      });
      if (response.ok) {
        const userData = await response.json();
        verifiedUser = {
          userId: userData.id,
          role: userData.user_metadata?.role || ROLES.STUDENT,
          collegeId: userData.user_metadata?.collegeId || null
        };
      }
    } catch (err) {
      console.error('[auth] Supabase token verification failed:', err);
    }
  }

  if (token && !verifiedUser && process.env.REQUIRE_API_AUTH === 'true') {
    return res.status(401).json({ success: false, error: 'Invalid or expired authentication token', requestId: req.requestId });
  }

  if (verifiedUser) {
    req.auth = verifiedUser;
  } else {
    // Determine if we should allow demo/unverified headers (only in development and if explicitly enabled)
    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    const allowDemo = process.env.ALLOW_DEMO_HEADERS === 'true';

    if (isDev && allowDemo) {
      req.auth = {
        userId: req.headers['x-demo-user-id'] || 'demo-user',
        role: req.headers['x-demo-role'] || ROLES.STUDENT,
        collegeId: req.headers['x-demo-college-id'] || null
      };
    } else {
      // In production or safe mode, unverified requests are demoted to guest students.
      // They cannot specify an arbitrary role.
      req.auth = {
        userId: req.headers['x-demo-user-id'] || 'guest-user',
        role: ROLES.STUDENT,
        collegeId: null
      };
    }
  }

  return next();
}

export function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!allowed.includes(req.auth?.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions', requestId: req.requestId });
    }
    return next();
  };
}

export function validateJsonBody(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (!req.is('application/json')) {
    return res.status(415).json({ success: false, error: 'JSON body required', requestId: req.requestId });
  }
  return next();
}

export function validateUploadMetadata(req, res, next) {
  const upload = req.body?.upload;
  if (!upload) return next();

  if (!ALLOWED_UPLOAD_TYPES.has(upload.mimeType) || Number(upload.sizeBytes || 0) > 20 * 1024 * 1024) {
    return res.status(400).json({ success: false, error: 'Unsupported or oversized upload', requestId: req.requestId });
  }

  return next();
}

export function auditLog(action) {
  return (req, _res, next) => {
    const entry = {
      at: new Date().toISOString(),
      requestId: req.requestId,
      action,
      path: req.originalUrl,
      method: req.method,
      userId: req.auth?.userId || 'anonymous',
      role: req.auth?.role || 'unknown',
      ipHash: crypto.createHash('sha256').update(req.ip || '').digest('hex').slice(0, 16)
    };
    console.info('[audit]', JSON.stringify(entry));
    try {
      db.insert('audit_logs', entry);
    } catch (err) {
      console.error('[audit] DB logging failed:', err);
    }
    next();
  };
}

export function csrfGuard(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (process.env.REQUIRE_CSRF !== 'true') return next();

  const csrfHeader = req.headers['x-csrf-token'];
  const csrfCookie = req.headers['x-csrf-cookie'];

  if (!csrfHeader || csrfHeader !== csrfCookie) {
    return res.status(403).json({ success: false, error: 'CSRF validation failed', requestId: req.requestId });
  }

  return next();
}
