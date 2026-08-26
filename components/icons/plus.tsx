import Svg, { Path } from 'react-native-svg';

import { STROKE_COLOR } from '../../lib/theme';

const PLUS_PATH =
  'M288 128C288 110.3 302.3 96 320 96C337.7 96 352 110.3 352 128L352 288L512 288C529.7 288 544 302.3 544 320C544 337.7 529.7 352 512 352L352 352L352 512C352 529.7 337.7 544 320 544C302.3 544 288 529.7 288 512L288 352L128 352C110.3 352 96 337.7 96 320C96 302.3 110.3 288 128 288L288 288L288 128z';

interface Props {
  color?: string;
  size?: number;
}

export function PlusIcon({ color = STROKE_COLOR, size = 20 }: Props) {
  return (
    <Svg fill={color} height={size} viewBox="0 0 640 640" width={size}>
      <Path d={PLUS_PATH} />
    </Svg>
  );
}
