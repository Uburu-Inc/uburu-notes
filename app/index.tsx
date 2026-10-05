import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { Layout } from '../components/layout';
import { LoginComponent } from '../components/screen/login';
import { restoreSession } from '../hooks/network-requests/login';
import { LOGIN_BACKGROUND } from '../lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  // Nothing is drawn until secure storage has been checked, so a signed-in user
  // does not see the login form flash before landing on their notes.
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    void restoreSession().then((signedIn) => {
      if (!active) return;
      if (signedIn) router.replace('/home');
      else setCheckingSession(false);
    });
    return () => {
      active = false;
    };
  }, [router]);

  // `replace` rather than `push`: the back gesture should leave the app, not
  // drop the user back onto a login form they have already cleared.
  const handleSignIn = (_username: string) => {
    router.replace('/home');
  };

  return (
    <Layout backgroundColor={LOGIN_BACKGROUND}>
      {checkingSession ? null : <LoginComponent onSignIn={handleSignIn} />}
    </Layout>
  );
}
