import express from 'express';
import * as cs from '../services/claudeService.js';

const router = express.Router();
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

export default router;
