/* ==========================================================================
   Sthir — Bulletproof Infinite Loop Audio Engine
   ========================================================================== */

'use strict';

class SthirEngine {
  constructor() {
    this.audioTracks = {};
    this.masterRunning = false;
  }

  init() {
    if (Object.keys(this.audioTracks).length > 0) return;

    const sources = {
      rain: 'sounds/rain.mp3',
      thunder: 'sounds/thunder.mp3',
      forest: 'sounds/forest.mp3',
      wind: 'sounds/wind.mp3',
      beach: 'sounds/beach.mp3',
      crickets: 'sounds/crickets.mp3'
    };

    for (const [id, url] of Object.entries(sources)) {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.volume = 0.5;

      // Bulletproof infinite loop using ended event
      audio.addEventListener('ended', () => {
        if (audio.datasetPlaying === 'true' && this.masterRunning) {
          audio.currentTime = 0;
          audio.play().catch(e => console.log(`Loop error for ${id}:`, e));
        }
      });

      this.audioTracks[id] = {
        audio: audio,
        active: false,
        userVolume: 0.5
      };
    }
  }

  setMasterState(running) {
    this.masterRunning = running;
    for (const [id, track] of Object.entries(this.audioTracks)) {
      if (running && track.active) {
        this._playTrack(track);
      } else {
        this._pauseTrack(track);
      }
    }
  }

  setActive(id, active, volume) {
    const track = this.audioTracks[id];
    if (!track) return;
    
    track.active = active;
    track.userVolume = volume;
    track.audio.volume = volume;

    if (active && this.masterRunning) {
      this._playTrack(track);
    } else {
      this._pauseTrack(track);
    }
  }

  setVolume(id, volume) {
    const track = this.audioTracks[id];
    if (track) {
      track.userVolume = volume;
      track.audio.volume = volume;
    }
  }

  _playTrack(track) {
    track.audio.datasetPlaying = 'true';
    track.audio.currentTime = 0;
    track.audio.play().catch(e => console.log("Playback error:", e));
  }

  _pauseTrack(track) {
    track.audio.datasetPlaying = 'false';
    track.audio.pause();
  }
}

