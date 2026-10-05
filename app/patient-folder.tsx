import { useLocalSearchParams, useRouter } from 'expo-router';

import { Layout } from '../components/layout';
import { PatientFolder } from '../components/screen/patient_folder';
import { SUBTLE_BACKGROUND } from '../lib/theme';

export default function PatientFolderScreen() {
  const router = useRouter();
  const { patientId = '' } = useLocalSearchParams<{ patientId?: string }>();

  return (
    <Layout backgroundColor={SUBTLE_BACKGROUND} edges={['bottom', 'left', 'right']}>
      <PatientFolder
        patientId={patientId}
        onViewRecord={(fileId) => router.push({ pathname: '/patient-record', params: { fileId } })}
      />
    </Layout>
  );
}
