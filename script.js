// ==================== INITIALIZATION ====================

// Guard against weird extensions
if (typeof solveSimpleChallenge !== 'undefined') {
  console.warn('Extension function detected, ignoring it');
  window.solveSimpleChallenge = undefined;
}

// DOM Elements
const startBtn = document.getElementById('startBtn');
const buttonText = document.getElementById('button-text');
const statusDiv = document.getElementById('status');
const statusMini = document.getElementById('status-mini');
const statusLed = document.getElementById('status-led');
const conversationLog = document.getElementById('conversation-log');
const currentTimeElement = document.getElementById('current-time');
const toggleCommandsBtn = document.getElementById('toggleCommands');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const settingsBtn = document.getElementById('settingsBtn');
const commandPanel = document.getElementById('command-panel');
const settingsPanel = document.getElementById('settings-panel');
const notificationContainer = document.getElementById('notification-container');
const micStatus = document.getElementById('mic-status');

const textInput = document.getElementById('textCommandInput');
const sendCmdBtn = document.getElementById('sendCommandBtn');
const voiceSelect = document.getElementById('voiceSelect');
const rateRange = document.getElementById('rateRange');
const pitchRange = document.getElementById('pitchRange');
const volumeRange = document.getElementById('volumeRange');

// Speech Recognition Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList || null;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
let recognitionRunning = false;
let isListening = false;
let isActiveSession = false;
let lastTranscript = '';
const WAKE_WORD = 'jarvis';

// App State
let tasks = safeJSON(localStorage.getItem('jarvisTasks'), []) || [];
let reminders = safeJSON(localStorage.getItem('jarvisReminders'), []) || [];
let timers = safeJSON(localStorage.getItem('jarvisTimers'), []) || [];
let volume = localStorage.getItem('jarvisVolume') ? parseInt(localStorage.getItem('jarvisVolume'), 10) : 70;
let selectedVoiceURI = localStorage.getItem('jarvisVoiceURI') || null;
let rate = parseFloat(localStorage.getItem('jarvisRate') || '1.05');
let pitch = parseFloat(localStorage.getItem('jarvisPitch') || '0.95');
let userName = localStorage.getItem('jarvisUserName') || 'Friend';
let isMusicPlaying = false;
let currentTrackIndex = 0;

// Music tracks (simulated)
const musicTracks = [
  { title: "Beyond the Horizon", artist: "SynthWave Revolution" },
  { title: "Neon Dreams", artist: "Cyber Pulse" },
  { title: "Digital Sunrise", artist: "Vector Wave" },
  { title: "Circuit Breaker", artist: "Techno Logic" },
  { title: "Virtual Reality", artist: "Digital Dimension" }
];

// Jokes & Facts
const jokes = [
  "Why don't scientists trust atoms? Because they make up everything!",
  "I told my wife she should embrace her mistakes. She gave me a hug.",
  "Why did the scarecrow win an award? Because he was outstanding in his field!",
  "What do you call fake spaghetti? An impasta!",
  "Why did the computer go to the doctor? Because it had a virus!",
  "What's a robot's favorite snack? Computer chips!",
  "Why was the math book sad? Because it had too many problems.",
  "What did one ocean say to the other ocean? Nothing, they just waved.",
  "Why don't skeletons fight each other? They don't have the guts.",
  "What do you call a bear with no teeth? A gummy bear!"
];
const facts = [
  "Honey never spoils. Archaeologists found 3,000-year-old honey still edible.",
  "Octopuses have three hearts.",
  "A day on Venus is longer than a year on Venus.",
  "Bananas are berries, but strawberries aren't.",
  "There are more possible chess games than atoms in the known universe."
];

// Known websites
const websites = {
  google: 'https://www.google.com',
  youtube: 'https://www.youtube.com',
  amazon: 'https://www.amazon.com',
  reddit: 'https://www.reddit.com',
  wikipedia: 'https://www.wikipedia.org',
  netflix: 'https://www.netflix.com',
  twitter: 'https://www.twitter.com',
  x: 'https://www.twitter.com',
  facebook: 'https://www.facebook.com',
  instagram: 'https://www.instagram.com',
  github: 'https://www.github.com',
  gmail: 'https://mail.google.com',
  outlook: 'https://outlook.live.com'
};