/* UI Logic and Binding */
(function () {
  const engine = new SthirEngine();
  const ids = ['rain', 'thunder', 'forest', 'wind', 'beach', 'crickets'];

  const masterDial = document.getElementById('masterDial');
  const masterIconPath = document.getElementById('masterIconPath');
  const masterLabel = document.getElementById('masterLabel');

  const PLAY_PATH = 'M8 5.5V18.5L19 12L8 5.5Z';
  const PAUSE_PATH = 'M8 5H10.5V19H8V5ZM13.5 5H16V19H13.5V5Z';

  let masterOn = false;
  let animationHandle = null;

  function setMasterVisual(on) {
    masterDial.classList.toggle('active', on);
    masterDial.setAttribute('aria-pressed', on ? 'true' : 'false');
    masterIconPath.setAttribute('d', on ? PAUSE_PATH : PLAY_PATH);
    masterLabel.textContent = on ? 'Playing — tap to pause' : 'Paused — tap to resume';
  }

  function createRipple(e, element) {
    const circle = document.createElement('span');
    const diameter = Math.max(element.clientWidth, element.clientHeight);
    const radius = diameter / 2;
    const rect = element.getBoundingClientRect();
    
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - rect.left - radius}px`;
    circle.style.top = `${e.clientY - rect.top - radius}px`;
    circle.classList.add('ripple');
    
    const existing = element.querySelector('.ripple');
    if (existing) existing.remove();
    element.appendChild(circle);
    
    setTimeout(() => circle.remove(), 500);
  }

  const cards = {};
  ids.forEach((id) => {
    cards[id] = {
      active: false,
      volume: 0.5,
      article: document.querySelector(`.card[data-sound="${id}"]`),
      toggle: document.querySelector(`[data-toggle="${id}"]`),
      slider: document.querySelector(`[data-slider="${id}"]`),
      canvas: document.querySelector(`[data-wave="${id}"]`),
    };
    cards[id].volume = Number(cards[id].slider.value) / 100;
    updateSliderFill(cards[id].slider);
  });

  function updateSliderFill(slider) {
    slider.style.setProperty('--fill', `${slider.value}%`);
  }

  function toggleMaster(e) {
    engine.init();
    masterOn = !masterOn;
    setMasterVisual(masterOn);
    engine.setMasterState(masterOn);
    if (masterOn) startVisualLoop();
    else stopVisualLoop();
  }

  masterDial.addEventListener('click', (e) => {
    createRipple(e, masterDial);
    toggleMaster(e);
  });

  ids.forEach((id) => {
    const c = cards[id];
    c.toggle.addEventListener('click', (e) => {
      createRipple(e, c.toggle);
      engine.init();
      if (!masterOn) {
        masterOn = true;
        setMasterVisual(true);
        engine.setMasterState(true);
        startVisualLoop();
      }

      c.active = !c.active;
      c.toggle.setAttribute('aria-pressed', c.active ? 'true' : 'false');
      c.article.classList.toggle('active', c.active);
      engine.setActive(id, c.active, c.volume);
    });

    c.slider.addEventListener('input', () => {
      updateSliderFill(c.slider);
      c.volume = Number(c.slider.value) / 100;
      engine.setVolume(id, c.volume);
    });
  });

  let phase = 0;
  function drawCard(id) {
    const c = cards[id];
    const ctx2d = c.canvas.getContext('2d');
    const w = c.canvas.width;
    const h = c.canvas.height;

    ctx2d.clearRect(0, 0, w, h);

    if (!c.active || !masterOn) {
      ctx2d.strokeStyle = 'rgba(158,194,173,0.2)';
      ctx2d.lineWidth = 1;
      ctx2d.beginPath();
      ctx2d.moveTo(0, h / 2);
      ctx2d.lineTo(w, h / 2);
      ctx2d.stroke();
      return;
    }

    const barCount = 20;
    const barWidth = w / barCount;
    const gradient = ctx2d.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#e2bc9d');
    gradient.addColorStop(1, '#38b070');
    ctx2d.fillStyle = gradient;

    for (let i = 0; i < barCount; i++) {
      const heightFactor = Math.abs(Math.sin(phase + i * 0.4)) * 0.7 + 0.3;
      const barHeight = Math.max(3, heightFactor * h * c.volume);
      const x = i * barWidth + barWidth * 0.25;
      const y = (h - barHeight) / 2;
      ctx2d.fillRect(x, y, barWidth * 0.5, barHeight);
    }
  }

  function visualTick() {
    phase += 0.08;
    ids.forEach(drawCard);
    animationHandle = requestAnimationFrame(visualTick);
  }

  function startVisualLoop() {
    if (!animationHandle) animationHandle = requestAnimationFrame(visualTick);
  }

  function stopVisualLoop() {
    if (animationHandle) {
      cancelAnimationFrame(animationHandle);
      animationHandle = null;
    }
    ids.forEach(drawCard);
  }

  ids.forEach(drawCard);
})();

/* ==========================================================================
   Sthir — Realistic Interactive Water Ripple Background Engine
   ========================================================================== */

class WaterRippleBackground {
  constructor() {
    this.canvas = document.getElementById('waterCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.ripples = [];
    this.lastX = 0;
    this.lastY = 0;
    this.lastTime = Date.now();
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    
    // Ambient continuous background ripples
    setInterval(() => {
      this.addRipple(Math.random() * this.width, Math.random() * this.height, 0.4);
    }, 1800);
    
    this.animate();
  }
  
  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }
  
  addRipple(x, y, intensity) {
    this.ripples.push({
      x: x,
      y: y,
      radius: 2,
      maxRadius: 35 + intensity * 50,
      opacity: 0.35 + Math.min(intensity * 0.08, 0.4),
      speed: 1.4
    });
  }
  
  handleMouseMove(e) {
    const now = Date.now();
    const dt = now - this.lastTime;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    const distance = Math.hypot(dx, dy);
    const speed = dt > 0 ? distance / dt : 0;
    
    // Mouse movement triggers ripples proportional to its speed
    if (speed > 0.4) {
      this.addRipple(e.clientX, e.clientY, speed * 1.8);
    }
    
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.lastTime = now;
  }
  
  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      let r = this.ripples[i];
      r.radius += r.speed;
      r.opacity -= 0.012;
      
      if (r.opacity <= 0 || r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1);
        continue;
      }
      
      // Outer Emerald Ripple Ring
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(56, 176, 112, ${r.opacity})`;
      this.ctx.lineWidth = 1.2;
      this.ctx.stroke();
      
      // Inner Champagne Gold Ring for Depth & Realism
      if (r.radius > 8) {
        this.ctx.beginPath();
        this.ctx.arc(r.x, r.y, r.radius - 6, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(226, 188, 157, ${r.opacity * 0.4})`;
        this.ctx.lineWidth = 0.8;
        this.ctx.stroke();
      }
    }
    
    requestAnimationFrame(() => this.animate());
  }
}

// Initialize the background ripple engine on load
window.addEventListener('DOMContentLoaded', () => {
  new WaterRippleBackground();
});

/* ==========================================================================
   Sthir — Realistic Liquid Water Refraction & Ripple Engine
   ========================================================================== */

class RealisticWaterBackground {
  constructor() {
    this.canvas = document.getElementById('waterCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.mouseX = window.innerWidth / 2;
    this.mouseY = window.innerHeight / 2;
    this.targetX = this.mouseX;
    this.targetY = this.mouseY;
    this.ripples = [];
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => {
      this.targetX = e.clientX;
      this.targetY = e.clientY;
      // Add intense splash on fast mouse movement
      const speed = Math.hypot(e.movementX, e.movementY);
      if (speed > 2) {
        this.ripples.push({
          x: e.clientX,
          y: e.clientY,
          radius: 5,
          maxRadius: 60 + speed * 3,
          alpha: 0.6
        });
      }
    });

    // Ambient natural water drops
    setInterval(() => {
      this.ripples.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 2,
        maxRadius: 40,
        alpha: 0.4
      });
    }, 2200);

    this.time = 0;
    this.animate();
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }

  animate() {
    this.time += 0.03;
    
    // Smooth mouse interpolation (fluid drag effect)
    this.mouseX += (this.targetX - this.mouseX) * 0.08;
    this.mouseY += (this.targetY - this.mouseY) * 0.08;

    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Render Liquid Refraction Waves
    const cols = Math.floor(this.width / 50) + 1;
    const rows = Math.floor(this.height / 50) + 1;

    for (let i = 0; i < this.ripples.length; i++) {
      let r = this.ripples[i];
      r.radius += 1.5;
      r.alpha -= 0.008;

      if (r.alpha <= 0 || r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1);
        i--;
        continue;
      }

      // Realistic Soft Water Refraction Rings with Gold/Emerald Highlights
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(226, 188, 157, ${r.alpha * 0.35})`; // Champagne Gold reflection
      this.ctx.lineWidth = 2.5;
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius * 0.75, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(56, 176, 112, ${r.alpha * 0.25})`; // Deep Emerald reflection
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
    }

    // 2. Dynamic Liquid Light Caustics / Reflections following mouse
    const gradient = this.ctx.createRadialGradient(
      this.mouseX, this.mouseY, 10,
      this.mouseX, this.mouseY, 350
    );
    gradient.addColorStop(0, 'rgba(56, 176, 112, 0.12)');
    gradient.addColorStop(0.5, 'rgba(226, 188, 157, 0.06)');
    gradient.addColorStop(1, 'transparent');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    requestAnimationFrame(() => this.animate());
  }
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
  new RealisticWaterBackground();
});