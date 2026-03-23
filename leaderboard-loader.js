// ── leaderboard-loader.js ─────────────────────────────────────────────────────
// Fetches live data from GitHub and rebuilds the leaderboard tab with real tiers.
// ─────────────────────────────────────────────────────────────────────────────

(async function () {
  const REPO_RAW = 'https://raw.githubusercontent.com/CrackedTierTest/leaderboards/main/data/leaderboard.json';

  // ── Tier metadata — full 18-tier system ───────────────────────────────────
  const TIER_META = [
    { key: 'HT1', color: '#ff0000', glow: 'rgba(255,0,0,0.4)'      },
    { key: 'S-',  color: '#ff2200', glow: 'rgba(255,34,0,0.35)'    },
    { key: 'HT2', color: '#ff4500', glow: 'rgba(255,69,0,0.35)'    },
    { key: 'A+',  color: '#ff6600', glow: 'rgba(255,102,0,0.3)'    },
    { key: 'LT2', color: '#ff8c00', glow: 'rgba(255,140,0,0.3)'    },
    { key: 'A-',  color: '#ffa500', glow: 'rgba(255,165,0,0.3)'    },
    { key: 'HT3', color: '#ffc800', glow: 'rgba(255,200,0,0.3)'    },
    { key: 'B+',  color: '#ffd700', glow: 'rgba(255,215,0,0.25)'   },
    { key: 'LT3', color: '#daff00', glow: 'rgba(218,255,0,0.2)'    },
    { key: 'B-',  color: '#aaff00', glow: 'rgba(170,255,0,0.2)'    },
    { key: 'HT4', color: '#7cfc00', glow: 'rgba(124,252,0,0.2)'    },
    { key: 'C+',  color: '#32cd32', glow: 'rgba(50,205,50,0.2)'    },
    { key: 'LT4', color: '#00cc88', glow: 'rgba(0,204,136,0.2)'    },
    { key: 'C-',  color: '#00bfff', glow: 'rgba(0,191,255,0.2)'    },
    { key: 'HT5', color: '#1e90ff', glow: 'rgba(30,144,255,0.2)'   },
    { key: 'D+',  color: '#4169e1', glow: 'rgba(65,105,225,0.2)'   },
    { key: 'LT5', color: '#6a5acd', glow: 'rgba(106,90,205,0.15)'  },
    { key: 'D-',  color: '#808080', glow: 'rgba(128,128,128,0.1)'  },
  ];
  const TIER_MAP = Object.fromEntries(TIER_META.map(t => [t.key, t]));

  function skinUrl(name, size) {
    return `https://mc-heads.net/avatar/${encodeURIComponent(name)}/${size}`;
  }

  // ── Fetch live data ────────────────────────────────────────────────────────
  let data;
  try {
    const res = await fetch(REPO_RAW + '?t=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    data = await res.json();
    console.log('[leaderboard-loader] Loaded live data:', data.generatedAt);
  } catch (err) {
    console.warn('[leaderboard-loader] Could not fetch JSON, keeping static fallback.', err.message);
    return;
  }

  // ── Wait for DOM ───────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    await new Promise(r => document.addEventListener('DOMContentLoaded', r));
  }

  // ── Build leaderboard tab ──────────────────────────────────────────────────
  function buildLeaderboard() {
    const lb = document.getElementById('leaderboard');
    if (!lb) return;
    lb.innerHTML = ''; // clear static content

    // Group players by their exact tier
    const grouped = {};
    for (const p of data.overall) {
      if (!grouped[p.tier]) grouped[p.tier] = [];
      grouped[p.tier].push(p);
    }

    let globalPos = 1;
    for (const meta of TIER_META) {
      const players = grouped[meta.key] || [];
      if (!players.length) continue;

      const section = document.createElement('div');
      section.className = 'lb-section';

      const posLabel = (pos) => {
        if (pos === 1) return '<span class="pos gold">#1</span>';
        if (pos === 2) return '<span class="pos silver">#2</span>';
        if (pos === 3) return '<span class="pos bronze">#3</span>';
        return `<span class="pos">#${pos}</span>`;
      };

      section.innerHTML = `
        <div class="section-header" style="background:${meta.glow};border-bottom:1px solid ${meta.color}44;">
          <div class="section-rank-label" style="color:${meta.color};text-shadow:0 0 18px ${meta.glow};">${meta.key}</div>
          <div class="section-meta">
            <div class="section-name" style="color:${meta.color};">${meta.key}</div>
            <div class="section-desc">Tier ${meta.key} players</div>
          </div>
          <div class="section-count">${players.length}&nbsp;PLAYER${players.length !== 1 ? 'S' : ''}</div>
        </div>
        <div class="player-list"></div>
      `;

      const list = section.querySelector('.player-list');
      players.forEach((p, pi) => {
        const isTop = globalPos === 1;
        const row = document.createElement('div');
        row.className = 'player-row' + (isTop ? ' top-player' : '');
        row.style.borderLeftColor = meta.color;
        const crown = isTop ? '<span class="crown">👑</span>' : '';
        row.innerHTML = `
          ${posLabel(globalPos)}
          <div class="avatar skin-avatar">
            <img class="skin-head" src="${skinUrl(p.ign, 64)}" alt="${p.ign}"
              onerror="this.onerror=null;this.src='https://minotar.net/avatar/${encodeURIComponent(p.ign)}/64'">
          </div>
          <div class="player-name">${crown}${p.ign}</div>
          <span class="player-version tag18" style="font-size:11px;">${p.gamemode}</span>
          <div class="player-score" style="color:${meta.color};">${meta.key}</div>
        `;
        list.appendChild(row);
        globalPos++;
      });

      lb.appendChild(section);
    }

    // Last updated timestamp
    const footer = document.querySelector('#tab-leaderboards footer');
    if (footer && data.generatedAt) {
      const existing = footer.querySelector('.live-updated');
      if (!existing) {
        const note = document.createElement('div');
        note.className = 'live-updated';
        note.style.cssText = 'margin-top:10px;font-size:8px;opacity:.45;';
        note.textContent = `Last updated: ${new Date(data.generatedAt).toLocaleString()}`;
        footer.appendChild(note);
      }
    }
  }

  // ── Build home top players ─────────────────────────────────────────────────
  function buildHomeTopPlayers() {
    const grid = document.getElementById('home-top-players');
    if (!grid) return;
    grid.innerHTML = '';

    data.overall.slice(0, 6).forEach((p, i) => {
      const meta = TIER_MAP[p.tier] || { key: p.tier, color: '#888', glow: 'rgba(128,128,128,0.1)' };
      const pos = i + 1;
      const posClass = pos === 1 ? 'gold' : pos === 2 ? 'silver' : pos === 3 ? 'bronze' : '';
      const isTop3 = pos <= 3;
      const card = document.createElement('div');
      card.className = `top-player-card${isTop3 ? ' is-top3' : ''}`;
      card.style.borderColor = isTop3 ? meta.color + '44' : '';
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
        <div class="tp-rank" style="color:${meta.color};background:${meta.glow};border:1px solid ${meta.color}44;">${meta.key}</div>
      `;
      grid.appendChild(card);
    });
  }

  // ── Build tier list tab ────────────────────────────────────────────────────
  function buildTierList() {
    const grid = document.getElementById('tl-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const verFilter  = document.querySelector('.tl-ver-btn.active')?.dataset.ver || 'all';
    const tierFilter = document.querySelector('.tl-tier-btn.active')?.dataset.tier || 'all';
    const search     = (document.getElementById('tl-search')?.value || '').toLowerCase().trim();

    const gm18 = new Set(data.gamemodes['1.8']);

    // tier group mapping
    const GROUP_MAP = {
      'HT1':'splus','S-':'splus',
      'HT2':'s','A+':'s','LT2':'s',
      'A-':'a','HT3':'a','B+':'a',
      'LT3':'b','B-':'b','HT4':'b',
      'C+':'c','LT4':'c','C-':'c',
      'HT5':'d','D+':'d','LT5':'d','D-':'d',
    };

    let shown = 0;
    for (const p of data.overall) {
      const meta = TIER_MAP[p.tier];
      if (!meta) continue;
      const pVer = gm18.has(p.gamemode) ? '1.8' : '1.9+';
      const group = GROUP_MAP[p.tier] || 'c';
      if (verFilter !== 'all' && verFilter !== pVer) continue;
      if (tierFilter !== 'all' && tierFilter !== group) continue;
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
        <div class="tl-card-rank" style="color:${meta.color};background:${meta.glow};border:1px solid ${meta.color}44;">${meta.key}</div>
      `;
      grid.appendChild(card);
      shown++;
    }

    if (!shown) grid.innerHTML = '<div class="tl-empty">No players found</div>';
    const showEl = document.getElementById('tl-showing');
    if (showEl) showEl.textContent = `Showing ${shown} player${shown !== 1 ? 's' : ''}`;
  }

  // ── Update stat counters ───────────────────────────────────────────────────
  function updateStats() {
    const nums = document.querySelectorAll('.stat-num');
    if (nums[0]) nums[0].textContent = data.stats.totalPlayers;
  }

  // ── Update tier filter counts ──────────────────────────────────────────────
  function updateCounts() {
    const GROUP_MAP = {
      'HT1':'splus','S-':'splus',
      'HT2':'s','A+':'s','LT2':'s',
      'A-':'a','HT3':'a','B+':'a',
      'LT3':'b','B-':'b','HT4':'b',
      'C+':'c','LT4':'c','C-':'c',
      'HT5':'d','D+':'d','LT5':'d','D-':'d',
    };
    const counts = { splus:0, s:0, a:0, b:0, c:0 };
    for (const p of data.overall) {
      const g = GROUP_MAP[p.tier];
      if (g && counts[g] !== undefined) counts[g]++;
    }
    const el = id => document.getElementById(id);
    if (el('count-all'))   el('count-all').textContent   = data.overall.length;
    if (el('count-splus')) el('count-splus').textContent = counts.splus;
    if (el('count-s'))     el('count-s').textContent     = counts.s;
    if (el('count-a'))     el('count-a').textContent     = counts.a;
    if (el('count-b'))     el('count-b').textContent     = counts.b;
    if (el('count-c'))     el('count-c').textContent     = counts.c;
  }

  // ── Run everything ─────────────────────────────────────────────────────────
  buildLeaderboard();
  buildHomeTopPlayers();
  buildTierList();
  updateStats();
  updateCounts();

  // Re-hook tier list filters to use live data
  document.querySelectorAll('.tl-ver-btn').forEach(btn => {
    btn.addEventListener('click', () => setTimeout(buildTierList, 10));
  });
  document.querySelectorAll('.tl-tier-btn').forEach(btn => {
    btn.addEventListener('click', () => setTimeout(buildTierList, 10));
  });
  document.getElementById('tl-search')?.addEventListener('input', buildTierList);

  console.log('[leaderboard-loader] Live leaderboard rendered ✓');
})();
