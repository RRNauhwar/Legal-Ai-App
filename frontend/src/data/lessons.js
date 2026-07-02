export const LESSON_TREE = [
  {
    id: 1,
    title: 'Court Etiquette Basics',
    description: 'Learn the first rules of standing before the Bench.',
    theme: 'gold',
    dialogue: [
      "Hoot hoot! I am Judge Beaks. Welcome to my chambers!",
      "If you want to survive a trial, you must learn decorum first. The law isn't just about what you say, it's how you say it.",
      "Never interrupt the opposing counsel. Never speak loudly over the Judge. Patience is a weapon.",
      "Address the High Court as 'My Lord' or 'Your Ladyship', and district courts as 'Your Honour'."
    ],
    exercise: {
      question: "How should you properly address a Judge in a District Court?",
      options: ["With 'Hey Judge'", "With 'My Lord'", "With 'Your Honour'", "With 'Your Majesty'"],
      correct: 2,
      explanation: "District Judges are 'Your Honour'. Reserve 'My Lord' for High Courts and the Supreme Court."
    }
  },
  {
    id: 2,
    title: 'The FIR & The Spark',
    description: 'Understand how a criminal case formally begins.',
    theme: 'red',
    dialogue: [
      "Excellent. Now let's explore how a criminal fire gets started.",
      "Under Section 154 of the CrPC, a cognizable offence sets the FIR in motion.",
      "An FIR is just information. It is NOT substantive evidence in itself.",
      "Defense lawyers love finding 'delay' in the FIR. A delayed FIR gives time to fabricate stories!"
    ],
    exercise: {
      question: "Is an FIR conclusive evidence of guilt?",
      options: ["Yes, absolutely", "No, it just triggers the police investigation", "It depends on the police officer", "Yes, if signed by a magistrate"],
      correct: 1,
      explanation: "An FIR simply sets the machinery of law into motion; it is not proof of guilt itself."
    }
  },
  {
    id: 3,
    title: 'The Burden of Proof',
    description: 'Learn who has to prove what during a trial.',
    theme: 'gold',
    dialogue: [
      "Let's talk about the heavy lifting. Who has to carry the 'Burden of Proof'?",
      "Section 101 of the Evidence Act says: Whoever asserts, must prove.",
      "In a criminal trial, the Prosecution must prove guilt 'beyond a reasonable doubt'.",
      "The Defense just has to poke holes and create doubt. So if you are defending, you don't need a perfect story!"
    ],
    exercise: {
      question: "In a murder trial, what must the Defense prove?",
      options: ["That someone else did it", "They must prove innocence beyond doubt", "Nothing, they just need to raise a reasonable doubt", "That the police lied"],
      correct: 2,
      explanation: "The burden rests on the Prosecution. The Defense only needs to inject reasonable doubt."
    }
  },
  {
    id: 4,
    title: 'Direct Examination',
    description: 'How to ask questions to your own witness.',
    theme: 'blue',
    dialogue: [
      "Ah, the art of questioning! Let's start with Direct Examination (Chief).",
      "When your own witness is on the stand, you cannot lead them. No 'Leading Questions'!",
      "You must ask open-ended questions like 'What happened next?' or 'Where were you?'",
      "If you ask 'You saw him run, didn't you?', the opposing counsel will jump up and object."
    ],
    exercise: {
      question: "Which of these is a permissible open-ended question during Direct Examination?",
      options: ["You hit him with the bat, right?", "Isn't it true you were angry?", "What did you observe at 9 PM?", "The car was red, correct?"],
      correct: 2,
      explanation: "Open-ended questions allow the witness to testify without you implanting the answer."
    }
  },
  {
    id: 5,
    title: 'Objection: Leading!',
    description: 'Learn to aggressively protect your ground.',
    theme: 'blue',
    dialogue: [
      "If the opponent asks their witness a leading question, what do you do?",
      "You stand up loudly and say: 'Objection, My Lord! Counsel is leading the witness.'",
      "Leading questions suggest the answer the examiner wants to hear.",
      "Wait until they finish the sentence, then strike immediately before the witness answers."
    ],
    exercise: {
      question: "When should you object to a leading question?",
      options: ["After the trial ends", "Before the witness can answer the specific question", "During your own argument", "Never, it's rude"],
      correct: 1,
      explanation: "You must block the testimony from entering the record before the witness answers."
    }
  },
  {
    id: 6,
    title: 'Cross-Examination Basics',
    description: 'The engine of truth. Breaking the opponent.',
    theme: 'blue',
    dialogue: [
      "Now for the fun part. Cross-examination!",
      "When the opponent's witness is on the stand, you CAN and MUST lead them.",
      "You want tight, aggressive 'Yes' or 'No' answers. Never ask 'Why'.",
      "Rule of thumb: Never ask a question in cross if you don't already know the answer."
    ],
    exercise: {
      question: "What is a major rule of Cross-Examination?",
      options: ["Ask open ended questions", "Let the witness explain their feelings", "Only ask questions you know the answer to", "Always ask 'Why did you do it?'"],
      correct: 2,
      explanation: "Cross-examination is about control. Unpredictable answers destroy your case."
    }
  },
  {
    id: 7,
    title: 'Hearsay Doctrine',
    description: 'Rumors are not evidence in my court.',
    theme: 'gold',
    dialogue: [
      "Hoot! Did he say that she said that they said?",
      "That is Hearsay. Hearsay is out-of-court statements offered to prove the truth of the matter.",
      "Witnesses can only testify to what they directly saw or heard themselves.",
      "If a witness says, 'My brother told me he saw Ranjit with a knife', Object!"
    ],
    exercise: {
      question: "Which of the following is an example of Hearsay?",
      options: ["I saw him steal it.", "I smelled smoke in the hallway.", "My wife told me she saw him running.", "I punched him in defense."],
      correct: 2,
      explanation: "Testifying about what someone else claimed they saw is textbook hearsay."
    }
  },
  {
    id: 8,
    title: 'Section 299 vs 300 IPC',
    description: 'The hardest line to draw: Homicide vs Murder.',
    theme: 'red',
    dialogue: [
      "Let's look at a classic Indian law battle: Section 299 vs Section 300 IPC.",
      "All murders are culpable homicides, but not all homicides are murders.",
      "If there was 'grave and sudden provocation', it drops from Murder to Culpable Homicide.",
      "This difference can mean 10 years in prison instead of the death penalty!"
    ],
    exercise: {
      question: "If an accused was suddenly provoked to extreme anger and struck a fatal blow, what will the defense argue?",
      options: ["Section 300 IPC (Murder)", "Exception 1 to 300 (Culpable Homicide Not Amounting)", "Complete Acquittal", "Insanity"],
      correct: 1,
      explanation: "Exception 1 of S.300 lowers the severity if provocation deprived the accused of self-control."
    }
  },
  {
    id: 9,
    title: 'Documentary Evidence',
    description: 'Paper trails and Section 65B.',
    theme: 'blue',
    dialogue: [
      "In modern times, cases rely heavily on WhatsApp chats and CCTV footage.",
      "Under Section 65B of the Evidence Act, electronic records need a specific certificate to be admissible.",
      "If the prosecution drops a printed email on my desk without a 65B certificate...",
      "Object! It is inadmissible."
    ],
    exercise: {
      question: "What is required to submit a WhatsApp screenshot as secondary evidence?",
      options: ["Just print it out in color", "Forward it to the judge", "A Section 65B Certificate", "Notarize the printout"],
      correct: 2,
      explanation: "The Supreme Court strictly mandates Section 65B certificates for electronic records."
    }
  },
  {
    id: 10,
    title: 'The Art of Bail (S.437/439)',
    description: 'Getting your client out of the cage.',
    theme: 'gold',
    dialogue: [
      "Bail is the rule, jail is the exception.",
      "When arguing for bail under section 439, focus on the 'Flight Risk'.",
      "Will the accused run away? Will they tamper with evidence or threaten witnesses?",
      "If you show the court that your client has 'deep roots in society', I am likely to grant bail."
    ],
    exercise: {
      question: "Which of these is NOT a standard argument for granting bail?",
      options: ["The accused is fully cooperating", "The accused has deep roots in the community", "The accused is rich and can pay the judge", "The investigation is already complete"],
      correct: 2,
      explanation: "Bail is evaluated based on flight risk and tampering, not financial bribery."
    }
  },
  {
    id: 11,
    title: 'Constitutional Writ Petitions',
    description: 'Invoking Article 32 and 226.',
    theme: 'blue',
    dialogue: [
      "Sometimes the State violates your fundamental rights directly.",
      "You do not need an FIR. You need a Writ Petition.",
      "Article 32 takes you directly to the Supreme Court. Article 226 goes to the High Court.",
      "Habeas Corpus is the writ you file when someone is illegally detained."
    ],
    exercise: {
      question: "Which writ do you file to demand the immediate release of a person unlawfully detained?",
      options: ["Mandamus", "Certiorari", "Quo Warranto", "Habeas Corpus"],
      correct: 3,
      explanation: "Habeas Corpus literally means 'to produce the body' and safeguards personal liberty."
    }
  },
  {
    id: 12,
    title: 'Impeaching a Witness',
    description: 'Exposing lies using previous statements.',
    theme: 'blue',
    dialogue: [
      "What if a witness changes their story on the stand?",
      "Under Section 145 of the Evidence Act, you can 'Impeach' them with their previous statements.",
      "You show them their police statement (S.161 CrPC) and force them to admit the contradiction.",
      "Once impeached, their credibility shatters like glass!"
    ],
    exercise: {
      question: "What is the primary purpose of impeaching a witness?",
      options: ["To make them cry", "To destroy their credibility by highlighting contradictions", "To physically remove them", "To support their current testimony"],
      correct: 1,
      explanation: "Impeachment demonstrates to the Judge that the witness is unreliable."
    }
  },
  {
    id: 13,
    title: 'Handling Expert Witnesses',
    description: 'Cross-examining the scientist.',
    theme: 'gold',
    dialogue: [
      "Experts (doctors, forensics) under S.45 provide opinion, not absolute truth.",
      "Never attack an expert on their science unless you are an expert yourself.",
      "Instead, attack the 'Chain of Custody' or the assumptions they were given.",
      "Did the police contaminate the bloody knife before giving it to the forensic lab?"
    ],
    exercise: {
      question: "What is the safest way to cross-examine a forensic expert?",
      options: ["Tell them their science is fake", "Argue about physics equations", "Question the integrity/handling of the evidence they tested", "Insult their university degree"],
      correct: 2,
      explanation: "Attacking out-of-court evidence handling (Chain of custody) is safer than debating raw science."
    }
  },
  {
    id: 14,
    title: 'Closing Arguments',
    description: 'The final dramatic plea.',
    theme: 'blue',
    dialogue: [
      "The evidence is closed. It is time for your closing arguments.",
      "You cannot introduce new evidence here. You must weave the existing facts into a compelling story.",
      "Point out the biggest gap in the opponent's case.",
      "Remind the Judge of the human element. The law without humanity is just a calculator."
    ],
    exercise: {
      question: "What is not allowed during closing arguments?",
      options: ["Summarizing previous testimony", "Introducing a brand new surprise document", "Highlighting the opponent's missing proof", "Using persuasive rhetoric"],
      correct: 1,
      explanation: "Closing arguments must rely strictly on evidence that has already been properly admitted."
    }
  },
  {
    id: 15,
    title: 'Master Advocate Challenge',
    description: 'The ultimate test of courtroom reflexes.',
    theme: 'red',
    dialogue: [
      "You have reached the final lesson. My feathers are trembling with pride!",
      "To become a Master Advocate, you must combine everything: Objection handling, burden of proof, and evidentiary rules.",
      "Remember this above all else: Preparation wins 90% of trials before you ever step into my court.",
      "Now, prove to me you can wear the robes of a Master!"
    ],
    exercise: {
      question: "If a prosecution witness suddenly testifies 'I think he did it because he looks evil', what should you do?",
      options: ["Cry", "Object: Speculation and Improper Opinion", "Agree with them", "Ask them to explain what evil looks like"],
      correct: 1,
      explanation: "Lay witnesses can only testify to direct facts, not speculative opinions on character."
    }
  }
];
