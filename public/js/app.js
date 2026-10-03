// ==========================================================================
// Simple IOT World - Client Application Logic
// Features: Auth, Realtime Gauges, Charts, Records Table, LCD Setup, LED Control
// TimeZone: Asia/Kolkata (+05:30)
// ==========================================

let currentUser = null;
let pollTimer = null;
let tempChartInstance = null;
let humChartInstance = null;
let currentLedState = 'OFF';
let isLcdBlueBacklight = false;

// Constant for Gauge Circle Circumference (r=68 => 2 * PI * 68 ≈ 427.26)
const GAUGE_CIRCUMFERENCE = 427.26;

// ==========================================================================
// 1. Initialization & State Management
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Check Local Storage for Theme
  initTheme();

  // Check Local Storage for Logged In User
  const storedUser = localStorage.getItem('iot_user');
  if (storedUser) {
    try {
      currentUser = JSON.parse(storedUser);
      showDashboard();
    } catch (e) {
      localStorage.removeItem('iot_user');
      showAuth();
    }
  } else {
    showAuth();
  }

  // Pre-fill fields with current device state if available
  fetchDeviceInitialState();
});

// Switch between Auth view and Dashboard view
function showAuth() {
  document.getElementById('authView').classList.remove('hidden');
  document.getElementById('dashboardView').classList.add('hidden');
  if (pollTimer) clearInterval(pollTimer);
}

function showDashboard() {
  document.getElementById('authView').classList.add('hidden');
  document.getElementById('dashboardView').classList.remove('hidden');

  // Update Header with User Name
  if (currentUser && currentUser.name) {
    document.getElementById('userWelcomeText').textContent = `Welcome ${currentUser.name}`;
    document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
  }

  // Initialize Charts
  initCharts();

  // Initial Data Fetch
  fetchDeviceStatus();
  fetchRecords();

  // Start polling every 2.5 seconds
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    fetchDeviceStatus();
  }, 2500);
}

// ==========================================================================
// 2. Authentication Handling (Page 1)
// ==========================================================================
function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginTabBtn = document.getElementById('loginTabBtn');
  const registerTabBtn = document.getElementById('registerTabBtn');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    loginTabBtn.className = "flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 bg-gradient-to-r from-blue-600 to-teal-500 text-white shadow-md";
    registerTabBtn.className = "flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 text-slate-400 hover:text-white";
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    registerTabBtn.className = "flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 bg-gradient-to-r from-blue-600 to-teal-500 text-white shadow-md";
    loginTabBtn.className = "flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 text-slate-400 hover:text-white";
  }
}

function togglePasswordVisibility(fieldId, btn) {
  const field = document.getElementById(fieldId);
  const icon = btn.querySelector('i');
  if (field.type === 'password') {
    field.type = 'text';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    field.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const submitBtn = document.getElementById('loginSubmitBtn');

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Signing In...`;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (data.success) {
      showToast('Welcome back, ' + data.user.name + '!', 'success');
      currentUser = data.user;
      localStorage.setItem('iot_user', JSON.stringify(currentUser));
      showDashboard();
    } else {
      showToast(data.message || 'Login failed. Please check credentials.', 'error');
    }
  } catch (err) {
    showToast('Network error while logging in.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<span>Sign In to Dashboard</span><i class="fa-solid fa-arrow-right ml-2"></i>`;
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value.trim();
  const submitBtn = document.getElementById('regSubmitBtn');

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Registering...`;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();

    if (data.success) {
      showToast('Account created successfully! Please sign in.', 'success');
      switchAuthTab('login');
      document.getElementById('loginEmail').value = email;
      document.getElementById('loginPassword').value = '';
    } else {
      showToast(data.message || 'Registration failed.', 'error');
    }
  } catch (err) {
    showToast('Network error during registration.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<span>Create New Account</span><i class="fa-solid fa-user-check ml-2"></i>`;
  }
}

function handleLogout() {
  localStorage.removeItem('iot_user');
  currentUser = null;
  showToast('Logged out successfully', 'info');
  showAuth();
}

