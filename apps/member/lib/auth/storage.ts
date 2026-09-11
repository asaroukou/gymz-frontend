export interface ICognitoStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

export interface AsyncKV {
  getAllKeys(): Promise<readonly string[]>;
  multiGet(keys: readonly string[]): Promise<[string, string | null][]>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

function logMirrorFailure(err: unknown): void {
  console.error('[auth-storage] mirror failed:', err);
}

export function createMemoryBackedStorage(kv: AsyncKV): {
  storage: ICognitoStorageLike;
  hydrate: () => Promise<void>;
} {
  const mem = new Map<string, string>();

  async function hydrate(): Promise<void> {
    const keys = await kv.getAllKeys();
    const entries = await kv.multiGet(keys);
    for (const [k, v] of entries) {
      if (v !== null) mem.set(k, v);
    }
  }

  const storage: ICognitoStorageLike = {
    getItem: (key) => (mem.has(key) ? (mem.get(key) as string) : null),
    setItem: (key, value) => {
      mem.set(key, value);
      void kv.setItem(key, value).catch(logMirrorFailure); // fire-and-forget mirror
    },
    removeItem: (key) => {
      mem.delete(key);
      void kv.removeItem(key).catch(logMirrorFailure);
    },
    clear: () => {
      for (const key of [...mem.keys()]) {
        mem.delete(key);
        void kv.removeItem(key).catch(logMirrorFailure);
      }
    },
  };

  return { storage, hydrate };
}
