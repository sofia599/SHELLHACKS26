# DisciplineOS

The website and phone app are separate React projects that share the same Firebase Realtime Database paths when configured.

Both apps have Home, Profile, wellness-dimension calendars, a 24-question assessment, and an Emails screen. Profile contains the persistent Bright/Dark setting and a score-change history. The first assessment sets each dimension from four 1–5 answers (average mapped to 0–100). New activities are routed using local keyword suggestions; ambiguous names need a dimension choice. Same-day plans in different dimensions prompt a recommendation: pinned priorities first, then the lowest score. Confirmed activities are scored once: completed adds 4 points, missed subtracts 3, with scores bounded to 0–100. The Home calendar also supports Google Calendar display/sync.

## Project layout

- `web/` contains the React + Vite website.
- `mobile/` contains the Expo + React Native phone app. It has a phone-specific layout and controls, rather than being a copy of the website screen.
- `firmware/esp32_clip/` contains the ESP32 clip firmware.

## Run the website

Install dependencies once from the repository root:

```bash
npm --prefix web install
```

Copy `web/.env.example` to `web/.env` and add your Firebase project's config (Firebase Console → Project settings → General → Your apps → SDK setup and config). In that Firebase project, create a Realtime Database. The starter uses a fixed `demo-user` id for now; real Firebase Auth is not set up yet.

To enable Google Calendar and Gmail on web, set up OAuth as described below and fill in `VITE_GOOGLE_CLIENT_ID` in `web/.env`, then restart Vite.

Run the website from the repository root:

```bash
npm run web
```

Vite serves it at `http://localhost:5173`. To make a production build, run `npm run web:build`.

## Run the phone app

Install **Expo Go** on an Android or iPhone, or use an Android emulator. An iOS Simulator requires macOS.

Copy `mobile/.env.example` to `mobile/.env.local` and enter the same Firebase project values, using the `EXPO_PUBLIC_` names from that file. These client values are not server secrets. Start Expo from the repository root:

```bash
npm run mobile
```

Scan Expo's QR code with Expo Go. Press `a` in the Expo terminal to open an Android emulator. `npm run mobile:ios` requires macOS and an installed iOS Simulator.

For Google Calendar and Gmail on mobile, set the platform-specific Google client IDs in `mobile/.env.local`. After changing Expo environment values, restart Expo with its cache cleared (`npx expo start -c` from `mobile/`).

Edit the phone UI in `mobile/App.js` and its Firebase connection in `mobile/firebase.js`. Both apps use the same user ID and Firebase paths for dimensions, dated wellness scores, activities, and journal entries. Without Firebase config, each app runs with local demo data that does not persist across restarts.

## Connect Google Calendar

1. In Google Cloud Console, select or create a project, enable **Google Calendar API** and **Gmail API**, and configure the OAuth consent screen. Add your Google account as a test user while the consent screen is in testing mode.
2. Create an OAuth client ID of type **Web application**. Add authorized JavaScript origins for `http://localhost:5173`, `http://127.0.0.1:5173`, and `http://localhost:8082` (the mobile browser preview). Add your deployed web origin when deploying.
3. Put that client ID in `web/.env` as `VITE_GOOGLE_CLIENT_ID`.
4. For installed Android/iOS builds, create additional OAuth client IDs using package/bundle ID `com.disciplineos.app`. Android credentials also require the SHA-1 signing certificate fingerprint. Put these IDs in `mobile/.env.local` as `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`; set the web client as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
5. Add your Google account as an OAuth test user, restart each development server, then connect from Home or Emails and grant the requested scope. Calendar requests event access; Emails requests `gmail.readonly`.

Google access tokens remain in memory for the active app session. Confirmed activities are created as all-day events in the Google primary calendar and carry a private DisciplineOS activity ID to prevent duplicate syncs. Gmail uses `gmail.readonly` and only displays recent inbox metadata/snippets; it cannot send, delete, or modify messages. Gmail read scopes may require additional Google OAuth verification before public release. Google API access requires configured OAuth client IDs and API enablement; without these the screens remain disabled.

## ESP32 clip

1. Open `firmware/esp32_clip/esp32_clip.ino` in the Arduino IDE.
2. Install **Firebase ESP Client** (by mobizt) and **Adafruit NeoPixel** from Library Manager.
3. Configure `WIFI_SSID`, `WIFI_PASSWORD`, `FIREBASE_HOST` (the database URL without `https://`), and `FIREBASE_AUTH` in the sketch.
4. Set `USER_ID` to match `VITE_DEMO_USER_ID` in `web/.env` and configure `LED_PIN` for the WS2812 data line.

The clip reads the user's Realtime Database status and changes its LED pattern when another integration updates that status.

## Deploy the website

For Vercel, set the project root directory to `web/` and add the Firebase values from `web/.env` as environment variables.
