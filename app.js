const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

let alarms = JSON.parse(localStorage.getItem('alarms') || '[]');
let ringingId = null;
let audioCtx = null;
let selectedDays = new Set();

// 曜日ボタンのトグル
document.querySelectorAll('.day-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const d = Number(btn.dataset.day);
    if (selectedDays.has(d)) {
      selectedDays.delete(d);
      btn.classList.remove('selected');
    } else {
      selectedDays.add(d);
      btn.classList.add('selected');
    }
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
  const alarm = {
    id: Date.now(),
    time: timeVal,
    label,
    repeat: [...selectedDays].sort(),
    enabled: true,
  };

  alarms.push(alarm);
  alarms.sort((a, b) => a.time.localeCompare(b.time));
  save();
  renderList();

  // フォームリセット
  document.getElementById('alarmTime').value = '';
  document.getElementById('alarmLabel').value = '';
  selectedDays.clear();
  document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('selected'));
}

function toggleAlarm(id) {
  const alarm = alarms.find(a => a.id === id);
  if (alarm) alarm.enabled = !alarm.enabled;
  save();
  renderList();
}

function deleteAlarm(id) {
  alarms = alarms.filter(a => a.id !== id);
  save();
  renderList();
}

function renderList() {
  const list = document.getElementById('alarmList');
  if (alarms.length === 0) {
    list.innerHTML = '<div class="empty-msg">No alarms yet</div>';
    return;
  }

  list.innerHTML = alarms.map(alarm => {
    const repeatText = alarm.repeat.length === 0
      ? 'Once'
      : alarm.repeat.length === 7
        ? 'Every day'
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
      </div>
    `;
  }).join('');
}

function triggerAlarm(alarm) {
  ringingId = alarm.id;
  document.getElementById('modalTime').textContent = alarm.time;
  document.getElementById('modalLabel').textContent = alarm.label || '';
  document.getElementById('modal').style.display = 'flex';
  playSound();

  // 繰り返しなしなら自動でOFF
  if (alarm.repeat.length === 0) {
    alarm.enabled = false;
    save();
    renderList();
  }
}

function dismiss() {
  stopSound();
  ringingId = null;
  document.getElementById('modal').style.display = 'none';
}

function snooze() {
  stopSound();
  document.getElementById('modal').style.display = 'none';

  const alarm = alarms.find(a => a.id === ringingId);
  ringingId = null;
  if (!alarm) return;

  const snoozeMin = 5;
  const [h, m] = alarm.time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m + snoozeMin, 0, 0);
  const nh = String(d.getHours()).padStart(2, '0');
  const nm = String(d.getMinutes()).padStart(2, '0');

  const snoozeAlarm = {
    id: Date.now(),
    time: `${nh}:${nm}`,
    label: `${alarm.label ? alarm.label + ' ' : ''}(Snooze)`,
    repeat: [],
    enabled: true,
  };
  alarms.push(snoozeAlarm);
  alarms.sort((a, b) => a.time.localeCompare(b.time));
  save();
  renderList();
}

function playSound() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function beep() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
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

function save() {
  localStorage.setItem('alarms', JSON.stringify(alarms));
}

setInterval(updateClock, 1000);
updateClock();
renderList();
