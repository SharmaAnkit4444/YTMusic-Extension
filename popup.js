let playPauseBtn, prevBtn, nextBtn, shuffleBtn, repeatBtn;
let songTitleEl, artistNameEl;
let progressFill, currentTimeSpan, durationSpan, volumeSlider;
let playPauseIcon;

let isPlaying = false;
let currentVolume = 0.75;
let repeatMode = false;
let shuffleMode = false;

let ytmTab = null;
let infoPollInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  console.log("Popup loaded");

  playPauseBtn = document.getElementById('playPauseBtn');
  prevBtn = document.getElementById('prevBtn');
  nextBtn = document.getElementById('nextBtn');
  shuffleBtn = document.getElementById('shuffleBtn');
  repeatBtn = document.getElementById('repeatBtn');
  songTitleEl = document.getElementById('songTitle');
  artistNameEl = document.getElementById('artistName');
  progressFill = document.getElementById('progressFill');
  currentTimeSpan = document.getElementById('currentTime');
  durationSpan = document.getElementById('durationTime');
  volumeSlider = document.getElementById('volumeSlider');

  if (playPauseBtn) {
    playPauseIcon = playPauseBtn.querySelector('svg');
  }

  if (volumeSlider) {
    volumeSlider.value = currentVolume;
    updateVolumeFill(currentVolume);
  }

  checkYTMTab();
  attachEventListeners();
  startInfoPolling();

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.key === ' ' || e.keyCode === 32) {
      e.preventDefault();
      const activeElement = document.activeElement;
      const isTyping = activeElement.tagName === 'INPUT' || 
                       activeElement.tagName === 'TEXTAREA' || 
                       activeElement.isContentEditable;
      if (!isTyping) {
        console.log("Spacebar pressed - toggling play/pause");
        controlYTM('playPause');
      }
    }
  });
});

function updateVolumeFill(volume) {
  if (volumeSlider) {
    const percent = volume * 100;
    volumeSlider.style.background = `linear-gradient(90deg, #c084fc 0%, #c084fc ${percent}%, rgba(255, 255, 255, 0.2) ${percent}%, rgba(255, 255, 255, 0.2) 100%)`;
  }
}

async function checkYTMTab() {
  try {
    const tabs = await chrome.tabs.query({ url: "*://music.youtube.com/*" });
    console.log("Found YTM tabs:", tabs);

    if (tabs && tabs.length > 0) {
      ytmTab = tabs[0];
      updateConnectionStatus(true);
      await fetchCurrentTrackInfo();
    } else {
      ytmTab = null;
      updateConnectionStatus(false);
      setPlaceholderInfo();
    }
  } catch (error) {
    console.error("Error checking YTM tab:", error);
    ytmTab = null;
    updateConnectionStatus(false);
    setPlaceholderInfo();
  }
}

function updateConnectionStatus(isConnected) {
  const extBadge = document.querySelector('.ext-badge');
  if (extBadge) {
    if (isConnected) {
      extBadge.innerHTML = '🎵 YouTube Music • Active';
      extBadge.style.color = '#c084fc';
    } else {
      extBadge.innerHTML = '⚠️ YouTube Music is not Active';
      extBadge.style.color = '#f87171';
    }
  }
}

function setPlaceholderInfo() {
  if (songTitleEl) songTitleEl.textContent = 'Not Connected';
  if (artistNameEl) artistNameEl.textContent = 'Open YouTube Music';
  if (currentTimeSpan) currentTimeSpan.textContent = '0:00';
  if (durationSpan) durationSpan.textContent = '0:00';
  if (progressFill) progressFill.style.width = '0%';
}

