import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { api, ApiError } from "../api";
import { PlaceInput, QuoteResponse, RideType } from "../types";
import { useAuth } from "../context/auth-context";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { LocationPickerModal } from "../components/LocationPickerModal";
import { colors } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Search">;

const TRIP_TYPES: { value: RideType; label: string }[] = [
  { value: RideType.POINT_TO_POINT, label: "One-way" },
  { value: RideType.AIRPORT_PICKUP, label: "Airport pickup" },
  { value: RideType.AIRPORT_DROPOFF, label: "Airport dropoff" },
  { value: RideType.HOURLY, label: "Hourly" },
];

function defaultPickupDateTime() {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  return d;
}

export function SearchScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [rideType, setRideType] = useState<RideType>(RideType.POINT_TO_POINT);
  const [pickup, setPickup] = useState<PlaceInput | null>(null);
  const [dropoff, setDropoff] = useState<PlaceInput | null>(null);
  const [pickupDateTime, setPickupDateTime] = useState(defaultPickupDateTime());
  const [passengers, setPassengers] = useState(1);
  const [luggage, setLuggage] = useState(1);
  const [flightNumber, setFlightNumber] = useState("");
  const [pickerFor, setPickerFor] = useState<"pickup" | "dropoff" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isHourly = rideType === RideType.HOURLY;
  const isAirport = rideType === RideType.AIRPORT_PICKUP || rideType === RideType.AIRPORT_DROPOFF;

  function adjustTime(minutes: number) {
    setPickupDateTime((d) => new Date(d.getTime() + minutes * 60 * 1000));
  }

  async function handleSearch() {
    setError(null);
    if (!pickup || (!isHourly && !dropoff)) {
      setError(`Please choose a pickup${isHourly ? "" : " and destination"} location.`);
      return;
    }
    setLoading(true);
    try {
      const quote = await api.post<QuoteResponse>(
        "/quotes",
        {
          rideType,
          pickup,
          dropoff: isHourly ? pickup : dropoff,
          pickupDateTime: pickupDateTime.toISOString(),
          passengers,
          luggage,
          hourlyDurationMinutes: isHourly ? 120 : undefined,
          currency: "EUR",
        },
        { auth: false },
      );
      navigation.navigate("VehicleSelect", { quote, passengers, luggage });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong, please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Book a ride</Text>
          {user && <Text style={styles.subtitle}>Hi {user.firstName}</Text>}
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          {user && (
            <Pressable onPress={() => navigation.navigate("MyBookings")}>
              <Text style={styles.link}>My bookings</Text>
            </Pressable>
          )}
          <Pressable onPress={signOut}>
            <Text style={styles.link}>Sign out</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.tripTypeRow}>
        {TRIP_TYPES.map((t) => (
          <Pressable
            key={t.value}
            onPress={() => setRideType(t.value)}
            style={[styles.chip, rideType === t.value && styles.chipActive]}
          >
            <Text style={[styles.chipText, rideType === t.value && styles.chipTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={() => setPickerFor("pickup")}>
        <TextField label="Pickup location" editable={false} value={pickup?.label ?? ""} placeholder="Tap to choose" />
      </Pressable>

      {!isHourly && (
        <Pressable onPress={() => setPickerFor("dropoff")}>
          <TextField label="Destination" editable={false} value={dropoff?.label ?? ""} placeholder="Tap to choose" />
        </Pressable>
      )}

      <View style={styles.timeRow}>
        <Text style={styles.label}>Pickup date & time</Text>
        <View style={styles.timeAdjustRow}>
          <Pressable style={styles.stepper} onPress={() => adjustTime(-30)}>
            <Text style={styles.stepperText}>−30m</Text>
          </Pressable>
          <Text style={styles.timeValue}>{pickupDateTime.toLocaleString()}</Text>
          <Pressable style={styles.stepper} onPress={() => adjustTime(30)}>
            <Text style={styles.stepperText}>+30m</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.stepperGroupRow}>
        <Counter label="Passengers" value={passengers} onChange={setPassengers} min={1} max={8} />
        <Counter label="Luggage" value={luggage} onChange={setLuggage} min={0} max={8} />
      </View>

      {isAirport && (
        <TextField label="Flight number (optional)" placeholder="e.g. LH123" value={flightNumber} onChangeText={setFlightNumber} autoCapitalize="characters" />
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Button title="See prices" onPress={handleSearch} loading={loading} />

      <LocationPickerModal
        visible={pickerFor !== null}
        title={pickerFor === "pickup" ? "Choose pickup location" : "Choose destination"}
        onClose={() => setPickerFor(null)}
        onSelect={(place) => {
          if (pickerFor === "pickup") setPickup(place);
          else setDropoff(place);
          setPickerFor(null);
        }}
      />
    </ScrollView>
  );
}

function Counter({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <View style={styles.counter}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.counterRow}>
        <Pressable style={styles.stepper} onPress={() => onChange(Math.max(min, value - 1))}>
          <Text style={styles.stepperText}>−</Text>
        </Pressable>
        <Text style={styles.counterValue}>{value}</Text>
        <Pressable style={styles.stepper} onPress={() => onChange(Math.min(max, value + 1))}>
          <Text style={styles.stepperText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingTop: 60, paddingBottom: 60 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "800", color: colors.ink },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  link: { color: colors.brand, fontWeight: "600", fontSize: 13 },
  tripTypeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "#eef2f7" },
  chipActive: { backgroundColor: colors.brand },
  chipText: { fontSize: 13, color: colors.text, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 6 },
  timeRow: { marginBottom: 14 },
  timeAdjustRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  timeValue: { flex: 1, fontSize: 13, color: colors.text, textAlign: "center" },
  stepperGroupRow: { flexDirection: "row", gap: 20, marginBottom: 8 },
  counter: { flex: 1 },
  counterRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  counterValue: { fontSize: 16, fontWeight: "700", color: colors.text, width: 20, textAlign: "center" },
  stepper: { width: 40, height: 34, borderRadius: 10, backgroundColor: "#eef2f7", alignItems: "center", justifyContent: "center" },
  stepperText: { fontWeight: "700", color: colors.text, fontSize: 13 },
  error: { color: colors.danger, marginVertical: 10, fontSize: 13 },
});