// ==========================================================================
// 3. Theme Toggle (Light & Dark Mode)
// ==========================================================================
function initTheme() {
  const savedTheme = localStorage.getItem('iot_theme') || 'dark';
  applyTheme(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  localStorage.setItem('iot_theme', newTheme);
  showToast(`Switched to ${newTheme} mode`, 'info');
}

function applyTheme(theme) {
  const root = document.documentElement;
  const themeIcon = document.getElementById('themeIcon');
  const body = document.getElementById('appBody');

  if (theme === 'dark') {
    root.classList.add('dark');
    body.classList.remove('bg-slate-50', 'text-slate-800');
    body.classList.add('bg-slate-900', 'text-slate-100');
    if (themeIcon) {
      themeIcon.className = 'fa-solid fa-sun text-amber-400';
    }
  } else {
    root.classList.remove('dark');
    body.classList.remove('bg-slate-900', 'text-slate-100');
    body.classList.add('bg-slate-50', 'text-slate-800');
    if (themeIcon) {
      themeIcon.className = 'fa-solid fa-moon text-slate-600';
    }
  }
}

// ==========================================================================
// 4. Tab Navigation (Tabs 1, 2, 3)
// ==========================================================================
function switchTab(tabId) {
  const tabs = ['tab1', 'tab2', 'tab3'];
  tabs.forEach(id => {
    const content = document.getElementById(`${id}Content`);
    const btn = document.getElementById(`${id.replace('tab', 'tabBtn')}`);

    if (id === tabId) {
      content.classList.remove('hidden');
      btn.className = "tab-active py-3.5 px-3 text-sm font-semibold text-teal-400 flex items-center space-x-2 whitespace-nowrap transition-all";
    } else {
      content.classList.add('hidden');
      btn.className = "py-3.5 px-3 text-sm font-semibold text-slate-400 hover:text-slate-200 flex items-center space-x-2 whitespace-nowrap transition-all";
    }
  });

  if (tabId === 'tab1') {
    fetchRecords();
    if (tempChartInstance) tempChartInstance.resize();
    if (humChartInstance) humChartInstance.resize();
  }
}

// ==========================================================================
// 5. Device Status & Sensor Gauges (Tab 1, Section 1)
// ==========================================================================
async function fetchDeviceInitialState() {
  try {
    const res = await fetch('/api/device/config');
    const data = await res.json();
    if (data.success) {
      if (data.lcdLine1) document.getElementById('lcdField1').value = data.lcdLine1;
      if (data.lcdLine2) document.getElementById('lcdField2').value = data.lcdLine2;
      updateLcdPreview();
      updateLedUI(data.ledStatus || 'OFF');
    }
  } catch (e) {
    console.error('Initial state fetch error:', e);
  }
}

async function fetchDeviceStatus() {
  try {
    const res = await fetch('/api/device/status');
    const data = await res.json();

    if (data.success) {
      // 1. Update Online/Offline status badge
      updateOnlineStatus(data.isOnline, data.secondsSinceLastPing);

      // 2. Update Temperature Gauge & Values
      const temp = typeof data.temperature === 'number' ? data.temperature : 0;
      updateTemperatureGauge(temp);

      // 3. Update Humidity Gauge & Values
      const hum = typeof data.humidity === 'number' ? data.humidity : 0;
      updateHumidityGauge(hum);

      // 4. Update LED State if synced
      if (data.ledStatus && data.ledStatus !== currentLedState) {
        updateLedUI(data.ledStatus);
      }
    }
  } catch (err) {
    console.warn('Error fetching device status:', err);
    updateOnlineStatus(false);
  }
}

function updateOnlineStatus(isOnline, secAgo) {
  const dot = document.getElementById('deviceStatusDot');
  const text = document.getElementById('deviceStatusText');
  const badge = document.getElementById('deviceStatusBadge');

  if (isOnline) {
    dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-400 online-glow";
    text.className = "text-emerald-400 tracking-wider font-bold";
    text.textContent = "ESP8266 ONLINE";
    badge.className = "flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/40 text-xs font-semibold shadow-inner";
  } else {
    dot.className = "w-2.5 h-2.5 rounded-full bg-red-400";
    text.className = "text-slate-400 tracking-wider font-semibold";
    const sub = secAgo ? ` (${secAgo}s ago)` : '';
    text.textContent = `ESP8266 OFFLINE${sub}`;
    badge.className = "flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-semibold shadow-inner";
  }
}

function updateTemperatureGauge(temp) {
  const tempValElem = document.getElementById('currentTempVal');
  const tempCircle = document.getElementById('tempGaugeCircle');
  const tempBadge = document.getElementById('tempStatusBadge');

  tempValElem.textContent = `${temp.toFixed(1)}`;

  // SVG Gauge progress (Range: 0°C to 50°C)
  const clampedTemp = Math.min(Math.max(temp, 0), 50);
  const offset = GAUGE_CIRCUMFERENCE - (GAUGE_CIRCUMFERENCE * clampedTemp) / 50;
  tempCircle.style.strokeDashoffset = offset;

  // Temperature status label
  if (temp < 18) {
    tempBadge.textContent = "Cool / Cold";
    tempBadge.className = "px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30";
  } else if (temp <= 32) {
    tempBadge.textContent = "Normal / Optimal";
    tempBadge.className = "px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30";
  } else {
    tempBadge.textContent = "Warm / Hot";
    tempBadge.className = "px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30";
  }
}

function updateHumidityGauge(hum) {
  const humValElem = document.getElementById('currentHumVal');
  const humCircle = document.getElementById('humGaugeCircle');
  const humBadge = document.getElementById('humStatusBadge');

  humValElem.textContent = `${hum.toFixed(1)}`;

  // SVG Gauge progress (Range: 0% to 100%)
  const clampedHum = Math.min(Math.max(hum, 0), 100);
  const offset = GAUGE_CIRCUMFERENCE - (GAUGE_CIRCUMFERENCE * clampedHum) / 100;
  humCircle.style.strokeDashoffset = offset;

  // Humidity status label
  if (hum < 30) {
    humBadge.textContent = "Dry";
    humBadge.className = "px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30";
  } else if (hum <= 65) {
    humBadge.textContent = "Comfortable";
    humBadge.className = "px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";
  } else {
    humBadge.textContent = "High Humidity";
    humBadge.className = "px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/30";
  }
}

// ==========================================================================
// 6. Interactive Charts (Tab 1, Section 1)
// ==========================================================================
function initCharts() {
  const tempCtx = document.getElementById('tempChart');
  const humCtx = document.getElementById('humChart');

  if (!tempCtx || !humCtx) return;

  // Common chart options
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#e2e8f0',
        bodyColor: '#e2e8f0',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
        displayColors: false
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(148, 163, 184, 0.08)' },
        ticks: { color: '#94a3b8', font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.08)' },
        ticks: { color: '#94a3b8', font: { size: 10 } }
      }
    }
  };

  // Temperature Chart
  if (!tempChartInstance) {
    tempChartInstance = new Chart(tempCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Temperature (°C)',
          data: [],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#60a5fa',
          borderWidth: 2
        }]
      },
      options: {
        ...commonOptions,
        scales: {
          ...commonOptions.scales,
          y: {
            ...commonOptions.scales.y,
            suggestedMin: 15,
            suggestedMax: 45
          }
        }
      }
    });
  }

  // Humidity Chart
  if (!humChartInstance) {
    humChartInstance = new Chart(humCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Humidity (%)',
          data: [],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#34d399',
          borderWidth: 2
        }]
      },
      options: {
        ...commonOptions,
        scales: {
          ...commonOptions.scales,
          y: {
            ...commonOptions.scales.y,
            suggestedMin: 20,
            suggestedMax: 90
          }
        }
      }
    });
  }
}

