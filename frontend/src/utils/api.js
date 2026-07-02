const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

async function req(path, opts = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...opts.headers
  };

  const userId = localStorage.getItem('ns_user_id');
  const userName = localStorage.getItem('ns_user_name');
  const accessToken = localStorage.getItem('ns_access_token');

  if (userId) headers['X-Demo-User-Id'] = userId;
  if (userName) headers['X-Demo-User-Name'] = userName;
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function healthCheck() {
  try {
    return await req('/health');
  } catch {
    const root = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
      : '';
    const res = await fetch(`${root}/health`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Health check failed');
    return data;
  }
}

export const api = {
  // Health check – tells us if AI is available
  health: () => healthCheck().catch(() => ({ status: 'offline', aiEnabled: false })),

  // Cases
  getCases: (type, difficulty) => {
    const p = new URLSearchParams();
    if (type) p.set('type', type);
    if (difficulty) p.set('difficulty', difficulty);
    return req(`/cases?${p}`);
  },
  getCase:   (id)   => req(`/cases/${id}`),
  saveCase:  (body) => req('/cases', { method: 'POST', body: JSON.stringify(body) }),
  deleteCase:(id)   => req(`/cases/${id}`, { method: 'DELETE' }),

  // Rooms / multiplayer
  createRoom: (caseData) => req('/rooms/create', { method: 'POST', body: JSON.stringify({ caseData }) }),
  getRoom: (roomId) => req(`/rooms/${roomId}`),
  joinRoom: (roomId, seat, participantName) => req(`/rooms/${roomId}/join`, { method: 'POST', body: JSON.stringify({ seat, participantName }) }),
  startRoom: (roomId) => req(`/rooms/${roomId}/start`, { method: 'POST', body: JSON.stringify({}) }),
  roomTurn: (roomId, seat, participantName, message) => req(`/rooms/${roomId}/turn`, { method: 'POST', body: JSON.stringify({ seat, participantName, message }) }),
  roomJudgment: (roomId) => req(`/rooms/${roomId}/judgment`, { method: 'POST', body: JSON.stringify({}) }),

  // AI
  generateCase:      (caseType, difficulty)                              => req('/ai/generate-case', { method: 'POST', body: JSON.stringify({ caseType, difficulty }) }),
  judgeRespond:      (history, argument, language)                                 => req('/ai/judge-respond', { method: 'POST', body: JSON.stringify({ history, argument, language }) }),
  lawyerRespond:     (caseTitle, caseSummary, history, userArgument, lawyerSide, language) => req('/ai/lawyer-respond', { method: 'POST', body: JSON.stringify({ caseTitle, caseSummary, history, userArgument, lawyerSide, language }) }),
  getPrecedents:     (context, language)                                           => req('/ai/precedents', { method: 'POST', body: JSON.stringify({ context, language }) }),
  handleObjection:   (objectionType, context, raisedBy)                 => req('/ai/objection', { method: 'POST', body: JSON.stringify({ objectionType, context, raisedBy }) }),
  analyzePerformance:(sessionData)                                       => req('/ai/analyze-performance', { method: 'POST', body: JSON.stringify({ sessionData }) }),
  getLegalSuggestions:(argument, caseSummary)                           => req('/ai/legal-suggestions', { method: 'POST', body: JSON.stringify({ argument, caseSummary }) }),
  witnessAnswer:     (witness, question, history)                        => req('/ai/witness-answer', { method: 'POST', body: JSON.stringify({ witness, question, history }) }),
  evaluateDraft:     (documentType, content)                             => req('/ai/evaluate-draft', { method: 'POST', body: JSON.stringify({ documentType, content }) }),
  deliverJudgment:   (caseTitle, prosecutionPoints, defensePoints)       => req('/ai/deliver-judgment', { method: 'POST', body: JSON.stringify({ caseTitle, prosecutionPoints, defensePoints }) }),

  // Real Database / Engagement API
  getPosts: (category) => {
    const p = new URLSearchParams();
    if (category) p.set('category', category);
    return req(`/community/posts?${p}`);
  },
  createPost: (post) => req('/community/posts', { method: 'POST', body: JSON.stringify(post) }),
  likePost: (postId) => req(`/community/posts/${postId}/like`, { method: 'POST' }),
  getComments: (postId) => req(`/community/posts/${postId}/comments`),
  addComment: (postId, content) => req(`/community/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),

  getCaseRatings: (caseId) => req(`/ratings/cases/${caseId}`),
  rateCase: (caseId, rating, reviewText) => req(`/ratings/cases/${caseId}`, { method: 'POST', body: JSON.stringify({ rating, reviewText }) }),

  getStats: () => req('/stats/me'),
  getLeaderboard: () => req('/stats/leaderboard'),
  savePerformance: (performanceData) => req('/stats/performances', { method: 'POST', body: JSON.stringify(performanceData) }),
  getAdminLogs: () => req('/stats/admin/logs'),
  getActiveRooms: () => req('/stats/active-rooms'),
};

export default api;
