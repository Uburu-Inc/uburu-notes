import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HomeIcon } from '../icons/home';
import { PlusIcon } from '../icons/plus';
import { UserIcon } from '../icons/user';
import {
  BORDER_COLOR,
  LOGIN_BUTTON_COLOR,
  MUTED_TEXT_COLOR,
  STROKE_COLOR,
  SURFACE_COLOR,
} from '../../lib/theme';

export type NavTab = 'home' | 'profile';

interface Props {
  /** Which side tab reads as current; the centre button is an action, not a tab. */
  activeTab?: NavTab;
  onHome?: () => void;
  onProfile?: () => void;
  onAddNote: () => void;
}

export function BottomNav({ activeTab, onHome, onProfile, onAddNote }: Props) {
  return (
    <View style={styles.bar}>
      <NavItem
        label="Home"
        active={activeTab === 'home'}
        onPress={onHome}
        icon={<HomeIcon color={activeTab === 'home' ? STROKE_COLOR : MUTED_TEXT_COLOR} />}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add note"
        onPress={onAddNote}
        style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
        <PlusIcon color={SURFACE_COLOR} size={16} />
        <Text style={styles.addLabel}>Add note</Text>
      </Pressable>

      <NavItem
        label="Profile"
        active={activeTab === 'profile'}
        onPress={onProfile}
        icon={<UserIcon color={activeTab === 'profile' ? STROKE_COLOR : MUTED_TEXT_COLOR} />}
      />
    </View>
  );
}

interface NavItemProps {
  label: string;
  icon: ReactNode;
  active: boolean;
  onPress?: () => void;
}

function NavItem({ label, icon, active, onPress }: NavItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}>
      {icon}
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    backgroundColor: SURFACE_COLOR,
    borderTopColor: BORDER_COLOR,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
    minWidth: 72,
    paddingVertical: 6,
  },
  navLabel: {
    color: MUTED_TEXT_COLOR,
    fontSize: 12,
    fontWeight: '500',
  },
  navLabelActive: {
    color: STROKE_COLOR,
    fontWeight: '700',
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: LOGIN_BUTTON_COLOR,
    borderRadius: 24,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  addLabel: {
    color: SURFACE_COLOR,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
