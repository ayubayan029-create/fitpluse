const STORAGE_KEY = "fitPulseTrackerData";
const CONFETTI_COLORS = ["#38e6b0", "#68a5ff", "#f4bd4f", "#a66cff", "#ff6b7a"];

const BADGES = [
  { id: "streak3", name: "3-Day Ignition", desc: "Build momentum with 3 consecutive days.", icon: "🔥", check: (streak) => streak >= 3 },
  { id: "streak7", name: "Week Warrior", desc: "Complete 7 days without missing.", icon: "⚡", check: (streak) => streak >= 7 },
  { id: "streak21", name: "Habit Formed", desc: "Hit 21 consecutive days of consistency.", icon: "🧠", check: (streak) => streak >= 21 },
  { id: "streak30", name: "30-Day Master", desc: "Achieve a full 30-day streak.", icon: "🏆", check: (streak) => streak >= 30 },
  { id: "total50", name: "Half Century", desc: "Complete 50 workouts total.", icon: "🎯", check: (_, total) => total >= 50 },
  { id: "total100", name: "Centurion", desc: "Reach 100 completed workout sessions.", icon: "👑", check: (_, total) => total >= 100 }
];

const BADGE_TARGETS = {
  streak3: { metric: "streak", target: 3 },
  streak7: { metric: "streak", target: 7 },
  streak21: { metric: "streak", target: 21 },
  streak30: { metric: "streak", target: 30 },
  total50: { metric: "total", target: 50 },
  total100: { metric: "total", target: 100 }
};

const defaultState = {
  theme: "dark",
  animations: true,
  activeRoutineId: "r1",
  routines: [
    {
      id: "r1",
      name: "Exercise Routine",
      goal: 30,
      completed: [],
      unlockedBadges: []
    }
  ],
  health: {
    height: "",
    weight: "",
    steps: "",
    sleep: ""
  }
};

let appState = loadAppState();
let displayedDate = new Date();
let recentlyUnlockedBadgeIds = new Set();

// Elements
const themeToggleEl = document.getElementById("themeToggle");
const themeIconEl = document.getElementById("themeIcon");
const routineTabsEl = document.getElementById("routineTabs");
const addRoutineBtnEl = document.getElementById("addRoutineBtn");
const currentStreakEl = document.getElementById("currentStreak");
const longestStreakEl = document.getElementById("longestStreak");
const totalDaysEl = document.getElementById("totalDays");
const completionRateEl = document.getElementById("completionRate");
const monthTitleEl = document.getElementById("monthTitle");
const calendarEl = document.getElementById("calendar");
const todayPillEl = document.getElementById("todayPill");
const todayStatusEl = document.getElementById("todayStatus");
const todayMessageEl = document.getElementById("todayMessage");
const attendanceBtnEl = document.getElementById("attendanceBtn");
const progressTextEl = document.getElementById("progressText");
const progressPercentEl = document.getElementById("progressPercent");
const progressBarEl = document.getElementById("progressBar");
const goalMessageEl = document.getElementById("goalMessage");
const routineNameEl = document.getElementById("routineName");
const goalSelectEl = document.getElementById("goalSelect");
const deleteRoutineBtnEl = document.getElementById("deleteRoutineBtn");
const historyEl = document.getElementById("history");
const toastEl = document.getElementById("toast");
const chartContainerEl = document.getElementById("chartContainer");
const badgesGridEl = document.getElementById("badgesGrid");
const badgeCountEl = document.getElementById("badgeCount");

// Celebration Elements
const goalCelebrationEl = document.getElementById("goalCelebration");
const celebrationStreakEl = document.getElementById("celebrationStreak");
const confettiContainerEl = document.getElementById("confettiContainer");
const closeCelebrationEl = document.getElementById("closeCelebration");

// Phone app elements
const appEl = document.querySelector(".app");
const navItemEls = document.querySelectorAll(".nav-item");
const fabBtnEl = document.getElementById("fabBtn");
const themeColorMetaEl = document.querySelector('meta[name="theme-color"]');

const sheetEl = document.getElementById("sheet");
const sheetTitleEl = document.getElementById("sheetTitle");
const sheetMessageEl = document.getElementById("sheetMessage");
const sheetInputEl = document.getElementById("sheetInput");
const sheetConfirmEl = document.getElementById("sheetConfirm");
const sheetCancelEl = document.getElementById("sheetCancel");

const installHeaderBtnEl = document.getElementById("installHeaderBtn");
const installBannerEl = document.getElementById("installBanner");
const installMoreBtnEl = document.getElementById("installMoreBtn");
const installedNoteEl = document.getElementById("installedNote");
const installDismissEl = document.getElementById("installDismiss");
const animToggleEl = document.getElementById("animToggle");
const sheetActionsEl = document.getElementById("sheetActions");
const dayCompleteEl = document.getElementById("dayComplete");
const dayCompleteFlameEl = document.getElementById("dayCompleteFlame");
const dayCompleteCountEl = document.getElementById("dayCompleteCount");
const dayCompleteLabelEl = document.getElementById("dayCompleteLabel");

const heightInputEl = document.getElementById("heightInput");
const weightInputEl = document.getElementById("weightInput");
const stepsInputEl = document.getElementById("stepsInput");
const sleepInputEl = document.getElementById("sleepInput");

