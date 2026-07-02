// ─── OFFLINE ENGINE ───────────────────────────────────────────────────────────
// Full courtroom logic that works WITHOUT any AI or backend connection.
// Used when: (a) no API key, (b) backend unreachable, (c) user chooses offline mode

// Pre-scripted judge responses keyed by trigger keywords
const JUDGE_RESPONSES = {
  objection: [
    "Order! The objection will be considered. Counsel, please rephrase your argument and ensure it is grounded in admissible evidence.",
    "The Court notes the objection. Proceed, but be mindful of the rules of evidence under the Indian Evidence Act.",
    "Noted. The opposing counsel will have an opportunity to respond. Proceed."
  ],
  sustained: [
    "Objection SUSTAINED. Counsel will refrain from such lines of questioning. The jury — if any — is directed to disregard that statement.",
    "Objection SUSTAINED. The argument as framed is leading and speculative. Please rephrase.",
    "Objection SUSTAINED. That line of argument is not supported by the evidence on record."
  ],
  overruled: [
    "Objection OVERRULED. The argument falls within permissible bounds. Proceed.",
    "Objection OVERRULED. Under Section 5 of the Indian Evidence Act, this line of argument is relevant to the facts in issue.",
    "Objection OVERRULED. Counsel may continue."
  ],
  opening: [
    "This Court is now in session. Both counsels are reminded that all proceedings must follow the Code of Criminal Procedure. Prosecution, you may begin with your opening statement.",
    "Order! The matter before this Court today involves serious charges. I expect both sides to maintain decorum and present their arguments with precision. Prosecution, proceed.",
    "Court is called to order. Before we begin, I remind all parties that under Section 313 CrPC, the accused will be given an opportunity to explain circumstances. Prosecution, your opening statement."
  ],
  prosecution: [
    "The Court has heard the prosecution's argument. Defense, do you wish to respond?",
    "Noted. The Court observes that the prosecution has cited relevant statutory provisions. Defense counsel, your response?",
    "The prosecution's point is well-taken. However, the Court will require corroborating evidence before drawing any conclusions. Defense, proceed."
  ],
  defense: [
    "The Court acknowledges the defense's submission. It is the fundamental principle of criminal law that the prosecution must prove guilt beyond reasonable doubt.",
    "The defense raises a valid point regarding the burden of proof. Prosecution, kindly address this.",
    "Noted. The principle of benefit of doubt as established in Kali Ram v. State of Himachal Pradesh (1973) shall be kept in mind."
  ],
  evidence: [
    "The document is taken on record as Exhibit. Both parties may examine and cross-examine regarding this evidence.",
    "The Court admits this piece of evidence. Counsel for the opposite side may raise any objection to its admissibility under the Evidence Act.",
    "Noted. The admissibility of this evidence shall be assessed under Sections 24-27 of the Indian Evidence Act."
  ],
  closing: [
    "The Court has heard arguments from both sides at length. We will now proceed to deliver the judgment after due deliberation.",
    "Both counsels have concluded their arguments. The Court thanks them for their thorough presentation. Judgment shall be pronounced shortly.",
    "The Court is satisfied that sufficient arguments have been heard. We will retire for deliberation."
  ],
  default: [
    "The Court has noted your submission. Proceed.",
    "Counsel, ensure your argument is supported by evidence on record. Continue.",
    "The Court is listening. Kindly cite relevant provisions of law to strengthen your argument.",
    "Noted. Under the principle of audi alteram partem, the opposite counsel will be given equal opportunity to respond."
  ]
};

