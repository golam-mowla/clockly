// Clockly - Settings Window Logic
(function () {
  'use strict';

  const defaultSettings = {
    showClock: true,
    clockStyle: 'digital',
    hour12: true,
    showAmPm: true,
    showSeconds: true,
    clockScale: 1.0,
    globalScale: 1.0,

    showDate: true,
    showWeekday: true,
    dateFormat: 'DD MMMM YYYY',

    showDual: true,
    dualLabel: 'LONDON',
    dualTimezone: 'Europe/London',
    dualHour12: true,

    showStopwatch: true,
    stopwatchGlass: true,

    showPomodoro: true,
    pomodoroGlass: true,
    pomFocusDuration: 25,
    pomShortBreak: 5,
    pomLongBreak: 15,
    pomLongBreakInterval: 4,
    pomAutoCycle: true,
    pomSound: true,
    pomNotification: true,

    showCountdown: false,
    cdMode: 'duration',
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

    layoutPreset: 'center',
    positions: {}
  };

  let settings = Object.assign({}, defaultSettings);

  // Helper for Tauri IPC
  function invokeTauri(cmd, args = {}) {
    if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
      return window.__TAURI__.core.invoke(cmd, args);
    }
    return Promise.resolve();
  }

  let bus = null;
  try { bus = new BroadcastChannel('clockly'); } catch (e) { /* unavailable */ }

  function emitTauri(event, payload) {
    if (window.__TAURI__ && window.__TAURI__.event && window.__TAURI__.event.emit) {
      return window.__TAURI__.event.emit(event, payload);
    }
    return Promise.resolve();
  }

  // Sidebar navigation
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      navItems.forEach(n => n.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      item.classList.add('active');
      const targetPane = document.getElementById(`tab-${tabId}`);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // UI Element References
  const chkAutostart = document.getElementById('chkAutostart');
  const chkClickThrough = document.getElementById('chkClickThrough');
  const appDataPathText = document.getElementById('appDataPathText');

  const chkShowClock = document.getElementById('chkShowClock');
  const btnStyleDigital = document.getElementById('btnStyleDigital');
  const btnStyleAnalog = document.getElementById('btnStyleAnalog');
  const btnFmt12 = document.getElementById('btnFmt12');
  const btnFmt24 = document.getElementById('btnFmt24');
  const chkShowAmPm = document.getElementById('chkShowAmPm');
  const chkShowSeconds = document.getElementById('chkShowSeconds');
  const rngClockScale = document.getElementById('rngClockScale');
  const valClockScale = document.getElementById('valClockScale');

  const chkShowDate = document.getElementById('chkShowDate');
  const chkShowWeekday = document.getElementById('chkShowWeekday');
  const selDateFormat = document.getElementById('selDateFormat');

  const chkShowDual = document.getElementById('chkShowDual');
  const txtDualLabel = document.getElementById('txtDualLabel');
  const selDualTimezone = document.getElementById('selDualTimezone');
  const chkDualHour12 = document.getElementById('chkDualHour12');

  const chkShowStopwatch = document.getElementById('chkShowStopwatch');
  const chkStopwatchGlass = document.getElementById('chkStopwatchGlass');

  const chkShowPomodoro = document.getElementById('chkShowPomodoro');
  const numPomFocus = document.getElementById('numPomFocus');
  const numPomShort = document.getElementById('numPomShort');
  const numPomLong = document.getElementById('numPomLong');
  const chkPomAutoCycle = document.getElementById('chkPomAutoCycle');
  const chkPomSound = document.getElementById('chkPomSound');
  const chkPomNotification = document.getElementById('chkPomNotification');

  const chkShowCountdown = document.getElementById('chkShowCountdown');
  const txtCdLabel = document.getElementById('txtCdLabel');
  const btnCdModeDur = document.getElementById('btnCdModeDur');
  const btnCdModeTarget = document.getElementById('btnCdModeTarget');
  const rowCdDuration = document.getElementById('rowCdDuration');
  const rowCdTarget = document.getElementById('rowCdTarget');
  const rowCdActions = document.getElementById('rowCdActions');
  const numCdHours = document.getElementById('numCdHours');
  const numCdMinutes = document.getElementById('numCdMinutes');
  const numCdSeconds = document.getElementById('numCdSeconds');
  const inpCdTarget = document.getElementById('inpCdTarget');
  const cdTotalText = document.getElementById('cdTotalText');
  const chkCdSound = document.getElementById('chkCdSound');
  const chkCdNotify = document.getElementById('chkCdNotify');
  const btnCdStart = document.getElementById('btnCdStart');
  const btnCdPause = document.getElementById('btnCdPause');
  const btnCdReset = document.getElementById('btnCdReset');
  const btnCdHero = document.getElementById('btnCdHero');

  const selFontFamily = document.getElementById('selFontFamily');
  const rowCustomFont = document.getElementById('rowCustomFont');
  const txtCustomFont = document.getElementById('txtCustomFont');
  const selFontWeight = document.getElementById('selFontWeight');
  const rngLetterSpacing = document.getElementById('rngLetterSpacing');
  const valLetterSpacing = document.getElementById('valLetterSpacing');

  const colTextColor = document.getElementById('colTextColor');
  const colTextColorHex = document.getElementById('colTextColorHex');
  const rngTextOpacity = document.getElementById('rngTextOpacity');
  const valTextOpacity = document.getElementById('valTextOpacity');
  const chkTextShadow = document.getElementById('chkTextShadow');
  const rngCardBlur = document.getElementById('rngCardBlur');
  const valCardBlur = document.getElementById('valCardBlur');

  const selLayoutPreset = document.getElementById('selLayoutPreset');
  const rngGlobalScale = document.getElementById('rngGlobalScale');
  const valGlobalScale = document.getElementById('valGlobalScale');
  const btnResetPositions = document.getElementById('btnResetPositions');
  const btnLaunchEditMode = document.getElementById('btnLaunchEditMode');
  const btnEnterEditMode = document.getElementById('btnEnterEditMode');

  const btnExportSettings = document.getElementById('btnExportSettings');
  const btnImportSettings = document.getElementById('btnImportSettings');
  const fileImportInput = document.getElementById('fileImportInput');
  const btnResetSettings = document.getElementById('btnResetSettings');

  const themeCards = document.querySelectorAll('.theme-card');

  // Sync state to UI controls
  function populateUI() {
    chkShowClock.checked = !!settings.showClock;

    btnStyleDigital.classList.toggle('active', settings.clockStyle === 'digital');
    btnStyleAnalog.classList.toggle('active', settings.clockStyle === 'analog');

    btnFmt12.classList.toggle('active', !!settings.hour12);
    btnFmt24.classList.toggle('active', !settings.hour12);

    chkShowAmPm.checked = !!settings.showAmPm;
    chkShowSeconds.checked = !!settings.showSeconds;

    rngClockScale.value = settings.clockScale || 1.0;
    valClockScale.textContent = `${Number(rngClockScale.value).toFixed(2)}x`;

    chkShowDate.checked = !!settings.showDate;
    chkShowWeekday.checked = !!settings.showWeekday;
    selDateFormat.value = settings.dateFormat || 'DD MMMM YYYY';

    chkShowDual.checked = !!settings.showDual;
    txtDualLabel.value = settings.dualLabel || 'LONDON';
    selDualTimezone.value = settings.dualTimezone || 'Europe/London';
    chkDualHour12.checked = !!settings.dualHour12;

    chkShowStopwatch.checked = !!settings.showStopwatch;
    chkStopwatchGlass.checked = !!settings.stopwatchGlass;

    chkShowPomodoro.checked = !!settings.showPomodoro;
    numPomFocus.value = settings.pomFocusDuration || 25;
    numPomShort.value = settings.pomShortBreak || 5;
    numPomLong.value = settings.pomLongBreak || 15;
    chkPomAutoCycle.checked = !!settings.pomAutoCycle;
    chkPomSound.checked = !!settings.pomSound;
    chkPomNotification.checked = !!settings.pomNotification;

    // Countdown
    chkShowCountdown.checked = !!settings.showCountdown;
    txtCdLabel.value = settings.cdLabel || '';
    const isTarget = settings.cdMode === 'target';
    btnCdModeDur.classList.toggle('active', !isTarget);
    btnCdModeTarget.classList.toggle('active', isTarget);
    rowCdDuration.style.display = isTarget ? 'none' : 'flex';
    rowCdActions.style.display = isTarget ? 'none' : 'flex';
    rowCdTarget.style.display = isTarget ? 'flex' : 'none';
    numCdHours.value = settings.cdHours || 0;
    numCdMinutes.value = settings.cdMinutes || 0;
    numCdSeconds.value = settings.cdSeconds || 0;
    inpCdTarget.value = settings.cdTarget || '';
    chkCdSound.checked = settings.cdSound !== false;
    chkCdNotify.checked = settings.cdNotify !== false;
    updateCdTotalText();

    selFontFamily.value = settings.fontFamily || 'Inter';
    rowCustomFont.style.display = (selFontFamily.value === 'Custom') ? 'flex' : 'none';
    txtCustomFont.value = settings.customFont || '';

    selFontWeight.value = settings.fontWeight || '400';
    rngLetterSpacing.value = settings.letterSpacing || 0;
    valLetterSpacing.textContent = `${rngLetterSpacing.value}px`;

    colTextColor.value = settings.textColor || '#ffffff';
    colTextColorHex.textContent = colTextColor.value;

    rngTextOpacity.value = settings.textOpacity || 100;
    valTextOpacity.textContent = `${rngTextOpacity.value}%`;

    chkTextShadow.checked = !!settings.textShadow;
    rngCardBlur.value = settings.cardBlur || 16;
    valCardBlur.textContent = `${rngCardBlur.value}px`;

    selLayoutPreset.value = settings.layoutPreset || 'center';
    rngGlobalScale.value = settings.globalScale || 1.0;
    valGlobalScale.textContent = `${Number(rngGlobalScale.value).toFixed(2)}x`;

    themeCards.forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-theme') === settings.theme);
    });
  }

  // Save & Broadcast changes
  function notifyChange() {
    emitTauri('settings-updated', settings);
    if (bus) bus.postMessage({ type: 'settings', payload: settings });
    invokeTauri('save_settings', { settingsJson: JSON.stringify(settings) });
  }

  // Bind All Events
  chkShowClock.addEventListener('change', () => {
    settings.showClock = chkShowClock.checked;
    notifyChange();
  });

  btnStyleDigital.addEventListener('click', () => {
    settings.clockStyle = 'digital';
    btnStyleDigital.classList.add('active');
    btnStyleAnalog.classList.remove('active');
    notifyChange();
  });

  btnStyleAnalog.addEventListener('click', () => {
    settings.clockStyle = 'analog';
    btnStyleAnalog.classList.add('active');
    btnStyleDigital.classList.remove('active');
    notifyChange();
  });

  btnFmt12.addEventListener('click', () => {
    settings.hour12 = true;
    btnFmt12.classList.add('active');
    btnFmt24.classList.remove('active');
    notifyChange();
  });

  btnFmt24.addEventListener('click', () => {
    settings.hour12 = false;
    btnFmt24.classList.add('active');
    btnFmt12.classList.remove('active');
    notifyChange();
  });

  chkShowAmPm.addEventListener('change', () => {
    settings.showAmPm = chkShowAmPm.checked;
    notifyChange();
  });

  chkShowSeconds.addEventListener('change', () => {
    settings.showSeconds = chkShowSeconds.checked;
    notifyChange();
  });

  rngClockScale.addEventListener('input', () => {
    settings.clockScale = parseFloat(rngClockScale.value);
    valClockScale.textContent = `${settings.clockScale.toFixed(2)}x`;
    notifyChange();
  });

  chkShowDate.addEventListener('change', () => {
    settings.showDate = chkShowDate.checked;
    notifyChange();
  });

  chkShowWeekday.addEventListener('change', () => {
    settings.showWeekday = chkShowWeekday.checked;
    notifyChange();
  });

  selDateFormat.addEventListener('change', () => {
    settings.dateFormat = selDateFormat.value;
    notifyChange();
  });

  chkShowDual.addEventListener('change', () => {
    settings.showDual = chkShowDual.checked;
    notifyChange();
  });

  txtDualLabel.addEventListener('input', () => {
    settings.dualLabel = txtDualLabel.value.trim() || 'LONDON';
    notifyChange();
  });

  selDualTimezone.addEventListener('change', () => {
    settings.dualTimezone = selDualTimezone.value;
    notifyChange();
  });

  chkDualHour12.addEventListener('change', () => {
    settings.dualHour12 = chkDualHour12.checked;
    notifyChange();
  });

  chkShowStopwatch.addEventListener('change', () => {
    settings.showStopwatch = chkShowStopwatch.checked;
    notifyChange();
  });

  chkStopwatchGlass.addEventListener('change', () => {
    settings.stopwatchGlass = chkStopwatchGlass.checked;
    notifyChange();
  });

  chkShowPomodoro.addEventListener('change', () => {
    settings.showPomodoro = chkShowPomodoro.checked;
    notifyChange();
  });

  numPomFocus.addEventListener('change', () => {
    settings.pomFocusDuration = parseInt(numPomFocus.value) || 25;
    notifyChange();
  });

  numPomShort.addEventListener('change', () => {
    settings.pomShortBreak = parseInt(numPomShort.value) || 5;
    notifyChange();
  });

  numPomLong.addEventListener('change', () => {
    settings.pomLongBreak = parseInt(numPomLong.value) || 15;
    notifyChange();
  });

  chkPomAutoCycle.addEventListener('change', () => {
    settings.pomAutoCycle = chkPomAutoCycle.checked;
    notifyChange();
  });

  chkPomSound.addEventListener('change', () => {
    settings.pomSound = chkPomSound.checked;
    notifyChange();
  });

  chkPomNotification.addEventListener('change', () => {
    settings.pomNotification = chkPomNotification.checked;
    notifyChange();
  });

  // ---- Countdown ----
  const pad2 = n => String(n).padStart(2, '0');
  function updateCdTotalText() {
    const total = (settings.cdHours || 0) * 3600 + (settings.cdMinutes || 0) * 60 + (settings.cdSeconds || 0);
    cdTotalText.textContent = `${pad2(Math.floor(total / 3600))}:${pad2(Math.floor((total % 3600) / 60))}:${pad2(total % 60)}`;
  }

  function clampInt(v, min, max) {
    const n = parseInt(v, 10);
    return isNaN(n) ? min : Math.max(min, Math.min(max, n));
  }

  function readCdDuration() {
    settings.cdHours = clampInt(numCdHours.value, 0, 999);
    settings.cdMinutes = clampInt(numCdMinutes.value, 0, 59);
    settings.cdSeconds = clampInt(numCdSeconds.value, 0, 59);
    updateCdTotalText();
    notifyChange();
  }

  function sendCdCommand(cmd) {
    emitTauri('cd-command', cmd);
    if (bus) bus.postMessage({ type: 'cd-command', payload: cmd });
  }

  chkShowCountdown.addEventListener('change', () => {
    settings.showCountdown = chkShowCountdown.checked;
    notifyChange();
  });

  txtCdLabel.addEventListener('input', () => {
    settings.cdLabel = txtCdLabel.value.trim() || 'Countdown';
    notifyChange();
  });

  btnCdModeDur.addEventListener('click', () => {
    settings.cdMode = 'duration';
    populateUI();
    notifyChange();
  });

  btnCdModeTarget.addEventListener('click', () => {
    settings.cdMode = 'target';
    populateUI();
    notifyChange();
  });

  [numCdHours, numCdMinutes, numCdSeconds].forEach(el => el.addEventListener('change', () => {
    readCdDuration();
    populateUI();
  }));

  document.querySelectorAll('.cd-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const total = parseInt(chip.getAttribute('data-sec'), 10) || 0;
      settings.cdHours = Math.floor(total / 3600);
      settings.cdMinutes = Math.floor((total % 3600) / 60);
      settings.cdSeconds = total % 60;
      populateUI();
      notifyChange();
    });
  });

  inpCdTarget.addEventListener('change', () => {
    settings.cdTarget = inpCdTarget.value;
    settings.cdTargetSetAt = Date.now();
    notifyChange();
  });

  chkCdSound.addEventListener('change', () => {
    settings.cdSound = chkCdSound.checked;
    notifyChange();
  });

  chkCdNotify.addEventListener('change', () => {
    settings.cdNotify = chkCdNotify.checked;
    notifyChange();
  });

  btnCdStart.addEventListener('click', () => {
    if (!settings.showCountdown) {
      settings.showCountdown = true;
      chkShowCountdown.checked = true;
      notifyChange();
    }
    sendCdCommand('start');
  });
  btnCdPause.addEventListener('click', () => sendCdCommand('pause'));
  btnCdReset.addEventListener('click', () => sendCdCommand('reset'));

  // Interactive hourglass: flip + drain demo
  const heroSvg = btnCdHero.querySelector('.hg');
  let heroAnim = null;
  btnCdHero.addEventListener('click', () => {
    heroSvg.classList.remove('flipping');
    void heroSvg.getBoundingClientRect();
    heroSvg.classList.add('flipping');
    heroSvg.classList.add('running');
    cancelAnimationFrame(heroAnim);
    const t0 = performance.now();
    const dur = 3000;
    const step = now => {
      const k = Math.min(1, (now - t0 - 500) / dur);
      heroSvg.style.setProperty('--p', k < 0 ? 1 : 1 - k);
      if (now - t0 < dur + 500) {
        heroAnim = requestAnimationFrame(step);
      } else {
        heroSvg.classList.remove('running', 'flipping');
      }
    };
    heroSvg.style.setProperty('--p', 1);
    heroAnim = requestAnimationFrame(step);
  });

  selFontFamily.addEventListener('change', () => {
    settings.fontFamily = selFontFamily.value;
    rowCustomFont.style.display = (settings.fontFamily === 'Custom') ? 'flex' : 'none';
    notifyChange();
  });

  txtCustomFont.addEventListener('input', () => {
    settings.customFont = txtCustomFont.value.trim();
    notifyChange();
  });

  selFontWeight.addEventListener('change', () => {
    settings.fontWeight = selFontWeight.value;
    notifyChange();
  });

  rngLetterSpacing.addEventListener('input', () => {
    settings.letterSpacing = rngLetterSpacing.value;
    valLetterSpacing.textContent = `${rngLetterSpacing.value}px`;
    notifyChange();
  });

  colTextColor.addEventListener('input', () => {
    settings.textColor = colTextColor.value;
    colTextColorHex.textContent = colTextColor.value;
    notifyChange();
  });

  rngTextOpacity.addEventListener('input', () => {
    settings.textOpacity = parseInt(rngTextOpacity.value);
    valTextOpacity.textContent = `${settings.textOpacity}%`;
    notifyChange();
  });

  chkTextShadow.addEventListener('change', () => {
    settings.textShadow = chkTextShadow.checked;
    notifyChange();
  });

  rngCardBlur.addEventListener('input', () => {
    settings.cardBlur = parseInt(rngCardBlur.value);
    valCardBlur.textContent = `${settings.cardBlur}px`;
    notifyChange();
  });

  selLayoutPreset.addEventListener('change', () => {
    settings.layoutPreset = selLayoutPreset.value;
    if (settings.layoutPreset !== 'custom') {
      settings.positions = {};
    }
    notifyChange();
  });

  rngGlobalScale.addEventListener('input', () => {
    settings.globalScale = parseFloat(rngGlobalScale.value);
    valGlobalScale.textContent = `${settings.globalScale.toFixed(2)}x`;
    notifyChange();
  });

  themeCards.forEach(c => {
    c.addEventListener('click', () => {
      themeCards.forEach(tc => tc.classList.remove('active'));
      c.classList.add('active');
      settings.theme = c.getAttribute('data-theme');
      notifyChange();
    });
  });

  btnResetPositions.addEventListener('click', () => {
    settings.positions = {};
    settings.layoutPreset = 'center';
    selLayoutPreset.value = 'center';
    notifyChange();
  });

  // Autostart Checkbox
  chkAutostart.addEventListener('change', () => {
    invokeTauri('set_autostart', { enable: chkAutostart.checked });
  });

  // Click-through Checkbox
  chkClickThrough.addEventListener('change', () => {
    invokeTauri('set_interactive', { interactive: !chkClickThrough.checked });
  });

  // Edit Mode Launch
  function triggerEditMode() {
    invokeTauri('set_interactive', { interactive: true });
    emitTauri('set-edit-mode', true);
    invokeTauri('close_settings_window');
  }
  btnLaunchEditMode.addEventListener('click', triggerEditMode);
  btnEnterEditMode.addEventListener('click', triggerEditMode);

  // Export JSON
  btnExportSettings.addEventListener('click', () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(settings, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', 'clockly-settings.json');
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  // Import JSON
  btnImportSettings.addEventListener('click', () => {
    fileImportInput.click();
  });

  fileImportInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const imported = JSON.parse(ev.target.result);
        settings = Object.assign({}, defaultSettings, imported);
        populateUI();
        notifyChange();
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
    fileImportInput.value = '';
  });

  // Reset to Defaults
  btnResetSettings.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      settings = Object.assign({}, defaultSettings);
      populateUI();
      notifyChange();
    }
  });

  // Load from Backend on Startup
  function init() {
    invokeTauri('get_autostart').then(enabled => {
      chkAutostart.checked = !!enabled;
    }).catch(() => {});

    invokeTauri('get_appdata_path').then(path => {
      if (path) appDataPathText.textContent = `${path}\\settings.json`;
    }).catch(() => {});

    invokeTauri('load_settings').then(jsonStr => {
      if (jsonStr && jsonStr !== '{}') {
        try {
          const loaded = JSON.parse(jsonStr);
          settings = Object.assign({}, defaultSettings, loaded);
        } catch (e) {
          console.error(e);
        }
      }
      populateUI();
    }).catch(() => {
      populateUI();
    });
  }

  // About tab: copy helpers
  function copyText(text, btn) {
    const done = () => {
      const old = btn.textContent;
      btn.textContent = 'Copied ✓';
      setTimeout(() => { btn.textContent = old; }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => {});
    }
  }
  const btnCopyRepo = document.getElementById('btnCopyRepo');
  const btnCopyDataPath = document.getElementById('btnCopyDataPath');
  btnCopyRepo.addEventListener('click', () => copyText(document.getElementById('aboutRepoUrl').textContent, btnCopyRepo));
  btnCopyDataPath.addEventListener('click', () => copyText(appDataPathText.textContent, btnCopyDataPath));

  init();

  // Pick up changes made elsewhere (e.g. dragged positions) so we never overwrite them with stale data
  window.addEventListener('focus', () => {
    invokeTauri('load_settings').then(jsonStr => {
      if (jsonStr && jsonStr !== '{}') {
        try {
          settings = Object.assign({}, defaultSettings, JSON.parse(jsonStr));
          populateUI();
        } catch (e) { /* ignore */ }
      }
    }).catch(() => {});
  });

})();
