import Svg, { Path } from 'react-native-svg';

import { STROKE_COLOR } from '../../lib/theme';

const CAMERA_PATH =
  'M251.6 128C238.1 128 225.6 134.7 218.2 145.9L192 185.3L192 176C192 158.3 177.7 144 160 144C142.3 144 128 158.3 128 176L128 192L112 192C76.7 192 48 220.7 48 256L48 480C48 515.3 76.7 544 112 544L528 544C563.3 544 592 515.3 592 480L592 256C592 220.7 563.3 192 528 192L474.5 192L421.8 145.9C414.4 134.7 401.9 128 388.4 128L251.6 128zM320 288C355.3 288 384 316.7 384 352C384 387.3 355.3 416 320 416C284.7 416 256 387.3 256 352C256 316.7 284.7 288 320 288z';

interface Props {
  color?: string;
  size?: number;
}

export function CameraIcon({ color = STROKE_COLOR, size = 16 }: Props) {
  return (
    <Svg fill={color} height={size} viewBox="0 0 640 640" width={size}>
      <Path d={CAMERA_PATH} />
    </Svg>
  );
}
