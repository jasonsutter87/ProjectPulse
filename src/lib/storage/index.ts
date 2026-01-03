import { Storage } from './types';

export * from './types';

let storageInstance: Storage | null = null;
let storagePromise: Promise<Storage> | null = null;

function isNetlifyEnvironment(): boolean {
  const isLambda = process.cwd().startsWith('/var/task') || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
  const isNetlify = (
    process.env.NETLIFY === 'true' ||
    process.env.CONTEXT !== undefined ||
    process.env.NETLIFY_DEV === 'true' ||
    process.env.DEPLOY_URL !== undefined
  );
  return isLambda || isNetlify;
}

function isVercelEnvironment(): boolean {
  return process.env.VERCEL === '1';
}

function isServerlessEnvironment(): boolean {
  return isNetlifyEnvironment() || isVercelEnvironment();
}

async function createStorage(): Promise<Storage> {
  // Use appropriate storage based on environment
  if (isVercelEnvironment()) {
    const { VercelKVStorage } = await import('./vercel-kv');
    return new VercelKVStorage();
  } else if (isNetlifyEnvironment()) {
    const { BlobStorage } = await import('./blobs');
    return new BlobStorage();
  } else {
    // Local development - use SQLite
    // Dynamic import with webpackIgnore to prevent bundling on serverless
    const { SQLiteStorage } = await import(/* webpackIgnore: true */ './sqlite');
    return new SQLiteStorage();
  }
}

export async function getStorageAsync(): Promise<Storage> {
  if (storageInstance) return storageInstance;

  if (!storagePromise) {
    storagePromise = createStorage().then(storage => {
      storageInstance = storage;
      return storage;
    });
  }

  return storagePromise;
}

// Synchronous version - only works after async initialization or for SQLite in dev
export function getStorage(): Storage {
  if (storageInstance) return storageInstance;

  // In serverless environments, we must use async initialization
  if (isServerlessEnvironment()) {
    throw new Error('Storage not initialized. Use getStorageAsync() in serverless environments.');
  }

  // For local dev, we can do sync initialization with SQLite
  // Use Function constructor to hide require from bundler static analysis
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const dynamicRequire = new Function('modulePath', 'return require(modulePath)');
    const { SQLiteStorage } = dynamicRequire('./sqlite');
    storageInstance = new SQLiteStorage();
    return storageInstance as Storage;
  } catch {
    throw new Error('SQLite storage not available');
  }
}

// For testing or manual override
export function setStorage(storage: Storage): void {
  storageInstance = storage;
  storagePromise = Promise.resolve(storage);
}
