import Svg, { Path } from 'react-native-svg';

import { STROKE_COLOR } from '../../lib/theme';

const USER_PATH =
  'M320 312C386.3 312 440 258.3 440 192C440 125.7 386.3 72 320 72C253.7 72 200 125.7 200 192C200 258.3 253.7 312 320 312zM290.3 368C191.8 368 112 447.8 112 546.3C112 562.7 125.3 576 141.7 576L498.3 576C514.7 576 528 562.7 528 546.3C528 447.8 448.2 368 349.7 368L290.3 368z';

interface Props {
  color?: string;
  size?: number;
}

export function UserIcon({ color = STROKE_COLOR, size = 22 }: Props) {
  return (
    <Svg fill={color} height={size} viewBox="0 0 640 640" width={size}>
      <Path d={USER_PATH} />
    </Svg>
  );
}
