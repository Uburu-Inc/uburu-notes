import { useRouter } from 'expo-router';

import { Layout } from '../components/layout';
import { NotesList } from '../components/screen/notes_list';
import { SUBTLE_BACKGROUND } from '../lib/theme';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <Layout backgroundColor={SUBTLE_BACKGROUND} edges={['bottom', 'left', 'right']}>
      <NotesList
        onOpenNote={(id) => router.navigate({ pathname: '/note', params: { id } })}
        onAddNote={() => router.navigate('/note')}
        onProfile={() => router.navigate('/profile')}
      />
    </Layout>
  );
}
