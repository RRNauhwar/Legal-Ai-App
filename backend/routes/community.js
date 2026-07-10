import express from 'express';
import db from '../services/db.js';

const router = express.Router();

// GET all posts, optionally filtered by category
router.get('/posts', (req, res) => {
  try {
    const { category } = req.query;
    const currentUserId = req.auth?.userId || null;

    let posts = db.getCollection('posts');
    if (category) {
      posts = posts.filter(p => p.category === category);
    }

    // Sort by createdAt descending
    posts = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Map likes count and comment count
    const enrichedPosts = posts.map(post => {
      const likes = db.findMany('post_likes', l => l.postId === post.id);
      const comments = db.findMany('post_comments', c => c.postId === post.id);
      const userLiked = currentUserId ? likes.some(l => l.userId === currentUserId) : false;

      return {
        ...post,
        likesCount: likes.length,
        commentsCount: comments.length,
        userLiked
      };
    });

    res.json({ success: true, posts: enrichedPosts });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST a new discussion
router.post('/posts', (req, res) => {
  try {
    const { category, title, content } = req.body;
    const userId = req.auth?.userId;
    const userName = req.headers['x-demo-user-name'] || 'Anonymous';

    if (!userId || userId === 'demo-user') {
      return res.status(401).json({ success: false, error: 'Authentication required to post.' });
    }

    if (!title?.trim() || !content?.trim() || !category?.trim()) {
      return res.status(400).json({ success: false, error: 'Category, title, and content are required.' });
    }

    if (title.length > 150) {
      return res.status(400).json({ success: false, error: 'Title cannot exceed 150 characters.' });
    }

    if (content.length > 5000) {
      return res.status(400).json({ success: false, error: 'Content cannot exceed 5000 characters.' });
    }

    const newPost = db.insert('posts', {
      userId,
      userName,
      category,
      title: title.trim(),
      content: content.trim()
    });

    res.status(201).json({ success: true, post: newPost });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST toggle like/upvote on a post
router.post('/posts/:id/like', (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.auth?.userId;

    if (!userId || userId === 'demo-user') {
      return res.status(401).json({ success: false, error: 'Authentication required to upvote.' });
    }

    const post = db.findOne('posts', p => p.id === postId);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found.' });
    }

    // Check if user already liked this post
    const existingLike = db.findOne('post_likes', l => l.postId === postId && l.userId === userId);
    
    if (existingLike) {
      // Toggle off: remove like
      db.delete('post_likes', existingLike.id);
      res.json({ success: true, liked: false });
    } else {
      // Toggle on: add like
      db.insert('post_likes', { postId, userId });
      res.json({ success: true, liked: true });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET all comments for a post
router.get('/posts/:id/comments', (req, res) => {
  try {
    const postId = req.params.id;
    let comments = db.findMany('post_comments', c => c.postId === postId);
    
    // Sort oldest first
    comments = [...comments].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    res.json({ success: true, comments });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST a comment on a post
router.post('/posts/:id/comments', (req, res) => {
  try {
    const postId = req.params.id;
    const { content } = req.body;
    const userId = req.auth?.userId;
    const userName = req.headers['x-demo-user-name'] || 'Anonymous';

    if (!userId || userId === 'demo-user') {
      return res.status(401).json({ success: false, error: 'Authentication required to comment.' });
    }

    if (!content?.trim()) {
      return res.status(400).json({ success: false, error: 'Comment content cannot be empty.' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ success: false, error: 'Comment cannot exceed 1000 characters.' });
    }

    const post = db.findOne('posts', p => p.id === postId);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found.' });
    }

    const comment = db.insert('post_comments', {
      postId,
      userId,
      userName,
      content: content.trim()
    });

    res.status(201).json({ success: true, comment });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
