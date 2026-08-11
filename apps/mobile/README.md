# Magona Mobile (demo)

A React Native (Expo) demo app covering the core customer booking flow — sign in/register, search
& quote, vehicle selection, checkout (booked on invoice — see note below), booking confirmation
and status, and a bookings list.

**This build runs entirely on-device, with no backend required.** `src/api.ts` implements a small
local mock of the same endpoints the real NestJS API (`apps/api`) exposes — auth, quotes (using
the same pricing formula as `packages/shared/src/pricing.ts`), and bookings — backed by
`AsyncStorage` so accounts and bookings persist across app restarts. Booking status progresses
automatically over a few minutes after you book (confirmed → driver assigned → en route → arrived
→ in progress → completed) so the tracking screens feel alive without any server. See
`src/demo/store.ts` and `src/demo/pricing.ts` for the implementation, and `src/api.ts` for the
request router. Sign in with the seeded demo account: `customer@magona.com` / `Password123!` (or
register a new one — it's stored locally on the device).

If you'd rather point the app at the real API instead (e.g. to exercise the actual backend,
Stripe payments, driver assignment, etc.), see git history for the previous network-backed version
of `src/api.ts`, or re-implement `api.get/post/patch` as thin `fetch` wrappers against
`EXPO_PUBLIC_API_URL` — every screen calls through that same `api` object, so nothing else needs
to change.

It's a **demo build**, not a port of the entire web platform: driver/fleet/admin/corporate
portals, in-app card payment, live map tracking and push notifications are not included here
(the full API supports all of that — see the root README and `apps/web`). In-app card payment
specifically needs the Stripe React Native SDK (`@stripe/stripe-react-native`), which isn't wired
up in this demo, so checkout always books on invoice.

## Why this isn't part of the pnpm workspace

Metro (React Native's bundler) doesn't resolve pnpm's symlinked `node_modules` reliably, so this
app is a standalone project managed with **npm**, independent from the `apps/web`/`apps/api` pnpm
workspace. Run all commands below from inside `apps/mobile`.

## Getting a built APK

Sandboxed cloud sessions typically can't compile an Android app themselves — their network policy
blocks both `dl.google.com` (Android SDK, needed for a local Gradle build) and `expo.dev`/
`api.expo.dev` (Expo's cloud build service, EAS Build). Instead, `.github/workflows/build-android-apk.yml`
at the repo root builds the APK on GitHub's own runners (which have normal internet access) and
publishes it as a GitHub Release asset (`app-release.apk` / `app-debug.apk`) — see the repo's
Releases page. It runs automatically on every push to `apps/mobile/**`, or on demand via
"Run workflow" in the Actions tab.

To build locally yourself instead, from a machine or CI runner with normal internet access, use
one of the two options below.

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

## Note on `EXPO_PUBLIC_API_URL` / `.env.example`

These are vestigial in the current on-device-demo build — `src/api.ts` no longer makes network
requests, so nothing reads that variable. They're left in place (and still consumed by
`eas.json`'s `apk` build profile) for anyone who restores the network-backed `api.ts` to run
against the real `apps/api` backend; see the note at the top of this file.

## Live development (no APK needed)

For iterating on the app itself, you don't need a compiled APK at all — install **Expo Go** on
your phone (from the Play Store) and run:

```bash
npm start
```

then scan the QR code. This is the fastest way to see changes live.
