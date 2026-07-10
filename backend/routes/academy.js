import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../services/db.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LESSONS_FILE = path.resolve(__dirname, '../data/academyLessons.json');

let lessons = [];
try {
  lessons = JSON.parse(fs.readFileSync(LESSONS_FILE, 'utf8'));
} catch (e) {
  console.error('[academy] Failed to load lessons file:', e);
}

// Helper to calculate XP needed for next level: Lvl * 500 XP
function xpForNextLevel(lvl) {
  return lvl * 500;
}

// GET all lessons
router.get('/lessons', (req, res) => {
  res.json({ success: true, lessons });
});

// GET current progress
router.get('/progress', (req, res) => {
  try {
    const userId = req.auth?.userId || 'demo-user';
    let progress = db.findOne('academy_progress', p => p.userId === userId);

    if (!progress) {
      progress = db.insert('academy_progress', {
        userId,
        specialization: 'general',
        xpTotal: 0,
        level: 1,
        streakDays: 0,
        lastCompletedAt: null,
        completedLessons: [],
        weakTopics: [],
        spacedRepetitionQueue: []
      });
    }

    res.json({ success: true, progress });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST update specialization
router.post('/progress/specialization', (req, res) => {
  try {
    const userId = req.auth?.userId || 'demo-user';
    const { specialization } = req.body;
    
    if (!['criminal', 'civil', 'constitutional', 'corporate', 'general'].includes(specialization)) {
      return res.status(400).json({ success: false, error: 'Invalid specialization' });
    }

    let progress = db.findOne('academy_progress', p => p.userId === userId);
    if (!progress) {
      progress = db.insert('academy_progress', {
        userId,
        specialization,
        xpTotal: 0,
        level: 1,
        streakDays: 0,
        lastCompletedAt: null,
        completedLessons: [],
        weakTopics: [],
        spacedRepetitionQueue: []
      });
    } else {
      progress = db.update('academy_progress', progress.id, { specialization });
    }

    res.json({ success: true, progress });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST complete a lesson
router.post('/lessons/:lessonId/complete', (req, res) => {
  try {
    const userId = req.auth?.userId || 'demo-user';
    const { lessonId } = req.params;
    const { difficulty = 'easy', attempts = 1, score = 100 } = req.body;

    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) {
      return res.status(404).json({ success: false, error: 'Lesson not found' });
    }

    let progress = db.findOne('academy_progress', p => p.userId === userId);
    if (!progress) {
      progress = db.insert('academy_progress', {
        userId,
        specialization: 'general',
        xpTotal: 0,
        level: 1,
        streakDays: 0,
        lastCompletedAt: null,
        completedLessons: [],
        weakTopics: [],
        spacedRepetitionQueue: []
      });
    }

    // Check if already completed
    const alreadyCompleted = progress.completedLessons.some(l => l.lessonId === lessonId);
    
    // Calculate streak
    const now = new Date();
    let streak = progress.streakDays || 0;
    if (progress.lastCompletedAt) {
      const lastDate = new Date(progress.lastCompletedAt);
      const diffMs = now - lastDate;
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours >= 24 && diffHours < 48) {
        streak += 1;
      } else if (diffHours >= 48) {
        streak = 1; // streak reset
      } else if (streak === 0) {
        streak = 1;
      }
    } else {
      streak = 1;
    }

    // Calculate XP award
    let xpAward = 50; // base completion
    if (score === 100) xpAward += 20; // perfect score bonus
    if (attempts === 1) xpAward += 10; // first try bonus

    // Apply streak multiplier
    let multiplier = 1.0;
    if (streak >= 30) multiplier = 1.5;
    else if (streak >= 7) multiplier = 1.25;
    else if (streak >= 3) multiplier = 1.1;
    
    xpAward = Math.round(xpAward * multiplier);

    const nextXpTotal = (progress.xpTotal || 0) + (alreadyCompleted ? 10 : xpAward); // repeat lessons award minor XP

    // Calculate Level Ups
    let nextLevel = progress.level || 1;
    while (nextXpTotal >= xpForNextLevel(nextLevel)) {
      nextLevel += 1;
    }

    // Update completed list
    const updatedCompleted = [...(progress.completedLessons || [])];
    if (!alreadyCompleted) {
      updatedCompleted.push({
        lessonId,
        difficulty,
        attempts,
        score,
        completedAt: now.toISOString()
      });
    }

    // Schedule Spaced Repetition (e.g. 4 days from now)
    const repetitionQueue = [...(progress.spacedRepetitionQueue || [])].filter(q => q.lessonId !== lessonId);
    repetitionQueue.push({
      lessonId,
      nextReviewAt: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      intervalDays: 4
    });

    const updated = db.update('academy_progress', progress.id, {
      xpTotal: nextXpTotal,
      level: nextLevel,
      streakDays: streak,
      lastCompletedAt: now.toISOString(),
      completedLessons: updatedCompleted,
      spacedRepetitionQueue: repetitionQueue
    });

    res.json({
      success: true,
      xpEarned: alreadyCompleted ? 10 : xpAward,
      leveledUp: nextLevel > progress.level,
      progress: updated
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
