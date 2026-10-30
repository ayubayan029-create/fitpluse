const STORAGE_KEY = "fitPulseTrackerData";

const BADGES = [
  { id: "streak3", name: "3-Day Ignition", desc: "Build momentum with 3 consecutive days.", icon: "🔥", check: (streak) => streak >= 3 },
  { id: "streak7", name: "Week Warrior", desc: "Complete 7 days without missing.", icon: "⚡", check: (streak) => streak >= 7 },
  { id: "streak21", name: "Habit Formed", desc: "Hit 21 consecutive days of consistency.", icon: "🧠", check: (streak) => streak >= 21 },
  { id: "streak30", name: "30-Day Master", desc: "Achieve a full 30-day streak.", icon: "🏆", check: (streak) => streak >= 30 },
  { id: "total50", name: "Half Century", desc: "Complete 50 workouts total.", icon: "🎯", check: (_, total) => total >= 50 },
  { id: "total100", name: "Centurion", desc: "Reach 100 completed workout sessions.", icon: "👑", check: (_, total) => total >= 100 }
];

const defaultState = {
  theme: "dark",
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

const heightInputEl = document.getElementById("heightInput");
const weightInputEl = document.getElementById("weightInput");
const stepsInputEl = document.getElementById("stepsInput");
const sleepInputEl = document.getElementById("sleepInput");

function loadAppState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return JSON.parse(JSON.stringify(defaultState));
    const parsed = JSON.parse(saved);

    const routines = Array.isArray(parsed.routines) && parsed.routines.length ? parsed.routines.map(r => ({
      ...r,
      unlockedBadges: Array.isArray(r.unlockedBadges) ? r.unlockedBadges : []
    })) : JSON.parse(JSON.stringify(defaultState.routines));

    return {
      theme: parsed.theme || "dark",
      activeRoutineId: parsed.activeRoutineId || routines[0].id,
      routines,
      health: parsed.health || { height: "", weight: "", steps: "", sleep: "" }
    };
  } catch {
    return JSON.parse(JSON.stringify(defaultState));
  }
}

function saveAppState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
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
}

themeToggleEl.addEventListener("click", () => {
  appState.theme = appState.theme === "dark" ? "light" : "dark";
  applyTheme();
  saveAppState();
});

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

addRoutineBtnEl.addEventListener("click", () => {
  const name = prompt("Enter new routine name:", "New Routine");
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

deleteRoutineBtnEl.addEventListener("click", () => {
  if (appState.routines.length <= 1) {
    showToast("You must maintain at least one routine.");
    return;
  }
  const routine = getActiveRoutine();
  if (confirm(`Delete '${routine.name}'?`)) {
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

  currentStreakEl.textContent = current;
  longestStreakEl.textContent = longest;
  totalDaysEl.textContent = total;
  completionRateEl.textContent = `${rate}%`;

  const progress = Math.min((current / routine.goal) * 100, 100);
  progressTextEl.textContent = `${Math.min(current, routine.goal)} / ${routine.goal} days`;
  progressPercentEl.textContent = `${Math.round(progress)}%`;
  progressBarEl.style.width = `${progress}%`;

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
    div.innerHTML = `
      <div class="badge-icon">${badge.icon}</div>
      <div class="badge-title">${badge.name}</div>
      <div class="badge-desc">${badge.desc}</div>
    `;
    badgesGridEl.appendChild(div);
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
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      firstAnimated.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
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
    replayAnimClass(progressBarEl, "goal-shine", 2400);
    replayAnimClass(progressPercentEl, "number-pop", 800);
  }
}

// Celebration Pop-up & Confetti Animation
function triggerCelebration(title, eyebrow, streakText, descText, icon) {
  celebrationStreakEl.textContent = icon || streakText;
  document.querySelector(".celebration-eyebrow").textContent = eyebrow;
  document.querySelector(".celebration-card h2").textContent = title;
  document.querySelector(".celebration-text").textContent = descText;

  confettiContainerEl.innerHTML = "";
  for (let i = 0; i < 85; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = ["#38e6b0", "#68a5ff", "#f4bd4f", "#a66cff", "#ff6b7a"][Math.floor(Math.random() * 5)];
    piece.style.animationDelay = `${Math.random() * 0.7}s`;
    piece.style.animationDuration = `${2 + Math.random() * 1.5}s`;
    confettiContainerEl.appendChild(piece);
  }

  goalCelebrationEl.classList.add("show");
  goalCelebrationEl.setAttribute("aria-hidden", "false");
}

closeCelebrationEl.addEventListener("click", () => {
  goalCelebrationEl.classList.remove("show");
  goalCelebrationEl.setAttribute("aria-hidden", "true");
});

goalCelebrationEl.addEventListener("click", (e) => {
  if (e.target === goalCelebrationEl) {
    goalCelebrationEl.classList.remove("show");
    goalCelebrationEl.setAttribute("aria-hidden", "true");
  }
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
    cell.textContent = day;
    cell.setAttribute("tabindex", "0");

    if (dateString === todayStr) cell.classList.add("today");
    if (routine.completed.includes(dateString)) {
      cell.classList.add("completed");
      cell.title = "Completed";
    } else if (date < new Date(new Date().setHours(0,0,0,0))) {
      cell.classList.add("missed");
    }

    const toggle = () => {
      if (date > new Date(new Date().setHours(23, 59, 59, 999))) {
        showToast("Cannot mark future dates.");
        return;
      }
      toggleDate(dateString);
    };

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
  const routine = getActiveRoutine();
  const prevStreak = calculateCurrentStreak(routine);
  const isAdding = !routine.completed.includes(dateStr);
  let pendingCelebration = null;
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

    if (newlyUnlockedBadge) {
      pendingCelebration = [
        newlyUnlockedBadge.name,
        "NEW BADGE UNLOCKED! 🏆",
        "",
        newlyUnlockedBadge.desc,
        newlyUnlockedBadge.icon
      ];
    } else if (reachedGoal) {
      pendingCelebration = [
        "Streak Goal Achieved! 🎉",
        "GOAL COMPLETED!",
        `${newStreak} DAYS`,
        "Fantastic consistency! You conquered your streak goal.",
        "🏆"
      ];
    }
  }

  saveAppState();
  renderAll();

  if (isAdding) {
    playStreakAnimations(streakGrew, goalJustReached);
  }

  // Let the badge / streak animation play before the pop-up covers the screen
  if (pendingCelebration) {
    const delay = (hasBadgeAnimation || goalJustReached) ? 1400 : 0;
    setTimeout(() => triggerCelebration(...pendingCelebration), delay);
  }
}

attendanceBtnEl.addEventListener("click", () => {
  toggleDate(getLocalDateString());
});

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
        appState = parsed;
        saveAppState();
        applyTheme();
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

document.getElementById("clearData").addEventListener("click", () => {
  if (confirm("Reset current routine data?")) {
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

  const ctx = canvas.getContext("2d");
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

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

  setTimeout(() => {
    intro.classList.add("intro-hidden");
    setTimeout(() => {
      cancelAnimationFrame(animId);
      intro.remove();
    }, 850);
  }, words.length * 160 + 1500);
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
renderAll();
runEpicIntroAnimation();
