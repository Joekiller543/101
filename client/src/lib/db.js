import { openDB } from 'idb';

const DB_NAME = 'WebToEpubDB';
const STORE_NAME = 'chapters';

// Initialize IndexedDB with KeyPath [jobId, url] to prevent collision
// Version 3: Added 'jobId' index for efficient deletion
export const initDB = async () => {
  return openDB(DB_NAME, 3, {
    upgrade(db, oldVersion) {
      if (oldVersion < 2) {
        if (db.objectStoreNames.contains(STORE_NAME)) {
          db.deleteObjectStore(STORE_NAME);
        }
        const store = db.createObjectStore(STORE_NAME, { keyPath: ['jobId', 'url'] });
        store.createIndex('jobId', 'jobId', { unique: false });
      } else if (oldVersion < 3) {
        // Just add index to existing store
        const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
        store.createIndex('jobId', 'jobId', { unique: false });
      }
    },
  });
};

/**
 * Saves a chapter linked to a specific job session.
 * @param {object} chapterData - { url, title, content, ... }
 * @param {string} jobId - The current session/job ID
 */
export const saveChapter = async (chapterData, jobId) => {
  const db = await initDB();
  // Merge jobId into the record
  await db.put(STORE_NAME, { ...chapterData, jobId });
};

/**
 * Retrieves a chapter by job ID and URL.
 */
export const getChapter = async (jobId, url) => {
  const db = await initDB();
  return db.get(STORE_NAME, [jobId, url]);
};

/**
 * Clears chapters for a specific job.
 * Optimized using 'jobId' index.
 */
export const deleteJobChapters = async (jobId) => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index('jobId');

  // Optimized deletion: Get keys from index and delete
  // IDBKeyRange.only(jobId) restricts cursor/keys to this job only
  const keys = await index.getAllKeys(IDBKeyRange.only(jobId));
  
  // Delete all keys found in index
  await Promise.all(keys.map(key => store.delete(key)));
  
  await tx.done;
};

export const clearAllChapters = async () => {
  const db = await initDB();
  await db.clear(STORE_NAME);
};