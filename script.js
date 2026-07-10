const gallery = document.querySelector('#memory-gallery');
const template = document.querySelector('#memory-card-template');

const musicButton = document.querySelector('#music-button');
const music = document.querySelector('#background-music');

const entryScreen = document.querySelector('#entry-screen');
const enterButton = document.querySelector('#enter-button');

let musicVolumeBeforeVideo = 0.32;

const createElement = (tag, className) => {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  return element;
};

function showMissing(image, path) {
  const frame = image.closest('.media-frame, .reveal-media');
  const fallback = frame?.querySelector('.missing-media');

  if (!fallback) return;

  image.hidden = true;
  fallback.hidden = false;
  fallback.textContent = `Unable to load ${path}`;
}

function addImage(container, path, alt) {
  const media = createElement('div', 'reveal-media');
  const image = createElement('img', 'reveal-image');
  const fallback = createElement('div', 'missing-media');

  fallback.hidden = true;

  image.src = path;
  image.alt = alt || 'A hidden memory';
  image.loading = 'lazy';
  image.decoding = 'async';

  image.addEventListener('error', () => {
    showMissing(image, path);
  });

  media.append(image, fallback);
  container.append(media);
}

function updateMusicButton() {
  if (!musicButton || musicButton.hidden) return;

  if (music.paused) {
    musicButton.textContent = '♫ Play music';
    musicButton.setAttribute('aria-pressed', 'false');
  } else {
    musicButton.textContent = '❚❚ Pause music';
    musicButton.setAttribute('aria-pressed', 'true');
  }
}

function lowerMusicForVideo() {
  if (!music || music.paused) return;

  musicVolumeBeforeVideo = music.volume;
  music.volume = 0.06;
}

function restoreMusicAfterVideo() {
  if (!music || music.paused) return;

  music.volume = musicVolumeBeforeVideo || 0.32;
}

function addVideo(container, path, title) {
  const media = createElement('div', 'reveal-media video-wrapper');
  const video = createElement('video', 'memory-video');
  const fallback = createElement('div', 'missing-media');
  const status = createElement('button', 'video-status');
  const replayButton = createElement('button', 'video-replay');

  fallback.hidden = true;

  video.src = path;
  video.controls = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.setAttribute('aria-label', title || 'Memory video');

  status.type = 'button';
  status.innerHTML = `
    <span class="video-play-icon">▶</span>
    <span class="video-status-text">Loading video…</span>
  `;

  replayButton.type = 'button';
  replayButton.textContent = '↻ Replay video';
  replayButton.hidden = true;

  const setReadyToPlay = () => {
    const statusText = status.querySelector('.video-status-text');

    if (statusText) {
      statusText.textContent = 'Tap to play';
    }
  };

  const startVideo = async () => {
    replayButton.hidden = true;
    status.hidden = false;

    const statusText = status.querySelector('.video-status-text');

    if (statusText) {
      statusText.textContent = video.readyState >= 3
        ? 'Starting…'
        : 'Loading video…';
    }

    try {
      lowerMusicForVideo();
      await video.play();
      status.hidden = true;
    } catch (error) {
      restoreMusicAfterVideo();
      setReadyToPlay();
      status.hidden = false;
      console.log('Video requires another tap:', error);
    }
  };

  video.startMemoryVideo = startVideo;

  video.addEventListener('playing', () => {
    status.hidden = true;
    replayButton.hidden = true;
    lowerMusicForVideo();
  });

  video.addEventListener('waiting', () => {
    const statusText = status.querySelector('.video-status-text');

    status.hidden = false;

    if (statusText) {
      statusText.textContent = 'Loading video…';
    }
  });

  video.addEventListener('canplay', () => {
    if (video.paused && !video.ended) {
      setReadyToPlay();
    }
  });

  video.addEventListener('ended', () => {
    status.hidden = true;
    replayButton.hidden = false;
    restoreMusicAfterVideo();
  });

  video.addEventListener('pause', () => {
    if (!video.ended) {
      restoreMusicAfterVideo();
    }
  });

  status.addEventListener('click', async event => {
    event.stopPropagation();
    await startVideo();
  });

  replayButton.addEventListener('click', async event => {
    event.stopPropagation();

    video.currentTime = 0;
    replayButton.hidden = true;

    await startVideo();
  });

  video.addEventListener('error', () => {
    video.hidden = true;
    status.hidden = true;
    replayButton.hidden = true;
    fallback.hidden = false;
    fallback.textContent = `Unable to load ${path}`;
    restoreMusicAfterVideo();
  });

  media.append(video, status, replayButton, fallback);
  container.append(media);
}

function addText(container, text) {
  const copy = createElement('p', 'memory-copy');

  copy.textContent = text;
  container.append(copy);
}

