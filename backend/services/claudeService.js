import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const OPENAI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const GEMINI_MODEL = process.env.AI_MODEL || 'gemini-2.5-flash';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || process.env.AI_MODEL || 'claude-haiku-4-5-20251001';
const anthropicClient = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

function safeJSON(text) {
  try {
    const cleaned = text.trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    return JSON.parse(cleaned);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('AI returned invalid JSON');
  }
}

async function askViaGemini(system, user) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: system }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: user }]
          }
        ],
        generationConfig: {
          temperature: 0.5,
          topP: 0.9
        }
      })
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Gemini request failed');
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim();

  if (!text) throw new Error('Gemini returned an empty response');
  return text;
}

async function askViaOpenAI(system, user, tokens = 600) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is missing');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      max_tokens: tokens,
      temperature: 0.5
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'OpenAI request failed');
  }

  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('OpenAI returned an empty response');
  return text;
}

async function askViaAnthropic(system, user, tokens = 600) {
  if (!anthropicClient) throw new Error('ANTHROPIC_API_KEY is missing');

  const response = await anthropicClient.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: tokens,
    system,
    messages: [{ role: 'user', content: user }]
  });

  return response.content[0].text;
}

export async function ask(system, user, tokens = 600) {
  if (process.env.OPENAI_API_KEY) return askViaOpenAI(system, user, tokens);
  if (process.env.GEMINI_API_KEY) return askViaGemini(system, user);
  if (process.env.ANTHROPIC_API_KEY) return askViaAnthropic(system, user, tokens);
  throw new Error('No AI provider configured');
}

export async function generateCase(caseType, difficulty) {
  const text = await ask(
    'You are an Indian law case designer. Return ONLY valid JSON, no markdown, no extra text.',
    `Generate a ${difficulty} Indian ${caseType} law case. Return ONLY this JSON:
{"title":"string","caseType":"${caseType}","difficulty":"${difficulty}","caseNumber":"CRL/CIV No.XX/2025","court":"string","summary":"2-3 sentences","chargesOrClaims":["string"],"relevantSections":[{"section":"S.302 IPC","description":"string"}],"prosecutionArguments":["string","string","string"],"defenseArguments":["string","string","string"],"evidence":[{"id":"E1","type":"Forensic","description":"string","side":"prosecution"}],"witnesses":[{"id":"W1","name":"string","role":"string","testimony":"string","backstory":"string"}],"keyLegalIssues":["string"],"suggestedVerdict":"string","learningObjectives":["string"]}`,
    1200
  );
  return safeJSON(text);
}

export async function judgeRespond(history, argument, language = 'en') {
  const ctx = history.slice(-4).map((m) => `${m.role}: ${m.content}`).join('\n');
  const langReq = language === 'hi' ? ' You MUST respond in Hindi (Devanagari script).' : '';
  return ask(
    `You are an Indian High Court Judge. Be formal, cite IPC, CrPC, Evidence Act, or constitutional provisions when relevant, and keep to 2-3 sentences.${langReq}`,
    ctx ? `Recent:\n${ctx}\n\nRespond to: "${argument}"` : `Respond to argument: "${argument}"`,
    250
  );
}

export async function aiLawyerRespond(caseTitle, summary, history, userArg, side, language = 'en') {
  const ctx = history.slice(-4).map((m) => `${m.role}: ${m.content}`).join('\n');
  const langReq = language === 'hi' ? ' You MUST respond entirely in Hindi (Devanagari script).' : '';
  return ask(
    `You are a sharp Indian ${side} lawyer in case: ${caseTitle} (${summary}). Cite relevant legal provisions. Keep it to 3-4 concise sentences.${langReq}`,
    `${ctx ? `Recent:\n${ctx}\n\n` : ''}Opposition said: "${userArg}"\nYour counter-argument:`,
    300
  );
}

