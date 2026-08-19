import { ReactNode } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

interface Props {
  children: ReactNode;
}

export function Layout(props: Props) {
  return (
    <SafeAreaProvider style={styles.container}>
      {props.children}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