// ==================== UTILITIES ====================
function safeJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}
function showNotification(title, message, type = 'info', duration = 5000) {
  const n = document.createElement('div');
  n.className = `notification ${type}`;
  n.innerHTML = `
    <div class="notification-icon">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'warning' ? 'fa-exclamation-triangle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
    </div>
    <div class="notification-content">
      <div class="notification-title">${title}</div>
      <div class="notification-message">${message}</div>
    </div>
    <button class="notification-close" aria-label="Close notification"><i class="fas fa-times"></i></button>
  `;
  const closeBtn = n.querySelector('.notification-close');
  closeBtn.addEventListener('click', () => closeNotification(n));
  notificationContainer.appendChild(n);
  if (duration > 0) setTimeout(() => closeNotification(n), duration);
  return n;
}
function closeNotification(el) {
  if (!el || !el.parentNode) return;
  el.style.animation = 'slideOut .25s ease-in';
  setTimeout(() => el.parentNode && el.parentNode.removeChild(el), 250);
}
function addMessageToLog(sender, message) {
  const wrapper = document.createElement('div');
  const bubble = document.createElement('div');
  const senderP = document.createElement('p');
  const msgP = document.createElement('p');

  senderP.className = 'font-semibold tracking-wider terminal-text';
  senderP.textContent = sender;
  msgP.innerHTML = escapeHTML(message).replace(/\n/g, '<br/>');

  bubble.appendChild(senderP);
  bubble.appendChild(msgP);
  wrapper.appendChild(bubble);

  if (sender.toLowerCase() === 'jarvis') {
    wrapper.className = 'flex justify-start';
    bubble.className = 'assistant-bubble bg-cyan-500/20 text-cyan-200 p-3 rounded-lg max-w-md cyber-border';
  } else {
    wrapper.className = 'flex justify-end';
    bubble.className = 'user-bubble bg-gray-700 text-white p-3 rounded-lg max-w-md';
  }

  conversationLog.appendChild(wrapper);
  conversationLog.scrollTop = conversationLog.scrollHeight;
}
function escapeHTML(s) {
  const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
}
function updateTime() {
  const now = new Date();
  currentTimeElement.textContent = now.toLocaleTimeString([], {hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'});
  checkDueItems(now);
}
setInterval(updateTime, 1000); updateTime();

function setStatus(text, processing = false) {
  statusDiv.textContent = text;
  statusMini.textContent = text;
  statusLed.className = `status-indicator ${processing ? 'status-processing' : 'status-online'}`;
}

// ==================== AUDIO / TTS ====================
function getVoices() {
  return speechSynthesis.getVoices();
}
function populateVoices() {
  const voices = getVoices();
  voiceSelect.innerHTML = '';
  voices.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.voiceURI;
    opt.textContent = `${v.name} ${v.lang}${v.default ? ' (default)' : ''}`;
    voiceSelect.appendChild(opt);
  });
  // Restore selection or pick default
  const voiceToUse = voices.find(v => v.voiceURI === selectedVoiceURI) || voices.find(v => v.default) || voices[0];
  if (voiceToUse) {
    voiceSelect.value = voiceToUse.voiceURI;
    selectedVoiceURI = voiceToUse.voiceURI;
  }
}
speechSynthesis.onvoiceschanged = populateVoices;
window.addEventListener('load', () => setTimeout(populateVoices, 200));

rateRange.value = rate.toString();
pitchRange.value = pitch.toString();
volumeRange.value = volume.toString();

rateRange.addEventListener('input', () => {
  rate = parseFloat(rateRange.value);
  localStorage.setItem('jarvisRate', rate.toString());
});
pitchRange.addEventListener('input', () => {
  pitch = parseFloat(pitchRange.value);
  localStorage.setItem('jarvisPitch', pitch.toString());
});
volumeRange.addEventListener('input', () => {
  volume = parseInt(volumeRange.value, 10);
  localStorage.setItem('jarvisVolume', volume.toString());
});
voiceSelect.addEventListener('change', () => {
  selectedVoiceURI = voiceSelect.value;
  localStorage.setItem('jarvisVoiceURI', selectedVoiceURI);
});

function speak(message, opts = {}) {
  if (!('speechSynthesis' in window)) {
    addMessageToLog('JARVIS', message);
    return;
  }
  const { interrupt = true } = opts;
  if (interrupt) window.speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(message);
  const voices = getVoices();
  const voice = voices.find(v => v.voiceURI === selectedVoiceURI) || voices.find(v => v.default);
  if (voice) u.voice = voice;
  u.volume = Math.max(0, Math.min(1, (volume || 70) / 100));
  u.rate = rate || 1.05;
  u.pitch = pitch || 0.95;

  u.onstart = () => { setStatus('SPEAKING', true); };
  u.onend = () => {
    setStatus(isListening ? 'LISTENING' : 'AWAITING COMMAND', isListening);
    // Try to resume recognition if active
    if (isActiveSession && isListening) safeStartRecognition();
  };
  u.onerror = () => { setStatus('TTS ERROR'); };

  window.speechSynthesis.speak(u);
  addMessageToLog('JARVIS', message);
}

