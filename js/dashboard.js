// ── Dashboard Module ──
// Wealth = manual input, everything else auto-calculated from setups

const Dashboard = {

  async refresh() {
    const el = document.getElementById('dashboard-view');
    if (!el) return;

    // Load all setups from DB
    const allComments = await DB.getAllSetups();

    let wins = 0, losses = 0, be = 0, pending = 0;
    let totalProfit = 0, totalLoss = 0;

    allComments.forEach(c => {
      let data = {};
      try { data = JSON.parse(c.text || '{}'); } catch(e) {}
      if (!data.outcome) return;
      if (data.outcome === 'reached') { wins++;   totalProfit += parseFloat(data.pnl_amount || 0); }
      if (data.outcome === 'failed')  { losses++; totalLoss   += parseFloat(data.pnl_amount || 0); }
      if (data.outcome === 'refused') { be++; }
      if (data.outcome === 'pending') { pending++; }
    });

    const totalTrades = wins + losses + be;
    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '—';
    const netPnl  = totalProfit - totalLoss;
    const wealth  = parseFloat(localStorage.getItem('zt_wealth') || '0');

    el.innerHTML = `
      <div class="dash-hero">
        <div class="dash-hero-eyebrow">🚗 The5%ers · SMC Analyst</div>
        <div class="dash-hero-title">The Delivery Man</div>
        <div class="dash-hero-sub">Cristian</div>
        <div class="dash-hero-tagline">Every zone is a city. Every trade is a delivery.</div>
        <div class="dash-hero-stats-bar">
          <div class="hero-stat"><span class="hero-stat-val" id="hs-trades">${totalTrades}</span><span class="hero-stat-lbl">Deliveries</span></div>
          <div class="hero-stat-div">·</div>
          <div class="hero-stat"><span class="hero-stat-val" id="hs-wr">${winRate}${winRate !== '—' ? '%' : ''}</span><span class="hero-stat-lbl">Win Rate</span></div>
          <div class="hero-stat-div">·</div>
          <div class="hero-stat"><span class="hero-stat-val ${netPnl >= 0 ? 'pos' : 'neg'}">${netPnl >= 0 ? '+' : ''}$${netPnl.toFixed(2)}</span><span class="hero-stat-lbl">Net P&L</span></div>
        </div>
      </div>

      <div class="dash-grid">
        <div class="dash-card wealth" id="wealth-card">
          <div class="dash-card-icon">💰</div>
          <div class="dash-card-label">Wealth</div>
          <div class="dash-card-value" id="wealth-value">$${wealth.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
          <button class="dash-edit-btn" id="wealth-edit-btn">Edit</button>
        </div>
        <div class="dash-card profit ${netPnl >= 0 ? 'pos' : 'neg'}">
          <div class="dash-card-icon">${netPnl >= 0 ? '📈' : '📉'}</div>
          <div class="dash-card-label">Net Profit</div>
          <div class="dash-card-value">${netPnl >= 0 ? '+' : '-'}$${Math.abs(netPnl).toFixed(2)}</div>
          <div class="dash-card-sub">${totalTrades} deliveries total</div>
        </div>
        <div class="dash-card wins">
          <div class="dash-card-icon">🏁</div>
          <div class="dash-card-label">Destinations Reached</div>
          <div class="dash-card-value">${wins}</div>
          <div class="dash-card-sub">+$${totalProfit.toFixed(2)} earned</div>
        </div>
        <div class="dash-card losses">
          <div class="dash-card-icon">💥</div>
          <div class="dash-card-label">BumpRoad Hits</div>
          <div class="dash-card-value">${losses}</div>
          <div class="dash-card-sub">-$${totalLoss.toFixed(2)} lost</div>
        </div>
        <div class="dash-card be">
          <div class="dash-card-icon">↩</div>
          <div class="dash-card-label">Refused Deliveries (BE)</div>
          <div class="dash-card-value">${be}</div>
          <div class="dash-card-sub">breakeven</div>
        </div>
        <div class="dash-card pending">
          <div class="dash-card-icon">🚗</div>
          <div class="dash-card-label">En Route</div>
          <div class="dash-card-value">${pending}</div>
          <div class="dash-card-sub">open setups</div>
        </div>
        <div class="dash-card winrate">
          <div class="dash-card-icon">🎯</div>
          <div class="dash-card-label">Win Rate</div>
          <div class="dash-card-value">${winRate}${winRate !== '—' ? '%' : ''}</div>
          <div class="dash-card-sub">${wins}W / ${losses}L / ${be}BE</div>
        </div>
      </div>

      <div class="dash-cta">
        <button class="btn btn-primary" id="dash-go-pairs">🗺 View Zones & Pairs</button>
      </div>
    `;

    // Wealth edit
    document.getElementById('wealth-edit-btn').addEventListener('click', () => {
      const current = localStorage.getItem('zt_wealth') || '0';
      const val = prompt('Enter account balance ($):', current);
      if (val !== null && !isNaN(parseFloat(val))) {
        localStorage.setItem('zt_wealth', parseFloat(val).toFixed(2));
        Dashboard.refresh();
      }
    });

    // Go to pairs
    document.getElementById('dash-go-pairs').addEventListener('click', () => {
      App.showPairsView();
    });
  },

  show() {
    document.getElementById('dashboard-view').classList.remove('hidden');
    document.getElementById('pairs-view').classList.add('hidden');
    document.getElementById('nav-dashboard').classList.add('active');
    document.getElementById('nav-pairs').classList.remove('active');
    this.refresh();
  }
};