// Makes sure saved / imported data always has every field the app needs
function normalizeState(parsed) {
  const routines = Array.isArray(parsed.routines) && parsed.routines.length
    ? parsed.routines.map((r, i) => ({
        ...r,
        id: r.id || `r_${Date.now()}_${i}`,
        name: r.name || "Exercise Routine",
        goal: Number(r.goal) || 30,
        completed: Array.isArray(r.completed) ? r.completed.filter(d => typeof d === "string" && d <= getLocalDateString()) : [],
        unlockedBadges: Array.isArray(r.unlockedBadges) ? r.unlockedBadges : []
      }))
    : JSON.parse(JSON.stringify(defaultState.routines));

  return {
    theme: parsed.theme === "light" ? "light" : "dark",
    animations: parsed.animations !== false,
    activeRoutineId: routines.some(r => r.id === parsed.activeRoutineId) ? parsed.activeRoutineId : routines[0].id,
    routines,
    health: { height: "", weight: "", steps: "", sleep: "", ...(parsed.health || {}) }
  };
}

function loadAppState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return JSON.parse(JSON.stringify(defaultState));
    return normalizeState(JSON.parse(saved));
  } catch {
    return JSON.parse(JSON.stringify(defaultState));
  }
}

function saveAppState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch {
    // Storage can be blocked (private mode / full). The app keeps working for this visit.
  }
}

// Short vibration on phones that support it (ignored elsewhere)
function haptic(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {}
}

function getActiveRoutine() {
  return appState.routines.find(r => r.id === appState.activeRoutineId) || appState.routines[0];
}

function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Robust Streak Calculation: Counts consecutive completed days ending at today (or yesterday if today isn't completed yet)
function calculateCurrentStreak(routine) {
  if (!routine.completed || !routine.completed.length) return 0;
  
  const today = new Date();
  const todayStr = getLocalDateString(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  let startDate;
  if (routine.completed.includes(todayStr)) {
    startDate = new Date(today);
  } else if (routine.completed.includes(yesterdayStr)) {
    startDate = new Date(yesterday);
  } else {
    return 0;
  }

  let streak = 0;
  let curr = new Date(startDate);
  while (routine.completed.includes(getLocalDateString(curr))) {
    streak++;
    curr.setDate(curr.getDate() - 1);
  }
  return streak;
}

function calculateLongestStreak(routine) {
  if (!routine.completed || !routine.completed.length) return 0;
  const dates = [...new Set(routine.completed)].sort();
  let longest = 1;
  let current = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = parseDate(dates[i - 1]);
    const curr = parseDate(dates[i]);
    const diff = Math.round((curr - prev) / 86400000);

    if (diff === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

// Theme Application
function applyTheme() {
  if (appState.theme === "light") {
    document.body.classList.add("light-theme");
    themeIconEl.textContent = "☀️";
  } else {
    document.body.classList.remove("light-theme");
    themeIconEl.textContent = "🌙";
  }
  if (themeColorMetaEl) themeColorMetaEl.setAttribute("content", appState.theme === "light" ? "#f3f6f9" : "#07111a");
}

// Locks page scrolling while a sheet / celebration is open
function syncScrollLock() {
  const open = document.querySelector(".goal-celebration.show, .sheet-backdrop.show");
  document.body.classList.toggle("no-scroll", !!open);
}

// ---------- Phone screens (Today / Calendar / Progress / More) ----------
function setView(name, { scroll = true } = {}) {
  appEl.dataset.activeView = name;
  navItemEls.forEach(btn => {
    const on = btn.dataset.view === name;
    btn.classList.toggle("active", on);
    if (on) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });

  appEl.classList.remove("view-enter");
  void appEl.offsetWidth;
  appEl.classList.add("view-enter");
  clearTimeout(setView._timer);
  setView._timer = setTimeout(() => appEl.classList.remove("view-enter"), 400);

  if (scroll) window.scrollTo({ top: 0, behavior: "instant" });
}

navItemEls.forEach(btn => {
  btn.addEventListener("click", () => {
    haptic(8);
    setView(btn.dataset.view);
  });
});

// Hide the tab bar while the on-screen keyboard is up (text fields only, not switches)
const TEXT_FIELD_SELECTOR = 'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="file"]), select, textarea';
document.addEventListener("focusin", (e) => {
  if (e.target.matches(TEXT_FIELD_SELECTOR)) document.body.classList.add("typing");
});
document.addEventListener("focusout", () => {
  setTimeout(() => {
    if (!document.activeElement || !document.activeElement.matches(TEXT_FIELD_SELECTOR)) {
      document.body.classList.remove("typing");
    }
  }, 150);
});

// ---------- Bottom sheet (replaces prompt() / confirm()) ----------
let sheetResolver = null;
let sheetReturnFocusEl = null;

function openSheet({ title, message = "", input = null, confirmText = "Confirm", cancelText = "Cancel", danger = false }) {
  return new Promise(resolve => {
    if (sheetResolver) sheetResolver(input ? null : false);

    sheetTitleEl.textContent = title;
    sheetMessageEl.textContent = message;
    sheetMessageEl.hidden = !message;
    sheetInputEl.hidden = !input;
    if (input) {
      sheetInputEl.value = input.value || "";
      sheetInputEl.placeholder = input.placeholder || "";
    }
    sheetConfirmEl.textContent = confirmText;
    sheetCancelEl.textContent = cancelText || "Cancel";
    sheetCancelEl.hidden = cancelText === null;
    sheetActionsEl.style.gridTemplateColumns = cancelText === null ? "1fr" : "";
    sheetConfirmEl.classList.toggle("danger-fill", danger);

    sheetReturnFocusEl = document.activeElement;
    sheetResolver = (value) => {
      sheetResolver = null;
      sheetEl.classList.remove("show");
      sheetEl.setAttribute("aria-hidden", "true");
      syncScrollLock();
      if (sheetReturnFocusEl && sheetReturnFocusEl.focus) sheetReturnFocusEl.focus({ preventScroll: true });
      resolve(value);
    };

    sheetEl.classList.add("show");
    sheetEl.setAttribute("aria-hidden", "false");
    syncScrollLock();
    setTimeout(() => (input ? sheetInputEl : sheetConfirmEl).focus({ preventScroll: true }), 80);
  });
}

function answerSheet(confirmed) {
  if (!sheetResolver) return;
  if (!sheetInputEl.hidden) sheetResolver(confirmed ? sheetInputEl.value : null);
  else sheetResolver(confirmed);
}

sheetConfirmEl.addEventListener("click", () => answerSheet(true));
sheetCancelEl.addEventListener("click", () => answerSheet(false));
sheetEl.addEventListener("click", (e) => { if (e.target === sheetEl) answerSheet(false); });
sheetInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); answerSheet(true); }
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (sheetResolver) answerSheet(false);
  else if (goalCelebrationEl.classList.contains("show")) closeCelebration();
});

