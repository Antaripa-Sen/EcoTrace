/**
 * TERRAVERDE — CORE & LANDING PAGE LOGIC
 * Includes:
 * 1. Particle Canvas Background
 * 2. Rotating Dotted 3D Globe
 * 3. Intersection Observer Scroll Reveal
 * 4. Count-up Animation for Stats
 * 5. Testimonial Carousel Loop
 * 6. Responsive Mobile Navigation
 * 7. Session Helper Functions
 */

document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initParticles();
  initGlobe();
  initScrollReveal();
  initTestimonials();
  initLiveStats();
  initDemoUser();
});

/* =========================================================
   0. REAL-TIME LIVE STATS & DEMO USER
   ========================================================= */
function initLiveStats() {
  // Fetch real stats from localStorage and update hero
  const allUsers = JSON.parse(localStorage.getItem("tv_all_users")) || [];
  const totalCO2 = allUsers.reduce((sum, u) => sum + (u.score || 0), 0);
  const totalTrees = allUsers.reduce((sum, u) => sum + (u.trees || 0), 0);
  const userCount = allUsers.length || 120000;
  
  const usersEl = document.getElementById("stat-users");
  const co2El = document.getElementById("stat-co2");
  const treesEl = document.getElementById("stat-trees");
  
  if (usersEl) usersEl.textContent = userCount.toLocaleString();
  if (co2El) co2El.textContent = (totalCO2 / 1000).toFixed(1);
  if (treesEl) treesEl.textContent = totalTrees.toLocaleString();
  
  // Update demo cards
  updateDemoCards();
  
  // Refresh stats every 5 seconds
  setInterval(() => {
    updateDemoCards();
  }, 5000);
}

function initDemoUser() {
  // Create demo user for landing page if none exists
  if (!localStorage.getItem("tv_demo_user")) {
    const demoUser = {
      score: 4.2,
      streak: 21,
      trees: 14,
      trend: -12
    };
    localStorage.setItem("tv_demo_user", JSON.stringify(demoUser));
  }
}

function updateDemoCards() {
  const demoUser = JSON.parse(localStorage.getItem("tv_demo_user")) || { score: 4.2, streak: 21, trees: 14, trend: -12 };
  
  const footprintEl = document.getElementById("demo-footprint");
  const streakEl = document.getElementById("demo-streak");
  const treesEl = document.getElementById("demo-trees");
  const trendEl = document.getElementById("demo-trend");
  const streakDotsEl = document.getElementById("demo-streak-dots");
  
  if (footprintEl) footprintEl.textContent = demoUser.score.toFixed(1);
  if (streakEl) streakEl.textContent = demoUser.streak;
  if (treesEl) treesEl.textContent = demoUser.trees;
  
  if (trendEl) {
    const trendDir = demoUser.trend < 0 ? "down" : "up";
    const trendSymbol = demoUser.trend < 0 ? "▼" : "↑";
    trendEl.textContent = `${trendSymbol} ${Math.abs(demoUser.trend)}%`;
    trendEl.className = `card-trend ${trendDir}`;
  }
  
  if (streakDotsEl) {
    let dotsHTML = "";
    for (let i = 0; i < 7; i++) {
      const isActive = i < demoUser.streak % 7 ? "active" : "";
      dotsHTML += `<span class="dot ${isActive}"></span>`;
    }
    streakDotsEl.innerHTML = dotsHTML;
  }
}

/* =========================================================
   1. RESPONSIVE MOBILE NAVIGATION
   ========================================================= */
function initNavbar() {
  const navbar = document.getElementById("navbar");
  const hamburger = document.getElementById("nav-hamburger");
  const navLinks = document.getElementById("nav-links");

  if (!navbar) return;

  // Scroll effect
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });

  // Mobile menu toggle
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      hamburger.classList.toggle("active");
      navLinks.classList.toggle("open");
    });

    // Close mobile menu on link click
    navLinks.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        hamburger.classList.remove("active");
        navLinks.classList.remove("open");
      });
    });
  }
}

/* =========================================================
   2. PARTICLE BACKGROUND CANVAS
   ========================================================= */
