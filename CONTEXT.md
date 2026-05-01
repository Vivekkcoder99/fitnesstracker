# Context

## Fast Map

- `App.js` is the runtime entry point for both native and web.
- `src/navigation/RootNavigator.js` decides auth vs app state.
- `src/config/firebase.js` owns Firebase init and auth persistence.
- `src/screens/activity/TrackActivityScreen.js` owns the tracking payload contract.
- `src/screens/home/HomeScreen.js` reads the user dashboard, weekly summary, and install prompt state.
- `public/manifest.json` and `public/sw.js` are required for PWA behavior.

## Tech Stack

- Expo SDK 54 with React Native 0.81 and React 19
- React Navigation for app routing
- Firebase v12 for Auth, Firestore, and Storage
- `expo-location` for GPS tracking
- `react-native-maps` for route previews
- `@react-native-async-storage/async-storage` for native auth persistence
- Expo web static export for PWA and browser deployment
- Vercel for static hosting

## Project Structure

- `App.js` - app entry point; sets web PWA metadata/service worker and renders the root navigator
- `app/` - legacy Expo Router starter files; not used by the current runtime path
- `app.config.js` - dynamic Expo config, including Google Maps API keys
- `app.json` - core Expo manifest and asset config
- `public/` - web PWA assets (`manifest.json`, `sw.js`)
- `src/config/firebase.js` - Firebase app/bootstrap and auth persistence
- `src/navigation/` - auth and app navigator stacks
- `src/screens/` - feature screens for auth, home, profile, and activity tracking
- `src/services/` - Firebase and location/domain services
- `assets/images/` - app icons, splash, and web favicon assets
- `components/`, `hooks/`, `constants/` - Expo template leftovers and shared UI helpers
- `vercel.json` - Vercel static hosting config
- `scripts/reset-project.js` - template reset utility

## Key Files And Roles

- [App.js](./App.js) - mounts the app and registers the web manifest/service worker
- [src/config/firebase.js](./src/config/firebase.js) - initializes Firebase, Firestore, Storage, and native auth persistence
- [src/services/authService.js](./src/services/authService.js) - signup, login, logout, password reset, and Firebase error normalization
- [src/services/activityService.js](./src/services/activityService.js) - save/read activity records from Firestore
- [src/services/profileService.js](./src/services/profileService.js) - load/save user profile documents
- [src/screens/auth/LoginScreen.js](./src/screens/auth/LoginScreen.js) - login UI and password reset entry point
- [src/screens/auth/SignupScreen.js](./src/screens/auth/SignupScreen.js) - signup UI
- [src/screens/home/HomeScreen.js](./src/screens/home/HomeScreen.js) - dashboard, weekly progress, profile summary, install prompt, logout, activity list
- [src/screens/activity/TrackActivityScreen.js](./src/screens/activity/TrackActivityScreen.js) - GPS tracking, step filtering, time tracking, pace smoothing, and activity save payload
- [src/screens/activity/ActivityDetailScreen.js](./src/screens/activity/ActivityDetailScreen.js) - activity summary and route preview
- [src/screens/activity/RouteMap.native.js](./src/screens/activity/RouteMap.native.js) - native Google Maps route rendering
- [src/screens/activity/RouteMap.web.js](./src/screens/activity/RouteMap.web.js) - web fallback route display
- [src/screens/profile/ProfileScreen.js](./src/screens/profile/ProfileScreen.js) - profile editor with validation
- [src/navigation/RootNavigator.js](./src/navigation/RootNavigator.js) - auth gate, Firebase readiness gate, and app switching
- [src/navigation/AppNavigator.js](./src/navigation/AppNavigator.js) - main authenticated stack
- [src/navigation/AuthNavigator.js](./src/navigation/AuthNavigator.js) - login/signup stack

## Critical Paths

- Auth flow:
  - `src/config/firebase.js` initializes Firebase Auth with persistence.
  - `src/navigation/RootNavigator.js` listens to auth state and routes the app.
  - `src/screens/auth/LoginScreen.js` and `src/screens/auth/SignupScreen.js` are the only user-facing entry points for auth.
- Navigation flow:
  - `App.js` mounts `NavigationContainer`.
  - `src/navigation/AppNavigator.js` handles authenticated screens.
  - `src/navigation/AuthNavigator.js` handles login/signup.
  - Do not introduce a second router or parallel navigation tree.
