const gallery = document.querySelector('#memory-gallery');
const template = document.querySelector('#memory-card-template');
const musicButton = document.querySelector('#music-button');
const music = document.querySelector('#background-music');

const createElement = (tag, className) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
};

function showMissing(img, path) {
  const frame = img.closest('.media-frame, .reveal-media');
  const fallback = frame?.querySelector('.missing-media');
  if (!fallback) return;
  img.hidden = true;
  fallback.hidden = false;
  fallback.textContent = `Upload ${path} to GitHub`;
}

function addImage(container, path, alt) {
  const media = createElement('div', 'reveal-media');
  const img = createElement('img', 'reveal-image');
  const fallback = createElement('div', 'missing-media');
  fallback.hidden = true;
  img.src = path;
  img.alt = alt || 'A hidden memory';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.addEventListener('error', () => showMissing(img, path));
  media.append(img, fallback);
  container.append(media);
}

function addVideo(container, path, title) {
  const media = createElement('div', 'reveal-media');
  const video = createElement('video', 'memory-video');
  const fallback = createElement('div', 'missing-media');
  fallback.hidden = true;
  video.src = path;
  video.controls = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.setAttribute('aria-label', title || 'Memory video');
  video.addEventListener('error', () => {
    video.hidden = true;
    fallback.hidden = false;
    fallback.textContent = `Upload ${path} to GitHub`;
  });
  media.append(video, fallback);
  container.append(media);
}

function addText(container, text) {
  const copy = createElement('p', 'memory-copy');
  copy.textContent = text;
  container.append(copy);
}

function renderMemory(memory, index) {
  const card = template.content.firstElementChild.cloneNode(true);
  const frontImage = card.querySelector('.front-image');
  const frontFallback = card.querySelector('.missing-media');
  const backContent = card.querySelector('.back-content');
  const backButton = card.querySelector('.flip-back');

  frontImage.src = memory.image;
  frontImage.alt = memory.alt || `Memory ${index + 1}`;
  frontImage.addEventListener('error', () => {
    frontImage.hidden = true;
    frontFallback.hidden = false;
    frontFallback.textContent = `Upload ${memory.image} to GitHub`;
  });

  if (memory.revealImage) addImage(backContent, memory.revealImage, memory.revealAlt);
  if (memory.video) addVideo(backContent, memory.video, memory.title);
  if (memory.text) addText(backContent, memory.text);

  const setFlipped = (value) => {
    card.classList.toggle('is-flipped', value);
    card.setAttribute('aria-pressed', String(value));
    if (!value) {
      card.querySelectorAll('video').forEach(video => video.pause());
    }
  };

  card.addEventListener('click', (event) => {
    if (event.target.closest('video, .flip-back, button')) return;
    setFlipped(!card.classList.contains('is-flipped'));
  });

  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setFlipped(!card.classList.contains('is-flipped'));
    }
  });

  backButton.addEventListener('click', (event) => {
    event.stopPropagation();
    setFlipped(false);
  });

  gallery.append(card);
}

function setupMusic(config = {}) {
  if (!config.enabled || !config.src) return;
  music.src = config.src;
  musicButton.hidden = false;
  musicButton.textContent = `♫ ${config.buttonText || 'Play music'}`;

  musicButton.addEventListener('click', async () => {
    if (music.paused) {
      try {
        await music.play();
        musicButton.textContent = '❚❚ Pause music';
        musicButton.setAttribute('aria-pressed', 'true');
      } catch {
        musicButton.textContent = 'Tap again to play music';
      }
    } else {
      music.pause();
      musicButton.textContent = `♫ ${config.buttonText || 'Play music'}`;
      musicButton.setAttribute('aria-pressed', 'false');
    }
  });
}

function setupStars() {
  const canvas = document.querySelector('#stars');
  const ctx = canvas.getContext('2d');
  let stars = [];

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.min(130, Math.floor(innerWidth / 7)) }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: Math.random() * 1.2 + .25,
      a: Math.random() * .65 + .2,
      p: Math.random() * Math.PI * 2
    }));
  };

  const draw = (time = 0) => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    stars.forEach(star => {
      const alpha = star.a * (.72 + Math.sin(time / 900 + star.p) * .28);
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,232,190,${alpha})`;
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(draw);
  };

  resize();
  addEventListener('resize', resize, { passive: true });
  requestAnimationFrame(draw);
}

async function init() {
  setupStars();
  try {
    const response = await fetch('memories.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const config = await response.json();

    const site = config.site || {};
    document.querySelector('#site-title').textContent = site.title || 'Happy Birthday Havs ✨';
    document.querySelector('#site-subtitle').textContent = site.subtitle || '';
    document.querySelector('#site-instruction').textContent = site.instruction || 'Tap a picture to flip it.';
    document.querySelector('#scroll-label').textContent = site.scrollHint || 'Scroll down to explore';
    setupMusic(site.music);

    (config.memories || []).forEach(renderMemory);
  } catch (error) {
    gallery.innerHTML = `<p class="memory-copy">The gallery could not load. Check that memories.json is valid JSON.</p>`;
    console.error(error);
  }
}

init();
