import Svg, { Path } from 'react-native-svg';

import { STROKE_COLOR } from '../../lib/theme';

const CHEVRON_DOWN_PATH =
  'M297.4 470.6C309.9 483.1 330.2 483.1 342.7 470.6L534.7 278.6C547.2 266.1 547.2 245.8 534.7 233.3C522.2 220.8 501.9 220.8 489.4 233.3L320 402.7L150.6 233.4C138.1 220.9 117.8 220.9 105.3 233.4C92.8 245.9 92.8 266.2 105.3 278.7L297.3 470.7z';

interface Props {
  color?: string;
  size?: number;
}

export function ChevronDownIcon({ color = STROKE_COLOR, size = 16 }: Props) {
  return (
    <Svg fill={color} height={size} viewBox="0 0 640 640" width={size}>
      <Path d={CHEVRON_DOWN_PATH} />
    </Svg>
  );
}
