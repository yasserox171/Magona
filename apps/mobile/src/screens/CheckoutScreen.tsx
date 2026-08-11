import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { api, ApiError } from "../api";
import { PaymentMethodType } from "../types";
import { useAuth } from "../context/auth-context";
import { TextField } from "../components/TextField";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { colors, formatMoney } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Checkout">;

interface BookingResponse {
  booking: { id: string };
  payment: { id: string } | null;
  clientSecret: string | null;
}

export function CheckoutScreen({ route, navigation }: Props) {
  const { quote, category, passengers, luggage } = route.params;
  const { user } = useAuth();
  const vehicle = quote.vehicles.find((v) => v.category === category)!;

  const [form, setForm] = useState({ passengerName: "", passengerEmail: "", passengerPhone: "", meetAndGreet: false, notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm((f) => ({ ...f, passengerName: f.passengerName || `${user.firstName} ${user.lastName}`, passengerEmail: f.passengerEmail || user.email }));
    }
  }, [user]);

  async function handleConfirm() {
    setError(null);
    setLoading(true);
    try {
      const result = await api.post<BookingResponse>("/bookings", {
        quoteId: quote.quoteId,
        vehicleCategory: category,
        passengers,
        luggage,
        ...form,
        // Card payment confirmation requires the Stripe SDK, not included in this demo build.
        paymentMethodType: PaymentMethodType.INVOICE,
      });
      navigation.reset({ index: 0, routes: [{ name: "BookingDetail", params: { bookingId: result.booking.id } }] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to complete your booking");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Review & confirm</Text>

        <Card style={styles.summaryCard}>
          <Text style={styles.summaryText}>{quote.pickup.label}</Text>
          <Text style={styles.summaryText}>→ {quote.dropoff.label}</Text>
          <Text style={styles.summaryMeta}>{new Date(quote.pickupDateTime).toLocaleString()}</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatMoney(vehicle.totalCents, vehicle.currency)}</Text>
          </View>
        </Card>

        <TextField label="Full name" value={form.passengerName} onChangeText={(v) => setForm({ ...form, passengerName: v })} />
        <TextField label="Email" autoCapitalize="none" keyboardType="email-address" value={form.passengerEmail} onChangeText={(v) => setForm({ ...form, passengerEmail: v })} />
        <TextField label="Phone" value={form.passengerPhone} onChangeText={(v) => setForm({ ...form, passengerPhone: v })} />

        <View style={styles.switchRow}>
          <Switch value={form.meetAndGreet} onValueChange={(v) => setForm({ ...form, meetAndGreet: v })} />
          <Text style={styles.switchLabel}>Meet & greet at arrivals</Text>
        </View>

        <TextField label="Notes for the driver (optional)" value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} />

        <Text style={styles.paymentNote}>
          This demo build books on invoice — in-app card payment requires the Stripe React Native SDK, which isn't
          included here. The API fully supports Stripe card payments (see apps/web for the web checkout flow).
        </Text>

        {error && <Text style={styles.error}>{error}</Text>}
        <Button title="Confirm booking" onPress={handleConfirm} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingTop: 60, paddingBottom: 60 },
  title: { fontSize: 22, fontWeight: "800", color: colors.ink, marginBottom: 16 },
  summaryCard: { marginBottom: 20, gap: 4 },
  summaryText: { fontSize: 14, color: colors.text },
  summaryMeta: { fontSize: 12, color: colors.muted, marginBottom: 8 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: 14, fontWeight: "700", color: colors.text },
  totalValue: { fontSize: 16, fontWeight: "800", color: colors.ink },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  switchLabel: { fontSize: 13, color: colors.text },
  paymentNote: { fontSize: 11, color: colors.muted, marginVertical: 16, lineHeight: 16 },
  error: { color: colors.danger, marginBottom: 10, fontSize: 13 },
});
