/**
 * TERRAVERDE — REAL-TIME LIVE HANDLERS
 * Handles challenges, offsets, and live leaderboard updates
 */

// ========================================================
// COMMUNITY CHALLENGES - REAL-TIME PARTICIPATION
// ========================================================

let userChallenges = JSON.parse(localStorage.getItem("tv_user_challenges")) || {};

function joinChallenge(challengeId, challengeName) {
  if (!userChallenges) userChallenges = {};
  
  if (userChallenges[challengeId]) {
    showToast(`✓ You're already participating in ${challengeName}`);
    return;
  }

  // Join challenge
  userChallenges[challengeId] = {
    name: challengeName,
    joinedDate: new Date().toISOString(),
    progress: 0,
    status: "active"
  };

  localStorage.setItem("tv_user_challenges", JSON.stringify(userChallenges));
  showToast(`🔥 Joined ${challengeName}! Track your progress on the dashboard.`);
  
  // Update UI
  const buttons = document.querySelectorAll(`[onclick*="joinChallenge('${challengeId}']`);
  buttons.forEach(btn => {
    btn.textContent = "✓ Joined";
    btn.disabled = true;
    btn.classList.add("joined");
  });
}

// ========================================================
// LIVE GLOBAL STATS AGGREGATION
// ========================================================

function getGlobalStats() {
  // Aggregate all users from localStorage
  const allUsersStr = localStorage.getItem("tv_all_users");
  const allUsers = allUsersStr ? JSON.parse(allUsersStr) : [];
  
  if (allUsers.length === 0) {
    // Return defaults + current user
    const currentUser = JSON.parse(localStorage.getItem("tv_user")) || { score: 4.2, trees: 14 };
    return {
      totalUsers: 120000,
      totalCO2Saved: (currentUser.score * 0.5).toFixed(1), // Rough estimate
      totalTrees: (currentUser.trees || 0) + 52000,
      mwhClean: 340
    };
  }

  const totalCO2 = allUsers.reduce((sum, u) => sum + (u.score || 0), 0);
  const totalTrees = allUsers.reduce((sum, u) => sum + (u.trees || 0), 0);

  return {
    totalUsers: allUsers.length,
    totalCO2Saved: (totalCO2 * 0.5).toFixed(1),
    totalTrees: totalTrees,
    mwhClean: Math.round((totalCO2 * 0.4) / 100) * 100
  };
}

// ========================================================
// AUTO-UPDATE LEADERBOARD EVERY 10 SECONDS
// ========================================================

function startLiveLeaderboardUpdates() {
  setInterval(() => {
    if (typeof renderLeaderboard === 'function' && document.getElementById("leaderboard-list")) {
      renderLeaderboard();
    }
  }, 10000); // Every 10 seconds
}

// ========================================================
// REAL-TIME STREAK TRACKING
// ========================================================

function updateStreak() {
  const user = JSON.parse(localStorage.getItem("tv_user"));
  if (!user) return;

  const lastActive = localStorage.getItem("tv_last_active");
  const today = new Date().toDateString();

  if (lastActive !== today) {
    // New day - increment streak if they logged activity
    const activityLogs = JSON.parse(localStorage.getItem("tv_activity_logs")) || [];
    if (activityLogs.length > 0) {
      const lastLogTime = new Date(activityLogs[0]?.timestamp || new Date());
      const hoursSinceLog = (new Date() - lastLogTime) / (1000 * 60 * 60);
      
      if (hoursSinceLog < 24) {
        user.streak = (user.streak || 0) + 1;
      } else {
        user.streak = 1; // Reset streak if no activity today
      }
    }
    
    localStorage.setItem("tv_last_active", today);
    localStorage.setItem("tv_user", JSON.stringify(user));
  }
}

// ========================================================
// DAILY RESET - Reset actions & streaks daily
// ========================================================

