/**
 * TERRAVERDE — DASHBOARD LOGIC
 * Core Application Engine
 */

// Global State
let user = null;
let charts = {};
let activityLogs = [];
let todayActions = [];
let communityFeed = [];
let leaderboard = [];

// Utilities
function debounce(fn, wait) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function onIdle(fn) {
  if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 1000 });
  else setTimeout(fn, 300);
}

// Initialize Dashboard
document.addEventListener("DOMContentLoaded", () => {
  checkSession();
  initUserData();
  initSidebar();
  initActivityLog();
  initActions();
  initCalculator();
  updateGreetingTime();

  // Defer heavier initializations to idle time to reduce jank on load
  onIdle(() => {
    initCharts();
    initHeatmap();
    initCommunity();
  });

  // Bind appearance toggle and avatar upload handlers
  const darkToggle = document.getElementById('settings-dark-mode');
  if (darkToggle) {
    darkToggle.addEventListener('change', (e) => {
      applyTheme(e.target.checked ? 'dark' : 'light');
    });
  }

  const changeBtn = document.getElementById('change-photo-btn');
  const avatarInput = document.getElementById('avatar-input');
  if (changeBtn && avatarInput) {
    changeBtn.addEventListener('click', () => avatarInput.click());
    avatarInput.addEventListener('change', handleAvatarFileSelect);
  }

  // Apply saved theme (dark by default)
  const storedTheme = localStorage.getItem('tv_theme') || 'dark';
  applyTheme(storedTheme);

  // Debounce chart updates on resize
  window.addEventListener('resize', debounce(() => {
    Object.values(charts).forEach(c => { try { c.update(); } catch (e) {} });
  }, 220));
});

/* =========================================================
   1. SESSION CHECK & STATE INITIALIZATION
   ========================================================= */
function checkSession() {
  const storedUser = localStorage.getItem("tv_user");
  if (!storedUser) {
    // If no user exists, create a default user for demonstration
    user = {
      name: "Alex Green",
      email: "alex@example.com",
      avatar: "AG",
      score: 4.2,
      level: "Eco Warrior",
      coins: 2450,
      streak: 21,
      trees: 14,
      location: "San Francisco, CA",
      categories: {
        transport: 1.8,
        food: 1.1,
        energy: 0.8,
        shopping: 0.5
      }
    };
    localStorage.setItem("tv_user", JSON.stringify(user));
  } else {
    user = JSON.parse(storedUser);
    // Ensure default values if fields are missing
    if (user.coins === undefined) user.coins = 2450;
    if (user.streak === undefined) user.streak = 21;
    if (user.trees === undefined) user.trees = 14;
    if (user.location === undefined) user.location = "San Francisco, CA";
    if (!user.categories) {
      user.categories = {
        transport: 1.8,
        food: 1.1,
        energy: 0.8,
        shopping: 0.5
      };
    }
    // If it's a completely new user from signup (score 0), initialize with default categories
    if (user.score === 0) {
      user.score = 4.2;
    }
  }
  resolveUserLocation();
}

function resolveUserLocation() {
  fetch("https://ipapi.co/json/")
    .then(res => res.json())
    .then(data => {
      if (data && data.city) {
        const region = data.region_code || data.region || "";
        const country = data.country_code || data.country_name || "";
        const locationStr = region ? `${data.city}, ${region}` : `${data.city}, ${country}`;
        
        user.location = locationStr;
        localStorage.setItem("tv_user", JSON.stringify(user));
        updateLocationUI(locationStr);
      }
    })
    .catch(err => {
      console.warn("Location fetch failed, using default.");
      updateLocationUI(user.location);
    });
}

function updateLocationUI(locationStr) {
  const profileLoc = document.getElementById("profile-location");
  if (profileLoc) profileLoc.textContent = locationStr;

  const settingsLoc = document.getElementById("settings-location");
  if (settingsLoc) settingsLoc.value = locationStr;
}

function initUserData() {
  // Update Topbar and Sidebar Profile Details
  const nameEl = document.getElementById("user-name");
  if (nameEl) nameEl.textContent = user.name;
  const greetEl = document.getElementById("greeting-name");
  if (greetEl) greetEl.textContent = user.name.split(" ")[0];
  const levelEl = document.getElementById("user-level");
  if (levelEl) levelEl.textContent = `🌟 ${user.level}`;

  // Load avatar image from localStorage if user uploaded one
  const storedImg = localStorage.getItem('tv_user_image');
  const avatarEls = [document.getElementById("user-avatar"), document.getElementById("topbar-avatar"), document.getElementById("settings-avatar")];
  avatarEls.forEach(el => {
    if (!el) return;
    if (storedImg) {
      el.innerHTML = `<img src="${storedImg}" alt="avatar" class="avatar-img" />`;
    } else {
      el.textContent = user.avatar;
    }
  });

  // KPI Panels
  const kpiEl = document.getElementById("kpi-footprint");
  if (kpiEl) kpiEl.textContent = user.score.toFixed(1);
  const coinEl = document.getElementById("coin-count");
  if (coinEl) coinEl.textContent = user.coins.toLocaleString();

  // Settings sync
  const nameInput = document.getElementById("settings-name");
  if (nameInput) nameInput.value = user.name;

  const locInput = document.getElementById("settings-location");
  if (locInput) locInput.value = user.location;

  const emailInput = document.getElementById("settings-email");
  if (emailInput) emailInput.value = user.email || '';

  const profileLoc = document.getElementById("profile-location");
  if (profileLoc) profileLoc.textContent = user.location;
}

function updateGreetingTime() {
  const greetingEl = document.getElementById("greeting-name");
  if (!greetingEl) return;
  const hour = new Date().getHours();
  let greet = "Good morning";
  if (hour >= 12 && hour < 17) greet = "Good afternoon";
  else if (hour >= 17) greet = "Good evening";
  greetingEl.parentNode.innerHTML = `${greet}, <span id="greeting-name">${user.name.split(" ")[0]}</span> 👋`;
}

/* =========================================================
   APPEARANCE & AVATAR HANDLERS
   ========================================================= */
function applyTheme(mode) {
  const body = document.body;
  const modeText = document.getElementById('appearance-mode-text');
  if (mode === 'light') {
    body.classList.add('light');
    if (modeText) modeText.textContent = 'Currently set to Light';
    localStorage.setItem('tv_theme', 'light');
    const checkbox = document.getElementById('settings-dark-mode'); if (checkbox) checkbox.checked = false;
  } else {
    body.classList.remove('light');
    if (modeText) modeText.textContent = 'Currently set to Dark';
    localStorage.setItem('tv_theme', 'dark');
    const checkbox = document.getElementById('settings-dark-mode'); if (checkbox) checkbox.checked = true;
  }
}

