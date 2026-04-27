const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// ── アラーム ──────────────────────────────────────────────
let alarms = JSON.parse(localStorage.getItem('alarms') || '[]');
let ringingId = null;
let ringingType = 'alarm'; // 'alarm' | 'timer' | 'pomodoro'
let audioCtx = null;
let selectedDays = new Set();

document.querySelectorAll('.day-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const d = Number(btn.dataset.day);
    if (selectedDays.has(d)) { selectedDays.delete(d); btn.classList.remove('selected'); }
    else { selectedDays.add(d); btn.classList.add('selected'); }
  });
});

function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  document.getElementById('clock').textContent = `${h}:${m}:${s}`;
  document.getElementById('date').textContent =
    `${DAY_NAMES[now.getDay()]}  ·  ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  checkAlarms(now, h, m);
}

function checkAlarms(now, h, m) {
  const current = `${h}:${m}`;
  const todayDay = now.getDay();
  alarms.forEach(alarm => {
    if (!alarm.enabled) return;
    if (alarm.time !== current) return;
    if (now.getSeconds() !== 0) return;
    if (alarm.repeat.length > 0 && !alarm.repeat.includes(todayDay)) return;
    if (ringingId !== null) return;
    triggerAlarm(alarm);
  });
}

function addAlarm() {
  const timeVal = document.getElementById('alarmTime').value;
  if (!timeVal) return;
  const label = document.getElementById('alarmLabel').value.trim();
  const alarm = { id: Date.now(), time: timeVal, label, repeat: [...selectedDays].sort(), enabled: true };
  alarms.push(alarm);
  alarms.sort((a, b) => a.time.localeCompare(b.time));
  save();
  renderList();
  document.getElementById('alarmTime').value = '';
  document.getElementById('alarmLabel').value = '';
  selectedDays.clear();
  document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('selected'));
}

function toggleAlarm(id) {
  const alarm = alarms.find(a => a.id === id);
  if (alarm) alarm.enabled = !alarm.enabled;
  save(); renderList();
}

function deleteAlarm(id) {
  alarms = alarms.filter(a => a.id !== id);
  save(); renderList();
}

function renderList() {
  const list = document.getElementById('alarmList');
  if (alarms.length === 0) { list.innerHTML = '<div class="empty-msg">No alarms yet</div>'; return; }
  list.innerHTML = alarms.map(alarm => {
    const repeatText = alarm.repeat.length === 0 ? 'Once'
      : alarm.repeat.length === 7 ? 'Every day'
      : alarm.repeat.map(d => DAYS[d]).join(', ');
    const metaText = [alarm.label, repeatText].filter(Boolean).join('  ·  ');
    return `
      <div class="alarm-item ${alarm.enabled ? '' : 'off'}" id="item-${alarm.id}">
        <div class="alarm-info">
          <div class="alarm-time-text">${alarm.time}</div>
          <div class="alarm-meta">${metaText}</div>
        </div>
        <label class="toggle">
          <input type="checkbox" ${alarm.enabled ? 'checked' : ''} onchange="toggleAlarm(${alarm.id})">
          <div class="toggle-track"></div>
        </label>
        <button class="delete-btn" onclick="deleteAlarm(${alarm.id})">✕</button>
      </div>`;
  }).join('');
}

function triggerAlarm(alarm) {
  ringingId = alarm.id; ringingType = 'alarm';
  document.getElementById('modalIcon').textContent = '⏰';
  document.getElementById('modalTime').textContent = alarm.time;
  document.getElementById('modalLabel').textContent = alarm.label || '';
  document.getElementById('snoozeBtn').style.display = '';
  document.getElementById('modal').style.display = 'flex';
  playSound();
  if (alarm.repeat.length === 0) { alarm.enabled = false; save(); renderList(); }
}

function dismiss() {
  stopSound();
  ringingId = null;
  document.getElementById('modal').style.display = 'none';
  if (ringingType === 'pomodoro') nextPomPhase();
}

function snooze() {
  stopSound();
  document.getElementById('modal').style.display = 'none';
  const alarm = alarms.find(a => a.id === ringingId);
  ringingId = null;
  if (!alarm) return;
  const [h, m] = alarm.time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m + 5, 0, 0);
  const snoozeAlarm = {
    id: Date.now(),
    time: `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,
    label: `${alarm.label ? alarm.label + ' ' : ''}(Snooze)`,
    repeat: [], enabled: true,
  };
  alarms.push(snoozeAlarm);
  alarms.sort((a, b) => a.time.localeCompare(b.time));
  save(); renderList();
}

