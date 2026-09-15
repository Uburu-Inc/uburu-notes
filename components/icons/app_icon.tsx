import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

// The "u" and the dot beneath it, lifted from the wordmark in uburu-logo.tsx so
// the icon and the logo share one letterform.
const U_PATH =
  'M0.797241 10.4179H7.12192V23.7479C7.12192 26.5685 9.42375 28.8373 12.2852 28.8373C15.1467 28.8373 17.4556 26.5685 17.4556 23.7479V10.4179H23.7802V23.7479C23.7802 29.4787 19.5334 34.161 12.2852 34.161C5.04408 34.161 0.797241 29.4787 0.797241 23.7479V10.4179ZM15.5385 36.2506C15.0977 37.609 13.8105 38.5883 12.2852 38.5883C10.767 38.5883 9.47974 37.609 9.03893 36.2506H15.5385Z';

interface Props {
  size?: number;
}

/**
 * The app icon — a white "u" on the brand's orange disc — drawn as vectors,
 * since the bitmap in assets/ is only 57px and blurs at any size worth showing.
 */
export function AppIcon({ size = 64 }: Props) {
  return (
    <Svg height={size} viewBox="0 0 64 64" width={size}>
      <Defs>
        <LinearGradient id="appIconFill" x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="#F6CA00" />
          <Stop offset="1" stopColor="#FF0000" />
        </LinearGradient>
      </Defs>
      <Circle cx={32} cy={32} fill="url(#appIconFill)" r={32} />
      {/* Scaled to half the disc's height and centred on it. */}
      <G transform="translate(18.04 4.17) scale(1.136)">
        <Path d={U_PATH} fill="#FFFFFF" />
      </G>
    </Svg>
  );
}