themeToggleEl.addEventListener("click", () => {
  appState.theme = appState.theme === "dark" ? "light" : "dark";
  applyTheme();
  saveAppState();
});

// ---------- Animations switch (works the same on every phone) ----------
function animationsEnabled() {
  return appState.animations !== false;
}

function applyAnimPref() {
  document.body.classList.toggle("no-anim", !animationsEnabled());
  if (animToggleEl) animToggleEl.checked = animationsEnabled();
}

if (animToggleEl) {
  animToggleEl.addEventListener("change", () => {
    appState.animations = animToggleEl.checked;
    saveAppState();
    applyAnimPref();
    showToast(appState.animations ? "Animations on ✓" : "Animations off");
    if (appState.animations) sparkBurst(animToggleEl);
  });
}

const isVisible = (el) => !!el && el.getClientRects().length > 0;

// Small burst of sparks from any element (fixed to the screen, so it shows on every tab)
function sparkBurst(originEl, count = 16) {
  if (!animationsEnabled() || !isVisible(originEl)) return;
  const rect = originEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const distance = 50 + Math.random() * 60;
    const spark = document.createElement("span");
    spark.className = "spark";
    spark.style.left = `${cx}px`;
    spark.style.top = `${cy}px`;
    spark.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    spark.style.setProperty("--dy", `${Math.sin(angle) * distance - 20}px`);
    spark.style.backgroundColor = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    document.body.appendChild(spark);
    setTimeout(() => spark.remove(), 1100);
  }
}

// Numbers that count up (JS driven, so it works everywhere)
function animateNumber(el, from, to, duration = 800, delay = 0, suffix = "") {
  if (!el) return;
  cancelAnimationFrame(el._numRaf);
  clearTimeout(el._numTimer);
  el.textContent = `${to}${suffix}`;
  if (!animationsEnabled() || from === to) return;

  el.textContent = `${from}${suffix}`;
  const start = performance.now() + delay;
  const tick = (now) => {
    if (now < start) { el._numRaf = requestAnimationFrame(tick); return; }
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = `${Math.round(from + (to - from) * eased)}${suffix}`;
    if (t < 1) el._numRaf = requestAnimationFrame(tick);
  };
  el._numRaf = requestAnimationFrame(tick);
  // safety net: if the tab was in the background, still end on the right number
  el._numTimer = setTimeout(() => { el.textContent = `${to}${suffix}`; }, delay + duration + 150);
}

function setStat(el, value, suffix = "") {
  const prev = el.dataset.val === undefined ? 0 : Number(el.dataset.val);
  el.dataset.val = value;
  animateNumber(el, prev, value, 800, 0, suffix);
}

// Big "day complete" moment: flame, rings, count-up (every time you mark today)
let dayCompleteTimer = null;
function playDayComplete(streak, grew = true) {
  if (!animationsEnabled() || !dayCompleteEl) return;
  dayCompleteLabelEl.textContent = !grew ? "day logged" : streak === 1 ? "day streak started!" : "day streak!";
  dayCompleteEl.classList.remove("show");
  void dayCompleteEl.offsetWidth;
  dayCompleteEl.classList.add("show");
  dayCompleteEl.setAttribute("aria-hidden", "false");
  animateNumber(dayCompleteCountEl, Math.max(streak - 1, 0), streak, 700, 350);
  sparkBurst(dayCompleteFlameEl, 24);
  haptic([18, 30, 18]);
  clearTimeout(dayCompleteTimer);
  dayCompleteTimer = setTimeout(() => {
    dayCompleteEl.classList.remove("show");
    dayCompleteEl.setAttribute("aria-hidden", "true");
  }, 2000);
}

