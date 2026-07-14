// db/jsonDb.js
// Lightweight file-based JSON database. Pure JS, zero native dependencies,
// so it installs and runs anywhere `node` runs (no build tools required).

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'hrms.json');

const DEFAULT_DATA = {
  users: [],
  attendance: [],
  leaves: [],
  leaveBalances: [],
  salaries: [],
  counters: { user: 0, attendance: 0, leave: 0 }
};

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
  }
}

function load() {
  ensureFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  try {
    const parsed = JSON.parse(raw);
    // Backfill any missing top-level keys (forward-compatible)
    return { ...DEFAULT_DATA, ...parsed };
  } catch (e) {
    // Corrupt file safety net: reset rather than crash the server
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function nextId(data, kind) {
  data.counters[kind] = (data.counters[kind] || 0) + 1;
  return data.counters[kind];
}

module.exports = { load, save, nextId, DATA_FILE };