// Offline lawyer responses — pre-scripted rebuttals by case type
const LAWYER_RESPONSES = {
  criminal: {
    prosecution: [
      "My Lord, the forensic evidence is incontrovertible. The defence's attempts to cast doubt cannot override the scientific findings placed before this Court.",
      "The prosecution respectfully submits that the evidence, read cumulatively, establishes the guilt of the accused beyond reasonable doubt as required under settled law.",
      "My Lord, as held in Sharad Birdhichand Sarda v. State of Maharashtra (1984), circumstantial evidence must be consistent only with the guilt of the accused — and that standard is met here.",
      "We rely on the chain of custody for the exhibits. Each piece of evidence corroborates the other, creating an unbroken chain pointing to the accused."
    ],
    defense: [
      "My Lord, the prosecution has failed to discharge its burden. As affirmed in Woolmington v. DPP and followed in Indian courts, the golden thread of criminal law is that the prosecution must prove guilt — not the defence disprove it.",
      "The sole eyewitness testimony is riddled with inconsistencies. The Supreme Court in Vadivelu Thevar v. State of Madras laid down that uncorroborated testimony must be treated with extreme caution.",
      "My Lord, the defence submits that the accused is entitled to the benefit of doubt. The evidence presented is circumstantial and fails to exclude every hypothesis of innocence.",
      "The forensic evidence at best creates a suspicion. And as this Court knows, suspicion, however strong, cannot be a substitute for proof beyond reasonable doubt."
    ]
  },
  constitutional: {
    prosecution: [
      "My Lord, Article 19(6) expressly permits the State to impose reasonable restrictions in the interest of the general public. The impugned notification squarely falls within this domain.",
      "The doctrine of proportionality, while important, must yield to pressing public interest concerns. The State's action is backed by documented expert evidence.",
      "My Lord, this Court in S.R. Bommai v. Union of India affirmed that judicial review of policy decisions must be limited. The State's regulatory competence cannot be second-guessed.",
      "The respondents respectfully submit that heritage conservation is a compelling State interest that justifies temporary restrictions on commercial activity."
    ],
    defense: [
      "My Lord, a circular lacking statutory backing cannot abridge a fundamental right. The rule of law demands that curtailment of liberty follow prescribed legal procedure.",
      "The impugned notification is a textbook case of excessive delegation and arbitrary exercise of power — both prohibited under Articles 14 and 19.",
      "My Lord, we rely on the doctrine of proportionality as articulated in Modern Dental College v. State of Madhya Pradesh. The restriction must be the least restrictive means available.",
      "The petitioner was given no opportunity to be heard before the ban was imposed. This violates the fundamental principles of natural justice — audi alteram partem."
    ]
  },
  civil: {
    prosecution: [
      "My Lord, the contract expressly provides that time was of the essence. The defendant's failure to perform on the stipulated date is a clear breach under Section 55 of the Indian Contract Act.",
      "The plaintiff's damages are not speculative — they are documented and directly caused by the defendant's admitted breach. Section 73 entitles the plaintiff to full compensation.",
      "The defendant has offered no credible evidence that the force majeure clause was validly invoked. The obligation was not discharged as required by law.",
      "My Lord, the defendant's own communication admits the delay. This is an admission under Section 17 of the Indian Evidence Act and cannot now be retracted."
    ],
    defense: [
      "My Lord, the force majeure clause is broad enough to cover the flooding event. An obligation cannot subsist when performance becomes impossible through no fault of the party.",
      "Under Section 73 of the Contract Act, the plaintiff had a duty to mitigate. Their failure to source goods from alternate suppliers breaks the chain of causation.",
      "The damages claimed are grossly exaggerated and not the proximate result of the alleged breach. Under Hadley v. Baxendale — as followed in Indian courts — only direct and natural losses are recoverable.",
      "My Lord, the defendant acted in good faith and communicated the delay promptly. There is no evidence of malafide intent, which goes to the quantum of damages."
    ]
  },
  family: {
    prosecution: [
      "My Lord, the cruelty inflicted upon my client — both physical and mental — is well-documented and satisfies every ingredient of Section 498A IPC.",
      "The respondent's conduct over the past eighteen months constitutes a sustained pattern of harassment that cannot be dismissed as ordinary matrimonial discord.",
      "The medical evidence placed before this Court speaks for itself. These injuries did not arise from any accident — they were deliberately inflicted.",
      "My Lord, the demand for dowry within months of marriage is clearly established by the digital evidence — messages that have been properly authenticated under Section 65B of the Evidence Act."
    ],
    defense: [
      "My Lord, Section 498A has been widely acknowledged, including by the Supreme Court in Arnesh Kumar v. State of Bihar, to be prone to misuse in matrimonial disputes.",
      "The defence submits that the complaint is a counterblast to legitimate matrimonial proceedings initiated by my client. The timing speaks volumes.",
      "My Lord, the medical evidence does not establish that the injuries were caused by the accused. The prosecution has not excluded other plausible explanations.",
      "There is no independent corroboration. The complaint rests entirely on the interested testimony of the complainant, which must be treated with caution."
    ]
  }
};