// Tap a badge: unlocked ones pop + sparkle, locked ones shake and tell you what is left
function onBadgeTap(div, badge, isUnlocked, streak, total) {
  haptic(10);
  if (animationsEnabled() && div.animate) {
    div.animate(
      isUnlocked
        ? [{ transform: "translateY(-2px) scale(1)" }, { transform: "translateY(-9px) scale(1.12) rotate(-3deg)" }, { transform: "translateY(-2px) scale(1)" }]
        : [{ transform: "translateX(0)" }, { transform: "translateX(-7px)" }, { transform: "translateX(6px)" }, { transform: "translateX(-4px)" }, { transform: "translateX(0)" }],
      { duration: isUnlocked ? 560 : 420, easing: "ease-out" }
    );
  }
  if (isUnlocked) {
    sparkBurst(div, 12);
    showToast(`${badge.icon} ${badge.name} earned`);
  } else {
    const t = BADGE_TARGETS[badge.id];
    const left = Math.max(t.target - (t.metric === "streak" ? streak : total), 0);
    const unit = t.metric === "streak" ? "day" : "workout";
    showToast(`🔒 ${left} more ${unit}${left === 1 ? "" : "s"} to unlock ${badge.name}`);
  }
}

// Tap the streak card to replay its animation
const streakCardTapEl = document.querySelector(".streak-card");
if (streakCardTapEl) {
  streakCardTapEl.addEventListener("click", () => {
    haptic(10);
    replayAnimClass(streakCardTapEl, "streak-bump", 1200);
    replayAnimClass(currentStreakEl, "number-pop", 800);
    sparkBurst(streakCardTapEl.querySelector(".icon"), 14);
  });
}

// ---------- Install app ----------
let deferredInstallPrompt = null;
const INSTALL_DISMISS_KEY = "fitPulseInstallDismissed";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function installBannerDismissed() {
  try {
    const t = Number(localStorage.getItem(INSTALL_DISMISS_KEY) || 0);
    return t > 0 && Date.now() - t < 3 * 86400000;
  } catch {
    return false;
  }
}

function updateInstallUI() {
  const installed = isStandalone();
  if (installHeaderBtnEl) installHeaderBtnEl.hidden = installed;
  if (installBannerEl) installBannerEl.hidden = installed || installBannerDismissed();
  if (installMoreBtnEl) installMoreBtnEl.hidden = installed;
  if (installedNoteEl) installedNoteEl.hidden = !installed;
}

function installHelp() {
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) {
    return {
      title: "Install on iPhone / iPad",
      message: "1. Tap the Share button (square with an arrow) in Safari.\n2. Scroll down and tap “Add to Home Screen”.\n3. Tap “Add”.\n\nFitPulse then opens full screen like a normal app."
    };
  }
  if (/Android/i.test(ua)) {
    return {
      title: "Install on Android",
      message: "1. Tap the ⋮ menu at the top right of your browser.\n2. Tap “Install app” (or “Add to Home screen”).\n3. Tap “Install”."
    };
  }
  return {
    title: "Install on your computer",
    message: "Click the install icon at the right end of the address bar, or open the browser menu and choose “Install FitPulse”."
  };
}

async function handleInstall() {
  if (deferredInstallPrompt) {
    const promptEvent = deferredInstallPrompt;
    deferredInstallPrompt = null;
    promptEvent.prompt();
    try {
      const choice = await promptEvent.userChoice;
      if (choice && choice.outcome === "accepted") showToast("Installing FitPulse…");
    } catch {}
    return;
  }
  const help = installHelp();
  await openSheet({ title: help.title, message: help.message, confirmText: "Got it", cancelText: null });
}

document.querySelectorAll(".install-trigger").forEach(btn => btn.addEventListener("click", handleInstall));

if (installDismissEl) {
  installDismissEl.addEventListener("click", () => {
    try { localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now())); } catch {}
    updateInstallUI();
  });
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();               // keep the event so our own button can use it
  deferredInstallPrompt = e;
  updateInstallUI();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  updateInstallUI();
  showToast("FitPulse installed ✓");
});

// Offline support + required for the browser's install prompt
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

// Routine Management
function renderRoutineTabs() {
  routineTabsEl.innerHTML = "";
  appState.routines.forEach(r => {
    const btn = document.createElement("button");
    btn.className = `tab-btn ${r.id === appState.activeRoutineId ? "active" : ""}`;
    btn.textContent = r.name;
    btn.addEventListener("click", () => {
      appState.activeRoutineId = r.id;
      saveAppState();
      renderAll();
    });
    routineTabsEl.appendChild(btn);
  });
}

addRoutineBtnEl.addEventListener("click", async () => {
  const name = await openSheet({
    title: "New routine",
    message: "Give your routine a name.",
    input: { value: "", placeholder: "e.g. Morning run" },
    confirmText: "Create routine"
  });
  if (!name || !name.trim()) return;
  const newRoutine = {
    id: "r_" + Date.now(),
    name: name.trim().slice(0, 40),
    goal: 30,
    completed: [],
    unlockedBadges: []
  };
  appState.routines.push(newRoutine);
  appState.activeRoutineId = newRoutine.id;
  saveAppState();
  renderAll();
  showToast("New routine created ✓");
});

deleteRoutineBtnEl.addEventListener("click", async () => {
  if (appState.routines.length <= 1) {
    showToast("You must maintain at least one routine.");
    return;
  }
  const routine = getActiveRoutine();
  const ok = await openSheet({
    title: `Delete “${routine.name}”?`,
    message: "All of its attendance and badges will be removed. This can’t be undone.",
    confirmText: "Delete routine",
    danger: true
  });
  if (ok) {
    appState.routines = appState.routines.filter(r => r.id !== routine.id);
    appState.activeRoutineId = appState.routines[0].id;
    saveAppState();
    renderAll();
    showToast("Routine deleted.");
  }
});

