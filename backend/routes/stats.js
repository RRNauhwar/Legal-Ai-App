import express from 'express';
import db from '../services/db.js';
import { rooms } from './rooms.js'; // Import rooms Map to query active multiplayer rooms

const router = express.Router();

// Helper to determine win/loss based on score
function getOutcome(score) {
  if (score >= 70) return 'win';
  return 'loss';
}

// POST a new trial performance log
router.post('/performances', (req, res) => {
  try {
    const { caseId, caseTitle, caseType, overallScore, breakdown, badge } = req.body;
    const userId = req.auth?.userId;
    const userName = req.headers['x-demo-user-name'] || 'Anonymous';

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const score = Number(overallScore) || 0;
    const outcome = getOutcome(score);

    const performance = db.insert('performances', {
      userId,
      userName,
      caseId: caseId || 'unknown',
      caseTitle: caseTitle || 'Untitled Case',
      caseType: caseType || 'criminal',
      overallScore: score,
      breakdown: breakdown || {},
      badge: badge || 'Advocate',
      outcome
    });

    res.status(201).json({ success: true, performance });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET aggregated stats for the current user
router.get('/me', (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId || userId === 'demo-user') {
      // Return empty stats if not logged in or in dummy state
      return res.json({
        success: true,
        stats: {
          totalSessions: 0,
          winRatio: '0:0',
          averageScore: 0,
          scoreBreakdown: [
            { label: 'Argument strength', value: 0, tone: 'gold' },
            { label: 'Legal accuracy', value: 0, tone: 'blue' },
            { label: 'Persuasion', value: 0, tone: 'green' },
            { label: 'Speaking fluency', value: 0, tone: 'red' }
          ],
          badges: [],
          history: []
        }
      });
    }

    const performances = db.findMany('performances', p => p.userId === userId);
    
    // Sort history newest first
    const history = [...performances].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const totalSessions = performances.length;
    let wins = 0;
    let losses = 0;
    let totalScore = 0;

    let argSum = 0;
    let legalSum = 0;
    let persuadeSum = 0;
    let fluencySum = 0;

    performances.forEach(p => {
      totalScore += p.overallScore;
      if (p.outcome === 'win') wins++;
      else losses++;

      // Extract breakdown categories
      const b = p.breakdown || {};
      argSum += b.argumentStrength?.score || b.argumentStrength || 0;
      legalSum += b.legalKnowledge?.score || b.legalKnowledge || 0;
      persuadeSum += b.logicalReasoning?.score || b.logicalReasoning || 0;
      fluencySum += b.speakingFluency?.score || b.objectionHandling?.score || 0;
    });

    const averageScore = totalSessions > 0 ? Math.round(totalScore / totalSessions) : 0;
    
    const scoreBreakdown = [
      { label: 'Argument strength', value: totalSessions > 0 ? Math.round(argSum / totalSessions) : 0, tone: 'gold' },
      { label: 'Legal accuracy', value: totalSessions > 0 ? Math.round(legalSum / totalSessions) : 0, tone: 'blue' },
      { label: 'Persuasion', value: totalSessions > 0 ? Math.round(persuadeSum / totalSessions) : 0, tone: 'green' },
      { label: 'Speaking fluency', value: totalSessions > 0 ? Math.round(fluencySum / totalSessions) : 0, tone: 'red' }
    ];

    // Determine earned badges
    const badges = [];
    if (totalSessions >= 1) {
      badges.push('Apprentice Advocate');
    }
    if (performances.some(p => p.overallScore >= 80)) {
      badges.push('Sharp Thinker');
    }
    if (totalSessions >= 10) {
      badges.push('Legal Eagle');
    }
    if (performances.some(p => p.caseType === 'constitutional' && p.overallScore >= 75)) {
      badges.push('Constitutional Expert');
    }
    if (performances.filter(p => p.overallScore >= 80).length >= 3) {
      badges.push('Best Advocate');
    }

    res.json({
      success: true,
      stats: {
        totalSessions,
        winRatio: `${wins}:${losses}`,
        averageScore,
        scoreBreakdown,
        badges,
        history
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET global leaderboard
router.get('/leaderboard', (req, res) => {
  try {
    const performances = db.getCollection('performances');
    
    // Group performances by userId
    const userGroups = {};
    performances.forEach(p => {
      if (!userGroups[p.userId]) {
        userGroups[p.userId] = {
          userId: p.userId,
          userName: p.userName,
          scores: [],
          wins: 0,
          losses: 0,
          caseTypes: new Set()
        };
      }
      userGroups[p.userId].scores.push(p.overallScore);
      userGroups[p.userId].caseTypes.add(p.caseType);
      if (p.outcome === 'win') userGroups[p.userId].wins++;
      else userGroups[p.userId].losses++;
    });

    // Map to array and calculate stats
    const leaderboard = Object.values(userGroups).map(g => {
      const total = g.scores.length;
      const avg = total > 0 ? Math.round(g.scores.reduce((a, b) => a + b, 0) / total) : 0;
      const max = total > 0 ? Math.max(...g.scores) : 0;

      // Determine top signal
      let signal = 'Trial Practice';
      if (g.caseTypes.has('constitutional')) signal = 'Constitutional advocacy';
      else if (g.caseTypes.has('criminal')) signal = 'Criminal advocacy';
      else if (g.caseTypes.has('civil')) signal = 'Civil disputes';

      return {
        userId: g.userId,
        name: g.userName,
        totalSessions: total,
        averageScore: avg,
        highestScore: max,
        winLoss: `${g.wins}W : ${g.losses}L`,
        signal
      };
    });

    // Sort by averageScore descending
    leaderboard.sort((a, b) => b.averageScore - a.averageScore);

    res.json({ success: true, leaderboard });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET active rooms
router.get('/active-rooms', (req, res) => {
  try {
    const active = [];
    if (rooms && typeof rooms.values === 'function') {
      for (const room of rooms.values()) {
        // Count occupied seats
        let seatCount = 0;
        if (room.seats) {
          if (room.seats.judge) seatCount++;
          if (room.seats.prosecution) seatCount++;
          if (room.seats.defense) seatCount++;
        }
        active.push({
          id: room.id,
          title: room.caseData?.title || 'Court Trial',
          meta: `${room.caseData?.caseType || 'civil'} trial · Room VC-${room.id}`,
          time: new Date(room.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          seats: `${3 - seatCount} counsel seats open`
        });
      }
    }
    res.json({ success: true, rooms: active });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET admin logs
router.get('/admin/logs', (req, res) => {
  try {
    // Collect audits (or simulate live audit logs from DB)
    const logs = db.getCollection('audit_logs')
      .slice(-30)
      .map(log => {
        const time = new Date(log.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        return {
          time,
          event: log.action || 'API Call',
          detail: `${log.method} ${log.path} - ${log.role}`
        };
      })
      .reverse();

    res.json({ success: true, logs });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