function handleAvatarFileSelect(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showToast('⚠️ File too large. Max 2MB.'); return; }
  const reader = new FileReader();
  reader.onload = function(ev) {
    const dataUrl = ev.target.result;
    localStorage.setItem('tv_user_image', dataUrl);
    initUserData();
    showToast('✅ Profile photo updated');
  };
  reader.readAsDataURL(file);
}


/* =========================================================
   2. SINGLE PAGE NAVIGATION & SIDEBAR
   ========================================================= */
function initSidebar() {
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("mobile-menu-btn");
  const sidebarToggle = document.getElementById("sidebar-toggle");

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.add("mobile-open");
    });
  }

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.remove("mobile-open");
    });
  }

  // Close sidebar on clicking outside in mobile view
  document.addEventListener("click", (e) => {
    if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains("mobile-open")) {
      if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
        sidebar.classList.remove("mobile-open");
      }
    }
  });
}

function showPage(pageId, linkElement) {
  // Hide all pages
  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });

  // Show selected page
  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) {
    targetPage.classList.add("active");
  }

  // Update active sidebar nav link style
  document.querySelectorAll(".sidebar-link").forEach(link => {
    link.classList.remove("active");
  });

  if (linkElement) {
    linkElement.classList.add("active");
  }

  // In mobile view, close the sidebar after navigation
  const sidebar = document.getElementById("sidebar");
  if (sidebar) sidebar.classList.remove("mobile-open");

  // Trigger chart update or specific page initialization
  if (pageId === "analytics") {
    setTimeout(() => {
      charts.monthly.update();
      charts.radar.update();
      charts.benchmark.update();
    }, 100);
  } else if (pageId === "dashboard") {
    setTimeout(() => {
      charts.trend.update();
      charts.category.update();
    }, 100);
  }
}

function logout() {
  localStorage.removeItem("tv_user");
}

/* =========================================================
   3. CHART.JS VISUALIZATIONS
   ========================================================= */
function initCharts() {
  // 1. Dashboard Footprint Trend Chart (Line)
  const trendCtx = document.getElementById("trend-chart");
  if (trendCtx) {
    charts.trend = new Chart(trendCtx.getContext("2d"), {
      type: "line",
      data: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [{
          label: "Your Footprint (kg CO₂e)",
          data: [12.4, 10.1, 14.2, 9.8, 11.5, 6.2, 8.4],
          borderColor: "#22c55e",
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#22c55e",
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#a1a1aa" } },
          x: { grid: { display: false }, ticks: { color: "#a1a1aa" } }
        }
      }
    });
  }

  // 2. Dashboard Category Share Chart (Doughnut)
  const categoryCtx = document.getElementById("category-chart");
  if (categoryCtx) {
    const dataVals = [user.categories.transport, user.categories.food, user.categories.energy, user.categories.shopping];
    charts.category = new Chart(categoryCtx.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["Transport", "Food", "Energy", "Shopping"],
        datasets: [{
          data: dataVals,
          backgroundColor: ["#ef4444", "#22c55e", "#f59e0b", "#a855f7"],
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        cutout: "75%"
      }
    });
    renderCategoryLegend();
  }

  // 3. Analytics Monthly Line Chart
  const monthlyCtx = document.getElementById("monthly-chart");
  if (monthlyCtx) {
    charts.monthly = new Chart(monthlyCtx.getContext("2d"), {
      type: "line",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        datasets: [
          {
            label: "This Year (tCO₂e)",
            data: [0.45, 0.42, 0.39, 0.35, 0.32, 0.28, 0.25, 0.22, 0.24, 0.23, 0.21, 0.20],
            borderColor: "#22c55e",
            borderWidth: 3,
            fill: false,
            tension: 0.3
          },
          {
            label: "Last Year (tCO₂e)",
            data: [0.55, 0.52, 0.54, 0.49, 0.48, 0.45, 0.43, 0.42, 0.41, 0.39, 0.38, 0.36],
            borderColor: "#6b7280",
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            tension: 0.3
          },
          {
            label: "Projected Next Quarter",
            data: [0.19, 0.18, 0.17, 0.16],
            borderColor: "#3b82f6",
            borderWidth: 2,
            borderDash: [3,3],
            fill: false,
            tension: 0.25
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "#f0fdf4" } } },
        scales: {
          y: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#a1a1aa" } },
          x: { grid: { display: false }, ticks: { color: "#a1a1aa" } }
        }
      }
    });
  }

  // 4. Analytics Radar Comparison Chart
  const radarCtx = document.getElementById("radar-chart");
  if (radarCtx) {
    charts.radar = new Chart(radarCtx.getContext("2d"), {
      type: "radar",
      data: {
        labels: ["Transport", "Food", "Energy", "Shopping"],
        datasets: [
          {
            label: "Your Score",
            data: [user.categories.transport, user.categories.food, user.categories.energy, user.categories.shopping],
            backgroundColor: "rgba(34, 197, 94, 0.2)",
            borderColor: "#22c55e",
            pointBackgroundColor: "#22c55e"
          },
          {
            label: "Global Average",
            data: [2.5, 1.8, 2.2, 1.3],
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderColor: "#6b7280",
            pointBackgroundColor: "#6b7280"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "#f0fdf4" } } },
        scales: {
          r: {
            grid: { color: "rgba(255, 255, 255, 0.08)" },
            angleLines: { color: "rgba(255, 255, 255, 0.08)" },
            pointLabels: { color: "#a1a1aa", font: { size: 11 } },
            ticks: { display: false }
          }
        }
      }
    });
  }

  // 5. Analytics Benchmark Bar Chart
  const benchmarkCtx = document.getElementById("benchmark-chart");
  if (benchmarkCtx) {
    charts.benchmark = new Chart(benchmarkCtx.getContext("2d"), {
      type: "bar",
      data: {
        labels: ["USA Average", "EU Average", "Global Target", "You"],
        datasets: [{
          label: "Annual Carbon Footprint (tCO₂e)",
          data: [16.0, 7.8, 2.0, user.score],
          backgroundColor: ["#ef4444", "#f59e0b", "#3b82f6", "#22c55e"],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#a1a1aa" } },
          x: { grid: { display: false }, ticks: { color: "#a1a1aa" } }
        }
      }
    });
  }
}