function beep(times = 1, duration = 120, freq = 880) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let when = ctx.currentTime;
    for (let i = 0; i < times; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, when);
      gain.gain.exponentialRampToValueAtTime(0.2, when + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, when + duration / 1000);
      osc.connect(gain).connect(ctx.destination);
      osc.start(when);
      osc.stop(when + duration / 1000 + 0.02);
      when += (duration / 1000) + 0.08;
    }
  } catch {}
}

// ==================== WEATHER (Open-Meteo, no key needed) ====================
async function getWeather(location = null) {
  try {
    let lat, lon, placeName = 'your location';

    if (location && location.trim().length) {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`);
      const geo = await geoRes.json();
      if (geo && geo.results && geo.results.length) {
        lat = geo.results[0].latitude; lon = geo.results[0].longitude;
        placeName = `${geo.results[0].name}${geo.results[0].country ? ', ' + geo.results[0].country : ''}`;
      } else {
        speak(`I couldn't find ${location}. Using your device location if permitted.`);
      }
    }

    if ((lat == null || lon == null) && navigator.geolocation) {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { maximumAge: 60000, timeout: 8000 })
      );
      lat = pos.coords.latitude; lon = pos.coords.longitude;
      placeName = 'your location';
    }

    if (lat == null || lon == null) {
      speak("I couldn't get location for weather.");
      return;
    }

    const wRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code`
    );
    const data = await wRes.json();
    const c = data.current;
    const condition = weatherCodeToText(c.weather_code);
    speak(`Weather for ${placeName}: ${Math.round(c.temperature_2m)}°C, ${condition}. Humidity ${c.relative_humidity_2m}% with wind ${Math.round(c.wind_speed_10m)} km/h.`);
    showNotification('Weather Update',
      `Location: ${placeName}<br>
       Temperature: ${Math.round(c.temperature_2m)}°C<br>
       Feels like: ${Math.round(c.apparent_temperature)}°C<br>
       Condition: ${condition}<br>
       Humidity: ${c.relative_humidity_2m}%<br>
       Wind: ${Math.round(c.wind_speed_10m)} km/h`, 'info', 8000);
  } catch (err) {
    console.error(err);
    speak("Sorry, I couldn't retrieve the weather right now.");
  }
}
function weatherCodeToText(code) {
  const map = {
    0: 'clear', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast',
    45: 'foggy', 48: 'depositing rime fog',
    51: 'light drizzle', 53: 'drizzle', 55: 'dense drizzle',
    56: 'freezing drizzle', 57: 'dense freezing drizzle',
    61: 'light rain', 63: 'rain', 65: 'heavy rain',
    66: 'freezing rain', 67: 'heavy freezing rain',
    71: 'light snow', 73: 'snow', 75: 'heavy snow',
    77: 'snow grains',
    80: 'light showers', 81: 'showers', 82: 'violent showers',
    85: 'light snow showers', 86: 'heavy snow showers',
    95: 'thunderstorm', 96: 'thunderstorm with hail', 99: 'severe thunderstorm with hail'
  };
  return map[code] || 'unknown conditions';
}

// ==================== TASKS, REMINDERS, TIMERS ====================
const uid = () => Math.random().toString(36).slice(2, 10);

function persist() {
  localStorage.setItem('jarvisTasks', JSON.stringify(tasks));
  localStorage.setItem('jarvisReminders', JSON.stringify(reminders));
  localStorage.setItem('jarvisTimers', JSON.stringify(timers));
}

function checkDueItems(now = new Date()) {
  // Reminders
  let changed = false;
  reminders.forEach(r => {
    if (!r.triggered && r.dueAt && now.getTime() >= r.dueAt) {
      r.triggered = true;
      speak(`Reminder: ${r.text}`);
      showNotification('Reminder', r.text, 'info', 10000);
      beep(2, 150, 1020);
      changed = true;
    }
  });
  // Timers
  timers.forEach(t => {
    if (!t.triggered && t.endAt && now.getTime() >= t.endAt) {
      t.triggered = true;
      speak(`Timer completed: ${t.label || `${t.duration} ${t.unit}`}.`);
      showNotification('Timer Completed', t.label || `${t.duration} ${t.unit}`, 'info', 10000);
      beep(3, 120, 900);
      changed = true;
    }
  });
  if (changed) persist();
}

// Parse durations like "5 minutes", "1 hour 30 minutes", "90 sec"
function parseDuration(str) {
  str = (str || '').toLowerCase();
  const parts = { h: 0, m: 0, s: 0 };
  const patterns = [
    { re: /(\d+)\s*h(ours?)?/g, key: 'h' },
    { re: /(\d+)\s*m(in(ute)?s?)?/g, key: 'm' },
    { re: /(\d+)\s*s(ec(ond)?s?)?/g, key: 's' },
  ];
  let matched = false;
  for (const p of patterns) {
    let m; while ((m = p.re.exec(str))) { parts[p.key] += parseInt(m[1], 10); matched = true; }
  }
  if (!matched) {
    const m = /(\d+)\s*(seconds?|minutes?|hours?)/.exec(str);
    if (m) {
      const val = parseInt(m[1], 10);
      const unit = m[2].startsWith('hour') ? 'h' : m[2].startsWith('minute') ? 'm' : 's';
      parts[unit] += val; matched = true;
    }
  }
  const totalMs = (parts.h * 3600 + parts.m * 60 + parts.s) * 1000;
  return totalMs > 0 ? { ms: totalMs, parts } : null;
}

// Parse time phrases: "at 6 pm", "tomorrow at 18:30", "on monday 9am"
function extractDateTime(text) {
  text = (text || '').toLowerCase();
  const now = new Date();

  // Relative: "in 5 minutes"
  const rel = /in\s+(.+?)(?:$|\.|,)/.exec(text);
  if (rel) {
    const dur = parseDuration(rel[1]);
    if (dur) return new Date(now.getTime() + dur.ms);
  }

  // Day names
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  for (let i = 0; i < 7; i++) {
    const d = days[i];
    if (text.includes(`on ${d}`)) {
      const target = new Date(now);
      const delta = (i - now.getDay() + 7) % 7 || 7; // next occurrence
      target.setDate(now.getDate() + delta);
      const t = extractClockTime(text) || { h: 9, m: 0, ampm: null };
      setTimeOnDate(target, t.h, t.m, t.ampm);
      return target;
    }
  }

  // "tomorrow"
  if (text.includes('tomorrow')) {
    const target = new Date(now);
    target.setDate(now.getDate() + 1);
    const t = extractClockTime(text) || { h: 9, m: 0, ampm: null };
    setTimeOnDate(target, t.h, t.m, t.ampm);
    return target;
  }

  // Specific date: yyyy-mm-dd
  const dmatch = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  if (dmatch) {
    const target = new Date(parseInt(dmatch[1]), parseInt(dmatch[2]) - 1, parseInt(dmatch[3]));
    const t = extractClockTime(text) || { h: 9, m: 0, ampm: null };
    setTimeOnDate(target, t.h, t.m, t.ampm);
    return target;
  }

  // "at 6 pm", "at 18:30"
  const clock = extractClockTime(text);
  if (clock) {
    const target = new Date(now);
    setTimeOnDate(target, clock.h, clock.m, clock.ampm);
    if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
    return target;
  }

  return null;
}
function extractClockTime(text) {
  let m = /at\s+(\d{1,2}):(\d{2})\s*(am|pm)?/.exec(text);
  if (m) return { h: parseInt(m[1], 10), m: parseInt(m[2], 10), ampm: m[3] || null };
  m = /at\s+(\d{1,2})\s*(am|pm)/.exec(text);
  if (m) return { h: parseInt(m[1], 10), m: 0, ampm: m[2] };
  return null;
}
function setTimeOnDate(date, h, m, ampm) {
  if (ampm) {
    let hh = h % 12;
    if (ampm.toLowerCase() === 'pm') hh += 12;
    date.setHours(hh, m, 0, 0);
  } else {
    date.setHours(h, m, 0, 0);
  }
}

// Reminders
function setReminder(text, when) {
  if (!(when instanceof Date) || isNaN(when.getTime())) {
    speak("I couldn't understand the time for that reminder.");
    return;
  }
  const r = { id: uid(), text, dueAt: when.getTime(), triggered: false };
  reminders.push(r);
  persist();
  speak(`Reminder set for ${formatDateTime(when)}: ${text}`);
  showNotification('Reminder Set', `"${escapeHTML(text)}" at ${formatDateTime(when)}`, 'success');
}
function listReminders() {
  const upcoming = reminders.filter(r => !r.triggered).sort((a,b) => a.dueAt - b.dueAt);
  if (upcoming.length === 0) {
    speak("You have no upcoming reminders.");
  } else {
    const lines = upcoming.slice(0, 6).map(r => `• ${formatDateTime(new Date(r.dueAt))}: ${r.text}`);
    speak(`You have ${upcoming.length} upcoming reminder${upcoming.length>1?'s':''}.`);
    showNotification('Reminders', lines.join('<br>'), 'info', 10000);
  }
}
function clearReminders() {
  reminders = [];
  persist();
  speak("All reminders cleared.");
  showNotification('Reminders', 'All reminders cleared', 'info');
}

// Timers
function setTimer(durationText) {
  const dur = parseDuration(durationText);
  if (!dur) { speak("I didn't understand that duration."); return; }
  const endAt = Date.now() + dur.ms;
  const label = durationText;
  timers.push({ id: uid(), label, endAt, triggered: false, duration: dur.parts.m || dur.parts.s || dur.parts.h || '', unit: '' });
  persist();
  speak(`Timer started for ${label}.`);
  showNotification('Timer Set', `Timer running: ${escapeHTML(label)}`, 'success');
}
function listTimers() {
  const active = timers.filter(t => !t.triggered);
  if (active.length === 0) speak("You have no active timers.");
  else {
    const now = Date.now();
    const text = active.map(t => {
      const left = Math.max(0, t.endAt - now);
      return `• ${t.label} — ${formatDuration(left)} remaining`;
    }).join('\n');
    speak(`You have ${active.length} timer${active.length>1?'s':''} running.`);
    showNotification('Active Timers', text.replace(/\n/g,'<br>'), 'info', 8000);
  }
}
function clearTimers() {
  timers = [];
  persist();
  speak("All timers cleared.");
}
function formatDateTime(d) {
  return d.toLocaleString([], { weekday:'short', hour:'numeric', minute:'2-digit', month:'short', day:'numeric' });
}
function formatDuration(ms) {
  const s = Math.round(ms/1000);
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  return (h?`${h}h `:'') + (m?`${m}m `:'') + `${sec}s`;
}

// ==================== WEB / OPEN / SEARCH ====================
function openWebsite(siteText) {
  if (!siteText) { speak("Which website should I open?"); return; }
  const clean = siteText.toLowerCase().replace(/^open\s+/, '').trim();

  // Known mapping
  if (websites[clean]) {
    window.open(websites[clean], '_blank');
    speak(`Opening ${capitalize(clean)}.`);
    showNotification('Browser', `Opening ${capitalize(clean)}`, 'info');
    return;
  }

  // If looks like a domain
  if (clean.includes('.') || clean.startsWith('www.')) {
    const url = clean.startsWith('http') ? clean : `https://${clean}`;
    window.open(url, '_blank');
    speak(`Opening ${clean}.`);
    showNotification('Browser', `Opening ${escapeHTML(url)}`, 'info');
    return;
  }

  // Otherwise, Google it
  performSearch(clean);
}
function performSearch(query, engine = 'google') {
  const map = {
    google: q => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    youtube: q => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
  };
  const url = (engine === 'youtube' ? map.youtube : map.google)(query);
  window.open(url, '_blank');
  speak(`Searching ${engine} for ${query}.`);
  showNotification('Search', `Searching ${engine}: ${escapeHTML(query)}`, 'info');
}
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ==================== ENTERTAINMENT ====================
function playMusic() {
  if (isMusicPlaying) { speak("Music is already playing."); return; }
  isMusicPlaying = true;
  const track = musicTracks[currentTrackIndex];
  speak(`Now playing ${track.title} by ${track.artist}.`);
  showNotification('Now Playing', `${escapeHTML(track.title)} by ${escapeHTML(track.artist)}`, 'info');
}
function stopMusic() {
  if (!isMusicPlaying) { speak("No music is currently playing."); return; }
  isMusicPlaying = false;
  speak("Music stopped.");
  showNotification('Music', 'Playback stopped', 'info');
}
function nextTrack() {
  currentTrackIndex = (currentTrackIndex + 1) % musicTracks.length;
  const track = musicTracks[currentTrackIndex];
  if (isMusicPlaying) speak(`Now playing ${track.title} by ${track.artist}.`);
  else speak(`Next track selected: ${track.title}.`);
}
function previousTrack() {
  currentTrackIndex = (currentTrackIndex - 1 + musicTracks.length) % musicTracks.length;
  const track = musicTracks[currentTrackIndex];
  if (isMusicPlaying) speak(`Now playing ${track.title} by ${track.artist}.`);
  else speak(`Previous track selected: ${track.title}.`);
}
function tellJoke() {
  const j = jokes[Math.floor(Math.random() * jokes.length)];
  speak(j);
  showNotification('Joke', escapeHTML(j), 'info', 7000);
}
function tellFact() {
  const f = facts[Math.floor(Math.random() * facts.length)];
  speak(f);
  showNotification('Did You Know?', escapeHTML(f), 'info', 8000);
}

