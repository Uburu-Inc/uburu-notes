import { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView, type Edges } from 'react-native-safe-area-context';

import { PAGE_COLOR } from '../lib/theme';

interface Props {
  children: ReactNode;
  backgroundColor?: string;
  /**
   * Which sides get inset. Screens that render a navigator header already clear
   * the status bar, so they pass `['bottom']` rather than padding it twice.
   */
  edges?: Edges;
}

// The provider lives once at the root layout; this only applies the insets it
// exposes, so nesting a screen inside another does not re-measure the window.
export function Layout({
  children,
  backgroundColor = PAGE_COLOR,
  edges = ['top', 'bottom', 'left', 'right'],
}: Props) {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAGE_COLOR,
  },
});
