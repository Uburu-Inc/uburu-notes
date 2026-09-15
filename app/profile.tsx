import { useRouter } from 'expo-router';

import { Layout } from '../components/layout';
import { Profile } from '../components/screen/profile';
import { SUBTLE_BACKGROUND } from '../lib/theme';

export default function ProfileScreen() {
  const router = useRouter();

  // The bottom nav works like tabs, so it must not pile up screens: `navigate`
  // pushes a fresh copy of the target every time, and each note screen left
  // behind in the stack keeps its canvas alive. Home goes back to the list at
  // the bottom of the stack instead, and a new note takes this screen's place.
  return (
    <Layout backgroundColor={SUBTLE_BACKGROUND} edges={['bottom', 'left', 'right']}>
      <Profile
        onHome={() => router.dismissTo('/home')}
        onAddNote={() => router.replace('/note')}
      />
    </Layout>
  );
}
