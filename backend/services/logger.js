const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  AUDIT: 'AUDIT'
};

function log(level, message, meta = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  };

  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(logEntry));
  } else {
    const color = 
      level === 'ERROR' ? '\x1b[31m' : 
      level === 'WARN' ? '\x1b[33m' : 
      level === 'AUDIT' ? '\x1b[36m' : 
      '\x1b[32m';
    const reset = '\x1b[0m';
    
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = ' ' + JSON.stringify(meta);
    }
    console.log(`[${logEntry.timestamp}] ${color}${level}${reset}: ${message}${metaStr}`);
  }
}

export const logger = {
  info: (msg, meta) => log(LOG_LEVELS.INFO, msg, meta),
  warn: (msg, meta) => log(LOG_LEVELS.WARN, msg, meta),
  error: (msg, meta) => log(LOG_LEVELS.ERROR, msg, meta),
  audit: (msg, meta) => log(LOG_LEVELS.AUDIT, msg, meta)
};

export default logger;