function initParticles() {
  const canvas = document.getElementById("particle-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let particlesArray = [];
  let w = (canvas.width = window.innerWidth);
  let h = (canvas.height = window.innerHeight);

  window.addEventListener("resize", () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  });

  class Particle {
    constructor() {
      this.x = Math.random() * w;
      this.y = Math.random() * h;
      this.size = Math.random() * 2 + 1;
      this.speedX = Math.random() * 0.4 - 0.2;
      this.speedY = Math.random() * 0.4 - 0.2;
      // Slightly green-tinted white particles
      this.color = `rgba(34, 197, 94, ${Math.random() * 0.2 + 0.15})`;
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;

      if (this.x > w || this.x < 0) this.speedX *= -1;
      if (this.y > h || this.y < 0) this.speedY *= -1;
    }

    draw() {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function init() {
    particlesArray = [];
    const count = Math.min(60, Math.floor((w * h) / 20000));
    for (let i = 0; i < count; i++) {
      particlesArray.push(new Particle());
    }
  }

  function animate() {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < particlesArray.length; i++) {
      particlesArray[i].update();
      particlesArray[i].draw();

      // Connect particles
      for (let j = i; j < particlesArray.length; j++) {
        const dx = particlesArray[i].x - particlesArray[j].x;
        const dy = particlesArray[i].y - particlesArray[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 120) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(34, 197, 94, ${(1 - distance / 120) * 0.08})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(particlesArray[i].x, particlesArray[i].y);
          ctx.lineTo(particlesArray[j].x, particlesArray[j].y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(animate);
  }

  init();
  animate();
}

/* =========================================================
   3. ROTATING DOTTED 3D GLOBE
   ========================================================= */
function initGlobe() {
  const canvas = document.getElementById("globe-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.38;

  let points = [];
  const rings = 14;
  const pointsPerRing = 24;
  let angleY = 0; // Rotation angle

  // Create points on a 3D sphere
  for (let i = 0; i < rings; i++) {
    const phi = (Math.PI * (i + 1)) / (rings + 1); // Latitude angle (0 to PI)
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    for (let j = 0; j < pointsPerRing; j++) {
      const theta = (Math.PI * 2 * j) / pointsPerRing; // Longitude angle (0 to 2PI)
      const x = radius * sinPhi * Math.cos(theta);
      const y = radius * cosPhi;
      const z = radius * sinPhi * Math.sin(theta);
      points.push({ x, y, z });
    }
  }

  // Draw loop
  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Sort points by depth (Z axis) for simple 3D occlusion
    const rotatedPoints = points.map(p => {
      // Rotate around Y axis
      const cosA = Math.cos(angleY);
      const sinA = Math.sin(angleY);
      const rx = p.x * cosA - p.z * sinA;
      const rz = p.x * sinA + p.z * cosA;

      return { x: rx, y: p.y, z: rz };
    });

    // Sort points back-to-front (smaller Z is farther, larger Z is closer)
    rotatedPoints.sort((a, b) => a.z - b.z);

    // Draw grid lines
    ctx.lineWidth = 0.5;

    rotatedPoints.forEach(p => {
      // Simple orthographic projection
      // Calculate depth shading
      const intensity = (p.z + radius) / (radius * 2); // 0 (back) to 1 (front)
      const size = Math.max(1, (p.z + radius) * 0.015 + 1); // Size based on depth

      // Map color based on coordinates
      // Front points are bright green/teal, back points are dark/greenish
      if (p.z > -10) {
        ctx.fillStyle = `rgba(34, 197, 94, ${intensity * 0.75 + 0.1})`; // Green
      } else {
        ctx.fillStyle = `rgba(6, 182, 212, ${intensity * 0.45 + 0.05})`; // Teal
      }

      ctx.beginPath();
      ctx.arc(cx + p.x, cy + p.y, size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Slowly rotate
    angleY += 0.003;
    requestAnimationFrame(draw);
  }

  draw();
}

/* =========================================================
   4. SCROLL REVEAL & COUNT-UP STATS
   ========================================================= */
function initScrollReveal() {
  const revealElements = document.querySelectorAll(
    ".reveal-up, .reveal-left, .reveal-right"
  );
  const counterElements = document.querySelectorAll(".stat-num, .counter");

  // Setup intersection observer
  const observerOptions = {
    root: null,
    threshold: 0.15,
    rootMargin: "0px 0px -50px 0px"
  };

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target); // Trigger only once
      }
    });
  }, observerOptions);

  revealElements.forEach(el => revealObserver.observe(el));

  // Counter animations on reveal
  const counterObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseFloat(el.getAttribute("data-target"));
        const suffix = el.getAttribute("data-suffix") || "";
        const duration = 2000; // 2 seconds
        let startTime = null;

        function animateCount(timestamp) {
          if (!startTime) startTime = timestamp;
          const progress = Math.min((timestamp - startTime) / duration, 1);
          let currentVal = progress * target;

          // Format value
          if (target % 1 === 0) {
            el.textContent = Math.floor(currentVal).toLocaleString() + suffix;
          } else {
            el.textContent = currentVal.toFixed(1) + suffix;
          }

          if (progress < 1) {
            requestAnimationFrame(animateCount);
          } else {
            el.textContent = target.toLocaleString() + suffix;
            // Hook up live dynamic ticking increments
            startLiveTicking(el, target, suffix);
          }
        }

        requestAnimationFrame(animateCount);
        observer.unobserve(el);
      }
    });
  }, observerOptions);

  counterElements.forEach(counter => counterObserver.observe(counter));
}

function startLiveTicking(el, initialVal, suffix) {
  let currentVal = initialVal;
  
  if (suffix === "") { // Active Users
    setInterval(() => {
      currentVal += Math.floor(Math.random() * 3) + 1;
      el.textContent = currentVal.toLocaleString() + suffix;
    }, 4000);
  } else if (suffix === "T") { // CO2 Saved
    setInterval(() => {
      currentVal += 0.1;
      el.textContent = currentVal.toFixed(1) + suffix;
    }, 2500);
  } else if (suffix === "%") { // Accuracy
    setInterval(() => {
      const fluctuation = (Math.random() * 0.5 - 0.25);
      const val = Math.min(100, Math.max(90, 97.4 + fluctuation));
      el.textContent = val.toFixed(1) + suffix;
    }, 5000);
  }
}

/* =========================================================
   5. TESTIMONIAL CAROUSEL LOOP
   ========================================================= */
function initTestimonials() {
  const inner = document.getElementById("testimonials-inner");
  if (!inner) return;

  // Duplicate cards to ensure infinite loop
  const cards = Array.from(inner.children);
  cards.forEach(card => {
    const clone = card.cloneNode(true);
    inner.appendChild(clone);
  });

  // Pause scrolling on hover
  inner.addEventListener("mouseenter", () => {
    inner.style.animationPlayState = "paused";
  });

  inner.addEventListener("mouseleave", () => {
    inner.style.animationPlayState = "running";
  });
}
