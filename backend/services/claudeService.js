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
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const sanitized = match[0].replace(/,\s*([\]}])/g, '$1');
        return JSON.parse(sanitized);
      }
    } catch {
      // Fall through to throw
    }
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
    const errMsg = data?.error?.message || `OpenAI request failed (HTTP ${response.status})`;
    console.error('[OpenAI Error]', errMsg);
    throw new Error(errMsg);
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

function createProceduralCase(caseType = 'criminal', difficulty = 'intermediate') {
  const caseId = `gen-${Date.now()}`;
  const templates = {
    criminal: {
      title: 'State of Maharashtra vs. Sandeep Varma',
      caseNumber: `CRL. No. ${Math.floor(100 + Math.random() * 900)}/2025`,
      court: 'Sessions Court at Greater Bombay',
      summary: 'The accused is charged with culpable homicide not amounting to murder following a violent altercation at a commercial warehouse over disputed consignments.',
      chargesOrClaims: ['S.304 IPC — Culpable Homicide not amounting to murder', 'S.506 IPC — Criminal Intimidation'],
      relevantSections: [
        { section: 'S.304 Part II IPC', description: 'Act done with knowledge that it is likely to cause death, without intention to cause death' },
        { section: 'S.34 IPC', description: 'Acts done by several persons in furtherance of common intention' },
        { section: 'S.32(1) Evidence Act', description: 'Statements written or verbal of relevant facts by person who is dead (dying declaration)' }
      ],
      prosecutionArguments: [
        'Eyewitness testimony places the accused wielding an iron lever during the altercation',
        'Post-mortem findings indicate fatal blunt force trauma to the parietal region',
        'Accused fled the premises immediately and was apprehended 48 hours later without plausible explanation'
      ],
      defenseArguments: [
        'The altercation was initiated by the deceased; the accused acted strictly in private defense under Section 96-106 IPC',
        'No blood or fingerprints matching the deceased were recovered from the lever attributed to the accused',
        'Dying declaration suffers from inconsistencies and lack of medical fitness certification at the time of recording'
      ],
      evidence: [
        { id: 'E1', type: 'Forensic', description: 'Post-mortem examination report indicating cranial fracture', side: 'prosecution' },
        { id: 'E2', type: 'Physical', description: 'Iron lever seized from warehouse floor', side: 'prosecution' },
        { id: 'E3', type: 'Medical', description: 'Outpatient injury sheet of accused showing defensive wounds on forearms', side: 'defense' }
      ],
      witnesses: [
        { id: 'W1', name: 'Inspector Sunil Shinde', role: 'Investigating Officer', testimony: 'I recovered the weapon on the basis of the disclosure statement and sealed the scene.', backstory: 'Experienced officer of the crime branch.' },
        { id: 'W2', name: 'Dr. Radhika Nair', role: 'Forensic Medical Examiner', testimony: 'The head injury was sufficient in the ordinary course of nature to cause death, but defensive wounds on the accused are consistent with mutual combat.', backstory: 'Head of Forensic Pathology, KEM Hospital.' }
      ],
      keyLegalIssues: [
        'Whether the act of the accused is protected under the Right of Private Defense',
        'Whether the offense falls under Section 304 Part I or Part II IPC in the absence of premeditation'
      ],
      suggestedVerdict: 'Conviction under Section 304 Part II with reduced sentencing given sudden provocation',
      learningObjectives: [
        'Distinguishing between Murder (S.300) and Culpable Homicide (S.304)',
        'Applying the principles of Right of Private Defense of Body',
        'Evaluating corroborative medical evidence versus oral witness testimony'
      ]
    },
    civil: {
      title: 'Apex Infrastructure Ltd. vs. Urban Realty Consortium',
      caseNumber: `COM. OS. No. ${Math.floor(100 + Math.random() * 900)}/2025`,
      court: 'Commercial Court, High Court of Delhi',
      summary: 'Commercial dispute concerning breach of a turnkey construction agreement and invocation of an unconditional bank guarantee.',
      chargesOrClaims: ['Specific Performance of Contract under S.10 Specific Relief Act', 'Permanent Injunction against invocation of Bank Guarantee'],
      relevantSections: [
        { section: 'S.73 Indian Contract Act', description: 'Compensation for loss or damage caused by breach of contract' },
        { section: 'S.14 Specific Relief Act', description: 'Contracts not specifically enforceable' }
      ],
      prosecutionArguments: [
        'Defendant defaulted on milestone payments despite 80% project completion certified by independent engineers',
        'Fraudulent invocation of bank guarantee causing irreparable financial injury'
      ],
      defenseArguments: [
        'Project was delayed by 14 months beyond the agreed long-stop date without force majeure justification',
        'Bank guarantee is independent of the underlying contract per established Supreme Court jurisprudence'
      ],
      evidence: [
        { id: 'E1', type: 'Documentary', description: 'Turnkey Master Service Agreement and milestone sign-off sheets', side: 'prosecution' },
        { id: 'E2', type: 'Financial', description: 'Bank Guarantee letter and invocation notice', side: 'defense' }
      ],
      witnesses: [
        { id: 'W1', name: 'Arun Mehra', role: 'Chief Project Engineer', testimony: 'All material milestone certifications were submitted on schedule without objection.', backstory: 'Chartered civil engineer with 20 years experience.' }
      ],
      keyLegalIssues: [
        'Whether encashment of an unconditional bank guarantee can be restrained in the absence of egregious fraud',
        'Assessment of liquidated damages under Section 74 of the Contract Act'
      ],
      suggestedVerdict: 'Injunction refused regarding bank guarantee; matter referred to expedited arbitration for quantum of damages',
      learningObjectives: [
        'Law on restraining bank guarantees in commercial contracts',
        'Principles governing liquidated damages versus penalty clauses'
      ]
    },
    constitutional: {
      title: 'Citizens for Digital Liberty vs. Union of India',
      caseNumber: `W.P.(C) No. ${Math.floor(100 + Math.random() * 900)}/2025`,
      court: 'Supreme Court of India',
      summary: 'Writ petition under Article 32 challenging executive surveillance regulations and telecom interception guidelines on grounds of privacy and fundamental rights.',
      chargesOrClaims: ['Violation of Article 19(1)(a) — Freedom of Speech', 'Violation of Article 21 — Right to Privacy and Personal Liberty'],
      relevantSections: [
        { section: 'Article 21 Constitution of India', description: 'Protection of life and personal liberty as interpreted in Puttaswamy' },
        { section: 'Article 19(2) Constitution of India', description: 'Reasonable restrictions on freedom of speech and expression' }
      ],
      prosecutionArguments: [
        'Surveillance protocols lack judicial oversight and procedural safeguards mandated by Puttaswamy',
        'Delegation of blanket interception power to administrative authorities fails the proportionality test'
      ],
      defenseArguments: [
        'Interception guidelines are strictly confined to national security and sovereignty grounds under Section 5(2) Telegraph Act',
        'Adequate oversight exists via the Cabinet Secretary Review Committee'
      ],
      evidence: [
        { id: 'E1', type: 'Statutory', description: 'Gazette notification authorizing automated telecom keyword surveillance', side: 'prosecution' }
      ],
      witnesses: [
        { id: 'W1', name: 'Dr. Ananya Rao', role: 'Cyber Policy Scholar', testimony: 'Bulk surveillance without individualized warranting causes a chilling effect on journalistic and civic speech.', backstory: 'Independent privacy researcher.' }
      ],
      keyLegalIssues: [
        'Whether executive review meets the constitutional standard of judicial oversight for privacy intrusion',
        'Application of the 4-prong Proportionality Test'
      ],
      suggestedVerdict: 'Regulations struck down in part; mandatory judicial warrant mechanism ordered within 6 months',
      learningObjectives: [
        'Application of the Puttaswamy proportionality test',
        'Standards for reasonable restrictions under Article 19(2)'
      ]
    },
    family: {
      title: 'Pooja Sharma vs. Kunal Sharma',
      caseNumber: `MAT. APP. No. ${Math.floor(100 + Math.random() * 900)}/2025`,
      court: 'Family Court, Bengaluru',
      summary: 'Custody battle and maintenance claim under Section 125 CrPC and Hindu Marriage Act involving allegations of desertion and economic distress.',
      chargesOrClaims: ['Section 13(1)(ia) HMA — Dissolution of Marriage on ground of cruelty', 'Section 125 CrPC — Maintenance for wife and minor child'],
      relevantSections: [
        { section: 'Section 13(1)(ia) HMA', description: 'Cruelty as a ground for divorce' },
        { section: 'Section 24 HMA', description: 'Maintenance pendente lite and expenses of proceedings' }
      ],
      prosecutionArguments: [
        'Husband deliberately concealed actual financial assets and offshore business income to depress maintenance',
        'Welfare of the 6-year-old child demands primary custody remain with the mother'
      ],
      defenseArguments: [
        'Petitioner voluntarily deserted the matrimonial home without reasonable cause',
        'Respondent offers complete financial support for schooling provided shared joint custody is granted'
      ],
      evidence: [
        { id: 'E1', type: 'Financial', description: 'Income tax returns and audited balance sheet of husband firm', side: 'prosecution' }
      ],
      witnesses: [
        { id: 'W1', name: 'Sunita Sharma', role: 'Paternal Grandmother', testimony: 'The father has always participated actively in child upbringing and has a stable home environment.', backstory: 'Retired educator.' }
      ],
      keyLegalIssues: [
        'Paramountcy of the welfare of the child principle over statutory custody rights',
        'Standard of proof for mental cruelty in matrimonial proceedings'
      ],
      suggestedVerdict: 'Divorce granted; interim maintenance awarded at ₹65,000/month; joint visitation rights structured',
      learningObjectives: [
        'Welfare of the child doctrine in custody battles',
        'Guidelines for maintenance computation per Rajnesh v. Neha (2020)'
      ]
    },
    cyber: {
      title: 'State (Cyber Cell) vs. Nitin Grover',
      caseNumber: `CYBER CC No. ${Math.floor(100 + Math.random() * 900)}/2025`,
      court: 'Chief Metropolitan Magistrate Court, Cyber Division, Cyberabad',
      summary: 'The accused is prosecuted for unauthorized database intrusion, data exfiltration, and extortion targeting an online financial portal.',
      chargesOrClaims: ['Section 43/66 IT Act — Computer-related offenses and hacking', 'Section 66C IT Act — Identity Theft', 'Section 384 IPC — Extortion'],
      relevantSections: [
        { section: 'Section 66 IT Act', description: 'Hacking with computer system' },
        { section: 'Section 65B Evidence Act', description: 'Admissibility of electronic records and mandatory certification' }
      ],
      prosecutionArguments: [
        'IP logs and MAC address traces from the VPN gateway resolve directly to the accused residence router',
        'Extortion emails demanding cryptocurrency contain cryptographic wallet addresses linked to the accused local bank'
      ],
      defenseArguments: [
        'The residential router was open and compromised by third-party malware; the accused had no technical culpability',
        'The Section 65B certificate is defective as the forensic imaging officer failed to maintain continuous hash integrity'
      ],
      evidence: [
        { id: 'E1', type: 'Digital', description: 'Forensic bit-stream clone of server access logs with SHA-256 hash', side: 'prosecution' },
        { id: 'E2', type: 'Forensic', description: 'Independent CERT-In audit report noting open network vulnerabilities', side: 'defense' }
      ],
      witnesses: [
        { id: 'W1', name: 'Deepak Saxena', role: 'Cyber Forensic Examiner', testimony: 'I extracted the forensic disk image and verified the hash matches the seizure memo.', backstory: 'Senior Analyst at State Cyber Forensic Lab.' }
      ],
      keyLegalIssues: [
        'Strict compliance with Section 65B Evidence Act per Arjun Panditrao (2020)',
        'Circumstantial evidence based purely on IP allocation in residential networks'
      ],
      suggestedVerdict: 'Acquitted of Section 384 IPC for lack of direct extortion nexus; convicted under Section 43/66 IT Act with fine',
      learningObjectives: [
        'Section 65B Evidence Act electronic certificate essentials',
        'Standards for electronic chain of custody and hash verification'
      ]
    }
  };

  const selected = templates[caseType] || templates.criminal;
  return {
    ...selected,
    id: caseId,
    caseType,
    difficulty
  };
}

