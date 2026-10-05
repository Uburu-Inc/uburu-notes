import { useLocalSearchParams } from 'expo-router';

import { Layout } from '../components/layout';
import { PatientRecordView } from '../components/screen/patient_record';
import { SUBTLE_BACKGROUND } from '../lib/theme';

export default function PatientRecordScreen() {
  const { fileId = '' } = useLocalSearchParams<{ fileId?: string }>();

  return (
    <Layout backgroundColor={SUBTLE_BACKGROUND} edges={['bottom', 'left', 'right']}>
      <PatientRecordView fileId={fileId} />
    </Layout>
  );
}