function updateChartsWithRecords(records) {
  if (!tempChartInstance || !humChartInstance || !records.length) return;

  // Take the last 15 records in chronological order
  const chronological = [...records].reverse().slice(-15);
  const labels = chronological.map(r => r.time);
  const tempData = chronological.map(r => r.temperature);
  const humData = chronological.map(r => r.humidity);

  tempChartInstance.data.labels = labels;
  tempChartInstance.data.datasets[0].data = tempData;
  tempChartInstance.update();

  humChartInstance.data.labels = labels;
  humChartInstance.data.datasets[0].data = humData;
  humChartInstance.update();

  // Update min/max recorded stats
  if (tempData.length > 0) {
    const minT = Math.min(...tempData);
    const maxT = Math.max(...tempData);
    document.getElementById('minTempDisplay').textContent = `${minT.toFixed(1)} °C`;
    document.getElementById('maxTempDisplay').textContent = `${maxT.toFixed(1)} °C`;

    const minH = Math.min(...humData);
    const maxH = Math.max(...humData);
    document.getElementById('minHumDisplay').textContent = `${minH.toFixed(1)} %`;
    document.getElementById('maxHumDisplay').textContent = `${maxH.toFixed(1)} %`;
  }
}

// ==========================================================================
// 7. Saved Records Table (Tab 1, Section 2)
// Format: # | Temperature | Humidity | Time | Date | Action (Delete)
// ==========================================================================
async function fetchRecords() {
  const tbody = document.getElementById('recordsTableBody');
  const countBadge = document.getElementById('recordCountBadge');

  try {
    const res = await fetch('/api/records');
    const data = await res.json();

    if (data.success) {
      countBadge.textContent = `${data.total} Record${data.total === 1 ? '' : 's'}`;

      if (data.records.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="py-8 text-center text-slate-400">
              <i class="fa-regular fa-folder-open text-3xl mb-2 block text-slate-500"></i>
              No records found. Telemetry will automatically log every 10s when ESP8266 is connected.
            </td>
          </tr>
        `;
        return;
      }

      // Update Chart with existing records
      updateChartsWithRecords(data.records);

      // Render Table Rows
      tbody.innerHTML = data.records.map((r, index) => `
        <tr class="hover:bg-slate-700/30 transition-colors">
          <td class="py-3.5 px-4 font-mono text-xs text-slate-400 font-semibold">#${r.id || (data.records.length - index)}</td>
          <td class="py-3.5 px-4 font-bold text-blue-400">${r.temperature} °C</td>
          <td class="py-3.5 px-4 font-bold text-emerald-400">${r.humidity}%</td>
          <td class="py-3.5 px-4 text-slate-300 font-mono text-xs">${r.time}</td>
          <td class="py-3.5 px-4 text-slate-400 font-mono text-xs">${r.date}</td>
          <td class="py-3.5 px-4 text-center">
            <button onclick="deleteRecord(${r.id})" title="Delete Record"
              class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 hover:text-white transition-all">
              <i class="fa-solid fa-trash-can mr-1"></i>Delete
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Fetch records error:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-4 text-center text-red-400 text-xs">
          Failed to load records from server.
        </td>
      </tr>
    `;
  }
}

async function deleteRecord(id) {
  try {
    const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast(`Record #${id} deleted`, 'info');
      fetchRecords();
    } else {
      showToast(data.message || 'Failed to delete record', 'error');
    }
  } catch (err) {
    showToast('Network error while deleting record', 'error');
  }
}

async function clearAllRecords() {
  if (!confirm('Are you sure you want to clear all saved records?')) return;

  try {
    const res = await fetch('/api/records', { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('All saved records cleared', 'info');
      fetchRecords();
    }
  } catch (err) {
    showToast('Failed to clear records', 'error');
  }
}

// ==========================================================================
// 8. Smart LCD Display (Tab 2)
// Field 1: Max 16 chars, Field 2: Max 16 chars
// ==========================================================================
function updateLcdPreview() {
  const line1Input = document.getElementById('lcdField1');
  const line2Input = document.getElementById('lcdField2');
  const char1 = document.getElementById('charCountLine1');
  const char2 = document.getElementById('charCountLine2');
  const vLine1 = document.getElementById('virtualLcdLine1');
  const vLine2 = document.getElementById('virtualLcdLine2');

  const text1 = line1Input.value.slice(0, 16);
  const text2 = line2Input.value.slice(0, 16);

  char1.textContent = `${text1.length}/16`;
  char2.textContent = `${text2.length}/16`;

  // Pad right to 16 characters for authentic dot-matrix look
  vLine1.textContent = text1.padEnd(16, ' ');
  vLine2.textContent = text2.padEnd(16, ' ');
}

async function saveLcdText(event) {
  event.preventDefault();
  const line1 = document.getElementById('lcdField1').value.trim().slice(0, 16);
  const line2 = document.getElementById('lcdField2').value.trim().slice(0, 16);
  const btn = document.getElementById('saveLcdBtn');

  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Saving to LCD...`;

  try {
    const res = await fetch('/api/device/lcd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line1, line2 })
    });
    const data = await res.json();

    if (data.success) {
      showToast('LCD Message Saved! ESP8266 will display it on next cycle.', 'success');
      updateLcdPreview();
    } else {
      showToast(data.message || 'Failed to save LCD message', 'error');
    }
  } catch (err) {
    showToast('Network error while saving LCD details', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-floppy-disk mr-2"></i><span>Save Details to LCD</span>`;
  }
}

function toggleLcdBacklight() {
  const screen = document.getElementById('virtualLcdScreen');
  const btn = document.getElementById('lcdColorBtn');
  isLcdBlueBacklight = !isLcdBlueBacklight;

  if (isLcdBlueBacklight) {
    screen.classList.add('lcd-screen-blue');
    btn.textContent = "Switch to Classic Green";
  } else {
    screen.classList.remove('lcd-screen-blue');
    btn.textContent = "Switch to Blue Backlight";
  }
}

// ==========================================================================
// 9. Innovative LED Actuator Control (Tab 3)
// Pin D3 (GPIO 0)
// ==========================================================================
async function toggleLed() {
  const targetState = currentLedState === 'ON' ? 'OFF' : 'ON';
  
  // Optimistic UI Update
  updateLedUI(targetState);

  try {
    const res = await fetch('/api/device/led', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: targetState })
    });
    const data = await res.json();

    if (data.success) {
      updateLedUI(data.ledStatus);
      showToast(`LED is now turned ${data.ledStatus}`, 'success');
    } else {
      // Revert if error
      updateLedUI(currentLedState);
      showToast(data.message || 'Failed to toggle LED', 'error');
    }
  } catch (err) {
    updateLedUI(currentLedState);
    showToast('Network error while toggling LED', 'error');
  }
}

