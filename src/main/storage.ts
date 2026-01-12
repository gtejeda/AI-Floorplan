/**
 * Database Storage Layer
 * Initializes and manages SQLite database for Micro Villas Investment Platform
 */

import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import dbSchema from './db-schema.sql?raw';

const DB_NAME = 'microvillas.db';

let dbInstance: Database.Database | null = null;

/**
 * Initialize SQLite database with schema
 * Creates database file in user data directory on first launch
 */
export function initializeDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = path.join(app.getPath('userData'), 'microvillas.db');
  const db = new Database(dbPath, { verbose: console.log });

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Check if database needs initialization
  let needsInitialization = false;
  try {
    const versionCheck = db.prepare(
      "SELECT value FROM app_metadata WHERE key = 'schema_version'"
    ).get();

    if (!versionCheck) {
      needsInitialization = true;
    }
  } catch (error) {
    // Table doesn't exist - first launch
    needsInitialization = true;
  }

  if (needsInitialization) {
    // First launch - initialize database
    db.exec(dbSchema);
    console.log('[Database] Schema initialized successfully');
  }

  console.log('[Database] Location:', dbPath);
  dbInstance = db;
  return db;
}

/**
 * Get database instance (singleton pattern)
 */
export function getDatabase(): Database.Database {
  if (!dbInstance) {
    return initializeDatabase();
  }
  return dbInstance;
}

export default getDatabase;
