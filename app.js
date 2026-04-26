let alarmTime = null;
let alarmInterval = null;
let audioCtx = null;
let ringing = false;

function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  document.getElementById('clock').textContent = `${h}:${m}:${s}`;

  if (alarmTime) {
    const current = `${h}:${m}`;
    if (current === alarmTime && !ringing) {
      triggerAlarm();
    }
  }
}

function setAlarm() {
  const input = document.getElementById('alarmTime').value;
  if (!input) return;

  alarmTime = input;
  ringing = false;

  const status = document.getElementById('status');
  status.textContent = `アラーム設定済み: ${input}`;
  status.className = 'status active';

  document.getElementById('cancelBtn').style.display = 'block';
}

function cancelAlarm() {
  alarmTime = null;
  ringing = false;
  stopSound();

  const status = document.getElementById('status');
  status.textContent = 'アラームは設定されていません';
  status.className = 'status';

  document.getElementById('cancelBtn').style.display = 'none';
}

function triggerAlarm() {
  ringing = true;

  const status = document.getElementById('status');
  status.textContent = 'アラーム！';
  status.className = 'status ringing';

  playSound();
}

function playSound() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  function beep() {
    if (!ringing) return;
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
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
}

setInterval(updateClock, 1000);
updateClock();
