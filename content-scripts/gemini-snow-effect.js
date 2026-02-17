(function () {
  'use strict';

  if (window.__AISB_SNOW_EFFECT_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_SNOW_EFFECT_LOADED__ = true;

  const CONTAINER_ID = 'aisb-snow-container';
  const STYLE_ID = 'aisb-snow-style';
  const MAX_SNOWFLAKES = 50;
  const SPAWN_INTERVAL = 200;

  let enabled = false;
  let container = null;
  let spawnTimer = null;
  let snowflakes = [];

  function storageGet(keys) {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
        resolve({});
        return;
      }
      chrome.storage.sync.get(keys, resolve);
    });
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${CONTAINER_ID} {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 2147483647;
        overflow: hidden;
      }
      
      .aisb-snowflake {
        position: absolute;
        top: -10px;
        color: #fff;
        font-size: 1em;
        user-select: none;
        pointer-events: none;
        animation: aisb-snow-fall linear forwards;
        opacity: 0.8;
      }
      
      @keyframes aisb-snow-fall {
        to {
          transform: translateY(100vh) rotate(360deg);
          opacity: 0;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function createSnowflake() {
    const snowflake = document.createElement('div');
    snowflake.className = 'aisb-snowflake';
    snowflake.textContent = '❄';
    snowflake.style.left = `${Math.random() * 100}%`;
    snowflake.style.fontSize = `${0.5 + Math.random() * 1}em`;
    snowflake.style.animationDuration = `${5 + Math.random() * 10}s`;
    snowflake.style.animationDelay = `${Math.random() * 2}s`;
    
    return snowflake;
  }

  function spawnSnowflake() {
    if (!container || snowflakes.length >= MAX_SNOWFLAKES) return;
    
    const snowflake = createSnowflake();
    container.appendChild(snowflake);
    snowflakes.push(snowflake);
    
    snowflake.addEventListener('animationend', () => {
      if (snowflake.parentElement) {
        snowflake.parentElement.removeChild(snowflake);
      }
      const index = snowflakes.indexOf(snowflake);
      if (index > -1) {
        snowflakes.splice(index, 1);
      }
    }, { once: true });
  }

  function startSnow() {
    if (!container) {
      container = document.createElement('div');
      container.id = CONTAINER_ID;
      document.body.appendChild(container);
    }
    
    if (spawnTimer) return;
    
    spawnTimer = setInterval(spawnSnowflake, SPAWN_INTERVAL);
  }

  function stopSnow() {
    if (spawnTimer) {
      clearInterval(spawnTimer);
      spawnTimer = null;
    }
    
    if (container) {
      snowflakes.forEach(snowflake => {
        if (snowflake.parentElement) {
          snowflake.parentElement.removeChild(snowflake);
        }
      });
      snowflakes = [];
      
      if (container.parentElement) {
        container.parentElement.removeChild(container);
      }
      container = null;
    }
  }

  function applyFeatureState(nextEnabled) {
    enabled = !!nextEnabled;
    
    if (enabled) {
      injectStyles();
      startSnow();
    } else {
      stopSnow();
    }
  }

  async function init() {
    const stored = await storageGet(['gvSnowEffectEnabled']);
    applyFeatureState(Boolean(stored.gvSnowEffectEnabled));

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'sync') return;
        
        if (changes.gvSnowEffectEnabled) {
          applyFeatureState(Boolean(changes.gvSnowEffectEnabled.newValue));
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    void init();
  }
})();
