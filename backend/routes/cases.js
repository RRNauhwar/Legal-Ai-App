import express from 'express';
import { v4 as uuid } from 'uuid';
import { ROLES } from '../middleware/security.js';
const router = express.Router();
export const store = new Map();

const OFFLINE_CASES = [
  {
    id:'offline-1',title:'State vs Accused — Murder Trial',caseType:'criminal',difficulty:'intermediate',
    caseNumber:'CRL. No. 112/2025',court:'Delhi Sessions Court',
    summary:'Accused allegedly killed neighbour during property dispute. Prosecution relies on forensic evidence and eyewitness testimony. Defense claims misidentification.',
    chargesOrClaims:['S.302 IPC — Murder','S.34 IPC — Common Intention'],
    relevantSections:[{section:'S.300 IPC',description:'Definition of Murder'},{section:'S.302 IPC',description:'Punishment for Murder — death or life imprisonment'},{section:'S.45 Evidence Act',description:'Opinion of experts (forensic)'}],
    prosecutionArguments:['Forensic report confirms blood type on weapon matches victim','Eyewitness placed accused at scene at time of death','Accused had clear motive — disputed property worth ₹40 lakh'],
    defenseArguments:['Eyewitness testimony unreliable — was 40m away in dim light','No DNA match on weapon directly to accused','Accused has verifiable alibi confirmed by multiple witnesses'],
    evidence:[{id:'E1',type:'Forensic',description:'Blood-stained iron rod from accused house',side:'prosecution'},{id:'E2',type:'Documentary',description:'Property dispute court records ₹40 lakh',side:'prosecution'},{id:'E3',type:'Documentary',description:'Attendance register showing accused elsewhere',side:'defense'},{id:'E4',type:'Forensic',description:'DNA report — inconclusive match to accused',side:'defense'}],
    witnesses:[{id:'W1',name:'Eyewitness',role:'Neighbour eyewitness',testimony:'I saw the accused strike the victim at 9 PM near the gate.',backstory:'Was standing 40 metres away in dim light. Has had a prior dispute with accused family.'},{id:'W2',name:'Forensic Expert',role:'Government forensic scientist',testimony:'Blood type on rod matches victim. Injury pattern is consistent with the rod.',backstory:'Credible, no personal interest in case.'},{id:'W3',name:'Alibi Witness',role:'Character witness',testimony:'The accused was with our group at the time of incident.',backstory:'Potential bias. However 15 other witnesses can corroborate independently.'}],
    keyLegalIssues:['Whether identification by sole eyewitness is reliable','Whether forensic evidence alone sustains S.302 conviction'],
    suggestedVerdict:'Acquittal — benefit of reasonable doubt',
    learningObjectives:['Corroboration requirements for eyewitness testimony','Burden of proof beyond reasonable doubt in S.302','Role of forensic evidence vs circumstantial evidence'],
    offlineJudgeResponses:{
      default:"The Court has heard the arguments. Both sides have presented their positions. Counsel must remember that the standard of proof in criminal cases is beyond reasonable doubt. Proceed with your next argument.",
      objection_hearsay:"Objection SUSTAINED. The statement is hearsay and does not fall within any exception under the Indian Evidence Act. It shall not be considered.",
      objection_relevance:"Objection OVERRULED. The argument is relevant to establishing motive under Section 8 of the Indian Evidence Act.",
      objection_leading:"Objection SUSTAINED. Counsel is leading the witness. Please rephrase the question.",
      strong_argument:"The Court notes the argument. Citing specific sections strengthens your case. However, the defense has raised valid points regarding identification that must be addressed.",
      weak_argument:"Counsel must provide more specific legal basis for this submission. Mere assertions without reference to law or evidence are insufficient before this Court.",
      verdict:"IN THE SESSIONS COURT OF DELHI\n\nCase: State vs Accused — CRL. No. 112/2025\n\nJUDGMENT\n\nBRIEF FACTS: The prosecution alleges the accused committed murder under S.302 IPC during a property dispute. Forensic evidence shows blood type matching victim on weapon found at accused residence.\n\nISSUES FRAMED:\n1. Whether the accused committed murder under S.302 IPC?\n2. Whether the forensic and eyewitness evidence is sufficient for conviction?\n\nANALYSIS: The eyewitness was 40 metres away in dim lighting — identification is unreliable per Lallu Manjhi v. State of Jharkhand (2003). DNA report is inconclusive. While forensic evidence creates suspicion, suspicion however strong cannot replace proof beyond reasonable doubt as held in Hanumant v. State of MP (1952).\n\nORDER: Accused is ACQUITTED under S.302 IPC giving benefit of reasonable doubt. Released forthwith if not required in any other case."
    }
  },
  {
    id:'offline-2',title:'Complainant vs Accused — Dowry Harassment',caseType:'criminal',difficulty:'beginner',
    caseNumber:'CRL. No. 78/2025',court:'Mumbai Metropolitan Magistrate Court',
    summary:'Complainant alleges husband and in-laws subjected her to physical and mental cruelty and demanded ₹5 lakh additional dowry six months after marriage.',
    chargesOrClaims:['S.498A IPC — Cruelty by husband/relatives','S.4 Dowry Prohibition Act'],
    relevantSections:[{section:'S.498A IPC',description:'Cruelty by husband or relatives — imprisonment up to 3 years and fine'},{section:'S.113A Evidence Act',description:'Presumption as to abetment of suicide by married woman'},{section:'S.4 Dowry Prohibition Act',description:'Penalty for demanding dowry — 6 months to 2 years'}],
    prosecutionArguments:['Medical records show injuries consistent with physical assault','Three independent neighbours witnessed repeated arguments','Digital messages explicitly demanding ₹5 lakh from in-laws'],
    defenseArguments:['Injuries could result from accident — no direct nexus proven','Messages authenticity disputed — forensic verification pending','Case filed only after complainant left home — motivated by matrimonial dispute'],
    evidence:[{id:'E1',type:'Medical',description:'Certificate showing bruises on arms and face',side:'prosecution'},{id:'E2',type:'Digital',description:'Messages demanding money from in-laws',side:'prosecution'},{id:'E3',type:'Witness',description:'Three neighbour affidavits confirming arguments',side:'prosecution'}],
    witnesses:[{id:'W1',name:'Medical Officer',role:'Government Doctor',testimony:'Injuries are consistent with blunt force trauma, not accidental falls.',backstory:'Neutral government doctor. Fully credible with no personal interest.'},{id:'W2',name:'Neighbour',role:'Independent witness',testimony:'I heard screaming and a woman crying on multiple nights.',backstory:'Honest witness. Was friendly with the family before the incident.'}],
    keyLegalIssues:['Whether post-marriage money demand constitutes dowry under Dowry Prohibition Act','Admissibility of digital messages under S.65B Evidence Act'],
    suggestedVerdict:'Conviction under S.498A IPC — fine and imprisonment',
    learningObjectives:['S.498A IPC essentials and proof requirements','Dowry Prohibition Act applicability','Digital evidence admissibility under S.65B Evidence Act'],
    offlineJudgeResponses:{
      default:"The Court notes the submissions. S.498A cases require establishing both cruelty and dowry demand beyond reasonable doubt. Proceed with your argument.",
      objection_hearsay:"Objection OVERRULED. The statement falls within res gestae exception under S.6 of the Indian Evidence Act.",
      objection_relevance:"Objection SUSTAINED. The argument does not appear relevant to the specific charges under S.498A IPC.",
      strong_argument:"The Court notes the strength of this submission. Medical evidence and independent witness accounts lend credibility to the prosecution case. Defense must counter specifically.",
      weak_argument:"This argument requires more specificity. S.498A requires both cruelty and dowry demand to be established. Address both elements.",
      verdict:"IN THE METROPOLITAN MAGISTRATE COURT, MUMBAI\n\nCase: Complainant vs Accused — CRL. No. 78/2025\n\nJUDGMENT\n\nBRIEF FACTS: Complainant alleged physical and mental cruelty and dowry demand under S.498A IPC.\n\nANALYSIS: Medical evidence corroborated by independent neighbours establishes cruelty. Digital messages constitute demand of dowry within S.2 of Dowry Prohibition Act. Defense argument of fabrication remains unsubstantiated. S.65B certificate for digital messages was properly filed.\n\nORDER: Accused convicted under S.498A IPC. Sentenced to 18 months rigorous imprisonment and fine of ₹25,000. Husband-in-chief also convicted. Case under Dowry Prohibition Act adjourned for separate trial."
    }
  },
  {
    id:'offline-3',title:'Petitioner vs Union of India — Art.19 Challenge',caseType:'constitutional',difficulty:'advanced',
    caseNumber:'WP(C) No. 445/2025',court:'Delhi High Court',
    summary:'Petitioner challenges government circular banning all private construction within 3 km of heritage zone as violating Article 19(1)(g) without proportionate restriction.',
    chargesOrClaims:['Violation of Art.19(1)(g) — Right to practise trade/business','Circular ultra vires — no statutory backing','Violation of natural justice — no hearing before ban'],
    relevantSections:[{section:'Art.19(1)(g)',description:'Right to practise any profession or carry on any occupation, trade or business'},{section:'Art.19(6)',description:'State may impose reasonable restrictions in interest of general public'},{section:'Art.14',description:'Right to equality — prohibition of arbitrary State action'}],
    prosecutionArguments:['Art.19(6) permits reasonable restrictions — protecting heritage zones is valid public interest','State has ASI documented evidence of structural damage from nearby construction','Restriction is temporary and compensatory relief announced for affected businesses'],
    defenseArguments:['Circular issued without any statutory authority — violates rule of law under Art.13','Blanket ban is overbroad — fails proportionality test laid down in Modern Dental College (2016)','No notice or hearing given before imposition — violates natural justice principles'],
    evidence:[{id:'E1',type:'Documentary',description:'Government Gazette notification imposing blanket ban',side:'prosecution'},{id:'E2',type:'Expert',description:'ASI heritage expert report showing construction vibration damage',side:'prosecution'},{id:'E3',type:'Documentary',description:'Petitioner business registration and ₹2 crore ongoing contracts',side:'defense'}],
    witnesses:[{id:'W1',name:'Heritage Expert',role:'ASI Expert',testimony:'Vibrations from nearby construction have caused micro-fractures in monuments.',backstory:'Credible expert with published research on structural impact of vibration.'},{id:'W2',name:'Civil Engineer',role:'Petitioner expert',testimony:'Our construction site is 3.2 km away and well within safety parameters.',backstory:'Financial interest but coordinate measurements support claim.'}],
    keyLegalIssues:['Whether Art.19(6) restriction is proportionate to the objective','Whether executive circular without statutory backing is valid law'],
    suggestedVerdict:'Writ allowed — circular quashed, government directed to frame proper statutory regulation within 3 months',
    learningObjectives:['Art.19 fundamental rights and grounds of restriction','Doctrine of proportionality in constitutional law','Ultra vires doctrine and rule of law'],
    offlineJudgeResponses:{
      default:"This Court notes the constitutional issues raised. The petitioner must establish that the restriction fails the proportionality test. Respondents must show statutory backing. Proceed.",
      objection_relevance:"Objection OVERRULED. The cited precedent is directly relevant to the proportionality doctrine under Art.19(6).",
      strong_argument:"The Court finds this argument on proportionality cogent. The government must show that the blanket ban was the least restrictive means available to achieve its objective.",
      verdict:"IN THE HIGH COURT OF DELHI\n\nCase: Petitioner vs Union of India — WP(C) No. 445/2025\n\nJUDGMENT\n\nBRIEF FACTS: Petitioner challenges government circular banning construction within 3km of heritage zones.\n\nISSUES: Whether the circular violates Art.19(1)(g) and whether it is backed by statutory authority.\n\nANALYSIS: The circular was issued by executive fiat with no statutory basis, violating the rule of law under Art.13. Further, applying the proportionality standard from Modern Dental College v. Union of India (2016), a blanket ban when targeted regulations could achieve the same objective fails constitutional scrutiny. No hearing was afforded — natural justice violated.\n\nORDER: Writ ALLOWED. Impugned circular is quashed. Respondents directed to frame proper statutory regulation within 90 days. Petitioner's ongoing projects may proceed under supervision pending new regulation."
    }
  },
  {
    id:'offline-4',title:'Manufacturer vs Logistics Company — Contract Breach',caseType:'civil',difficulty:'beginner',
    caseNumber:'CS. No. 234/2025',court:'Commercial Court, Pune',
    summary:'Plaintiff sues for ₹18 lakh in damages after defendant failed to deliver goods on agreed date, causing plaintiff to miss critical export deadline.',
    chargesOrClaims:['Breach of contract — S.73 Indian Contract Act 1872','Claim for consequential damages'],
    relevantSections:[{section:'S.73 Contract Act',description:'Compensation for loss due to breach of contract'},{section:'S.74 Contract Act',description:'Compensation when penalty stipulated in contract'},{section:'S.55 Contract Act',description:'Time is essence of contract — effect of failure to perform at fixed time'}],
    prosecutionArguments:['Contract specified delivery by 1 March 2025 — time was expressly essence','Defendant admitted in writing to delay due to internal issues','Plaintiff has certified documentation of ₹18 lakh export loss'],
    defenseArguments:['Delay caused by unprecedented flooding — force majeure clause applies','Plaintiff failed to mitigate — alternate vendor was available','Consequential damages are speculative — no direct causation proven'],
    evidence:[{id:'E1',type:'Documentary',description:'Signed contract with delivery date 1 March 2025',side:'prosecution'},{id:'E2',type:'Digital',description:'Email from defendant admitting delay due to internal issues',side:'prosecution'},{id:'E3',type:'Documentary',description:'Export loss certificate from customs officer',side:'prosecution'},{id:'E4',type:'Documentary',description:'IMD flood report for transport route dates',side:'defense'}],
    witnesses:[{id:'W1',name:'Export Manager',role:'Plaintiff company representative',testimony:'We lost the entire export order worth ₹18 lakh due to the late delivery.',backstory:'Credible. Has complete documentary backup for all claims made.'},{id:'W2',name:'Logistics Manager',role:'Defendant company representative',testimony:'We experienced unprecedented flooding on our route. It was force majeure.',backstory:'Flooding was real but alternate route was available and not attempted.'}],
    keyLegalIssues:['Whether force majeure covers foreseeable weather delays when alternate routes exist','Whether plaintiff adequately mitigated loss as required under S.73'],
    suggestedVerdict:'Partial decree — ₹12 lakh awarded accounting for plaintiff failure to mitigate',
    learningObjectives:['Breach of contract essentials under Indian Contract Act','Force majeure doctrine and its limits','Duty to mitigate loss under S.73 Contract Act'],
    offlineJudgeResponses:{
      default:"The Court notes the submissions. Under S.73, the plaintiff must establish actual loss caused directly by the breach. The defendant must prove force majeure with specificity. Continue.",
      objection_hearsay:"Objection OVERRULED. The email is a party admission and is admissible under S.17 of the Indian Evidence Act.",
      strong_argument:"The Court notes the cogency of this argument. The admission in the defendant's email is significant. The force majeure plea must be specifically proven with documentation.",
      verdict:"IN THE COMMERCIAL COURT, PUNE\n\nCase: Manufacturer vs Logistics Company — CS. No. 234/2025\n\nJUDGMENT\n\nBRIEF FACTS: Plaintiff claims ₹18 lakh damages for breach of contract causing missed export deadline.\n\nANALYSIS: Time was essence under S.55. Breach is admitted. Force majeure is partially accepted for 3 days of flooding per IMD report. However, defendant failed to attempt alternate routes. Plaintiff is also held partly responsible for not attempting to source alternate supplier — failure to mitigate under S.73. Loss is apportioned.\n\nORDER: Decree passed for ₹12 lakh in favour of plaintiff. ₹6 lakh reduced for plaintiff's failure to mitigate. Interest at 9% per annum from date of breach. Costs to plaintiff."
    }
  },
  {
    id: 'offline-5',
    title: 'State of UP v. Rajesh Talwar (Aarushi Murder Trial)',
    caseType: 'criminal',
    difficulty: 'intermediate',
    caseNumber: 'CRL. No. 44/2008',
    court: 'Allahabad High Court',
    summary: 'Double murder of 14-year-old Aarushi and domestic help Hemraj. The prosecution relies on circumstantial evidence (last-seen theory, suspicious behavior) and forensic records. The defense argues that the crime scene was contaminated and there is no direct link to the parents.',
    chargesOrClaims: ['S.302 IPC — Murder', 'S.201 IPC — Destruction of Evidence'],
    relevantSections: [
      { section: 'S.302 IPC', description: 'Punishment for murder' },
      { section: 'S.106 Evidence Act', description: 'Burden of proving fact especially within knowledge' },
      { section: 'S.201 IPC', description: 'Causing disappearance of evidence of offence' }
    ],
    prosecutionArguments: [
      'The parents were the only ones inside the house; the burden under Section 106 Evidence Act shifts to them to explain what occurred.',
      'The crime scene showed cleanup attempts which indicates destruction of evidence under S.201 IPC.'
    ],
    defenseArguments: [
      'The crime scene was heavily contaminated by visitors and police officers before forensic investigation, rendering evidence unreliable.',
      'Suspicion, however grave, cannot replace proof beyond reasonable doubt, as held in Kali Ram v. State of HP.'
    ],
    evidence: [
      { id: 'E1', type: 'Forensic', description: 'Blood-stained bedsheets and surgical tools', side: 'prosecution' },
      { id: 'E2', type: 'Documentary', description: 'Police lockup log and early statements', side: 'defense' }
    ],
    witnesses: [
      { id: 'W1', name: 'Lead CBI Investigator', role: 'Investigating Officer', testimony: 'No sign of forced entry. The murder weapon was a surgical scalpel consistent with the father\'s profession.', backstory: 'Believes strongly in the parents\' guilt but admits procedural lapses occurred.' },
      { id: 'W2', name: 'Maid', role: 'Daily House Help', testimony: 'I found the outer gate locked from the outside when I arrived in the morning.', backstory: 'Unsure of exact details, easily confused under aggressive cross-examination.' }
    ],
    keyLegalIssues: ['Whether circumstantial evidence excludes every hypothesis of innocence.', 'Applicability of Section 106 of the Indian Evidence Act in a locked house scenario.'],
    suggestedVerdict: 'Acquittal — benefit of reasonable doubt',
    learningObjectives: ['Circumstantial evidence chain rules', 'Locked house presumption standards', 'Crime scene custody importance'],
    offlineJudgeResponses: {
      default: "The Court notes the arguments. In cases of circumstantial evidence, the chain must be so complete as to leave no reasonable doubt of innocence. Proceed.",
      objection_hearsay: "Objection SUSTAINED. The statement is hearsay and does not fall within any exception under the Indian Evidence Act.",
      objection_relevance: "Objection OVERRULED. The contamination of the crime scene is directly relevant to the weight of the forensic evidence.",
      verdict: "IN THE HIGH COURT OF JUDICATURE AT ALLAHABAD\n\nJUDGMENT\n\nBRIEF FACTS: The prosecution asserts that the accused parents murdered the victims in a locked house. The defense pleads fabrication and contaminated crime scene.\n\nANALYSIS: The prosecution has failed to establish an unbroken chain of circumstantial evidence. In a locked house, Section 106 of the Evidence Act does not absolve the prosecution from proving its case. Suspicion cannot take the place of legal proof, as held in Sharad Birdhichand Sarda v. State of Maharashtra (1984).\n\nORDER: Appeal allowed. Conviction set aside. The accused are ACQUITTED of all charges."
    }
  },
  {
    id: 'offline-6',
    title: 'Shreya Singhal v. Union of India (Section 66A IT Act Challenge)',
    caseType: 'cyber',
    difficulty: 'advanced',
    caseNumber: 'WP(C) No. 167/2012',
    court: 'Supreme Court of India',
    summary: 'Constitutional challenge to Section 66A of the Information Technology Act, 2000, which made posting "offensive" messages online punishable by up to three years in prison.',
    chargesOrClaims: ['Violation of Article 19(1)(a) — Freedom of Speech', 'Article 14 — Arbitrariness and Vagueness', 'Not covered by Article 19(2) restrictions'],
    relevantSections: [
      { section: 'Section 66A IT Act', description: 'Punishment for sending offensive messages through communication service' },
      { section: 'Article 19(1)(a)', description: 'Freedom of Speech and Expression' },
      { section: 'Article 19(2)', description: 'Reasonable restrictions on Freedom of Speech' }
    ],
    prosecutionArguments: [
      'Section 66A is necessary to protect public order and prevent cyber-bullying/harassment in the digital age.',
      'Internet requires stricter regulation than print media due to its instant, viral reach.'
    ],
    defenseArguments: [
      'The section is vague, overbroad, and lacks clear definitions of "offensive" or "annoyance," causing a chilling effect on free speech.',
      'It does not fall under any of the eight permissible heads of restriction under Article 19(2).'
    ],
    evidence: [
      { id: 'E1', type: 'Documentary', description: 'Police FIR details charging students for posting comments online', side: 'defense' },
      { id: 'E2', type: 'Expert', description: 'Cyber policy reports on global speech standards', side: 'defense' }
    ],
    witnesses: [
      { id: 'W1', name: 'Cyber Law Expert', role: 'Academic Policy Researcher', testimony: 'Section 66A creates a chilling effect because citizens cannot predict what speech is criminal.', backstory: 'Neutral legal scholar advocating for digital civil liberties.' }
    ],
    keyLegalIssues: ['Whether Section 66A IT Act is overbroad and vague.', 'Whether Section 66A falls within the scope of reasonable restrictions under Article 19(2).'],
    suggestedVerdict: 'Writ allowed — Section 66A struck down as unconstitutional',
    learningObjectives: ['Article 19(1)(a) speech protections', 'Overbreadth and Vagueness doctrines', 'Article 19(2) restriction restrictions'],
    offlineJudgeResponses: {
      default: "The Court hears your constitutional submissions. Free speech online must be balanced against public order, but restrictions must be narrowly tailored. Continue.",
      objection_relevance: "Objection OVERRULED. The chilling effect on online speech is directly relevant to the constitutional challenge.",
      verdict: "IN THE SUPREME COURT OF INDIA\n\nJUDGMENT\n\nBRIEF FACTS: The petitioner challenges the constitutionality of Section 66A of the IT Act, alleging violation of Article 19(1)(a).\n\nANALYSIS: Section 66A is vague and overbroad. It makes no distinction between advocacy and incitement. A restriction on speech must be clear and direct, failing which it creates a chilling effect on legitimate debate. The section does not fall under the strict heads of Article 19(2).\n\nORDER: Writ allowed. Section 66A of the IT Act is struck down as unconstitutional in its entirety."
    }
  },
  {
    id: 'offline-7',
    title: 'Kesavananda Bharati v. State of Kerala (Basic Structure Doctrine)',
    caseType: 'constitutional',
    difficulty: 'advanced',
    caseNumber: 'WP(C) No. 135/1970',
    court: 'Supreme Court of India',
    summary: 'The landmark challenge to Parliament\'s unlimited power to amend the Constitution. The Supreme Court established that while Parliament can amend fundamental rights, it cannot touch the "Basic Structure" of the Constitution.',
    chargesOrClaims: ['Challenge to the 24th, 25th, and 29th Constitutional Amendments', 'Violation of the right to property under Article 31', 'Parliament cannot destroy the essential features of the Constitution'],
    relevantSections: [
      { section: 'Article 368', description: 'Power of Parliament to amend the Constitution' },
      { section: 'Article 13', description: 'Laws inconsistent with or in derogation of fundamental rights' },
      { section: 'Article 31 (Historical)', description: 'Right to compulsory acquisition of property' }
    ],
    prosecutionArguments: [
      'Parliament represents the democratic will of the people and has unlimited power to amend any part of the Constitution under Article 368.',
      'Fundamental rights must yield to directive principles for socio-economic reforms and land redistribution.'
    ],
    defenseArguments: [
      'The power to amend is not the power to abrogate or destroy the essential framework of the Constitution.',
      'Democratic republic, judicial review, and fundamental rights form the core identity of the Constitution that cannot be amended away.'
    ],
    evidence: [
      { id: 'E1', type: 'Documentary', description: 'Kerala Land Reforms Act gazette and notifications', side: 'prosecution' },
      { id: 'E2', type: 'Documentary', description: 'Comparative study of global constitutional amendment limits', side: 'defense' }
    ],
    witnesses: [
      { id: 'W1', name: 'Constitutional Jurist', role: 'Legal Expert', testimony: 'If amendment powers are unlimited, Parliament could turn India into a monarchy or delete all rights.', backstory: 'Highly respected jurist focusing on constitutional preservation.' }
    ],
    keyLegalIssues: ['Scope of Parliament\'s amending power under Article 368.', 'Whether fundamental rights can be amended or destroyed by a constitutional amendment.'],
    suggestedVerdict: 'Writ partly allowed — Amendments upheld but Basic Structure declared unamendable',
    learningObjectives: ['Basic Structure Doctrine essentials', 'Article 368 amendment boundaries', 'Balance between judiciary and legislature'],
    offlineJudgeResponses: {
      default: "The Court notes these profound constitutional arguments. The balance of power between Parliament and the Constitution is the central issue. Proceed.",
      verdict: "IN THE SUPREME COURT OF INDIA\n\nJUDGMENT\n\nBRIEF FACTS: Petitioners challenge the validity of constitutional amendments restricting fundamental rights and land ownership.\n\nANALYSIS: The power to amend under Article 368 is wide, but it is not absolute. 'Amendment' implies retention of the original structure with modifications, not total destruction. The Constitution has certain basic, essential features — such as democracy, federalism, secularism, and judicial review — which form its basic structure and cannot be amended.\n\nORDER: The amendments are upheld, subject to the condition that they do not damage the Basic Structure. The Basic Structure Doctrine is declared law."
    }
  },
  {
    id: 'offline-8',
    title: 'Shayara Bano v. Union of India (Triple Talaq Case)',
    caseType: 'family',
    difficulty: 'intermediate',
    caseNumber: 'WP(C) No. 118/2016',
    court: 'Supreme Court of India',
    summary: 'Challenge to the practices of Talaq-e-Biddat (instant triple talaq) as violating gender equality, dignity, and fundamental rights under the Indian Constitution.',
    chargesOrClaims: ['Violation of Article 14 — Right to Equality', 'Violation of Article 15 — Prohibition of gender discrimination', 'Talaq-e-Biddat is arbitrary and not protected under Article 25 (Religious Freedom)'],
    relevantSections: [
      { section: 'Article 14', description: 'Equality before law and equal protection' },
      { section: 'Article 15(1)', description: 'Prohibition of discrimination on grounds of sex' },
      { section: 'Article 25', description: 'Freedom of conscience and free profession of religion' }
    ],
    prosecutionArguments: [
      'Instant triple talaq is an essential religious practice protected under Article 25 and cannot be reviewed by courts.',
      'Matrimonial personal laws are separate from public laws and immune to Part III fundamental rights scrutiny.'
    ],
    defenseArguments: [
      'Talaq-e-Biddat is arbitrary, gives unilateral power to the husband, and violates the wife\'s right to equality under Article 14.',
      'It is not an essential religious practice, as it is considered sinful/innovated even within Islamic jurisprudence.'
    ],
    evidence: [
      { id: 'E1', type: 'Documentary', description: 'Speed post triple talaq notice sent to petitioner', side: 'defense' },
      { id: 'E2', type: 'Expert', description: 'Islamic law research and reports from global Muslim-majority countries banning the practice', side: 'defense' }
    ],
    witnesses: [
      { id: 'W1', name: 'Islamic Scholar', role: 'Religious Jurisprudence Expert', testimony: 'Talaq-e-Biddat is not essential to the practice of Islam and has been banned in many Islamic countries.', backstory: 'Independent theological scholar supporting reform.' }
    ],
    keyLegalIssues: ['Whether personal laws constitute "laws in force" under Article 13.', 'Whether instant triple talaq violates the test of manifest arbitrariness under Article 14.'],
    suggestedVerdict: 'Writ allowed — Instant Triple Talaq declared unconstitutional and void',
    learningObjectives: ['Manifest arbitrariness doctrine', 'Essential Religious Practices test', 'Gender equality vs Religious Freedom'],
    offlineJudgeResponses: {
      default: "Matrimonial dignity and equality are core rights. The court is examining whether this practice passes the Article 14 test. Proceed.",
      verdict: "IN THE SUPREME COURT OF INDIA\n\nJUDGMENT\n\nBRIEF FACTS: The petitioner challenges the validity of instant triple talaq (Talaq-e-Biddat) as violating gender rights.\n\nANALYSIS: Talaq-e-Biddat is arbitrary and unilateral. It allows a marriage to be broken whimsically without reconciliation efforts. Under the manifest arbitrariness doctrine, any law or practice that is arbitrary and capricious violates Article 14. Further, it is not an essential religious practice protected under Article 25.\n\nORDER: By a 3:2 majority, the practice of Talaq-e-Biddat is declared unconstitutional, illegal, and void."
    }
  }
];

