import { useRouter } from 'expo-router';

import { Layout } from '../components/layout';
import { Profile } from '../components/screen/profile';
import { SUBTLE_BACKGROUND } from '../lib/theme';

export default function ProfileScreen() {
  const router = useRouter();

  // `navigate` rather than `push`: returning to a screen already in the stack
  // should pop back to it instead of stacking a second copy.
  return (
    <Layout backgroundColor={SUBTLE_BACKGROUND} edges={['bottom', 'left', 'right']}>
      <Profile
        onHome={() => router.navigate('/note')}
        onAddNote={() => router.navigate('/note')}
      />
    </Layout>
  );
}
