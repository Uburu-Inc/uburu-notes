import { useRouter } from 'expo-router';

import { Layout } from '../components/layout';
import { LoginComponent } from '../components/screen/login';

export default function LoginScreen() {
  const router = useRouter();

  // `replace` rather than `push`: the back gesture should leave the app, not
  // drop the user back onto a login form they have already cleared.
  const handleSignIn = () => {
    router.replace('/note');
  };

  return (
    <Layout>
      <LoginComponent onSignIn={handleSignIn} />
    </Layout>
  );
}
