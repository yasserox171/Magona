import { ActivityIndicator, StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/context/auth-context";
import { RootStackParamList } from "./src/navigation/types";
import { LoginScreen } from "./src/screens/LoginScreen";
import { RegisterScreen } from "./src/screens/RegisterScreen";
import { SearchScreen } from "./src/screens/SearchScreen";
import { VehicleSelectScreen } from "./src/screens/VehicleSelectScreen";
import { CheckoutScreen } from "./src/screens/CheckoutScreen";
import { BookingDetailScreen } from "./src/screens/BookingDetailScreen";
import { MyBookingsScreen } from "./src/screens/MyBookingsScreen";
import { colors } from "./src/theme";

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="VehicleSelect" component={VehicleSelectScreen} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} />
          <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
          <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
});