- Tracking flow:
  - `src/screens/activity/TrackActivityScreen.js` creates the saved activity payload.
  - `src/services/activityService.js` normalizes stored activities for the dashboard and detail screens.
- PWA flow:
  - `App.js` injects manifest and service worker references.
  - `public/manifest.json` and `public/sw.js` must stay in sync with web export behavior.

## Environment Variables

Firebase web config:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

Google Maps native config:

- `GOOGLE_MAPS_IOS_API_KEY`
- `GOOGLE_MAPS_ANDROID_API_KEY`

Notes:

- `EXPO_PUBLIC_` variables are used at runtime by Expo web/native JS.
- Google Maps keys are consumed in `app.config.js` for native builds.

## Current Working Features

- Email/password signup and login
- Password reset email from the login screen
- Firebase auth persistence across app restarts on native platforms
- Home dashboard with:
  - lifetime distance and active time totals
  - profile summary
  - weekly progress summary
  - recent activity list
  - web install prompt / iPhone install hint
- Profile editing with Firestore persistence and range validation
- Activity tracking with:
  - GPS route recording
  - step batching and noise filtering
  - elapsed time vs active time
  - manual pause/resume and auto-pause
  - pace smoothing
  - UTC-normalized timestamps in saved payloads
- Activity detail view with map route preview
- Native Google Maps route rendering
- PWA support:
  - `manifest.json`
  - service worker
  - install prompt flow on supported browsers
- Static web export for Vercel deployment

## Known Issues

- The `app/` directory still contains legacy Expo Router starter files, but the runtime uses `App.js` plus React Navigation. Do not move routes back to file-based routing without a deliberate migration.
- The tracking logic is heuristic and client-driven. It is useful for a fitness app, but it is not a medically validated motion engine.
- Step counts and pace depend on GPS accuracy and phone sensor quality. Poor signal can still produce imperfect results.
- Native Google Maps support requires valid API keys and a native rebuild after config changes.
- The PWA service worker is basic app-shell caching, not a complete offline-first sync system.
- Firestore writes are direct from the client; there is no custom backend or server-side validation layer.
- There are no automated tests in the repo yet.

## DO NOT MODIFY Rules

- Do not change auth state handling unless you are updating `firebase.js`, `RootNavigator.js`, and the auth screens together.
- Do not change navigation screen names without updating all `navigate(...)` calls and stack routes in the same edit.
- Do not change the activity payload keys without checking dashboard, history, and detail consumers together.
- Do not change Firestore paths or document shapes unless the entire read/write path is updated together.
- Do not replace the PWA setup with an unrelated web framework or a second service worker.
- Do not replace `App.js` with Expo Router entry points unless the whole navigation architecture is being migrated on purpose.
- Do not change Firestore collection/document paths without updating every read/write path together.
- Do not rename the `EXPO_PUBLIC_FIREBASE_*` variables or the Google Maps keys.
- Do not remove native auth persistence from `src/config/firebase.js`.
- Do not remove `public/manifest.json` or `public/sw.js`; they are required for PWA behavior.
- Do not change the saved activity payload shape casually. The Home screen, profile summary, and activity details all depend on it.
- Do not move the route preview back to Apple Maps or web-only fallbacks without checking native build behavior.
- Do not add a second routing system while React Navigation is still the runtime source of truth.
- Do not introduce destructive git operations or overwrite user changes.

## Coding Guidelines For Future AI Agents

- Start by reading the Fast Map and Critical Paths sections before editing.
- When switching tools or handing off work, restate which path you are touching: auth, navigation, tracking, profile, or PWA.
- Keep changes surgical and verify the dependent screens after each edit.
- Prefer direct edits to the smallest file set that can safely preserve the current contract.
- Read the existing screen and service patterns before editing.
- Keep changes close to the current architecture; prefer small, explicit patches over refactors that move many files at once.
- Use `apply_patch` for edits.
- Keep code ASCII unless an existing file already uses other characters.
- Preserve web and native parity when changing user-facing flows.
- Run `npm run lint` and a web/native export check after meaningful changes.
- Prefer utility functions in `src/services/` for shared data logic.
- Keep auth, profile, and activity payloads backward compatible.
- Normalize timestamps to UTC before saving to Firestore.
- Avoid adding a new backend abstraction unless the user explicitly asks for one.
- Treat the current Firestore schema as the public contract for the frontend.
- When adding UI, keep it practical and dense rather than decorative.
- If a change touches tracking logic, verify the saved payload still feeds:
  - dashboard summaries
  - activity history
  - activity details
  - route preview
