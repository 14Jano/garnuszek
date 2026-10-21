/**
 * Asks the browser not to evict our data when the device runs low on space.
 * Best effort: browsers may refuse, or may not support it at all, and neither
 * is an error for the app.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;

  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
