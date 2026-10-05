import { useCallback } from 'react';

import { asNumber, asString, scannerGet, useScannerQuery } from './scanner';

export type AIProcessingSummary = {
  status: string;
  error_message: string;
};

export type PatientFileEntry = {
  file_id: string;
  file_name: string;
  file_size: number;
  s3_key: string;
  status: string;
  view_url: string;
  ai_processing: AIProcessingSummary | null;
  created_at: string;
  confirmed_at: string;
};

export function toAiProcessing(value: any): AIProcessingSummary | null {
  if (!value || typeof value !== 'object') return null;
  return { status: asString(value.status), error_message: asString(value.error_message) };
}

/** Every file uploaded for one patient. */
export async function fetchPatientFiles(patientId: string): Promise<PatientFileEntry[]> {
  const json = await scannerGet(`patients/${encodeURIComponent(patientId)}/files`);
  const rows: any[] = Array.isArray(json?.files) ? json.files : Array.isArray(json) ? json : [];

  return rows.map((row) => ({
    file_id: asString(row?.file_id),
    file_name: asString(row?.file_name),
    file_size: asNumber(row?.file_size),
    s3_key: asString(row?.s3_key),
    status: asString(row?.status),
    view_url: asString(row?.view_url),
    ai_processing: toAiProcessing(row?.ai_processing),
    created_at: asString(row?.created_at),
    confirmed_at: asString(row?.confirmed_at),
  }));
}

/** The patient folder screen's files, with loading, error and retry. */
export function usePatientFiles(patientId: string) {
  const fetcher = useCallback(() => fetchPatientFiles(patientId), [patientId]);
  const { data, loading, error, notFound, reload } = useScannerQuery(fetcher);

  return { files: data ?? [], loading, error, notFound, reload };
}
