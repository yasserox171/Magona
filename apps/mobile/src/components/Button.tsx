import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "danger";
  loading?: boolean;
  disabled?: boolean;
}

export function Button({ title, onPress, variant = "primary", loading, disabled }: ButtonProps) {
  const isOutline = variant === "outline";
  const bg = variant === "danger" ? colors.danger : isOutline ? "transparent" : colors.brand;
  const textColor = isOutline ? colors.text : "#fff";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, opacity: pressed ? 0.85 : disabled ? 0.5 : 1 },
        isOutline && { borderWidth: 1, borderColor: colors.border },
      ]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.text, { color: textColor }]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 15,
    fontWeight: "600",
  },
});
