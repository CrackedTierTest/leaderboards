// ── leaderboard-loader.js ─────────────────────────────────────────────────────
// Add this as a <script src="leaderboard-loader.js"></script> in your index.html,
// BEFORE your existing closing </script> tag but AFTER the existing script block.
//
// It fetches data/leaderboard.json (committed by the bot via github-sync.js)
// and REPLACES the static GM_DATA and RANKS objects, then re-renders everything.
// ─────────────────────────────────────────────────────────────────────────────

(async function () {
  // ── 1. Fetch the JSON from GitHub raw ──────────────────────────────────────
  // raw.githubusercontent.com serves the latest committed file (±1 min delay)
  const REPO_RAW = 'https://raw.githubusercontent.com/CrackedTierTest/leaderboards/main/data/leaderboard.json';

  let data;
  try {
    const res = await fetch(REPO_RAW + '?t=' + Date.now()); // cache-bust
    if (!res.ok) throw new Error('HTTP ' + res.status);
    data = await res.json();
  } catch (err) {
    console.warn('[leaderboard-loader] Could not fetch JSON, using static fallback.', err.message);
    return; // fall through to the existing static data
  }

  // ── 2. Tier metadata (matches the bot's TIER_ORDER) ───────────────────────
  const TIER_META = [
    { key: 'HT1', label: 'HT1', color: '#ff0000', glow: 'rgba(255,0,0,0.4)',     group: 'splus' },
    { key: 'S-',  label: 'S-',  color: '#ff2200', glow: 'rgba(255,34,0,0.35)',   group: 'splus' },
    { key: 'HT2', label: 'HT2', color: '#ff4500', glow: 'rgba(255,69,0,0.35)',   group: 's'     },
    { key: 'A+',  label: 'A+',  color: '#ff6600', glow: 'rgba(255,102,0,0.3)',   group: 's'     },
    { key: 'LT2', label: 'LT2', color: '#ff8c00', glow: 'rgba(255,140,0,0.3)',   group: 's'     },
    { key: 'A-',  label: 'A-',  color: '#ffa500', glow: 'rgba(255,165,0,0.3)',   group: 'a'     },
    { key: 'HT3', label: 'HT3', color: '#ffc800', glow: 'rgba(255,200,0,0.3)',   group: 'a'     },
    { key: 'B+',  label: 'B+',  color: '#ffd700', glow: 'rgba(255,215,0,0.25)',  group: 'a'     },
    { key: 'LT3', label: 'LT3', color: '#daff00', glow: 'rgba(218,255,0,0.2)',   group: 'b'     },
    { key: 'B-',  label: 'B-',  color: '#aaff00', glow: 'rgba(170,255,0,0.2)',   group: 'b'     },
    { key: 'HT4', label: 'HT4', color: '#7cfc00', glow: 'rgba(124,252,0,0.2)',   group: 'b'     },
    { key: 'C+',  label: 'C+',  color: '#32cd32', glow: 'rgba(50,205,50,0.2)',   group: 'c'     },
    { key: 'LT4', label: 'LT4', color: '#00cc88', glow: 'rgba(0,204,136,0.2)',   group: 'c'     },
    { key: 'C-',  label: 'C-',  color: '#00bfff', glow: 'rgba(0,191,255,0.2)',   group: 'c'     },
    { key: 'HT5', label: 'HT5', color: '#1e90ff', glow: 'rgba(30,144,255,0.2)',  group: 'd'     },
    { key: 'D+',  label: 'D+',  color: '#4169e1', glow: 'rgba(65,105,225,0.2)',  group: 'd'     },
    { key: 'LT5', label: 'LT5', color: '#6a5acd', glow: 'rgba(106,90,205,0.15)', group: 'd'     },
    { key: 'D-',  label: 'D-',  color: '#808080', glow: 'rgba(128,128,128,0.1)', group: 'd'     },
  ];
  const TIER_MAP = Object.fromEntries(TIER_META.map(t => [t.key, t]));

  // ── 3. Rebuild the leaderboard section from live data ─────────────────────
  function skinUrl(name, size) {
    return `https://mc-heads.net/avatar/${encodeURIComponent(name)}/${size}`;
  }

  function buildLeaderboard() {
    const lb = document.getElementById('leaderboard');
    if (!lb) return;
    lb.innerHTML = '';

    // Group overall by exact tier
    const grouped = {};
    for (const p of data.overall) {
      if (!grouped[p.tier]) grouped[p.tier] = [];
      grouped[p.tier].push(p);
    }

    let globalPos = 1;
    for (const meta of TIER_META) {
      const players = grouped[meta.tier] || [];
      if (!players.length) continue;

      const tierColor = meta.color;
      const section = document.createElement('div');
      section.className = 'lb-section';
      section.style.cssText = `
        --tier-color: ${tierColor};
        --tier-glow: ${meta.glow};
      `;

      section.innerHTML = `
        <div class="section-header" style="background:${meta.glow.replace(')', ', 0.08)')};border-bottom:1px solid ${tierColor}33;">
          <div class="section-rank-label" style="color:${tierColor};text-shadow:0 0 18px ${meta.glow};">${meta.label}</div>
          <div class="section-meta">
            <div class="section-name" style="color:${tierColor};">${meta.key}</div>
            <div class="section-desc" style="color:var(--muted);">Tier ${meta.key} players</div>
          </div>
          <div class="section-count">${players.length}&nbsp;PLAYER${players.length !== 1 ? 'S' : ''}</div>
        </div>
        <div class="player-list" id="lb-list-${meta.key}"></div>
      `;
      lb.appendChild(section);

      const list = section.querySelector(`#lb-list-${meta.key}`);
      players.forEach((p, pi) => {
        const isTop = (globalPos === 1);
        const row = document.createElement('div');
        row.className = 'player-row' + (isTop ? ' top-player' : '');
        row.style.borderLeftColor = tierColor;

        const posLabel = globalPos === 1 ? '<span class="pos gold">#1</span>'
          : globalPos === 2 ? '<span class="pos silver">#2</span>'
          : globalPos === 3 ? '<span class="pos bronze">#3</span>'
          : `<span class="pos">#${globalPos}</span>`;
        const crown = isTop ? '<span class="crown">👑</span>' : '';

        row.innerHTML = `
          ${posLabel}
          <div class="avatar skin-avatar">
            <img class="skin-head" src="${skinUrl(p.ign, 64)}" alt="${p.ign}"
              onerror="this.onerror=null;this.src='https://minotar.net/avatar/${encodeURIComponent(p.ign)}/64'">
          </div>
          <div class="player-name">${crown}${p.ign}</div>
          <span class="player-version tag18" style="font-size:11px;">${p.gamemode}</span>
          <div class="player-score" style="color:${tierColor};">${meta.label}</div>
        `;
        list.appendChild(row);
        globalPos++;
      });
    }
  }

  // ── 4. Rebuild the Tier List tab from live data ────────────────────────────
  function buildTierListLive() {
    const grid = document.getElementById('tl-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const verFilter  = document.querySelector('.tl-ver-btn.active')?.dataset.ver || 'all';
    const tierFilter = document.querySelector('.tl-tier-btn.active')?.dataset.tier || 'all';
    const search     = (document.getElementById('tl-search')?.value || '').toLowerCase().trim();

    const gm18 = new Set(data.gamemodes['1.8']);
    const gm19 = new Set(data.gamemodes['1.9+']);

    let shown = 0;
    for (const p of data.overall) {
      const meta = TIER_MAP[p.tier];
      if (!meta) continue;

      const pVer = gm18.has(p.gamemode) ? '1.8' : '1.9+';
      if (verFilter !== 'all' && verFilter !== pVer) continue;
      if (tierFilter !== 'all' && tierFilter !== meta.group) continue;
      if (search && !p.ign.toLowerCase().includes(search)) continue;

      const card = document.createElement('div');
      card.className = 'tl-card';
      card.style.cssText = `animation-delay:${shown * 0.03}s;border-top-color:${meta.color};`;
      card.innerHTML = `
        <div class="tl-card-avatar skin-avatar">
          <img class="skin-head" src="${skinUrl(p.ign, 40)}" alt="${p.ign}"
            onerror="this.onerror=null;this.src='https://minotar.net/avatar/${encodeURIComponent(p.ign)}/40'">
          <span class="online-dot"></span>
        </div>
        <div class="tl-card-info">
          <div class="tl-card-name">${p.ign}</div>
          <div class="tl-card-ver">${pVer} · ${p.gamemode}</div>
        </div>
        <div class="tl-card-rank" style="color:${meta.color};background:${meta.glow.replace(')', ', 0.12)')};border:1px solid ${meta.color}44;">${meta.label}</div>
      `;
      grid.appendChild(card);
      shown++;
    }
    if (!shown) grid.innerHTML = '<div class="tl-empty">No players found</div>';
    const showEl = document.getElementById('tl-showing');
    if (showEl) showEl.textContent = `Showing ${shown} player${shown !== 1 ? 's' : ''}`;
  }

  // ── 5. Rebuild home top players ───────────────────────────────────────────
  function buildHomeTopPlayersLive() {
    const grid = document.getElementById('home-top-players');
    if (!grid) return;
    grid.innerHTML = '';

    const top = data.overall.slice(0, 6);
    top.forEach((p, i) => {
      const meta = TIER_MAP[p.tier] || TIER_META[TIER_META.length - 1];
      const pos = i + 1;
      const posClass = pos === 1 ? 'gold' : pos === 2 ? 'silver' : pos === 3 ? 'bronze' : '';
      const card = document.createElement('div');
      card.className = `top-player-card rank-${meta.group}${pos <= 3 ? ' is-top3' : ''}`;
      card.onclick = () => switchTab('leaderboards');
      card.innerHTML = `
        <div class="tp-pos ${posClass}">#${pos}</div>
        <div class="tp-avatar skin-avatar">
          <img class="skin-head" src="${skinUrl(p.ign, 40)}" alt="${p.ign}"
            onerror="this.onerror=null;this.src='https://minotar.net/avatar/${encodeURIComponent(p.ign)}/40'">
          <span class="tp-dot"></span>
        </div>
        <div class="tp-info">
          <div class="tp-name">${p.ign}</div>
          <div class="tp-ver">${p.gamemode}</div>
        </div>
        <div class="tp-rank" style="color:${meta.color};background:${meta.glow.replace(')', ', 0.12)')};border:1px solid ${meta.color}44;">${meta.label}</div>
      `;
      grid.appendChild(card);
    });
  }

  // ── 6. Update stat counters on home page ──────────────────────────────────
  function updateStats() {
    const cards = document.querySelectorAll('.stat-card');
    const nums  = document.querySelectorAll('.stat-num');
    if (nums[0]) nums[0].textContent = data.stats.totalPlayers;
    // cards 1-3 stay static (5 tiers, S1, 2 versions)
  }

  // ── 7. Patch the tier list filter counts ──────────────────────────────────
  function updateCounts() {
    const groupCount = { splus: 0, s: 0, a: 0, b: 0, c: 0, d: 0 };
    for (const p of data.overall) {
      const meta = TIER_MAP[p.tier];
      if (meta) groupCount[meta.group] = (groupCount[meta.group] || 0) + 1;
    }
    const el = id => document.getElementById(id);
    if (el('count-all'))   el('count-all').textContent   = data.overall.length;
    if (el('count-splus')) el('count-splus').textContent = (groupCount.splus || 0);
    if (el('count-s'))     el('count-s').textContent     = (groupCount.s || 0);
    if (el('count-a'))     el('count-a').textContent     = (groupCount.a || 0);
    if (el('count-b'))     el('count-b').textContent     = (groupCount.b || 0);
    if (el('count-c'))     el('count-c').textContent     = (groupCount.c || 0);
  }

  // ── 8. Override the static buildTierList with the live version ─────────────
  // Wait for DOM to be ready then patch in
  function init() {
    buildLeaderboard();
    buildHomeTopPlayersLive();
    buildTierListLive();
    updateStats();
    updateCounts();

    // Re-hook the filter buttons to use live data instead of static
    document.querySelectorAll('.tl-ver-btn').forEach(btn => {
      btn.addEventListener('click', buildTierListLive);
    });
    document.querySelectorAll('.tl-tier-btn').forEach(btn => {
      btn.addEventListener('click', buildTierListLive);
    });
    document.getElementById('tl-search')?.addEventListener('input', buildTierListLive);

    // Show a small "last updated" note in the leaderboard footer
    const footer = document.querySelector('#tab-leaderboards footer');
    if (footer && data.generatedAt) {
      const updated = new Date(data.generatedAt).toLocaleString();
      const note = document.createElement('div');
      note.style.cssText = 'margin-top:10px;font-size:8px;opacity:.45;';
      note.textContent = `Last updated: ${updated}`;
      footer.appendChild(note);
    }

    console.log('[leaderboard-loader] Live data loaded ✓', data.generatedAt);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOMContentLoaded already fired
    init();
  }
})();
