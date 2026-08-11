import { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { api, ApiError } from "../api";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { StatusBadge } from "../components/StatusBadge";
import { colors, formatMoney } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "BookingDetail">;

interface BookingDetail {
  id: string;
  reference: string;
  status: string;
  pickupLabel: string;
  dropoffLabel: string;
  pickupDateTime: string;
  vehicleCategory: string;
  totalCents: number;
  currency: string;
  driver?: { user: { firstName: string; lastName: string; phone?: string } } | null;
  vehicle?: { make: string; model: string; color: string; licensePlate: string } | null;
  statusEvents: { id: string; status: string; createdAt: string }[];
}

const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "DRIVER_ASSIGNED", "DRIVER_EN_ROUTE", "DRIVER_ARRIVED"];

export function BookingDetailScreen({ route, navigation }: Props) {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.get<BookingDetail>(`/bookings/${bookingId}`);
      setBooking(data);
    } catch {
      // ignore — likely a transient network error, user can pull to retry via MyBookings
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleCancel() {
    Alert.alert("Cancel booking", "Are you sure you want to cancel this booking?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await api.post(`/bookings/${bookingId}/cancel`, {});
            load();
          } catch (err) {
            Alert.alert("Error", err instanceof ApiError ? err.message : "Unable to cancel booking");
          }
        },
      },
    ]);
  }

  if (loading || !booking) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted }}>Loading…</Text>
      </View>
    );
  }

  const canCancel = ACTIVE_STATUSES.includes(booking.status);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Booking {booking.reference}</Text>
        <StatusBadge status={booking.status} />
      </View>

      <Card style={styles.card}>
        <Row label="Trip" value={`${booking.pickupLabel} → ${booking.dropoffLabel}`} />
        <Row label="Date & time" value={new Date(booking.pickupDateTime).toLocaleString()} />
        <Row label="Vehicle" value={booking.vehicleCategory} />
        <Row label="Total" value={formatMoney(booking.totalCents, booking.currency)} />
      </Card>

      {booking.driver && (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Your driver</Text>
          <Text style={styles.text}>
            {booking.driver.user.firstName} {booking.driver.user.lastName} · {booking.driver.user.phone}
          </Text>
          {booking.vehicle && (
            <Text style={styles.textMuted}>
              {booking.vehicle.color} {booking.vehicle.make} {booking.vehicle.model} · {booking.vehicle.licensePlate}
            </Text>
          )}
        </Card>
      )}

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Status history</Text>
        {booking.statusEvents.map((event) => (
          <View key={event.id} style={styles.eventRow}>
            <Text style={styles.text}>{event.status.replace(/_/g, " ")}</Text>
            <Text style={styles.textMuted}>{new Date(event.createdAt).toLocaleString()}</Text>
          </View>
        ))}
      </Card>

      {canCancel && <Button title="Cancel booking" variant="danger" onPress={handleCancel} />}
      <View style={{ height: 12 }} />
      <Button title="Back to search" variant="outline" onPress={() => navigation.popToTop()} />
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.textMuted}>{label}</Text>
      <Text style={styles.textStrong}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  container: { padding: 20, paddingTop: 60, paddingBottom: 60, gap: 14 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  title: { fontSize: 20, fontWeight: "800", color: colors.ink },
  card: { gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.ink, marginBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  text: { fontSize: 13, color: colors.text },
  textMuted: { fontSize: 12, color: colors.muted },
  textStrong: { fontSize: 13, color: colors.text, fontWeight: "700" },
  eventRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
});
