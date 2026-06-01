// ── Dashboard Module ──
// Wealth = manual input, everything else auto-calculated from setups

const Dashboard = {

  async refresh() {
    const el = document.getElementById('dashboard-view');
    if (!el) return;

    // Load all setups from DB — sorted by date for chart
    const { data: rawComments } = await db
      .from('zone_comments')
      .select('text, created_at')
      .order('created_at', { ascending: true });
    const allComments = rawComments || [];

    let wins = 0, losses = 0, be = 0, pending = 0;
    let totalProfit = 0, totalLoss = 0;

    // Build P&L curve data
    const pnlCurve = []; // [{date, cumPnl, outcome}]
    let runningPnl = 0;

    allComments.forEach(c => {
      let data = {};
      try { data = JSON.parse(c.text || '{}'); } catch(e) {}
      if (!data.outcome) return;
      const amount = Math.abs(parseFloat(data.pnl_amount || 0));
      if (data.outcome === 'reached') {
        wins++; totalProfit += amount; runningPnl += amount;
        pnlCurve.push({ date: c.created_at.slice(0,10), pnl: runningPnl, outcome: 'win', amount });
      }
      if (data.outcome === 'failed')  {
        losses++; totalLoss += amount; runningPnl -= amount;
        pnlCurve.push({ date: c.created_at.slice(0,10), pnl: runningPnl, outcome: 'loss', amount });
      }
      if (data.outcome === 'refused') { be++; pnlCurve.push({ date: c.created_at.slice(0,10), pnl: runningPnl, outcome: 'be', amount: 0 }); }
      if (data.outcome === 'pending') { pending++; }
    });

    const totalTrades = wins + losses + be;
    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '—';
    const netPnl  = totalProfit - totalLoss;
    const wealth  = parseFloat(localStorage.getItem('zt_wealth') || '0');
    const balance = wealth + netPnl;

    el.innerHTML = `
      <div class="dash-hero">
        <div class="dash-hero-eyebrow">🚗 The5%ers · SMC Analyst</div>
        <div class="dash-hero-title">The Delivery Man</div>
        <div class="dash-hero-sub">Cristian</div>
        <div class="dash-hero-tagline">Every zone is a city. Every trade is a delivery.</div>
        <div class="dash-share-row">
          <button class="btn btn-discord" id="dash-share-btn" style="margin-top:12px; font-size:13px;">📸 Share Dashboard</button>
        </div>
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

      <!-- Balance + Chart row -->
      <div class="dash-bottom-row">
        <div class="dash-card balance-card">
          <div class="dash-card-icon">🏦</div>
          <div class="dash-card-label">Account Balance</div>
          <div class="dash-card-value ${balance >= wealth ? 'green' : 'red'}" style="font-size:32px;">
            $${balance.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2})}
          </div>
          <div class="dash-card-sub">
            Wealth $${wealth.toFixed(2)} ${netPnl >= 0 ? '+' : ''}$${netPnl.toFixed(2)} P&L
          </div>
        </div>
        <div class="dash-pnl-chart-card">
          <div class="dash-chart-header">
            <span class="dash-chart-title">📈 P&L Curve</span>
            <span class="dash-chart-sub">${pnlCurve.filter(p=>p.outcome!=='be').length} closed trades</span>
          </div>
          <canvas id="pnl-chart" height="120"></canvas>
          ${pnlCurve.length === 0 ? '<div class="dash-chart-empty">No closed trades yet</div>' : ''}
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

    // Share dashboard screenshot
    document.getElementById('dash-share-btn')?.addEventListener('click', () => {
      Dashboard._shareScreenshot();
    });

    // Render P&L chart
    Dashboard._renderPnlChart(pnlCurve, wealth);
  },

  async _shareScreenshot() {
    const btn = document.getElementById('dash-share-btn');
    if (!btn) return;
    btn.textContent = '⏳ Capturing...'; btn.disabled = true;

    try {
      // Load html2canvas dynamically
      if (!window.html2canvas) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
      }

      const hero    = document.querySelector('.dash-hero');
      const grid    = document.querySelector('.dash-grid');
      const bottom  = document.querySelector('.dash-bottom-row');

      // Create a wrapper to capture
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:fixed; top:-9999px; left:-9999px; background:#f4f6f9; padding:24px; width:900px; font-family:DM Sans,sans-serif;';

      // Clone relevant sections
      if (hero)   wrapper.appendChild(hero.cloneNode(true));
      if (grid)   wrapper.appendChild(grid.cloneNode(true));
      if (bottom) wrapper.appendChild(bottom.cloneNode(true));

      // Remove share button from clone
      wrapper.querySelectorAll('#dash-share-btn, .dash-share-row').forEach(e => e.remove());
      wrapper.querySelectorAll('#wealth-edit-btn').forEach(e => e.remove());
      wrapper.querySelectorAll('#dash-go-pairs').forEach(e => e.remove());
      wrapper.querySelectorAll('.dash-cta').forEach(e => e.remove());

      document.body.appendChild(wrapper);

      const canvas = await window.html2canvas(wrapper, {
        backgroundColor: '#f4f6f9',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      document.body.removeChild(wrapper);

      // Try clipboard first
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          btn.textContent = '✅ Copied! Paste in Discord';
          btn.style.background = '#059669';
        } catch(e) {
          // Fallback: download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'dashboard-' + Date.now() + '.png'; a.click();
          URL.revokeObjectURL(url);
          btn.textContent = '💾 Saved as image';
          btn.style.background = '#059669';
        }
        setTimeout(() => {
          btn.textContent = '📸 Share Dashboard';
          btn.style.background = '';
          btn.disabled = false;
        }, 3000);
      }, 'image/png');

    } catch(e) {
      console.error('Screenshot error:', e);
      btn.textContent = '❌ Error'; btn.disabled = false;
      setTimeout(() => { btn.textContent = '📸 Share Dashboard'; }, 2000);
    }
  },

  _renderPnlChart(curve, wealth) {
    const canvas = document.getElementById('pnl-chart');
    if (!canvas || curve.length === 0) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth || canvas.parentElement.offsetWidth - 40 || 400;
    const H = 120;
    canvas.width  = W;
    canvas.height = H;

    const pad = { top: 12, right: 16, bottom: 24, left: 52 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top  - pad.bottom;

    // Add start point at 0
    const points = [{ pnl: 0 }, ...curve];
    const pnlValues = points.map(p => p.pnl);
    const maxPnl = Math.max(...pnlValues, 0.01);
    const minPnl = Math.min(...pnlValues, -0.01);
    const range  = maxPnl - minPnl || 1;

    function toX(i) { return pad.left + (i / (points.length - 1)) * chartW; }
    function toY(v) { return pad.top + chartH - ((v - minPnl) / range) * chartH; }

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, W, H);

    // Zero line
    const zeroY = toY(0);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(pad.left, zeroY); ctx.lineTo(W - pad.right, zeroY); ctx.stroke();
    ctx.setLineDash([]);

    // Fill area under curve
    const lastPnl = points[points.length - 1].pnl;
    const fillColor = lastPnl >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(0));
    points.forEach((p, i) => ctx.lineTo(toX(i), toY(p.pnl)));
    ctx.lineTo(toX(points.length - 1), toY(0));
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Curve line
    const lineColor = lastPnl >= 0 ? '#10b981' : '#ef4444';
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(toX(i), toY(p.pnl));
      else ctx.lineTo(toX(i), toY(p.pnl));
    });
    ctx.stroke();

    // Dots for each trade
    curve.forEach((p, i) => {
      const x = toX(i + 1);
      const y = toY(p.pnl);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = p.outcome === 'win' ? '#10b981' : p.outcome === 'loss' ? '#ef4444' : '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Y axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px DM Mono, monospace';
    ctx.textAlign = 'right';
    [maxPnl, 0, minPnl].forEach(v => {
      if (Math.abs(v) < 0.001) return;
      ctx.fillText((v >= 0 ? '+$' : '-$') + Math.abs(v).toFixed(0), pad.left - 4, toY(v) + 3);
    });
    ctx.fillText('$0', pad.left - 4, zeroY + 3);

    // Date labels (first and last)
    if (curve.length > 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px DM Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(curve[0].date, pad.left, H - 6);
      if (curve.length > 1) {
        ctx.textAlign = 'right';
        ctx.fillText(curve[curve.length - 1].date, W - pad.right, H - 6);
      }
    }
  },

  show() {
    document.getElementById('dashboard-view').classList.remove('hidden');
    document.getElementById('pairs-view').classList.add('hidden');
    document.getElementById('nav-dashboard').classList.add('active');
    document.getElementById('nav-pairs').classList.remove('active');
    this.refresh();
  }
};