// Render Dashboard & Badges
function renderStats() {
  const routine = getActiveRoutine();
  const current = calculateCurrentStreak(routine);
  const longest = calculateLongestStreak(routine);
  const total = routine.completed.length;

  const year = displayedDate.getFullYear();
  const month = displayedDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthCompleted = routine.completed.filter(d => {
    const date = parseDate(d);
    return date.getFullYear() === year && date.getMonth() === month;
  }).length;

  const rate = Math.round((monthCompleted / daysInMonth) * 100);

  setStat(currentStreakEl, current);
  setStat(longestStreakEl, longest);
  setStat(totalDaysEl, total);
  setStat(completionRateEl, rate, "%");

  const streakCardEl = document.querySelector(".streak-card");
  if (streakCardEl) streakCardEl.classList.toggle("streak-alive", current > 0);

  const progress = Math.min((current / routine.goal) * 100, 100);
  progressTextEl.textContent = `${Math.min(current, routine.goal)} / ${routine.goal} days`;
  progressPercentEl.textContent = `${Math.round(progress)}%`;
  if (!progressBarEl.dataset.ready) {
    // first paint: start empty, then fill up so the bar visibly animates
    progressBarEl.dataset.ready = "1";
    progressBarEl.style.width = "0%";
    requestAnimationFrame(() => requestAnimationFrame(() => { progressBarEl.style.width = `${progress}%`; }));
  } else {
    progressBarEl.style.width = `${progress}%`;
  }

  if (current >= routine.goal) {
    goalMessageEl.textContent = `🎉 Goal reached! Outstanding consistency.`;
  } else {
    goalMessageEl.textContent = `${current} day streak active. Keep building!`;
  }

  routineNameEl.value = routine.name;
  goalSelectEl.value = routine.goal;

  renderBadges(routine, current, total);
}

function renderBadges(routine, currentStreak, totalWorkouts) {
  badgesGridEl.innerHTML = "";
  let unlockedCount = 0;
  if (!routine.unlockedBadges) routine.unlockedBadges = [];

  let animIndex = 0;
  BADGES.forEach(badge => {
    const isUnlocked = badge.check(currentStreak, totalWorkouts);
    if (isUnlocked) {
      unlockedCount++;
    }

    const div = document.createElement("div");
    const shouldAnimate = isUnlocked && recentlyUnlockedBadgeIds.has(badge.id);
    if (shouldAnimate) {
      // Stagger multiple badges so they pop one after another
      div.style.setProperty("--badge-delay", `${animIndex * 0.15}s`);
      animIndex++;
    }
    div.className = `badge-item ${isUnlocked ? "unlocked" : ""} ${shouldAnimate ? "badge-just-unlocked" : ""}`;
    const target = BADGE_TARGETS[badge.id];
    const value = target.metric === "streak" ? currentStreak : totalWorkouts;
    const pct = Math.min((value / target.target) * 100, 100);
    div.innerHTML = `
      <div class="badge-icon">${badge.icon}</div>
      <div class="badge-title">${badge.name}</div>
      <div class="badge-desc">${badge.desc}</div>
      ${isUnlocked
        ? `<div class="badge-state">✓ Earned</div>`
        : `<div class="badge-progress"><i></i></div><div class="badge-state">${Math.min(value, target.target)}/${target.target} ${target.metric === "streak" ? "days" : "workouts"}</div>`}
    `;
    div.setAttribute("role", "button");
    div.setAttribute("tabindex", "0");
    div.addEventListener("click", () => onBadgeTap(div, badge, isUnlocked, currentStreak, totalWorkouts));
    div.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onBadgeTap(div, badge, isUnlocked, currentStreak, totalWorkouts); }
    });
    badgesGridEl.appendChild(div);
    const barEl = div.querySelector(".badge-progress i");
    if (barEl) requestAnimationFrame(() => requestAnimationFrame(() => { barEl.style.width = `${pct}%`; }));
    if (shouldAnimate) {
      setTimeout(() => div.classList.remove("badge-just-unlocked"), 1800);
    }
  });

  badgeCountEl.textContent = `${unlockedCount} / ${BADGES.length} Unlocked`;

  if (animIndex > 0) {
    // Play each unlock animation only once (later re-renders must not replay it)
    recentlyUnlockedBadgeIds = new Set();
    badgeCountEl.classList.remove("badge-count-pop");
    void badgeCountEl.offsetWidth;
    badgeCountEl.classList.add("badge-count-pop");
    setTimeout(() => badgeCountEl.classList.remove("badge-count-pop"), 900);

    // Make sure the person can actually see the badge that just unlocked
    const firstAnimated = badgesGridEl.querySelector(".badge-just-unlocked");
    if (firstAnimated) {
      const reduceMotion = !animationsEnabled();
      firstAnimated.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center", inline: "center" });
    }
  }
}

// Replays a CSS animation class on an element and removes it afterwards
function replayAnimClass(el, className, duration) {
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
  clearTimeout(el["_timer_" + className]);
  el["_timer_" + className] = setTimeout(() => el.classList.remove(className), duration);
}

