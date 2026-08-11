import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { api } from "../api";
import { BookingSummary } from "../types";
import { Card } from "../components/Card";
import { StatusBadge } from "../components/StatusBadge";
import { colors, formatMoney } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "MyBookings">;

export function MyBookingsScreen({ navigation }: Props) {
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<BookingSummary[]>("/bookings/mine?scope=all");
      setBookings(data);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.flex}>
      <Text style={styles.title}>My bookings</Text>
      <FlatList
        data={bookings}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        ListEmptyComponent={<Text style={styles.empty}>No bookings yet.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate("BookingDetail", { bookingId: item.id })}>
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tripText}>
                    {item.pickupLabel} → {item.dropoffLabel}
                  </Text>
                  <Text style={styles.meta}>
                    {new Date(item.pickupDateTime).toLocaleString()} · {item.reference}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <StatusBadge status={item.status} />
                  <Text style={styles.price}>{formatMoney(item.totalCents, item.currency)}</Text>
                </View>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: "800", color: colors.ink, padding: 20, paddingTop: 60 },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  card: {},
  row: { flexDirection: "row", gap: 12 },
  tripText: { fontSize: 14, fontWeight: "700", color: colors.ink },
  meta: { fontSize: 12, color: colors.muted, marginTop: 4 },
  price: { fontSize: 13, fontWeight: "700", color: colors.ink },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
});
