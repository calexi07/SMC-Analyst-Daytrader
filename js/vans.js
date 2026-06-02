// ── Vans Module ──
// Trading accounts as delivery vans with license plates

const Vans = {

  _vans: [],   // cached list

  async load() {
    var { data, error } = await db.from('vans').select('*').order('created_at', { ascending: true });
    if (error) { console.error('loadVans:', error); return []; }
    this._vans = data || [];
    return this._vans;
  },

  getAll() { return this._vans; },

  getById(id) { return this._vans.find(function(v) { return v.id === id; }) || null; },

  // ── Vans management page ──
  async show() {
    document.getElementById('vans-view').classList.remove('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('pairs-view').classList.add('hidden');
    document.getElementById('deliveries-view').classList.add('hidden');
    document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
    document.getElementById('nav-vans').classList.add('active');
    localStorage.setItem('zt_last_view', 'vans');
    await this.renderPage();
  },

  async renderPage() {
    var container = document.getElementById('vans-view');
    await this.load();

    // Fetch P&L per van
    var pnlMap = {};
    if (this._vans.length > 0) {
      var { data: comments } = await db
        .from('zone_comments')
        .select('text, van_id');
      (comments || []).forEach(function(c) {
        if (!c.van_id) return;
        var data = {};
        try { data = JSON.parse(c.text || '{}'); } catch(e) {}
        if (!pnlMap[c.van_id]) pnlMap[c.van_id] = 0;
        var amount = Math.abs(parseFloat(data.pnl_amount || 0));
        if (data.outcome === 'reached') pnlMap[c.van_id] += amount;
        if (data.outcome === 'failed')  pnlMap[c.van_id] -= amount;
      });
    }

    var vansHtml = this._vans.length === 0
      ? '<div class="vans-empty">No vans yet. Add your first trading account.</div>'
      : this._vans.map(function(v) {
          return Vans._buildVanCard(v, pnlMap[v.id] || 0);
        }).join('');

    container.innerHTML =
      '<div class="vans-header">' +
        '<h2 class="del-title">🚐 Fleet Manager</h2>' +
        '<button class="btn btn-primary" id="van-add-btn">+ Add Van</button>' +
      '</div>' +
      '<div class="vans-grid" id="vans-grid">' + vansHtml + '</div>';

    document.getElementById('van-add-btn').addEventListener('click', function() {
      Vans.openVanModal(null);
    });

    container.querySelectorAll('.van-edit-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var van = Vans.getById(btn.dataset.id);
        if (van) Vans.openVanModal(van);
      });
    });

    container.querySelectorAll('.van-del-btn').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        if (!confirm('Delete van ' + btn.dataset.plate + '? This will not delete its setups.')) return;
        await db.from('vans').delete().eq('id', btn.dataset.id);
        await Vans.renderPage();
      });
    });

    container.querySelectorAll('.van-dashboard-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        Vans.showVanDashboard(btn.dataset.id);
      });
    });
  },

  _buildVanCard(v, netPnl) {
    netPnl = netPnl || 0;
    var initial  = parseFloat(v.balance || 0);
    var running  = initial + netPnl;
    var pnlColor = netPnl >= 0 ? 'var(--fresh)' : 'var(--danger)';
    var pnlSign  = netPnl >= 0 ? '+$' : '-$';
    return '<div class="van-card">' +
      '<div class="van-plate-wrap">' +
        '<div class="van-plate">' + v.plate + '</div>' +
        (v.label ? '<div class="van-label">' + v.label + '</div>' : '') +
      '</div>' +
      '<div class="van-balances">' +
        '<div class="van-balance-row">' +
          '<span class="van-balance-label">Initial Balance</span>' +
          '<span class="van-balance-val" style="font-size:18px; color:var(--text);">$' + initial.toLocaleString('en', {minimumFractionDigits:2}) + '</span>' +
        '</div>' +
        '<div class="van-balance-row">' +
          '<span class="van-balance-label">Net P&L</span>' +
          '<span class="van-balance-val" style="font-size:16px; color:' + pnlColor + ';">' + pnlSign + Math.abs(netPnl).toFixed(2) + '</span>' +
        '</div>' +
        '<div class="van-balance-row" style="border-top:1px solid var(--border); padding-top:8px; margin-top:4px;">' +
          '<span class="van-balance-label" style="font-weight:600; color:var(--text);">Running Balance</span>' +
          '<span class="van-balance-val" style="font-size:22px; color:' + (running>=initial?'var(--fresh)':'var(--danger)') + ';">$' + running.toLocaleString('en', {minimumFractionDigits:2}) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="van-actions">' +
        '<button class="btn btn-secondary btn-sm van-dashboard-btn" data-id="' + v.id + '">📊 Dashboard</button>' +
        '<button class="btn-icon van-edit-btn" data-id="' + v.id + '" title="Edit">✎</button>' +
        '<button class="btn-icon del van-del-btn" data-id="' + v.id + '" data-plate="' + v.plate + '" title="Delete">✕</button>' +
      '</div>' +
    '</div>';
  },

  openVanModal(existing) {
    var modal   = document.getElementById('comment-modal');
    var overlay = document.getElementById('modal-overlay');
    var isEdit  = !!existing;

    modal.innerHTML =
      '<div class="modal-header">' +
        '<span class="modal-title">' + (isEdit ? '✎ Edit Van' : '🚐 Add Van') + '</span>' +
        '<button class="modal-close" id="vm-close">✕</button>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div class="form-group">' +
          '<label class="form-label">License Plate</label>' +
          '<input class="form-input van-plate-input" id="vm-plate" placeholder="e.g. B-123-XYZ" value="' + (existing?.plate || '') + '" />' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Label (optional)</label>' +
          '<input class="form-input" id="vm-label" placeholder="e.g. The5%ers Funded" value="' + (existing?.label || '') + '" />' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Initial Balance ($)</label>' +
          '<input class="form-input" id="vm-balance" type="number" step="0.01" placeholder="10000.00" value="' + (existing?.balance || '') + '" />' +
        '</div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" id="vm-cancel">Cancel</button>' +
        '<button class="btn btn-primary" id="vm-save">' + (isEdit ? 'Save Changes' : 'Add Van') + '</button>' +
      '</div>';

    var close = function() { modal.classList.add('hidden'); overlay.classList.add('hidden'); };
    modal.querySelector('#vm-close').addEventListener('click', close);
    modal.querySelector('#vm-cancel').addEventListener('click', close);
    overlay.addEventListener('click', close, { once: true });

    modal.querySelector('#vm-save').addEventListener('click', async function() {
      var plate   = modal.querySelector('#vm-plate').value.trim().toUpperCase();
      var label   = modal.querySelector('#vm-label').value.trim();
      var balance = parseFloat(modal.querySelector('#vm-balance').value) || 0;

      if (!plate) { alert('Please enter a license plate.'); return; }

      var btn = modal.querySelector('#vm-save');
      btn.textContent = 'Saving...'; btn.disabled = true;

      var payload = { plate, label: label || null, balance };
      var result;
      if (isEdit) {
        result = await db.from('vans').update(payload).eq('id', existing.id);
      } else {
        result = await db.from('vans').insert([payload]);
      }

      if (!result.error) {
        close();
        await Vans.renderPage();
        await Vans.load(); // refresh cache
      } else {
        console.error(result.error);
        btn.textContent = isEdit ? 'Save Changes' : 'Add Van';
        btn.disabled = false;
        alert(result.error.message || 'Error saving van.');
      }
    });

    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
    modal.querySelector('#vm-plate').focus();
  },

  // ── Per-van dashboard ──
  async showVanDashboard(vanId) {
    var van = this.getById(vanId);
    if (!van) return;

    var container = document.getElementById('vans-view');
    container.innerHTML = '<div class="loader" style="padding:40px;">Loading van data...</div>';

    // Fetch setups for this van
    var { data: comments } = await db
      .from('zone_comments')
      .select('text, created_at, zones(pair)')
      .eq('van_id', vanId)
      .order('created_at', { ascending: true });

    var wins = 0, losses = 0, be = 0, pending = 0;
    var totalProfit = 0, totalLoss = 0;
    var pnlCurve = [];
    var runningPnl = 0;

    (comments || []).forEach(function(c) {
      var data = {};
      try { data = JSON.parse(c.text || '{}'); } catch(e) {}
      if (!data.outcome) return;
      var amount = Math.abs(parseFloat(data.pnl_amount || 0));
      if (data.outcome === 'reached') {
        wins++; totalProfit += amount; runningPnl += amount;
        pnlCurve.push({ date: c.created_at.slice(0,10), pnl: runningPnl, outcome: 'win' });
      } else if (data.outcome === 'failed') {
        losses++; totalLoss += amount; runningPnl -= amount;
        pnlCurve.push({ date: c.created_at.slice(0,10), pnl: runningPnl, outcome: 'loss' });
      } else if (data.outcome === 'refused') {
        be++; pnlCurve.push({ date: c.created_at.slice(0,10), pnl: runningPnl, outcome: 'be' });
      } else { pending++; }
    });

    var netPnl   = totalProfit - totalLoss;
    var balance  = parseFloat(van.balance || 0) + netPnl;
    var totalTrades = wins + losses + be;
    var wr = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '—';

    container.innerHTML =
      '<div class="van-dash-header">' +
        '<button class="btn btn-secondary btn-sm" id="van-back-btn">← Fleet</button>' +
        '<div class="van-plate" style="font-size:24px;">' + van.plate + '</div>' +
        (van.label ? '<div class="van-label">' + van.label + '</div>' : '') +
      '</div>' +
      '<div class="dash-grid" style="margin-bottom:14px;">' +
        '<div class="dash-card wealth"><div class="dash-card-icon">💰</div><div class="dash-card-label">Initial Balance</div><div class="dash-card-value">$' + parseFloat(van.balance||0).toLocaleString('en',{minimumFractionDigits:2}) + '</div></div>' +
        '<div class="dash-card ' + (netPnl>=0?'profit pos':'profit neg') + '"><div class="dash-card-icon">' + (netPnl>=0?'📈':'📉') + '</div><div class="dash-card-label">Net P&L</div><div class="dash-card-value">' + (netPnl>=0?'+$':'-$') + Math.abs(netPnl).toFixed(2) + '</div></div>' +
        '<div class="dash-card wins"><div class="dash-card-icon">🏁</div><div class="dash-card-label">Reached</div><div class="dash-card-value">' + wins + '</div></div>' +
        '<div class="dash-card losses"><div class="dash-card-icon">💥</div><div class="dash-card-label">BumpRoad</div><div class="dash-card-value">' + losses + '</div></div>' +
        '<div class="dash-card be"><div class="dash-card-icon">↩</div><div class="dash-card-label">BE</div><div class="dash-card-value">' + be + '</div></div>' +
        '<div class="dash-card winrate"><div class="dash-card-icon">🎯</div><div class="dash-card-label">Win Rate</div><div class="dash-card-value">' + wr + (wr!=='—'?'%':'') + '</div></div>' +
      '</div>' +
      '<div class="dash-bottom-row">' +
        '<div class="dash-card balance-card"><div class="dash-card-icon">🏦</div><div class="dash-card-label">Current Balance</div><div class="dash-card-value ' + (balance>=parseFloat(van.balance||0)?'green':'red') + '" style="font-size:28px;">$' + balance.toLocaleString('en',{minimumFractionDigits:2}) + '</div><div class="dash-card-sub">Initial $' + parseFloat(van.balance||0).toFixed(2) + ' ' + (netPnl>=0?'+':'-') + '$' + Math.abs(netPnl).toFixed(2) + ' P&L</div></div>' +
        '<div class="dash-pnl-chart-card"><div class="dash-chart-header"><span class="dash-chart-title">📈 P&L Curve</span><span class="dash-chart-sub">' + totalTrades + ' closed</span></div><canvas id="pnl-chart-van" height="120"></canvas>' + (pnlCurve.length===0?'<div class="dash-chart-empty">No closed trades yet</div>':'') + '</div>' +
      '</div>';

    document.getElementById('van-back-btn').addEventListener('click', function() {
      Vans.renderPage();
    });

    if (pnlCurve.length > 0) {
      Dashboard._renderPnlChart(pnlCurve, parseFloat(van.balance||0), 'pnl-chart-van');
    }
  },
};
