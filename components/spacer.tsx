import { ReactNode } from "react";
import { View, StyleSheet } from "react-native";

interface Props {
  children: ReactNode;
}

export function Spacer(props: Props) {
  return <View style={styles.container}>{props.children}</View>;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
});
