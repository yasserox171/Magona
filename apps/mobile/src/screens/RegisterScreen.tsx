import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { api, ApiError } from "../api";
import { AuthTokens } from "../types";
import { useAuth } from "../context/auth-context";
import { TextField } from "../components/TextField";
import { Button } from "../components/Button";
import { colors } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", phone: "" });
  const [gdprConsent, setGdprConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setError(null);
    if (!gdprConsent) {
      setError("Please accept the privacy policy to continue.");
      return;
    }
    setLoading(true);
    try {
      const tokens = await api.post<AuthTokens>("/auth/register", { ...form, gdprConsent }, { auth: false });
      await signIn(tokens);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Create your account</Text>
        <TextField label="First name" value={form.firstName} onChangeText={(v) => setForm({ ...form, firstName: v })} />
        <TextField label="Last name" value={form.lastName} onChangeText={(v) => setForm({ ...form, lastName: v })} />
        <TextField
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={form.email}
          onChangeText={(v) => setForm({ ...form, email: v })}
        />
        <TextField label="Phone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} />
        <TextField label="Password" secureTextEntry value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} />

        <View style={styles.consentRow}>
          <Switch value={gdprConsent} onValueChange={setGdprConsent} />
          <Text style={styles.consentText}>I agree to the Privacy Policy and consent to my data being processed.</Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
        <Button title="Sign up" onPress={handleRegister} loading={loading} />
        <View style={{ height: 12 }} />
        <Button title="Back to sign in" variant="outline" onPress={() => navigation.navigate("Login")} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, padding: 24, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: "800", color: colors.ink, marginBottom: 20 },
  consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 16 },
  consentText: { flex: 1, fontSize: 12, color: colors.muted },
  error: { color: colors.danger, marginBottom: 12, fontSize: 13 },
});
