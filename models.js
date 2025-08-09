/*
 * In‑memory data models for the Fansnap platform.
 *
 * This module contains simple JavaScript arrays to store users, posts, subscriptions,
 * store items, orders, referral codes, messages and tips.  It is deliberately
 * simplified for demonstration purposes.  In a production system you would
 * replace these data structures with persistent storage and include proper
 * validation, migrations and indexing.
 */

import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

// Collections
const users = [];
const posts = [];
const subscriptions = [];
const storeItems = [];
const orders = [];
const referrals = [];
const messages = [];
const tips = [];

// User CRUD
export async function createUser({ username, email, password, role = 'subscriber' }) {
  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id,
    username,
    email,
    passwordHash,
    role,
    createdAt: new Date(),
    profile: {
      bio: '',
      profilePicture: '',
      banner: '',
      socialLinks: {},
      subscriptionPlans: []
    }
  };
  users.push(user);
  return { id: user.id, username: user.username, role: user.role };
}

export async function authenticate(username, password) {
  const user = users.find(u => u.username === username);
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  return { id: user.id, username: user.username, role: user.role };
}

export function getUserById(id) {
  return users.find(u => u.id === id) || null;
}

export function getUserByUsername(username) {
  return users.find(u => u.username === username) || null;
}

// Post CRUD
export function createPost({ creatorId, content, type = 'text', price = 0, subscriberOnly = false, tags = [] }) {
  const id = uuidv4();
  const post = {
    id,
    creatorId,
    content,
    type,
    price,
    subscriberOnly,
    tags,
    createdAt: new Date(),
    likes: 0,
    views: 0
  };
  posts.push(post);
  return post;
}

export function listPosts({ creatorId, subscriberId }) {
  return posts.filter(p => {
    if (p.creatorId !== creatorId) return false;
    if (!p.subscriberOnly) return true;
    // Only return subscriber‑only posts if the requesting user has an active subscription
    if (!subscriberId) return false;
    return subscriptions.some(s => s.creatorId === creatorId && s.subscriberId === subscriberId && s.status === 'active');
  });
}

// Subscriptions
export function subscribe({ subscriberId, creatorId, plan = 'monthly' }) {
  const id = uuidv4();
  const sub = { id, subscriberId, creatorId, plan, status: 'active', createdAt: new Date() };
  subscriptions.push(sub);
  return sub;
}

export function listSubscriptions(subscriberId) {
  return subscriptions.filter(s => s.subscriberId === subscriberId);
}

// Store and orders
export function createStoreItem({ creatorId, name, description, price }) {
  const id = uuidv4();
  const item = { id, creatorId, name, description, price, createdAt: new Date() };
  storeItems.push(item);
  return item;
}

export function listStoreItems(creatorId) {
  return storeItems.filter(item => item.creatorId === creatorId);
}

export function findStoreItemById(id) {
  return storeItems.find(item => item.id === id) || null;
}

export function createOrder({ itemId, buyerId }) {
  const id = uuidv4();
  const order = { id, itemId, buyerId, status: 'pending', createdAt: new Date() };
  orders.push(order);
  return order;
}

export function listOrdersByBuyer(buyerId) {
  return orders.filter(o => o.buyerId === buyerId);
}

// Referral / Affiliate
export function createReferral({ creatorId, affiliateId, code, commission = 0.2 }) {
  const id = uuidv4();
  const ref = { id, creatorId, affiliateId, code, commission, signups: 0, earnings: 0, createdAt: new Date() };
  referrals.push(ref);
  return ref;
}

export function getReferralByCode(code) {
  return referrals.find(r => r.code === code) || null;
}

export function recordReferralSignup(code) {
  const ref = referrals.find(r => r.code === code);
  if (ref) {
    ref.signups += 1;
  }
  return ref;
}

export function addReferralEarning(code, amount) {
  const ref = referrals.find(r => r.code === code);
  if (ref) {
    ref.earnings += amount * ref.commission;
  }
  return ref;
}

// Messaging
export function sendMessage({ senderId, recipientId, content }) {
  const id = uuidv4();
  const message = { id, senderId, recipientId, content, createdAt: new Date() };
  messages.push(message);
  return message;
}

export function listConversations(userId) {
  // Return unique conversation partners
  const partners = new Set();
  messages.forEach(msg => {
    if (msg.senderId === userId) partners.add(msg.recipientId);
    if (msg.recipientId === userId) partners.add(msg.senderId);
  });
  return Array.from(partners).map(id => getUserById(id));
}

export function listMessagesBetween(a, b) {
  return messages.filter(m => {
    return (m.senderId === a && m.recipientId === b) || (m.senderId === b && m.recipientId === a);
  });
}

// Tips / gifts
export function sendTip({ senderId, recipientId, amount }) {
  const id = uuidv4();
  const tip = { id, senderId, recipientId, amount, createdAt: new Date() };
  tips.push(tip);
  return tip;
}

export function listTipsReceived(creatorId) {
  return tips.filter(t => t.recipientId === creatorId);
}

// Admin helpers
export function getAllUsers() {
  return users;
}

export function getAllPosts() {
  return posts;
}

export function deletePostById(postId) {
  const index = posts.findIndex(p => p.id === postId);
  if (index !== -1) {
    posts.splice(index, 1);
    return true;
  }
  return false;
}

// Search functionality (basic)
export function searchUsers(query) {
  const q = query.toLowerCase();
  return users.filter(u => u.username.toLowerCase().includes(q) || (u.profile.bio && u.profile.bio.toLowerCase().includes(q)));
}

export function searchPosts(query) {
  const q = query.toLowerCase();
  return posts.filter(p => p.content.toLowerCase().includes(q) || p.tags.some(tag => tag.toLowerCase().includes(q)));
}