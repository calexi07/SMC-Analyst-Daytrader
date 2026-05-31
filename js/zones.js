// ── Zones Module ──

function zSafeFloat(val) {
  if (!val && val !== 0) return null;
  var n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? null : n;
}

const Zones = {

  _filters: { weekly: 'all', daily: 'all', h4: 'all' },

  async renderAll(pair) {
    const dashboard = document.getElementById('pair-dashboard');
    dashboard.innerHTML = `
      <div class="pair-header">
        <div class="pair-name">${pair}</div>
        <div class="pair-live-price-wrap">
          <span class="live-price-label">LIVE</span>
          <span id="pair-live-price" class="pair-live-price" style="display:none;"></span>
        </div>
      </div>
      <div class="pending-zones" id="pending-zones-${pair}" style="display:none;"></div>
      <div class="tf-sections" id="tf-sections"></div>
      <div class="zone-map-section">
        <div class="zone-map-header">
          <span class="zone-map-title">🗺 Zone Map</span>
          <span class="zone-map-sub">Distance from current price</span>
        </div>
        <div id="zone-map-${pair}" class="zone-map"><div class="loader">Waiting for price data...</div></div>
      </div>
      <div class="analysis-section" id="analysis-section-${pair}"></div>
    `;

    const tfSections = document.getElementById('tf-sections');

    for (const tf of TIMEFRAMES) {
      const section = document.createElement('div');
      section.className = 'tf-section';
      section.id = `tf-${tf.key}`;
      section.innerHTML = `
        <div class="tf-header" data-tf="${tf.key}">
          <div class="tf-header-left">
            <span class="tf-label ${tf.cssClass}">${tf.label}</span>
            <span class="tf-count" id="count-${tf.key}">loading...</span>
          </div>
          <div class="tf-header-right">
            <button class="btn-discord-tf btn-sm" id="discord-${tf.key}" title="Share zones to Discord" style="font-size:11px; padding:3px 8px;">🔗 Discord</button>
            <span class="tf-chevron">▼</span>
          </div>
        </div>
        <div class="tf-body">
          <div class="filter-bar" id="filter-${tf.key}">
            <button class="filter-btn active" data-tf="${tf.key}" data-status="all">All</button>
            <button class="filter-btn fresh"  data-tf="${tf.key}" data-status="fresh">Fresh</button>
            <button class="filter-btn tested" data-tf="${tf.key}" data-status="tested">Tested</button>
            <button class="filter-btn broken" data-tf="${tf.key}" data-status="broken">Broken</button>
          </div>
          <div class="zones-list" id="zones-${tf.key}">
            <div class="loader">Loading zones...</div>
          </div>
          <button class="btn-add-zone" data-tf="${tf.key}" data-pair="${pair}">
            + Add Zone
          </button>
        </div>
      `;
      tfSections.appendChild(section);

      section.querySelector('.tf-header').addEventListener('click', () => {
        section.classList.toggle('open');
      });

      section.querySelector('.btn-add-zone').addEventListener('click', (e) => {
        e.stopPropagation();
        Zones.openAddModal(pair, tf.key);
      });

      section.querySelector(`#discord-${tf.key}`).addEventListener('click', (e) => {
        e.stopPropagation();
        Zones.openDiscordZonesModal(pair, tf.key, tf.label);
      });

      section.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const tfKey  = btn.dataset.tf;
          const status = btn.dataset.status;
          Zones._filters[tfKey] = status;
          section.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          Zones.renderFiltered(pair, tfKey);
        });
      });

      this.loadZones(pair, tf.key);
    }

    // Render analysis section below zones
    const analysisContainer = document.getElementById(`analysis-section-${pair}`);
    if (analysisContainer) await Analysis.render(pair, analysisContainer);

    // Start live price polling
    Live.startPolling(pair);
  },

  async loadZones(pair, timeframe) {
    const list  = document.getElementById(`zones-${timeframe}`);
    const count = document.getElementById(`count-${timeframe}`);
    if (!list) return;

    list.innerHTML = '<div class="loader">Loading...</div>';
    const zones = await DB.getZones(pair, timeframe);
    list.dataset.cache = JSON.stringify(zones);
    count.textContent = `${zones.length} zone${zones.length !== 1 ? 's' : ''}`;
    this._renderZoneList(list, zones, Zones._filters[timeframe] || 'all');
  },

  renderFiltered(pair, timeframe) {
    const list  = document.getElementById(`zones-${timeframe}`);
    if (!list) return;
    const zones  = JSON.parse(list.dataset.cache || '[]');
    const filter = Zones._filters[timeframe] || 'all';
    this._renderZoneList(list, zones, filter);
  },

  _renderZoneList(list, zones, filter) {
    const filtered = filter === 'all' ? zones : zones.filter(z => z.status === filter);
    if (filtered.length === 0) {
      list.innerHTML = `<div class="loader" style="padding:14px 0; font-size:11px;">No ${filter === 'all' ? '' : filter + ' '}zones</div>`;
      return;
    }
    list.innerHTML = '';
    filtered.forEach(z => list.appendChild(this.buildZoneCard(z)));
  },

  buildZoneCard(zone) {
    const card = document.createElement('div');
    card.className = `zone-card ${zone.status}`;
    card.dataset.id = zone.id;

    const testsHtml = (zone.status === 'tested' && zone.test_count > 0)
      ? `<span class="zone-tests">×${zone.test_count}</span>` : '';

    const date = zone.zone_date
      ? new Date(zone.zone_date).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' })
      : '';

    const nextStatus = { fresh: 'tested', tested: 'broken', broken: 'fresh' };
    const nextLabel  = { fresh: '→ Tested', tested: '→ Broken', broken: '→ Fresh' };

    // Direction badge
    const dirHtml = zone.direction
      ? `<span class="zone-dir ${zone.direction}">${zone.direction === 'bull' ? '▲ Bull' : '▼ Bear'}</span>`
      : '';

    card.innerHTML = `
      <div class="zone-row">
        ${dirHtml}
        <span class="zone-tag tag-${zone.status}">${zone.status}</span>
        <span class="zone-name">${zone.name}</span>
        <div class="zone-meta">
          ${testsHtml}
          <span class="zone-date">${date}</span>
        </div>
        <div class="zone-actions">
          <button class="btn-status-update" data-id="${zone.id}" data-next="${nextStatus[zone.status]}" data-pair="${zone.pair}" data-tf="${zone.timeframe}" title="Update status">${nextLabel[zone.status]}</button>
          <button class="btn-icon edit" title="Edit">✎</button>
          <button class="btn-icon del" title="Delete">✕</button>
        </div>
      </div>
      <div class="zone-comments" id="comments-${zone.id}">
        <div class="comments-header">
          <span class="comments-title">Jobs</span>
        </div>
        <div class="comment-list" id="comment-list-${zone.id}">
          <div class="loader">Loading...</div>
        </div>
        <button class="btn-add-setup" data-zone="${zone.id}">+ Log Setup</button>
      </div>
    `;

    card.querySelector('.zone-row').addEventListener('click', (e) => {
      if (e.target.closest('.zone-actions')) return;
      this.toggleComments(card, zone.id);
    });

    card.querySelector('.btn-status-update').addEventListener('click', async (e) => {
      e.stopPropagation();
      const btn  = e.currentTarget;
      const next = btn.dataset.next;
      const pair = btn.dataset.pair;
      const tf   = btn.dataset.tf;
      btn.textContent = '...'; btn.disabled = true;
      const updates = { status: next };
      if (next === 'tested') updates.test_count = (zone.test_count || 0) + 1;
      if (next === 'fresh')  updates.test_count = 0;
      const updated = await DB.updateZone(zone.id, updates);
      if (updated) await Zones.loadZones(pair, tf);
    });

    card.querySelector('.btn-icon.edit').addEventListener('click', (e) => {
      e.stopPropagation();
      this.openEditModal(zone);
    });

    card.querySelector('.btn-icon.del').addEventListener('click', (e) => {
      e.stopPropagation();
      this.confirmDelete(zone);
    });

    card.querySelector('.btn-add-setup').addEventListener('click', () => {
      Setups.openModal(zone.id, zone.pair);
    });

    return card;
  },

  async toggleComments(card, zoneId) {
    const wasOpen = card.classList.contains('expanded');
    card.classList.toggle('expanded', !wasOpen);
    if (!wasOpen) await Setups.loadSetups(zoneId);
  },

  // ── Get active city names for this pair (non-broken zones) ──
  _getActiveCities(pair) {
    const allLists = ['weekly', 'daily', 'h4'].map(tf => {
      const el = document.getElementById(`zones-${tf}`);
      if (!el || !el.dataset.cache) return [];
      return JSON.parse(el.dataset.cache);
    }).flat();

    return allLists
      .filter(z => z.pair === pair && z.status !== 'broken')
      .map(z => z.name);
  },

  // ── Build city dropdown options ──
  _buildCityOptions(pair, direction) {
    const usedCities = this._getActiveCities(pair);
    const available  = Cities.getAvailable(pair, direction, usedCities);

    if (available.length === 0) {
      return `<option value="">— No cities available —</option>`;
    }
    return available.map(c =>
      `<option value="${c}">${c}</option>`
    ).join('');
  },

  openAddModal(pair, timeframe) {
    const modal   = document.getElementById('zone-modal');
    const overlay = document.getElementById('modal-overlay');
    const hasCities = !!PAIR_CITIES[pair];

    modal.innerHTML = `
      <div class="modal-header">
        <span class="modal-title">Add Zone — ${timeframe.toUpperCase()}</span>
        <button class="modal-close" id="zone-modal-close">✕</button>
      </div>
      <div class="modal-body">
        ${hasCities ? `
        <div class="form-group">
          <label class="form-label">Direction</label>
          <div class="dir-toggle" id="dir-toggle">
            <button class="dir-btn bull active" data-dir="bull">▲ Bullish</button>
            <button class="dir-btn bear" data-dir="bear">▼ Bearish</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">City Name</label>
          <select class="form-select" id="z-city">
            ${this._buildCityOptions(pair, 'bull')}
          </select>
          <span class="form-hint" id="city-hint"></span>
        </div>
        ` : `
        <div class="form-group">
          <label class="form-label">Zone Name</label>
          <input class="form-input" id="z-name" placeholder="e.g. Daily Demand 1.0820–1.0850" />
        </div>
        `}
        <div class="form-group">
          <label class="form-label">Date Created</label>
          <input class="form-input" id="z-date" type="date" value="${new Date().toISOString().slice(0,10)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" id="z-status">
            <option value="fresh">Fresh</option>
            <option value="tested">Tested</option>
            <option value="broken">Broken</option>
          </select>
        </div>
        <div class="form-group" id="tests-group" style="display:none;">
          <label class="form-label">Times Tested</label>
          <div class="tests-group">
            <input class="form-input" id="z-tests" type="number" min="1" value="1" />
            <span class="tests-label">times</span>
          </div>
        </div>
        <div class="setup-row-2" style="grid-template-columns:1fr 1fr;">
          <div class="form-group">
            <label class="form-label">Price Top</label>
            <input class="form-input" id="z-top" type="number" step="0.00001" placeholder="1.08500" />
          </div>
          <div class="form-group">
            <label class="form-label">Price Bottom</label>
            <input class="form-input" id="z-btm" type="number" step="0.00001" placeholder="1.08200" />
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="zone-modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="zone-modal-save">Add Zone</button>
      </div>
    `;

    // Direction toggle — rebuild city list on switch
    if (hasCities) {
      let currentDir = 'bull';
      modal.querySelectorAll('.dir-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          currentDir = btn.dataset.dir;
          modal.querySelectorAll('.dir-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const citySelect = modal.querySelector('#z-city');
          citySelect.innerHTML = Zones._buildCityOptions(pair, currentDir);
          const count = Cities.getAvailable(pair, currentDir, Zones._getActiveCities(pair)).length;
          modal.querySelector('#city-hint').textContent = `${count} cities available`;
        });
      });
      // Initial hint
      const initialCount = Cities.getAvailable(pair, 'bull', this._getActiveCities(pair)).length;
      modal.querySelector('#city-hint').textContent = `${initialCount} cities available`;
    }

    modal.querySelector('#z-status').addEventListener('change', e => {
      modal.querySelector('#tests-group').style.display = e.target.value === 'tested' ? 'flex' : 'none';
    });

    var close = function() { modal.classList.add('hidden'); overlay.classList.add('hidden'); };
    modal.querySelector('#zone-modal-close').addEventListener('click', close);
    modal.querySelector('#zone-modal-cancel').addEventListener('click', close);
    overlay.addEventListener('click', close, { once: true });

    modal.querySelector('#zone-modal-save').addEventListener('click', async () => {
      const status = modal.querySelector('#z-status').value;
      const date   = modal.querySelector('#z-date').value;
      const tests  = status === 'tested' ? parseInt(modal.querySelector('#z-tests').value) || 1 : 0;

      let name, direction;
      if (hasCities) {
        const cityEl = modal.querySelector('#z-city');
        name = cityEl ? cityEl.value : '';
        direction = modal.querySelector('.dir-btn.active')?.dataset.dir || null;
      } else {
        name = modal.querySelector('#z-name').value.trim();
        direction = null;
      }

      if (!name) { alert('Please select a city or enter a zone name.'); return; }

      const btn = modal.querySelector('#zone-modal-save');
      btn.textContent = 'Saving...'; btn.disabled = true;

      const top = zSafeFloat(modal.querySelector('#z-top')?.value);
      const btm = zSafeFloat(modal.querySelector('#z-btm')?.value);
      const zone = await DB.addZone({
        pair, timeframe, name, status, direction,
        zone_date: date || null, test_count: tests,
        price_top: top, price_btm: btm
      });

      if (zone) { close(); await this.loadZones(pair, timeframe); }
      else { btn.textContent = 'Add Zone'; btn.disabled = false; alert('Error saving zone.'); }
    });

    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
  },

  openEditModal(zone) {
    const modal   = document.getElementById('zone-modal');
    const overlay = document.getElementById('modal-overlay');
    const pair    = zone.pair;
    const hasCities = !!PAIR_CITIES[pair];

    // Build city dropdown — include current name even if used
    let cityOptions = '';
    if (hasCities) {
      const dir = zone.direction || 'bull';
      const pool = dir === 'bull' ? PAIR_CITIES[pair].bull : PAIR_CITIES[pair].bear;
      const used = Zones._getActiveCities(pair).filter(n => n !== zone.name);
      cityOptions = pool
        .filter(c => !used.includes(c))
        .map(c => `<option value="${c}" ${c === zone.name ? 'selected' : ''}>${c}</option>`)
        .join('');
    }

    const priceStep = (zone.price_top && zone.price_top > 100) ? '1' : '0.00001';

    modal.innerHTML = `
      <div class="modal-header">
        <span class="modal-title">Edit Zone</span>
        <button class="modal-close" id="zone-modal-close">✕</button>
      </div>
      <div class="modal-body">
        ${hasCities ? `
        <div class="form-group">
          <label class="form-label">City Name</label>
          <select class="form-select" id="z-city">${cityOptions}</select>
        </div>
        ` : `
        <div class="form-group">
          <label class="form-label">Zone Name</label>
          <input class="form-input" id="z-name" value="${zone.name}" />
        </div>
        `}
        <div class="form-group">
          <label class="form-label">Date Created</label>
          <input class="form-input" id="z-date" type="date" value="${zone.zone_date ? zone.zone_date.slice(0,10) : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" id="z-status">
            <option value="fresh"  ${zone.status==='fresh'  ? 'selected':''}>Fresh</option>
            <option value="tested" ${zone.status==='tested' ? 'selected':''}>Tested</option>
            <option value="broken" ${zone.status==='broken' ? 'selected':''}>Broken</option>
          </select>
        </div>
        <div class="form-group" id="tests-group" style="display:${zone.status==='tested'?'flex':'none'};">
          <label class="form-label">Times Tested</label>
          <div class="tests-group">
            <input class="form-input" id="z-tests" type="number" min="1" value="${zone.test_count || 1}" />
            <span class="tests-label">times</span>
          </div>
        </div>
        <div class="setup-row-2" style="grid-template-columns:1fr 1fr;">
          <div class="form-group">
            <label class="form-label">Price Top</label>
            <input class="form-input" id="z-top" type="number" step="${priceStep}"
              value="${zone.price_top || ''}" placeholder="${zone.price_top > 100 ? '73500' : '1.08500'}" />
          </div>
          <div class="form-group">
            <label class="form-label">Price Bottom</label>
            <input class="form-input" id="z-btm" type="number" step="${priceStep}"
              value="${zone.price_btm || ''}" placeholder="${zone.price_btm > 100 ? '73200' : '1.08200'}" />
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="zone-modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="zone-modal-save">Save Changes</button>
      </div>
    `;

    modal.querySelector('#z-status').addEventListener('change', e => {
      modal.querySelector('#tests-group').style.display = e.target.value === 'tested' ? 'flex' : 'none';
    });

    var close = function() { modal.classList.add('hidden'); overlay.classList.add('hidden'); };
    modal.querySelector('#zone-modal-close').addEventListener('click', close);
    modal.querySelector('#zone-modal-cancel').addEventListener('click', close);
    overlay.addEventListener('click', close, { once: true });

    modal.querySelector('#zone-modal-save').addEventListener('click', async () => {
      const status = modal.querySelector('#z-status').value;
      const date   = modal.querySelector('#z-date').value;
      const tests  = status === 'tested' ? parseInt(modal.querySelector('#z-tests').value) || 1 : 0;
      const top    = zSafeFloat(modal.querySelector('#z-top').value);
      const btm    = zSafeFloat(modal.querySelector('#z-btm').value);

      let name;
      if (hasCities) {
        name = modal.querySelector('#z-city').value;
      } else {
        name = modal.querySelector('#z-name').value.trim();
      }
      if (!name) { alert('Please enter a zone name.'); return; }

      const btn = modal.querySelector('#zone-modal-save');
      btn.textContent = 'Saving...'; btn.disabled = true;

      const updated = await DB.updateZone(zone.id, {
        name, status, zone_date: date || null, test_count: tests,
        price_top: top, price_btm: btm
      });
      if (updated) { close(); await this.loadZones(zone.pair, zone.timeframe); }
      else { btn.textContent = 'Save Changes'; btn.disabled = false; }
    });

    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
  },

  openDiscordZonesModal(pair, timeframe, tfLabel) {
    const modal   = document.getElementById('comment-modal');
    const overlay = document.getElementById('modal-overlay');

    var el = document.getElementById('zones-' + timeframe);
    var zones = el && el.dataset.cache ? JSON.parse(el.dataset.cache) : [];

    if (zones.length === 0) {
      alert('No zones to share for this timeframe.');
      return;
    }

    var decimals = (zones[0] && zones[0].price_top > 100) ? 2 : 5;
    var now = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

    // Build Discord message
    var lines = [];
    lines.push('# 🚗 The Delivery Man — Zone Report');
    lines.push('## ' + pair + ' · ' + tfLabel + ' Zones');
    lines.push('📅 ' + now);
    lines.push('');
    lines.push('> *Every zone is a city. Every trade is a delivery.*');
    lines.push('');
    lines.push('═══════════════════════════════');
    lines.push('');

    var fresh  = zones.filter(function(z) { return z.status === 'fresh'; });
    var tested = zones.filter(function(z) { return z.status === 'tested'; });
    var broken = zones.filter(function(z) { return z.status === 'broken'; });

    function formatZones(list, emoji, label) {
      if (list.length === 0) return;
      lines.push(emoji + ' **' + label + '**');
      lines.push('');
      list.forEach(function(z) {
        const dir  = z.direction === 'bull' ? '▲ Bullish' : z.direction === 'bear' ? '▼ Bearish' : '';
        const top  = zSafeFloat(z.price_top);
        const btm  = zSafeFloat(z.price_btm);
        const date = z.zone_date ? new Date(z.zone_date + 'T00:00:00').toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' }) : '—';
        const tests = z.status === 'tested' && z.test_count ? ' (×' + z.test_count + ')' : '';

        lines.push('📍 **' + z.name + '**' + tests + ' — ' + dir);
        if (top || btm) {
          const topStr = top ? top.toFixed(decimals) : '—';
          const btmStr = btm ? btm.toFixed(decimals) : '—';
          lines.push('   `T: ' + topStr + '  ·  B: ' + btmStr + '`');
        }
        lines.push('   🗓 Formed: ' + date);
        lines.push('');
      });
    }

    formatZones(fresh,  '🟢', 'Fresh Zones');
    formatZones(tested, '🟡', 'Tested Zones');
    formatZones(broken, '🔴', 'Broken Zones');

    lines.push('═══════════════════════════════');
    lines.push('🚗 *The Delivery Man — SMC Analyst · ' + pair + ' ' + tfLabel + '*');

    var discordText = lines.join('\n');
    var escaped = discordText.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    modal.innerHTML =
      '<div class="modal-header">' +
        '<span class="modal-title">🔗 Share ' + tfLabel + ' Zones — Discord</span>' +
        '<button class="modal-close" id="dz-close">✕</button>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div class="discord-preview-label">' +
          '<span class="form-label">Discord Format — Ready to Copy</span>' +
          '<span class="discord-hint">' + zones.length + ' zones · ' + fresh.length + ' fresh · ' + tested.length + ' tested · ' + broken.length + ' broken</span>' +
        '</div>' +
        '<div class="discord-preview">' + escaped + '</div>' +
        '<div class="discord-char-count">' + discordText.length + ' / 2000 chars</div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" id="dz-close2">Close</button>' +
        '<button class="btn btn-discord" id="dz-copy">📋 Copy to Clipboard</button>' +
      '</div>';

    var close = function() { modal.classList.add('hidden'); overlay.classList.add('hidden'); };
    modal.querySelector('#dz-close').addEventListener('click', close);
    modal.querySelector('#dz-close2').addEventListener('click', close);
    overlay.addEventListener('click', close, { once: true });

    modal.querySelector('#dz-copy').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(discordText);
      } catch(e) {
        const ta = document.createElement('textarea');
        ta.value = discordText;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      const btn = modal.querySelector('#dz-copy');
      btn.textContent = '✅ Copied!';
      btn.style.background = '#059669';
      setTimeout(() => { btn.textContent = '📋 Copy to Clipboard'; btn.style.background = ''; }, 2000);
    });

    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
  },

  async confirmDelete(zone) {
    if (!confirm(`Delete zone "${zone.name}"? This will also remove all comments.`)) return;
    const ok = await DB.deleteZone(zone.id);
    if (ok) await this.loadZones(zone.pair, zone.timeframe);
  }
};