function updateLedUI(status) {
  currentLedState = status;
  const powerBtn = document.getElementById('ledToggleBtn');
  const btnText = document.getElementById('ledBtnText');
  const statusBadge = document.getElementById('ledStatusBadge');
  const bulbGraphic = document.getElementById('ledBulbGraphic');
  const bulbIcon = document.getElementById('ledBulbIcon');
  const ambientGlow = document.getElementById('ledAmbientGlow');
  const lastChanged = document.getElementById('ledLastChanged');

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  lastChanged.textContent = `Updated: ${timeStr}`;

  if (status === 'ON') {
    // Button styling
    powerBtn.className = "led-power-btn on transition-transform active:scale-95";
    btnText.textContent = "TURN OFF";

    // Badge
    statusBadge.textContent = "LED STATUS: ON (ACTIVE)";
    statusBadge.className = "px-5 py-2 rounded-full text-sm font-extrabold uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-lg shadow-emerald-500/20";

    // Bulb Icon & Glow
    bulbGraphic.className = "w-32 h-32 rounded-full flex items-center justify-center text-6xl text-emerald-400 bg-emerald-950/80 border-2 border-emerald-400 bulb-glow-on transition-all duration-500 shadow-2xl";
    bulbIcon.className = "fa-solid fa-lightbulb text-emerald-300";

    // Background ambient glow
    ambientGlow.className = "absolute w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700 opacity-60 bg-emerald-500";
  } else {
    // Button styling
    powerBtn.className = "led-power-btn off transition-transform active:scale-95";
    btnText.textContent = "TURN ON";

    // Badge
    statusBadge.textContent = "LED STATUS: OFF (INACTIVE)";
    statusBadge.className = "px-5 py-2 rounded-full text-sm font-extrabold uppercase tracking-widest bg-slate-700/60 text-slate-400 border border-slate-600";

    // Bulb Icon & Glow
    bulbGraphic.className = "w-32 h-32 rounded-full flex items-center justify-center text-6xl text-slate-600 bg-slate-900/80 border-2 border-slate-700 transition-all duration-500 shadow-inner";
    bulbIcon.className = "fa-solid fa-lightbulb";

    // Background ambient glow
    ambientGlow.className = "absolute w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700 opacity-10 bg-slate-600";
  }
}

// ==========================================================================
// 10. Toast Notification Helper
// ==========================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  let bgClass = 'bg-slate-800 border-slate-700 text-slate-100';
  let icon = '<i class="fa-solid fa-circle-info text-blue-400"></i>';

  if (type === 'success') {
    bgClass = 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200';
    icon = '<i class="fa-solid fa-circle-check text-emerald-400"></i>';
  } else if (type === 'error') {
    bgClass = 'bg-red-950/90 border-red-500/50 text-red-200';
    icon = '<i class="fa-solid fa-circle-xmark text-red-400"></i>';
  }

  toast.className = `flex items-center space-x-3 px-4 py-3 rounded-2xl border backdrop-blur shadow-2xl text-xs font-semibold pointer-events-auto transform transition-all duration-300 translate-y-2 opacity-0 ${bgClass}`;
  toast.innerHTML = `${icon} <span>${message}</span>`;

  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  // Auto remove after 3.5 seconds
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
