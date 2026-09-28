(function() {
  let appData = null;
  let currentTab = 'changes';
  let searchTerm = '';
  let formatFilter = 'all';
  let changeFilter = 'all';
  let typeFilter = 'all';
  let showHistory = false;
  let showHeaders = localStorage.getItem('xwing_show_headers') === 'true'; // false by default
  let sortField = 'type';
  let sortAsc = true;

  // DOM Elements
  const tabsNav = document.getElementById('tabsNav');
  const searchInput = document.getElementById('searchInput');
  const formatSelect = document.getElementById('formatSelect');
  const changeSelect = document.getElementById('changeSelect');
  const typeSelect = document.getElementById('typeSelect');
  const toggleHeadersBtn = document.getElementById('toggleHeadersBtn');
  const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
  const exportBtn = document.getElementById('exportBtn');
  const dataTable = document.getElementById('dataTable');
  const tableHead = document.getElementById('tableHead');
  const tableBody = document.getElementById('tableBody');
  const rowCountEl = document.getElementById('rowCount');
  const releaseBadge = document.getElementById('releaseBadge');
  const commitBadge = document.getElementById('commitBadge');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalClose = document.getElementById('modalClose');

  // Upgrade slot icon letter codes (xwing-miniatures font glyphs)
  const SLOT_ICONS = {
    'Talent': 'E',
    'Sensor': 'S',
    'Cannon': 'C',
    'Torpedo': 'P',
    'Missile': 'M',
    'Crew': 'W',
    'Gunner': 'Y',
    'Astromech': 'A',
    'Device': 'B',
    'Payload': 'B',
    'Illicit': 'I',
    'Modification': 'm',
    'Title': 't',
    'Configuration': 'n',
    'Force Power': 'F',
    'Tech': 'X',
    'Tactical Relay': 'Z',
    'Hardpoint': 'H',
    'Team': 'T',
    'Cargo': 'G',
    'Command': 'V',
    'Turret': 'U',
    'Hyperdrive': 'G'
  };

  // Bracketed game terminology to font glyph & style class
  const SYMBOL_MAP = {
    // Actions
    'focus': { glyph: 'f', cls: 'symbol-action', name: 'Focus' },
    'lock': { glyph: 'l', cls: 'symbol-action', name: 'Lock' },
    'target lock': { glyph: 'l', cls: 'symbol-action', name: 'Target Lock' },
    'evade': { glyph: 'e', cls: 'symbol-action', name: 'Evade' },
    'calculate': { glyph: 'a', cls: 'symbol-action', name: 'Calculate' },
    'reinforce': { glyph: 'i', cls: 'symbol-action', name: 'Reinforce' },
    'cloak': { glyph: 'k', cls: 'symbol-action', name: 'Cloak' },
    'coordinate': { glyph: 'o', cls: 'symbol-action', name: 'Coordinate' },
    'jam': { glyph: 'j', cls: 'symbol-action', name: 'Jam' },
    'reload': { glyph: '=', cls: 'symbol-action', name: 'Reload' },
    'slam': { glyph: 's', cls: 'symbol-action', name: 'SLAM' },
    'rotate arc': { glyph: 'R', cls: 'symbol-arc', name: 'Rotate Arc' },
    'rotatearc': { glyph: 'R', cls: 'symbol-arc', name: 'Rotate Arc' },
    'barrel roll': { glyph: 'r', cls: 'symbol-action', name: 'Barrel Roll' },
    'barrelroll': { glyph: 'r', cls: 'symbol-action', name: 'Barrel Roll' },
    'boost': { glyph: 'b', cls: 'symbol-action', name: 'Boost' },

    // Dice & Tokens
    'hit': { glyph: 'd', cls: 'symbol-hit', name: 'Hit' },
    'critical hit': { glyph: 'c', cls: 'symbol-crit', name: 'Critical Hit' },
    'crit': { glyph: 'c', cls: 'symbol-crit', name: 'Critical Hit' },
    'charge': { glyph: 'g', cls: 'symbol-charge', name: 'Charge' },
    'force': { glyph: 'h', cls: 'symbol-force', name: 'Force' },
    'shield': { glyph: '*', cls: 'symbol-shield', name: 'Shield' },
    'energy': { glyph: '(', cls: 'symbol-energy', name: 'Energy' },
    'agility': { glyph: '^', cls: 'symbol-evade', name: 'Agility' },
    'hull': { glyph: '&', cls: 'symbol-hull', name: 'Hull' },

    // Arcs
    'front arc': { glyph: '{', cls: 'symbol-arc', name: 'Front Arc' },
    'rear arc': { glyph: '|', cls: 'symbol-arc', name: 'Rear Arc' },
    'bullseye arc': { glyph: '}', cls: 'symbol-arc', name: 'Bullseye Arc' },
    'single turret arc': { glyph: 'p', cls: 'symbol-arc', name: 'Single Turret Arc' },
    'turret arc': { glyph: 'p', cls: 'symbol-arc', name: 'Turret Arc' },
    'double turret arc': { glyph: 'q', cls: 'symbol-arc', name: 'Double Turret Arc' },
    'full front arc': { glyph: '~', cls: 'symbol-arc', name: 'Full Front Arc' },
    'full rear arc': { glyph: '\u00a1', cls: 'symbol-arc', name: 'Full Rear Arc' },
    'left arc': { glyph: '\u00a3', cls: 'symbol-arc', name: 'Left Arc' },
    'right arc': { glyph: '\u00a2', cls: 'symbol-arc', name: 'Right Arc' },

    // Maneuvers
    'turn left': { glyph: '4', cls: 'symbol-maneuver', name: 'Turn Left' },
    'turn right': { glyph: '6', cls: 'symbol-maneuver', name: 'Turn Right' },
    'bank left': { glyph: '7', cls: 'symbol-maneuver', name: 'Bank Left' },
    'bank right': { glyph: '9', cls: 'symbol-maneuver', name: 'Bank Right' },
    'straight': { glyph: '8', cls: 'symbol-maneuver', name: 'Straight' },
    'koiogran turn': { glyph: '2', cls: 'symbol-maneuver', name: 'Koiogran Turn' },
    'k-turn': { glyph: '2', cls: 'symbol-maneuver', name: 'Koiogran Turn' },
    'segnors loop left': { glyph: '1', cls: 'symbol-maneuver', name: "Segnor's Loop Left" },
    "segnor's loop left": { glyph: '1', cls: 'symbol-maneuver', name: "Segnor's Loop Left" },
    's-loop left': { glyph: '1', cls: 'symbol-maneuver', name: "Segnor's Loop Left" },
    'segnors loop right': { glyph: '3', cls: 'symbol-maneuver', name: "Segnor's Loop Right" },
    "segnor's loop right": { glyph: '3', cls: 'symbol-maneuver', name: "Segnor's Loop Right" },
    's-loop right': { glyph: '3', cls: 'symbol-maneuver', name: "Segnor's Loop Right" },
    'tallon roll left': { glyph: ':', cls: 'symbol-maneuver', name: 'Tallon Roll Left' },
    't-roll left': { glyph: ':', cls: 'symbol-maneuver', name: 'Tallon Roll Left' },
    'tallon roll right': { glyph: ';', cls: 'symbol-maneuver', name: 'Tallon Roll Right' },
    't-roll right': { glyph: ';', cls: 'symbol-maneuver', name: 'Tallon Roll Right' },
    'stationary': { glyph: '5', cls: 'symbol-maneuver', name: 'Stationary' },
    'stop': { glyph: '5', cls: 'symbol-maneuver', name: 'Stationary' },
    'reverse straight': { glyph: 'K', cls: 'symbol-maneuver', name: 'Reverse Straight' },
    'reverse bank left': { glyph: 'J', cls: 'symbol-maneuver', name: 'Reverse Bank Left' },
    'reverse bank right': { glyph: 'L', cls: 'symbol-maneuver', name: 'Reverse Bank Right' },

    // Upgrade Slots
    'configuration': { glyph: 'n', cls: 'symbol-slot', name: 'Configuration' },
    'talent': { glyph: 'E', cls: 'symbol-slot', name: 'Talent' },
    'sensor': { glyph: 'S', cls: 'symbol-slot', name: 'Sensor' },
    'cannon': { glyph: 'C', cls: 'symbol-slot', name: 'Cannon' },
    'torpedo': { glyph: 'P', cls: 'symbol-slot', name: 'Torpedo' },
    'missile': { glyph: 'M', cls: 'symbol-slot', name: 'Missile' },
    'crew': { glyph: 'W', cls: 'symbol-slot', name: 'Crew' },
    'gunner': { glyph: 'Y', cls: 'symbol-slot', name: 'Gunner' },
    'astromech': { glyph: 'A', cls: 'symbol-slot', name: 'Astromech' },
    'device': { glyph: 'B', cls: 'symbol-slot', name: 'Device' },
    'payload': { glyph: 'B', cls: 'symbol-slot', name: 'Payload' },
    'illicit': { glyph: 'I', cls: 'symbol-slot', name: 'Illicit' },
    'modification': { glyph: 'm', cls: 'symbol-slot', name: 'Modification' },
    'title': { glyph: 't', cls: 'symbol-slot', name: 'Title' },
    'force power': { glyph: 'F', cls: 'symbol-slot', name: 'Force Power' },
    'tech': { glyph: 'X', cls: 'symbol-slot', name: 'Tech' },
    'tactical relay': { glyph: 'Z', cls: 'symbol-slot', name: 'Tactical Relay' },
    'hardpoint': { glyph: 'H', cls: 'symbol-slot', name: 'Hardpoint' },
    'team': { glyph: 'T', cls: 'symbol-slot', name: 'Team' },
    'cargo': { glyph: 'G', cls: 'symbol-slot', name: 'Cargo' },
    'command': { glyph: 'V', cls: 'symbol-slot', name: 'Command' },
    'turret': { glyph: 'U', cls: 'symbol-slot', name: 'Turret' },
    'hyperdrive': { glyph: 'G', cls: 'symbol-slot', name: 'Hyperdrive' },

    // Tokens, Sizes & Misc
    'ordnance': { glyph: 'B', cls: 'symbol-slot', name: 'Ordnance' },
    'victory': { glyph: '\u00d0', cls: 'symbol-slot', name: 'Victory' },
    'fuse': { glyph: ',', cls: 'symbol-action', name: 'Fuse' },
    'small': { glyph: '\u00c1', cls: 'symbol-base', name: 'Small Base' },
    'medium': { glyph: '\u00c2', cls: 'symbol-base', name: 'Medium Base' },
    'large': { glyph: '\u00c3', cls: 'symbol-base', name: 'Large Base' }
  };

  // Maneuver bearings and glyphs
  const BEARING_GLYPHS = {
    'T': { glyph: '4', name: 'Turn Left', col: 1 },
    'B': { glyph: '7', name: 'Bank Left', col: 2 },
    'F': { glyph: '8', name: 'Straight', col: 3 },
    'N': { glyph: '9', name: 'Bank Right', col: 4 },
    'Y': { glyph: '6', name: 'Turn Right', col: 5 },
    'K': { glyph: '2', name: 'Koiogran Turn', col: 6 },
    'L': { glyph: '1', name: "Segnor's Loop Left", col: 0 },
    'P': { glyph: '3', name: "Segnor's Loop Right", col: 7 },
    'E': { glyph: ':', name: 'Tallon Roll Left', col: 0 },
    'R': { glyph: ';', name: 'Tallon Roll Right', col: 7 },
    'S': { glyph: '5', name: 'Stationary', col: 3 },
    'O': { glyph: '5', name: 'Stationary', col: 3 },
    'A': { glyph: 'K', name: 'Reverse Straight', col: 3 },
    'D': { glyph: 'J', name: 'Reverse Bank Left', col: 2 },
    'C': { glyph: 'L', name: 'Reverse Bank Right', col: 4 }
  };

  function getSlotGlyph(slotName) {
    if (!slotName) return '';
    return SLOT_ICONS[slotName] || slotName[0] || '';
  }

  function renderSlotBar(slots) {
    if (!slots || !Array.isArray(slots) || slots.length === 0) return '<span class="text-dim">-</span>';
    return `<div class="upgrade-slot-bar">${slots.map(s => {
      const glyph = getSlotGlyph(s);
      return `<span class="slot-glyph" title="${s}">${glyph}</span>`;
    }).join('')}</div>`;
  }

  function renderGameText(text) {
    if (!text) return '';

    // 1. Handle speed-prefixed maneuvers like [1 [Turn Left]] or [3 [Straight]]
    let processed = text.replace(/\[(\d)\s*\[([^\]]+)\]\]/g, (match, speed, bearing) => {
      const key = bearing.toLowerCase().trim();
      const mapped = SYMBOL_MAP[key];
      if (mapped) {
        return `<span class="maneuver-template-chip" title="Speed ${speed} ${mapped.name}"><span class="maneuver-speed">${speed}</span><span class="game-symbol-glyph ${mapped.cls}">${mapped.glyph}</span></span>`;
      }
      return `[${speed} [${bearing}]]`;
    });

    // 2. Handle double-bracketed expressions like [[Bank Left] or [Bank Right]] or [[Straight]]
    processed = processed.replace(/\[\[([^\]]+)\]\s+or\s+\[([^\]]+)\]\]/g, (match, a, b) => {
      return `[${a}] or [${b}]`;
    });
    processed = processed.replace(/\[\[([^\]]+)\]\]/g, (match, a) => {
      return `[${a}]`;
    });

    // 3. Handle single-bracketed tokens [Term]
    return processed.replace(/\[([^\]]+)\]/g, (match, term) => {
      const key = term.toLowerCase().trim();
      const mapped = SYMBOL_MAP[key];
      if (mapped) {
        return `<span class="game-symbol-glyph ${mapped.cls}" title="${mapped.name}">${mapped.glyph}</span>`;
      }
      const titleCase = term.charAt(0).toUpperCase() + term.slice(1).toLowerCase();
      const slotGlyph = SLOT_ICONS[titleCase] || SLOT_ICONS[term];
      if (slotGlyph) {
        return `<span class="game-symbol-glyph symbol-slot" title="${term}">${slotGlyph}</span>`;
      }
      return `<span class="game-symbol" title="${term}">[${term}]</span>`;
    });
  }

  async function init() {
    try {
      if (window.XWING_DATA) {
        appData = window.XWING_DATA;
      } else {
        const res = await fetch('data.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        appData = await res.json();
      }
      console.log('Loaded X-Wing dataset with font icons:', appData.meta);

      setupHeader();
      setupTabs();
      setupFilters();
      render();
    } catch (err) {
      console.error('Failed to load dataset:', err);
      tableBody.innerHTML = `<tr><td colspan="10" class="empty-state">Failed to load data.json: ${err.message}. (If opening via file://, ensure data.js exists or use a local server like 'npm run serve:pages')</td></tr>`;
    }
  }

  function setupHeader() {
    if (!appData || !appData.meta) return;
    const meta = appData.meta;
    if (releaseBadge) {
      releaseBadge.textContent = `Release ${meta.version}`;
      releaseBadge.href = `${meta.repoUrl}/releases/tag/${meta.latestTag}`;
    }
    if (commitBadge && meta.commit) {
      commitBadge.textContent = `commit ${meta.commit.sha}`;
      commitBadge.href = `${meta.repoUrl}/commit/${meta.commit.fullSha}`;
    }
  }

  function setupTabs() {
    tabsNav.innerHTML = '';

    // Recent Changes Tab
    const changesCount = appData.summaryChanges.length;
    const changesTab = document.createElement('button');
    changesTab.className = `tab-btn tab-changes ${currentTab === 'changes' ? 'active' : ''}`;
    changesTab.innerHTML = `<span class="tab-faction-glyph">⚡</span><span>Recent Changes</span><span class="tab-count">${changesCount}</span>`;
    changesTab.addEventListener('click', () => {
      currentTab = 'changes';
      updateActiveTab();
      populateTypeFilter();
      render();
    });
    tabsNav.appendChild(changesTab);

    // Generic Upgrades Tab
    const upgradesCount = appData.upgrades.length;
    const upTab = document.createElement('button');
    upTab.className = `tab-btn tab-upgrades ${currentTab === 'upgrades' ? 'active' : ''}`;
    upTab.innerHTML = `<span class="tab-faction-glyph">m</span><span>Generic Upgrades</span><span class="tab-count">${upgradesCount}</span>`;
    upTab.addEventListener('click', () => {
      currentTab = 'upgrades';
      updateActiveTab();
      populateTypeFilter();
      render();
    });
    tabsNav.appendChild(upTab);

    // Faction Tabs with font glyphs
    const factionTabs = [
      { id: 'rebelalliance', name: 'Rebel Alliance', glyph: '!', cls: 'tab-rebel' },
      { id: 'galacticempire', name: 'Galactic Empire', glyph: '@', cls: 'tab-empire' },
      { id: 'scumandvillainy', name: 'Scum & Villainy', glyph: '#', cls: 'tab-scum' },
      { id: 'resistance', name: 'Resistance', glyph: '!', cls: 'tab-resistance' },
      { id: 'firstorder', name: 'First Order', glyph: '+', cls: 'tab-firstorder' },
      { id: 'galacticrepublic', name: 'Galactic Republic', glyph: '/', cls: 'tab-republic' },
      { id: 'separatistalliance', name: 'Separatist Alliance', glyph: '.', cls: 'tab-separatist' }
    ];

    factionTabs.forEach(f => {
      const pCount = appData.pilots.filter(p => p.faction === f.id).length;
      const btn = document.createElement('button');
      btn.className = `tab-btn ${f.cls} ${currentTab === f.id ? 'active' : ''}`;
      btn.innerHTML = `<span class="tab-faction-glyph">${f.glyph}</span><span>${f.name}</span><span class="tab-count">${pCount}</span>`;
      btn.addEventListener('click', () => {
        currentTab = f.id;
        updateActiveTab();
        populateTypeFilter();
        render();
      });
      tabsNav.appendChild(btn);
    });

    populateTypeFilter();
  }

  function updateActiveTab() {
    const btns = tabsNav.querySelectorAll('.tab-btn');
    btns.forEach(b => b.classList.remove('active'));
    if (currentTab === 'changes') btns[0].classList.add('active');
    else if (currentTab === 'upgrades') btns[1].classList.add('active');
    else {
      const idx = ['rebelalliance', 'galacticempire', 'scumandvillainy', 'resistance', 'firstorder', 'galacticrepublic', 'separatistalliance'].indexOf(currentTab);
      if (idx >= 0 && btns[idx + 2]) btns[idx + 2].classList.add('active');
    }
  }

  function populateTypeFilter() {
    typeSelect.innerHTML = '<option value="all">All Chassis / Types</option>';
    let types = new Set();

    if (currentTab === 'changes') {
      appData.summaryChanges.forEach(c => types.add(c.type));
    } else if (currentTab === 'upgrades') {
      appData.upgrades.forEach(u => types.add(u.type));
    } else {
      appData.pilots.filter(p => p.faction === currentTab).forEach(p => types.add(p.shipName));
    }

    Array.from(types).sort().forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      typeSelect.appendChild(opt);
    });
    typeFilter = 'all';
  }

  function updateHeadersVisibility() {
    if (dataTable) {
      dataTable.classList.toggle('hide-chassis-headers', !showHeaders);
    }
    if (toggleHeadersBtn) {
      toggleHeadersBtn.classList.toggle('btn-toggle-active', showHeaders);
      toggleHeadersBtn.innerHTML = showHeaders ? '<span>🏷️ Hide Headers</span>' : '<span>🏷️ Show Headers</span>';
    }
  }

  function setupFilters() {
    searchInput.addEventListener('input', e => {
      searchTerm = e.target.value.toLowerCase().trim();
      render();
    });

    formatSelect.addEventListener('change', e => {
      formatFilter = e.target.value;
      render();
    });

    changeSelect.addEventListener('change', e => {
      changeFilter = e.target.value;
      render();
    });

    typeSelect.addEventListener('change', e => {
      typeFilter = e.target.value;
      render();
    });

    toggleHistoryBtn.addEventListener('click', () => {
      showHistory = !showHistory;
      toggleHistoryBtn.classList.toggle('btn-toggle-active', showHistory);
      toggleHistoryBtn.innerHTML = showHistory ? '<span>📜 Hide History</span>' : '<span>📜 Show History</span>';
      render();
    });

    if (toggleHeadersBtn) {
      toggleHeadersBtn.addEventListener('click', () => {
        showHeaders = !showHeaders;
        try {
          localStorage.setItem('xwing_show_headers', showHeaders ? 'true' : 'false');
        } catch (e) {}
        updateHeadersVisibility();
      });
    }

    updateHeadersVisibility();

    exportBtn.addEventListener('click', exportCSV);

    if (modalClose) {
      modalClose.addEventListener('click', closeModal);
    }
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', e => {
        if (e.target === modalBackdrop) closeModal();
      });
    }
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });
  }

  function getFilteredItems() {
    let items = [];

    if (currentTab === 'changes') {
      items = appData.summaryChanges;
    } else if (currentTab === 'upgrades') {
      items = appData.upgrades;
    } else {
      items = appData.pilots.filter(p => p.faction === currentTab);
    }

    return items.filter(item => {
      if (formatFilter !== 'all') {
        if (item.kind === 'pilot' || item.slots) {
          if (formatFilter === 'standard' && !item.standard) return false;
          if (formatFilter === 'wildspace' && !item.wildspace) return false;
          if (formatFilter === 'epic' && !item.epic) return false;
        }
      }

      if (changeFilter !== 'all') {
        const hasChanges = (item.recentChanges && item.recentChanges.length > 0) || (item.changes && item.changes.length > 0);
        if (changeFilter === 'changed' && !hasChanges) return false;
        if (changeFilter === 'buffs' && !(item.diff < 0)) return false;
        if (changeFilter === 'nerfs' && !(item.diff > 0)) return false;
        if (changeFilter === 'params') {
          const list = item.recentChanges || item.changes || [];
          const hasParam = list.some(c => c.type !== 'cost');
          if (!hasParam) return false;
        }
      }

      if (typeFilter !== 'all') {
        const itemType = item.shipName || item.type;
        if (itemType !== typeFilter) return false;
      }

      if (searchTerm) {
        const nameMatch = (item.name || '').toLowerCase().includes(searchTerm);
        const typeMatch = (item.shipName || item.type || '').toLowerCase().includes(searchTerm);
        const kwMatch = (item.keywords || []).some(k => k.toLowerCase().includes(searchTerm));
        const abilityMatch = (item.ability || '').toLowerCase().includes(searchTerm);
        const restMatch = JSON.stringify(item.restrictions || '').toLowerCase().includes(searchTerm);
        if (!nameMatch && !typeMatch && !kwMatch && !abilityMatch && !restMatch) {
          return false;
        }
      }

      return true;
    });
  }

  function sortItems(items) {
    return items.slice().sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'type') {
        valA = a.shipName || a.type || '';
        valB = b.shipName || b.type || '';
      } else if (sortField === 'cost') {
        const getCostVal = (c) => {
          if (typeof c === 'number') return c;
          if (c && typeof c.value === 'number') return c.value;
          return 999;
        };
        valA = getCostVal(a.cost);
        valB = getCostVal(b.cost);
      } else if (sortField === 'diff') {
        valA = a.diff !== null && a.diff !== undefined ? a.diff : 0;
        valB = b.diff !== null && b.diff !== undefined ? b.diff : 0;
      }

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });
  }

  function render() {
    const items = sortItems(getFilteredItems());
    rowCountEl.textContent = `Showing ${items.length} card${items.length === 1 ? '' : 's'}`;

    renderHeader();
    renderBody(items);
    updateHeadersVisibility();
  }

  function renderHeader() {
    let cols = [];

    if (currentTab === 'changes') {
      cols = [
        { id: 'type', label: 'Type / Chassis', sortable: true },
        { id: 'name', label: 'Name', sortable: true },
        { id: 'cost', label: 'Current Points', sortable: true },
        { id: 'diff', label: 'Diff', sortable: true },
        { id: 'prevPoints', label: 'Previous Points', sortable: false },
        { id: 'paramChanges', label: 'Parameter Changes', sortable: false },
        { id: 'commit', label: 'Commit in Repo', sortable: false }
      ];
    } else {
      cols = [
        { id: 'format', label: 'Format', sortable: false },
        { id: 'type', label: currentTab === 'upgrades' ? 'Slot' : 'Chassis', sortable: true },
        { id: 'name', label: 'Name', sortable: true },
        { id: 'slots', label: 'Upgrade Bar', sortable: false },
        { id: 'restrictions', label: 'Restrictions', sortable: false },
        { id: 'keywords', label: 'Keywords', sortable: false },
        { id: 'cost', label: 'Sep 26', sortable: true },
        { id: 'diff', label: 'Change vs prev', sortable: true },
        { id: 'commit', label: 'Commit', sortable: false }
      ];

      if (showHistory) {
        appData.historyCycles.filter(c => c !== 'Sep 26').forEach(cycle => {
          cols.push({ id: `hist_${cycle}`, label: cycle, sortable: false, isHistory: true });
        });
      }
    }

    tableHead.innerHTML = `<tr>${cols.map(c => `
      <th class="${c.sortable ? 'sortable' : ''} ${c.isHistory ? 'th-history' : ''}" data-col="${c.id}">
        ${c.label} ${sortField === c.id ? (sortAsc ? '▲' : '▼') : ''}
      </th>
    `).join('')}</tr>`;

    tableHead.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (sortField === col) {
          sortAsc = !sortAsc;
        } else {
          sortField = col;
          sortAsc = true;
        }
        render();
      });
    });
  }

  function getTableColSpan() {
    let base = 9;
    if (showHistory && appData && appData.historyCycles) {
      base += appData.historyCycles.filter(c => c !== 'Sep 26').length;
    }
    return base;
  }

  function groupPilotsByChassis(items) {
    const groups = new Map();
    items.forEach(p => {
      const shipKey = p.shipXws || p.shipName || 'unknown';
      if (!groups.has(shipKey)) {
        const shipObj = (appData.ships && appData.ships[shipKey]) || {
          name: p.shipName || p.type || shipKey,
          xws: shipKey,
          size: p.shipSize || 'Small',
          fontGlyph: p.shipFontGlyph || '',
          stats: [],
          dial: []
        };
        groups.set(shipKey, {
          ship: shipObj,
          items: []
        });
      }
      groups.get(shipKey).items.push(p);
    });

    const groupList = Array.from(groups.values());

    // Sort chassis groups
    groupList.sort((a, b) => {
      const nameA = a.ship.name || '';
      const nameB = b.ship.name || '';
      if (sortField === 'type') {
        return sortAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      return nameA.localeCompare(nameB);
    });

    // Sort pilots within each chassis
    groupList.forEach(grp => {
      grp.items.sort((a, b) => {
        if (sortField === 'cost') {
          const costA = typeof a.cost === 'number' ? a.cost : (a.cost?.value ?? 999);
          const costB = typeof b.cost === 'number' ? b.cost : (b.cost?.value ?? 999);
          return sortAsc ? costA - costB : costB - costA;
        }
        if (sortField === 'name') {
          return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        }
        if (sortField === 'diff') {
          const diffA = a.diff !== null && a.diff !== undefined ? a.diff : 0;
          const diffB = b.diff !== null && b.diff !== undefined ? b.diff : 0;
          return sortAsc ? diffA - diffB : diffB - diffA;
        }

        // Default within chassis: Initiative descending (I6 -> I1), then uniques (••• -> • -> generic), then cost descending
        const initDiff = (b.initiative || 0) - (a.initiative || 0);
        if (initDiff !== 0) return initDiff;

        const limitA = a.limited !== undefined ? a.limited : 0;
        const limitB = b.limited !== undefined ? b.limited : 0;
        const limitDiff = limitB - limitA;
        if (limitDiff !== 0) return limitDiff;

        const costValA = typeof a.cost === 'number' ? a.cost : (a.cost?.value ?? 0);
        const costValB = typeof b.cost === 'number' ? b.cost : (b.cost?.value ?? 0);
        const costDiff = costValB - costValA;
        if (costDiff !== 0) return costDiff;

        return a.name.localeCompare(b.name);
      });
    });

    return groupList;
  }

  function groupUpgradesBySlot(items) {
    const groups = new Map();
    items.forEach(u => {
      const slotKey = u.type || 'Other';
      if (!groups.has(slotKey)) {
        groups.set(slotKey, {
          slot: slotKey,
          items: []
        });
      }
      groups.get(slotKey).items.push(u);
    });

    const groupList = Array.from(groups.values());

    const slotOrder = [
      'Talent', 'Sensor', 'Cannon', 'Turret', 'Torpedo', 'Missile',
      'Crew', 'Gunner', 'Astromech', 'Device', 'Payload', 'Illicit',
      'Modification', 'Title', 'Configuration', 'Force Power', 'Tech',
      'Tactical Relay', 'Hyperdrive', 'Hardpoint', 'Team', 'Cargo', 'Command'
    ];

    groupList.sort((a, b) => {
      const idxA = slotOrder.indexOf(a.slot);
      const idxB = slotOrder.indexOf(b.slot);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.slot.localeCompare(b.slot);
    });

    groupList.forEach(grp => {
      grp.items.sort((a, b) => {
        if (sortField === 'cost') {
          const costA = typeof a.cost === 'number' ? a.cost : (a.cost?.value ?? 999);
          const costB = typeof b.cost === 'number' ? b.cost : (b.cost?.value ?? 999);
          return sortAsc ? costA - costB : costB - costA;
        }
        if (sortField === 'diff') {
          const diffA = a.diff !== null && a.diff !== undefined ? a.diff : 0;
          const diffB = b.diff !== null && b.diff !== undefined ? b.diff : 0;
          return sortAsc ? diffA - diffB : diffB - diffA;
        }
        return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      });
    });

    return groupList;
  }

  function renderChassisHeaderRow(ship, pilotCount) {
    if (!ship) return '';
    const colSpan = getTableColSpan();

    const statPills = [];
    if (ship.stats && Array.isArray(ship.stats)) {
      const statMap = {
        'attack': { glyph: '%', cls: 'stat-attack', label: 'Attack' },
        'agility': { glyph: '^', cls: 'stat-agility', label: 'Agility' },
        'hull': { glyph: '&', cls: 'stat-hull', label: 'Hull' },
        'shields': { glyph: '*', cls: 'stat-shields', label: 'Shields' },
        'energy': { glyph: '(', cls: 'stat-energy', label: 'Energy' },
        'force': { glyph: 'h', cls: 'stat-force', label: 'Force' },
        'charge': { glyph: 'g', cls: 'stat-charge', label: 'Charge' }
      };
      ship.stats.forEach(s => {
        const meta = statMap[s.type] || { glyph: s.type[0], cls: 'stat-hull', label: s.type };
        const arc = s.arc ? `<span class="game-symbol-glyph symbol-arc" style="font-size: 0.85em;">{</span>` : '';
        statPills.push(`<span class="chassis-stat-pill ${meta.cls}" title="${meta.label}: ${s.value}">
          <span class="xwing-icon">${meta.glyph}</span>${arc} ${s.value}
        </span>`);
      });
    }

    return `
      <tr class="chassis-header-row" data-ship-xws="${ship.xws}">
        <td colspan="${colSpan}">
          <div class="chassis-header-content">
            <div class="chassis-header-left">
              ${ship.fontGlyph ? `<span class="xwing-ship chassis-header-glyph" title="${ship.name}">${ship.fontGlyph}</span>` : ''}
              <span class="chassis-header-name">${ship.name}</span>
              <span class="chassis-header-size">${ship.size}</span>
              <div class="chassis-header-stats">${statPills.join('')}</div>
            </div>
            <div class="chassis-header-right">
              <button class="chassis-dial-btn" data-ship="${ship.xws}" title="View Maneuver Dial for ${ship.name}">
                <span>Dial</span> ⬡
              </button>
              <span class="chassis-pilot-count">${pilotCount} pilot${pilotCount === 1 ? '' : 's'}</span>
            </div>
          </div>
        </td>
      </tr>
    `;
  }

  function renderSlotHeaderRow(slotType, upgradeCount) {
    const colSpan = getTableColSpan();
    const glyph = SLOT_ICONS[slotType] || '';

    return `
      <tr class="slot-header-row" data-slot="${slotType}">
        <td colspan="${colSpan}">
          <div class="slot-header-content">
            <div class="slot-header-left">
              ${glyph ? `<span class="slot-glyph slot-header-glyph">${glyph}</span>` : ''}
              <span class="slot-header-name">${slotType}</span>
            </div>
            <div class="slot-header-right">
              <span class="slot-card-count">${upgradeCount} card${upgradeCount === 1 ? '' : 's'}</span>
            </div>
          </div>
        </td>
      </tr>
    `;
  }

  function renderBody(items) {
    if (items.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="25" class="empty-state">No matching cards found.</td></tr>`;
      return;
    }

    if (currentTab === 'changes') {
      tableBody.innerHTML = items.map(item => renderChangesRow(item)).join('');
      attachRowEvents();
      return;
    }

    if (currentTab === 'upgrades') {
      const grouped = groupUpgradesBySlot(items);
      let html = '';
      for (const group of grouped) {
        html += renderSlotHeaderRow(group.slot, group.items.length);
        html += group.items.map(item => renderCardRow(item)).join('');
      }
      tableBody.innerHTML = html;
      attachRowEvents();
      return;
    }

    // Faction tabs: group pilots by chassis
    const grouped = groupPilotsByChassis(items);
    let html = '';
    for (const group of grouped) {
      html += renderChassisHeaderRow(group.ship, group.items.length);
      html += group.items.map(item => renderCardRow(item)).join('');
    }
    tableBody.innerHTML = html;
    attachRowEvents();
  }

  function attachRowEvents() {
    tableBody.querySelectorAll('tr.clickable').forEach(tr => {
      tr.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' || e.target.closest('a') || e.target.closest('button')) return;
        const key = tr.dataset.key;
        openDrawer(key);
      });
    });

    tableBody.querySelectorAll('button.chassis-dial-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const shipXws = btn.dataset.ship;
        openShipDrawer(shipXws);
      });
    });

    tableBody.querySelectorAll('tr.chassis-header-row').forEach(tr => {
      tr.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
        const shipXws = tr.dataset.shipXws;
        if (shipXws) openShipDrawer(shipXws);
      });
    });
  }

  function renderDiffBadge(diff, hasCostChange, isNewCard) {
    if (isNewCard) {
      return `<span class="diff-badge diff-new" title="New card">NEW</span>`;
    }
    if (diff !== null && diff !== undefined && diff !== 0) {
      if (diff < 0) {
        return `<span class="diff-badge diff-buff" title="Buff: ${diff} points">${diff}</span>`;
      }
      return `<span class="diff-badge diff-nerf" title="Nerf: +${diff} points">+${diff}</span>`;
    }
    if (hasCostChange) {
      return `<span class="diff-badge diff-changed" title="Variable points updated">changed</span>`;
    }
    return `<span class="diff-badge diff-neutral">-</span>`;
  }

  function renderCommitChip(commit) {
    if (!commit || !commit.sha) return '<span class="text-dim">-</span>';
    return `<a class="commit-chip" href="${commit.url}" target="_blank" rel="noopener noreferrer" title="${commit.message || ''}">
      <span>#${commit.sha}</span>
    </a>`;
  }

  function renderChangesRow(item) {
    const changesList = item.changes || [];
    const costChange = changesList.find(c => c.type === 'cost');
    const paramChanges = changesList.filter(c => c.type !== 'cost');
    const defaultCommit = (changesList[0] && changesList[0].commit) || null;

    const isNew = changesList.some(c => c.type === 'added');
    const diffHtml = costChange
      ? renderDiffBadge(costChange.diff, true, false)
      : (isNew ? renderDiffBadge(null, false, true) : '<span class="diff-badge diff-neutral">-</span>');

    const prevPointsHtml = costChange ? costChange.oldFormatted : '-';

    const paramsHtml = paramChanges.length > 0
      ? paramChanges.map(p => `<span class="param-changed-badge" title="${p.summary}">${p.summary}</span>`).join(' ')
      : '<span class="text-dim">Points only</span>';

    let typeIconHtml = '';
    if (item.shipFontGlyph) {
      typeIconHtml = `<span class="xwing-ship" title="${item.type}">${item.shipFontGlyph}</span>`;
    } else if (item.slotFontGlyph) {
      typeIconHtml = `<span class="slot-glyph" title="${item.type}">${item.slotFontGlyph}</span>`;
    }

    return `<tr class="clickable" data-key="${item.key}">
      <td>
        <div class="chassis-cell">
          ${typeIconHtml}
          <span style="font-weight: 600;">${item.type}</span>
        </div>
      </td>
      <td>
        <div class="card-name-container">
          <span class="card-title">${item.name}</span>
        </div>
      </td>
      <td><span class="points-curr">${item.pointsFormatted}</span></td>
      <td>${diffHtml}</td>
      <td><span class="points-hist">${prevPointsHtml}</span></td>
      <td>${paramsHtml}</td>
      <td>${renderCommitChip(defaultCommit)}</td>
    </tr>`;
  }

  function renderCardRow(item) {
    const isPilot = item.kind === 'pilot' || (item.key && item.key.startsWith('pilot:')) || (item.initiative !== undefined && item.initiative !== null);
    const hasChanges = item.recentChanges && item.recentChanges.length > 0;
    const hasCostChange = hasChanges && item.recentChanges.some(c => c.type === 'cost');
    const isNew = hasChanges && item.recentChanges.some(c => c.type === 'added');
    const formatChange = hasChanges && item.recentChanges.find(c => c.type === 'format');
    const kwChange = hasChanges && item.recentChanges.find(c => c.type === 'keywords');
    const slotsChange = hasChanges && item.recentChanges.find(c => c.type === 'slots');
    const restChange = hasChanges && item.recentChanges.find(c => c.type === 'restrictions');

    const commitObj = (hasChanges && item.recentChanges[0] && item.recentChanges[0].commit) || null;

    let formatLabel = 'Standard';
    let formatClass = 'format-standard';
    if (!item.standard) {
      if (item.wildspace) { formatLabel = 'Wild Space'; formatClass = 'format-wildspace'; }
      else if (item.epic) { formatLabel = 'Epic'; formatClass = 'format-epic'; }
      else { formatLabel = 'Custom'; formatClass = 'format-wildspace'; }
    }

    let bullets = '';
    if (item.limited === 1) bullets = '<span class="card-unique-dot">•</span>';
    else if (item.limited === 2) bullets = '<span class="card-unique-dot">••</span>';
    else if (item.limited === 3) bullets = '<span class="card-unique-dot">•••</span>';

    let extraTag = '';
    if (item.xws && item.xws.endsWith('-lsl')) {
      extraTag = '<span class="card-tag tag-lsl">LSL</span>';
    } else if (item.standardLoadout) {
      extraTag = '<span class="card-tag tag-sl">SL</span>';
    }

    // Chassis / Ship Cell with xwing-miniatures-ships font
    let typeHtml = '';
    if (isPilot) {
      typeHtml = `<div class="chassis-cell">
        ${item.shipFontGlyph ? `<span class="xwing-ship" title="${item.shipName}">${item.shipFontGlyph}</span>` : ''}
        <span>${item.shipName || item.type}</span>
      </div>`;
    } else {
      typeHtml = `<div class="slot-name-badge">
        ${item.slotFontGlyph ? `<span class="slot-glyph" title="${item.type}">${item.slotFontGlyph}</span>` : ''}
        <span>${item.type}</span>
      </div>`;
    }

    // Upgrade Bar / Slots rendered with font glyphs
    const slotBarHtml = isPilot ? renderSlotBar(item.slots) : (item.slots && item.slots.length > 0 ? renderSlotBar(item.slots) : '<span class="text-dim">-</span>');

    // Restrictions
    let restText = '';
    if (item.restrictions && item.restrictions.length > 0) {
      restText = item.restrictions.map(r => {
        if (r.factions) return r.factions.join(', ');
        if (r.sizes) return r.sizes.join(', ') + ' ship';
        if (r.ships) return r.ships.join(', ');
        return JSON.stringify(r);
      }).join('; ');
    }

    const kwHtml = (item.keywords || []).map(k => `<span class="keyword-chip">${k}</span>`).join('');

    let histCellsHtml = '';
    if (showHistory) {
      appData.historyCycles.filter(c => c !== 'Sep 26').forEach(cycle => {
        const val = (item.history && item.history[cycle]) || '-';
        histCellsHtml += `<td class="td-history"><span class="points-hist">${val}</span></td>`;
      });
    }

    return `<tr class="clickable ${hasChanges ? 'cell-highlight-blue' : ''}" data-key="${item.key}">
      <td>
        <span class="${formatClass}">${formatLabel}</span>
        ${formatChange ? `<span class="param-changed-badge" title="${formatChange.summary}">Moved</span>` : ''}
      </td>
      <td>${typeHtml}</td>
      <td>
        <div class="card-name-container">
          <span class="card-title">
            ${isPilot && item.initiative !== undefined && item.initiative !== null ? `<span class="pilot-init-badge init-${item.initiative}" title="Initiative ${item.initiative}">${item.initiative}</span>` : ''}
            ${bullets} ${item.name} ${extraTag}
          </span>
          ${item.caption ? `<span class="card-caption">${item.caption}</span>` : ''}
        </div>
      </td>
      <td>
        ${slotBarHtml}
        ${slotsChange ? `<span class="param-changed-badge" title="${slotsChange.summary}">Slots</span>` : ''}
      </td>
      <td>
        <span style="font-size: 0.78rem; color: var(--text-muted);">${restText || '-'}</span>
        ${restChange ? `<span class="param-changed-badge" title="${restChange.summary}">Updated</span>` : ''}
      </td>
      <td>
        ${kwHtml || '<span class="text-dim">-</span>'}
        ${kwChange ? `<span class="param-changed-badge" title="${kwChange.summary}">+Kw</span>` : ''}
      </td>
      <td><span class="points-curr">${item.pointsFormatted}</span></td>
      <td>${renderDiffBadge(item.diff, hasCostChange, isNew)}</td>
      <td>${renderCommitChip(commitObj)}</td>
      ${histCellsHtml}
    </tr>`;
  }

  function renderManeuverDial(dialArray) {
    if (!dialArray || !Array.isArray(dialArray) || dialArray.length === 0) return '';

    // Group maneuvers by speed (0 to 5)
    const maneuversBySpeed = {};
    dialArray.forEach(m => {
      const speed = parseInt(m[0], 10);
      const bearing = m[1];
      const diff = m[2];
      if (!maneuversBySpeed[speed]) maneuversBySpeed[speed] = [];
      maneuversBySpeed[speed].push({ bearing, diff });
    });

    const diffClassMap = {
      'B': 'maneuver-blue',
      'W': 'maneuver-white',
      'R': 'maneuver-red',
      'P': 'maneuver-purple'
    };

    // Columns: [S-Loop/T-Roll Left, Turn Left, Bank Left, Straight, Bank Right, Turn Right, K-Turn/Stationary, S-Loop/T-Roll Right]
    const speeds = Object.keys(maneuversBySpeed).map(s => parseInt(s, 10)).sort((a, b) => b - a);

    let rowsHtml = speeds.map(speed => {
      const list = maneuversBySpeed[speed];
      const cells = new Array(8).fill('');

      list.forEach(m => {
        const info = BEARING_GLYPHS[m.bearing] || { glyph: m.bearing, name: m.bearing, col: 3 };
        const cls = diffClassMap[m.diff] || 'maneuver-white';
        cells[info.col] = `<span class="maneuver-glyph ${cls}" title="${info.name}">${info.glyph}</span>`;
      });

      return `<tr>
        <td class="dial-speed-cell">${speed}</td>
        ${cells.map(c => `<td>${c}</td>`).join('')}
      </tr>`;
    }).join('');

    return `
      <div class="detail-section">
        <div class="detail-section-title">Maneuver Dial</div>
        <table class="maneuver-dial-table">
          <thead>
            <tr style="color: var(--text-dim); font-size: 0.72rem;">
              <th>Speed</th><th>Special</th><th>Turn</th><th>Bank</th><th>Straight</th><th>Bank</th><th>Turn</th><th>Special</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  function renderShipStatsAndActions(ship) {
    if (!ship) return '';

    // Stats
    const statGlyphs = {
      'agility': { glyph: '^', cls: 'stat-agility', label: 'Agility' },
      'hull': { glyph: '&', cls: 'stat-hull', label: 'Hull' },
      'shields': { glyph: '*', cls: 'stat-shields', label: 'Shields' },
      'energy': { glyph: '(', cls: 'stat-energy', label: 'Energy' },
      'force': { glyph: 'h', cls: 'stat-force', label: 'Force' },
      'charge': { glyph: 'g', cls: 'stat-charge', label: 'Charge' },
      'attack': { glyph: '%', cls: 'stat-attack', label: 'Attack' }
    };

    let statsHtml = '';
    if (ship.stats && Array.isArray(ship.stats)) {
      statsHtml = `<div class="ship-stats-bar">${ship.stats.map(s => {
        const meta = statGlyphs[s.type] || { glyph: s.type[0], cls: 'stat-hull', label: s.type };
        const arc = s.arc ? `<span class="game-symbol-glyph symbol-arc" style="font-size: 0.9em;">{</span>` : '';
        return `<span class="ship-stat-pill ${meta.cls}" title="${meta.label}">
          <span class="xwing-icon">${meta.glyph}</span> ${arc} ${s.value}
        </span>`;
      }).join('')}</div>`;
    }

    // Actions
    let actionsHtml = '';
    if (ship.actions && Array.isArray(ship.actions)) {
      actionsHtml = `<div class="ship-actions-bar">${ship.actions.map(a => {
        const actKey = a.type.toLowerCase().replace(/[^a-z]/g, '');
        const meta = SYMBOL_MAP[actKey] || { glyph: a.type[0] };
        const diffCls = a.difficulty === 'Red' ? 'action-difficulty-red' : (a.difficulty === 'Purple' ? 'action-difficulty-purple' : 'action-difficulty-white');

        let linkedHtml = '';
        if (a.linked) {
          const lKey = a.linked.type.toLowerCase().replace(/[^a-z]/g, '');
          const lMeta = SYMBOL_MAP[lKey] || { glyph: a.linked.type[0] };
          const lDiffCls = a.linked.difficulty === 'Red' ? 'action-difficulty-red' : (a.linked.difficulty === 'Purple' ? 'action-difficulty-purple' : 'action-difficulty-white');
          linkedHtml = ` <span class="xwing-icon" style="color: var(--text-dim);">></span> <span class="action-pill ${lDiffCls}"><span class="xwing-icon action-icon">${lMeta.glyph}</span> ${a.linked.type}</span>`;
        }

        return `<span class="action-pill ${diffCls}">
          <span class="xwing-icon action-icon">${meta.glyph}</span> ${a.type}
        </span>${linkedHtml}`;
      }).join('')}</div>`;
    }

    return `
      <div class="detail-section">
        <div class="detail-section-title">Ship Statistics & Action Bar</div>
        ${statsHtml}
        ${actionsHtml}
      </div>
    `;
  }

  function openShipDrawer(shipXws) {
    if (!appData || !appData.ships) return;
    const ship = appData.ships[shipXws];
    if (!ship) return;

    const drawerTitle = document.getElementById('drawerTitle');
    const drawerContent = document.getElementById('drawerContent');

    let titleGlyph = '';
    if (ship.fontGlyph) {
      titleGlyph = `<span class="xwing-ship" style="font-size: 1.8rem; margin-right: 0.5rem; color: var(--accent-blue);">${ship.fontGlyph}</span>`;
    }

    drawerTitle.innerHTML = `${titleGlyph} ${ship.name}`;

    const statsActionsHtml = renderShipStatsAndActions(ship);
    const dialHtml = renderManeuverDial(ship.dial);

    // List pilots for this ship (matching current faction if on a faction tab)
    const factionPilots = appData.pilots.filter(p => {
      if (p.shipXws !== shipXws) return false;
      if (currentTab !== 'changes' && currentTab !== 'upgrades' && p.faction !== currentTab) return false;
      return true;
    });

    let pilotsSectionHtml = '';
    if (factionPilots.length > 0) {
      pilotsSectionHtml = `
        <div class="detail-section">
          <div class="detail-section-title">Pilots (${factionPilots.length})</div>
          <div style="display: flex; flex-direction: column; gap: 0.4rem;">
            ${factionPilots.map(p => `
              <div class="clickable" data-pilot-key="${p.key}" style="display: flex; justify-content: space-between; align-items: center; padding: 0.45rem 0.65rem; background: rgba(255,255,255,0.04); border-radius: 4px; font-size: 0.85rem; cursor: pointer; transition: background 0.15s;">
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                  <span class="pilot-init-badge init-${p.initiative}">${p.initiative}</span>
                  <strong>${p.name}</strong>
                  ${p.caption ? `<span class="card-caption" style="margin-left: 0.25rem;">${p.caption}</span>` : ''}
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <span class="points-curr">${p.pointsFormatted}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    drawerContent.innerHTML = `
      ${statsActionsHtml}
      ${dialHtml}
      ${pilotsSectionHtml}
    `;

    drawerContent.querySelectorAll('[data-pilot-key]').forEach(el => {
      el.addEventListener('click', () => {
        const key = el.dataset.pilotKey;
        openDrawer(key);
      });
    });

    modalBackdrop.classList.add('open');
  }

  function openDrawer(key) {
    if (!appData) return;
    const item = appData.pilots.find(p => p.key === key)
      || appData.upgrades.find(u => u.key === key)
      || appData.summaryChanges.find(c => c.key === key);

    if (!item) return;

    const drawerTitle = document.getElementById('drawerTitle');
    const drawerContent = document.getElementById('drawerContent');

    const isPilot = item.kind === 'pilot' || (item.key && item.key.startsWith('pilot:')) || Boolean(item.shipXws);
    const ship = isPilot && appData.ships ? appData.ships[item.shipXws] : null;

    let titleGlyph = '';
    if (isPilot && item.shipFontGlyph) {
      titleGlyph = `<span class="xwing-ship" style="font-size: 1.8rem; margin-right: 0.5rem; color: var(--accent-blue);">${item.shipFontGlyph}</span>`;
    } else if (item.slotFontGlyph) {
      titleGlyph = `<span class="slot-glyph" style="font-size: 1.3rem; width: 28px; height: 28px; margin-right: 0.5rem; color: var(--accent-gold);">${item.slotFontGlyph}</span>`;
    }

    drawerTitle.innerHTML = `${titleGlyph} ${item.name}`;

    const imageUrl = item.image || item.artwork || '';
    const imgHtml = imageUrl ? `<img class="card-image-preview" src="${imageUrl}" alt="${item.name}" loading="lazy" />` : '';

    const statsActionsHtml = ship ? renderShipStatsAndActions(ship) : '';
    const dialHtml = ship ? renderManeuverDial(ship.dial) : '';

    const abilityHtml = item.ability ? `
      <div class="detail-section">
        <div class="detail-section-title">Ability & Card Text</div>
        <div class="ability-text">${renderGameText(item.ability)}</div>
      </div>
    ` : '';

    const shipAbilityHtml = item.shipAbility ? `
      <div class="detail-section">
        <div class="detail-section-title">Ship Ability: ${item.shipAbility.name}</div>
        <div class="ability-text">${renderGameText(item.shipAbility.text)}</div>
      </div>
    ` : '';

    let historyRowsHtml = '';
    if (item.history && Object.keys(item.history).length > 0) {
      historyRowsHtml = Object.entries(item.history).map(([cycle, pts]) => {
        return `<tr>
          <td><strong>${cycle}</strong></td>
          <td style="font-family: var(--font-mono); font-weight: 600;">${pts}</td>
        </tr>`;
      }).join('');
    } else {
      historyRowsHtml = `<tr><td>Current (Sep 26)</td><td>${item.pointsFormatted}</td></tr>`;
    }

    const historySectionHtml = `
      <div class="detail-section">
        <div class="detail-section-title">Retrospective Points Timeline</div>
        <table class="history-table">
          <thead><tr><th>Update Cycle</th><th>Points</th></tr></thead>
          <tbody>${historyRowsHtml}</tbody>
        </table>
      </div>
    `;

    let changesSectionHtml = '';
    const cardChanges = item.recentChanges || item.changes || [];
    if (cardChanges.length > 0) {
      changesSectionHtml = `
        <div class="detail-section">
          <div class="detail-section-title">Recent Parameter & Points Changes</div>
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            ${cardChanges.map(c => `
              <div style="font-size: 0.85rem; padding: 0.5rem; background: rgba(255,255,255,0.04); border-radius: 4px; border-left: 3px solid #38bdf8;">
                <div><strong>${c.summary}</strong></div>
                ${c.commit ? `<div style="margin-top: 0.35rem;">Commit: <a class="commit-chip" href="${c.commit.url}" target="_blank">#${c.commit.sha} - ${c.commit.message}</a></div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    drawerContent.innerHTML = `
      ${imgHtml}
      ${statsActionsHtml}
      ${abilityHtml}
      ${shipAbilityHtml}
      ${dialHtml}
      ${changesSectionHtml}
      ${historySectionHtml}
    `;

    modalBackdrop.classList.add('open');
  }

  function closeModal() {
    modalBackdrop.classList.remove('open');
  }

  function exportCSV() {
    const items = sortItems(getFilteredItems());
    if (items.length === 0) {
      alert('No items to export.');
      return;
    }

    const headers = ['Format', 'Type', 'Name', 'UpgradeBar', 'Restrictions', 'Keywords', 'Sep26', 'ChangeVsPrevious'];
    if (showHistory) {
      appData.historyCycles.filter(c => c !== 'Sep 26').forEach(c => headers.push(c));
    }

    const rows = items.map(item => {
      const isPilot = item.kind === 'pilot' || (item.key && item.key.startsWith('pilot:')) || Boolean(item.shipXws);
      const type = item.shipName || item.type || '';
      const format = item.standard ? 'Standard' : (item.wildspace ? 'Wild Space' : 'Epic');
      const slots = isPilot ? (item.slots || []).join(', ') : (item.slots ? item.slots.join(', ') : '');
      const rest = (item.restrictions || []).map(r => JSON.stringify(r)).join('; ');
      const kw = (item.keywords || []).join(', ');
      const diff = item.diff !== null && item.diff !== undefined ? item.diff : '';

      const r = [
        `"${format}"`,
        `"${type.replace(/"/g, '""')}"`,
        `"${item.name.replace(/"/g, '""')}"`,
        `"${slots}"`,
        `"${rest.replace(/"/g, '""')}"`,
        `"${kw.replace(/"/g, '""')}"`,
        `"${item.pointsFormatted.replace(/"/g, '""')}"`,
        `"${diff}"`
      ];

      if (showHistory) {
        appData.historyCycles.filter(c => c !== 'Sep 26').forEach(c => {
          const val = (item.history && item.history[c]) || '';
          r.push(`"${val.replace(/"/g, '""')}"`);
        });
      }

      return r.join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `xwing-legacy-points-${currentTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  window.addEventListener('DOMContentLoaded', init);
})();
