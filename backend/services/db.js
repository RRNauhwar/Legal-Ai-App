import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.resolve(__dirname, '../data/db.json');

// Initialize database directory structure
const dir = path.dirname(DB_FILE);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

class JSONDatabase {
  constructor() {
    this.data = {
      performances: [],
      posts: [],
      post_likes: [],
      post_comments: [],
      case_ratings: [],
      audit_logs: [],
      academy_progress: [],
      academy_campaign: [],
      academy_analytics: []
    };
    this.writeQueue = Promise.resolve();
    this.readSync();
  }

  readSync() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const content = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(content);
        this.data = {
          performances: parsed.performances || [],
          posts: parsed.posts || [],
          post_likes: parsed.post_likes || [],
          post_comments: parsed.post_comments || [],
          case_ratings: parsed.case_ratings || [],
          audit_logs: parsed.audit_logs || [],
          academy_progress: parsed.academy_progress || [],
          academy_campaign: parsed.academy_campaign || [],
          academy_analytics: parsed.academy_analytics || []
        };
      } catch (e) {
        console.error('[db] Error reading database file, using fallback empty state:', e);
      }
    } else {
      this.persistAsync();
    }
  }

  persistAsync() {
    // Queue the write operation asynchronously to avoid event loop block and write collisions
    this.writeQueue = this.writeQueue.then(async () => {
      try {
        await fs.promises.writeFile(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
      } catch (e) {
        console.error('[db] Error writing database file asynchronously:', e);
      }
    });
    return this.writeQueue;
  }

  getCollection(collectionName) {
    return this.data[collectionName] || [];
  }

  insert(collectionName, item) {
    if (!this.data[collectionName]) {
      this.data[collectionName] = [];
    }
    const newItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      createdAt: new Date().toISOString(),
      ...item
    };
    this.data[collectionName].push(newItem);
    this.persistAsync();
    return newItem;
  }

  update(collectionName, id, updates) {
    const collection = this.data[collectionName] || [];
    const index = collection.findIndex((item) => item.id === id);
    if (index === -1) return null;
    
    collection[index] = { ...collection[index], ...updates, updatedAt: new Date().toISOString() };
    this.persistAsync();
    return collection[index];
  }

  delete(collectionName, id) {
    const collection = this.data[collectionName] || [];
    const initialLen = collection.length;
    this.data[collectionName] = collection.filter((item) => item.id !== id);
    if (this.data[collectionName].length !== initialLen) {
      this.persistAsync();
      return true;
    }
    return false;
  }

  findOne(collectionName, queryFn) {
    return (this.data[collectionName] || []).find(queryFn) || null;
  }

  findMany(collectionName, queryFn) {
    const list = this.data[collectionName] || [];
    return queryFn ? list.filter(queryFn) : list;
  }
}

export const db = new JSONDatabase();
export default db;
