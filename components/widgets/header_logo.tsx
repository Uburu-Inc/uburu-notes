import { StyleSheet } from 'react-native';

import { UburuLogo } from '../icons/uburu-logo';

interface Props {
  /**
   * Closes the margin Android's toolbar keeps between a back arrow and the
   * title. Only for screens that actually show one — without the arrow there
   * is no margin to absorb it and the wordmark runs off the left edge.
   */
  tight?: boolean;
}

export function HeaderLogo({ tight = false }: Props) {
  return <UburuLogo height={26} style={tight ? styles.tight : undefined} />;
}

const styles = StyleSheet.create({
  tight: {
    marginLeft: -24,
  },
});