function closeOtherCards(currentCard) {
  document.querySelectorAll('.memory-card.is-flipped').forEach(card => {
    if (card === currentCard) return;

    card.classList.remove('is-flipped');
    card.setAttribute('aria-pressed', 'false');

    card.querySelectorAll('video').forEach(video => {
      video.pause();
      video.currentTime = 0;
    });

    card.querySelectorAll('.video-replay').forEach(button => {
      button.hidden = true;
    });

    card.querySelectorAll('.video-status').forEach(button => {
      button.hidden = false;

      const label = button.querySelector('.video-status-text');

      if (label) {
        label.textContent = 'Tap to play';
      }
    });
  });

  restoreMusicAfterVideo();
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
    frontFallback.textContent = `Unable to load ${memory.image}`;
  });

  if (memory.revealImage) {
    addImage(backContent, memory.revealImage, memory.revealAlt);
  }

  if (memory.video) {
    addVideo(backContent, memory.video, memory.title);
  }

  if (memory.text) {
    addText(backContent, memory.text);
  }

  const setFlipped = async value => {
    if (value) {
      closeOtherCards(card);
    }

    card.classList.toggle('is-flipped', value);
    card.setAttribute('aria-pressed', String(value));

    const videos = card.querySelectorAll('video');

    if (value) {
      videos.forEach(video => {
        video.currentTime = 0;

        if (typeof video.startMemoryVideo === 'function') {
          video.startMemoryVideo();
        }
      });
    } else {
      videos.forEach(video => {
        video.pause();
        video.currentTime = 0;
      });

      card.querySelectorAll('.video-replay').forEach(button => {
        button.hidden = true;
      });

      card.querySelectorAll('.video-status').forEach(button => {
        button.hidden = false;

        const label = button.querySelector('.video-status-text');

        if (label) {
          label.textContent = 'Tap to play';
        }
      });

      restoreMusicAfterVideo();
    }
  };

  card.addEventListener('click', event => {
    if (
      event.target.closest(
        'video, .flip-back, .video-status, .video-replay, button'
      )
    ) {
      return;
    }

    const isCurrentlyFlipped = card.classList.contains('is-flipped');
    setFlipped(!isCurrentlyFlipped);
  });

  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();

      const isCurrentlyFlipped = card.classList.contains('is-flipped');
      setFlipped(!isCurrentlyFlipped);
    }
  });

  backButton.addEventListener('click', event => {
    event.stopPropagation();
    setFlipped(false);
  });

  gallery.append(card);
}

function setupMusic(config = {}) {
  if (!config.enabled || !config.src) {
    entryScreen.classList.add('is-hidden');

    window.setTimeout(() => {
      entryScreen.remove();
    }, 700);

    return;
  }

  music.src = config.src;
  music.volume = 0.32;

  musicButton.hidden = false;
  musicButton.textContent = `♫ ${config.buttonText || 'Play music'}`;

  const beginExperience = async () => {
    enterButton.disabled = true;

    try {
      await music.play();
    } catch (error) {
      console.log('Music could not begin automatically:', error);
    }

    updateMusicButton();
    entryScreen.classList.add('is-hidden');

    window.setTimeout(() => {
      entryScreen.remove();
    }, 700);
  };

  enterButton.addEventListener('click', beginExperience);

  musicButton.addEventListener('click', async event => {
    event.stopPropagation();

    if (music.paused) {
      try {
        await music.play();
      } catch (error) {
        console.error('Music playback failed:', error);
      }
    } else {
      music.pause();
    }

    updateMusicButton();
  });

  music.addEventListener('play', updateMusicButton);
  music.addEventListener('pause', updateMusicButton);
}

function setupStars() {
  const canvas = document.querySelector('#stars');
  const context = canvas.getContext('2d');

  let stars = [];

  const resize = () => {
    const deviceRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(innerWidth * deviceRatio);
    canvas.height = Math.floor(innerHeight * deviceRatio);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;

    context.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);

    stars = Array.from(
      {
        length: Math.min(130, Math.floor(innerWidth / 7))
      },
      () => ({
        x: Math.random() * innerWidth,
        y: Math.random() * innerHeight,
        radius: Math.random() * 1.2 + 0.25,
        alpha: Math.random() * 0.65 + 0.2,
        phase: Math.random() * Math.PI * 2
      })
    );
  };

  const draw = (time = 0) => {
    context.clearRect(0, 0, innerWidth, innerHeight);

    stars.forEach(star => {
      const alpha =
        star.alpha *
        (0.72 + Math.sin(time / 900 + star.phase) * 0.28);

      context.beginPath();
      context.fillStyle = `rgba(255,232,190,${alpha})`;
      context.arc(
        star.x,
        star.y,
        star.radius,
        0,
        Math.PI * 2
      );
      context.fill();
    });

    requestAnimationFrame(draw);
  };

  resize();

  addEventListener('resize', resize, {
    passive: true
  });

  requestAnimationFrame(draw);
}

async function init() {
  setupStars();

  try {
    const response = await fetch('memories.json?v=30', {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const config = await response.json();
    const site = config.site || {};

    document.querySelector('#site-title').textContent =
      site.title || 'Happy Birthday Havs ✨';

    document.querySelector('#site-subtitle').textContent =
      site.subtitle || '';

    document.querySelector('#site-instruction').textContent =
      site.instruction || 'Tap a picture to flip it.';

    document.querySelector('#scroll-label').textContent =
      site.scrollHint || 'Scroll down to explore';

    setupMusic(site.music);

    (config.memories || []).forEach(renderMemory);
  } catch (error) {
    entryScreen?.remove();

    gallery.innerHTML = `
      <p class="memory-copy">
        The gallery could not load. Please refresh the page.
      </p>
    `;

    console.error(error);
  }
}

init();