function renderCategoryLegend() {
  const legendEl = document.getElementById("category-legend");
  if (!legendEl) return;

  const labels = ["Transport", "Food", "Energy", "Shopping"];
  const colors = ["#ef4444", "#22c55e", "#f59e0b", "#a855f7"];
  const vals = [user.categories.transport, user.categories.food, user.categories.energy, user.categories.shopping];
  const total = vals.reduce((a, b) => a + b, 0);

  legendEl.innerHTML = labels.map((label, idx) => {
    const pct = total > 0 ? Math.round((vals[idx] / total) * 100) : 0;
    return `
      <div class="legend-item">
        <span class="legend-color" style="background: ${colors[idx]}"></span>
        <span class="legend-label">${label}</span>
        <span class="legend-pct">${pct}%</span>
      </div>
    `;
  }).join("");
}

function switchChartPeriod(period, tabBtn) {
  // Update tabs active state
  tabBtn.parentElement.querySelectorAll(".chart-tab").forEach(tab => tab.classList.remove("active"));
  tabBtn.classList.add("active");

  if (!charts.trend) return;

  // Toggle chart data mock
  let labels, data;
  if (period === "7d") {
    labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    data = [12.4, 10.1, 14.2, 9.8, 11.5, 6.2, 8.4];
  } else if (period === "30d") {
    labels = ["Week 1", "Week 2", "Week 3", "Week 4"];
    data = [84.2, 76.5, 68.1, 55.4];
  } else if (period === "12m") {
    labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    data = [350, 320, 310, 280, 260, 230, 210, 190, 205, 185, 170, 160];
  }

  charts.trend.data.labels = labels;
  charts.trend.data.datasets[0].data = data;
  charts.trend.update();
}

/* =========================================================
   4. INTERACTIVE DUST-LEVEL HEATMAP
   ========================================================= */
function initHeatmap() {
  const heatmapEl = document.getElementById("heatmap");
  if (!heatmapEl) return;

  heatmapEl.innerHTML = "";
  // Create 52 weeks * 7 days grid blocks
  for (let i = 0; i < 200; i++) {
    const day = document.createElement("div");
    day.className = "heatmap-day";
    // Choose random green intensity density
    const val = Math.random();
    if (val < 0.2) {
      day.classList.add("lvl-0"); // No action
    } else if (val < 0.5) {
      day.classList.add("lvl-1"); // Light action
    } else if (val < 0.8) {
      day.classList.add("lvl-2"); // Moderate action
    } else {
      day.classList.add("lvl-3"); // High action / green streak!
    }
    
    // Add tooltip
    day.setAttribute("title", `Logged activity on day ${i + 1}`);
    heatmapEl.appendChild(day);
  }
}

/* =========================================================
   5. ACTIVITY FEED LOGGING
   ========================================================= */
function initActivityLog() {
  // Preset demo logs (expanded for hackathon/testing)
  activityLogs = [
    { id: 1, type: "transport", title: "Commute to office", desc: "15 km via Public Bus", co2: "1.2 kg", time: "2 hours ago" },
    { id: 2, type: "food", title: "Lunch Salad", desc: "1 Vegetarian Meal serving", co2: "0.6 kg", time: "5 hours ago" },
    { id: 3, type: "energy", title: "Home Smart Heating", desc: "Saved 4 kWh grid energy", co2: "-0.8 kg", time: "Yesterday" },
    { id: 4, type: "shopping", title: "Second-hand Jacket", desc: "Bought pre-loved jacket", co2: "-12.0 kg", time: "2 days ago" },
    { id: 5, type: "transport", title: "Train to city", desc: "120 km via train", co2: "6.0 kg", time: "3 days ago" },
    { id: 6, type: "food", title: "Veggie Dinner", desc: "Home-cooked plant dinner", co2: "0.3 kg", time: "4 days ago" }
  ];
  renderActivityLog();
}

function renderActivityLog() {
  const feedEl = document.getElementById("activity-feed");
  const historyEl = document.getElementById("calc-history");
  if (!feedEl) return;

  const html = activityLogs.map(log => {
    let icon = "🚗";
    if (log.type === "food") icon = "🥗";
    else if (log.type === "energy") icon = "⚡";
    else if (log.type === "shopping") icon = "🛍️";

    const isReduction = log.co2.startsWith("-");
    const labelClass = isReduction ? "co2-saved" : "co2-added";

    return `
      <div class="feed-item">
        <div class="feed-icon" style="background: rgba(255,255,255,0.05)">${icon}</div>
        <div class="feed-details">
          <strong>${log.title}</strong>
          <span>${log.desc}</span>
        </div>
        <div class="feed-meta">
          <span class="feed-co2 ${labelClass}">${log.co2}</span>
          <span class="feed-time">${log.time}</span>
        </div>
      </div>
    `;
  }).join("");

  feedEl.innerHTML = html;
  if (historyEl) historyEl.innerHTML = html;
}

/* =========================================================
   6. DAILY REWARDS & CHALLENGES LIST
   ========================================================= */
function initActions() {
  todayActions = [
    { id: 1, title: "Commute via Public Transit", category: "transport", impact: "2.4 kg CO₂", coins: 80, done: false },
    { id: 2, title: "Switch to Plant-Based Meal", category: "food", impact: "1.5 kg CO₂", coins: 50, done: false },
    { id: 3, title: "Unplug Chargers when Full", category: "energy", impact: "0.3 kg CO₂", coins: 30, done: false },
    { id: 4, title: "Carpool on Tuesday", category: "transport", impact: "1.8 kg CO₂", coins: 60, done: false },
    { id: 5, title: "Buy Reusable Bottle", category: "shopping", impact: "0.5 kg CO₂", coins: 20, done: false }
  ];
  renderActions();
}