// Offline judgments by case type and outcome
const OFFLINE_JUDGMENTS = {
  criminal: `IN THE SESSIONS COURT
JUDGMENT

Having heard both sides at length, this Court now delivers its judgment.

BRIEF FACTS: The prosecution alleges that the accused committed the offence charged. The defence disputes the charge on grounds of misidentification and insufficient evidence.

ISSUES FRAMED:
1. Whether the prosecution has established the guilt of the accused beyond reasonable doubt.
2. Whether the evidence on record is sufficient to sustain a conviction.

ANALYSIS: The prosecution has relied primarily on forensic evidence and eyewitness testimony. The Court notes that the standard in criminal proceedings is proof beyond reasonable doubt, as established in Woolmington v. DPP and consistently followed by Indian courts.

The eyewitness account, while relevant, must be corroborated. As held in Vadivelu Thevar v. State of Madras, uncorroborated testimony of a single witness must be treated with caution, particularly where the witness's credibility is assailed.

ORDER: Having considered all evidence, this Court finds the prosecution has not conclusively discharged its burden. The accused is ACQUITTED and ordered released forthwith. The prosecution may prefer an appeal if aggrieved.

                                                            JUDGE`,

  constitutional: `IN THE HIGH COURT
JUDGMENT

BRIEF FACTS: The petitioner has challenged the impugned notification/circular on the grounds that it violates fundamental rights guaranteed under Part III of the Constitution of India.

ISSUES FRAMED:
1. Whether the impugned action is violative of Article 19(1)(g) of the Constitution.
2. Whether the restriction imposed is reasonable within the meaning of Article 19(6).
3. Whether the action is backed by valid statutory authority.

ANALYSIS: This Court is guided by the principle that fundamental rights are not absolute and may be restricted by the State under Article 19(6) — but only by law and only to the extent that such restriction is proportionate and reasonable. The doctrine of proportionality requires the State to adopt the least restrictive means.

This Court finds that while the State's objective is valid, the blanket nature of the impugned action without adequate statutory backing and without following principles of natural justice renders it unsustainable.

ORDER: Writ ALLOWED. The impugned notification is quashed. The respondents are directed to re-examine the matter and, if necessary, take appropriate action through proper legislative or statutory channels within 12 weeks.

                                                            JUDGE`,

  civil: `IN THE COMMERCIAL COURT
JUDGMENT AND DECREE

BRIEF FACTS: The plaintiff filed this suit for recovery of damages arising from alleged breach of contract by the defendant.

ISSUES FRAMED:
1. Whether the defendant committed breach of contract.
2. Whether force majeure is applicable.
3. What is the quantum of damages, if any?

ANALYSIS: It is settled law that where time is declared to be of the essence of the contract under Section 55 of the Indian Contract Act, failure to perform within the stipulated time amounts to a breach. The defendant's own communication acknowledges delay.

On force majeure: The Court finds that while the weather event was genuine, an alternate route was available. A party cannot invoke force majeure if performance was possible through reasonable diligence.

On mitigation: The plaintiff bears a duty to mitigate under Section 73. The Court reduces damages accordingly.

ORDER: Decree in favour of the plaintiff for a reduced amount, taking into account the plaintiff's partial failure to mitigate. Interest at 9% per annum from the date of suit. Costs to follow the event.

                                                            JUDGE`
};

// ─── Engine Functions ──────────────────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function detectKeyword(text) {
  const t = text.toLowerCase();
  if (t.includes('objection'))                    return 'objection';
  if (t.includes('evidence') || t.includes('exhibit')) return 'evidence';
  if (t.includes('section') || t.includes('article') || t.includes('ipc') || t.includes('crpc')) return 'prosecution';
  if (t.includes('doubt') || t.includes('innocent') || t.includes('acquit')) return 'defense';
  return 'default';
}

export function offlineJudgeRespond(history, argument, isOpening = false) {
  if (isOpening) return pick(JUDGE_RESPONSES.opening);
  const key = detectKeyword(argument);
  return pick(JUDGE_RESPONSES[key] || JUDGE_RESPONSES.default);
}

export function offlineLawyerRespond(caseType, lawyerSide) {
  const cType = LAWYER_RESPONSES[caseType] ? caseType : 'criminal';
  const side  = lawyerSide === 'prosecution' ? 'prosecution' : 'defense';
  return pick(LAWYER_RESPONSES[cType][side]);
}

export function offlineObjectionRuling(objectionType) {
  // Simple rules: leading, hearsay, speculation → usually sustained; relevance → sometimes overruled
  const t = objectionType.toLowerCase();
  const sustainedTypes = ['hearsay', 'leading', 'speculation', 'badgering', 'compound'];
  const shouldSustain = sustainedTypes.some(s => t.includes(s));
  const ruling = shouldSustain ? pick(JUDGE_RESPONSES.sustained) : pick(JUDGE_RESPONSES.overruled);
  return { ruling, sustained: shouldSustain };
}