// Streak / goal complete animations
function playStreakAnimations(streakGrew, goalReached) {
  if (streakGrew) {
    replayAnimClass(document.querySelector(".streak-card"), "streak-bump", 1200);
    replayAnimClass(currentStreakEl, "number-pop", 800);
    replayAnimClass(document.querySelector(".action-card"), "day-complete", 1000);
  }
  if (goalReached) {
    replayAnimClass(document.querySelector(".progress-card"), "goal-reached", 2400);
    replayAnimClass(progressBarEl, "goal-shine", 2800);
    replayAnimClass(progressPercentEl, "number-pop", 800);
  }
}

// Celebration Pop-up & Confetti Animation
function triggerCelebration(title, eyebrow, streakText, descText, icon, isGoal = false) {
  celebrationStreakEl.textContent = icon || streakText;
  document.querySelector(".celebration-eyebrow").textContent = eyebrow;
  document.querySelector(".celebration-card h2").textContent = title;
  document.querySelector(".celebration-text").textContent = descText;
  goalCelebrationEl.classList.toggle("is-goal", isGoal);

  confettiContainerEl.innerHTML = "";

  // Confetti raining from the top (every celebration)
  for (let i = 0; i < 85; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    piece.style.animationDelay = `${Math.random() * 0.7}s`;
    piece.style.animationDuration = `${2 + Math.random() * 1.5}s`;
    confettiContainerEl.appendChild(piece);
  }

  // Goal complete: extra burst of confetti exploding out of the middle
  if (isGoal) {
    for (let i = 0; i < 70; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 120 + Math.random() * 230;
      const piece = document.createElement("span");
      piece.className = "confetti-piece burst";
      piece.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      piece.style.setProperty("--dy", `${Math.sin(angle) * distance - 140}px`);
      piece.style.setProperty("--rot", `${(Math.random() - 0.5) * 1440}deg`);
      piece.style.backgroundColor = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      if (Math.random() < 0.35) piece.style.borderRadius = "50%";
      piece.style.animationDelay = `${0.25 + Math.random() * 0.25}s`;
      piece.style.animationDuration = `${1.8 + Math.random() * 1}s`;
      confettiContainerEl.appendChild(piece);
    }
    haptic([30, 50, 30, 50, 100]);
  } else {
    haptic([20, 40, 20]);
  }

  goalCelebrationEl.classList.add("show");
  goalCelebrationEl.setAttribute("aria-hidden", "false");
  syncScrollLock();
}

// If a goal and a badge are earned on the same day, show both - one after the other
let celebrationQueue = [];

function showNextCelebration() {
  const next = celebrationQueue.shift();
  if (next) {
    const [title, eyebrow, streakText, descText, icon] = next.args;
    triggerCelebration(title, eyebrow, streakText, descText, icon, next.kind === "goal");
  }
}

function queueCelebrations(items) {
  celebrationQueue.push(...items);
  if (!goalCelebrationEl.classList.contains("show")) showNextCelebration();
}

function closeCelebration() {
  goalCelebrationEl.classList.remove("show");
  goalCelebrationEl.setAttribute("aria-hidden", "true");
  syncScrollLock();
  if (celebrationQueue.length) setTimeout(showNextCelebration, 450);
}

closeCelebrationEl.addEventListener("click", closeCelebration);

goalCelebrationEl.addEventListener("click", (e) => {
  if (e.target === goalCelebrationEl) closeCelebration();
});

// Render Calendar & Attendance
function renderToday() {
  const routine = getActiveRoutine();
  const today = getLocalDateString();
  const done = routine.completed.includes(today);

  todayPillEl.textContent = new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  if (done) {
    todayStatusEl.textContent = "Completed ✓";
    todayMessageEl.textContent = `Awesome job completing ${routine.name.toLowerCase()} today!`;
    attendanceBtnEl.textContent = "Undo Today";
    attendanceBtnEl.classList.add("completed");
  } else {
    todayStatusEl.textContent = "Not completed";
    todayMessageEl.textContent = `Have you completed ${routine.name.toLowerCase()} today?`;
    attendanceBtnEl.textContent = "Mark Today ✓";
    attendanceBtnEl.classList.remove("completed");
  }

  if (fabBtnEl) {
    fabBtnEl.classList.toggle("done", done);
    fabBtnEl.setAttribute("aria-pressed", String(done));
    fabBtnEl.setAttribute("aria-label", done ? "Today is done. Tap to undo" : "Mark today as done");
  }
}

function renderCalendar() {
  const routine = getActiveRoutine();
  const year = displayedDate.getFullYear();
  const month = displayedDate.getMonth();

  monthTitleEl.textContent = displayedDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  calendarEl.innerHTML = "";

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = getLocalDateString();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "day empty";
    calendarEl.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateString = getLocalDateString(date);
    const cell = document.createElement("div");

    cell.className = "day";
    cell.dataset.date = dateString;
    cell.textContent = day;
    const isToday = dateString === todayStr;
    cell.setAttribute("tabindex", isToday ? "0" : "-1");
    if (!isToday) cell.setAttribute("aria-disabled", "true");

    if (dateString === todayStr) cell.classList.add("today");
    if (routine.completed.includes(dateString)) {
      cell.classList.add("completed");
      cell.title = "Completed";
    } else if (date < new Date(new Date().setHours(0,0,0,0))) {
      cell.classList.add("missed");
    }

    const toggle = () => toggleDate(dateString);

    cell.addEventListener("click", toggle);
    cell.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });

    calendarEl.appendChild(cell);
  }
}

