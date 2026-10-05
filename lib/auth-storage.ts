import * as SecureStore from 'expo-secure-store';

// Kept in the Keychain on iOS and Keystore-encrypted storage on Android, never
// in AsyncStorage. The key names match what the web app persists.
const KEYS = {
  accessToken: 'access_token',
  uid: 'uid',
  institutionUid: 'institution_uid',
} as const;

export type StoredSession = {
  accessToken: string;
  uid: string;
  institutionUid: string | null;
};

export async function saveSession(session: StoredSession) {
  await SecureStore.setItemAsync(KEYS.accessToken, session.accessToken);
  await SecureStore.setItemAsync(KEYS.uid, session.uid);
  if (session.institutionUid) {
    await SecureStore.setItemAsync(KEYS.institutionUid, session.institutionUid);
  } else {
    await SecureStore.deleteItemAsync(KEYS.institutionUid);
  }
}

/** The signed-in session, or null when there is no complete one on the device. */
export async function readSession(): Promise<StoredSession | null> {
  const [accessToken, uid, institutionUid] = await Promise.all([
    SecureStore.getItemAsync(KEYS.accessToken),
    SecureStore.getItemAsync(KEYS.uid),
    SecureStore.getItemAsync(KEYS.institutionUid),
  ]);

  if (!accessToken || !uid) return null;
  return { accessToken, uid, institutionUid };
}

/**
 * Removes every auth value. Each key is deleted on its own so one failure cannot
 * leave the others behind.
 */
export async function clearSession() {
  await Promise.allSettled(Object.values(KEYS).map((key) => SecureStore.deleteItemAsync(key)));
}
