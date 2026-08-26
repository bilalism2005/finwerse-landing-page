import * as SecureStore from 'expo-secure-store';

// Supabase's session storage adapter interface (getItem/setItem/removeItem
// returning/taking strings). Used in place of AsyncStorage so the session
// (access + refresh token pair) sits in the iOS Keychain / Android Keystore
// instead of unencrypted AsyncStorage.
//
// iOS Keychain caps a single SecureStore value at roughly 2048 bytes, but a
// Supabase session JSON blob (tokens + expiry + user metadata) can exceed
// that. Larger values are split across numbered sub-keys and reassembled on
// read; a `<key>_chunks` entry records how many sub-keys to expect.
const CHUNK_SIZE = 1800;
const CHUNK_COUNT_SUFFIX = '_chunks';

function chunkKey(key: string, index: number): string {
  return `${key}_${index}`;
}

async function getChunkCount(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`);
  return raw ? parseInt(raw, 10) : 0;
}

async function deleteChunks(key: string, count: number): Promise<void> {
  await Promise.all(
    Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(chunkKey(key, i)))
  );
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const chunkCount = await getChunkCount(key);
    if (chunkCount === 0) {
      return SecureStore.getItemAsync(key);
    }

    const chunks: string[] = [];
    for (let i = 0; i < chunkCount; i++) {
      const chunk = await SecureStore.getItemAsync(chunkKey(key, i));
      if (chunk === null) {
        // A partial/corrupted write -- treat as a cache miss rather than
        // returning a truncated session blob.
        return null;
      }
      chunks.push(chunk);
    }
    return chunks.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    const previousChunkCount = await getChunkCount(key);

    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      if (previousChunkCount > 0) {
        await Promise.all([
          SecureStore.deleteItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`),
          deleteChunks(key, previousChunkCount),
        ]);
      }
      return;
    }

    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }

    // Invalidate the existing chunk count BEFORE touching any chunk_i data.
    // A shrinking write (e.g. 5 chunks -> 2) would otherwise overwrite
    // chunk_0/chunk_1 while the old count (5) is still readable, so a
    // concurrent getItem could reassemble new chunk_0/1 with stale,
    // not-yet-deleted chunk_2/3/4. With the count cleared first, a
    // concurrent read during the transition sees chunkCount===0 and falls
    // back to the plain `key` (the old unchunked value, or a safe null) --
    // never a mix of old and new chunk data.
    if (previousChunkCount > 0) {
      await SecureStore.deleteItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`);
    }

    await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(chunkKey(key, i), chunk)));
    await SecureStore.setItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`, chunks.length.toString());

    // Only now, with the count already reflecting the new chunk layout, is
    // it safe to clean up the stale unchunked value (if this key was
    // previously small enough to store directly) and any excess chunks left
    // over from an earlier, larger write under this same key.
    await Promise.all([
      SecureStore.deleteItemAsync(key),
      ...Array.from({ length: Math.max(0, previousChunkCount - chunks.length) }, (_, i) =>
        SecureStore.deleteItemAsync(chunkKey(key, chunks.length + i))
      ),
    ]);
  },

  async removeItem(key: string): Promise<void> {
    const chunkCount = await getChunkCount(key);
    await Promise.all([
      SecureStore.deleteItemAsync(key),
      SecureStore.deleteItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`),
      deleteChunks(key, chunkCount),
    ]);
  },
};
