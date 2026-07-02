import express from 'express';
import db from '../services/db.js';

const router = express.Router();

// GET all ratings and reviews for a case
router.get('/cases/:caseId', (req, res) => {
  try {
    const { caseId } = req.params;
    const ratings = db.findMany('case_ratings', r => r.caseId === caseId);

    // Calculate stats
    const count = ratings.length;
    const average = count > 0 
      ? Number((ratings.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1)) 
      : 0;

    // Sort newest reviews first
    const reviews = [...ratings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      caseId,
      average,
      count,
      reviews
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST or update rating & review for a case
router.post('/cases/:caseId', (req, res) => {
  try {
    const { caseId } = req.params;
    const { rating, reviewText } = req.body;
    const userId = req.auth?.userId;
    const userName = req.headers['x-demo-user-name'] || 'Anonymous';

    if (!userId || userId === 'demo-user') {
      return res.status(401).json({ success: false, error: 'Authentication required to rate.' });
    }

    const ratingVal = parseInt(rating);
    if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be an integer between 1 and 5.' });
    }

    // Check if the user already rated this case
    const existing = db.findOne('case_ratings', r => r.caseId === caseId && r.userId === userId);

    if (existing) {
      // Update existing rating
      const updated = db.update('case_ratings', existing.id, {
        rating: ratingVal,
        reviewText: reviewText?.trim() || ''
      });
      return res.json({ success: true, rating: updated, isUpdate: true });
    } else {
      // Insert new rating
      const newRating = db.insert('case_ratings', {
        caseId,
        userId,
        userName,
        rating: ratingVal,
        reviewText: reviewText?.trim() || ''
      });
      return res.status(201).json({ success: true, rating: newRating, isUpdate: false });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
