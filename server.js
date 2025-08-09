/*
 * Fansnap platform server.
 *
 * This Express application exposes JSON API endpoints implementing the core
 * functionality of an OnlyFans‑style platform.  It supports user registration
 * and login, profile management, posting content, subscriptions, store items and
 * orders, direct messaging, tipping, affiliate/referral tracking and basic
 * search.  All data is stored in memory for demonstration purposes.
 *
 * IMPORTANT: This code is a prototype.  It does not implement persistent
 * storage, payment processing, file uploads, rate limiting or security
 * protections such as CSRF tokens.  Do not deploy this code as‑is in a
 * production environment.
 */

import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

import {
  createUser,
  authenticate,
  getUserById,
  getUserByUsername,
  createPost,
  listPosts,
  subscribe,
  listSubscriptions,
  createStoreItem,
  listStoreItems,
  findStoreItemById,
  createOrder,
  listOrdersByBuyer,
  createReferral,
  getReferralByCode,
  recordReferralSignup,
  addReferralEarning,
  sendMessage,
  listConversations,
  listMessagesBetween,
  sendTip,
  listTipsReceived,
  searchUsers,
  searchPosts
  ,
  getAllUsers,
  deletePostById
} from './models.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(session({
  secret: 'super secret fansnap session',
  resave: false,
  saveUninitialized: false,
}));

// Attach user to request if logged in
app.use((req, res, next) => {
  if (req.session && req.session.userId) {
    const user = getUserById(req.session.userId);
    if (user) {
      req.user = user;
    }
  }
  next();
});

/* Authentication and profile */

// Register
app.post('/api/register', async (req, res) => {
  const { username, email, password, role = 'subscriber' } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (getUserByUsername(username)) {
    return res.status(409).json({ error: 'Username already exists' });
  }
  try {
    const user = await createUser({ username, email, password, role });
    req.session.userId = user.id;
    res.json({ message: 'Registered', user });
  } catch (e) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }
  const user = await authenticate(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  req.session.userId = user.id;
  res.json({ message: 'Logged in', user });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out' });
  });
});

// Get current user profile
app.get('/api/profile', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const { id, username, role, profile } = req.user;
  res.json({ user: { id, username, role, profile } });
});

// Update profile (bio, links, etc.)
app.put('/api/profile', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const { bio, profilePicture, banner, socialLinks, subscriptionPlans } = req.body;
  const profile = req.user.profile;
  if (typeof bio === 'string') profile.bio = bio;
  if (typeof profilePicture === 'string') profile.profilePicture = profilePicture;
  if (typeof banner === 'string') profile.banner = banner;
  if (typeof socialLinks === 'object') profile.socialLinks = socialLinks;
  if (Array.isArray(subscriptionPlans)) profile.subscriptionPlans = subscriptionPlans;
  res.json({ message: 'Profile updated', profile });
});

/* Content creation and subscriptions */

// Create post (creator)
app.post('/api/posts', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (req.user.role !== 'creator') return res.status(403).json({ error: 'Only creators can post' });
  const { content, type = 'text', price = 0, subscriberOnly = false, tags = [] } = req.body;
  if (!content) return res.status(400).json({ error: 'Missing content' });
  const post = createPost({ creatorId: req.user.id, content, type, price, subscriberOnly, tags });
  res.json({ post });
});

// List posts for creator
app.get('/api/posts/:creatorUsername', (req, res) => {
  const { creatorUsername } = req.params;
  const creator = getUserByUsername(creatorUsername);
  if (!creator || creator.role !== 'creator') {
    return res.status(404).json({ error: 'Creator not found' });
  }
  const subscriberId = req.user ? req.user.id : null;
  const posts = listPosts({ creatorId: creator.id, subscriberId });
  res.json({ posts });
});

// Subscribe to a creator
app.post('/api/subscribe/:creatorUsername', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const { creatorUsername } = req.params;
  const creator = getUserByUsername(creatorUsername);
  if (!creator || creator.role !== 'creator') {
    return res.status(404).json({ error: 'Creator not found' });
  }
  if (creator.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot subscribe to yourself' });
  }
  const subscription = subscribe({ subscriberId: req.user.id, creatorId: creator.id, plan: req.body.plan || 'monthly' });
  res.json({ subscription });
});

// List subscriptions
app.get('/api/subscriptions', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const subs = listSubscriptions(req.user.id);
  res.json({ subscriptions: subs });
});

/* Store and orders */

// Create store item (creator)
app.post('/api/store/:creatorUsername', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const { creatorUsername } = req.params;
  const creator = getUserByUsername(creatorUsername);
  if (!creator || creator.id !== req.user.id) {
    return res.status(403).json({ error: 'Not authorised to add items' });
  }
  const { name, description, price } = req.body;
  if (!name || typeof price !== 'number') return res.status(400).json({ error: 'Missing fields' });
  const item = createStoreItem({ creatorId: req.user.id, name, description: description || '', price });
  res.json({ item });
});