export async function handleObjection(type, context, by) {
  const ruling = await ask(
    'You are an Indian court judge. Start with exactly "Objection SUSTAINED" or "Objection OVERRULED". Give one short legal reason citing the Evidence Act or CrPC when relevant.',
    `${by} raises: "${type}". Context: ${context}`,
    100
  );
  return { ruling, sustained: /SUSTAINED/i.test(ruling) };
}

export async function analyzePerformance(d) {
  const text = await ask(
    'You are a legal education expert. Return ONLY valid JSON, no markdown.',
    `Evaluate: Role:${d.role}, Case:${d.caseType}, Args:${(d.arguments || []).slice(0, 3).join('|')}, Objections:${(d.objections || []).length}, Duration:${d.duration}min.
Return ONLY JSON: {"overallScore":75,"breakdown":{"argumentStrength":{"score":70,"feedback":"text"},"legalKnowledge":{"score":80,"feedback":"text"},"sectionCitation":{"score":65,"feedback":"text"},"objectionHandling":{"score":75,"feedback":"text"},"logicalReasoning":{"score":80,"feedback":"text"}},"strengths":["S1","S2"],"weaknesses":["W1","W2"],"suggestions":["T1","T2"],"badge":"Sharp Thinker","nextCaseRecommendation":"text"}`,
    600
  );
  return safeJSON(text);
}

export async function getLegalSuggestions(argument, summary) {
  return ask(
    'You are a real-time Indian legal assistant. Give 4-5 concise bullet points with relevant sections, useful precedents, and strategy tips.',
    `Student argues: "${argument.slice(0, 250)}"\nCase: ${summary}`,
    250
  );
}

export async function witnessAnswer(witness, question, history) {
  const ctx = history.slice(-4).map((m) => `${m.role}: ${m.content}`).join('\n');
  return ask(
    `You are ${witness.name}, ${witness.role} in Indian court. Backstory: ${witness.backstory}. Testimony: "${witness.testimony}". Stay in character, be natural, and never say you are an AI.`,
    `${ctx ? `Previous:\n${ctx}\n\n` : ''}Lawyer: "${question}"`,
    180
  );
}

export async function evaluateDraft(docType, content) {
  const text = await ask(
    'You are an Indian legal drafting expert. Return ONLY valid JSON, no markdown.',
    `Evaluate this ${docType} (first 700 chars):\n---\n${content.slice(0, 700)}\n---\nReturn ONLY JSON: {"score":72,"formatCorrectness":{"score":75,"feedback":"text"},"legalLanguage":{"score":70,"feedback":"text"},"completeness":{"score":72,"feedback":"text"},"corrections":[{"issue":"problem","fix":"solution"}],"suggestions":["T1","T2"],"improvedOpening":"Better opening paragraph"}`,
    600
  );
  return safeJSON(text);
}

export async function deliverJudgment(title, prosPoints, defPoints) {
  return ask(
    'You are an Indian High Court Judge delivering a formal judgment. Use judicial language, cite relevant provisions, and stay under 350 words.',
    `Case: ${title}\nProsecution: ${prosPoints.slice(0, 3).join('; ')}\nDefense: ${defPoints.slice(0, 3).join('; ')}\n\nDeliver judgment with: 1) Brief Facts 2) Issues Framed 3) Analysis with sections 4) Order`,
    500
  );
}

export async function getPrecedents(context, language = 'en') {
  const langReq = language === 'hi' ? ' Answer in Hindi (Devanagari script).' : '';
  const text = await ask(
    `You are an expert in Indian Case Law. Return ONLY valid JSON, no markdown.${langReq}`,
    `Based on this transcript, provide 3 highly relevant Indian Supreme Court or High Court precedents (mock or real) that one could cite.\n\nContext:\n${context.slice(0, 1000)}\n\nReturn EXACTLY this JSON:\n{"precedents":[{"caseName":"string","year":"string","principle":"string","relevance":"string"}]}`
  );
  return safeJSON(text);
}
