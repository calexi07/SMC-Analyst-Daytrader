// ── Setups Module ──
// Replaces "comments" — full delivery-themed trade log

const Setups = {

  async loadSetups(zoneId) {
    const list = document.getElementById(`comment-list-${zoneId}`);
    if (!list) return;
    list.innerHTML = '<div class="loader">Loading...</div>';
    const setups = await DB.getComments(zoneId);
    if (setups.length === 0) {
      list.innerHTML = '<div class="loader" style="padding:8px 0; font-size:11px;">No setups logged yet</div>';
      return;
    }
    list.innerHTML = '';
    setups.forEach(s => list.appendChild(this.buildSetupEl(s, zoneId)));
  },

  buildSetupEl(setup, zoneId) {
    const el = document.createElement('div');
    el.className = 'setup-item';
    el.dataset.id = setup.id;

    const ts = new Date(setup.created_at).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    // Parse stored JSON from text field
    let data = {};
    try { data = JSON.parse(setup.text || '{}'); } catch(e) {}

    const outcome = data.outcome || 'pending';
    const outcomeConfig = {
      reached:  { label: '🏁 Destination Reached', cls: 'outcome-win',     emoji: '🏁' },
      failed:   { label: '💥 BumpRoad Hit',         cls: 'outcome-loss',    emoji: '💥' },
      refused:  { label: '↩ Delivery Refused (BE)', cls: 'outcome-be',      emoji: '↩' },
      pending:  { label: '🚗 En Route',              cls: 'outcome-pending', emoji: '🚗' },
    };
    const oc = outcomeConfig[outcome] || outcomeConfig.pending;

    const pnlHtml = outcome === 'reached' && data.pnl_amount
      ? `<span class="pnl win">+$${parseFloat(data.pnl_amount).toFixed(2)}</span>`
      : outcome === 'failed' && data.pnl_amount
      ? `<span class="pnl loss">-$${parseFloat(data.pnl_amount).toFixed(2)}</span>`
      : '';

    const imgHtml = setup.image_url
      ? `<img class="comment-img" src="${setup.image_url}" alt="chart" loading="lazy" />`
      : '';

    el.innerHTML = `
      <div class="setup-header">
        <div class="setup-header-left">
          <span class="setup-outcome ${oc.cls}">${oc.label}</span>
          ${pnlHtml}
        </div>
        <div class="setup-header-right">
          <span class="comment-ts">${ts}</span>
          <button class="btn-icon del setup-del" title="Delete setup">✕</button>
        </div>
      </div>
      <div class="setup-grid">
        ${data.station ? `
        <div class="setup-field">
          <span class="setup-field-label">⛽ Gas Station</span>
          <span class="setup-field-value">${data.station}</span>
        </div>` : ''}
        ${data.entry ? `
        <div class="setup-field">
          <span class="setup-field-label">Entry Price</span>
          <span class="setup-field-value mono">${data.entry}</span>
        </div>` : ''}
        ${data.sl ? `
        <div class="setup-field">
          <span class="setup-field-label">🚧 BumpRoad (SL)</span>
          <span class="setup-field-value mono">${data.sl}</span>
        </div>` : ''}
        ${data.tp ? `
        <div class="setup-field">
          <span class="setup-field-label">🏁 Destination (TP)</span>
          <span class="setup-field-value mono">${data.tp}</span>
        </div>` : ''}
        ${data.tp_km != null ? `
        <div class="setup-field">
          <span class="setup-field-label">📍 Distance to TP</span>
          <span class="setup-field-value accent">${data.tp_km} km</span>
        </div>` : ''}
        ${data.sl_l != null ? `
        <div class="setup-field">
          <span class="setup-field-label">🪣 Gas in Tank (SL)</span>
          <span class="setup-field-value warn">${data.sl_l} L</span>
        </div>` : ''}
        ${data.rr ? `
        <div class="setup-field">
          <span class="setup-field-label">⚖ R:R</span>
          <span class="setup-field-value">${data.rr}</span>
        </div>` : ''}
        ${data.notes ? `
        <div class="setup-field full">
          <span class="setup-field-label">Notes</span>
          <span class="setup-field-value">${data.notes}</span>
        </div>` : ''}
      </div>
      ${imgHtml}
    `;

    const img = el.querySelector('.comment-img');
    if (img) img.addEventListener('click', () => Comments.openLightbox(setup.image_url));

    el.querySelector('.setup-del').addEventListener('click', async () => {
      if (!confirm('Delete this setup?')) return;
      const ok = await DB.deleteComment(setup.id);
      if (ok) await Setups.loadSetups(zoneId);
    });

    return el;
  },

  openModal(zoneId, pair) {
    const modal   = document.getElementById('comment-modal');
    const overlay = document.getElementById('modal-overlay');

    // Get used stations for this zone
    const list = document.getElementById(`comment-list-${zoneId}`);
    const usedStations = [];
    if (list) {
      list.querySelectorAll('.setup-item').forEach(el => {
        try {
          const data = JSON.parse(el.querySelector('.setup-field-value')?.closest('.setup-item')?.dataset?.raw || '{}');
        } catch(e) {}
      });
    }
    const availableStations = Stations.getAvailable(usedStations);
    const stationOptions = availableStations.map(s => `<option value="${s}">${s}</option>`).join('');

    modal.innerHTML = `
      <div class="modal-header">
        <span class="modal-title">🚗 Log Setup</span>
        <button class="modal-close" id="cm-close">✕</button>
      </div>
      <div class="modal-body">

        <div class="form-group">
          <label class="form-label">⛽ Gas Station (Entry Point)</label>
          <select class="form-select" id="cm-station">
            <option value="">— Select station —</option>
            ${stationOptions}
          </select>
        </div>

        <div class="setup-row-2">
          <div class="form-group">
            <label class="form-label">Entry Price</label>
            <input class="form-input" id="cm-entry" type="number" step="0.00001" placeholder="1.08250" />
          </div>
          <div class="form-group">
            <label class="form-label">🚧 BumpRoad — SL Price</label>
            <input class="form-input" id="cm-sl" type="number" step="0.00001" placeholder="1.08100" />
          </div>
          <div class="form-group">
            <label class="form-label">🏁 Destination — TP Price</label>
            <input class="form-input" id="cm-tp" type="number" step="0.00001" placeholder="1.08550" />
          </div>
        </div>

        <div class="setup-calc-row" id="calc-display" style="display:none;">
          <div class="calc-pill distance"><span class="calc-icon">📍</span><span id="calc-km">— km</span><span class="calc-sub">Distance (TP)</span></div>
          <div class="calc-pill gas"><span class="calc-icon">🪣</span><span id="calc-l">— L</span><span class="calc-sub">Gas in Tank (SL)</span></div>
          <div class="calc-pill rr"><span class="calc-icon">⚖</span><span id="calc-rr">—</span><span class="calc-sub">R:R</span></div>
        </div>

        <div class="form-group">
          <label class="form-label">Outcome</label>
          <div class="outcome-toggle" id="outcome-toggle">
            <button class="outcome-btn pending active" data-outcome="pending">🚗 En Route</button>
            <button class="outcome-btn reached" data-outcome="reached">🏁 Reached</button>
            <button class="outcome-btn failed"  data-outcome="failed">💥 BumpRoad Hit</button>
            <button class="outcome-btn refused" data-outcome="refused">↩ BE Refused</button>
          </div>
        </div>

        <div class="form-group" id="pnl-group" style="display:none;">
          <label class="form-label" id="pnl-label">Amount ($)</label>
          <input class="form-input" id="cm-pnl" type="number" step="0.01" placeholder="0.00" />
        </div>

        <div class="form-group">
          <label class="form-label">Chart URL (TradingView)</label>
          <input class="form-input" id="cm-url" placeholder="https://www.tradingview.com/x/..." />
          <div id="url-preview-wrap" style="display:none; margin-top:8px;">
            <img id="url-preview" class="upload-preview" style="display:block; max-height:180px;" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea class="form-textarea" id="cm-notes" placeholder="Analysis, observations..." style="min-height:70px;"></textarea>
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="cm-cancel">Cancel</button>
        <button class="btn btn-primary" id="cm-save">Log Setup</button>
      </div>
    `;

    // ── Live pip calculator ──
    const calcDisplay = modal.querySelector('#calc-display');
    const recalc = () => {
      const entry = parseFloat(modal.querySelector('#cm-entry').value);
      const sl    = parseFloat(modal.querySelector('#cm-sl').value);
      const tp    = parseFloat(modal.querySelector('#cm-tp').value);
      if (isNaN(entry) || isNaN(sl) || isNaN(tp)) {
        calcDisplay.style.display = 'none'; return;
      }
      // Detect JPY pair (2 decimal pips) vs normal (4 decimal pips)
      const isJPY = pair && (pair.includes('JPY'));
      const pipSize = isJPY ? 0.01 : 0.0001;
      const tpPips = Math.abs(tp - entry) / pipSize;
      const slPips = Math.abs(entry - sl) / pipSize;
      const rr     = slPips > 0 ? (tpPips / slPips).toFixed(2) : '—';

      modal.querySelector('#calc-km').textContent = `${tpPips.toFixed(1)} km`;
      modal.querySelector('#calc-l').textContent  = `${slPips.toFixed(1)} L`;
      modal.querySelector('#calc-rr').textContent = `1:${rr}`;
      calcDisplay.style.display = 'flex';
    };
    ['#cm-entry', '#cm-sl', '#cm-tp'].forEach(id =>
      modal.querySelector(id).addEventListener('input', recalc)
    );

    // ── Outcome toggle ──
    let currentOutcome = 'pending';
    modal.querySelectorAll('.outcome-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentOutcome = btn.dataset.outcome;
        modal.querySelectorAll('.outcome-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const pnlGroup = modal.querySelector('#pnl-group');
        const pnlLabel = modal.querySelector('#pnl-label');
        if (currentOutcome === 'reached') {
          pnlGroup.style.display = 'flex';
          pnlLabel.textContent = '💰 Profit ($)';
        } else if (currentOutcome === 'failed') {
          pnlGroup.style.display = 'flex';
          pnlLabel.textContent = '💸 Loss ($)';
        } else {
          pnlGroup.style.display = 'none';
        }
      });
    });

    // ── Chart URL preview ──
    modal.querySelector('#cm-url').addEventListener('input', e => {
      const url  = e.target.value.trim();
      const wrap = modal.querySelector('#url-preview-wrap');
      const img  = modal.querySelector('#url-preview');
      if (!url) { wrap.style.display = 'none'; return; }
      wrap.style.display = 'block';
      img.src = url;
      img.onerror = () => { wrap.style.display = 'none'; };
    });

    // ── Save ──
    const close = () => { modal.classList.add('hidden'); overlay.classList.add('hidden'); };
    modal.querySelector('#cm-close').addEventListener('click', close);
    modal.querySelector('#cm-cancel').addEventListener('click', close);
    overlay.addEventListener('click', close, { once: true });

    modal.querySelector('#cm-save').addEventListener('click', async () => {
      const station = modal.querySelector('#cm-station').value;
      const entry   = modal.querySelector('#cm-entry').value;
      const sl      = modal.querySelector('#cm-sl').value;
      const tp      = modal.querySelector('#cm-tp').value;
      const notes   = modal.querySelector('#cm-notes').value.trim();
      const url     = modal.querySelector('#cm-url').value.trim();
      const pnl     = modal.querySelector('#cm-pnl').value;

      if (!station && !entry) {
        alert('Please select a gas station or enter an entry price.');
        return;
      }

      // Calculate pips
      const isJPY  = pair && pair.includes('JPY');
      const pipSize = isJPY ? 0.01 : 0.0001;
      const entryF  = parseFloat(entry);
      const slF     = parseFloat(sl);
      const tpF     = parseFloat(tp);
      const tp_km   = (!isNaN(entryF) && !isNaN(tpF)) ? parseFloat((Math.abs(tpF - entryF) / pipSize).toFixed(1)) : null;
      const sl_l    = (!isNaN(entryF) && !isNaN(slF))  ? parseFloat((Math.abs(entryF - slF)  / pipSize).toFixed(1)) : null;
      const rr      = (tp_km && sl_l && sl_l > 0) ? `1:${(tp_km / sl_l).toFixed(2)}` : null;

      const data = {
        station: station || null,
        entry:   entry   || null,
        sl:      sl      || null,
        tp:      tp      || null,
        tp_km, sl_l, rr,
        outcome: currentOutcome,
        pnl_amount: pnl || null,
        notes: notes || null,
      };

      const btn = modal.querySelector('#cm-save');
      btn.textContent = 'Saving...'; btn.disabled = true;

      const saved = await DB.addComment({
        zone_id:   zoneId,
        text:      JSON.stringify(data),
        image_url: url || null
      });

      if (saved) {
        close();
        await Setups.loadSetups(zoneId);
        Dashboard.refresh();
      } else {
        btn.textContent = 'Log Setup'; btn.disabled = false;
        alert('Error saving setup.');
      }
    });

    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
  },

  openLightbox(url) {
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML = `<img src="${url}" alt="chart" />`;
    lb.addEventListener('click', () => lb.remove());
    document.body.appendChild(lb);
  }
};
