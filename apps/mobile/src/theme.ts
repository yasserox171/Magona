export const colors = {
  brand: "#1857f0",
  brandDark: "#0f1f4a",
  ink: "#0b1220",
  text: "#1f2937",
  muted: "#6b7280",
  border: "#e2e8f0",
  bg: "#f8fafc",
  card: "#ffffff",
  danger: "#dc2626",
  success: "#059669",
  warning: "#d97706",
};

export const statusColors: Record<string, string> = {
  PENDING: colors.warning,
  CONFIRMED: colors.brand,
  DRIVER_ASSIGNED: colors.brand,
  DRIVER_EN_ROUTE: colors.brand,
  DRIVER_ARRIVED: colors.brand,
  IN_PROGRESS: colors.brand,
  COMPLETED: colors.success,
  CANCELLED: colors.danger,
  NO_SHOW: colors.danger,
};

export function formatMoney(amountCents: number, currency: string): string {
  const symbols: Record<string, string> = { EUR: "€", USD: "$", GBP: "£", AED: "AED " };
  return `${symbols[currency] ?? ""}${(amountCents / 100).toFixed(2)}`;
}
