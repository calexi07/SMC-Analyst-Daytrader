// ── All Deliveries Module ──

const Deliveries = {

  _allData: [],
  _filtered: [],
  _filters: { pair: 'all', outcome: 'all', direction: 'all', tf: 'all' },

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

    // Fetch all zone_comments with zone data
    const { data, error } = await db
      .from('zone_comments')
      .select('*, zones(name, pair, timeframe, direction, status)')
      .order('created_at', { ascending: false });

    if (error) { console.error(error); return; }

    // Parse setup data
    this._allData = (data || []).map(row => {
      let setup = {};
      try { setup = JSON.parse(row.text || '{}'); } catch(e) {}
      return {
        id:         row.id,
        created_at: row.created_at,
        image_url:  row.image_url,
        zone_name:  row.zones?.name       || '—',
        pair:       row.zones?.pair       || '—',
        timeframe:  row.zones?.timeframe  || '—',
        direction:  row.zones?.direction  || '—',
        zone_status: row.zones?.status    || '—',
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
    }).filter(r => r.entry !== '—' || r.station !== '—'); // only real setups

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
      return true;
    });
  },

  _render() {
    const container = document.getElementById('deliveries-view');

    // Stats
    const wins   = this._filtered.filter(r => r.outcome === 'reached').length;
    const losses = this._filtered.filter(r => r.outcome === 'failed').length;
    const be     = this._filtered.filter(r => r.outcome === 'refused').length;
    const pending = this._filtered.filter(r => r.outcome === 'pending').length;
    const totalPnl = this._filtered.reduce((acc, r) => {
      if (r.outcome === 'reached' && r.pnl) return acc + parseFloat(r.pnl);
      if (r.outcome === 'failed'  && r.pnl) return acc - parseFloat(r.pnl);
      return acc;
    }, 0);
    const wr = (wins + losses + be) > 0 ? ((wins / (wins + losses + be)) * 100).toFixed(1) : '—';

    // Unique pairs + TFs for filter dropdowns
    const pairs = [...new Set(this._allData.map(r => r.pair))].filter(p => p !== '—');
    const tfs   = [...new Set(this._allData.map(r => r.timeframe))].filter(t => t !== '—');

    const pairOpts = '<option value="all">All Pairs</option>' +
      pairs.map(p => `<option value="${p}" ${this._filters.pair===p?'selected':''}>${p}</option>`).join('');
    const tfOpts = '<option value="all">All TFs</option>' +
      tfs.map(t => `<option value="${t}" ${this._filters.tf===t?'selected':''}>${t.toUpperCase()}</option>`).join('');

    const outcomeConfig = {
      reached: { label: '🏁 Reached',  cls: 'outcome-win'     },
      failed:  { label: '💥 BumpRoad', cls: 'outcome-loss'    },
      refused: { label: '↩ BE',        cls: 'outcome-be'      },
      pending: { label: '🚗 En Route', cls: 'outcome-pending' },
    };

    const rows = this._filtered.map(r => {
      const oc  = outcomeConfig[r.outcome] || outcomeConfig.pending;
      const pnlHtml = r.outcome === 'reached' && r.pnl
        ? `<span class="pnl win">+$${parseFloat(r.pnl).toFixed(2)}</span>`
        : r.outcome === 'failed' && r.pnl
        ? `<span class="pnl loss">-$${parseFloat(r.pnl).toFixed(2)}</span>`
        : '—';
      const dirIcon = r.direction === 'bull' ? '▲' : r.direction === 'bear' ? '▼' : '';
      const dirCls  = r.direction === 'bull' ? 'map-bull' : r.direction === 'bear' ? 'map-bear' : '';
      const date    = new Date(r.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' });
      const imgHtml = r.image_url
        ? `<a href="${r.image_url}" target="_blank" class="del-img-link">📷</a>`
        : '';

      return `<tr class="del-row" data-id="${r.id}">
        <td class="del-date">${date}</td>
        <td><span class="del-pair">${r.pair}</span></td>
        <td><span class="del-tf">${r.timeframe.toUpperCase()}</span></td>
        <td><span class="${dirCls}" style="font-weight:700;">${dirIcon}</span> ${r.zone_name}</td>
        <td class="del-mono">${r.station}</td>
        <td class="del-mono">${r.entry}</td>
        <td class="del-mono">${r.sl}</td>
        <td class="del-mono">${r.tp}</td>
        <td class="del-mono">${r.lot}</td>
        <td class="del-mono">${r.tp_km !== '—' ? r.tp_km + ' km' : '—'}</td>
        <td class="del-mono">${r.sl_l  !== '—' ? r.sl_l  + ' L'  : '—'}</td>
        <td>${r.rr}</td>
        <td><span class="setup-outcome ${oc.cls}" style="font-size:10px;">${oc.label}</span></td>
        <td>${pnlHtml}</td>
        <td>${imgHtml}</td>
      </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="del-header">
        <div class="del-title-row">
          <h2 class="del-title">🚛 All Deliveries</h2>
          <button class="btn btn-secondary btn-sm" id="del-export-btn">⬇ Export CSV</button>
        </div>

        <!-- Stats bar -->
        <div class="del-stats">
          <div class="del-stat wins"><span class="del-stat-val">${wins}</span><span class="del-stat-lbl">🏁 Reached</span></div>
          <div class="del-stat losses"><span class="del-stat-val">${losses}</span><span class="del-stat-lbl">💥 BumpRoad</span></div>
          <div class="del-stat be"><span class="del-stat-val">${be}</span><span class="del-stat-lbl">↩ BE</span></div>
          <div class="del-stat pending"><span class="del-stat-val">${pending}</span><span class="del-stat-lbl">🚗 En Route</span></div>
          <div class="del-stat wr"><span class="del-stat-val">${wr}${wr!=='—'?'%':''}</span><span class="del-stat-lbl">Win Rate</span></div>
          <div class="del-stat pnl ${totalPnl>=0?'pos':'neg'}">
            <span class="del-stat-val">${totalPnl>=0?'+':''}$${Math.abs(totalPnl).toFixed(2)}</span>
            <span class="del-stat-lbl">Net P&L</span>
          </div>
        </div>

        <!-- Filters -->
        <div class="del-filters">
          <select class="form-select del-filter" id="del-filter-pair" style="min-width:130px;">${pairOpts}</select>
          <select class="form-select del-filter" id="del-filter-tf" style="min-width:100px;">${tfOpts}</select>
          <select class="form-select del-filter" id="del-filter-dir">
            <option value="all">All Directions</option>
            <option value="bull" ${this._filters.direction==='bull'?'selected':''}>▲ Bullish</option>
            <option value="bear" ${this._filters.direction==='bear'?'selected':''}>▼ Bearish</option>
          </select>
          <select class="form-select del-filter" id="del-filter-outcome">
            <option value="all">All Outcomes</option>
            <option value="reached" ${this._filters.outcome==='reached'?'selected':''}>🏁 Reached</option>
            <option value="failed"  ${this._filters.outcome==='failed' ?'selected':''}>💥 BumpRoad</option>
            <option value="refused" ${this._filters.outcome==='refused'?'selected':''}>↩ BE</option>
            <option value="pending" ${this._filters.outcome==='pending'?'selected':''}>🚗 En Route</option>
          </select>
          <span class="del-count">${this._filtered.length} deliveries</span>
        </div>
      </div>

      <!-- Table -->
      <div class="del-table-wrap">
        <table class="del-table">
          <thead>
            <tr>
              <th>Date</th><th>Pair</th><th>TF</th><th>City</th>
              <th>⛽ Station</th><th>Entry</th><th>SL</th><th>TP</th><th>Lot</th>
              <th>📍 Dist</th><th>🪣 Gas</th><th>R:R</th>
              <th>Outcome</th><th>P&L</th><th>Chart</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="15" class="del-empty">No deliveries logged yet</td></tr>'}</tbody>
        </table>
      </div>
    `;

    // Filter events
    ['pair','tf','dir','outcome'].forEach(key => {
      const el = document.getElementById('del-filter-' + key);
      if (!el) return;
      el.addEventListener('change', () => {
        if (key === 'pair')    this._filters.pair      = el.value;
        if (key === 'tf')      this._filters.tf        = el.value;
        if (key === 'dir')     this._filters.direction = el.value;
        if (key === 'outcome') this._filters.outcome   = el.value;
        this._applyFilters();
        this._render();
      });
    });

    // Export CSV
    document.getElementById('del-export-btn')?.addEventListener('click', () => this._exportCSV());
  },

  _exportCSV() {
    const headers = ['Date','Pair','TF','City','Station','Entry','SL','TP','Lot','Distance(km)','Gas(L)','RR','Outcome','PnL'];
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
