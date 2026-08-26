import { useEffect } from 'react';

import { onConnectionRestored } from '../lib/connectivity';
import { syncPendingNotes } from '../lib/note-sync';

/**
 * Uploads anything saved while offline as soon as a usable connection comes
 * back. Mounted once at the root so it keeps working whatever screen the user
 * happens to be on.
 */
export function useOnlineSync() {
  useEffect(
    () =>
      onConnectionRestored(() => {
        void syncPendingNotes().then((count) => {
          if (count > 0) console.log(`Uploaded ${count} note(s) saved offline.`);
        });
      }),
    []
  );
}
