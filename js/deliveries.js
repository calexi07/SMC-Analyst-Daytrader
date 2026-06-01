// ── All Deliveries Module ──

const Deliveries = {

  _allData: [],
  _filtered: [],
  _filters: { pair: 'all', outcome: 'all', direction: 'all', tf: 'all', dateFrom: '', dateTo: '' },

  async show() {
    document.getElementById('deliveries-view').classList.remove('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('pairs-view').classList.add('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('nav-deliveries').classList.add('active');
    localStorage.setItem('zt_last_view', 'deliveries');
    await this.load();
  },

  async load() {
    const container = document.getElementById('deliveries-view');
    container.innerHTML = '<div class="loader" style="padding:60px;">Loading all deliveries...</div>';

    const { data, error } = await db
      .from('zone_comments')
      .select('*, zones(name, pair, timeframe, direction, status)')
      .order('created_at', { ascending: false });

    if (error) { console.error(error); return; }

    this._allData = (data || []).map(row => {
      let setup = {};
      try { setup = JSON.parse(row.text || '{}'); } catch(e) {}
      return {
        id:         row.id,
        created_at: row.created_at,
        date_only:  row.created_at.slice(0,10),
        image_url:  row.image_url,
        zone_name:  row.zones?.name      || '—',
        pair:       row.zones?.pair      || '—',
        timeframe:  row.zones?.timeframe || '—',
        direction:  row.zones?.direction || '—',
        station:    setup.station    || '—',
        entry:      setup.entry      || '—',
        sl:         setup.sl         || '—',
        tp:         setup.tp         || '—',
        lot:        setup.lot        || '—',
        tp_km:      setup.tp_km      ?? '—',
        sl_l:       setup.sl_l       ?? '—',
        rr:         setup.rr         || '—',
        outcome:    setup.outcome    || 'pending',
        pnl:        setup.pnl_amount || null,
        notes:      setup.notes      || '',
      };
    }).filter(r => r.entry !== '—' || r.station !== '—');

    this._applyFilters();
    this._render();
  },

  _applyFilters() {
    const f = this._filters;
    this._filtered = this._allData.filter(r => {
      if (f.pair      !== 'all' && r.pair      !== f.pair)      return false;
      if (f.outcome   !== 'all' && r.outcome   !== f.outcome)   return false;
      if (f.direction !== 'all' && r.direction !== f.direction)  return false;
      if (f.tf        !== 'all' && r.timeframe !== f.tf)         return false;
      if (f.dateFrom  && r.date_only < f.dateFrom)               return false;
      if (f.dateTo    && r.date_only > f.dateTo)                 return false;
      return true;
    });
  },

  _render() {
    const container = document.getElementById('deliveries-view');

    const wins    = this._filtered.filter(r => r.outcome === 'reached').length;
    const losses  = this._filtered.filter(r => r.outcome === 'failed').length;
    const be      = this._filtered.filter(r => r.outcome === 'refused').length;
    const pending = this._filtered.filter(r => r.outcome === 'pending').length;
    const totalPnl = this._filtered.reduce((acc, r) => {
      if (!r.pnl) return acc;
      const amount = Math.abs(parseFloat(r.pnl));
      if (r.outcome === 'reached') return acc + amount;
      if (r.outcome === 'failed')  return acc - amount;
      return acc;
    }, 0);
    const wr = (wins + losses + be) > 0 ? ((wins / (wins + losses + be)) * 100).toFixed(1) : '—';

    const pairs = [...new Set(this._allData.map(r => r.pair))].filter(p => p !== '—');
    const tfs   = [...new Set(this._allData.map(r => r.timeframe))].filter(t => t !== '—');

    const pairOpts = '<option value="all">All Pairs</option>' +
      pairs.map(p => `<option value="${p}" ${this._filters.pair===p?'selected':''}>${p}</option>`).join('');
    const tfOpts = '<option value="all">All TFs</option>' +
      tfs.map(t => `<option value="${t}" ${this._filters.tf===t?'selected':''}>${t.toUpperCase()}</option>`).join('');

    const outcomeConfig = {
      reached: { label: '🏁',  cls: 'outcome-win',     full: 'Reached'  },
      failed:  { label: '💥',  cls: 'outcome-loss',    full: 'BumpRoad' },
      refused: { label: '↩',   cls: 'outcome-be',      full: 'BE'       },
      pending: { label: '🚗',  cls: 'outcome-pending', full: 'En Route' },
    };

    const rows = this._filtered.map(r => {
      const oc  = outcomeConfig[r.outcome] || outcomeConfig.pending;
      const pnlHtml = r.outcome === 'reached' && r.pnl
        ? `<span class="pnl win" style="font-size:12px;">+$${parseFloat(r.pnl).toFixed(2)}</span>`
        : r.outcome === 'failed' && r.pnl
        ? `<span class="pnl loss" style="font-size:12px;">-$${parseFloat(r.pnl).toFixed(2)}</span>`
        : '<span style="color:var(--muted2);">—</span>';
      const dirIcon = r.direction === 'bull' ? '<span class="map-bull">▲</span>' : r.direction === 'bear' ? '<span class="map-bear">▼</span>' : '';
      const date = new Date(r.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' });
      const imgHtml = r.image_url ? `<a href="${r.image_url}" target="_blank" class="del-img-link">📷</a>` : '';

      return `<tr class="del-row">
        <td>${date}</td>
        <td><span class="del-pair">${r.pair}</span></td>
        <td><span class="del-tf">${(r.timeframe||'').toUpperCase()}</span></td>
        <td>${dirIcon} <span style="font-weight:500;">${r.zone_name}</span></td>
        <td class="del-mono">${r.station}</td>
        <td class="del-mono">${r.entry}</td>
        <td class="del-mono">${r.sl}</td>
        <td class="del-mono">${r.tp}</td>
        <td class="del-mono">${r.lot}</td>
        <td class="del-mono" style="color:var(--accent2);">${r.tp_km !== '—' ? r.tp_km+'km' : '—'}</td>
        <td class="del-mono" style="color:var(--warn);">${r.sl_l !== '—' ? r.sl_l+'L' : '—'}</td>
        <td class="del-mono">${r.rr}</td>
        <td><span class="setup-outcome ${oc.cls}" style="font-size:10px; padding:2px 7px;">${oc.label} ${oc.full}</span></td>
        <td>${pnlHtml}</td>
        <td>${imgHtml}</td>
      </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="del-header" id="del-header-snap">
        <div class="del-title-row">
          <h2 class="del-title">🚛 All Deliveries</h2>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-discord btn-sm" id="del-share-btn">📸 Share</button>
            <button class="btn btn-secondary btn-sm" id="del-export-btn">⬇ CSV</button>
          </div>
        </div>

        <div class="del-stats">
          <div class="del-stat wins"><span class="del-stat-val">${wins}</span><span class="del-stat-lbl">🏁 Reached</span></div>
          <div class="del-stat losses"><span class="del-stat-val">${losses}</span><span class="del-stat-lbl">💥 BumpRoad</span></div>
          <div class="del-stat be"><span class="del-stat-val">${be}</span><span class="del-stat-lbl">↩ BE</span></div>
          <div class="del-stat pending"><span class="del-stat-val">${pending}</span><span class="del-stat-lbl">🚗 En Route</span></div>
          <div class="del-stat wr"><span class="del-stat-val">${wr}${wr!=='—'?'%':''}</span><span class="del-stat-lbl">Win Rate</span></div>
          <div class="del-stat pnl ${totalPnl>=0?'pos':'neg'}">
            <span class="del-stat-val">${totalPnl>=0?'+$':'-$'}${Math.abs(totalPnl).toFixed(2)}</span>
            <span class="del-stat-lbl">Net P&L</span>
          </div>
        </div>

        <div class="del-filters">
          <select class="form-select del-filter" id="del-filter-pair">${pairOpts}</select>
          <select class="form-select del-filter" id="del-filter-tf">${tfOpts}</select>
          <select class="form-select del-filter" id="del-filter-dir">
            <option value="all">All Directions</option>
            <option value="bull" ${this._filters.direction==='bull'?'selected':''}>▲ Bull</option>
            <option value="bear" ${this._filters.direction==='bear'?'selected':''}>▼ Bear</option>
          </select>
          <select class="form-select del-filter" id="del-filter-outcome">
            <option value="all">All Outcomes</option>
            <option value="reached" ${this._filters.outcome==='reached'?'selected':''}>🏁 Reached</option>
            <option value="failed"  ${this._filters.outcome==='failed' ?'selected':''}>💥 BumpRoad</option>
            <option value="refused" ${this._filters.outcome==='refused'?'selected':''}>↩ BE</option>
            <option value="pending" ${this._filters.outcome==='pending'?'selected':''}>🚗 En Route</option>
          </select>
          <div class="del-date-range">
            <input type="date" class="form-input del-filter" id="del-date-from" value="${this._filters.dateFrom}" style="font-size:12px;padding:6px 8px;" placeholder="From" />
            <span style="color:var(--muted);font-size:12px;">→</span>
            <input type="date" class="form-input del-filter" id="del-date-to" value="${this._filters.dateTo}" style="font-size:12px;padding:6px 8px;" placeholder="To" />
            ${this._filters.dateFrom || this._filters.dateTo
              ? '<button class="btn-icon" id="del-date-clear" title="Clear dates" style="color:var(--danger);">✕</button>'
              : ''}
          </div>
          <span class="del-count">${this._filtered.length} deliveries</span>
        </div>
      </div>

      <div class="del-table-wrap" id="del-table-snap">
        <table class="del-table del-table-compact">
          <thead>
            <tr>
              <th>Date</th><th>Pair</th><th>TF</th><th>City</th>
              <th>Station</th><th>Entry</th><th>SL</th><th>TP</th><th>Lot</th>
              <th>Dist</th><th>Gas</th><th>R:R</th>
              <th>Outcome</th><th>P&L</th><th>📷</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="15" class="del-empty">No deliveries yet</td></tr>'}</tbody>
        </table>
      </div>
    `;

    // Filters
    ['pair','tf','dir','outcome'].forEach(key => {
      const el = document.getElementById('del-filter-' + key);
      if (!el) return;
      el.addEventListener('change', () => {
        if (key === 'pair')    this._filters.pair      = el.value;
        if (key === 'tf')      this._filters.tf        = el.value;
        if (key === 'dir')     this._filters.direction = el.value;
        if (key === 'outcome') this._filters.outcome   = el.value;
        this._applyFilters(); this._render();
      });
    });

    // Date range
    document.getElementById('del-date-from')?.addEventListener('change', e => {
      this._filters.dateFrom = e.target.value;
      this._applyFilters(); this._render();
    });
    document.getElementById('del-date-to')?.addEventListener('change', e => {
      this._filters.dateTo = e.target.value;
      this._applyFilters(); this._render();
    });
    document.getElementById('del-date-clear')?.addEventListener('click', () => {
      this._filters.dateFrom = ''; this._filters.dateTo = '';
      this._applyFilters(); this._render();
    });

    // Export CSV
    document.getElementById('del-export-btn')?.addEventListener('click', () => this._exportCSV());

    // Share screenshot
    document.getElementById('del-share-btn')?.addEventListener('click', () => this._shareScreenshot());
  },

  async _shareScreenshot() {
    const btn = document.getElementById('del-share-btn');
    if (btn) { btn.textContent = '⏳ Capturing...'; btn.disabled = true; }

    try {
      if (!window.html2canvas) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
      }

      const el = document.getElementById('deliveries-view');
      const canvas = await window.html2canvas(el, {
        backgroundColor: '#f4f6f9',
        scale: 1.5,
        useCORS: true,
        logging: false,
        ignoreElements: el => el.id === 'del-share-btn' || el.id === 'del-export-btn',
      });

      canvas.toBlob(async blob => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          if (btn) { btn.textContent = '✅ Copied!'; btn.style.background = '#059669'; }
        } catch(e) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'deliveries-' + Date.now() + '.png'; a.click();
          URL.revokeObjectURL(url);
          if (btn) { btn.textContent = '💾 Saved'; btn.style.background = '#059669'; }
        }
        setTimeout(() => {
          if (btn) { btn.textContent = '📸 Share'; btn.style.background = ''; btn.disabled = false; }
        }, 3000);
      }, 'image/png');
    } catch(e) {
      console.error(e);
      if (btn) { btn.textContent = '📸 Share'; btn.disabled = false; }
    }
  },

  _exportCSV() {
    const headers = ['Date','Pair','TF','City','Station','Entry','SL','TP','Lot','Dist(km)','Gas(L)','RR','Outcome','PnL'];
    const rows = this._filtered.map(r => [
      new Date(r.created_at).toLocaleDateString('en-GB'),
      r.pair, r.timeframe, r.zone_name, r.station,
      r.entry, r.sl, r.tp, r.lot, r.tp_km, r.sl_l, r.rr,
      r.outcome,
      r.outcome==='reached' && r.pnl ? '+'+r.pnl :
      r.outcome==='failed'  && r.pnl ? '-'+r.pnl : ''
    ].map(v => '"' + String(v).replace(/"/g,'""') + '"').join(','));

    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'deliveries-' + Date.now() + '.csv';
    a.click(); URL.revokeObjectURL(url);
  },
};