function renderActions() {
  const listEl = document.getElementById("today-actions");
  const fullGridEl = document.getElementById("actions-full-grid");
  if (!listEl) return;

  const getActionHTML = (action) => {
    let icon = "🚗";
    if (action.category === "food") icon = "🥗";
    else if (action.category === "energy") icon = "⚡";

    return `
      <div class="action-item ${action.done ? 'done' : ''}" id="action-${action.id}">
        <div class="action-check" onclick="toggleAction(${action.id})">
          ${action.done ? '✓' : ''}
        </div>
        <div class="action-icon">${icon}</div>
        <div class="action-details">
          <strong>${action.title}</strong>
          <span>Impact: -${action.impact} · +${action.coins} GreenCoins</span>
        </div>
      </div>
    `;
  };

  listEl.innerHTML = todayActions.map(getActionHTML).join("");

  if (fullGridEl) {
    fullGridEl.innerHTML = todayActions.map(action => {
      let icon = "🚗";
      if (action.category === "food") icon = "🥗";
      else if (action.category === "energy") icon = "⚡";

      return `
        <div class="feature-card reveal-up ${action.done ? 'action-done' : ''}" style="display:flex; flex-direction:column; gap:12px; padding:24px;">
          <div class="feature-icon-wrap" style="margin-bottom:0px; background: rgba(34,197,94,0.15)">
            <span>${icon}</span>
          </div>
          <h3>${action.title}</h3>
          <p>Complete this challenge to earn points and shrink your carbon score.</p>
          <div style="margin-top:auto; display:flex; justify-content:space-between; align-items:center;">
            <span style="color:var(--clr-green-light); font-weight:600;">-${action.impact}</span>
            <button class="btn ${action.done ? 'btn-ghost' : 'btn-primary'} btn-sm" onclick="toggleAction(${action.id})">
              ${action.done ? 'Completed ✓' : 'Complete Challenge'}
            </button>
          </div>
        </div>
      `;
    }).join("");
  }
}

function toggleAction(id) {
  const idx = todayActions.findIndex(a => a.id === id);
  if (idx === -1) return;

  const action = todayActions[idx];
  action.done = !action.done;

  if (action.done) {
    // Award Coins & Reduce Footprint
    user.coins += action.coins;
    const co2Val = parseFloat(action.impact.split(" ")[0]);
    
    // Scale reduction: annual reduction is co2Val * 0.05
    user.score = Math.max(0.1, user.score - (co2Val * 0.02));
    
    // Distribute reduction to category
    user.categories[action.category] = Math.max(0.05, user.categories[action.category] - (co2Val * 0.02));
    
    showToast(`🎉 Challenge Complete! +${action.coins} GreenCoins! Footprint reduced!`);
  } else {
    // Revert
    user.coins -= action.coins;
    const co2Val = parseFloat(action.impact.split(" ")[0]);
    user.score += (co2Val * 0.02);
    user.categories[action.category] += (co2Val * 0.02);
  }

  // Save state
  localStorage.setItem("tv_user", JSON.stringify(user));
  initUserData();
  
  // Re-render
  renderActions();
  
  // Update charts
  if (charts.category) {
    charts.category.data.datasets[0].data = [
      user.categories.transport,
      user.categories.food,
      user.categories.energy,
      user.categories.shopping
    ];
    charts.category.update();
    renderCategoryLegend();
  }
  if (charts.radar) {
    charts.radar.data.datasets[0].data = [
      user.categories.transport,
      user.categories.food,
      user.categories.energy,
      user.categories.shopping
    ];
    charts.radar.update();
  }
}

/* =========================================================
   7. COMMUNITY LEADERBOARD & FEED
   ========================================================= */
function initCommunity() {
  leaderboard = [
    { rank: 1, name: "Chloe Henderson", score: "2.1t", avatar: "CH", clr: "#22c55e" },
    { rank: 2, name: "Liam Reynolds", score: "2.8t", avatar: "LR", clr: "#3b82f6" },
    { rank: 3, name: "Sofia Alvarez", score: "3.4t", avatar: "SA", clr: "#a855f7" },
    { rank: 4, name: "Noah Kim", score: "3.9t", avatar: "NK", clr: "#f59e0b" },
    { rank: 5, name: "You (Alex)", score: `${user.score.toFixed(1)}t`, avatar: user.avatar, clr: "#f59e0b", active: true },
    { rank: 6, name: "Ethan Jenkins", score: "4.8t", avatar: "EJ", clr: "#ec4899" },
    { rank: 7, name: "Maya R.", score: "5.2t", avatar: "MR", clr: "#06b6d4" }
  ];

  communityFeed = [
    { user: "Sarah A.", text: "Completed the 30-Day Meatless Challenge today! Feel great and saved over 60kg of CO₂! 🥦🔥", time: "10m ago" },
    { user: "Marcus K.", text: "Substituted my 20km car commute with the express electric bus today. Got some reading done! 🚌💨", time: "42m ago" },
    { user: "Priya P.", text: "Planted 5 pine tree saplings with the local community green movement. Reforestation rules! 🌲💚", time: "2 hours ago" },
    { user: "Lena T.", text: "Hosted a community swap meet — saved lots of items from landfill! ♻️", time: "6 hours ago" },
    { user: "Omar S.", text: "Installed solar panels this week — excited to track the savings! ☀️", time: "1 day ago" }
  ];

  renderLeaderboard();
  renderCommunityFeed();
}

function renderLeaderboard() {
  // Update score in leaderboard
  const idx = leaderboard.findIndex(x => x.active);
  if (idx !== -1) {
    leaderboard[idx].score = `${user.score.toFixed(1)}t`;
  }

  // Sort leaderboard by score (low to high is best!)
  leaderboard.sort((a, b) => parseFloat(a.score) - parseFloat(b.score));
  
  // Re-assign ranks
  leaderboard.forEach((item, index) => {
    item.rank = index + 1;
  });

  const listEl = document.getElementById("leaderboard-list");
  const fullEl = document.getElementById("full-leaderboard");
  if (!listEl) return;

  const html = leaderboard.map(player => `
    <div class="leaderboard-item ${player.active ? 'active-player' : ''}">
      <span class="lb-rank">${player.rank}</span>
      <div class="lb-avatar" style="background: ${player.clr}">${player.avatar}</div>
      <span class="lb-name">${player.name}</span>
      <span class="lb-score">${player.score}</span>
    </div>
  `).join("");

  listEl.innerHTML = html;
  if (fullEl) fullEl.innerHTML = html;
}

function renderCommunityFeed() {
  const feedEl = document.getElementById("community-feed");
  if (!feedEl) return;

  feedEl.innerHTML = communityFeed.map(post => `
    <div class="feed-item" style="border-bottom: 1px solid var(--clr-border); padding-bottom: 16px; margin-bottom: 16px;">
      <div class="feed-icon" style="background: rgba(34, 197, 94, 0.15); font-size:1.1rem;">👤</div>
      <div class="feed-details">
        <strong>${post.user}</strong>
        <p style="color:var(--clr-text-2); font-size:0.88rem; margin-top:4px;">${post.text}</p>
      </div>
      <div class="feed-meta">
        <span class="feed-time">${post.time}</span>
      </div>
    </div>
  `).join("");
}

/* =========================================================
   8. REAL-TIME CARBON CALCULATOR
   ========================================================= */