export async function generateCase(caseType = 'criminal', difficulty = 'intermediate') {
  try {
    const text = await ask(
      'You are an Indian law case designer. Return ONLY valid JSON, no markdown, no extra text.',
      `Generate a ${difficulty} Indian ${caseType} law case. Return ONLY this JSON:
{"id":"gen-${Date.now()}","title":"string","caseType":"${caseType}","difficulty":"${difficulty}","caseNumber":"CRL/CIV No.XX/2025","court":"string","summary":"2-3 sentences","chargesOrClaims":["string"],"relevantSections":[{"section":"S.302 IPC","description":"string"}],"prosecutionArguments":["string","string","string"],"defenseArguments":["string","string","string"],"evidence":[{"id":"E1","type":"Forensic","description":"string","side":"prosecution"}],"witnesses":[{"id":"W1","name":"string","role":"string","testimony":"string","backstory":"string"}],"keyLegalIssues":["string"],"suggestedVerdict":"string","learningObjectives":["string"]}`,
      2500
    );
    const parsed = safeJSON(text);
    if (!parsed.id) parsed.id = `gen-${Date.now()}`;
    if (!parsed.caseType) parsed.caseType = caseType;
    if (!parsed.difficulty) parsed.difficulty = difficulty;
    return parsed;
  } catch (err) {
    console.warn('[AI] Case generation LLM error, using rich procedural Indian law case:', err.message);
    return createProceduralCase(caseType, difficulty);
  }
}

