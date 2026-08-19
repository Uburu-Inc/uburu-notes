import { Layout } from '../components/layout';
import { Note } from '../components/screen/note';

export default function NoteScreen() {
  // The stack header already clears the top inset, so only the bottom is padded.
  return (
    <Layout edges={['bottom', 'left', 'right']}>
      <Note />
    </Layout>
  );
}