let activeCalcTab = "transport";
const carbonFactors = {
  // Transport factors: kg CO₂ / km
  "car-petrol": 0.21,
  "car-diesel": 0.17,
  "car-electric": 0.05,
  "bus": 0.08,
  "train": 0.04,
  "flight-short": 0.25,
  "flight-long": 0.19,
  "motorcycle": 0.11,
  "cycling": 0,
  
  // Food factors: kg CO₂ / serving
  "beef": 6.8,
  "lamb": 9.8,
  "pork": 3.0,
  "chicken": 1.7,
  "fish": 1.5,
  "dairy": 0.8,
  "vegan": 0.45,
  "vegetarian": 0.6,

  // Energy factors: kg CO₂ / unit (kWh / m³ / L)
  "electricity-uk": 0.21,
  "electricity-us": 0.39,
  "electricity-solar": 0.04,
  "gas": 2.0,
  "oil": 2.52,

  // Shopping factors: kg CO₂ / unit
  "clothing": 15,
  "electronics-phone": 70,
  "electronics-laptop": 300,
  "electronics-tv": 350,
  "furniture": 80,
  "books": 1
};

function initCalculator() {
  updateCalcResult();
}

function switchCalcTab(tabName, btnElement) {
  activeCalcTab = tabName;
  
  // Toggles active tab styles
  btnElement.parentElement.querySelectorAll(".calc-tab").forEach(tab => tab.classList.remove("active"));
  btnElement.classList.add("active");

  // Toggle forms visibility
  document.querySelectorAll(".calc-tab-content").forEach(content => content.classList.remove("active"));
  document.getElementById(`calc-${tabName}`).classList.add("active");

  updateCalcResult();
}

function updateCalcResult() {
  const resultNumEl = document.getElementById("result-num");
  const resultCtxEl = document.getElementById("result-context");
  const resultEquivEl = document.getElementById("result-equivalents");
  const resultTipEl = document.getElementById("result-tip");

  if (!resultNumEl) return;

  let co2 = 0;
  let summary = "";
  let equivalents = "";
  let tip = "";

  if (activeCalcTab === "transport") {
    const type = document.getElementById("calc-transport-type").value;
    const distance = parseFloat(document.getElementById("calc-distance").value) || 0;
    const passengers = Math.max(1, parseInt(document.getElementById("calc-passengers").value) || 1);
    
    co2 = (distance * carbonFactors[type]) / passengers;
    summary = `Transport footprint based on ${distance} km commute.`;
    
    if (type.startsWith("car-") && type !== "car-electric") {
      tip = "💡 Tip: Switching to public transit or cycling for this trip would save up to 80% of these emissions.";
    } else {
      tip = "🌿 Awesome: Low emission transit helps keep air clean!";
    }
  } 
  
  else if (activeCalcTab === "food") {
    const type = document.getElementById("calc-food-type").value;
    const servings = parseFloat(document.getElementById("calc-servings").value) || 0;
    
    co2 = servings * carbonFactors[type];
    summary = `Diet emissions for ${servings} serving(s) of ${type}.`;
    
    if (type === "beef" || type === "lamb") {
      tip = "💡 Tip: Replacing red meat with poultry, fish, or plant-based meals cuts diet emissions by 75%.";
    } else {
      tip = "🌿 Nice diet: Plant-based and vegetarian meals have a very low footprint!";
    }
  } 
  
  else if (activeCalcTab === "energy") {
    const type = document.getElementById("calc-energy-type").value;
    const amt = parseFloat(document.getElementById("calc-energy-amt").value) || 0;
    
    co2 = amt * carbonFactors[type];
    
    let unit = "kWh";
    if (type === "gas") unit = "m³";
    if (type === "oil") unit = "liters";
    document.getElementById("energy-unit").textContent = unit;

    summary = `Energy usage footprint for ${amt} ${unit} of fuel/power.`;
    tip = "💡 Tip: Turning heating down by 1°C or switching off idle appliances can reduce daily energy load by 10%.";
  } 
  
  else if (activeCalcTab === "shopping") {
    const type = document.getElementById("calc-shopping-type").value;
    const qty = parseFloat(document.getElementById("calc-qty").value) || 0;
    
    co2 = qty * carbonFactors[type];
    summary = `Retail purchase manufacturing footprint for ${qty} item(s).`;
    
    if (co2 > 50) {
      tip = "💡 Tip: Buying refurbished electronics or thrifting clothing extends product lifespans and saves CO₂.";
    } else {
      tip = "🌿 Eco-Friendly: Choosing durable, long-lasting products stops waste!";
    }
  }

  // Calculate equivalents
  // 1 smartphone charge ≈ 0.008 kg CO2
  // 1 tree absorption ≈ 0.05 kg CO2 per day
  const phoneCharges = Math.round(co2 / 0.008);
  const treeDays = Math.round(co2 / 0.05);

  equivalents = `⚡ Equivalent to charging <strong>${phoneCharges.toLocaleString()}</strong> smartphones.<br>🌳 Takes <strong>${treeDays}</strong> days for a tree to absorb.`;

  resultNumEl.textContent = co2.toFixed(1);
  resultCtxEl.textContent = summary;
  resultEquivEl.innerHTML = co2 > 0 ? equivalents : "Enter details to see your emission";
  resultTipEl.textContent = co2 > 0 ? tip : "";
}

