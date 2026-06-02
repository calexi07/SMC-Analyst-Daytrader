// ── Setups Module ──

const Setups = {

  async loadSetups(zoneId) {
    const list = document.getElementById(`comment-list-${zoneId}`);
    if (!list) return;
    list.innerHTML = '<div class="loader">Loading...</div>';
    const setups = await DB.getComments(zoneId);
    if (setups.length === 0) {
      list.innerHTML = '<div class="loader" style="padding:8px 0; font-size:11px;">No jobs logged yet</div>';
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

    let data = {};
    try { data = JSON.parse(setup.text || '{}'); } catch(e) {}

    const outcome = data.outcome || 'pending';
    const outcomeConfig = {
      reached: { label: '🏁 Destination Reached', cls: 'outcome-win'     },
      failed:  { label: '💥 BumpRoad Hit',         cls: 'outcome-loss'    },
      refused: { label: '↩ Delivery Refused (BE)', cls: 'outcome-be'      },
      pending: { label: '🚗 En Route',              cls: 'outcome-pending' },
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

    const editBtn = outcome === 'pending'
      ? `<button class="btn-icon setup-edit" title="Update outcome">✎ Update</button>`
      : '';

    el.innerHTML = `
      <div class="setup-header">
        <div class="setup-header-left">
          <span class="setup-outcome ${oc.cls}">${oc.label}</span>
          ${pnlHtml}
        </div>
        <div class="setup-header-right">
          <span class="comment-ts">${ts}</span>
          ${editBtn}
          <button class="btn-icon del setup-del" title="Delete">✕</button>
        </div>
      </div>
      <div class="setup-grid">
        ${data.van_plate ? `<div class="setup-field"><span class="setup-field-label">🚐 Van</span><span class="setup-field-value mono">${data.van_plate}</span></div>` : ''}
        ${data.station ? `<div class="setup-field"><span class="setup-field-label">⛽ Gas Station</span><span class="setup-field-value">${data.station}</span></div>` : ''}
        ${data.entry   ? `<div class="setup-field"><span class="setup-field-label">🚗 Start Driving</span><span class="setup-field-value mono">${data.entry}</span></div>` : ''}
        ${data.lot     ? `<div class="setup-field"><span class="setup-field-label">⛽ Price for Gas (Lot)</span><span class="setup-field-value mono">${data.lot}</span></div>` : ''}
        ${data.sl      ? `<div class="setup-field"><span class="setup-field-label">🚧 BumpRoad (SL)</span><span class="setup-field-value mono">${data.sl}</span></div>` : ''}
        ${data.tp      ? `<div class="setup-field"><span class="setup-field-label">🏁 Destination (TP)</span><span class="setup-field-value mono">${data.tp}</span></div>` : ''}
        ${data.tp_km != null ? `<div class="setup-field"><span class="setup-field-label">📍 Distance</span><span class="setup-field-value accent">${data.tp_km} km</span></div>` : ''}
        ${data.sl_l  != null ? `<div class="setup-field"><span class="setup-field-label">🪣 Gas in Tank</span><span class="setup-field-value warn">${data.sl_l} L</span></div>` : ''}
        ${data.rr      ? `<div class="setup-field"><span class="setup-field-label">⚖ R:R</span><span class="setup-field-value">${data.rr}</span></div>` : ''}
        ${data.notes   ? `<div class="setup-field full"><span class="setup-field-label">Notes</span><span class="setup-field-value">${data.notes}</span></div>` : ''}
      </div>
      ${imgHtml}
    `;

    const img = el.querySelector('.comment-img');
    if (img) img.addEventListener('click', () => Setups.openLightbox(setup.image_url));

    el.querySelector('.setup-del').addEventListener('click', async () => {
      if (!confirm('Delete this job?')) return;
      const ok = await DB.deleteComment(setup.id);
      if (ok) { await Setups.loadSetups(zoneId); Dashboard.refresh(); }
    });

    // Edit outcome (only for pending)
    el.querySelector('.setup-edit')?.addEventListener('click', () => {
      Setups.openEditOutcomeModal(setup, data, zoneId);
    });

    return el;
  },

  // ── Edit outcome modal (for En Route setups) ──
  openEditOutcomeModal(setup, data, zoneId) {
    const modal   = document.getElementById('comment-modal');
    const overlay = document.getElementById('modal-overlay');

    const vanOptions = Vans.getAll().map(v =>
      `<option value="${v.id}" data-plate="${v.plate}" ${data.van_plate === v.plate ? 'selected' : ''}>${v.plate}${v.label ? ' · ' + v.label : ''}</option>`
    ).join('');

    modal.innerHTML = `
      <div class="modal-header">
        <span class="modal-title">✎ Update Job</span>
        <button class="modal-close" id="cm-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="setup-summary">
          ${data.station ? `<span class="sum-pill">⛽ ${data.station}</span>` : ''}
          ${data.entry   ? `<span class="sum-pill">🚗 ${data.entry}</span>` : ''}
          ${data.tp_km   ? `<span class="sum-pill">📍 ${data.tp_km} km</span>` : ''}
          ${data.sl_l    ? `<span class="sum-pill">🪣 ${data.sl_l} L</span>` : ''}
          ${data.rr      ? `<span class="sum-pill">⚖ ${data.rr}</span>` : ''}
        </div>

        <div class="form-group">
          <label class="form-label">🚐 Van (Account)</label>
          <select class="form-select" id="cm-van-edit">
            <option value="">— Select van —</option>
            ${vanOptions}
          </select>
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
          <label class="form-label">Chart URL (optional update)</label>
          <input class="form-input" id="cm-url" value="${setup.image_url || ''}" placeholder="https://www.tradingview.com/x/..." />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="cm-cancel">Cancel</button>
        <button class="btn btn-primary" id="cm-save">Save Update</button>
      </div>
    `;

    let currentOutcome = 'pending';
    modal.querySelectorAll('.outcome-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentOutcome = btn.dataset.outcome;
        modal.querySelectorAll('.outcome-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const pnlGroup = modal.querySelector('#pnl-group');
        const pnlLabel = modal.querySelector('#pnl-label');
        if (currentOutcome === 'reached') { pnlGroup.style.display='flex'; pnlLabel.textContent='💰 Profit ($)'; }
        else if (currentOutcome === 'failed') { pnlGroup.style.display='flex'; pnlLabel.textContent='💸 Loss ($)'; }
        else { pnlGroup.style.display='none'; }
      });
    });

    const close = () => { modal.classList.add('hidden'); overlay.classList.add('hidden'); };
    modal.querySelector('#cm-close').addEventListener('click', close);
    modal.querySelector('#cm-cancel').addEventListener('click', close);
    overlay.addEventListener('click', close, { once: true });

    modal.querySelector('#cm-save').addEventListener('click', async () => {
      const pnl = modal.querySelector('#cm-pnl').value;
      const url = modal.querySelector('#cm-url').value.trim();

      const vanEditEl = modal.querySelector('#cm-van-edit');
      const newVanId    = vanEditEl ? vanEditEl.value : null;
      const newVanPlate = vanEditEl ? (vanEditEl.selectedOptions[0]?.dataset.plate || null) : null;

      const updatedData = { ...data, outcome: currentOutcome, pnl_amount: pnl || null };
      if (newVanPlate) updatedData.van_plate = newVanPlate;

      const btn = modal.querySelector('#cm-save');
      btn.textContent = 'Saving...'; btn.disabled = true;

      const commentUpdate = { text: JSON.stringify(updatedData), image_url: url || setup.image_url || null };
      if (newVanId) commentUpdate.van_id = newVanId;

      const updated = await DB.updateComment(setup.id, commentUpdate);

      if (updated) { close(); await Setups.loadSetups(zoneId); Dashboard.refresh(); }
      else { btn.textContent = 'Save Update'; btn.disabled = false; alert('Error updating.'); }
    });

    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
  },

  // ── Add new setup modal ──
  openModal(zoneId, pair) {
    const modal   = document.getElementById('comment-modal');
    const overlay = document.getElementById('modal-overlay');
    const availableStations = Stations.getAvailable([]);
    const stationOptions = availableStations.map(s => `<option value="${s}">${s}</option>`).join('');

    modal.innerHTML = `
      <div class="modal-header">
        <span class="modal-title">🚗 Log Job</span>
        <button class="modal-close" id="cm-close">✕</button>
      </div>
      <div class="modal-body">

        <div class="form-group">
          <label class="form-label">🚐 Van (Account)</label>
          <select class="form-select" id="cm-van">
            <option value="">— Select van —</option>
            ${Vans.getAll().map(v => `<option value="${v.id}" data-plate="${v.plate}">${v.plate}${v.label ? ' · ' + v.label : ''}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">⛽ Gas Station (Entry Zone)</label>
          <select class="form-select" id="cm-station">
            <option value="">— Select station —</option>
            ${stationOptions}
          </select>
        </div>

        <div class="setup-row-2">
          <div class="form-group">
            <label class="form-label">🚗 Start Driving (Entry)</label>
            <input class="form-input" id="cm-entry" type="number" step="0.00001" placeholder="1.08250" />
          </div>
          <div class="form-group">
            <label class="form-label">🚧 BumpRoad (SL)</label>
            <input class="form-input" id="cm-sl" type="number" step="0.00001" placeholder="1.08100" />
          </div>
          <div class="form-group">
            <label class="form-label">🏁 Destination (TP)</label>
            <input class="form-input" id="cm-tp" type="number" step="0.00001" placeholder="1.08550" />
          </div>
        </div>

        <div class="setup-calc-row" id="calc-display" style="display:none;">
          <div class="calc-pill distance"><span class="calc-icon">📍</span><span id="calc-km">—</span><span class="calc-sub">Distance (km)</span></div>
          <div class="calc-pill gas"><span class="calc-icon">🪣</span><span id="calc-l">—</span><span class="calc-sub">Gas in Tank (L)</span></div>
          <div class="calc-pill rr"><span class="calc-icon">⚖</span><span id="calc-rr">—</span><span class="calc-sub">R:R</span></div>
        </div>

        <div class="form-group">
          <label class="form-label">⛽ Price for Gas (Lot Size)</label>
          <input class="form-input" id="cm-lot" type="number" step="0.01" placeholder="0.10" />
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
        <button class="btn btn-primary" id="cm-save">Log Job</button>
      </div>
    `;

    // ── Live pip calculator ──
    const calcDisplay = modal.querySelector('#calc-display');
    const recalc = () => {
      const entry = parseFloat(modal.querySelector('#cm-entry').value);
      const sl    = parseFloat(modal.querySelector('#cm-sl').value);
      const tp    = parseFloat(modal.querySelector('#cm-tp').value);
      if (isNaN(entry) || isNaN(sl) || isNaN(tp)) { calcDisplay.style.display='none'; return; }
      const pipSize = (pair && pair.includes('JPY')) ? 0.01 : 0.0001;
      const tpPips  = Math.abs(tp - entry) / pipSize;
      const slPips  = Math.abs(entry - sl) / pipSize;
      const rr      = slPips > 0 ? (tpPips / slPips).toFixed(2) : '—';
      modal.querySelector('#calc-km').textContent = `${tpPips.toFixed(1)} km`;
      modal.querySelector('#calc-l').textContent  = `${slPips.toFixed(1)} L`;
      modal.querySelector('#calc-rr').textContent = `1:${rr}`;
      calcDisplay.style.display = 'flex';
    };
    ['#cm-entry','#cm-sl','#cm-tp'].forEach(id =>
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
        if (currentOutcome === 'reached')     { pnlGroup.style.display='flex'; pnlLabel.textContent='💰 Profit ($)'; }
        else if (currentOutcome === 'failed') { pnlGroup.style.display='flex'; pnlLabel.textContent='💸 Loss ($)'; }
        else { pnlGroup.style.display='none'; }
      });
    });

    // ── Chart preview ──
    modal.querySelector('#cm-url').addEventListener('input', e => {
      const url  = e.target.value.trim();
      const wrap = modal.querySelector('#url-preview-wrap');
      const img  = modal.querySelector('#url-preview');
      if (!url) { wrap.style.display='none'; return; }
      wrap.style.display='block'; img.src=url;
      img.onerror=()=>{ wrap.style.display='none'; };
    });

    const close = () => { modal.classList.add('hidden'); overlay.classList.add('hidden'); };
    modal.querySelector('#cm-close').addEventListener('click', close);
    modal.querySelector('#cm-cancel').addEventListener('click', close);
    overlay.addEventListener('click', close, { once: true });

    modal.querySelector('#cm-save').addEventListener('click', async () => {
      const station = modal.querySelector('#cm-station').value;
      const entry   = modal.querySelector('#cm-entry').value;
      const sl      = modal.querySelector('#cm-sl').value;
      const tp      = modal.querySelector('#cm-tp').value;
      const lot     = modal.querySelector('#cm-lot').value;
      const notes   = modal.querySelector('#cm-notes').value.trim();
      const url     = modal.querySelector('#cm-url').value.trim();
      const pnl     = modal.querySelector('#cm-pnl').value;

      if (!station && !entry) { alert('Please select a station or enter an entry price.'); return; }

      const pipSize = (pair && pair.includes('JPY')) ? 0.01 : 0.0001;
      const entryF  = parseFloat(entry), slF = parseFloat(sl), tpF = parseFloat(tp);
      const tp_km   = (!isNaN(entryF)&&!isNaN(tpF)) ? parseFloat((Math.abs(tpF-entryF)/pipSize).toFixed(1)) : null;
      const sl_l    = (!isNaN(entryF)&&!isNaN(slF))  ? parseFloat((Math.abs(entryF-slF)/pipSize).toFixed(1)) : null;
      const rr      = (tp_km&&sl_l&&sl_l>0) ? `1:${(tp_km/sl_l).toFixed(2)}` : null;

      const vanEl = modal.querySelector('#cm-van');
      const vanId = vanEl ? vanEl.value : null;
      const vanPlate = vanEl ? (vanEl.selectedOptions[0]?.dataset.plate || null) : null;

      const data = {
        station: station||null, entry: entry||null, sl: sl||null, tp: tp||null,
        lot: lot||null, tp_km, sl_l, rr,
        outcome: currentOutcome, pnl_amount: pnl||null, notes: notes||null,
        van_plate: vanPlate||null,
      };

      const btn = modal.querySelector('#cm-save');
      btn.textContent='Saving...'; btn.disabled=true;

      const saved = await DB.addComment({ zone_id: zoneId, text: JSON.stringify(data), image_url: url||null, van_id: vanId||null });
      if (saved) { close(); await Setups.loadSetups(zoneId); Dashboard.refresh(); }
      else { btn.textContent='Log Job'; btn.disabled=false; alert('Error saving job.'); }
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