async function fetchCurrentTrackInfo() {
  if (!ytmTab) return;

  try {
    const tab = await chrome.tabs.get(ytmTab.id).catch(() => null);
    if (!tab) {
      ytmTab = null;
      updateConnectionStatus(false);
      setPlaceholderInfo();
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: ytmTab.id },
      func: () => {
        let title = 'Unknown Track';
        const titleEl = document.querySelector('.title.style-scope.ytmusic-player-bar');
        if (titleEl && titleEl.innerText) title = titleEl.innerText.trim();

        let artist = 'Unknown Artist';
        const artistEl = document.querySelector('.byline.style-scope.ytmusic-player-bar');
        if (artistEl && artistEl.innerText) artist = artistEl.innerText.trim();

        let playing = false;
        const video = document.querySelector('video');
        if (video) {
          playing = !video.paused && !video.ended && video.readyState > 2;
        } else {
          const ppBtn = document.querySelector('#play-pause-button');
          if (ppBtn) playing = ppBtn.getAttribute('title') === 'Pause';
        }

        let currentTime = 0;
        let duration = 0;
        if (video) {
          currentTime = video.currentTime || 0;
          duration = video.duration || 0;
        } else {
          const progressBar = document.querySelector('#progress-bar');
          if (progressBar) {
            currentTime = parseFloat(progressBar.value) || 0;
            duration = parseFloat(progressBar.getAttribute('aria-valuemax')) || parseFloat(progressBar.max) || 0;
          }
        }

        let repeatActive = false;
        const repeatBtn = document.querySelector('#repeat-button');
        if (repeatBtn) {
          if (repeatBtn.hasAttribute('aria-pressed')) {
            repeatActive = repeatBtn.getAttribute('aria-pressed') === 'true';
          } else {
            const aria = repeatBtn.getAttribute('aria-label') || '';
            repeatActive = aria.toLowerCase().includes('repeat') && !aria.toLowerCase().includes('off');
          }
        }

        let shuffleActive = false;
        const shuffleBtn = document.querySelector('#shuffle-button');
        if (shuffleBtn) {
          if (shuffleBtn.hasAttribute('aria-pressed')) {
            shuffleActive = shuffleBtn.getAttribute('aria-pressed') === 'true';
          } else {
            const aria = shuffleBtn.getAttribute('aria-label') || '';
            shuffleActive = aria.toLowerCase().includes('shuffle') && !aria.toLowerCase().includes('off');
          }
        }

        return { title, artist, playing, currentTime, duration, repeatActive, shuffleActive };
      }
    });

    if (results && results[0] && results[0].result) {
      const info = results[0].result;

      if (songTitleEl && info.title) songTitleEl.textContent = info.title;
      if (artistNameEl && info.artist) artistNameEl.textContent = info.artist;

      isPlaying = info.playing;
      updatePlayPauseIcon(isPlaying);

      if (repeatBtn) {
        repeatMode = info.repeatActive;
        repeatBtn.classList.toggle('active', repeatMode);
      }
      if (shuffleBtn) {
        shuffleMode = info.shuffleActive;
        shuffleBtn.classList.toggle('active', shuffleMode);
      }

      if (info.duration > 0) {
        const percent = (info.currentTime / info.duration) * 100;
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (currentTimeSpan) currentTimeSpan.textContent = formatTime(info.currentTime);
        if (durationSpan) durationSpan.textContent = formatTime(info.duration);
      }
    }
  } catch (error) {
    console.error("Error fetching track info:", error);
    if (error.message && (error.message.includes('Could not find tab') || error.message.includes('No tab'))) {
      ytmTab = null;
      updateConnectionStatus(false);
      setPlaceholderInfo();
    }
  }
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds == null) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function updatePlayPauseIcon(playing) {
  if (!playPauseIcon) return;
  if (playing) {
    playPauseIcon.innerHTML = '<rect x="6" y="4" width="4" height="16" fill="white" stroke="none"/>' + '<rect x="14" y="4" width="4" height="16" fill="white" stroke="none"/>';
  } else {
    playPauseIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3" fill="white" stroke="none"/>';
  }
  playPauseIcon.setAttribute('viewBox', '0 0 24 24');
}

async function controlYTM(action) {
  console.log("Control action:", action);

  if (!ytmTab) {
    await checkYTMTab();
    if (!ytmTab) {
      updateConnectionStatus(false);
      return;
    }
  }

  try {
    const tab = await chrome.tabs.get(ytmTab.id).catch(() => null);
    if (!tab) {
      ytmTab = null;
      updateConnectionStatus(false);
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: ytmTab.id },
      func: (actionType) => {
        const click = (sel) => {
          const el = document.querySelector(sel);
          if (el) { el.click(); return true; }
          return false;
        };

        switch (actionType) {
          case 'playPause':
            if (!click('#play-pause-button')) {
              const video = document.querySelector('video');
              if (video) {
                video.paused ? video.play() : video.pause();
              }
            }
            break;
          case 'nextTrack':
            click('.next-button.style-scope.ytmusic-player-bar') ||
            click('tp-yt-paper-icon-button[aria-label="Next"]') ||
            click('[data-testid="next-button"]') ||
            click('#next-button');
            break;
          case 'previousTrack':
            click('.previous-button.style-scope.ytmusic-player-bar') ||
            click('tp-yt-paper-icon-button[aria-label="Previous"]') ||
            click('[data-testid="prev-button"]') ||
            click('#prev-button');
            break;
        }
      },
      args: [action]
    });

    setTimeout(() => fetchCurrentTrackInfo(), 300);
  } catch (error) {
    console.error(`Error controlling YTM (${action}):`, error);
  }
}