function logActivity() {
  const resultVal = parseFloat(document.getElementById("result-num").textContent);
  if (resultVal <= 0) {
    showToast("⚠️ Please enter a valid distance, amount, or count.");
    return;
  }

  let title = "Logged Activity";
  let desc = "";

  if (activeCalcTab === "transport") {
    const type = document.getElementById("calc-transport-type").options[document.getElementById("calc-transport-type").selectedIndex].text.split(" —")[0];
    const dist = document.getElementById("calc-distance").value;
    title = `Trip logged: ${type}`;
    desc = `${dist} km trip recorded`;
  } else if (activeCalcTab === "food") {
    const type = document.getElementById("calc-food-type").options[document.getElementById("calc-food-type").selectedIndex].text.split(" —")[0];
    const servs = document.getElementById("calc-servings").value;
    title = `Meal logged: ${type}`;
    desc = `${servs} portion(s)`;
  } else if (activeCalcTab === "energy") {
    const type = document.getElementById("calc-energy-type").options[document.getElementById("calc-energy-type").selectedIndex].text.split(" —")[0];
    const amt = document.getElementById("calc-energy-amt").value;
    const unit = document.getElementById("energy-unit").textContent;
    title = `Energy logged: ${type}`;
    desc = `${amt} ${unit} usage`;
  } else if (activeCalcTab === "shopping") {
    const type = document.getElementById("calc-shopping-type").options[document.getElementById("calc-shopping-type").selectedIndex].text.split(" —")[0];
    const qty = document.getElementById("calc-qty").value;
    title = `Purchase logged: ${type}`;
    desc = `${qty} unit(s)`;
  }

  // Create new log item
  const newLog = {
    id: Date.now(),
    type: activeCalcTab,
    title: title,
    desc: desc,
    co2: `${resultVal.toFixed(1)} kg`,
    time: "Just now"
  };

  // Add to activity logs array
  activityLogs.unshift(newLog);
  renderActivityLog();

  // Update annual footprint estimate (scaled from log value)
  // Let's assume logging adds slightly to annual baseline depending on type
  // Wait, logging an action (like bus instead of car) reduces baseline.
  // Logging a standard high-co2 item increases baseline.
  // Let's increment baseline slightly for high-impact logs.
  const tCO2e = resultVal / 1000; // convert kg to tonnes
  user.categories[activeCalcTab] = parseFloat((user.categories[activeCalcTab] + tCO2e).toFixed(2));
  user.score = parseFloat((user.score + tCO2e).toFixed(1));
  user.coins += 20; // 20 coins for logging

  // Save to local storage
  localStorage.setItem("tv_user", JSON.stringify(user));
  initUserData();
  renderLeaderboard();

  // Clear inputs
  if (document.getElementById("calc-distance")) document.getElementById("calc-distance").value = "";
  if (document.getElementById("calc-energy-amt")) document.getElementById("calc-energy-amt").value = "";

  showToast(`✅ Activity Logged! +20 GreenCoins earned!`);
  updateChartsData();
}

function updateChartsData() {
  if (charts.category) {
    charts.category.data.datasets[0].data = [
      user.categories.transport,
      user.categories.food,
      user.categories.energy,
      user.categories.shopping
    ];
    charts.category.update();
    renderCategoryLegend();
  }

  if (charts.radar) {
    charts.radar.data.datasets[0].data = [
      user.categories.transport,
      user.categories.food,
      user.categories.energy,
      user.categories.shopping
    ];
    charts.radar.update();
  }

  if (charts.benchmark) {
    charts.benchmark.data.datasets[0].data[3] = user.score;
    charts.benchmark.update();
  }
}

/* =========================================================
   9. CERTIFIED OFFSET PROJECTS HUB
   ========================================================= */
function offsetProject(costPerTonne, projectName) {
  // Let's ask how many tonnes to offset
  const inputTonne = prompt(`How many tonnes of CO₂ would you like to offset with the ${projectName}?\nCost: $${costPerTonne}/tonne.`, "1.0");
  if (inputTonne === null) return;
  
  const tonnes = parseFloat(inputTonne);
  if (isNaN(tonnes) || tonnes <= 0) {
    alert("Please enter a valid number of tonnes.");
    return;
  }

  const cost = tonnes * costPerTonne;
  const confirmPayment = confirm(`Confirm payment of $${cost.toFixed(2)} to purchase ${tonnes} tCO₂e offsets?`);
  if (!confirmPayment) return;

  // Subtract offset tonnes from baseline
  user.score = Math.max(0.0, user.score - tonnes);
  
  // Allocate reduction across categories
  const factor = user.score > 0 ? (user.score - tonnes) / user.score : 0;
  user.categories.transport = parseFloat((user.categories.transport * factor).toFixed(2));
  user.categories.food = parseFloat((user.categories.food * factor).toFixed(2));
  user.categories.energy = parseFloat((user.categories.energy * factor).toFixed(2));
  user.categories.shopping = parseFloat((user.categories.shopping * factor).toFixed(2));

  user.coins += Math.round(tonnes * 500); // 500 points per tonne offset
  user.trees += Math.round(tonnes * 5); // 5 trees planted per tonne

  localStorage.setItem("tv_user", JSON.stringify(user));
  initUserData();
  renderLeaderboard();
  updateChartsData();

  // Log to feed
  const newLog = {
    id: Date.now(),
    type: "energy",
    title: `Offset: ${projectName}`,
    desc: `Purchased ${tonnes} tCO₂e offset credits`,
    co2: `-${(tonnes * 1000).toFixed(0)} kg`,
    time: "Just now"
  };
  activityLogs.unshift(newLog);
  renderActivityLog();

  showToast(`🌱 Net Zero Certified! Offset ${tonnes}t CO₂. Planted ${Math.round(tonnes * 5)} trees.`);
}

/* =========================================================
   10. GREENAI INTELLIGENT BOT CHAT PANEL
   ========================================================= */
function askAI(questionText) {
  const input = document.getElementById("chat-input");
  if (input) {
    input.value = questionText;
    // Trigger form submit
    const form = document.getElementById("chat-form");
    if (form) {
      const e = { preventDefault: () => {} };
      handleChatSubmit(e);
    }
  }
}

function handleChatSubmit(event) {
  event.preventDefault();
  const input = document.getElementById("chat-input");
  const msgWrap = document.getElementById("chat-messages");
  if (!input || !msgWrap) return;

  const query = input.value.trim();
  if (!query) return;

  // Add User Bubble
  appendChatBubble("user", query);
  input.value = "";

  // Show Loading Dot Bot Bubble
  const botBubble = appendChatBubble("bot", "Thinking...");

  // Contextual smart mock AI reply
  setTimeout(() => {
    const reply = getAIResponse(query.toLowerCase());
    botBubble.querySelector(".bubble-content").innerHTML = reply;
    msgWrap.scrollTop = msgWrap.scrollHeight;
  }, 1000);
}

