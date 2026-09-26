/*
  DisciplineOS clip firmware — ESP32 + WS2812 LED(s)

  Libraries needed (install via Arduino Library Manager):
    - Firebase ESP Client (by mobizt)   -> handles the Realtime DB connection
    - Adafruit NeoPixel                 -> drives the WS2812 LED(s)

  Wiring:
    - WS2812 data pin -> ESP32 GPIO 5 (change LED_PIN below if different)
    - WS2812 5V -> ESP32 5V / VIN, GND -> GND

  What this does:
    Every ~1.5s it reads users/{uid}/status from Firebase Realtime DB
    (the same path the React app writes to from FocusSprint.jsx) and sets
    the LED pattern to match: idle / focus / break / alert / streak.
*/

#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <Adafruit_NeoPixel.h>

// ---- fill these in ----
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define FIREBASE_HOST "your-project-id-default-rtdb.firebaseio.com" // no https://, no trailing slash
#define FIREBASE_AUTH "YOUR_DATABASE_SECRET_OR_LEGACY_TOKEN"        // Project settings > Service accounts > Database secrets
#define USER_ID "demo-user" // must match VITE_DEMO_USER_ID in the web app's .env

#define LED_PIN 5
#define LED_COUNT 8

Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

String currentStatus = "idle";
unsigned long lastPoll = 0;
const unsigned long POLL_INTERVAL_MS = 1500;

void setup() {
  Serial.begin(115200);
  strip.begin();
  strip.show();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected: " + WiFi.localIP().toString());

  config.host = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  unsigned long now = millis();
  if (now - lastPoll >= POLL_INTERVAL_MS) {
    lastPoll = now;
    pollStatus();
  }
  renderStatus();
}

void pollStatus() {
  String path = "/users/" + String(USER_ID) + "/status";
  if (Firebase.RTDB.getString(&fbdo, path)) {
    currentStatus = fbdo.stringData();
  } else {
    Serial.println("Firebase read failed: " + fbdo.errorReason());
  }
}

// Called every loop so animated patterns (pulse, flash) stay smooth
// between the ~1.5s status polls.
void renderStatus() {
  if (currentStatus == "focus") {
    solidColor(0, 120, 255); // blue
  } else if (currentStatus == "break") {
    pulseColor(0, 200, 120); // green, breathing
  } else if (currentStatus == "alert") {
    flashColor(255, 30, 30); // red, fast flash
  } else if (currentStatus == "streak") {
    rainbowCycle();
  } else {
    solidColor(20, 20, 20); // idle: dim white
  }
}

void solidColor(int r, int g, int b) {
  for (int i = 0; i < LED_COUNT; i++) strip.setPixelColor(i, strip.Color(r, g, b));
  strip.show();
}

void pulseColor(int r, int g, int b) {
  float phase = (millis() % 2000) / 2000.0;
  float brightness = (sin(phase * 2 * PI) + 1) / 2; // 0..1
  solidColor(r * brightness, g * brightness, b * brightness);
}

void flashColor(int r, int g, int b) {
  bool on = (millis() / 150) % 2 == 0;
  solidColor(on ? r : 0, on ? g : 0, on ? b : 0);
}

void rainbowCycle() {
  uint16_t hue = (millis() * 8) % 65536;
  for (int i = 0; i < LED_COUNT; i++) {
    strip.setPixelColor(i, strip.gamma32(strip.ColorHSV(hue + i * 2000)));
  }
  strip.show();
}
