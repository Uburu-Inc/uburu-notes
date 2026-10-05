import { useCallback } from 'react';

import { toAiProcessing, type AIProcessingSummary } from './patient-files';
import { asString, NotFoundError, scannerGet, useScannerQuery } from './scanner';

export type PatientRecord = {
  patient_id: string;
  file_id: string;
  session_id: string;
  institution_uid: string;
  file_name: string;
  file_size: number | string;
  file_hash: string;
  hospital_id: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  date_of_birth: string;
  state_of_origin: string;
  s3_key: string;
  status: string;
  upload_type: string;
  auto_confirmed: boolean;
  confirmed_by: string;
  created_at: string;
  confirmed_at: string;
};

export type PatientRecordDetail = {
  record: PatientRecord;
  view_url: string;
  ai_processing: AIProcessingSummary | null;
};

/** One uploaded file with the patient details captured for it. */
export async function fetchPatientRecord(fileId: string): Promise<PatientRecordDetail> {
  const json = await scannerGet(`patient-records/${encodeURIComponent(fileId)}`);
  const raw = json?.patient ?? json?.record;
  if (!raw || typeof raw !== 'object') throw new NotFoundError();

  return {
    record: {
      patient_id: asString(raw.patient_id),
      file_id: asString(raw.file_id),
      session_id: asString(raw.session_id),
      institution_uid: asString(raw.institution_uid),
      file_name: asString(raw.file_name),
      file_size: raw.file_size ?? '',
      file_hash: asString(raw.file_hash),
      hospital_id: asString(raw.hospital_id),
      first_name: asString(raw.first_name),
      last_name: asString(raw.last_name),
      middle_name: asString(raw.middle_name),
      date_of_birth: asString(raw.date_of_birth),
      state_of_origin: asString(raw.state_of_origin),
      s3_key: asString(raw.s3_key),
      status: asString(raw.status),
      upload_type: asString(raw.upload_type),
      auto_confirmed: Boolean(raw.auto_confirmed),
      confirmed_by: asString(raw.confirmed_by),
      created_at: asString(raw.created_at),
      confirmed_at: asString(raw.confirmed_at),
    },
    view_url: asString(json?.view_url),
    ai_processing: toAiProcessing(json?.ai_processing),
  };
}

/** The patient record screen's data, with loading, not-found, error and retry. */
export function usePatientRecord(fileId: string) {
  const fetcher = useCallback(() => fetchPatientRecord(fileId), [fileId]);
  const { data, loading, error, notFound, reload } = useScannerQuery(fetcher);

  return { detail: data, loading, error, notFound, reload };
}