function appendChatBubble(sender, text) {
  const msgWrap = document.getElementById("chat-messages");
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${sender}-bubble`;

  const avatar = sender === "bot" ? "🤖" : user.avatar;
  const avatarHtml = `<div class="${sender}-avatar">${avatar}</div>`;
  const contentHtml = `<div class="bubble-content"><p>${text}</p></div>`;

  bubble.innerHTML = sender === "bot" ? avatarHtml + contentHtml : contentHtml + avatarHtml;
  msgWrap.appendChild(bubble);
  msgWrap.scrollTop = msgWrap.scrollHeight;
  return bubble;
}

function getAIResponse(query) {
  // Read details from user profile
  const footprintVal = user.score.toFixed(1);
  const transVal = user.categories.transport.toFixed(1);
  const foodVal = user.categories.food.toFixed(1);
  const energyVal = user.categories.energy.toFixed(1);

  if (query.includes("transport") || query.includes("car") || query.includes("commute")) {
    return `
      <p>Hey ${user.name.split(" ")[0]}, your transportation carbon score is currently <strong>${transVal} tCO₂e/yr</strong> (about ${Math.round((transVal/footprintVal)*100)}% of your total footprint).</p>
      <p>Here are custom options for you based on ${user.location} stats:</p>
      <ul>
        <li>🚴 <strong>Cycle commute</strong>: swapping the car for a bike 2 days a week saves ~0.4t CO₂ annually.</li>
        <li>🚌 <strong>Muni / BART transit</strong>: riding public transit instead of driving reduces travel emissions by 82%.</li>
        <li>🔌 <strong>EV Charging</strong>: charging your car using clean energy reduces footprints by 70% compared to gasoline.</li>
      </ul>
    `;
  }

  if (query.includes("diet") || query.includes("meat") || query.includes("food")) {
    return `
      <p>Dietary footprint accounts for <strong>${foodVal} tCO₂e/yr</strong> of your emissions. Beef and dairy carry the highest footprint.</p>
      <p>Try these science-backed shifts:</p>
      <ul>
        <li>🌱 <strong>Meatless Mondays</strong>: Swapping beef for beans/tofu 1 day a week reduces diet emissions by 15%.</li>
        <li>🧀 <strong>Dairy alternatives</strong>: oat milk has 80% less climate impact than cow's milk.</li>
        <li>🥗 <strong>Join community challenges</strong>: the active 30-Day Meatless Challenge awards 50 GreenCoins daily!</li>
      </ul>
    `;
  }

  if (query.includes("energy") || query.includes("home") || query.includes("electricity")) {
    return `
      <p>Your home energy footprint is <strong>${energyVal} tCO₂e/yr</strong>. Most of this comes from grid electricity and heating.</p>
      <p>Quick wins to save coins and carbon:</p>
      <ul>
        <li>🌡️ <strong>Smart Thermostats</strong>: lower heating setting by 1 degree to save 300kg CO₂ annually.</li>
        <li>🔌 <strong>Vampire draw</strong>: standby power on TVs/appliances makes up 5% of household utility electricity. Unplug them!</li>
        <li>☀️ <strong>Renewable offsets</strong>: solar grids produce 90% less carbon than coal stations.</li>
      </ul>
    `;
  }

  if (query.includes("weekly") || query.includes("report") || query.includes("sustainability")) {
    return `
      <p>📊 <strong>TerraVerde Weekly Sustainability Summary</strong>:</p>
      <ul>
        <li>👣 Annual Footprint: <strong>${footprintVal} tCO₂e</strong></li>
        <li>🔥 Streak: <strong>${user.streak} days</strong> active!</li>
        <li>🌲 Tree absorption: <strong>${user.trees} trees</strong> sequestering 0.3t/yr</li>
        <li>🪙 Active GreenCoins: <strong>${user.coins.toLocaleString()} pts</strong></li>
      </ul>
      <p>Status: You are on track to meet your <strong>2.0t global target</strong>! Try setting up a smart energy schedule to hit the next tier.</p>
    `;
  }

  if (query.includes("offset") || query.includes("neutral")) {
    return `
      <p>Offsetting allows you to neutralize emissions that are difficult to avoid. Your offset target is <strong>${footprintVal} tCO₂e</strong>.</p>
      <p>I recommend visiting our **Offset Hub** page, where you can sponsor certified projects directly:</p>
      <ul>
        <li>🌳 <strong>Amazon Reforestation</strong>: Gold Standard verified ($18/tonne).</li>
        <li>🌊 <strong>Mangrove Restoration</strong>: restores coastlines and sequesters 4x more carbon than standard forests ($22/tonne).</li>
      </ul>
      <p>Purchasing offsets awards you GreenCoins and certificates!</p>
    `;
  }

  if (query.includes("plan") || query.includes("net zero")) {
    return `
      <p>Let's map out a <strong>30-Day Net Zero plan</strong> for you, ${user.name.split(" ")[0]}:</p>
      <ol>
        <li><strong>Week 1: Transit swap</strong>. Switch 2 commutes to public transit. (saves ~0.1t)</li>
        <li><strong>Week 2: Vegan Lunch</strong>. Have plant-based dinners 3x/week. (saves ~0.08t)</li>
        <li><strong>Week 3: Power audits</strong>. Install smart power plugs and turn off standbys. (saves ~0.05t)</li>
        <li><strong>Week 4: Reforest offset</strong>. Neutralize the remaining target on Offset Hub.</li>
      </ol>
      <p>Completing these steps will rank you in the top 5% of the leaderboard!</p>
    `;
  }

  return `
    <p>Interesting question! As GreenAI, I analyze your carbon entries across categories.</p>
    <p>To help you best, you can ask me:</p>
    <ul>
      <li>🚗 "How can I reduce my transport footprint?"</li>
      <li>🥗 "What foods have the lowest emissions?"</li>
      <li>⚡ "Show me my weekly report"</li>
      <li>🎯 "Create a net-zero plan for me"</li>
    </ul>
  `;
}

/* =========================================================
   11. SETTINGS & PROFILE UPDATES
   ========================================================= */
function saveSettings() {
  const nameVal = document.getElementById("settings-name").value.trim();
  const locVal = document.getElementById("settings-location").value.trim();
  if (!nameVal) {
    showToast("⚠️ Name cannot be blank.");
    return;
  }

  user.name = nameVal;
  if (locVal) user.location = locVal;
  
  // Re-generate initials for avatar
  const parts = nameVal.split(" ");
  user.avatar = parts[0][0].toUpperCase() + (parts[1] ? parts[1][0] : "").toUpperCase();

  localStorage.setItem("tv_user", JSON.stringify(user));
  initUserData();
  renderLeaderboard();
  showToast("⚙️ Profile settings updated successfully!");
}

/* =========================================================
   12. TOAST NOTIFICATION LAYER
   ========================================================= */
function showToast(message) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;

  container.appendChild(toast);
  
  // Fade in
  setTimeout(() => toast.classList.add("show"), 10);

  // Fade out & remove
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* =========================================================
   13. MODAL AND FILTER EVENT HANDLERS
   ========================================================= */
function openLogModal(category) {
  const modal = document.getElementById("log-modal");
  const title = document.getElementById("modal-title");
  const body = document.getElementById("modal-body");
  if (!modal || !title || !body) return;

  modal.removeAttribute("hidden");
  title.textContent = `Log ${category.charAt(0).toUpperCase() + category.slice(1)} Activity`;
  
  const calcSource = document.getElementById(`calc-${category}`);
  if (calcSource) {
    body.innerHTML = `
      <div class="modal-form-container" data-modal-category="${category}">
        ${calcSource.innerHTML}
        <button class="btn btn-primary btn-full" style="margin-top: 20px;" onclick="submitModalActivity('${category}')">
          ✅ Log Activity & Save
        </button>
      </div>
    `;
    
    // Set default value for passengers if it exists in the cloned HTML
    const passengersInput = body.querySelector("#calc-passengers");
    if (passengersInput) passengersInput.value = "1";
    
    // Set default value for servings/qty/energy
    const servingsInput = body.querySelector("#calc-servings");
    if (servingsInput) servingsInput.value = "1";
    const qtyInput = body.querySelector("#calc-qty");
    if (qtyInput) qtyInput.value = "1";
    
    // If energy grid, ensure suffix unit label is correctly linked
    if (category === "energy") {
      const typeSelect = body.querySelector("select");
      const unitLabel = body.querySelector("#energy-unit");
      
      const updateUnit = () => {
        const val = typeSelect.value;
        let unit = "kWh";
        if (val === "gas") unit = "m³";
        if (val === "oil") unit = "liters";
        if (unitLabel) unitLabel.textContent = unit;
      };
      
      typeSelect.addEventListener("change", updateUnit);
      updateUnit();
    }
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.setAttribute("hidden", "");
}

function submitModalActivity(category) {
  const body = document.getElementById("modal-body");
  if (!body) return;

  let co2 = 0;
  let title = "Logged Activity";
  let desc = "";

  if (category === "transport") {
    const typeSelect = body.querySelector("select");
    const type = typeSelect.value;
    const typeText = typeSelect.options[typeSelect.selectedIndex].text.split(" —")[0];
    const distanceInput = body.querySelector("#calc-distance");
    const distance = parseFloat(distanceInput ? distanceInput.value : 0) || 0;
    const passengersInput = body.querySelector("#calc-passengers");
    const passengers = Math.max(1, parseInt(passengersInput ? passengersInput.value : 1) || 1);
    
    if (distance <= 0) {
      showToast("⚠️ Please enter a valid distance.");
      return;
    }
    
    co2 = (distance * carbonFactors[type]) / passengers;
    title = `Trip logged: ${typeText}`;
    desc = `${distance} km trip recorded`;
  } 
  
  else if (category === "food") {
    const typeSelect = body.querySelector("select");
    const type = typeSelect.value;
    const typeText = typeSelect.options[typeSelect.selectedIndex].text.split(" —")[0];
    const servingsInput = body.querySelector("#calc-servings");
    const servings = parseFloat(servingsInput ? servingsInput.value : 0) || 0;
    
    if (servings <= 0) {
      showToast("⚠️ Please enter a valid serving count.");
      return;
    }
    
    co2 = servings * carbonFactors[type];
    title = `Meal logged: ${typeText}`;
    desc = `${servings} portion(s)`;
  } 
  
  else if (category === "energy") {
    const typeSelect = body.querySelector("select");
    const type = typeSelect.value;
    const typeText = typeSelect.options[typeSelect.selectedIndex].text.split(" —")[0];
    const amtInput = body.querySelector("#calc-energy-amt");
    const amt = parseFloat(amtInput ? amtInput.value : 0) || 0;
    
    if (amt <= 0) {
      showToast("⚠️ Please enter a valid energy amount.");
      return;
    }
    
    co2 = amt * carbonFactors[type];
    
    let unit = "kWh";
    if (type === "gas") unit = "m³";
    if (type === "oil") unit = "liters";

    title = `Energy logged: ${typeText}`;
    desc = `${amt} ${unit} usage`;
  } 
  
  else if (category === "shopping") {
    const typeSelect = body.querySelector("select");
    const type = typeSelect.value;
    const typeText = typeSelect.options[typeSelect.selectedIndex].text.split(" —")[0];
    const qtyInput = body.querySelector("#calc-qty");
    const qty = parseFloat(qtyInput ? qtyInput.value : 0) || 0;
    
    if (qty <= 0) {
      showToast("⚠️ Please enter a valid quantity.");
      return;
    }
    
    co2 = qty * carbonFactors[type];
    title = `Purchase logged: ${typeText}`;
    desc = `${qty} unit(s)`;
  }

  // Create new log item
  const newLog = {
    id: Date.now(),
    type: category,
    title: title,
    desc: desc,
    co2: `${co2.toFixed(1)} kg`,
    time: "Just now"
  };

  // Add to activity logs
  activityLogs.unshift(newLog);
  renderActivityLog();

  // Update annual footprint estimate
  const tCO2e = co2 / 1000;
  user.categories[category] = parseFloat((user.categories[category] + tCO2e).toFixed(2));
  user.score = parseFloat((user.score + tCO2e).toFixed(1));
  user.coins += 20;

  // Save to local storage
  localStorage.setItem("tv_user", JSON.stringify(user));
  initUserData();
  renderLeaderboard();

  closeModal("log-modal");
  showToast(`✅ Activity Logged! +20 GreenCoins earned!`);
  updateChartsData();
}

function filterActions(category, tabBtn) {
  // Update tabs active state
  tabBtn.parentElement.querySelectorAll(".filter-tab").forEach(tab => tab.classList.remove("active"));
  tabBtn.classList.add("active");

  const fullGridEl = document.getElementById("actions-full-grid");
  if (!fullGridEl) return;

  const filtered = category === "all" 
    ? todayActions 
    : todayActions.filter(a => a.category === category);

  fullGridEl.innerHTML = filtered.map(action => {
    let icon = "🚗";
    if (action.category === "food") icon = "🥗";
    else if (action.category === "energy") icon = "⚡";

    return `
      <div class="feature-card reveal-up ${action.done ? 'action-done' : ''}" style="display:flex; flex-direction:column; gap:12px; padding:24px;">
        <div class="feature-icon-wrap" style="margin-bottom:0px; background: rgba(34,197,94,0.15)">
          <span>${icon}</span>
        </div>
        <h3>${action.title}</h3>
        <p>Complete this challenge to earn points and shrink your carbon score.</p>
        <div style="margin-top:auto; display:flex; justify-content:space-between; align-items:center;">
          <span style="color:var(--clr-green-light); font-weight:600;">-${action.impact}</span>
          <button class="btn ${action.done ? 'btn-ghost' : 'btn-primary'} btn-sm" onclick="toggleAction(${action.id})">
            ${action.done ? 'Completed ✓' : 'Complete Challenge'}
          </button>
        </div>
      </div>
    `;
  }).join("");
}
