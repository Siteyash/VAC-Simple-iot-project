# 🔌 Hardware Wiring & Setup Guide - Simple IOT World

This guide provides the complete hardware pinout, connection diagrams, and Arduino IDE setup for **Simple IOT World**.

---

## 📌 Components Required
1. **NodeMCU ESP8266** (CP2102 USB-to-UART Driver)
2. **DHT11 Temperature & Humidity Sensor** (3-pin or 4-pin module)
3. **16x2 LCD Display with I2C Backpack Module** (Default Address: `0x27`)
4. **5mm LED** (any color) + **220Ω – 330Ω Resistor**
5. **Breadboard & Jumper Wires**
6. **Micro-USB Cable** (Data capable)

---

## ⚡ Complete Pin Connection Table

| Peripheral | Component Pin | NodeMCU CP2102 Pin | GPIO Number | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **DHT11 Sensor** | **VCC (+)** | **3V3** (or 5V) | - | Power supply |
| | **DATA / OUT** | **D5** | GPIO 14 | Digital signal pin |
| | **GND (-)** | **GND** | - | Ground reference |
| **16x2 LCD (I2C)** | **VCC** | **Vin** (5V) or 3V3 | - | 5V Vin gives brighter backlight |
| | **GND** | **GND** | - | Ground |
| | **SDA** | **D2** | GPIO 4 | I2C Serial Data |
| | **SCL** | **D1** | GPIO 5 | I2C Serial Clock |
| **Actuator LED** | **Anode (+ Long Leg)** | **D3** | GPIO 0 | Via 220Ω Current Limiting Resistor |
| | **Cathode (- Short)** | **GND** | - | Connected to Ground |

> [!NOTE]
> If your 16x2 LCD shows dark boxes or appears blank on first power-up, use a small flat-head screwdriver to gently turn the **blue potentiometer** on the back of the I2C backpack to adjust the contrast!

---

## 📊 Schematic Diagram (ASCII Art)

```text
                  +-----------------------------------+
                  |         NodeMCU ESP8266           |
                  |                                   |
                  |  [3V3] ----------------+          |
                  |  [GND] -------------+  |          |
                  |                     |  |          |
   DHT11 Sensor   |  [D5] (GPIO14) <----+--|-- DATA   |
                  |  [GND] -------------+  |   GND    |
                  |  [3V3] ----------------+   VCC    |
                  |                                   |
   16x2 LCD (I2C) |  [D1] (GPIO5)  ----------------- SCL
   Address: 0x27  |  [D2] (GPIO4)  ----------------- SDA
                  |  [Vin] (5V)    ----------------- VCC
                  |  [GND]         ----------------- GND
                  |                                   |
   Actuator LED   |  [D3] (GPIO0)  ---> [ 220Ω ] ---> (Anode +) LED
                  |  [GND] -------------------------> (Cathode -)
                  +-----------------------------------+
```

---

## 💻 Arduino IDE Setup Instructions

### 1. Install ESP8266 Board Package
1. Open **Arduino IDE**.
2. Go to **File -> Preferences**.
3. In **Additional Boards Manager URLs**, paste:
   ```text
   http://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```
4. Click **OK**.
5. Go to **Tools -> Board -> Boards Manager...**, search for `esp8266`, and click **Install**.

### 2. Install Required Libraries
Go to **Sketch -> Include Library -> Manage Libraries...** and install the following:
1. **DHT sensor library** by *Adafruit* (Accept prompt to install *Adafruit Unified Sensor*)
2. **LiquidCrystal I2C** by *Frank de Brabander* (or *Marco Schwartz*)
3. **ArduinoJson** by *Benoit Blanchon* (Version 6 or 7)

### 3. Configure Board Settings
Select the following under the **Tools** menu:
- **Board**: `NodeMCU 1.0 (ESP-12E Module)`
- **Upload Speed**: `115200`
- **CPU Frequency**: `80 MHz`
- **Port**: Select your CP2102 COM Port (e.g., `COM3`, `COM4`, etc.)

---

## 🌐 Connecting to Render After Deployment

1. Open `esp8266/Simple_IOT_World.ino` in Arduino IDE.
2. Update WiFi Credentials (already pre-configured to `EXAM` and `123456789`):
   ```cpp
   const char* ssid     = "EXAM";
   const char* password = "123456789";
   ```
3. Set your deployed Render URL:
   ```cpp
   const char* serverUrl = "https://your-app-name.onrender.com";
   ```
   *(Ensure there is **no trailing slash** `/` at the end).*
4. Click **Upload** (Arrow icon) in Arduino IDE.
5. Open Serial Monitor at **115200 baud** to see real-time boot status, WiFi connection, and sync logs.