// List store items for a creator
app.get('/api/store/:creatorUsername', (req, res) => {
  const { creatorUsername } = req.params;
  const creator = getUserByUsername(creatorUsername);
  if (!creator) return res.status(404).json({ error: 'Creator not found' });
  const items = listStoreItems(creator.id);
  res.json({ items });
});

// Create order
app.post('/api/order/:itemId', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const { itemId } = req.params;
  const item = findStoreItemById(itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.creatorId === req.user.id) {
    return res.status(400).json({ error: 'Cannot order your own item' });
  }
  // Payment integration would occur here.  For now we mark as pending.
  const order = createOrder({ itemId: item.id, buyerId: req.user.id });
  res.json({ order });
});

// List orders for current user
app.get('/api/orders', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const orders = listOrdersByBuyer(req.user.id);
  res.json({ orders });
});

/* Affiliate / referral */

// Create a referral code (creator or affiliate)
app.post('/api/referral', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const { creatorId = req.user.id, code, commission } = req.body;
  if (!code) return res.status(400).json({ error: 'Missing code' });
  const ref = createReferral({ creatorId, affiliateId: req.user.id, code, commission: commission || 0.2 });
  res.json({ referral: ref });
});

// Record a signup via referral code
app.post('/api/referral/:code/signup', (req, res) => {
  const { code } = req.params;
  const ref = recordReferralSignup(code);
  if (!ref) return res.status(404).json({ error: 'Referral code not found' });
  res.json({ referral: ref });
});

// Add referral earnings
app.post('/api/referral/:code/earn', (req, res) => {
  const { code } = req.params;
  const { amount } = req.body;
  if (typeof amount !== 'number') return res.status(400).json({ error: 'Missing amount' });
  const ref = addReferralEarning(code, amount);
  if (!ref) return res.status(404).json({ error: 'Referral code not found' });
  res.json({ referral: ref });
});

/* Messaging */

// Send a direct message
app.post('/api/message/send', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const { recipientUsername, content } = req.body;
  if (!recipientUsername || !content) return res.status(400).json({ error: 'Missing fields' });
  const recipient = getUserByUsername(recipientUsername);
  if (!recipient) return res.status(404).json({ error: 'Recipient not found' });
  const message = sendMessage({ senderId: req.user.id, recipientId: recipient.id, content });
  res.json({ message });
});

// List conversations for current user
app.get('/api/message/conversations', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const partners = listConversations(req.user.id);
  res.json({ conversations: partners });
});

// Get messages between current user and another user
app.get('/api/message/thread/:username', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const { username } = req.params;
  const other = getUserByUsername(username);
  if (!other) return res.status(404).json({ error: 'User not found' });
  const msgs = listMessagesBetween(req.user.id, other.id);
  res.json({ messages: msgs });
});

/* Tips and gifts */

// Send a tip to a creator
app.post('/api/tip/:creatorUsername', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const { creatorUsername } = req.params;
  const { amount } = req.body;
  if (typeof amount !== 'number' || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  const creator = getUserByUsername(creatorUsername);
  if (!creator || creator.role !== 'creator') return res.status(404).json({ error: 'Creator not found' });
  if (creator.id === req.user.id) return res.status(400).json({ error: 'Cannot tip yourself' });
  // Payment integration would occur here
  const tip = sendTip({ senderId: req.user.id, recipientId: creator.id, amount });
  res.json({ tip });
});

// List tips received by a creator
app.get('/api/tips/:creatorUsername', (req, res) => {
  const { creatorUsername } = req.params;
  const creator = getUserByUsername(creatorUsername);
  if (!creator || creator.role !== 'creator') return res.status(404).json({ error: 'Creator not found' });
  const received = listTipsReceived(creator.id);
  res.json({ tips: received });
});

/* Search */

app.get('/api/search/users', (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query' });
  const results = searchUsers(q);
  res.json({ results });
});

app.get('/api/search/posts', (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query' });
  const results = searchPosts(q);
  res.json({ results });
});

/* Placeholder endpoints for AI chatbot and live streaming */

// AI chatbot respond (dummy implementation)
app.post('/api/chatbot/respond', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Missing message' });
  // In production you would call a GPT API here and train it on creator data.
  const reply = `AI bot says: I received your message "${message}" but this is a demo.`;
  res.json({ reply });
});

// Live streaming token (dummy)
app.get('/api/live/token', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  // In production, integrate with a streaming provider like Mux to generate a stream key
  const token = uuidv4();
  res.json({ token, note: 'This is a dummy stream token. Integrate with your streaming provider.' });
});

/* Admin APIs */

// Middleware to check admin role
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}

// List all users (admin)
app.get('/api/admin/users', requireAdmin, (req, res) => {
  // Do not return password hashes
  const all = getAllUsers().map(u => ({ id: u.id, username: u.username, role: u.role, email: u.email, createdAt: u.createdAt }));
  res.json({ users: all });
});

// Delete a post (admin)
app.delete('/api/admin/posts/:postId', requireAdmin, (req, res) => {
  const { postId } = req.params;
  const success = deletePostById(postId);
  if (!success) return res.status(404).json({ error: 'Post not found' });
  res.json({ message: 'Post deleted' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Fansnap server running on port ${PORT}`);
});