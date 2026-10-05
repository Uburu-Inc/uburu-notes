import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { Layout } from '../components/layout';
import { NotesList } from '../components/screen/notes_list';
import { UploadHistorySection } from '../components/screen/upload_history';
import { useUploadHistory } from '../hooks/network-requests/upload-history';
import { useUploadStats } from '../hooks/network-requests/upload-stats';
import { prefetchNote } from '../lib/note-prefetch';
import { onNotesSynced, syncPendingNotes } from '../lib/note-sync';
import { SUBTLE_BACKGROUND } from '../lib/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { stats, loading: statsLoading, refreshing, refresh, reload } = useUploadStats();
  const history = useUploadHistory();
  const reloadHistory = history.reload;

  // A note left a moment ago finishes uploading in the background, usually
  // after this screen is back; pick up the new totals and history when it does.
  useEffect(
    () =>
      onNotesSynced(() => {
        void reload();
        void reloadHistory();
      }),
    [reload, reloadHistory]
  );

  // The list sits at the bottom of the stack; everything opens over it, and
  // the bottom nav's Home on other screens comes back down to it.
  return (
    <Layout backgroundColor={SUBTLE_BACKGROUND} edges={['bottom', 'left', 'right']}>
      <NotesList
        onOpenNote={(id) => {
          // Before navigating, so the read overlaps the screen coming up.
          prefetchNote(id);
          router.push({ pathname: '/note', params: { id } });
        }}
        onAddNote={() => router.push('/note')}
        onProfile={() => router.push('/profile')}
        stats={stats}
        statsLoading={statsLoading}
        refreshing={refreshing}
        onRefresh={() => {
          // Pulling down also retries any note still waiting to upload.
          void syncPendingNotes();
          void history.reload();
          void refresh();
        }}
        historySection={
          <UploadHistorySection
            history={history}
            onViewFolder={(patientId) =>
              router.push({ pathname: '/patient-folder', params: { patientId } })
            }
            onViewRecord={(fileId) =>
              router.push({ pathname: '/patient-record', params: { fileId } })
            }
          />
        }
      />
    </Layout>
  );
}
