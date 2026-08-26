import { useRouter } from 'expo-router';

import { Layout } from '../components/layout';
import { LoginComponent } from '../components/screen/login';
import { LOGIN_BACKGROUND } from '../lib/theme';

export default function LoginScreen() {
  const router = useRouter();

  // `replace` rather than `push`: the back gesture should leave the app, not
  // drop the user back onto a login form they have already cleared.
  const handleSignIn = (_username: string) => {
    router.replace('/home');
  };

  return (
    <Layout backgroundColor={LOGIN_BACKGROUND}>
      <LoginComponent onSignIn={handleSignIn} />
    </Layout>
  );
}
