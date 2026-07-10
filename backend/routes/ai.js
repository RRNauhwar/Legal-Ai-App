import express from 'express';
import rateLimit from 'express-rate-limit';
import * as cs from '../services/claudeService.js';

const router = express.Router();

const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 15, // Limit each IP to 15 requests per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'AI limit reached. Please wait a few minutes before making more AI requests.' }
});

router.use(aiLimiter);

const wrap = fn => async (req, res) => {
  try { res.json({ success: true, ...(await fn(req.body)) }); }
  catch (e) {
    console.error('[AI]', { requestId: req.requestId, message: e.message });
    res.status(e.status || 500).json({
      success: false,
      error: e.status ? e.message : 'AI service failed. Please try again.',
      requestId: req.requestId
    });
  }
};

function assertText(value, label, max = 6000) {
  if (typeof value !== 'string' || !value.trim()) {
    const err = new Error(`${label} is required`);
    err.status = 400;
    throw err;
  }
  if (value.length > max) {
    const err = new Error(`${label} is too long`);
    err.status = 400;
    throw err;
  }
}

function safeArray(value, label, max = 20) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > max) {
    const err = new Error(`${label} must be an array with at most ${max} items`);
    err.status = 400;
    throw err;
  }
  return value;
}

function safeEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

router.post('/generate-case', wrap(async ({caseType='criminal',difficulty='intermediate'}) => ({
  case: await cs.generateCase(
    safeEnum(caseType, ['criminal', 'civil', 'constitutional', 'family', 'cyber'], 'criminal'),
    safeEnum(difficulty, ['beginner', 'intermediate', 'advanced'], 'intermediate')
  )
})));

router.post('/judge-respond', wrap(async ({history=[],argument,language='en'}) => {
  assertText(argument, 'Argument');
  return { response: await cs.judgeRespond(safeArray(history, 'History'), argument, safeEnum(language, ['en', 'hi'], 'en')) };
}));

router.post('/lawyer-respond', wrap(async ({caseTitle,caseSummary,history=[],userArgument,lawyerSide,language='en'}) => {
  assertText(caseTitle, 'Case title', 500);
  assertText(caseSummary, 'Case summary');
  assertText(userArgument, 'User argument');
  return {
    response: await cs.aiLawyerRespond(
      caseTitle,
      caseSummary,
      safeArray(history, 'History'),
      userArgument,
      safeEnum(lawyerSide, ['prosecution', 'defense'], 'defense'),
      safeEnum(language, ['en', 'hi'], 'en')
    )
  };
}));

router.post('/objection', wrap(async ({objectionType,context='',raisedBy='counsel'}) => {
  assertText(objectionType, 'Objection type', 100);
  return cs.handleObjection(objectionType, String(context).slice(0, 6000), String(raisedBy).slice(0, 60));
}));

router.post('/analyze-performance', wrap(async ({sessionData}) => {
  if (!sessionData || typeof sessionData !== 'object') {
    const err = new Error('Session data is required');
    err.status = 400;
    throw err;
  }
  return { analysis: await cs.analyzePerformance(sessionData) };
}));

router.post('/legal-suggestions', wrap(async ({argument,caseSummary=''}) => {
  assertText(argument, 'Argument');
  return { suggestions: await cs.getLegalSuggestions(argument, String(caseSummary).slice(0, 6000)) };
}));

router.post('/witness-answer', wrap(async ({witness,question,history=[]}) => {
  if (!witness || typeof witness !== 'object') {
    const err = new Error('Witness is required');
    err.status = 400;
    throw err;
  }
  assertText(question, 'Question');
  return { answer: await cs.witnessAnswer(witness, question, safeArray(history, 'History')) };
}));

router.post('/evaluate-draft', wrap(async ({documentType,content}) => {
  assertText(documentType, 'Document type', 100);
  assertText(content, 'Draft content', 12000);
  return { evaluation: await cs.evaluateDraft(documentType, content) };
}));

router.post('/deliver-judgment', wrap(async ({caseTitle,prosecutionPoints,defensePoints}) => {
  assertText(caseTitle, 'Case title', 500);
  return {
    judgment: await cs.deliverJudgment(
      caseTitle,
      safeArray(prosecutionPoints, 'Prosecution points'),
      safeArray(defensePoints, 'Defense points')
    )
  };
}));

router.post('/precedents', wrap(async ({context,language='en'}) => {
  assertText(context, 'Context');
  return cs.getPrecedents(context, safeEnum(language, ['en', 'hi'], 'en'));
}));

router.post('/academy/tutor', wrap(async ({question, lessonContext, history}) => {
  assertText(question, 'Question', 2000);
  return { reply: await cs.askBeaksTutor(question, lessonContext, safeArray(history, 'History')) };
}));

router.get('/academy/tutor/stream', async (req, res) => {
  try {
    const { question, lessonContext, historyJson } = req.query;
    
    const parsedCtx = lessonContext ? JSON.parse(lessonContext) : {};
    const parsedHistory = historyJson ? JSON.parse(historyJson) : [];
    
    const replyText = await cs.askBeaksTutor(question, parsedCtx, parsedHistory);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const words = replyText.split(' ');
    let currentIdx = 0;

    const interval = setInterval(() => {
      if (currentIdx < words.length) {
        const chunk = words[currentIdx] + (currentIdx === words.length - 1 ? '' : ' ');
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        currentIdx++;
      } else {
        res.write('data: [DONE]\n\n');
        clearInterval(interval);
        res.end();
      }
    }, 45);

    req.on('close', () => {
      clearInterval(interval);
    });

  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
    res.end();
  }
});

export default router;