function toggleDate(dateStr) {
  // Only today can be marked or unmarked. Past and future days are locked.
  if (dateStr !== getLocalDateString()) {
    showToast(dateStr < getLocalDateString() ? "🔒 Past days are locked" : "🔒 Future days are locked");
    haptic(30);
    return;
  }
  const routine = getActiveRoutine();
  const prevStreak = calculateCurrentStreak(routine);
  const isAdding = !routine.completed.includes(dateStr);
  const pendingCelebrations = [];
  let streakAfter = prevStreak;
  let streakGrew = false;
  let goalJustReached = false;
  let hasBadgeAnimation = false;

  if (!isAdding) {
    routine.completed = routine.completed.filter(d => d !== dateStr);
    showToast("Attendance removed.");
  } else {
    routine.completed.push(dateStr);
    showToast("Attendance logged ✓");

    const newStreak = calculateCurrentStreak(routine);
    streakAfter = newStreak;
    const totalWorkouts = routine.completed.length;

    if (!routine.unlockedBadges) routine.unlockedBadges = [];

    // Check newly unlocked badges and replay streak animations at each milestone.
    let newlyUnlockedBadge = null;
    recentlyUnlockedBadgeIds = new Set();
    const streakMilestones = [3, 7, 21, 30];
    const reachedStreakMilestone = streakMilestones.includes(newStreak);

    BADGES.forEach(badge => {
      const qualifies = badge.check(newStreak, totalWorkouts);
      const isNewlyUnlocked = qualifies && !routine.unlockedBadges.includes(badge.id);

      if (isNewlyUnlocked) {
        routine.unlockedBadges.push(badge.id);
        if (!newlyUnlockedBadge) newlyUnlockedBadge = badge;
      }

      // At day 7, for example, animate both the already-earned 3-day badge
      // and the new 7-day badge so the earlier milestone gets celebrated again.
      if (qualifies && (isNewlyUnlocked || (reachedStreakMilestone && badge.id.startsWith("streak")))) {
        recentlyUnlockedBadgeIds.add(badge.id);
      }
    });

    // Check streak goal completion
    const reachedGoal = (newStreak >= routine.goal && prevStreak < routine.goal);

    streakGrew = newStreak > prevStreak;
    goalJustReached = reachedGoal;
    hasBadgeAnimation = recentlyUnlockedBadgeIds.size > 0;

    // Goal first (the bigger moment), then the badge
    if (reachedGoal) {
      pendingCelebrations.push({
        kind: "goal",
        args: [
          "Streak Goal Achieved! 🎉",
          "GOAL COMPLETED!",
          `${newStreak} DAYS`,
          "Fantastic consistency! You conquered your streak goal.",
          "" // no icon: show the "30 DAYS" number instead
        ]
      });
    }
    if (newlyUnlockedBadge) {
      pendingCelebrations.push({
        kind: "badge",
        args: [
          newlyUnlockedBadge.name,
          "NEW BADGE UNLOCKED! 🏆",
          "",
          newlyUnlockedBadge.desc,
          newlyUnlockedBadge.icon
        ]
      });
    }
  }

  saveAppState();
  renderAll();

  if (isAdding) {
    haptic(14);
    replayAnimClass(calendarEl.querySelector(`[data-date="${dateStr}"]`), "day-pop", 600);
    replayAnimClass(fabBtnEl, "fab-pop", 650);
    playStreakAnimations(streakGrew, goalJustReached);
    sparkBurst(isVisible(fabBtnEl) ? fabBtnEl : attendanceBtnEl);
    playDayComplete(streakAfter, streakGrew);
  }

  // Let the badge / streak animation play before the pop-up covers the screen
  if (pendingCelebrations.length) {
    const delay = (animationsEnabled() && (hasBadgeAnimation || goalJustReached)) ? 2000 : 0;
    setTimeout(() => queueCelebrations(pendingCelebrations), delay);
  }
}

attendanceBtnEl.addEventListener("click", () => {
  toggleDate(getLocalDateString());
});

// Floating check button in the phone tab bar (works from any screen)
if (fabBtnEl) {
  fabBtnEl.addEventListener("click", () => toggleDate(getLocalDateString()));
}

document.getElementById("prevMonth").addEventListener("click", () => {
  displayedDate = new Date(displayedDate.getFullYear(), displayedDate.getMonth() - 1, 1);
  renderCalendar();
  renderAnalyticsChart();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  displayedDate = new Date(displayedDate.getFullYear(), displayedDate.getMonth() + 1, 1);
  renderCalendar();
  renderAnalyticsChart();
});

// Render Analytics Chart (Past 6 Months)
function renderAnalyticsChart() {
  const routine = getActiveRoutine();
  chartContainerEl.innerHTML = "";
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const count = routine.completed.filter(dateStr => {
      const date = parseDate(dateStr);
      return date.getFullYear() === y && date.getMonth() === m;
    }).length;

    const percent = Math.round((count / daysInMonth) * 100);

    const col = document.createElement("div");
    col.className = "chart-col";
    col.innerHTML = `
      <span class="chart-value">${percent}%</span>
      <div class="chart-bar-wrapper">
        <div class="chart-bar" style="height: ${percent}%;"></div>
      </div>
      <span class="chart-label">${d.toLocaleDateString(undefined, { month: "short" })}</span>
    `;
    chartContainerEl.appendChild(col);
  }
}

