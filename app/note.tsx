import { useLocalSearchParams, useRouter } from 'expo-router';

import { Layout } from '../components/layout';
import { Note } from '../components/screen/note';

export default function NoteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  // The stack header already clears the top inset, so only the bottom is padded.
  return (
    <Layout edges={['bottom', 'left', 'right']}>
      <Note
        openId={id}
        onHome={() => router.navigate('/home')}
        onProfile={() => router.navigate('/profile')}
      />
    </Layout>
  );
}