export async function judgeRespond(history, argument, language = 'en') {
  const ctx = history.slice(-4).map((m) => `${m.role}: ${m.content}`).join('\n');
  const langReq = language === 'hi' ? ' You MUST respond in Hindi (Devanagari script).' : '';
  return ask(
    `You are an Indian High Court Judge. Be formal, cite IPC, CrPC, Evidence Act, or constitutional provisions when relevant, and keep to 2-3 sentences.${langReq}`,
    ctx ? `Recent:\n${ctx}\n\nRespond to: "${argument}"` : `Respond to argument: "${argument}"`,
    350
  );
}

export async function aiLawyerRespond(caseTitle, summary, history, userArg, side, language = 'en') {
  const ctx = history.slice(-4).map((m) => `${m.role}: ${m.content}`).join('\n');
  const langReq = language === 'hi' ? ' You MUST respond entirely in Hindi (Devanagari script).' : '';
  return ask(
    `You are a sharp Indian ${side} lawyer in case: ${caseTitle} (${summary}). Cite relevant legal provisions. Keep it to 3-4 concise sentences.${langReq}`,
    `${ctx ? `Recent:\n${ctx}\n\n` : ''}Opposition said: "${userArg}"\nYour counter-argument:`,
    400
  );
}

export async function handleObjection(type, context, by) {
  const ruling = await ask(
    'You are an Indian court judge. Start with exactly "Objection SUSTAINED" or "Objection OVERRULED". Give one short legal reason citing the Evidence Act or CrPC when relevant.',
    `${by} raises: "${type}". Context: ${context}`,
    150
  );
  return { ruling, sustained: /SUSTAINED/i.test(ruling) };
}

