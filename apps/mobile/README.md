# Magona Mobile (demo)

A React Native (Expo) demo app covering the core customer booking flow — sign in/register, search
& quote, vehicle selection, checkout (booked on invoice — see note below), booking confirmation
and status, and a bookings list. It talks to the same NestJS API as `apps/web`.

It's a **demo build**, not a port of the entire web platform: driver/fleet/admin/corporate
portals, in-app card payment, live map tracking and push notifications are not included here
(the API supports all of that already — see the root README and `apps/web` for the full feature
set). In-app card payment specifically needs the Stripe React Native SDK
(`@stripe/stripe-react-native`), which isn't wired up in this demo, so checkout always books on
invoice.

## Why this isn't part of the pnpm workspace

Metro (React Native's bundler) doesn't resolve pnpm's symlinked `node_modules` reliably, so this
app is a standalone project managed with **npm**, independent from the `apps/web`/`apps/api` pnpm
workspace. Run all commands below from inside `apps/mobile`.

## I can't build the APK for you here

This project was built inside a sandboxed cloud session whose network policy blocks both routes to
actually compile an Android app:

- `dl.google.com` (needed to install the Android SDK for a local build) → blocked
- `expo.dev` / `api.expo.dev` (Expo's cloud build service, EAS Build) → blocked

So there's no APK file or download link from this session — what's here is the complete,
verified-working app source (typechecks cleanly and the Metro/Android bundle builds successfully:
`npx expo export --platform android`). You'll build the actual `.apk` yourself, from a machine or
CI runner with normal internet access, using one of the two options below. Both are quick.

## Option A — EAS Build (cloud, easiest, no Android Studio needed)

```bash
cd apps/mobile
npm install
npm install -g eas-cli
eas login                     # free Expo account
eas build:configure           # links this project to your EAS account, fills in app.json's projectId
eas build -p android --profile apk
```

`eas build` uploads the project and builds the APK on Expo's servers; when it finishes it gives
you a **direct download link** for the `.apk`. Takes roughly 10–15 minutes.

The `apk` build profile in `eas.json` is preconfigured with `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000/api/v1`,
which is the standard alias Android emulators use to reach a server running on your host machine's
`localhost:4000`. For a real device or a deployed API, override it — see `.env.example`.

## Option B — Local build with Android Studio

```bash
cd apps/mobile
npm install
cp .env.example .env          # adjust EXPO_PUBLIC_API_URL if needed
npx expo run:android          # requires Android Studio + SDK installed locally
```

This builds and installs a debug APK directly onto a connected device/emulator. For a signed
release `.apk` file you can hand to someone else, run `cd android && ./gradlew assembleRelease`
after `expo run:android` has generated the `android/` folder once — the output lands at
`android/app/build/outputs/apk/release/app-release.apk`.

## Running against the API

1. Start the API and Postgres as described in the root README (`docker compose up -d`, then
   `pnpm --filter api prisma:migrate && pnpm --filter api prisma:seed && pnpm dev:api`).
2. Point `EXPO_PUBLIC_API_URL` at wherever that API is reachable from your device/emulator (see
   `.env.example` for the emulator/physical-device/deployed cases).
3. Sign in with a seeded demo account, e.g. `customer@magona.com` / `Password123!`.

## Live development (no APK needed)

For iterating on the app itself, you don't need a compiled APK at all — install **Expo Go** on
your phone (from the Play Store) and run:

```bash
npm start
```

then scan the QR code. This is the fastest way to see changes live.
