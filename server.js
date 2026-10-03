const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Data directory and paths
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');
const DEVICE_STATE_FILE = path.join(DATA_DIR, 'device_state.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper: Safely read JSON file
function readJsonFile(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return defaultValue;
  }
}

// Helper: Safely write JSON file
function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error.message);
    return false;
  }
}

// Helper: Format Date & Time for Asia/Kolkata (+05:30)
function getKolkataDateTime(dateObj = new Date()) {
  try {
    // Format Time: HH:MM AM/PM
    const timeFormatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    const formattedTime = timeFormatter.format(dateObj).toUpperCase();

    // Format Date: DD-MM-YYYY
    const dateFormatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const parts = dateFormatter.formatToParts(dateObj);
    const day = parts.find(p => p.type === 'day')?.value || '01';
    const month = parts.find(p => p.type === 'month')?.value || '01';
    const year = parts.find(p => p.type === 'year')?.value || '2026';
    const formattedDate = `${day}-${month}-${year}`;

    return { time: formattedTime, date: formattedDate };
  } catch (err) {
    console.error('Kolkata time format error:', err);
    return { time: '12:00 PM', date: '01-01-2026' };
  }
}

// Initialize files if missing
readJsonFile(USERS_FILE, []);
readJsonFile(RECORDS_FILE, []);
readJsonFile(DEVICE_STATE_FILE, {
  temperature: 0,
  humidity: 0,
  ledStatus: 'OFF',
  lcdLine1: 'Simple IOT World',
  lcdLine2: 'System Ready',
  lastSeen: 0
});

// ==========================================
// Authentication APIs (Page 1)
// ==========================================

// Register User
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields (Name, Email, Password) are required' });
  }

  const users = readJsonFile(USERS_FILE, []);
  const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (existingUser) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists' });
  }

  const newUser = {
    id: 'user_' + Date.now(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: password.trim(), // Stored cleanly for simple JSON database
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeJsonFile(USERS_FILE, users);

  return res.status(201).json({
    success: true,
    message: 'Registration successful! You can now log in.',
    user: { id: newUser.id, name: newUser.name, email: newUser.email }
  });
});

// Login User
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and Password are required' });
  }

  const users = readJsonFile(USERS_FILE, []);
  const user = users.find(
    u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password.trim()
  );

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  return res.json({
    success: true,
    message: 'Login successful',
    user: { id: user.id, name: user.name, email: user.email }
  });
});

// ==========================================
// ESP8266 IoT Device APIs
// ==========================================

// ESP8266 sends Temperature & Humidity (Every 10 seconds)
// Also returns current LCD & LED configuration in response
app.post('/api/device/data', (req, res) => {
  let { temperature, humidity } = req.body;

  // Support numeric conversion
  temperature = parseFloat(temperature);
  humidity = parseFloat(humidity);

  if (isNaN(temperature) || isNaN(humidity)) {
    return res.status(400).json({ success: false, message: 'Invalid temperature or humidity value' });
  }

  const now = new Date();
  const { time, date } = getKolkataDateTime(now);
  const timestamp = now.getTime();

  // 1. Update Device State
  const state = readJsonFile(DEVICE_STATE_FILE, {
    temperature: 0,
    humidity: 0,
    ledStatus: 'OFF',
    lcdLine1: 'Simple IOT World',
    lcdLine2: 'System Ready',
    lastSeen: 0
  });

  state.temperature = Math.round(temperature * 10) / 10;
  state.humidity = Math.round(humidity * 10) / 10;
  state.lastSeen = timestamp;
  writeJsonFile(DEVICE_STATE_FILE, state);

  // 2. Save New Record into Records JSON
  const records = readJsonFile(RECORDS_FILE, []);
  const nextId = records.length > 0 ? Math.max(...records.map(r => r.id || 0)) + 1 : 1;

  const newRecord = {
    id: nextId,
    temperature: state.temperature,
    humidity: state.humidity,
    time: time,
    date: date,
    timestamp: timestamp
  };

  records.push(newRecord);

  // Keep max 500 records to prevent memory bloat
  if (records.length > 500) {
    records.splice(0, records.length - 500);
  }

  writeJsonFile(RECORDS_FILE, records);

  // Return updated instructions to ESP8266
  return res.json({
    success: true,
    message: 'Data recorded successfully',
    ledStatus: state.ledStatus,
    lcdLine1: state.lcdLine1,
    lcdLine2: state.lcdLine2
  });
});

// Fetch current device config (used by ESP8266 GET or Web dashboard)
app.get('/api/device/config', (req, res) => {
  const state = readJsonFile(DEVICE_STATE_FILE, {
    temperature: 0,
    humidity: 0,
    ledStatus: 'OFF',
    lcdLine1: 'Simple IOT World',
    lcdLine2: 'System Ready',
    lastSeen: 0
  });

  const isOnline = Date.now() - (state.lastSeen || 0) < 30000; // Online if pinged within 30 seconds

  return res.json({
    success: true,
    ledStatus: state.ledStatus,
    lcdLine1: state.lcdLine1,
    lcdLine2: state.lcdLine2,
    temperature: state.temperature,
    humidity: state.humidity,
    isOnline: isOnline,
    lastSeen: state.lastSeen
  });
});