export async function analyzePerformance(d) {
  const text = await ask(
    'You are a legal education expert. Return ONLY valid JSON, no markdown.',
    `Evaluate: Role:${d.role}, Case:${d.caseType}, Args:${(d.arguments || []).slice(0, 3).join('|')}, Objections:${(d.objections || []).length}, Duration:${d.duration}min.
Return ONLY JSON: {"overallScore":75,"breakdown":{"argumentStrength":{"score":70,"feedback":"text"},"legalKnowledge":{"score":80,"feedback":"text"},"sectionCitation":{"score":65,"feedback":"text"},"objectionHandling":{"score":75,"feedback":"text"},"logicalReasoning":{"score":80,"feedback":"text"}},"strengths":["S1","S2"],"weaknesses":["W1","W2"],"suggestions":["T1","T2"],"badge":"Sharp Thinker","nextCaseRecommendation":"text"}`,
    1200
  );
  return safeJSON(text);
}

export async function getLegalSuggestions(argument, summary) {
  return ask(
    'You are a real-time Indian legal assistant. Give 4-5 concise bullet points with relevant sections, useful precedents, and strategy tips.',
    `Student argues: "${argument.slice(0, 250)}"\nCase: ${summary}`,
    350
  );
}

export async function witnessAnswer(witness, question, history) {
  const ctx = history.slice(-4).map((m) => `${m.role}: ${m.content}`).join('\n');
  return ask(
    `You are ${witness.name}, ${witness.role} in Indian court. Backstory: ${witness.backstory}. Testimony: "${witness.testimony}". Stay in character, be natural, and never say you are an AI.`,
    `${ctx ? `Previous:\n${ctx}\n\n` : ''}Lawyer: "${question}"`,
    250
  );
}