// ==================== VOLUME / SYSTEM ====================
function adjustVolume(direction) {
  if (direction === 'up') volume = Math.min(100, volume + 10);
  else if (direction === 'down') volume = Math.max(0, volume - 10);
  else if (direction === 'mute') volume = 0;
  else if (direction === 'unmute') volume = 70;
  localStorage.setItem('jarvisVolume', volume.toString());
  volumeRange.value = volume.toString();
  speak(`Volume set to ${volume} percent.`);
  showNotification('Volume', `Volume: ${volume}%`, 'info');
}
function systemStatus() {
  const activeTimers = timers.filter(t => !t.triggered).length;
  const pendingReminders = reminders.filter(r => !r.triggered).length;
  speak(`System status: Listening ${isListening ? 'enabled' : 'disabled'}. Volume at ${volume} percent. ${activeTimers} active timer${activeTimers===1?'':'s'}. ${pendingReminders} upcoming reminder${pendingReminders===1?'':'s'}.`);
  showNotification('System Status',
    `Listening: ${isListening ? 'On' : 'Off'}<br>
     Volume: ${volume}%<br>
     Active Timers: ${activeTimers}<br>
     Reminders: ${pendingReminders}<br>
     Theme: ${document.body.classList.contains('light-mode') ? 'Light' : 'Dark'}`, 'info', 8000);
}

