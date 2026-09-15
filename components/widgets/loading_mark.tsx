import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { BORDER_COLOR, UBURU_ORANGE } from '../../lib/theme';
import { AppIcon } from '../icons/app_icon';

const TRACK_WIDTH = 140;
const BAR_WIDTH = 56;
const SWEEP_DURATION = 1100;

interface Props {
  /** Announced to screen readers, since the mark itself says nothing. */
  label: string;
}

/**
 * The app icon over a progress bar, for while something is loading. There is
 * no real progress to report, so the bar sweeps across rather than filling.
 */
export function LoadingMark({ label }: Props) {
  const sweep = useSharedValue(0);

  useEffect(() => {
    sweep.value = withRepeat(
      withTiming(1, { duration: SWEEP_DURATION, easing: Easing.inOut(Easing.ease) }),
      -1
    );
    return () => cancelAnimation(sweep);
  }, [sweep]);

  // From just off the left of the track to just off the right.
  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -BAR_WIDTH + sweep.value * (TRACK_WIDTH + BAR_WIDTH) }],
  }));

  return (
    <View accessibilityLabel={label} accessibilityRole="progressbar" style={styles.container}>
      <AppIcon size={72} />
      <View style={styles.track}>
        <Animated.View style={[styles.bar, barStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 24,
  },
  track: {
    backgroundColor: BORDER_COLOR,
    borderRadius: 2,
    height: 4,
    overflow: 'hidden',
    width: TRACK_WIDTH,
  },
  bar: {
    backgroundColor: UBURU_ORANGE,
    borderRadius: 2,
    height: 4,
    width: BAR_WIDTH,
  },
});
