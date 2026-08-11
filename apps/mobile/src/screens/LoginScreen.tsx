import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { api, ApiError } from "../api";
import { AuthTokens } from "../types";
import { useAuth } from "../context/auth-context";
import { TextField } from "../components/TextField";
import { Button } from "../components/Button";
import { colors } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("customer@magona.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      const tokens = await api.post<AuthTokens>("/auth/login", { email, password }, { auth: false });
      await signIn(tokens);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.brand}>Magona</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to book and track your rides</Text>

        <View style={styles.form}>
          <TextField
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextField label="Password" secureTextEntry value={password} onChangeText={setPassword} />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button title="Sign in" onPress={handleLogin} loading={loading} />
        </View>

        <Text style={styles.hint}>
          Demo account: customer@magona.com / Password123!{"\n"}This build runs entirely on-device — no backend
          needed.
        </Text>

        <Button title="Create an account" variant="outline" onPress={() => navigation.navigate("Register")} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, padding: 24, justifyContent: "center" },
  brand: { fontSize: 14, fontWeight: "700", color: colors.brand, textAlign: "center", marginBottom: 8 },
  title: { fontSize: 26, fontWeight: "800", color: colors.ink, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 6, marginBottom: 28 },
  form: { gap: 4 },
  error: { color: colors.danger, marginBottom: 12, fontSize: 13 },
  hint: { fontSize: 12, color: colors.muted, textAlign: "center", marginVertical: 20, lineHeight: 18 },
});
