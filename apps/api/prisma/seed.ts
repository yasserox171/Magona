import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@magona.com" },
    update: {},
    create: {
      email: "admin@magona.com",
      passwordHash,
      firstName: "Ada",
      lastName: "Admin",
      role: "ADMIN",
      isEmailVerified: true,
      gdprConsentAt: new Date(),
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "customer@magona.com" },
    update: {},
    create: {
      email: "customer@magona.com",
      passwordHash,
      firstName: "Chris",
      lastName: "Customer",
      role: "CUSTOMER",
      isEmailVerified: true,
      gdprConsentAt: new Date(),
    },
  });

  const fleetOwner = await prisma.user.upsert({
    where: { email: "fleet@magona.com" },
    update: {},
    create: {
      email: "fleet@magona.com",
      passwordHash,
      firstName: "Frank",
      lastName: "FleetOwner",
      role: "FLEET_ADMIN",
      isEmailVerified: true,
      gdprConsentAt: new Date(),
    },
  });

  const fleet = await prisma.fleet.upsert({
    where: { ownerUserId: fleetOwner.id },
    update: {},
    create: {
      name: "CityLine Chauffeurs",
      ownerUserId: fleetOwner.id,
      contactEmail: "ops@cityline.example",
      contactPhone: "+49 30 1234567",
      status: "ACTIVE",
      city: "Berlin",
      country: "Germany",
      commissionRate: 0.2,
    },
  });

  const driverUser = await prisma.user.upsert({
    where: { email: "driver@magona.com" },
    update: {},
    create: {
      email: "driver@magona.com",
      passwordHash,
      firstName: "Dana",
      lastName: "Driver",
      role: "DRIVER",
      isEmailVerified: true,
      gdprConsentAt: new Date(),
    },
  });

  const driver = await prisma.driver.upsert({
    where: { userId: driverUser.id },
    update: {},
    create: {
      userId: driverUser.id,
      fleetId: fleet.id,
      licenseNumber: "DL-998877",
      licenseExpiry: new Date("2028-01-01"),
      approvalStatus: "APPROVED",
      status: "AVAILABLE",
      rating: 4.9,
      currentLat: 52.5200,
      currentLng: 13.4050,
    },
  });

  await prisma.vehicle.upsert({
    where: { licensePlate: "B-MG 1001" },
    update: {},
    create: {
      fleetId: fleet.id,
      category: "BUSINESS",
      make: "Mercedes-Benz",
      model: "E-Class",
      year: 2023,
      color: "Black",
      licensePlate: "B-MG 1001",
      capacity: 3,
      luggageCapacity: 3,
      status: "ACTIVE",
      primaryDriverId: driver.id,
    },
  });

  await prisma.vehicle.upsert({
    where: { licensePlate: "B-MG 1002" },
    update: {},
    create: {
      fleetId: fleet.id,
      category: "VAN",
      make: "Mercedes-Benz",
      model: "V-Class",
      year: 2022,
      color: "Silver",
      licensePlate: "B-MG 1002",
      capacity: 7,
      luggageCapacity: 6,
      status: "ACTIVE",
    },
  });

  for (const category of ["ECONOMY", "BUSINESS", "PREMIUM", "VAN"] as const) {
    const defaults: Record<string, { base: number; km: number; min: number; floor: number }> = {
      ECONOMY: { base: 800, km: 150, min: 25, floor: 1500 },
      BUSINESS: { base: 1400, km: 220, min: 35, floor: 2500 },
      PREMIUM: { base: 2200, km: 320, min: 50, floor: 4000 },
      VAN: { base: 1800, km: 260, min: 40, floor: 3500 },
    };
    const d = defaults[category];
    await prisma.pricingRule.upsert({
      where: { id: `${category}-global` },
      update: {},
      create: {
        id: `${category}-global`,
        vehicleCategory: category,
        city: null,
        baseFareCents: d.base,
        perKmCents: d.km,
        perMinuteCents: d.min,
        minimumFareCents: d.floor,
        active: true,
      },
    });
  }

  await prisma.promoCode.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: { code: "WELCOME10", discountType: "PERCENTAGE", discountValue: 10, active: true },
  });

  const corpAdmin = await prisma.user.upsert({
    where: { email: "corporate@magona.com" },
    update: {},
    create: {
      email: "corporate@magona.com",
      passwordHash,
      firstName: "Carla",
      lastName: "CorporateAdmin",
      role: "CORPORATE_ADMIN",
      isEmailVerified: true,
      gdprConsentAt: new Date(),
    },
  });

  await prisma.corporateAccount.upsert({
    where: { id: "seed-corporate-account" },
    update: {},
    create: {
      id: "seed-corporate-account",
      companyName: "Nova Consulting GmbH",
      billingEmail: "billing@novaconsulting.example",
      discountRate: 0.1,
      monthlyInvoicing: true,
      admins: { connect: { id: corpAdmin.id } },
      employees: { create: { userId: customer.id, costCenter: "CC-100" } },
    },
  });

  // eslint-disable-next-line no-console
  console.log("Seed complete. Demo accounts (password: Password123!):");
  // eslint-disable-next-line no-console
  console.table([
    { role: "ADMIN", email: admin.email },
    { role: "CUSTOMER", email: customer.email },
    { role: "FLEET_ADMIN", email: fleetOwner.email },
    { role: "DRIVER", email: driverUser.email },
    { role: "CORPORATE_ADMIN", email: corpAdmin.email },
  ]);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
