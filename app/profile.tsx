import { useRouter } from 'expo-router';

import { Layout } from '../components/layout';
import { Profile } from '../components/screen/profile';
import { useLogout } from '../hooks/network-requests/logout';
import { SUBTLE_BACKGROUND } from '../lib/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { logout, loading: loggingOut } = useLogout();

  // Clears the whole stack before showing the login form, so back cannot
  // return to a signed-in screen after the token is gone.
  const handleLogout = async () => {
    if (loggingOut) return;
    await logout();
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  };

  // The bottom nav works like tabs, so it must not pile up screens: `navigate`
  // pushes a fresh copy of the target every time, and each note screen left
  // behind in the stack keeps its canvas alive. Home goes back to the list at
  // the bottom of the stack instead, and a new note takes this screen's place.
  return (
    <Layout backgroundColor={SUBTLE_BACKGROUND} edges={['bottom', 'left', 'right']}>
      <Profile
        onHome={() => router.dismissTo('/home')}
        onAddNote={() => router.replace('/note')}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />
    </Layout>
  );
}
