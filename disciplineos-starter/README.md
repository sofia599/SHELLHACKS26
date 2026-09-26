# DisciplineOS — starter

What's here, matching everything discussed so far:

- **React + Vite web app** — wellness hexagon (drag the dots or use sliders), a focus-sprint timer that writes a `status` value to Firebase for the clip to read, and a journal entry box with a stubbed AI reflection.
- **ESP32 firmware** (`firmware/esp32_clip/esp32_clip.ino`) — reads that same `status` value and drives a WS2812 LED: blue for focus, breathing green for break, flashing red for "distracted," rainbow for a completed streak.

Not included yet (next layers to add, discussed but not built here): Canvas API calendar sync, Plaid sandbox for Financial, real Firebase Auth (everything currently runs under one fixed `demo-user` id), and a real AI call for the journal reflection (see the comment at the top of `src/components/Journal.jsx` — don't call an LLM API with a real key directly from the browser).

## 1. Run the web app

```bash
npm install
cp .env.example .env
```

Fill in `.env` with your Firebase project's config (Firebase console → Project settings → General → Your apps → SDK setup and config). Then in the same Firebase project:

1. Build → Realtime Database → Create Database (start in test mode for the hackathon; lock it down later)
2. Build → Authentication → you can skip this for now, the starter uses a fixed `demo-user` id (see `.env`'s `VITE_DEMO_USER_ID`)

```bash
npm run dev
```

Opens at `http://localhost:5173`. Starting a sprint writes `users/demo-user/status = "focus"` to your Realtime Database — you can watch it change live in the Firebase console under Realtime Database while you test.

## 2. Flash the clip

1. Open `firmware/esp32_clip/esp32_clip.ino` in the Arduino IDE
2. Install libraries: **Firebase ESP Client** (by mobizt) and **Adafruit NeoPixel**, via Library Manager
3. Fill in `WIFI_SSID`, `WIFI_PASSWORD`, `FIREBASE_HOST` (your `databaseURL` without `https://`), and `FIREBASE_AUTH` (a database secret from Project settings → Service accounts → Database secrets — fine for a hackathon demo, don't ship this pattern to production)
4. Make sure `USER_ID` matches `VITE_DEMO_USER_ID` in your `.env`
5. Set `LED_PIN` to whatever GPIO your WS2812 data line is on, upload

Once both are running: start a sprint in the web app, and the clip should turn solid blue within ~1.5 seconds. Hit "I got distracted" and it should flash red.

## 3. Deploy the web app

Push this to GitHub, connect the repo to Vercel, add the same `.env` values as environment variables in the Vercel project settings. Auto-deploys on every push after that.
