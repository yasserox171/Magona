import { QuoteResponse, VehicleCategory } from "../types";

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Search: undefined;
  VehicleSelect: { quote: QuoteResponse; passengers: number; luggage: number };
  Checkout: { quote: QuoteResponse; category: VehicleCategory; passengers: number; luggage: number };
  BookingDetail: { bookingId: string };
  MyBookings: undefined;
};
