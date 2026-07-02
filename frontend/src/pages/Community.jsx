import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../utils/api.js';

export default function Community() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('discussions');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form States for New Post
  const [showPostForm, setShowPostForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);

  // Comments State
  const [openCommentsPostId, setOpenCommentsPostId] = useState(null);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    loadPosts();
    setOpenCommentsPostId(null);
    setShowPostForm(false);
  }, [activeTab]);

  async function loadPosts() {
    setLoading(true);
    try {
      const data = await api.getPosts(activeTab);
      setPosts(data.posts || []);
    } catch (err) {
      console.error('[Community] Load posts error:', err);
      toast.error('Failed to load posts.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePost(e) {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('Title and content are required.');
      return;
    }
    setSubmittingPost(true);
    try {
      await api.createPost({
        category: activeTab,
        title: newTitle.trim(),
        content: newContent.trim()
      });
      toast.success('Post created successfully!');
      setNewTitle('');
      setNewContent('');
      setShowPostForm(false);
      loadPosts();
    } catch (err) {
      toast.error(err.message || 'Failed to create post.');
    } finally {
      setSubmittingPost(false);
    }
  }

  async function handleLike(postId) {
    if (!user) {
      toast.error('You must be logged in to upvote posts.');
      return;
    }
    try {
      const res = await api.likePost(postId);
      toast.success(res.liked ? 'Upvoted!' : 'Upvote removed');
      loadPosts(); // refresh post list to see new like count
    } catch (err) {
      toast.error(err.message || 'Error updating upvote.');
    }
  }

  async function toggleComments(postId) {
    if (openCommentsPostId === postId) {
      setOpenCommentsPostId(null);
      setComments([]);
      return;
    }
    setOpenCommentsPostId(postId);
    setLoadingComments(true);
    setNewCommentText('');
    try {
      const res = await api.getComments(postId);
      setComments(res.comments || []);
    } catch (err) {
      toast.error('Failed to load comments.');
    } finally {
      setLoadingComments(false);
    }
  }

  async function handleAddComment(e, postId) {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    setSubmittingComment(true);
    try {
      await api.addComment(postId, newCommentText.trim());
      setNewCommentText('');
      // Reload comments
      const res = await api.getComments(postId);
      setComments(res.comments || []);
      // Update comments count on post
      setPosts(posts.map(p => p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p));
      toast.success('Comment added!');
    } catch (err) {
      toast.error(err.message || 'Failed to add comment.');
    } finally {
      setSubmittingComment(false);
    }
  }

  return (
    <div className="fade-up">
      <div className="pg-header">
        <div>
          <div className="eyebrow">Collaboration & Network</div>
          <h1>College Forums</h1>
          <p>Debate with peers, represent your Law College, and challenge other students to live mock trials.</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'discussions' ? 'active' : ''}`} onClick={() => setActiveTab('discussions')}>General Discussions</button>
        <button className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`} onClick={() => setActiveTab('groups')}>Law College Groups</button>
        <button className={`tab-btn ${activeTab === 'challenges' ? 'active' : ''}`} onClick={() => setActiveTab('challenges')}>P2P Challenges</button>
      </div>

      {/* Write New Post Section */}
      <div className="mb-3">
        {showPostForm ? (
          <form className="card-hi" onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="eyebrow">Create a new {activeTab === 'discussions' ? 'discussion' : activeTab === 'groups' ? 'group' : 'challenge'}</div>
            <input 
              className="input" 
              type="text" 
              placeholder="Title" 
              value={newTitle} 
              onChange={e => setNewTitle(e.target.value)}
              disabled={submittingPost}
            />
            <textarea 
              className="textarea" 
              placeholder="Write your details here..." 
              rows="4"
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              disabled={submittingPost}
            />
            <div className="flex gap-1">
              <button className="btn btn-primary" type="submit" disabled={submittingPost}>
                {submittingPost ? 'Posting...' : 'Post'}
              </button>
              <button className="btn btn-outline" type="button" onClick={() => setShowPostForm(false)} disabled={submittingPost}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button className="btn btn-primary" onClick={() => setShowPostForm(true)}>
            + Start a {activeTab === 'discussions' ? 'Discussion' : activeTab === 'groups' ? 'Group' : 'Challenge'}
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '30vh' }}>
          <div className="flex items gap-2">
            <span className="spin" />
            Loading forums...
          </div>
        </div>
      ) : (
        <div className="g1" style={{ display: 'grid', gap: '1rem' }}>
          {posts.length > 0 ? (
            posts.map((post) => (
              <div key={post.id} className="card-hi">
                <div className="flex between items mb-1">
                  <span className={`badge ${post.category === 'groups' ? 'badge-blue' : post.category === 'challenges' ? 'badge-red' : 'badge-muted'}`}>
                    {post.category === 'groups' ? 'Group' : post.category === 'challenges' ? 'Challenge' : 'Discussion'}
                  </span>
                  <span className="text-xs text-muted" style={{ fontFamily: 'var(--f-mono)' }}>
                    By {post.userName} · {new Date(post.createdAt).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h3 className="bold text-cream" style={{ fontSize: '1.15rem' }}>{post.title}</h3>
                <p className="text-sm text-prose mt-1" style={{ whiteSpace: 'pre-wrap' }}>{post.content}</p>
                
                <div className="flex gap-1 mt-2">
                  <button className="btn btn-outline btn-sm" onClick={() => toggleComments(post.id)}>
                    💬 {post.commentsCount} Replies
                  </button>
                  <button 
                    className={`btn btn-sm ${post.userLiked ? 'btn-primary' : 'btn-ghost'}`} 
                    onClick={() => handleLike(post.id)}
                  >
                    ⬆ Upvote ({post.likesCount})
                  </button>
                </div>

                {/* Inline Comments Section */}
                {openCommentsPostId === post.id && (
                  <div className="mt-3 card" style={{ background: 'var(--panel-strong)', border: '1px solid var(--border)', padding: '1rem' }}>
                    <div className="text-xs text-muted mb-2">Replies ({comments.length})</div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto', marginBottom: '1rem' }}>
                      {loadingComments ? (
                        <div className="text-xs text-muted">Loading replies...</div>
                      ) : comments.length > 0 ? (
                        comments.map(c => (
                          <div key={c.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.4rem 0.6rem', borderRadius: '4px' }}>
                            <div className="flex between items">
                              <strong className="text-cream" style={{ fontSize: '0.75rem' }}>{c.userName}</strong>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                {new Date(c.createdAt).toLocaleDateString('en-IN')}
                              </span>
                            </div>
                            <p className="text-xs" style={{ marginTop: '0.2rem', color: 'rgba(250,248,244,0.8)' }}>{c.content}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-muted" style={{ padding: '0.5rem 0' }}>No replies yet. Be the first to answer!</div>
                      )}
                    </div>

                    <form onSubmit={(e) => handleAddComment(e, post.id)} className="flex gap-1">
                      <input 
                        className="input" 
                        type="text" 
                        placeholder="Write a reply..." 
                        style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                        value={newCommentText}
                        onChange={e => setNewCommentText(e.target.value)}
                        disabled={submittingComment}
                      />
                      <button className="btn btn-primary btn-sm" type="submit" disabled={submittingComment}>
                        Reply
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💬</div>
              <p>No forums posted under {activeTab === 'discussions' ? 'discussions' : activeTab === 'groups' ? 'groups' : 'challenges'} yet.</p>
              <p className="text-xs mt-1">Be the first to share something with the community!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