function save() { localStorage.setItem('alarms', JSON.stringify(alarms)); }

// ── タブ ──────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${name}`));
}

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ── ストップウォッチ ──────────────────────────────────────
let swRunning = false;
let swElapsed = 0;
let swLastStart = 0;
let swInterval = null;
let swLaps = [];

function toggleStopwatch() {
  if (swRunning) {
    clearInterval(swInterval);
    swElapsed += Date.now() - swLastStart;
    swRunning = false;
    document.getElementById('swStartBtn').textContent = 'Start';
  } else {
    swLastStart = Date.now();
    swInterval = setInterval(renderStopwatch, 30);
    swRunning = true;
    document.getElementById('swStartBtn').textContent = 'Stop';
  }
}

function resetStopwatch() {
  clearInterval(swInterval);
  swRunning = false; swElapsed = 0; swLaps = [];
  document.getElementById('swStartBtn').textContent = 'Start';
  document.getElementById('swDisplay').textContent = '00:00:00.00';
  document.getElementById('lapList').innerHTML = '';
}

function lapStopwatch() {
  if (!swRunning) return;
  const total = swElapsed + (Date.now() - swLastStart);
  const prev = swLaps.length > 0 ? swLaps[swLaps.length - 1].total : 0;
  swLaps.push({ total, split: total - prev });
  renderLaps();
}

function renderStopwatch() {
  const total = swElapsed + (swRunning ? Date.now() - swLastStart : 0);
  document.getElementById('swDisplay').textContent = formatMs(total);
}

function renderLaps() {
  const list = document.getElementById('lapList');
  list.innerHTML = [...swLaps].reverse().map((lap, i) => {
    const n = swLaps.length - i;
    return `<div class="lap-item">
      <span class="lap-num">Lap ${n}</span>
      <span class="lap-split">${formatMs(lap.split)}</span>
      <span class="lap-time">${formatMs(lap.total)}</span>
    </div>`;
  }).join('');
}

