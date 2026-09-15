import { useRouter } from 'expo-router';

import { Layout } from '../components/layout';
import { NotesList } from '../components/screen/notes_list';
import { prefetchNote } from '../lib/note-prefetch';
import { SUBTLE_BACKGROUND } from '../lib/theme';

export default function HomeScreen() {
  const router = useRouter();

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
      />
    </Layout>
  );
}
