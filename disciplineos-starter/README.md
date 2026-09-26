# DisciplineOS

The website and phone app are separate React projects that share the same Firebase Realtime Database paths when configured.

Both apps have Home, Profile, and wellness-dimension calendar screens. The Profile screen includes a persistent Bright/Dark appearance setting. Activities are routed using local keyword suggestions; ambiguous activity names need a dimension choice. New activities stay pending in their dimension calendar until confirmed, and only confirmed activities appear on Home. The Home month calendar can connect to Google Calendar, display primary-calendar events, and sync confirmed DisciplineOS activities.

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

To enable Google Calendar on web, set up OAuth as described below and fill in `VITE_GOOGLE_CLIENT_ID` in `web/.env`, then restart Vite.

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

For Google Calendar on mobile, set the platform-specific Google client IDs in `mobile/.env.local`. After changing Expo environment values, restart Expo with its cache cleared (`npx expo start -c` from `mobile/`).

Edit the phone UI in `mobile/App.js` and its Firebase connection in `mobile/firebase.js`. Both apps use the same user ID and Firebase paths for dimensions, dated wellness scores, activities, and journal entries. Without Firebase config, each app runs with local demo data that does not persist across restarts.

## Connect Google Calendar

1. In Google Cloud Console, select or create a project, enable **Google Calendar API**, and configure the OAuth consent screen. Add your Google account as a test user while the consent screen is in testing mode.
2. Create an OAuth client ID of type **Web application**. Add authorized JavaScript origins for `http://localhost:5173`, `http://127.0.0.1:5173`, and `http://localhost:8082` (the mobile browser preview). Add your deployed web origin when deploying.
3. Put that client ID in `web/.env` as `VITE_GOOGLE_CLIENT_ID`.
4. For installed Android/iOS builds, create additional OAuth client IDs using package/bundle ID `com.disciplineos.app`. Android credentials also require the SHA-1 signing certificate fingerprint. Put these IDs in `mobile/.env.local` as `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`; set the web client as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
5. Restart each development server, then use **Connect Google Calendar** on Home and approve the requested Calendar events permission.

Google access tokens remain in memory for the active app session. Confirmed activities are created as all-day events in the Google primary calendar and carry a private DisciplineOS activity ID to prevent duplicate syncs. The apps request access to calendar events, not contacts or other Google data.

## ESP32 clip

1. Open `firmware/esp32_clip/esp32_clip.ino` in the Arduino IDE.
2. Install **Firebase ESP Client** (by mobizt) and **Adafruit NeoPixel** from Library Manager.
3. Configure `WIFI_SSID`, `WIFI_PASSWORD`, `FIREBASE_HOST` (the database URL without `https://`), and `FIREBASE_AUTH` in the sketch.
4. Set `USER_ID` to match `VITE_DEMO_USER_ID` in `web/.env` and configure `LED_PIN` for the WS2812 data line.

The clip reads the user's Realtime Database status and changes its LED pattern when another integration updates that status.

## Deploy the website

For Vercel, set the project root directory to `web/` and add the Firebase values from `web/.env` as environment variables.