function formatMs(ms) {
  const cs  = Math.floor(ms / 10) % 100;
  const sec = Math.floor(ms / 1000) % 60;
  const min = Math.floor(ms / 60000) % 60;
  const hr  = Math.floor(ms / 3600000);
  return `${String(hr).padStart(2,'0')}:${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
}

// ── タイマー ──────────────────────────────────────────────
let timerRunning = false;
let timerRemaining = 0;
let timerInterval = null;

function setPreset(seconds) {
  resetTimer();
  timerRemaining = seconds;
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  renderTimer();
}

function setCustomTimer() {
  const min = parseInt(document.getElementById('customMin').value) || 0;
  const sec = parseInt(document.getElementById('customSec').value) || 0;
  const total = min * 60 + sec;
  if (total <= 0) return;
  resetTimer();
  timerRemaining = total;
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  renderTimer();
}

function toggleTimer() {
  if (timerRemaining <= 0) return;
  if (timerRunning) {
    clearInterval(timerInterval);
    timerRunning = false;
    document.getElementById('timerStartBtn').textContent = 'Start';
  } else {
    timerInterval = setInterval(() => {
      timerRemaining--;
      renderTimer();
      if (timerRemaining <= 0) {
        clearInterval(timerInterval);
        timerRunning = false;
        document.getElementById('timerStartBtn').textContent = 'Start';
        showTimerModal('Timer', '00:00', '⏱');
      }
    }, 1000);
    timerRunning = true;
    document.getElementById('timerStartBtn').textContent = 'Pause';
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  timerRunning = false; timerRemaining = 0;
  document.getElementById('timerStartBtn').textContent = 'Start';
  document.getElementById('timerDisplay').textContent = '00:00';
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
}

function renderTimer() {
  const m = String(Math.floor(timerRemaining / 60)).padStart(2, '0');
  const s = String(timerRemaining % 60).padStart(2, '0');
  document.getElementById('timerDisplay').textContent = `${m}:${s}`;
}

// ── ポモドーロ ────────────────────────────────────────────
let pomRunning = false;
let pomPhase = 'work'; // 'work' | 'break'
let pomRemaining = 25 * 60;
let pomCycles = 1;
let pomInterval = null;

function togglePomodoro() {
  if (pomRunning) {
    clearInterval(pomInterval);
    pomRunning = false;
    document.getElementById('pomStartBtn').textContent = 'Start';
  } else {
    pomInterval = setInterval(() => {
      pomRemaining--;
      renderPomodoro();
      if (pomRemaining <= 0) {
        clearInterval(pomInterval);
        pomRunning = false;
        document.getElementById('pomStartBtn').textContent = 'Start';
        const label = pomPhase === 'work' ? 'Work session done! Take a break.' : 'Break over! Back to work.';
        showTimerModal(label, pomPhase === 'work' ? 'Break time' : 'Work time', pomPhase === 'work' ? '✅' : '💪');
      }
    }, 1000);
    pomRunning = true;
    document.getElementById('pomStartBtn').textContent = 'Pause';
  }
}

function nextPomPhase() {
  if (pomPhase === 'work') {
    pomPhase = 'break';
    pomRemaining = (parseInt(document.getElementById('pomBreakMin').value) || 5) * 60;
  } else {
    pomPhase = 'work';
    pomCycles++;
    pomRemaining = (parseInt(document.getElementById('pomWorkMin').value) || 25) * 60;
  }
  renderPomodoro();
  togglePomodoro();
}

function resetPomodoro() {
  clearInterval(pomInterval);
  pomRunning = false; pomPhase = 'work'; pomCycles = 1;
  pomRemaining = (parseInt(document.getElementById('pomWorkMin').value) || 25) * 60;
  document.getElementById('pomStartBtn').textContent = 'Start';
  renderPomodoro();
}

function renderPomodoro() {
  const m = String(Math.floor(pomRemaining / 60)).padStart(2, '0');
  const s = String(pomRemaining % 60).padStart(2, '0');
  document.getElementById('pomDisplay').textContent = `${m}:${s}`;
  const label = document.getElementById('pomPhaseLabel');
  label.textContent = pomPhase === 'work' ? 'Work' : 'Break';
  label.className = `pom-phase ${pomPhase}`;
  document.getElementById('pomCyclesLabel').textContent = `Cycle ${pomCycles}`;
}

// ── モーダル共通 ──────────────────────────────────────────
function showTimerModal(label, time, icon) {
  ringingType = 'pomodoro';
  document.getElementById('modalIcon').textContent = icon;
  document.getElementById('modalTime').textContent = time;
  document.getElementById('modalLabel').textContent = label;
  document.getElementById('snoozeBtn').style.display = 'none';
  document.getElementById('modal').style.display = 'flex';
  playSound();
}

// ── サウンド ──────────────────────────────────────────────
function playSound() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function beep() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.4);
    setTimeout(beep, 700);
  }
  beep();
}

function stopSound() {
  if (audioCtx) { audioCtx.close(); audioCtx = null; }
}

// ── 初期化 ────────────────────────────────────────────────
setInterval(updateClock, 1000);
updateClock();
renderList();
renderPomodoro();
