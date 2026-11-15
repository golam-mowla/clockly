// Clockly - High-Performance Wallpaper Engine
(function () {
  'use strict';

  // Default configuration
  const defaultSettings = {
    // Clock
    showClock: true,
    clockStyle: 'digital', // 'digital' or 'analog'
    hour12: true,
    showAmPm: true,
    showSeconds: true,
    clockScale: 1.0,
    globalScale: 1.0,

    // Date
    showDate: true,
    showWeekday: true,
    dateFormat: 'DD MMMM YYYY', // 'DD MMMM YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY'

    // Dual Clock
    showDual: true,
    dualLabel: 'LONDON',
    dualTimezone: 'Europe/London',
    dualHour12: true,

    // Stopwatch
    showStopwatch: true,
    stopwatchGlass: true,

    // Pomodoro
    showPomodoro: true,
    pomodoroGlass: true,
    pomFocusDuration: 25,
    pomShortBreak: 5,
    pomLongBreak: 15,
    pomLongBreakInterval: 4,
    pomAutoCycle: true,
    pomSound: true,
    pomNotification: true,

    // Countdown & Alarm
    showCountdown: false,
    cdMode: 'duration', // 'duration' or 'target'
    cdHours: 0,
    cdMinutes: 10,
    cdSeconds: 0,
    cdTarget: '',
    cdTargetSetAt: 0,
    cdLabel: 'Countdown',
    cdSound: true,
    cdNotify: true,
    showAlarm: false,
    alarmTime: '07:30',
    alarmLabel: 'Wake Up',
    alarmEnabled: false,

    // Styling & Appearance
    theme: 'theme-minimal',
    fontFamily: 'Inter',
    customFont: '',
    fontWeight: '400',
    letterSpacing: '0',
    textColor: '#ffffff',
    textOpacity: 100,
    textShadow: true,
    shadowBlur: 14,
    cardBlur: 16,
    cardOpacity: 8,
    cardRadius: 16,

    // Layout
    layoutPreset: 'center', // 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'custom'
    positions: {} // id -> { left: '10%', top: '20%' }
  };

  let settings = Object.assign({}, defaultSettings);
  let isEditMode = false;
  let isFullscreenAppActive = false;

  // DOM Elements
  const stage = document.getElementById('stage');
  const editModeBanner = document.getElementById('editModeBanner');
  const btnExitEdit = document.getElementById('btnExitEdit');
  const btnOpenSettingsFromBanner = document.getElementById('btnOpenSettingsFromBanner');

  const widgetDate = document.getElementById('widgetDate');
  const dateText = document.getElementById('dateText');

  const widgetClock = document.getElementById('widgetClock');
  const digitalClock = document.getElementById('digitalClock');
  const clockHours = document.getElementById('clockHours');
  const clockMinutes = document.getElementById('clockMinutes');
  const clockSecondsWrapper = document.getElementById('clockSecondsWrapper');
  const clockSeconds = document.getElementById('clockSeconds');
  const clockAmPm = document.getElementById('clockAmPm');

  const analogClock = document.getElementById('analogClock');
  const dialTicks = document.getElementById('dialTicks');
  const hourHand = document.getElementById('hourHand');
  const minuteHand = document.getElementById('minuteHand');
  const secondHand = document.getElementById('secondHand');

  const widgetDual = document.getElementById('widgetDual');
  const dualLabel = document.getElementById('dualLabel');
  const dualTime = document.getElementById('dualTime');

  const widgetStopwatch = document.getElementById('widgetStopwatch');
  const swTime = document.getElementById('swTime');
  const swBtnStart = document.getElementById('swBtnStart');
  const swBtnLap = document.getElementById('swBtnLap');
  const swBtnReset = document.getElementById('swBtnReset');
  const swLapList = document.getElementById('swLapList');

  const widgetPomodoro = document.getElementById('widgetPomodoro');
  const pomModeTag = document.getElementById('pomModeTag');
  const pomSessionCount = document.getElementById('pomSessionCount');
  const pomTime = document.getElementById('pomTime');
  const pomProgressBar = document.getElementById('pomProgressBar');
  const pomBtnStart = document.getElementById('pomBtnStart');
  const pomBtnSkip = document.getElementById('pomBtnSkip');
  const pomBtnReset = document.getElementById('pomBtnReset');

  const widgetCountdown = document.getElementById('widgetCountdown');
  const cdTime = document.getElementById('cdTime');
  const cdBtnStart = document.getElementById('cdBtnStart');
  const cdBtnReset = document.getElementById('cdBtnReset');
  const cdLabelEl = document.getElementById('cdLabel');
  const cdSub = document.getElementById('cdSub');
  const cdProgressBar = document.getElementById('cdProgressBar');
  const cdHourglass = document.getElementById('cdHourglass');
  const cdControls = document.getElementById('cdControls');

  const widgetAlarm = document.getElementById('widgetAlarm');
  const alarmStatusBadge = document.getElementById('alarmStatusBadge');
  const alarmTimeDisplay = document.getElementById('alarmTimeDisplay');
  const alarmLabelDisplay = document.getElementById('alarmLabelDisplay');

  // Build analog dial ticks
  function initAnalogDial() {
    dialTicks.innerHTML = '';
    for (let i = 0; i < 60; i++) {
      const angle = (i * 6) * Math.PI / 180;
      const isMajor = (i % 5 === 0);
      const r1 = isMajor ? 98 : 104;
      const r2 = 110;
      const x1 = 120 + r1 * Math.sin(angle);
      const y1 = 120 - r1 * Math.cos(angle);
      const x2 = 120 + r2 * Math.sin(angle);
      const y2 = 120 - r2 * Math.cos(angle);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      if (isMajor) line.classList.add('major');
      dialTicks.appendChild(line);
    }
  }
  initAnalogDial();

  // Web Audio Synthesizer (Zero dependencies, crystal-clear sound)
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playChime() {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Harmonic pleasant chime chords: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz)
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 1.3);
    });
  }

  function playAlarmSound() {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now + i * 0.25);
      gain.gain.setValueAtTime(0.3, now + i * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.25 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.25);
      osc.stop(now + i * 0.25 + 0.2);
    }
  }

  // Native Notification
  function showNotification(title, body) {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body: body });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(p => {
          if (p === 'granted') new Notification(title, { body: body });
        });
      }
    }
    // Also request native toast via Tauri command if available
    if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
      window.__TAURI__.core.invoke('show_notification', { title, body }).catch(() => {});
    }
  }

  // Date Formatting Helper
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function formatDate(d, fmt, showWk) {
    const dayName = days[d.getDay()];
    const monthName = months[d.getMonth()];
    const dateNum = String(d.getDate()).padStart(2, '0');
    const monthNum = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    let res = '';
    switch (fmt) {
      case 'YYYY-MM-DD':
        res = `${year}-${monthNum}-${dateNum}`;
        break;
      case 'MM/DD/YYYY':
        res = `${monthNum}/${dateNum}/${year}`;
        break;
      case 'DD/MM/YYYY':
        res = `${dateNum}/${monthNum}/${year}`;
        break;
      case 'DD MMMM YYYY':
      default:
        res = `${dateNum} ${monthName.toUpperCase()} ${year}`;
        break;
    }
    return showWk ? `${dayName.toUpperCase()}, ${res}` : res;
  }

  // Main Clock Update
  let lastSecond = -1;
  let lastMinute = -1;

  function updateClock() {
    const now = new Date();
    const curSec = now.getSeconds();
    const curMin = now.getMinutes();

    // Update Digital Clock
    let h = now.getHours();
    const m = String(curMin).padStart(2, '0');
    const s = String(curSec).padStart(2, '0');
    let ampm = '';

    if (settings.hour12) {
      ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h ? h : 12;
    }
    const hStr = String(h).padStart(2, '0');

    if (clockHours.textContent !== hStr) clockHours.textContent = hStr;
    if (clockMinutes.textContent !== m) clockMinutes.textContent = m;
    if (clockSeconds.textContent !== s) clockSeconds.textContent = s;
    if (clockAmPm.textContent !== ampm) clockAmPm.textContent = ampm;

    // Update Analog Clock
    if (settings.clockStyle === 'analog') {
      const ms = now.getMilliseconds();
      const secAngle = (curSec + ms / 1000) * 6;
      const minAngle = (curMin + curSec / 60) * 6;
      const hrAngle = ((now.getHours() % 12) + curMin / 60) * 30;

      secondHand.setAttribute('transform', `rotate(${secAngle} 120 120)`);
      minuteHand.setAttribute('transform', `rotate(${minAngle} 120 120)`);
      hourHand.setAttribute('transform', `rotate(${hrAngle} 120 120)`);
    }

    // Update Date once per minute
    if (curMin !== lastMinute) {
      lastMinute = curMin;
      const dStr = formatDate(now, settings.dateFormat, settings.showWeekday);
      if (dateText.textContent !== dStr) dateText.textContent = dStr;

      // Update Dual Clock
      if (settings.showDual) {
        try {
          const dualFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: settings.dualTimezone || 'Europe/London',
            hour: '2-digit',
            minute: '2-digit',
            hour12: settings.dualHour12
          });
          const dTimeStr = dualFormatter.format(now);
          if (dualTime.textContent !== dTimeStr) dualTime.textContent = dTimeStr;
        } catch (e) {
          dualTime.textContent = '--:--';
        }
      }

      // Check Alarm
      if (settings.showAlarm && settings.alarmEnabled && settings.alarmTime) {
        const [aH, aM] = settings.alarmTime.split(':').map(Number);
        if (now.getHours() === aH && now.getMinutes() === aM && curSec === 0) {
          playAlarmSound();
          showNotification('Clockly Alarm', settings.alarmLabel || 'Alarm ringing!');
        }
      }
    }
  }

  // Stopwatch Logic
  let swRunning = false;
  let swStartTime = 0;
  let swElapsed = 0;
  let swTimerId = null;
  let swLaps = [];

  function formatSw(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    const dec = Math.floor((ms % 1000) / 100);
    return `${m}:${s}.${dec}`;
  }

  function swTick() {
    if (!swRunning) return;
    const current = Date.now() - swStartTime + swElapsed;
    swTime.textContent = formatSw(current);
    if (!isFullscreenAppActive) {
      requestAnimationFrame(swTick);
    } else {
      setTimeout(swTick, 1000);
    }
  }

  function swStart() {
    if (swRunning) return;
    swRunning = true;
    swStartTime = Date.now();
    swBtnStart.textContent = 'Pause';
    swBtnLap.disabled = false;
    requestAnimationFrame(swTick);
  }

  function swPause() {
    if (!swRunning) return;
    swRunning = false;
    swElapsed += Date.now() - swStartTime;
    swBtnStart.textContent = 'Start';
    swBtnLap.disabled = true;
  }

  function swReset() {
    swRunning = false;
    swElapsed = 0;
    swStartTime = 0;
    swLaps = [];
    swTime.textContent = '00:00.0';
    swBtnStart.textContent = 'Start';
    swBtnLap.disabled = true;
    swLapList.innerHTML = '';
    swLapList.classList.add('hidden');
  }

  function swLap() {
    if (!swRunning) return;
    const current = Date.now() - swStartTime + swElapsed;
    const lapNum = swLaps.length + 1;
    swLaps.unshift({ lap: lapNum, time: formatSw(current) });
    renderLaps();
  }

  function renderLaps() {
    if (swLaps.length === 0) {
      swLapList.classList.add('hidden');
      return;
    }
    swLapList.classList.remove('hidden');
    swLapList.innerHTML = swLaps.slice(0, 5).map(l =>
      `<div class="sw-lap-item"><span>Lap ${l.lap}</span><span>${l.time}</span></div>`
    ).join('');
  }

  swBtnStart.addEventListener('click', () => {
    if (swRunning) swPause(); else swStart();
  });
  swBtnLap.addEventListener('click', swLap);
  swBtnReset.addEventListener('click', swReset);

  // Pomodoro Logic
  const POM_FOCUS = 'FOCUS';
  const POM_SHORT_BREAK = 'SHORT BREAK';
  const POM_LONG_BREAK = 'LONG BREAK';

  let pomState = POM_FOCUS;
  let pomRunning = false;
  let pomRemaining = 25 * 60;
  let pomTotal = 25 * 60;
  let pomCycleCount = 1;
  let pomTimerId = null;

  function updatePomDisplay() {
    const m = String(Math.floor(pomRemaining / 60)).padStart(2, '0');
    const s = String(pomRemaining % 60).padStart(2, '0');
    pomTime.textContent = `${m}:${s}`;
    pomModeTag.textContent = pomState;
    pomSessionCount.textContent = `Session #${pomCycleCount}`;

    const pct = Math.max(0, Math.min(100, (pomRemaining / pomTotal) * 100));
    pomProgressBar.style.width = `${pct}%`;
  }

  function pomStart() {
    if (pomRunning) return;
    pomRunning = true;
    pomBtnStart.textContent = 'Pause';
    pomTimerId = setInterval(pomTick, 1000);
  }

  function pomPause() {
    if (!pomRunning) return;
    pomRunning = false;
    pomBtnStart.textContent = 'Start';
    clearInterval(pomTimerId);
  }

  function pomReset() {
    pomPause();
    setPomState(POM_FOCUS);
  }

  function setPomState(newState) {
    pomState = newState;
    if (newState === POM_FOCUS) {
      pomTotal = (settings.pomFocusDuration || 25) * 60;
      pomModeTag.className = 'card-badge';
    } else if (newState === POM_SHORT_BREAK) {
      pomTotal = (settings.pomShortBreak || 5) * 60;
      pomModeTag.className = 'card-badge badge-dim';
    } else if (newState === POM_LONG_BREAK) {
      pomTotal = (settings.pomLongBreak || 15) * 60;
      pomModeTag.className = 'card-badge badge-dim';
    }
    pomRemaining = pomTotal;
    updatePomDisplay();
  }

  function pomTick() {
    if (pomRemaining > 0) {
      pomRemaining--;
      updatePomDisplay();
    } else {
      pomCompleted();
    }
  }

  function pomCompleted() {
    pomPause();
    if (settings.pomSound) playChime();

    if (pomState === POM_FOCUS) {
      if (settings.pomNotification) {
        showNotification('Pomodoro Completed!', `Great work! Time for a break.`);
      }
      if (pomCycleCount % (settings.pomLongBreakInterval || 4) === 0) {
        setPomState(POM_LONG_BREAK);
      } else {
        setPomState(POM_SHORT_BREAK);
      }
    } else {
      if (settings.pomNotification) {
        showNotification('Break Ended!', `Ready to focus again?`);
      }
      pomCycleCount++;
      setPomState(POM_FOCUS);
    }

    if (settings.pomAutoCycle) {
      pomStart();
    }
  }

  pomBtnStart.addEventListener('click', () => {
    if (pomRunning) pomPause(); else pomStart();
  });
  pomBtnSkip.addEventListener('click', () => {
    pomCompleted();
  });
  pomBtnReset.addEventListener('click', pomReset);

  // Countdown Logic (timestamp based, no drift)
  const CD_IDLE = 'idle', CD_RUN = 'running', CD_PAUSED = 'paused', CD_DONE = 'done';
  let cdState = CD_IDLE;
  let cdEndAt = 0;
  let cdLeftMs = 0;
  let cdTotalMs = 1;
  let cdTimerId = null;
  let cdSig = '';
  let cdSawPositive = false;
  let cdFiredKey = '';

  const pad2 = n => String(n).padStart(2, '0');

  function cdIsTarget() { return settings.cdMode === 'target'; }

  function cdTargetMs() {
    const t = settings.cdTarget ? new Date(settings.cdTarget).getTime() : NaN;
    return isNaN(t) ? 0 : t;
  }

  function cdConfigMs() {
    return ((settings.cdHours || 0) * 3600 + (settings.cdMinutes || 0) * 60 + (settings.cdSeconds || 0)) * 1000;
  }

  function cdRemaining() {
    if (cdIsTarget()) {
      const t = cdTargetMs();
      return t ? Math.max(0, t - Date.now()) : 0;
    }
    if (cdState === CD_RUN) return Math.max(0, cdEndAt - Date.now());
    return cdLeftMs;
  }

  function cdFormat(totalSec) {
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (d > 0) return `${d}d ${pad2(h)}:${pad2(m)}:${pad2(s)}`;
    if (h > 0) return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
    return `${pad2(m)}:${pad2(s)}`;
  }

  function cdRender() {
    const target = cdIsTarget();
    const hasTarget = target && cdTargetMs() > 0;
    const rem = cdRemaining();
    const finished = target ? (hasTarget && rem <= 0) : cdState === CD_DONE;
    const running = target ? rem > 0 : cdState === CD_RUN;

    cdTime.textContent = (target && !hasTarget) ? '--:--' : cdFormat(Math.ceil(rem / 1000));

    const p = cdTotalMs > 0 ? Math.max(0, Math.min(1, rem / cdTotalMs)) : 0;
    cdHourglass.style.setProperty('--p', finished ? 0 : (target && !hasTarget ? 1 : p));
    cdProgressBar.style.width = `${p * 100}%`;
    cdHourglass.classList.toggle('running', running && rem > 0);
    widgetCountdown.classList.toggle('done', finished);

    cdLabelEl.textContent = (settings.cdLabel || 'Countdown').toUpperCase();
    let sub;
    if (finished) sub = "Time's up!";
    else if (target) sub = hasTarget
      ? 'Until ' + new Date(cdTargetMs()).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : 'Pick a date & time in Settings';
    else if (cdState === CD_RUN) sub = 'Counting down…';
    else if (cdState === CD_PAUSED) sub = 'Paused';
    else sub = 'Ready';
    if (cdSub.textContent !== sub) cdSub.textContent = sub;

    cdBtnStart.textContent = cdState === CD_RUN ? 'Pause' : (cdState === CD_PAUSED ? 'Resume' : 'Start');
    cdControls.classList.toggle('hidden', target);
  }

  function cdFinished() {
    if (settings.cdSound !== false) { playChime(); setTimeout(playChime, 1400); }
    if (settings.cdNotify !== false) {
      showNotification(`${settings.cdLabel || 'Countdown'} finished!`, "Time's up!");
    }
  }

  function cdTick() {
    const rem = cdRemaining();
    if (cdIsTarget()) {
      if (rem > 0) cdSawPositive = true;
      else if (cdSawPositive && cdFiredKey !== settings.cdTarget) {
        cdFiredKey = settings.cdTarget;
        cdFinished();
      }
    } else if (cdState === CD_RUN && rem <= 0) {
      cdState = CD_DONE;
      cdLeftMs = 0;
      cdFinished();
    }
    cdRender();
    cdSyncTimer();
  }

  function cdSyncTimer() {
    const needTimer = settings.showCountdown &&
      ((cdIsTarget() && cdTargetMs() > Date.now()) || (!cdIsTarget() && cdState === CD_RUN));
    if (needTimer && !cdTimerId) {
      cdTimerId = setInterval(cdTick, 250);
    } else if (!needTimer && cdTimerId) {
      clearInterval(cdTimerId);
      cdTimerId = null;
    }
  }

  function cdResetState(flip) {
    cdState = CD_IDLE;
    if (cdIsTarget()) {
      const t = cdTargetMs();
      const base = settings.cdTargetSetAt || Date.now();
      cdTotalMs = Math.max(t - base, 1);
    } else {
      cdTotalMs = Math.max(cdConfigMs(), 1);
      cdLeftMs = cdConfigMs();
    }
    cdRender();
    cdSyncTimer();
    if (flip) {
      cdHourglass.classList.remove('flipping');
      void cdHourglass.getBoundingClientRect();
      cdHourglass.classList.add('flipping');
      setTimeout(() => cdHourglass.classList.remove('flipping'), 850);
    }
  }

  function cdStart() {
    if (cdIsTarget() || cdState === CD_RUN) return;
    if (cdState === CD_DONE || cdLeftMs <= 0) cdResetState(false);
    if (cdLeftMs <= 0) return;
    cdState = CD_RUN;
    cdEndAt = Date.now() + cdLeftMs;
    cdRender();
    cdSyncTimer();
  }

  function cdPause() {
    if (cdState !== CD_RUN) return;
    cdLeftMs = Math.max(0, cdEndAt - Date.now());
    cdState = CD_PAUSED;
    cdRender();
    cdSyncTimer();
  }

  function cdCommand(cmd) {
    if (cmd === 'start') cdStart();
    else if (cmd === 'pause') cdPause();
    else if (cmd === 'reset') cdResetState(true);
  }

  // Called from applySettings(): reset if the countdown configuration changed
  function cdApplyConfig() {
    const sig = [settings.cdMode, settings.cdHours, settings.cdMinutes, settings.cdSeconds, settings.cdTarget, settings.cdTargetSetAt].join('|');
    if (sig !== cdSig) {
      cdSig = sig;
      cdSawPositive = false;
      cdFiredKey = '';
      cdResetState(false);
    } else {
      cdRender();
      cdSyncTimer();
    }
  }

  cdBtnStart.addEventListener('click', () => {
    if (cdState === CD_RUN) cdPause(); else cdStart();
  });
  cdBtnReset.addEventListener('click', () => cdResetState(true));

  // Apply Settings to DOM
  function applySettings() {
    // Visibility
    widgetClock.classList.toggle('hidden', !settings.showClock);
    widgetDate.classList.toggle('hidden', !settings.showDate);
    widgetDual.classList.toggle('hidden', !settings.showDual);
    widgetStopwatch.classList.toggle('hidden', !settings.showStopwatch);
    widgetPomodoro.classList.toggle('hidden', !settings.showPomodoro);
    widgetCountdown.classList.toggle('hidden', !settings.showCountdown);
    widgetAlarm.classList.toggle('hidden', !settings.showAlarm);

    // Clock Style
    if (settings.clockStyle === 'analog') {
      digitalClock.classList.add('hidden');
      analogClock.classList.remove('hidden');
    } else {
      digitalClock.classList.remove('hidden');
      analogClock.classList.add('hidden');
    }

    // Seconds & AM/PM
    clockSecondsWrapper.classList.toggle('hidden', !settings.showSeconds);
    clockAmPm.classList.toggle('hidden', !settings.showAmPm || !settings.hour12);

    // Dual Label
    dualLabel.textContent = (settings.dualLabel || 'LONDON').toUpperCase();

    // Alarm Display
    if (settings.alarmEnabled) {
      alarmStatusBadge.textContent = 'ON';
      alarmStatusBadge.className = 'card-badge';
    } else {
      alarmStatusBadge.textContent = 'OFF';
      alarmStatusBadge.className = 'card-badge badge-dim';
    }
    alarmTimeDisplay.textContent = settings.alarmTime || '07:30';
    alarmLabelDisplay.textContent = settings.alarmLabel || 'Alarm';

    // Theme & Fonts
    document.body.className = `${settings.theme || 'theme-minimal'} ${isEditMode ? 'edit-mode' : ''}`;

    const fontToUse = (settings.fontFamily === 'Custom' && settings.customFont)
      ? settings.customFont
      : (settings.fontFamily || 'Inter');

    document.documentElement.style.setProperty('--font-family', `"${fontToUse}", sans-serif`);
    document.documentElement.style.setProperty('--font-weight', settings.fontWeight || '400');
    document.documentElement.style.setProperty('--letter-spacing', `${settings.letterSpacing || 0}px`);
    document.documentElement.style.setProperty('--clock-scale', settings.clockScale || 1.0);
    document.documentElement.style.setProperty('--global-scale', settings.globalScale || 1.0);

    // Text Color & Opacity
    if (settings.textColor) {
      document.documentElement.style.setProperty('--primary-color', settings.textColor);
    }
    const opacityVal = (settings.textOpacity || 100) / 100;
    document.body.style.opacity = opacityVal;

    // Text Shadow
    if (settings.textShadow) {
      const b = settings.shadowBlur || 14;
      document.documentElement.style.setProperty(
        '--text-shadow',
        `0 2px ${b}px rgba(0,0,0,0.7), 0 0 2px rgba(0,0,0,0.85)`
      );
    } else {
      document.documentElement.style.setProperty('--text-shadow', 'none');
    }

    // Glass Card settings
    document.documentElement.style.setProperty('--card-blur', `${settings.cardBlur || 16}px`);
    document.documentElement.style.setProperty('--card-radius', `${settings.cardRadius || 16}px`);
    const cardAlpha = (settings.cardOpacity !== undefined ? settings.cardOpacity : 8) / 100;
    document.documentElement.style.setProperty('--card-bg', `rgba(255, 255, 255, ${cardAlpha})`);

    // Layout Presets
    stage.className = `stage layout-${settings.layoutPreset || 'center'}`;

    // Apply Custom Saved Positions
    if (settings.positions && typeof settings.positions === 'object') {
      document.querySelectorAll('.widget').forEach(w => {
        const id = w.getAttribute('data-id');
        const pos = settings.positions[id];
        if (pos && pos.left && pos.top) {
          w.style.position = 'absolute';
          w.style.left = pos.left;
          w.style.top = pos.top;
          w.style.transform = 'translate(-50%, -50%)';
        } else {
          w.style.position = '';
          w.style.left = '';
          w.style.top = '';
          w.style.transform = '';
        }
      });
    }

    // Force date & clock refresh
    lastMinute = -1;
    updateClock();
    updatePomDisplay();
    cdApplyConfig();
  }

  // Drag and Drop for Edit Mode
  function initDragAndDrop() {
    let activeDrag = null;
    let startX = 0;
    let startY = 0;
    let origLeft = 0;
    let origTop = 0;

    document.querySelectorAll('.widget').forEach(w => {
      w.addEventListener('mousedown', e => {
        if (!isEditMode) return;
        // Don't drag if clicking buttons
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

        activeDrag = w;
        w.classList.add('is-dragging');

        const rect = w.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        origLeft = rect.left + rect.width / 2;
        origTop = rect.top + rect.height / 2;

        e.preventDefault();
      });
    });

    window.addEventListener('mousemove', e => {
      if (!activeDrag || !isEditMode) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let newX = origLeft + dx;
      let newY = origTop + dy;

      // Clamp within screen
      newX = Math.max(30, Math.min(window.innerWidth - 30, newX));
      newY = Math.max(30, Math.min(window.innerHeight - 30, newY));

      const leftPct = ((newX / window.innerWidth) * 100).toFixed(2) + '%';
      const topPct = ((newY / window.innerHeight) * 100).toFixed(2) + '%';

      activeDrag.style.position = 'absolute';
      activeDrag.style.left = leftPct;
      activeDrag.style.top = topPct;
      activeDrag.style.transform = 'translate(-50%, -50%)';

      const id = activeDrag.getAttribute('data-id');
      if (!settings.positions) settings.positions = {};
      settings.positions[id] = { left: leftPct, top: topPct };
      settings.layoutPreset = 'custom';
    });

    window.addEventListener('mouseup', () => {
      if (activeDrag) {
        activeDrag.classList.remove('is-dragging');
        activeDrag = null;
        saveSettingsToBackend();
      }
    });
  }
  initDragAndDrop();

  // Edit Mode Toggle
  function setEditMode(active) {
    isEditMode = active;
    document.body.classList.toggle('edit-mode', active);
    editModeBanner.classList.toggle('hidden', !active);

    if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
      window.__TAURI__.core.invoke('set_interactive', { interactive: active }).catch(() => {});
    }
  }

  btnExitEdit.addEventListener('click', () => {
    setEditMode(false);
  });

  btnOpenSettingsFromBanner.addEventListener('click', () => {
    if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
      window.__TAURI__.core.invoke('open_settings_window').catch(() => {});
    }
  });

  // Settings Save & Load via Tauri
  function saveSettingsToBackend() {
    if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
      window.__TAURI__.core.invoke('save_settings', {
        settingsJson: JSON.stringify(settings)
      }).catch(err => console.error('Failed to save settings:', err));
    }
  }

  function loadSettingsFromBackend() {
    if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
      window.__TAURI__.core.invoke('load_settings')
        .then(jsonStr => {
          if (jsonStr && jsonStr !== '{}') {
            try {
              const loaded = JSON.parse(jsonStr);
              settings = Object.assign({}, defaultSettings, loaded);
              applySettings();
            } catch (e) {
              console.error('Failed parsing loaded settings:', e);
            }
          }
        })
        .catch(err => console.error('Failed to load settings:', err));
    }
  }

  // Main Loop
  function tickLoop() {
    updateClock();
    if (settings.clockStyle === 'analog') {
      requestAnimationFrame(tickLoop);
    } else {
      // Align digital clock to top of next second
      const now = new Date();
      const delay = 1000 - now.getMilliseconds();
      setTimeout(tickLoop, delay);
    }
  }

  // Initialize
  applySettings();
  loadSettingsFromBackend();
  tickLoop();

  // Listen to Tauri events
  if (window.__TAURI__ && window.__TAURI__.event && window.__TAURI__.event.listen) {
    // Settings updated from settings window
    window.__TAURI__.event.listen('settings-updated', event => {
      if (event.payload) {
        settings = Object.assign({}, settings, event.payload);
        applySettings();
      }
    });

    // Countdown commands from settings window
    window.__TAURI__.event.listen('cd-command', event => cdCommand(event.payload));

    // Toggle edit mode
    window.__TAURI__.event.listen('set-edit-mode', event => {
      setEditMode(!!event.payload);
    });

    // Tray stopwatch toggle
    window.__TAURI__.event.listen('tray-sw-toggle', () => {
      if (swRunning) swPause(); else swStart();
    });

    // Tray pomodoro toggle
    window.__TAURI__.event.listen('tray-pom-toggle', () => {
      if (pomRunning) pomPause(); else pomStart();
    });

    // Fullscreen state changed (throttle rendering when fullscreen game/app is running)
    window.__TAURI__.event.listen('fullscreen-state-changed', event => {
      isFullscreenAppActive = !!event.payload;
      if (isFullscreenAppActive) {
        console.log('Fullscreen app active: throttling clock updates');
      }
    });
  }

  // Fallback channel between the two windows (works even if Tauri events are unavailable)
  try {
    const bus = new BroadcastChannel('clockly');
    bus.onmessage = e => {
      const msg = e.data;
      if (!msg) return;
      if (msg.type === 'settings' && msg.payload) {
        settings = Object.assign({}, settings, msg.payload);
        applySettings();
      } else if (msg.type === 'cd-command') {
        cdCommand(msg.payload);
      }
    };
  } catch (e) { /* BroadcastChannel unavailable */ }

  // Escape key exits edit mode
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isEditMode) {
      setEditMode(false);
    }
  });

})();
