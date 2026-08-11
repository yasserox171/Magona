import { FlatList, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { VehicleQuote } from "../types";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { colors, formatMoney } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "VehicleSelect">;

const VEHICLE_EMOJI: Record<string, string> = { ECONOMY: "🚗", BUSINESS: "🚙", PREMIUM: "🚘", VAN: "🚐" };

export function VehicleSelectScreen({ route, navigation }: Props) {
  const { quote, passengers, luggage } = route.params;

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose your vehicle</Text>
        <Text style={styles.subtitle}>
          {quote.pickup.label} → {quote.dropoff.label}
        </Text>
        <Text style={styles.meta}>
          {quote.distanceKm} km · {quote.durationMinutes} min
        </Text>
      </View>

      <FlatList
        data={quote.vehicles}
        keyExtractor={(v) => v.category}
        contentContainerStyle={styles.list}
        renderItem={({ item }: { item: VehicleQuote }) => (
          <Card style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.emoji}>{VEHICLE_EMOJI[item.category] ?? "🚗"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.vehicleName}>{item.label}</Text>
                <Text style={styles.vehicleDesc}>{item.description}</Text>
                <Text style={styles.vehicleMeta}>
                  {item.maxPassengers} seats · {item.maxLuggage} bags
                  {item.eta ? ` · ${item.eta} min away` : ""}
                </Text>
              </View>
              <Text style={styles.price}>{formatMoney(item.totalCents, item.currency)}</Text>
            </View>
            <Button
              title="Select"
              onPress={() => navigation.navigate("Checkout", { quote, category: item.category, passengers, luggage })}
            />
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  header: { padding: 20, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: "800", color: colors.ink },
  subtitle: { fontSize: 13, color: colors.text, marginTop: 6 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  card: { gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  emoji: { fontSize: 32 },
  vehicleName: { fontSize: 16, fontWeight: "700", color: colors.ink },
  vehicleDesc: { fontSize: 12, color: colors.muted, marginTop: 2 },
  vehicleMeta: { fontSize: 11, color: colors.muted, marginTop: 4 },
  price: { fontSize: 16, fontWeight: "800", color: colors.ink },
});
