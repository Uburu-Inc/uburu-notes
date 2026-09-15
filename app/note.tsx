import { useLocalSearchParams, useRouter } from 'expo-router';

import { Layout } from '../components/layout';
import { Note } from '../components/screen/note';

export default function NoteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  // The stack header already clears the top inset, so only the bottom is padded.
  //
  // Home goes back to the list rather than pushing another copy of it on top
  // of this note, so going back and forth never stacks up screens. Profile
  // opens over the note, so back returns to it.
  return (
    <Layout edges={['bottom', 'left', 'right']}>
      <Note
        openId={id}
        onHome={() => router.dismissTo('/home')}
        onProfile={() => router.push('/profile')}
      />
    </Layout>
  );
}