function handleDailyReset() {
  const user = JSON.parse(localStorage.getItem("tv_user"));
  const lastReset = localStorage.getItem("tv_last_reset");
  const today = new Date().toDateString();

  if (lastReset !== today) {
    // Reset actions for the day
    localStorage.setItem("tv_daily_actions_done", "false");
    localStorage.setItem("tv_last_reset", today);
    
    // Check streak
    updateStreak();
  }
}

// ========================================================
// REAL-TIME CO2 OFFSET CALCULATOR
// ========================================================

function calculateOffsetNeeded() {
  const user = JSON.parse(localStorage.getItem("tv_user"));
  if (!user) return 0;

  // Global target: 2.0 tCO2e per year
  const globalTarget = 2.0;
  const remaining = Math.max(0, user.score - globalTarget);
  
  return remaining.toFixed(2);
}

function calculateOffsetCost(tonnes, pricePerTonne = 20) {
  return (tonnes * pricePerTonne).toFixed(2);
}

// ========================================================
// LIVE ACTIVITY LOGGING WITH PERSISTENCE
// ========================================================

function persistActivityLog(activity) {
  const logs = JSON.parse(localStorage.getItem("tv_activity_logs")) || [];
  
  const logEntry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    type: activity.type,
    title: activity.title,
    description: activity.description,
    co2kg: activity.co2kg,
    coins: activity.coins || 20,
    userId: localStorage.getItem("tv_user_email") || "demo"
  };

  logs.unshift(logEntry);
  
  // Keep only last 100 logs
  if (logs.length > 100) logs.pop();
  
  localStorage.setItem("tv_activity_logs", JSON.stringify(logs));
  return logEntry;
}

// ========================================================
// AUTO-SAVE EVERY 30 SECONDS
// ========================================================

function enableAutoSave() {
  setInterval(() => {
    const user = JSON.parse(localStorage.getItem("tv_user"));
    if (user) {
      // Sync to localStorage (already done, but this ensures consistency)
      localStorage.setItem("tv_user", JSON.stringify(user));
    }
  }, 30000);
}

// ========================================================
// REAL-TIME NOTIFICATIONS FOR MILESTONES
// ========================================================

function checkMilestones() {
  const user = JSON.parse(localStorage.getItem("tv_user"));
  if (!user) return;

  const milestones = [
    { score: 2.0, title: "Carbon Neutral Champion", emoji: "🏆", reached: false },
    { score: 3.0, title: "Eco Explorer", emoji: "🌍", reached: false },
    { score: 4.0, title: "Green Guardian", emoji: "🛡️", reached: false },
    { trees: 10, title: "Tree Planter", emoji: "🌳", reached: false },
    { trees: 50, title: "Forest Grower", emoji: "🌲", reached: false },
    { streak: 7, title: "Week Warrior", emoji: "⚡", reached: false },
    { streak: 30, title: "Month Master", emoji: "🔥", reached: false }
  ];

  // Check each milestone
  milestones.forEach(milestone => {
    const storageKey = `milestone_${milestone.title}`;
    const alreadyReached = localStorage.getItem(storageKey);

    if (!alreadyReached) {
      if ((milestone.score && user.score <= milestone.score) || 
          (milestone.trees && user.trees >= milestone.trees) ||
          (milestone.streak && user.streak >= milestone.streak)) {
        showToast(`${milestone.emoji} Achievement Unlocked: ${milestone.title}!`);
        localStorage.setItem(storageKey, "true");
      }
    }
  });
}

// ========================================================
// INITIALIZE ALL REAL-TIME HANDLERS ON PAGE LOAD
// ========================================================

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    handleDailyReset();
    startLiveLeaderboardUpdates();
    enableAutoSave();
    checkMilestones();
  });
} else {
  handleDailyReset();
  startLiveLeaderboardUpdates();
  enableAutoSave();
  checkMilestones();
}

// Run milestone checks every minute
setInterval(checkMilestones, 60000);