OFFLINE_CASES.forEach(c => store.set(c.id, c));

router.get('/', (req,res) => {
  const {type,difficulty} = req.query;
  let cases = Array.from(store.values());
  if(type) cases = cases.filter(c=>c.caseType===type);
  if(difficulty) cases = cases.filter(c=>c.difficulty===difficulty);
  res.json({success:true,cases});
});
router.get('/:id', (req,res) => {
  const c = store.get(req.params.id);
  if(!c) return res.status(404).json({error:'Case not found'});
  res.json({success:true,case:c});
});
router.post('/', (req, res) => {
  const id = req.body.id || uuid();
  const c = { ...req.body, id, creatorId: req.auth?.userId, createdAt: new Date().toISOString() };
  store.set(id, c);
  res.status(201).json({ success: true, case: c });
});

router.delete('/:id', (req, res) => {
  const caseId = req.params.id;
  const c = store.get(caseId);
  if (!c) return res.status(404).json({ error: 'Case not found' });

  // Prevent deleting default offline cases
  if (caseId.startsWith('offline-')) {
    return res.status(403).json({ error: 'Cannot delete default offline cases' });
  }

  // Allow deletion only by creator or admin
  const userId = req.auth?.userId;
  const isAdmin = req.auth?.role === ROLES.ADMIN;
  if (c.creatorId && c.creatorId !== userId && !isAdmin) {
    return res.status(403).json({ error: 'Unauthorized to delete this case' });
  }

  store.delete(caseId);
  res.json({ success: true });
});

export default router;