async function setYTMVolume(volume) {
  if (!ytmTab) {
    await checkYTMTab();
    if (!ytmTab) return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: ytmTab.id },
      func: (vol) => {
        const video = document.querySelector('video');
        if (video) video.volume = vol;
        const slider = document.querySelector('#volume-slider');
        if (slider) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(slider, vol * 100);
          slider.dispatchEvent(new Event('input', { bubbles: true }));
          slider.dispatchEvent(new Event('change', { bubbles: true }));
        }
      },
      args: [volume]
    });
  } catch (error) {
    console.error("Error setting volume:", error);
  }
}

async function toggleRepeat() {
  if (!ytmTab) {
    await checkYTMTab();
    if (!ytmTab) return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: ytmTab.id },
      func: () => {
        const selectors = ['#repeat-button', 'tp-yt-paper-icon-button[aria-label*="Repeat"]', 'button[aria-label*="Repeat"]'];
        let btn = null;
        for (const selector of selectors) {
          btn = document.querySelector(selector);
          if (btn) break;
        }
        if (btn) btn.click();
      }
    });
    setTimeout(() => fetchCurrentTrackInfo(), 400);
  } catch (error) {
    console.error("Error toggling repeat:", error);
  }
}

async function toggleShuffle() {
  if (!ytmTab) {
    await checkYTMTab();
    if (!ytmTab) return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: ytmTab.id },
      func: () => {
        const selectors = ['#shuffle-button', 'tp-yt-paper-icon-button[aria-label*="Shuffle"]', 'button[aria-label*="Shuffle"]'];
        let btn = null;
        for (const selector of selectors) {
          btn = document.querySelector(selector);
          if (btn) break;
        }
        if (btn) btn.click();
      }
    });
    setTimeout(() => fetchCurrentTrackInfo(), 400);
  } catch (error) {
    console.error("Error toggling shuffle:", error);
  }
}

function attachEventListeners() {
  if (playPauseBtn) playPauseBtn.addEventListener('click', () => controlYTM('playPause'));
  if (prevBtn) prevBtn.addEventListener('click', () => controlYTM('previousTrack'));
  if (nextBtn) nextBtn.addEventListener('click', () => controlYTM('nextTrack'));
  if (shuffleBtn) shuffleBtn.addEventListener('click', toggleShuffle);
  if (repeatBtn) repeatBtn.addEventListener('click', toggleRepeat);

  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      currentVolume = parseFloat(e.target.value);
      setYTMVolume(currentVolume);
      updateVolumeFill(currentVolume);
    });
  }

  const progressBarBg = document.getElementById('progressBarBg');
  if (progressBarBg) {
    progressBarBg.addEventListener('click', async (e) => {
      if (!ytmTab) {
        await checkYTMTab();
        if (!ytmTab) return;
      }

      const rect = progressBarBg.getBoundingClientRect();
      const percent = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));

      try {
        await chrome.scripting.executeScript({
          target: { tabId: ytmTab.id },
          func: (seekPercent) => {
            const video = document.querySelector('video');
            if (video && video.duration) {
              video.currentTime = seekPercent * video.duration;
            }
          },
          args: [percent]
        });
        setTimeout(() => fetchCurrentTrackInfo(), 100);
      } catch (error) {
        console.error("Error seeking:", error);
      }
    });
  }
}

function startInfoPolling() {
  if (infoPollInterval) clearInterval(infoPollInterval);
  infoPollInterval = setInterval(() => {
    if (ytmTab) fetchCurrentTrackInfo();
  }, 1000);
}

window.addEventListener('beforeunload', () => {
  if (infoPollInterval) clearInterval(infoPollInterval);
});