export async function evaluateDraft(docType, content) {
  const text = await ask(
    'You are an Indian legal drafting expert. Return ONLY valid JSON, no markdown.',
    `Evaluate this ${docType} (first 700 chars):\n---\n${content.slice(0, 700)}\n---\nReturn ONLY JSON: {"score":72,"formatCorrectness":{"score":75,"feedback":"text"},"legalLanguage":{"score":70,"feedback":"text"},"completeness":{"score":72,"feedback":"text"},"corrections":[{"issue":"problem","fix":"solution"}],"suggestions":["T1","T2"],"improvedOpening":"Better opening paragraph"}`,
    1200
  );
  return safeJSON(text);
}

export async function deliverJudgment(title, prosPoints, defPoints) {
  return ask(
    'You are an Indian High Court Judge delivering a formal judgment. Use judicial language, cite relevant provisions, and stay under 350 words.',
    `Case: ${title}\nProsecution: ${prosPoints.slice(0, 3).join('; ')}\nDefense: ${defPoints.slice(0, 3).join('; ')}\n\nDeliver judgment with: 1) Brief Facts 2) Issues Framed 3) Analysis with sections 4) Order`,
    800
  );
}

export async function getPrecedents(context, language = 'en') {
  const langReq = language === 'hi' ? ' Answer in Hindi (Devanagari script).' : '';
  const text = await ask(
    `You are an expert in Indian Case Law. Return ONLY valid JSON, no markdown.${langReq}`,
    `Based on this transcript, provide 3 highly relevant Indian Supreme Court or High Court precedents (mock or real) that one could cite.\n\nContext:\n${context.slice(0, 1000)}\n\nReturn EXACTLY this JSON:\n{"precedents":[{"caseName":"string","year":"string","principle":"string","relevance":"string"}]}`,
    1000
  );
  return safeJSON(text);
}

export async function askBeaksTutor(question, lessonContext, history = []) {
  const ctx = history.slice(-4).map((m) => `${m.role}: ${m.content}`).join('\n');
  return ask(
    `You are Judge Beaks, a patient, legal scholar owl who acts as a personal mentor for law students.
Your tone is academic, warm, and highly engaging. You frequently use owl analogies (e.g., comparing legal concepts to hunting prey at night or holding balance scales with steady claws) and speak with formal clarity.
CRITICAL: NEVER give raw direct answers to exercises or mock cases. Instead:
1. Explain the underlying legal principle in simple terms with an analogy.
2. Ask a guiding, structured question that points the student to the correct logic.
3. Diagnose their confusion and encourage them to try again.`,
    `Lesson Context: ${JSON.stringify(lessonContext)}
${ctx ? `Previous chat:\n${ctx}\n\n` : ''}Student asks: "${question}"`,
    350
  );
}