// History Audit Log
function renderHistory() {
  const routine = getActiveRoutine();
  const dates = [...new Set(routine.completed)].sort().reverse().slice(0, 10);

  if (!dates.length) {
    historyEl.innerHTML = `<div class="empty-history" style="text-align:center; padding: 15px; color: var(--muted);">No workouts recorded for this routine yet.</div>`;
    return;
  }

  historyEl.innerHTML = dates.map(d => `
    <div class="history-row">
      <span class="history-date">${parseDate(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
      <span class="history-status">COMPLETED ✓</span>
    </div>
  `).join("");
}

// Health Snapshot Data
function renderHealth() {
  heightInputEl.value = appState.health.height;
  weightInputEl.value = appState.health.weight;
  stepsInputEl.value = appState.health.steps;
  sleepInputEl.value = appState.health.sleep;
}

document.getElementById("saveHealth").addEventListener("click", () => {
  const height = heightInputEl.value.trim();
  const weight = weightInputEl.value.trim();
  const steps = stepsInputEl.value.trim();
  const sleep = sleepInputEl.value.trim();

  appState.health = { height, weight, steps: steps ? Math.round(Number(steps)) : "", sleep };
  saveAppState();
  showToast("Health metrics saved ✓");
});

// Save Settings
document.getElementById("saveSettings").addEventListener("click", () => {
  const routine = getActiveRoutine();
  const name = routineNameEl.value.trim();
  routine.name = name || "Exercise";
  routine.goal = Number(goalSelectEl.value);
  saveAppState();
  renderAll();
  showToast("Settings updated ✓");
});

// Toast System
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

// Backup System
document.getElementById("exportData").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(appState, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fitpulse-backup-${getLocalDateString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Backup downloaded ✓");
});

document.getElementById("importData").addEventListener("click", () => {
  document.getElementById("backupFile").click();
});

document.getElementById("backupFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (parsed.routines) {
        appState = normalizeState(parsed);
        saveAppState();
        applyTheme();
        applyAnimPref();
        renderAll();
        showToast("Backup restored successfully ✓");
      } else {
        throw new Error("Invalid format");
      }
    } catch {
      showToast("Invalid backup file.");
    }
  };
  reader.readAsText(file);
});

document.getElementById("clearData").addEventListener("click", async () => {
  const ok = await openSheet({
    title: "Reset routine data?",
    message: `This clears every completed day and badge for “${getActiveRoutine().name}”.`,
    confirmText: "Reset data",
    danger: true
  });
  if (ok) {
    const routine = getActiveRoutine();
    routine.completed = [];
    routine.unlockedBadges = [];
    saveAppState();
    renderAll();
    showToast("Routine data reset.");
  }
});

/* --- ENHANCED 3D PARTICLE CANVAS & TYPOGRAPHY INTRO ANIMATION --- */
function runEpicIntroAnimation() {
  const intro = document.getElementById("introAnimation");
  const canvas = document.getElementById("introCanvas");
  const line = document.getElementById("introLine");
  if (!intro || !canvas || !line) return;
  if (!animationsEnabled()) { intro.remove(); return; }

  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = window.innerWidth;
  let height = window.innerHeight;

  function sizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  sizeCanvas();
  window.addEventListener("resize", sizeCanvas);

  const particles = [];
  const particleCount = Math.min(Math.floor(width / 15), 90);

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.5 + 1,
      color: Math.random() > 0.4 ? "#38e6b0" : "#68a5ff",
      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.5) * 1.2,
      alpha: Math.random() * 0.7 + 0.3
    });
  }

  let animId;
  function renderCanvas() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach((p, index) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = p.color;
      ctx.fill();
      ctx.restore();

      for (let j = index + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
        if (dist < 130) {
          ctx.save();
          ctx.globalAlpha = (1 - dist / 130) * 0.25;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
          ctx.restore();
        }
      }
    });

    animId = requestAnimationFrame(renderCanvas);
  }

  renderCanvas();

  const text = "Consistency beats talent. Let's build your legacy 🔥";
  const words = text.split(" ");
  line.innerHTML = "";

  words.forEach((word, index) => {
    const span = document.createElement("span");
    span.className = "intro-word";
    if (word.includes("Consistency") || word.includes("legacy")) {
      span.classList.add("highlight");
    }
    span.textContent = word;
    span.style.animationDelay = `${index * 0.16 + 0.2}s`;
    line.appendChild(span);
  });

  let introFinished = false;
  function finishIntro() {
    if (introFinished) return;
    introFinished = true;
    window.removeEventListener("resize", sizeCanvas);
    intro.classList.add("intro-hidden");
    setTimeout(() => {
      cancelAnimationFrame(animId);
      intro.remove();
    }, 850);
  }

  // Tap anywhere (or the Skip button) to go straight to the app
  intro.addEventListener("click", finishIntro);
  setTimeout(finishIntro, words.length * 160 + 1500);
}

function renderAll() {
  renderRoutineTabs();
  renderStats();
  renderToday();
  renderCalendar();
  renderAnalyticsChart();
  renderHistory();
  renderHealth();
}

applyTheme();
applyAnimPref();
updateInstallUI();
setView("home", { scroll: false });
renderAll();
runEpicIntroAnimation();
