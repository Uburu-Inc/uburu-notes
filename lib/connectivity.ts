import type { NetInfoState } from '@react-native-community/netinfo';

type NetInfoModule = {
  fetch: () => Promise<NetInfoState>;
  addEventListener: (listener: (state: NetInfoState) => void) => () => void;
};

// NetInfo resolves its native module at import time and throws outright when
// the running build predates the package, which would take the whole save path
// down with it. Loading it on demand — the same treatment lib/recognize.ts
// gives the ink module — turns that into "cannot tell whether we are online",
// which is already a case this code handles. A plain require is deliberate:
// `import()` resolves to a numeric Metro module id and fails opaquely.
let cached: NetInfoModule | null | undefined;

function getNetInfo() {
  if (cached !== undefined) return cached;

  try {
    const module = require('@react-native-community/netinfo') as {
      default?: NetInfoModule;
    };
    cached = module.default ?? null;
  } catch (error) {
    console.warn(
      'Connectivity checks are unavailable in this build, so notes will be ' +
        'kept on the device until it is rebuilt:',
      error
    );
    cached = null;
  }

  return cached;
}

function isUsable(state: NetInfoState) {
  // isInternetReachable is null while the probe is still running, so only an
  // explicit false counts as offline.
  return state.isConnected === true && state.isInternetReachable !== false;
}

/** False whenever connectivity cannot be established *or* cannot be checked. */
export async function isOnline() {
  const netInfo = getNetInfo();
  if (!netInfo) return false;

  try {
    return isUsable(await netInfo.fetch());
  } catch (error) {
    console.warn('Could not read the connection state:', error);
    return false;
  }
}

/**
 * Calls back each time the device goes from offline to online. Returns an
 * unsubscribe function, which is a no-op when connectivity cannot be observed.
 */
export function onConnectionRestored(handler: () => void) {
  const netInfo = getNetInfo();
  if (!netInfo) return () => {};

  // NetInfo reports the current state as soon as it is subscribed, so starting
  // from "offline" means a launch while already connected counts as a
  // restoration and drains anything left waiting by the last session.
  let wasOnline = false;

  return netInfo.addEventListener((state) => {
    const online = isUsable(state);
    if (online && !wasOnline) handler();
    wasOnline = online;
  });
}
