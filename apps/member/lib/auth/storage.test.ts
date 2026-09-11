import { describe, expect, it } from 'vitest';
import { createMemoryBackedStorage, type AsyncKV } from './storage';

function fakeKV(
  initial: Record<string, string> = {},
): AsyncKV & { dump: () => Record<string, string> } {
  const map = new Map(Object.entries(initial));
  return {
    getAllKeys: () => Promise.resolve([...map.keys()]),
    multiGet: (keys) =>
      Promise.resolve(keys.map((k) => [k, map.get(k) ?? null] as [string, string | null])),
    setItem: (k, v) => {
      map.set(k, v);
      return Promise.resolve();
    },
    removeItem: (k) => {
      map.delete(k);
      return Promise.resolve();
    },
    dump: () => Object.fromEntries(map),
  };
}

describe('createMemoryBackedStorage', () => {
  it('hydrates existing keys and serves reads synchronously', async () => {
    const kv = fakeKV({ 'CognitoIdentityServiceProvider.x.idToken': 'abc' });
    const { storage, hydrate } = createMemoryBackedStorage(kv);
    await hydrate();
    expect(storage.getItem('CognitoIdentityServiceProvider.x.idToken')).toBe('abc');
    expect(storage.getItem('missing')).toBeNull();
  });

  it('mirrors sync writes and removals back to the async KV', async () => {
    const kv = fakeKV();
    const { storage, hydrate } = createMemoryBackedStorage(kv);
    await hydrate();
    storage.setItem('k', 'v');
    expect(storage.getItem('k')).toBe('v');
    storage.removeItem('k');
    expect(storage.getItem('k')).toBeNull();
    await Promise.resolve();
    expect(kv.dump()).toEqual({});
  });

  it('clear() empties memory and the KV', async () => {
    const kv = fakeKV({ a: '1', b: '2' });
    const { storage, hydrate } = createMemoryBackedStorage(kv);
    await hydrate();
    storage.clear();
    expect(storage.getItem('a')).toBeNull();
  });
});
