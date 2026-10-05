import { StyleSheet, Text, View } from 'react-native';

import {
  ACCENT_COLOR,
  DANGER_COLOR,
  MUTED_TEXT_COLOR,
  SUCCESS_COLOR,
  UBURU_ORANGE,
} from '../../lib/theme';

type AiStatusPresentation = { label: string; color: string };

// The same wording as the web app's getAiStatusPresentation.
const PRESENTATIONS: Record<string, AiStatusPresentation> = {
  COMPLETED: { label: 'Analysis complete', color: SUCCESS_COLOR },
  FAILED: { label: 'Analysis failed', color: DANGER_COLOR },
  PROCESSING: { label: 'Analyzing document…', color: UBURU_ORANGE },
  PENDING: { label: 'Waiting in queue', color: ACCENT_COLOR },
  SUBMITTED: { label: 'Sent for analysis', color: ACCENT_COLOR },
};

const NOT_QUEUED: AiStatusPresentation = {
  label: 'No AI analysis queued for this file yet',
  color: MUTED_TEXT_COLOR,
};

export function getAiStatusPresentation(status: string | null | undefined) {
  return PRESENTATIONS[(status ?? '').toUpperCase()] ?? NOT_QUEUED;
}

export function AiStatusBadge({ status }: { status: string | null | undefined }) {
  const { label, color } = getAiStatusPresentation(status);

  return (
    // A 10% tint of the status colour behind text in the full colour.
    <View style={[styles.badge, { backgroundColor: `${color}1A` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