// ==================== CALCULATOR (sanitized) ====================
function calculate(command) {
  let expr = command
    .replace(/calculate|what is|what's|please/gi, '')
    .replace(/plus/gi, '+').replace(/add/gi, '+')
    .replace(/minus/gi, '-').replace(/subtract/gi, '-')
    .replace(/times|multiplied by|multiply/gi, '*')
    .replace(/divided by|divide/gi, '/')
    .replace(/\s+/g, '');

  expr = expr.replace(/[^0-9+\-*/().]/g, '');
  if (!expr) { speak("I couldn't understand that calculation."); return; }

  try {
    // Using Function + sanitize. For complex math, consider math.js in future.
    const result = new Function('return ' + expr)();
    if (!isFinite(result)) throw new Error('Invalid result');
    speak(`The result is ${result}.`);
    showNotification('Calculation', `${escapeHTML(expr)} = <b>${result}</b>`, 'success', 6000);
  } catch {
    speak("Sorry, I couldn't compute that.");
  }
}

// ==================== COMMAND PROCESSING ====================
function normalizeText(s) { return s.toLowerCase().trim(); }
function stripWakeWord(command) {
  const idx = command.indexOf(WAKE_WORD);
  if (idx >= 0) return command.slice(idx + WAKE_WORD.length).trim().replace(/^[,.:;-]\s*/, '');
  return command;
}

function processCommand(rawTranscript, source = 'voice') {
  const transcript = normalizeText(rawTranscript);
  if (!transcript) return;

  // Only log user messages after we normalize
  addMessageToLog('You', rawTranscript);

  // Wake word handling
  const hasWakeWord = transcript.includes(WAKE_WORD);
  let c = stripWakeWord(transcript);

  // Session control
  if ((/start\b/.test(c) && hasWakeWord) || (/^start\b/.test(c))) {
    isActiveSession = true; isListening = true;
    speak("Voice recognition activated. I'm listening.");
    safeStartRecognition();
    showNotification('Voice Recognition', 'Listening for commands', 'info');
    return;
  }
  if ((/(stop|sleep|shut\s*down|goodbye|bye)\b/.test(c) && hasWakeWord) || (/^(stop|sleep)\b/.test(c))) {
    isActiveSession = false; isListening = false;
    speak("Shutting down non‑essential systems. Goodbye!");
    safeStopRecognition();
    showNotification('System', 'JARVIS is going to sleep', 'info');
    return;
  }

  // If voice source and not active and no wake word => ignore quietly
  if (source === 'voice' && !isActiveSession && !hasWakeWord) return;

  // If typed source, allow commands without wake word
  if (source === 'voice' && hasWakeWord) {
    // If only "jarvis" spoken, prompt
    if (!c || c.length < 2) {
      speak(`Yes ${userName}?`);
      return;
    }
  }
  if (source === 'typed') {
    // If typed includes wake word, strip it
    if (hasWakeWord) c = stripWakeWord(transcript);
    else c = transcript;
  }

  // Basic small-talk
  if (/\b(hello|hi|hey)\b/.test(c)) return speak(`Hello ${userName}! How can I help?`);
  if (/\b(how are you|how's it going)\b/.test(c)) return speak("All systems nominal and operating at peak efficiency.");
  if (/\bwho are you\b/.test(c)) return speak("I am JARVIS, your virtual assistant at your service.");
  if (/\b(thank you|thanks)\b/.test(c)) return speak("You're welcome!");
  if (/\bhelp\b/.test(c)) return speak("Try commands like: open YouTube, what's the weather, set a timer for 5 minutes, remind me to drink water at 6 pm, calculate 12 times 7, or system status.");

  // User identity
  const callMeMatch = /call me ([\w\s.'-]{2,40})/.exec(c);
  if (callMeMatch) {
    userName = callMeMatch[1].trim().replace(/\s+/g,' ');
    localStorage.setItem('jarvisUserName', userName);
    return speak(`Understood. I will call you ${userName}.`);
  }

  // Time & Date
  if (/\bwhat (time|is the time)\b/.test(c)) {
    const t = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return speak(`The time is ${t}.`);
  }
  if (/\bwhat (date|is the date)\b/.test(c)) {
    const d = new Date().toLocaleDateString([], { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    return speak(`Today is ${d}.`);
  }
  if (/\bwhat week\b/.test(c)) {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = (now - start) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    const week = Math.floor(diff / oneWeek) + 1;
    return speak(`It is week number ${week} of the year.`);
  }

  // Web & Search
  const ytSearch = /search (youtube) for (.+)/.exec(c);
  if (ytSearch) return performSearch(ytSearch[2], 'youtube');
  const gSearch = /search for (.+)/.exec(c);
  if (gSearch) return performSearch(gSearch[1], 'google');
  if (/^open\s+/.test(c)) return openWebsite(c.replace(/^open\s+/, ''));

  // Weather
  if (/\b(weather|what'?s the weather|how'?s the weather)\b/.test(c)) {
    const inMatch = /\b(in|at)\s+([a-zA-Z\s.'-]+)$/.exec(c);
    const location = inMatch ? inMatch[2] : null;
    return getWeather(location);
  }

  // Reminders & Tasks
  if (/^(remind me to|create a reminder|add task)/.test(c)) {
    const text = c.replace(/^(remind me to|create a reminder|add task)\s*/,'');
    const when = extractDateTime(text);
    const cleanText = text.replace(/\s*(in .+|at .+|tomorrow.*|on [a-z]+.*|\d{4}-\d{1,2}-\d{1,2}.*)$/i,'').trim() || text;
    if (when) setReminder(cleanText, when);
    else { // store as task if no time
      tasks.push(cleanText); persist();
      speak(`Okay, I saved a task: ${cleanText}`);
      showNotification('Task Added', escapeHTML(cleanText), 'success');
    }
    return;
  }
  if (/\b(list|show) (reminders|tasks)\b/.test(c)) {
    if (/tasks/.test(c)) {
      if (tasks.length === 0) speak("You have no tasks.");
      else {
        const lines = tasks.map(t => `• ${t}`).join('\n');
        speak(`You have ${tasks.length} task${tasks.length>1?'s':''}.`);
        showNotification('Your Tasks', lines.replace(/\n/g,'<br>'), 'info', 9000);
      }
    } else {
      listReminders();
    }
    return;
  }
  if (/\bclear (reminders|tasks)\b/.test(c)) {
    if (/tasks/.test(c)) { tasks = []; persist(); speak("All tasks cleared."); }
    else clearReminders();
    return;
  }

  // Timers
  if (/\b(set (a )?timer for)\b/.test(c)) {
    const after = c.replace(/\bset (a )?timer for\b/, '').trim();
    return setTimer(after);
  }
  if (/\b(list|show) timers\b/.test(c)) return listTimers();
  if (/\bclear timers\b/.test(c)) return clearTimers();

  // Calculator
  if (/^(calculate|what is|what's)/.test(c)) return calculate(c);

  // Entertainment
  if (/\b(joke|tell me a joke)\b/.test(c)) return tellJoke();
  if (/\b(fact|tell me a fact)\b/.test(c)) return tellFact();
  if (/\b(play music|start music)\b/.test(c)) return playMusic();
  if (/\b(stop music|pause music)\b/.test(c)) return stopMusic();
  if (/\b(next track|next song)\b/.test(c)) return nextTrack();
  if (/\b(previous track|previous song)\b/.test(c)) return previousTrack();
  if (/\b(play news)\b/.test(c)) {
    speak("Here are some headlines: A breakthrough in clean energy was announced. Satellite imagery revealed new ancient sites. Markets are mixed amid policy updates.");
    return;
  }
  if (/\b(movie recommendations?)\b/.test(c)) {
    speak("Try Inception, Interstellar, The Dark Knight, The Matrix, or Blade Runner 2049.");
    return;
  }

  // System / Theme / Volume
  if (/\b(toggle theme|change theme|switch theme)\b/.test(c)) {
    document.body.classList.toggle('light-mode');
    const theme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    speak(`Switched to ${theme} mode.`);
    showNotification('Theme Changed', `${theme} mode activated`, 'info');
    return;
  }
  if (/\b(increase volume|volume up)\b/.test(c)) return adjustVolume('up');
  if (/\b(decrease volume|volume down)\b/.test(c)) return adjustVolume('down');
  if (/\bmute\b/.test(c)) return adjustVolume('mute');
  if (/\bunmute\b/.test(c)) return adjustVolume('unmute');
  if (/\bsystem status\b/.test(c)) return systemStatus();

  // Fallback
  speak("Command not recognized. Please try again or say 'Jarvis, help'.");
}

// ==================== SPEECH RECOGNITION CONTROL ====================
function safeStartRecognition() {
  if (!recognition) {
    statusDiv.textContent = 'SPEECH RECOGNITION NOT SUPPORTED';
    startBtn.disabled = true;
    micStatus.textContent = 'VOICE UNSUPPORTED';
    return;
  }
  if (recognitionRunning) return;
  try {
    recognition.start();
  } catch (e) {
    // sometimes InvalidStateError if already started
  }
}
function safeStopRecognition() {
  if (!recognition) return;
  try { recognition.stop(); } catch {}
}

if (recognition) {
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;

  // Optional simple grammar to bias wake word
  if (SpeechGrammarList) {
    const grammar = `#JSGF V1.0; grammar jarvis; public <cmd> = jarvis | hello | start | stop ;`;
    const list = new SpeechGrammarList();
    list.addFromString(grammar, 1);
    recognition.grammars = list;
  }

  startBtn.addEventListener('click', () => {
    if (!isListening) {
      isListening = true; isActiveSession = true;
      safeStartRecognition();
      startBtn.style.backgroundColor = '#dc2626';
      buttonText.textContent = 'Stop Listening';
      statusDiv.classList.add('listening-indicator');
      setStatus('LISTENING', true);
      showNotification('Voice Recognition', 'Listening for commands', 'info');
      beep(1, 120, 1200);
    } else {
      isListening = false; isActiveSession = false;
      safeStopRecognition();
      startBtn.style.backgroundColor = '#0891b2';
      buttonText.textContent = 'Activate Listening';
      statusDiv.classList.remove('listening-indicator');
      setStatus('AWAITING COMMAND', false);
      beep(1, 100, 600);
    }
  });

  recognition.onstart = () => {
    recognitionRunning = true;
    micStatus.textContent = 'VOICE LISTENING';
    setStatus('LISTENING', true);
  };
  recognition.onend = () => {
    recognitionRunning = false;
    micStatus.textContent = 'VOICE IDLE';
    if (isActiveSession && isListening && document.visibilityState === 'visible') {
      // small delay then restart
      setTimeout(safeStartRecognition, 300);
    } else {
      setStatus('AWAITING COMMAND', false);
    }
  };
  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript;
    lastTranscript = transcript;
    processCommand(transcript, 'voice');
  };
  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    let msg = "An error occurred with speech recognition.";
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      msg = "Microphone access denied. Please allow microphone access in your browser.";
      statusDiv.textContent = 'MIC ACCESS DENIED';
      micStatus.textContent = 'MIC ACCESS DENIED';
      showNotification('Permission Required', 'Allow mic access to use voice commands.', 'error', 10000);
    } else if (event.error === 'no-speech') {
      // ignore silent errors
      return;
    } else if (event.error === 'network') {
      msg = "Network error with voice recognition service.";
    } else {
      statusDiv.textContent = 'RECOGNITION ERROR';
      showNotification('Recognition', 'Voice recognition error occurred', 'error');
    }
    // Stop listening on major errors
    isListening = false; isActiveSession = false; safeStopRecognition();
    speak(msg);
  };

  // Attempt passive start after load (may fail without user gesture)
  setTimeout(() => {
    try {
      recognition.start();
      statusDiv.textContent = 'LISTENING FOR WAKE WORD';
      micStatus.textContent = 'WAKE WORD LISTENING';
    } catch (e) {
      // expected on some browsers; wait for button click
    }
  }, 800);
} else {
  statusDiv.textContent = "BROWSER INCOMPATIBLE";
  startBtn.disabled = true;
  micStatus.textContent = 'VOICE UNSUPPORTED';
  showNotification('Browser Incompatible', 'Your browser does not support Web Speech API', 'error');
}

// ==================== UI EVENTS ====================
toggleCommandsBtn.addEventListener('click', () => {
  commandPanel.classList.toggle('open');
  const icon = toggleCommandsBtn.querySelector('i');
  if (commandPanel.classList.contains('open')) {
    toggleCommandsBtn.querySelector('span').textContent = 'Hide Available Commands';
    icon.className = 'fas fa-chevron-up';
    // Auto-fit height
    commandPanel.style.maxHeight = commandPanel.scrollHeight + 'px';
  } else {
    toggleCommandsBtn.querySelector('span').textContent = 'Show Available Commands';
    icon.className = 'fas fa-chevron-down';
    commandPanel.style.maxHeight = '0px';
  }
});

settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('open');
});

themeToggleBtn.addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
  const theme = document.body.classList.contains('light-mode') ? "light" : "dark";
  speak(`Switched to ${theme} mode.`);
  showNotification('Theme Changed', `${theme} mode activated`, 'info');
});

// Typed input
sendCmdBtn.addEventListener('click', () => {
  const v = textInput.value.trim();
  if (!v) return;
  processCommand(v, 'typed');
  textInput.value = '';
});
textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendCmdBtn.click();
});

// ==================== WELCOME ====================
setTimeout(() => {
  showNotification('JARVIS Online', 'System initialized. Say "Jarvis start" or click Activate Listening.', 'success', 5000);
}, 600);