export function offlinePerformanceAnalysis(sessionData) {
  const argCount  = sessionData.arguments?.length || 0;
  const objCount  = sessionData.objections?.length || 0;
  const duration  = sessionData.duration || 5;
  const hasSections = sessionData.arguments?.some(a => /section|ipc|crpc|article|act/i.test(a));

  const argScore   = Math.min(100, 40 + argCount * 8);
  const legalScore = hasSections ? Math.min(100, 65 + argCount * 4) : Math.max(30, 40 + argCount * 3);
  const secScore   = hasSections ? 75 : 35;
  const objScore   = Math.min(100, 50 + objCount * 10);
  const logicScore = Math.min(100, 55 + argCount * 5);
  const overall    = Math.round((argScore + legalScore + secScore + objScore + logicScore) / 5);

  const badges = ['Apprentice Advocate', 'Sharp Thinker', 'Legal Eagle', 'Master of Objections', 'Best Advocate'];
  const badge  = overall >= 85 ? badges[4] : overall >= 75 ? badges[1] : overall >= 65 ? badges[2] : badges[0];

  return {
    overallScore: overall,
    breakdown: {
      argumentStrength:  { score: argScore,   feedback: argCount < 2 ? 'Make more arguments — quantity and quality both matter in court.' : 'Good number of arguments. Focus on citing specific provisions next time.' },
      legalKnowledge:    { score: legalScore,  feedback: hasSections ? 'Good use of legal sections. Try citing landmark judgments for stronger impact.' : 'Cite specific sections (e.g. "Under Section 302 IPC") to strengthen your arguments.' },
      sectionCitation:   { score: secScore,    feedback: hasSections ? 'You cited legal provisions — excellent habit.' : 'Always cite the specific IPC/CrPC section or constitutional article relevant to your point.' },
      objectionHandling: { score: objScore,    feedback: objCount === 0 ? 'You did not raise any objections. Practice recognising hearsay, leading questions, and speculation.' : `You raised ${objCount} objection(s). Good awareness of courtroom procedure.` },
      logicalReasoning:  { score: logicScore,  feedback: 'Structure your arguments: Facts → Law → Application → Conclusion. This IRAC method is highly effective.' }
    },
    strengths:  argCount >= 2 ? ['Engaged actively in proceedings', hasSections ? 'Used statutory references' : 'Maintained courtroom decorum'] : ['Participated in the simulation', 'Maintained basic structure'],
    weaknesses: [
      !hasSections ? 'Did not cite specific legal sections' : 'Could cite more landmark judgments',
      objCount === 0 ? 'Did not raise any objections' : 'Could challenge evidence more aggressively'
    ],
    suggestions: [
      'Use the IRAC method: Issue → Rule → Application → Conclusion',
      'Every argument should cite at least one IPC/CrPC section or constitutional article',
      hasSections ? 'Back your sections with Supreme Court precedents for maximum impact' : 'Study IPC Sections 299-304 (homicide), 498A (cruelty), and Article 21 (life & liberty) as starting points',
      'Time your arguments — real courts give limited time per counsel'
    ],
    badge,
    nextCaseRecommendation: overall >= 75
      ? 'Move to an advanced constitutional case to test your higher-order legal reasoning skills.'
      : 'Practice with beginner criminal cases to build comfort with IPC sections before moving up.'
  };
}

export function offlineDeliverJudgment(caseType) {
  return OFFLINE_JUDGMENTS[caseType] || OFFLINE_JUDGMENTS.criminal;
}

export function offlineWitnessAnswer(witness, question) {
  const q = question.toLowerCase();
  const isYesNo = q.includes('did you') || q.includes('were you') || q.includes('have you') || q.includes('do you');
  const isChallenging = q.includes('contradict') || q.includes('lie') || q.includes('wrong') || q.includes('really');

  if (isChallenging) {
    const evasive = [
      `I... I am telling the truth, sir. I saw what I saw. Perhaps you are misunderstanding my earlier statement.`,
      `My Lord, I resent the implication. I am a witness on oath and I have stated the facts as I know them.`,
      `That is not what I said. I said — and I repeat — ${witness.testimony}`
    ];
    return pick(evasive);
  }

  if (isYesNo) {
    const contains_negative = witness.backstory.toLowerCase().includes('not') || witness.backstory.toLowerCase().includes('false');
    return contains_negative
      ? `Hmm... yes, broadly speaking. Though I would add that the circumstances were not entirely clear at the time.`
      : `Yes, that is correct. ${witness.testimony}`;
  }

  return `My testimony stands as stated. ${witness.testimony} I have nothing further to add at this time.`;
}
