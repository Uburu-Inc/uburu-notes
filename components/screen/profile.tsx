import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DEMO_PROFILE, initialsFrom } from '../../lib/profile';
import {
  AVATAR_CIRCLE_COLOR,
  AVATAR_INITIALS_COLOR,
  AVATAR_TILE_COLOR,
  BORDER_COLOR,
  MUTED_TEXT_COLOR,
  STROKE_COLOR,
  SUBTLE_BACKGROUND,
  SURFACE_COLOR,
  UBURU_ORANGE,
} from '../../lib/theme';
import { CameraIcon } from '../icons/camera';
import { BottomNav } from '../widgets/bottom_nav';

type ProfileTab = 'details' | 'institution';

const TABS: { key: ProfileTab; label: string }[] = [
  { key: 'details', label: 'Details' },
  { key: 'institution', label: 'Institution' },
];

// A field with nothing behind it yet still occupies its row, matching the
// design's placeholder dash rather than collapsing the layout.
const EMPTY_VALUE = '-';

interface Props {
  onHome: () => void;
  onAddNote: () => void;
}

export function Profile({ onHome, onAddNote }: Props) {
  const [tab, setTab] = useState<ProfileTab>('details');
  const { personal, institution } = DEMO_PROFILE;

  const isDetails = tab === 'details';
  const initialsSource = isDetails ? personal.fullName : institution.legalName;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>Account</Text>
        <Text style={styles.title}>My Profile</Text>

        <View style={styles.tabRow}>
          {TABS.map(({ key, label }) => (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === key }}
              onPress={() => setTab(key)}
              style={[styles.tab, tab === key && styles.tabActive]}>
              <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <AvatarTile initials={initialsFrom(initialsSource)} />

        {isDetails ? (
          <View>
            <Field label="Full Name" value={personal.fullName} />
            <Field label="Email" value={personal.email} />
            <Field label="Phone" value={personal.phone} />
            <Field label="Location" value={personal.location} />
          </View>
        ) : (
          <View>
            <Field label="Institution legal name" value={institution.legalName} />
            <Field label="Institution Type" value={institution.type} />
            <Field label="Website" value={institution.website} link />
          </View>
        )}
      </ScrollView>

      <BottomNav
        activeTab="profile"
        onHome={onHome}
        onAddNote={onAddNote}
        onProfile={() => setTab('details')}
      />
    </View>
  );
}

function AvatarTile({ initials }: { initials: string }) {
  return (
    <View style={styles.avatarTile}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarInitials}>{initials}</Text>
      </View>

      {/* Picking a photo needs an image picker module, so this is presentational
          for now rather than a button that silently does nothing on press. */}
      <View style={styles.cameraBadge}>
        <CameraIcon color={STROKE_COLOR} size={15} />
      </View>
    </View>
  );
}

interface FieldProps {
  label: string;
  value: string;
  link?: boolean;
}

function Field({ label, value, link = false }: FieldProps) {
  const hasValue = value.trim().length > 0;

  if (link && hasValue) {
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text
          accessibilityRole="link"
          onPress={() => Linking.openURL(value)}
          style={[styles.fieldValue, styles.fieldLink]}>
          {value}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{hasValue ? value : EMPTY_VALUE}</Text>
    </View>
  );
}

const TILE_SIZE = 224;
const CIRCLE_SIZE = 152;

const styles = StyleSheet.create({
  container: {
    backgroundColor: SUBTLE_BACKGROUND,
    flex: 1,
  },
  content: {
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  eyebrow: {
    color: MUTED_TEXT_COLOR,
    fontSize: 12,
    marginBottom: 2,
  },
  title: {
    color: STROKE_COLOR,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  tabRow: {
    borderBottomColor: BORDER_COLOR,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 28,
    marginBottom: 24,
  },
  tab: {
    // Pulls the indicator down over the row's divider so the two share a line.
    borderBottomColor: 'transparent',
    borderBottomWidth: 3,
    marginBottom: -1,
    paddingBottom: 10,
  },
  tabActive: {
    borderBottomColor: UBURU_ORANGE,
  },
  tabLabel: {
    color: MUTED_TEXT_COLOR,
    fontSize: 14,
  },
  tabLabelActive: {
    color: STROKE_COLOR,
    fontWeight: '600',
  },
  avatarTile: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: AVATAR_TILE_COLOR,
    borderRadius: 16,
    height: TILE_SIZE,
    justifyContent: 'center',
    marginBottom: 28,
    width: TILE_SIZE,
  },
  avatarCircle: {
    alignItems: 'center',
    backgroundColor: AVATAR_CIRCLE_COLOR,
    borderRadius: CIRCLE_SIZE / 2,
    height: CIRCLE_SIZE,
    justifyContent: 'center',
    width: CIRCLE_SIZE,
  },
  avatarInitials: {
    color: AVATAR_INITIALS_COLOR,
    fontSize: 40,
    fontWeight: '700',
  },
  cameraBadge: {
    alignItems: 'center',
    backgroundColor: SURFACE_COLOR,
    borderRadius: 17,
    bottom: 34,
    height: 34,
    justifyContent: 'center',
    position: 'absolute',
    right: 40,
    width: 34,
  },
  field: {
    marginBottom: 20,
  },
  fieldLabel: {
    color: STROKE_COLOR,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  fieldValue: {
    color: MUTED_TEXT_COLOR,
    fontSize: 14,
  },
  fieldLink: {
    textDecorationLine: 'underline',
  },
});
