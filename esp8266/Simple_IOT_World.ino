/*
 * =====================================================================================
 * Project Name : Simple IOT World
 * Author       : Yash Site And Team. Department of ETC
 * Target Board : ESP8266 NodeMCU (CP2102)
 * Sensors      : DHT11 on Pin D5 (GPIO 14)
 * Actuators    : 16x2 LCD I2C @ 0x27 on Pins D1 (SCL, GPIO 5) & D2 (SDA, GPIO 4)
 *                LED on Pin D3 (GPIO 0)
 * Connectivity : WiFi + HTTPS REST API (Deployable at Render)
 * =====================================================================================
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <WiFiClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ==========================================
// 1. PIN DEFINITIONS (NodeMCU ESP8266)
// ==========================================
#define DHTPIN      D5      // DHT11 Data Pin (GPIO 14)
#define DHTTYPE     DHT11   // DHT 11
#define LED_PIN     D3      // Actuator LED Pin (GPIO 0)
#define I2C_SCL     D1      // I2C SCL Pin (GPIO 5)
#define I2C_SDA     D2      // I2C SDA Pin (GPIO 4)

// ==========================================
// 2. NETWORK & SERVER CONFIGURATION
// ==========================================
const char* ssid     = "EXAM";
const char* password = "123456789";

// Render Backend URL (Leave blank or fill after deploying to Render)
// Example: "https://simple-iot-world.onrender.com"
// IMPORTANT: Do NOT include trailing slash '/' at the end.
const char* serverUrl = ""; 

// ==========================================
// 3. HARDWARE INSTANCES
// ==========================================
LiquidCrystal_I2C lcd(0x27, 16, 2); // I2C address 0x27, 16 columns, 2 rows
DHT dht(DHTPIN, DHTTYPE);

// Device state variables
String serverLedStatus = "OFF";
String serverLcdLine1  = "Smart Display";
String serverLcdLine2  = "MYDATA";

float currentTemp = 0.0;
float currentHum  = 0.0;

// Helper: Clear specific LCD row and write text
void writeLcdRow(uint8_t row, String text) {
  lcd.setCursor(0, row);
  while (text.length() < 16) {
    text += " ";
  }
  lcd.print(text.substring(0, 16));
}

// ==========================================
// 4. SETUP
// ==========================================
void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n\n========================================");
  Serial.println("  Starting Simple IOT World - NodeMCU   ");
  Serial.println("========================================");

  // Initialize Hardware Pins
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW); // Start with LED OFF

  // Initialize I2C for 16x2 LCD
  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();
  lcd.clear();

  // Initialize DHT Sensor
  dht.begin();

  // ----------------------------------------
  // Exact Boot LCD Sequence as Requested:
  // R1: MyProject
  // R2: WELCOME
  // delay(3s)
  // ----------------------------------------
  writeLcdRow(0, "MyProject");
  writeLcdRow(1, "WELCOME");
  delay(3000);

  // ----------------------------------------
  // Connect to WiFi
  // R1: CONNECTING TO
  // R2: WIFI... SUCCESS
  // ----------------------------------------
  lcd.clear();
  writeLcdRow(0, "CONNECTING TO");
  writeLcdRow(1, "WIFI...");
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected Successfully!");
    Serial.print("NodeMCU IP Address: ");
    Serial.println(WiFi.localIP());

    writeLcdRow(0, "CONNECTING TO");
    writeLcdRow(1, "WIFI... SUCCESS");
  } else {
    Serial.println("\nWiFi Connection Failed or Timed Out!");
    writeLcdRow(0, "WIFI FAILED");
    writeLcdRow(1, "CHECK ROUTER");
  }

  delay(2000);
  lcd.clear();
}

// ==========================================
// 5. SERVER COMMUNICATION (HTTPS / HTTP)
// ==========================================
void syncWithServer(float temp, float hum) {
  if (strlen(serverUrl) == 0) {
    Serial.println("[WARN] Server URL is blank. Please enter your Render URL.");
    return;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ERROR] WiFi not connected. Cannot sync with server.");
    return;
  }

  Serial.println("\n>>> Syncing with Server...");

  // Endpoint: /api/device/data
  String endpoint = String(serverUrl) + "/api/device/data";

  // Prepare JSON Payload
  StaticJsonDocument<256> sendDoc;
  sendDoc["temperature"] = temp;
  sendDoc["humidity"]    = hum;

  String requestBody;
  serializeJson(sendDoc, requestBody);

  bool isHttps = endpoint.startsWith("https://");

  HTTPClient http;
  int httpResponseCode = -1;

  if (isHttps) {
    WiFiClientSecure secureClient;
    secureClient.setInsecure(); // Bypass SSL verification for Render
    secureClient.setTimeout(8000);

    http.begin(secureClient, endpoint);
    http.addHeader("Content-Type", "application/json");
    httpResponseCode = http.POST(requestBody);
  } else {
    WiFiClient regularClient;
    regularClient.setTimeout(8000);

    http.begin(regularClient, endpoint);
    http.addHeader("Content-Type", "application/json");
    httpResponseCode = http.POST(requestBody);
  }

  Serial.print("POST to: ");
  Serial.println(endpoint);
  Serial.print("HTTP Response Code: ");
  Serial.println(httpResponseCode);

  if (httpResponseCode == 200 || httpResponseCode == 201) {
    String responseString = http.getString();
    Serial.print("Server Response: ");
    Serial.println(responseString);

    StaticJsonDocument<512> recvDoc;
    DeserializationError error = deserializeJson(recvDoc, responseString);

    if (!error) {
      if (recvDoc.containsKey("ledStatus")) {
        serverLedStatus = recvDoc["ledStatus"].as<String>();
      }
      if (recvDoc.containsKey("lcdLine1")) {
        serverLcdLine1 = recvDoc["lcdLine1"].as<String>();
      }
      if (recvDoc.containsKey("lcdLine2")) {
        serverLcdLine2 = recvDoc["lcdLine2"].as<String>();
      }

      if (serverLedStatus == "ON") {
        digitalWrite(LED_PIN, HIGH);
        Serial.println("LED turned: ON (HIGH)");
      } else {
        digitalWrite(LED_PIN, LOW);
        Serial.println("LED turned: OFF (LOW)");
      }
    } else {
      Serial.print("JSON Parse Error: ");
      Serial.println(error.c_str());
    }
  } else {
    Serial.println("[ERROR] Failed to communicate with server");
  }

  http.end();
}

// ==========================================
// 6. MAIN LOOP
// ==========================================
void loop() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();

  if (!isnan(t) && !isnan(h)) {
    currentTemp = t;
    currentHum  = h;
  } else {
    Serial.println("[WARN] Failed to read from DHT11 sensor! Using previous values.");
  }

  Serial.println("\n----------------------------------------");
  Serial.print("Current Sensor Readings -> Temp: ");
  Serial.print(currentTemp);
  Serial.print(" °C | Hum: ");
  Serial.print(currentHum);
  Serial.println(" %");

  syncWithServer(currentTemp, currentHum);

  // ----------------------------------------------------
  // EXACT LCD DISPLAY SEQUENCE
  // ----------------------------------------------------
  // SCREEN 1: Temperature
  writeLcdRow(0, "TEMPERATURE");
  writeLcdRow(1, String((int)currentTemp) + "`C");
  delay(2000);

  // SCREEN 2: Humidity
  writeLcdRow(0, "Humidity");
  writeLcdRow(1, String((int)currentHum) + "%");
  delay(2000);

  // SCREEN 3: Smart Display Data from Server
  String row1Display = serverLcdLine1.length() > 0 ? serverLcdLine1 : "Smart Display";
  String row2Display = serverLcdLine2.length() > 0 ? serverLcdLine2 : "MYDATA";
  writeLcdRow(0, row1Display);
  writeLcdRow(1, row2Display);
  delay(2000);

  // SCREEN 4: LED Status from Server
  writeLcdRow(0, "LED Status");
  writeLcdRow(1, serverLedStatus);
  delay(2000);
}
