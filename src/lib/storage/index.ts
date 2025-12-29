import { Storage } from './types';
import { SQLiteStorage } from './sqlite';
import { BlobStorage } from './blobs';

export * from './types';

let storageInstance: Storage | null = null;

export function getStorage(): Storage {
  if (storageInstance) return storageInstance;

  // Use Netlify Blobs in production (on Netlify), SQLite locally
  const isNetlify = process.env.NETLIFY === 'true' || process.env.CONTEXT !== undefined;

  if (isNetlify) {
    console.log('Using Netlify Blobs storage');
    storageInstance = new BlobStorage();
  } else {
    console.log('Using SQLite storage');
    storageInstance = new SQLiteStorage();
  }

  return storageInstance;
}

// For testing or manual override
export function setStorage(storage: Storage): void {
  storageInstance = storage;
}
