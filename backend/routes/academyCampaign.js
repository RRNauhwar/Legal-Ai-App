import express from 'express';
import db from '../services/db.js';

const router = express.Router();

const RANKS = [
  'law_intern',
  'junior_associate',
  'associate',
  'senior_associate',
  'independent_advocate',
  'high_court_advocate',
  'supreme_court_advocate',
  'senior_counsel',
  'legendary_advocate'
];

// GET campaign progress
router.get('/campaign', (req, res) => {
  try {
    const userId = req.auth?.userId || 'demo-user';
    let camp = db.findOne('academy_campaign', c => c.userId === userId);

    if (!camp) {
      camp = db.insert('academy_campaign', {
        userId,
        rank: 'law_intern',
        reputationScore: 10,
        unlockedCourts: ['district_court'],
        campaignMilestones: []
      });
    }
    res.json({ success: true, campaign: camp });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST promote campaign rank
router.post('/campaign/promote', (req, res) => {
  try {
    const userId = req.auth?.userId || 'demo-user';
    let camp = db.findOne('academy_campaign', c => c.userId === userId);

    if (!camp) {
      camp = db.insert('academy_campaign', {
        userId,
        rank: 'law_intern',
        reputationScore: 10,
        unlockedCourts: ['district_court'],
        campaignMilestones: []
      });
    }

    const currentIdx = RANKS.indexOf(camp.rank);
    if (currentIdx === -1 || currentIdx === RANKS.length - 1) {
      return res.json({ success: true, promoted: false, message: 'Already reached the peak rank!', campaign: camp });
    }

    const nextRank = RANKS[currentIdx + 1];
    const newCourts = [...(camp.unlockedCourts || [])];
    if (nextRank === 'high_court_advocate' && !newCourts.includes('high_court')) {
      newCourts.push('high_court');
    }
    if (nextRank === 'supreme_court_advocate' && !newCourts.includes('supreme_court')) {
      newCourts.push('supreme_court');
    }

    const updated = db.update('academy_campaign', camp.id, {
      rank: nextRank,
      reputationScore: (camp.reputationScore || 0) + 15,
      unlockedCourts: newCourts
    });

    res.json({ success: true, promoted: true, campaign: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET analytics summary
router.get('/analytics/summary', (req, res) => {
  try {
    const userId = req.auth?.userId || 'demo-user';
    let analytics = db.findOne('academy_analytics', a => a.userId === userId);

    if (!analytics) {
      analytics = db.insert('academy_analytics', {
        userId,
        studyHours: 4.5,
        masteryScores: {
          courtroom_foundations: 85,
          criminal_law: 60,
          civil_law: 50,
          constitutional_law: 40,
          evidence_law: 30
        },
        mistakeLog: [
          { concept: 'Hearsay Admissibility', count: 3 },
          { concept: 'Section 65B Admissibility', count: 2 },
          { concept: 'Direct Examination Protocol', count: 1 }
        ],
        readinessScore: 65
      });
    }

    res.json({ success: true, analytics });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
