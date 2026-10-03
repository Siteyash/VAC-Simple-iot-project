# 🌐 Simple IOT World

> **ESP8266 IoT Environmental Monitoring & Actuator Control Web Application**  
> *Designed & Developed with Love (❤️) by Yash Site And Team. Department of ETC*

![NodeJS](https://img.shields.io/badge/Node.js-v18+-339933?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-Backend-000000?style=flat&logo=express)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-Frontend-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![ESP8266](https://img.shields.io/badge/ESP8266-NodeMCU_CP2102-E7352C?style=flat&logo=espressif&logoColor=white)
![Render](https://img.shields.io/badge/Deploy-Render_Ready-46E3B7?style=flat&logo=render&logoColor=black)

---

## 📋 Project Overview

**Simple IOT World** is a complete, production-ready IoT and Web Application platform. It interfaces an **ESP8266 NodeMCU CP2102** microcontroller equipped with a **DHT11** sensor, a **16x2 I2C LiquidCrystal Display**, and an **Actuator LED** with a responsive, modern web dashboard.

### 🌟 Key Features

1. **Authentication (Page 1)**:
   - User Sign In & Registration (Full Name, Email, Password).
   - Glassmorphic card design with blue and green gradients.
   - Pre-seeded Demo Credentials (`tushar@example.com` / `password123`).

2. **Web Dashboard (Page 2)**:
   - **Header**:
     - Web App Name: **Simple IOT World**.
     - Logged in User Greeting: `Welcome <Name>` (e.g. *Welcome Tushar*).
     - **ESP8266 Online / Offline Status Badge** (Live heartbeat check within 30s).
     - **Light & Dark Theme Toggle** with persistent state.
     - Logout button.

   - **Tab 1: Live Monitor & Records**:
     - **Section 1**: Current Temperature and Humidity displayed in rich, colorful SVG circular gauges / seek bars with large bold values, status badges, and min/max readings.
     - Interactive **Chart.js** smooth trend graphs for Temperature (°C) and Humidity (%).
     - **Section 2**: Saved Records History table formatted as:
       `# | Temperature | Humidity | Time | Date | Action (Delete)`
       - **TimeZone**: Formatted to **Asia/Kolkata (+05:30)**.
       - Individual record deletion and complete table purge.

   - **Tab 2: Smart LCD Display**:
     - 2 Text Input fields:
       - **Field 1**: Max 16 Characters.
       - **Field 2**: Max 16 Characters.
     - **Save Button**: Saves message to cloud so ESP8266 receives and displays it on its next cycle.
     - **Interactive Virtual 16x2 LCD Simulator**: Real-time dot-matrix preview as you type, with switchable classic green or cyber blue backlights.

   - **Tab 3: LED Actuator Control**:
     - Innovative 3D neon-glowing power button.
     - Realistic glowing lightbulb graphic that reacts dynamically when ON (radiant green/blue glow) or OFF (dim filament).
     - Real-time cloud sync with NodeMCU Pin **D3 (GPIO 0)**.

3. **Footer**:
   - `Designed & Developed with Love (❤️) by Yash Site And Team.Department of ETC`

---

## 🔌 Hardware Specifications (ESP8266 NodeMCU)

- **Microcontroller**: ESP8266 (NodeMCU CP2102)
- **Sensor**: DHT11 Temperature & Humidity on **D5 (GPIO 14)**
- **Actuator 1 (LCD)**: 16x2 LCD with I2C Backpack (`@0x27`) on **D1 (SCL, GPIO 5)** & **D2 (SDA, GPIO 4)**
- **Actuator 2 (LED)**: 5mm LED on **D3 (GPIO 0)**
- **WiFi SSID**: `EXAM`
- **WiFi Password**: `123456789`

### LCD 16x2 Screen Rotation Sequence
- **In Setup**:
  - `R1: MyProject` / `R2: WELCOME` *(delay 3s)*
  - `R1: CONNECTING TO` / `R2: WIFI... SUCCESS`
- **In Loop** *(every 10s cycle with 2s delays)*:
  - `R1: TEMPERATURE` / `R2: <temp>`C` *(delay 2s)*
  - `R1: Humidity` / `R2: <hum>%` *(delay 2s)*
  - `R1: Smart Display` / `R2: <server_data>` *(delay 2s)*
  - `R1: LED Status` / `R2: ON/OFF` *(delay 2s)*

Detailed wiring schematics and library setup can be found in [esp8266/WIRING_GUIDE.md](file:///c:/Users/HP/Documents/VAC/esp8266/WIRING_GUIDE.md).

---

## 🚀 Running Locally

### Prerequisites
- Node.js (v18 or higher)
- npm

### Steps
1. Open terminal in the project directory:
   ```bash
   cd c:\Users\HP\Documents\VAC
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Open your browser and navigate to:
   ```text
   http://localhost:3000
   ```
5. Log in using the demo account or register a new one:
   - **Email**: `tushar@example.com`
   - **Password**: `password123`

---

## ☁️ Deploying to Render (Free Cloud Hosting)

This web application is 100% pre-configured and ready for deployment on **Render**:

1. **Push your code to GitHub / GitLab**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Simple IOT World"
   git remote add origin https://github.com/<your-username>/simple-iot-world.git
   git push -u origin main
   ```

2. **Create a New Web Service on Render**:
   - Go to [https://dashboard.render.com](https://dashboard.render.com)
   - Click **New +** -> **Web Service**
   - Connect your GitHub repository.
   - Configure the following settings:
     - **Name**: `simple-iot-world` *(or any unique name)*
     - **Region**: Singapore / Frankfurt / Oregon
     - **Branch**: `main`
     - **Runtime**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Instance Type**: `Free`
   - Click **Deploy Web Service**.

3. **Get your Render Live URL**:
   - Render will generate an HTTPS URL, for example:
     ```text
     https://simple-iot-world.onrender.com
     ```
4. **Update the ESP8266 Firmware**:
   - Open `esp8266/Simple_IOT_World.ino`.
   - Update `serverUrl` with your Render URL:
     ```cpp
     const char* serverUrl = "https://simple-iot-world.onrender.com";
     ```
   - Flash the code to your NodeMCU CP2102.

---

## 📡 REST API Reference

| Method | Endpoint | Description | Payload Example |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user | `{"name":"Tushar","email":"tushar@ex.com","password":"123"}` |
| `POST` | `/api/auth/login` | User login | `{"email":"tushar@ex.com","password":"123"}` |
| `POST` | `/api/device/data` | ESP8266 Telemetry Sync | `{"temperature": 34.0, "humidity": 50.0}` |
| `GET` | `/api/device/config` | Read Device Status & LCD/LED Config | *None* |
| `GET` | `/api/device/status` | Read Online / Offline & Telemetry | *None* |
| `POST` | `/api/device/led` | Web UI Toggle LED | `{"status": "ON"}` or `{"status": "OFF"}` |
| `POST` | `/api/device/lcd` | Web UI Update 16x2 LCD Text | `{"line1": "Smart Display", "line2": "MYDATA"}` |
| `GET` | `/api/records` | Get all saved records (Asia/Kolkata) | *None* |
| `DELETE` | `/api/records/:id` | Delete a single record | *None* |
| `DELETE` | `/api/records` | Clear all records | *None* |

---

## 📂 Project Structure

```text
VAC/
├── package.json               # Node.js project manifest & dependencies
├── server.js                  # Express backend & REST API endpoints
├── README.md                  # Complete documentation
├── .gitignore                 # Git ignore file
├── data/                      # Simple JSON file database
│   ├── users.json             # Registered user accounts
│   ├── records.json           # Historical sensor records
│   └── device_state.json      # Real-time IoT state (telemetry, LED, LCD)
├── public/                    # Frontend client files
│   ├── index.html             # Auth and Web Dashboard UI
│   ├── css/
│   │   └── style.css          # Theme, Gauges, LCD & LED custom styles
│   └── js/
│       └── app.js             # Client logic, charts, gauges & socket-less polling
└── esp8266/                   # Hardware firmware
    ├── Simple_IOT_World.ino   # NodeMCU Arduino sketch
    ├── Simple_IOT_World/      # Arduino IDE sketchbook folder
    │   └── Simple_IOT_World.ino
    └── WIRING_GUIDE.md        # Hardware schematics & pinout guide
```
