(function () {
  // ===== SELECTORS =====
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const timeDisplay = $("#time-display");
  const toggleBtn = $("#toggle-btn");
  const circle = document.querySelector(".progress-ring");
  const tabButtons = $$(".tab-button");
  const modalOverlay = $("#modalOverlay");
  const toggleSettings = $("#toggleSettings");
  const closeSettings = $("#closeSettings");
  const applySettings = $("#applySettings");
  const fontOptions = $$(".font-option");
  const colorThemes = $$(".theme-option");

  // Inputs
  const pomodoroInput = $("#pomodoroTime");
  const shortBreakInput = $("#shortBreakTime");
  const longBreakInput = $("#longBreakTime");

  // ===== STATE =====
  let mode = "pomodoro";
  let durations = {
    pomodoro: Number(pomodoroInput.value) * 60,
    shortBreak: Number(shortBreakInput.value) * 60,
    longBreak: Number(longBreakInput.value) * 60,
  };
  let remaining = durations[mode];
  let timer = null;
  let isRunning = false;

  // ====== HELPERS ======
  function loadSettings() {
    try {
      return JSON.parse(localStorage.getItem("pomodoroSettings") || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveSetting(key, value) {
    try {
      const saved = loadSettings();
      saved[key] = value;
      localStorage.setItem("pomodoroSettings", JSON.stringify(saved));
    } catch (e) {}
  }

  function setupToggle(el, stateVar, key, labels = { on: "On", off: "Off" }) {
    el.setAttribute("aria-pressed", String(stateVar.value));
    el.textContent = stateVar.value ? labels.on : labels.off;

    el.addEventListener("click", () => {
      stateVar.value = !stateVar.value;
      el.setAttribute("aria-pressed", String(stateVar.value));
      el.textContent = stateVar.value ? labels.on : labels.off;
      saveSetting(key, stateVar.value);
    });
  }

  function setupOptionSelector(options, callback) {
    options.forEach((option) => {
      option.addEventListener("click", () => {
        options.forEach((o) => o.classList.remove("active"));
        option.classList.add("active");
        options.forEach((o) =>
          o.setAttribute("aria-selected", o === option ? "true" : "false")
        );
        callback(option);
      });
    });
  }

  function setupInputSpinner(block) {
    const input = block.querySelector(".setting-input");
    const up = block.querySelector(".up");
    const down = block.querySelector(".down");
    const step = 1;

    const changeValue = (delta) => {
      const min = parseInt(input.min) || 1;
      const max = parseInt(input.max) || 60;
      let val = parseInt(input.value) || 0;
      val = Math.min(max, Math.max(min, val + delta));
      input.value = val;
    };

    up.addEventListener("click", () => changeValue(step));
    down.addEventListener("click", () => changeValue(-step));

    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        changeValue(step);
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        changeValue(-step);
      }
    });
  }

  // SVG ring setup
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = circumference;

  // Accessibility init
  function refreshTabAria() {
    tabButtons.forEach((btn) =>
      btn.setAttribute("aria-pressed", String(btn.classList.contains("active")))
    );
  }
  refreshTabAria();

  // ====== TIMER LOGIC ======
  function updateDisplay() {
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    timeDisplay.textContent = `${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;

    const percent = ((durations[mode] - remaining) / durations[mode]) * 100;
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
  }

  function tick() {
    if (remaining > 0) {
      remaining -= 1;
      updateDisplay();
    } else {
      clearInterval(timer);
      timer = null;
      isRunning = false;
      toggleBtn.setAttribute("aria-pressed", "false");

      // playSound(mode);

      if (autoCycleEnabled) {
        setTimeout(() => {
          if (mode === "pomodoro") {
            pomodoroCount++;
            mode = pomodoroCount % 4 === 0 ? "longBreak" : "shortBreak";
          } else {
            mode = "pomodoro";
          }
          tabButtons.forEach((b) => {
            b.classList.toggle("active", b.dataset.mode === mode);
          });
          refreshTabAria();
          resetTimer();
          playSound(mode);
          startTimer();
        }, 1000);
      } else {
        toggleBtn.textContent = "RESTART";
        toggleBtn.focus();
      }
    }
  }

  function startTimer() {
    if (!isRunning) {
      timer = setInterval(tick, 1000);
      isRunning = true;
      toggleBtn.textContent = "PAUSE";
      toggleBtn.setAttribute("aria-pressed", "true");
    }
  }

  function pauseTimer() {
    clearInterval(timer);
    timer = null;
    isRunning = false;
    toggleBtn.textContent = "START";
    toggleBtn.setAttribute("aria-pressed", "false");
  }

  function resetTimer() {
    clearInterval(timer);
    remaining = durations[mode];
    updateDisplay();
    circle.style.strokeDashoffset = circumference;
    toggleBtn.textContent = "START";
    toggleBtn.setAttribute("aria-pressed", "false");
    isRunning = false;
  }

  toggleBtn.addEventListener("click", () => {
    if (!isRunning && remaining > 0) startTimer();
    else if (isRunning) pauseTimer();
    else resetTimer();
  });

  toggleBtn.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggleBtn.click();
    }
  });

  document.querySelector(".timer-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-button");
    if (!btn) return;
    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    mode = btn.dataset.mode;
    refreshTabAria();
    resetTimer();
  });

  document.querySelector(".timer-tabs").addEventListener("keydown", (e) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const current = document.activeElement.closest(".tab-button");
    const list = tabButtons;
    let idx = list.indexOf(current);
    if (e.key === "ArrowLeft") idx = (idx - 1 + list.length) % list.length;
    if (e.key === "ArrowRight") idx = (idx + 1) % list.length;
    if (e.key === "Home") idx = 0;
    if (e.key === "End") idx = list.length - 1;
    list[idx].focus();
    list[idx].click();
  });

  // ====== SETTINGS MODAL ======
  let lastFocused = null;
  function trapFocus(modal) {
    const focusable = Array.from(
      modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute("disabled"));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    function onKey(e) {
      if (e.key === "Tab") {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
      if (e.key === "Escape") closeSettings.click();
    }
    modal.addEventListener("keydown", onKey);
    modal._onKey = onKey;
    first && first.focus();
  }

  function releaseFocus(modal) {
    if (!modal) return;
    modal.removeEventListener("keydown", modal._onKey);
    delete modal._onKey;
    lastFocused && lastFocused.focus();
  }

  toggleSettings.addEventListener("click", () => {
    lastFocused = document.activeElement;
    modalOverlay.classList.remove("hidden");
    modalOverlay.setAttribute("aria-hidden", "false");
    trapFocus(modalOverlay);
    document.querySelector("main").setAttribute("aria-hidden", "true");
  });

  closeSettings.addEventListener("click", () => {
    modalOverlay.classList.add("hidden");
    modalOverlay.setAttribute("aria-hidden", "true");
    document.querySelector("main").removeAttribute("aria-hidden");
    releaseFocus(modalOverlay);
  });

  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeSettings.click();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalOverlay.classList.contains("hidden"))
      closeSettings.click();
  });

  applySettings.addEventListener("click", () => {
    const p = Math.max(1, Math.min(60, Number(pomodoroInput.value) || 25));
    const s = Math.max(1, Math.min(30, Number(shortBreakInput.value) || 5));
    const l = Math.max(1, Math.min(60, Number(longBreakInput.value) || 15));

    durations = { pomodoro: p * 60, shortBreak: s * 60, longBreak: l * 60 };
    remaining = durations[mode];
    updateDisplay();

    saveSetting("durations", durations);

    modalOverlay.classList.add("hidden");
    modalOverlay.setAttribute("aria-hidden", "true");
    document.querySelector("main").removeAttribute("aria-hidden");
    releaseFocus(modalOverlay);
  });

  // ====== AUTO CYCLE & SOUND ======
  const autoCycleToggle = document.getElementById("autoCycleToggle");
  let autoCycleEnabled = loadSettings().autoCycleEnabled ?? false;
  let pomodoroCount = 0;

  const soundToggle = document.getElementById("soundToggle");
  let soundEnabled = loadSettings().soundEnabled ?? true;

  setupToggle(autoCycleToggle, { value: autoCycleEnabled }, "autoCycleEnabled");
  setupToggle(soundToggle, { value: soundEnabled }, "soundEnabled");

  // ====== TIMER INPUTS ======
  document.querySelectorAll(".setting-timer").forEach(setupInputSpinner);

  // ====== FONT & COLOR ======
  const fontMap = { "Kumbh Sans": "1", "Roboto Slab": "2", "Space Mono": "3" };

  function applyFontToUI(fontName) {
    const suffix = fontMap[fontName] || "1";
    const swap = (el) => {
      if (!el) return;
      el.className = el.className.replace(/tp\d-font\d/g, (match) =>
        match.replace(/\d$/, suffix)
      );
    };
    swap(timeDisplay);
    swap(toggleBtn);
    tabButtons.forEach(swap);
  }

  const root = document.documentElement;
  const progressRing = document.querySelector(".progress-ring");

  function applyTheme(color) {
    root.style.setProperty("--accent-color", color);
    if (progressRing) progressRing.style.stroke = color;
    let styleTag = document.getElementById("dynamic-theme");
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = "dynamic-theme";
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = `#toggle-btn:hover { color: ${color}; }`;
  }

  setupOptionSelector(fontOptions, (option) => {
    applyFontToUI(option.dataset.font);
    saveSetting("selectedFont", option.dataset.font);
  });

  setupOptionSelector(colorThemes, (option) => {
    const color = option.dataset.color;
    applyTheme(color);
    saveSetting("selectedColor", color);
  });

  // ====== RESTORE SETTINGS ======
  try {
    const saved = loadSettings();
    if (saved.durations) {
      pomodoroInput.value =
        saved.durations.pomodoro / 60 || pomodoroInput.value;
      shortBreakInput.value =
        saved.durations.shortBreak / 60 || shortBreakInput.value;
      longBreakInput.value =
        saved.durations.longBreak / 60 || longBreakInput.value;
      durations = saved.durations;
      remaining = durations[mode];
      updateDisplay();
    }
    if (saved.selectedFont) {
      fontOptions.forEach((o) => {
        o.classList.toggle("active", o.dataset.font === saved.selectedFont);
        o.setAttribute(
          "aria-selected",
          o.dataset.font === saved.selectedFont ? "true" : "false"
        );
      });
      applyFontToUI(saved.selectedFont);
    }
    if (saved.selectedColor) {
      colorThemes.forEach((c) => {
        c.classList.toggle("active", c.dataset.color === saved.selectedColor);
        c.setAttribute(
          "aria-selected",
          c.dataset.color === saved.selectedColor ? "true" : "false"
        );
      });
      applyTheme(saved.selectedColor);
    }
  } catch (e) {}

   // ====== SPEECH / SOUND FEEDBACK (multilingual) ======
  // Audio fallback (if speech unsupported)
  const sounds = {
    pomodoro: null,
    shortBreak: null,
    longBreak: null,
  };
  /**
   * Lazily loads the corresponding sound file for a given mode.
   * Avoids preloading all files at startup to improve performance.
   */
  function getSound(mode) {
    if (!sounds[mode]) sounds[mode] = new Audio(`./assets/${mode}.mp3`);
    return sounds[mode];
  }

  // Detect browser/system language
  function detectLanguage() {
    return (
      navigator.language ||
      navigator.userLanguage ||
      document.documentElement.lang ||
      "en-US"
    );
  }

  // Phrase dictionary (extendable, plural-aware)
  const ttsPhrases = {
    en: {
      focus: "It's time to focus.",
      short: (m) =>
        `It's time to take a ${m}-minute${m === 1 ? "" : "s"} break.`,
      long: (m) =>
        `It's time to take a ${m}-minute${m === 1 ? "" : "s"} break.`,
    },
    fr: {
      focus: "Il est temps de se concentrer.",
      short: (m) =>
        `Il est temps de faire une pause de ${m} minute${m > 1 ? "s" : ""}.`,
      long: (m) =>
        `Il est temps de faire une longue pause de ${m} minute${
          m > 1 ? "s" : ""
        }.`,
    },
    es: {
      focus: "Es hora de concentrarse.",
      short: (m) =>
        `Es hora de tomar un descanso de ${m} minuto${m > 1 ? "s" : ""}.`,
      long: (m) =>
        `Es hora de tomar un descanso largo de ${m} minuto${m > 1 ? "s" : ""}.`,
    },
    de: {
      focus: "Es ist Zeit, sich zu konzentrieren.",
      short: (m) => `Es ist Zeit für eine ${m}-minütige Pause.`,
      long: (m) =>
        `Es ist Zeit für eine lange Pause von ${m} Minute${m > 1 ? "n" : ""}.`,
    },
    it: {
      focus: "È ora di concentrarsi.",
      short: (m) =>
        `È ora di fare una pausa di ${m} minuto${m > 1 ? "i" : ""}.`,
      long: (m) =>
        `È ora di fare una lunga pausa di ${m} minuto${m > 1 ? "i" : ""}.`,
    },
    ar: {
      focus: "حان وقت التركيز.",
      short: (m) =>
        `حان وقت أخذ استراحة لمدة ${
          m === 1
            ? "دقيقة"
            : m === 2
            ? "دقيقتين"
            : m >= 3 && m <= 10
            ? `${m} دقائق`
            : `${m} دقيقة`
        }.`,
      long: (m) =>
        `حان وقت أخذ استراحة طويلة لمدة ${
          m === 1
            ? "دقيقة"
            : m === 2
            ? "دقيقتين"
            : m >= 3 && m <= 10
            ? `${m} دقائق`
            : `${m} دقيقة`
        }.`,
    },
  };

  // Get the correct phrase based on language and mode
  function getPhrase(langCode, mode, minutes) {
    const base = langCode.split("-")[0]; // e.g., "fr-FR" → "fr"
    const phrases = ttsPhrases[base] || ttsPhrases["en"];
    if (mode === "pomodoro") return phrases.focus;
    if (mode === "shortBreak") return phrases.short(minutes);
    if (mode === "longBreak") return phrases.long(minutes);
    return "Timer complete.";
  }

  // Speak a message using SpeechSynthesis
  function speakMessage(message, lang) {
    if (!("speechSynthesis" in window)) return false;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = lang;
    utterance.rate = 1;
    utterance.pitch = 1;

    // Get all available voices
    let voices = speechSynthesis.getVoices();

    // Try to find a voice that matches exactly
    let voice =
      voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase()) ||
      // fallback: match language prefix (e.g., "ar" for Arabic)
      voices.find((v) => v.lang.toLowerCase().startsWith(lang.split("-")[0])) ||
      // fallback: English
      voices.find((v) => v.lang.startsWith("en")) ||
      voices[0];

    if (voice) utterance.voice = voice;

    try {
      speechSynthesis.speak(utterance);
      return true;
    } catch {
      return false;
    }
  }

  // Play sound or TTS depending on availability
  function playSound(mode) {
    if (!soundEnabled) return;

    const lang = detectLanguage();

    // Compute minutes for breaks
    const minutes =
      mode === "shortBreak"
        ? Math.round(durations.shortBreak / 60)
        : mode === "longBreak"
        ? Math.round(durations.longBreak / 60)
        : 0;

    // Get the appropriate phrase
    const message = getPhrase(lang, mode, minutes);

    // Try TTS first
    const spoken = speakMessage(message, lang);

    // Fallback to audio file if TTS unavailable
    if (!spoken) {
      const audio = getSound(mode);
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    }
  }
  
  // Initial display update
  updateDisplay();
})();

