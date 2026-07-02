export const CONSTITUTION_CATEGORIES = [
  {
    id: 'criminal-justice',
    title: 'Criminal Justice',
    desc: 'Articles most often used in arrest, detention, investigation, trial fairness, and personal liberty arguments.',
    articles: [
      { citation: 'Art.20', title: 'Protection in respect of conviction for offences' },
      { citation: 'Art.21', title: 'Protection of life and personal liberty' },
      { citation: 'Art.22', title: 'Protection against arrest and detention in certain cases' },
      { citation: 'Art.32', title: 'Constitutional remedies before the Supreme Court' }
    ]
  },
  {
    id: 'civil-liberties',
    title: 'Civil Liberties',
    desc: 'Speech, profession, movement, association, and equality-based litigation.',
    articles: [
      { citation: 'Art.14', title: 'Equality before law' },
      { citation: 'Art.19', title: 'Freedoms and reasonable restrictions' },
      { citation: 'Art.21', title: 'Due process, dignity, privacy, and liberty' },
      { citation: 'Art.300A', title: 'Property rights' }
    ]
  },
  {
    id: 'constitutional-remedies',
    title: 'Constitutional Remedies',
    desc: 'Forum, writ, and review pathways for public law litigation.',
    articles: [
      { citation: 'Art.32', title: 'Supreme Court remedy' },
      { citation: 'Art.136', title: 'Special leave to appeal' },
      { citation: 'Art.141', title: 'Law declared by Supreme Court binding' },
      { citation: 'Art.226', title: 'High Court writ jurisdiction' }
    ]
  },
  {
    id: 'governance',
    title: 'Governance and Federal Structure',
    desc: 'Articles useful in separation of powers, state action, and institutional disputes.',
    articles: [
      { citation: 'Art.12', title: 'Definition of State' },
      { citation: 'Art.13', title: 'Laws inconsistent with fundamental rights' },
      { citation: 'Art.246', title: 'Distribution of legislative powers' },
      { citation: 'Art.356', title: "President's Rule" }
    ]
  }
];

export const TRENDING_CASES = [
  {
    title: 'State of UP v. Rajesh Talwar (Aarushi Murder Trial)',
    court: 'Allahabad High Court',
    why: 'A highly controversial circumstantial evidence double-murder case. Focuses on forensic credibility and S.106 Evidence Act.',
    type: 'criminal',
    caseId: 'offline-5',
    publicSource: 'Supreme Court / Allahabad HC'
  },
  {
    title: 'Shreya Singhal v. Union of India (Section 66A IT Act)',
    court: 'Supreme Court of India',
    why: 'Landmark decision on freedom of speech online, vagueness, and overbreadth of cyber laws.',
    type: 'cyber',
    caseId: 'offline-6',
    publicSource: 'Supreme Court records'
  },
  {
    title: 'Kesavananda Bharati v. State of Kerala',
    court: 'Supreme Court of India',
    why: 'The historic basic structure doctrine ruling that defined the limits of parliamentary power to amend the Constitution.',
    type: 'constitutional',
    caseId: 'offline-7',
    publicSource: 'Supreme Court judgment'
  },
  {
    title: 'Shayara Bano v. Union of India (Triple Talaq)',
    court: 'Supreme Court of India',
    why: 'High-profile constitutional test of gender equality, discrimination, and personal law practices.',
    type: 'family',
    caseId: 'offline-8',
    publicSource: 'Supreme Court of India'
  }
];

export const PUBLIC_CASE_SOURCES = [
  {
    title: 'Supreme Court of India',
    desc: 'Official judgments, orders, and cause-list materials from the Supreme Court.',
    url: 'https://www.sci.gov.in'
  },
  {
    title: 'eCourts Services',
    desc: 'Public court-service portal for case status and district-judiciary access.',
    url: 'https://ecourts.gov.in/'
  },
  {
    title: 'India Code',
    desc: 'Official statutory text, useful when moving from constitutional article to enacted law.',
    url: 'https://www.indiacode.nic.in/'
  },
  {
    title: 'Indian Kanoon',
    desc: 'Public legal search portal frequently used to locate judgments and citations.',
    url: 'https://indiankanoon.org/'
  }
];
