import { StyleSheet, Text, View } from "react-native";
import { statusColors } from "../theme";

export function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] ?? "#6b7280";
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1f` }]}>
      <Text style={[styles.text, { color }]}>{status.replace(/_/g, " ")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  text: { fontSize: 12, fontWeight: "700" },
});
