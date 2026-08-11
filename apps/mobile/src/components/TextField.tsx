import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { colors } from "../theme";

interface TextFieldProps extends TextInputProps {
  label?: string;
}

export function TextField({ label, style, ...props }: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput placeholderTextColor={colors.muted} style={[styles.input, style]} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.card,
  },
});