// Device status endpoint for Web Dashboard polling
app.get('/api/device/status', (req, res) => {
  const state = readJsonFile(DEVICE_STATE_FILE, {
    temperature: 0,
    humidity: 0,
    ledStatus: 'OFF',
    lcdLine1: 'Simple IOT World',
    lcdLine2: 'System Ready',
    lastSeen: 0
  });

  const now = Date.now();
  const diffSec = Math.floor((now - (state.lastSeen || 0)) / 1000);
  const isOnline = diffSec <= 30; // 30 second timeout for ESP8266 (sends every 10s)

  return res.json({
    success: true,
    ...state,
    isOnline,
    secondsSinceLastPing: diffSec
  });
});

// Tab 3: Innovative Button to Turn LED ON and OFF
app.post('/api/device/led', (req, res) => {
  const { status } = req.body;
  if (!status || (status !== 'ON' && status !== 'OFF')) {
    return res.status(400).json({ success: false, message: 'Status must be ON or OFF' });
  }

  const state = readJsonFile(DEVICE_STATE_FILE, {
    temperature: 0,
    humidity: 0,
    ledStatus: 'OFF',
    lcdLine1: 'Simple IOT World',
    lcdLine2: 'System Ready',
    lastSeen: 0
  });

  state.ledStatus = status;
  writeJsonFile(DEVICE_STATE_FILE, state);

  return res.json({
    success: true,
    message: `LED turned ${status}`,
    ledStatus: state.ledStatus
  });
});

// Tab 2: Update LCD Text (Field 1 & Field 2, Max 16 characters each)
app.post('/api/device/lcd', (req, res) => {
  let { line1, line2 } = req.body;

  line1 = (line1 || '').toString().slice(0, 16);
  line2 = (line2 || '').toString().slice(0, 16);

  const state = readJsonFile(DEVICE_STATE_FILE, {
    temperature: 0,
    humidity: 0,
    ledStatus: 'OFF',
    lcdLine1: 'Simple IOT World',
    lcdLine2: 'System Ready',
    lastSeen: 0
  });

  state.lcdLine1 = line1;
  state.lcdLine2 = line2;
  writeJsonFile(DEVICE_STATE_FILE, state);

  return res.json({
    success: true,
    message: 'LCD message updated successfully',
    lcdLine1: state.lcdLine1,
    lcdLine2: state.lcdLine2
  });
});

// ==========================================
// Records APIs (Section 2 of Tab 1)
// ==========================================

// Get All Saved Records
app.get('/api/records', (req, res) => {
  const records = readJsonFile(RECORDS_FILE, []);
  // Return records in descending order (newest first)
  const sorted = [...records].reverse();
  return res.json({
    success: true,
    records: sorted,
    total: sorted.length
  });
});

// Delete a single record by ID
app.delete('/api/records/:id', (req, res) => {
  const idToDelete = parseInt(req.params.id, 10);
  let records = readJsonFile(RECORDS_FILE, []);

  const initialLength = records.length;
  records = records.filter(r => r.id !== idToDelete);

  if (records.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Record not found' });
  }

  writeJsonFile(RECORDS_FILE, records);
  return res.json({ success: true, message: `Record #${idToDelete} deleted successfully` });
});

// Clear all records
app.delete('/api/records', (req, res) => {
  writeJsonFile(RECORDS_FILE, []);
  return res.json({ success: true, message: 'All records have been cleared' });
});

// Dashboard stats endpoint (for live charts)
app.get('/api/stats', (req, res) => {
  const state = readJsonFile(DEVICE_STATE_FILE, {
    temperature: 0,
    humidity: 0,
    ledStatus: 'OFF',
    lcdLine1: 'Simple IOT World',
    lcdLine2: 'System Ready',
    lastSeen: 0
  });
  const records = readJsonFile(RECORDS_FILE, []);
  const recentRecords = records.slice(-20); // Last 20 data points for charts

  const isOnline = Date.now() - (state.lastSeen || 0) < 30000;

  return res.json({
    success: true,
    currentTemperature: state.temperature,
    currentHumidity: state.humidity,
    ledStatus: state.ledStatus,
    lcdLine1: state.lcdLine1,
    lcdLine2: state.lcdLine2,
    isOnline,
    recentHistory: recentRecords
  });
});

// Fallback route for Single Page Application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Simple IOT World Server is Running!`);
  console.log(` Port: ${PORT}`);
  console.log(` Local URL: http://localhost:${PORT}`);
  console.log(` Timezone: Asia/Kolkata (+05:30)`);
  console.log(`=======================================================`);
});
