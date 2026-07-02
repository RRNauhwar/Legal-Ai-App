import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.resolve(__dirname, '../data/db.json');

// Initialize database file structure
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
      audit_logs: []
    };
    this.read();
  }

  read() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const content = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(content);
        // Ensure all collections exist
        this.data = {
          performances: parsed.performances || [],
          posts: parsed.posts || [],
          post_likes: parsed.post_likes || [],
          post_comments: parsed.post_comments || [],
          case_ratings: parsed.case_ratings || [],
          audit_logs: parsed.audit_logs || []
        };
      } catch (e) {
        console.error('[db] Error reading database file, using fallback empty state:', e);
      }
    } else {
      this.write();
    }
  }

  write() {
    try {
      // Use synchronous write for simple blocking integrity
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('[db] Error writing database file:', e);
    }
  }

  getCollection(collectionName) {
    this.read();
    return this.data[collectionName] || [];
  }

  insert(collectionName, item) {
    this.read();
    if (!this.data[collectionName]) {
      this.data[collectionName] = [];
    }
    const newItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      createdAt: new Date().toISOString(),
      ...item
    };
    this.data[collectionName].push(newItem);
    this.write();
    return newItem;
  }

  update(collectionName, id, updates) {
    this.read();
    const collection = this.data[collectionName] || [];
    const index = collection.findIndex((item) => item.id === id);
    if (index === -1) return null;
    
    collection[index] = { ...collection[index], ...updates, updatedAt: new Date().toISOString() };
    this.write();
    return collection[index];
  }

  delete(collectionName, id) {
    this.read();
    const collection = this.data[collectionName] || [];
    const initialLen = collection.length;
    this.data[collectionName] = collection.filter((item) => item.id !== id);
    if (this.data[collectionName].length !== initialLen) {
      this.write();
      return true;
    }
    return false;
  }

  findOne(collectionName, queryFn) {
    this.read();
    return (this.data[collectionName] || []).find(queryFn) || null;
  }

  findMany(collectionName, queryFn) {
    this.read();
    const list = this.data[collectionName] || [];
    return queryFn ? list.filter(queryFn) : list;
  }
}

export const db = new JSONDatabase();
export default db;
