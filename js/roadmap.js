// ── Road Map — Horizontal Animated ──

const RoadMap = {

  _priceHistory: [],   // {price, ts} last 15min
  _direction: 1,       // 1 = right (bullish), -1 = left (bearish)
  _dashOffset: 0,      // animated dash position
  _panOffset: 0,       // horizontal pan offset from drag
  _isDragging: false,
  _dragStartX: 0,
  _dragStartPan: 0,

  _animFrame: null,
  _truckX: 0,
  _targetX: 0,
  _clouds: [],
  _trees: [],
  _initialized: false,

  render(mapEl, zones, currentPrice, pObj, pipSize) {
    var decimals = currentPrice > 100 ? 2 : 5;
    var W = mapEl.offsetWidth || 700;
    var H = 320;
    var WORLD_W = W * 3; // world is 3x viewport wide

    // Track price history for direction
    var now = Date.now();
    RoadMap._priceHistory.push({ price: currentPrice, ts: now });
    RoadMap._priceHistory = RoadMap._priceHistory.filter(function(p) {
      return now - p.ts < 15 * 60 * 1000;
    });
    if (RoadMap._priceHistory.length >= 2) {
      var oldest = RoadMap._priceHistory[0].price;
      RoadMap._direction = currentPrice >= oldest ? 1 : -1;
    }

    // Price range — base on current price ± fixed window
    // Always show current price centered, zones spread around it
    var allPrices = zones.map(function(z) { return z.mid; }).concat([currentPrice]);
    var maxP = Math.max.apply(null, allPrices);
    var minP = Math.min.apply(null, allPrices);
    var pad  = Math.max((maxP - minP) * 0.4, currentPrice * 0.005);
    maxP += pad; minP -= pad;
    var range = maxP - minP || 1;

    // Map price to world X
    function priceToWorldX(p) {
      return ((p - minP) / range) * (WORLD_W - 120) + 60;
    }

    var roadY   = 185;
    var roadH   = 54;
    var roadTop = roadY - roadH / 2;
    var truckWorldX = priceToWorldX(currentPrice);

    // Init pan to center truck in viewport
    if (!RoadMap._initialized || RoadMap._clouds.length === 0) {
      RoadMap._clouds = [];
      for (var i = 0; i < 8; i++) {
        RoadMap._clouds.push({
          wx: Math.random() * WORLD_W,
          y: 20 + Math.random() * 50,
          r: 20 + Math.random() * 20,
          speed: 0.2 + Math.random() * 0.25
        });
      }
      // Center truck in viewport
      RoadMap._panOffset = W / 2 - truckWorldX;
      RoadMap._truckX = truckWorldX;
      RoadMap._initialized = true;
    }
    RoadMap._targetX  = truckWorldX;
    RoadMap._worldW   = WORLD_W;
    RoadMap._W        = W;
    RoadMap._H        = H;
    RoadMap._roadY    = roadY;
    RoadMap._roadH    = roadH;
    RoadMap._roadTop  = roadTop;
    RoadMap._minP     = minP;
    RoadMap._maxP     = maxP;
    RoadMap._range    = range;
    RoadMap._price    = currentPrice;
    RoadMap._decimals = decimals;
    RoadMap._zones    = zones;
    RoadMap._pObj     = pObj;
    RoadMap._priceToWorldX = priceToWorldX;

    mapEl.innerHTML =
      '<div class="road-wrap">' +
        '<canvas id="road-canvas" width="' + W + '" height="' + H + '" style="cursor:grab;"></canvas>' +
        '<div class="road-price-pill" id="road-price-pill">' +
          '<span class="road-price-live">LIVE</span>' +
          '<span class="road-price-val" id="road-price-val">' + currentPrice.toFixed(decimals) + '</span>' +
        '</div>' +
        '<button class="road-screenshot-btn" id="road-screenshot-btn" title="Copy screenshot">📸</button>' +
        '<button class="road-reset-btn" id="road-reset-btn" title="Center view">⌖</button>' +
        '<div class="road-drag-hint" id="road-drag-hint">← drag to explore →</div>' +
      '</div>';

    setTimeout(function() {
      var screenshotBtn = document.getElementById('road-screenshot-btn');
      if (screenshotBtn) screenshotBtn.addEventListener('click', function() { RoadMap._screenshot(); });
      var resetBtn = document.getElementById('road-reset-btn');
      if (resetBtn) resetBtn.addEventListener('click', function() {
        RoadMap._panOffset = RoadMap._W / 2 - RoadMap._targetX;
      });
      RoadMap._initDrag();
    }, 100);

    if (RoadMap._animFrame) cancelAnimationFrame(RoadMap._animFrame);
    RoadMap._tick();
  },

  _tick() {
    var canvas = document.getElementById('road-canvas');
    if (!canvas) return;
    var ctx   = canvas.getContext('2d');
    var W     = RoadMap._W;
    var H     = RoadMap._H;
    var WORLD_W = RoadMap._worldW || W * 3;
    var roadTop = RoadMap._roadTop;
    var roadH   = RoadMap._roadH;
    var roadY   = RoadMap._roadY;
    var pan     = RoadMap._panOffset;
    var dir     = RoadMap._direction;

    // Ease truck
    RoadMap._truckX += (RoadMap._targetX - RoadMap._truckX) * 0.04;

    // Animate clouds in world space (wrap around world)
    RoadMap._clouds.forEach(function(c) {
      c.wx -= c.speed * dir * -1; // clouds move opposite to direction for parallax
      if (c.wx < -100) c.wx = WORLD_W + 100;
      if (c.wx > WORLD_W + 100) c.wx = -100;
    });

    // Dash animation
    RoadMap._dashOffset += dir * 1.5;

    ctx.clearRect(0, 0, W, H);

    // ── WORLD LAYER (panned) ──
    ctx.save();
    ctx.translate(pan, 0);
    ctx.beginPath();
    ctx.rect(0, 0, WORLD_W, H);
    ctx.clip(); // clip to world bounds (optional)

    // Sky
    var sky = ctx.createLinearGradient(0, 0, 0, roadTop);
    sky.addColorStop(0, '#bfdbfe');
    sky.addColorStop(1, '#dbeafe');
    ctx.fillStyle = sky;
    ctx.fillRect(-pan, 0, W, roadTop); // fill viewport sky always

    // Ground
    var ground = ctx.createLinearGradient(0, roadTop + roadH, 0, H);
    ground.addColorStop(0, '#86efac');
    ground.addColorStop(1, '#4ade80');
    ctx.fillStyle = ground;
    ctx.fillRect(-pan, roadTop + roadH, W, H - roadTop - roadH);

    // Clouds
    RoadMap._clouds.forEach(function(c) {
      var sx = c.wx;
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.beginPath();
      ctx.arc(sx, c.y, c.r, 0, Math.PI * 2);
      ctx.arc(sx + c.r * 0.8, c.y - c.r * 0.3, c.r * 0.65, 0, Math.PI * 2);
      ctx.arc(sx - c.r * 0.7, c.y - c.r * 0.15, c.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    });

    // Road (full world width)
    var roadGrad = ctx.createLinearGradient(0, roadTop, 0, roadTop + roadH);
    roadGrad.addColorStop(0, '#374151');
    roadGrad.addColorStop(1, '#1f2937');
    ctx.fillStyle = roadGrad;
    ctx.fillRect(0, roadTop, WORLD_W, roadH);

    // Road edges
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, roadTop + 3); ctx.lineTo(WORLD_W, roadTop + 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, roadTop + roadH - 3); ctx.lineTo(WORLD_W, roadTop + roadH - 3); ctx.stroke();

    // Center dashes
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([22, 18]);
    ctx.lineDashOffset = RoadMap._dashOffset;
    ctx.beginPath(); ctx.moveTo(0, roadY); ctx.lineTo(WORLD_W, roadY); ctx.stroke();
    ctx.setLineDash([]);

    // Zone bands + signs
    RoadMap._zones.forEach(function(item, i) {
      var z = item.zone;
      var wx = RoadMap._priceToWorldX(item.mid);
      var isBull   = z.direction === 'bull';
      var isInside = item.inside;
      var zColor   = isInside ? '#f59e0b' : isBull ? '#10b981' : '#ef4444';

      // Zone width based on top-btm spread
      var zoneW = item.top && item.btm
        ? Math.max(24, Math.abs(item.top - item.btm) / RoadMap._range * (WORLD_W - 120))
        : 28;

      // Road band
      ctx.fillStyle = zColor + '35';
      ctx.fillRect(wx - zoneW/2, roadTop, zoneW, roadH);
      ctx.strokeStyle = zColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(wx - zoneW/2, roadTop, zoneW, roadH);
      ctx.setLineDash([]);

      // Post
      var postTop = i % 2 === 0 ? roadTop - 4 : roadTop + roadH + 4;
      var postDir = i % 2 === 0 ? -1 : 1;
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wx, postTop);
      ctx.lineTo(wx, postTop + postDir * 32);
      ctx.stroke();

      // Sign
      var sw = 90, sh = 40;
      var sx = wx - sw/2;
      var sy = postTop + postDir * 32 - (postDir < 0 ? sh : 0);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(sx + 2, sy + 2, sw, sh, 6);
      else ctx.rect(sx + 2, sy + 2, sw, sh);
      ctx.fill();

      // Board
      ctx.fillStyle = isInside ? '#fffbeb' : isBull ? '#ecfdf5' : '#fef2f2';
      ctx.strokeStyle = zColor;
      ctx.lineWidth = isInside ? 2.5 : 1.5;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(sx, sy, sw, sh, 6);
      else ctx.rect(sx, sy, sw, sh);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      // Direction icon
      ctx.fillStyle = zColor;
      ctx.font = '10px sans-serif';
      ctx.fillText(isBull ? '▲' : '▼', sx + 10, sy + 14);
      // City name
      ctx.fillStyle = isInside ? '#92400e' : isBull ? '#065f46' : '#991b1b';
      ctx.font = 'bold 11px DM Sans,sans-serif';
      ctx.fillText(z.name, wx, sy + 14);
      // TF + status
      ctx.fillStyle = zColor + 'cc';
      ctx.font = '9px DM Mono,monospace';
      ctx.fillText((item.tf).toUpperCase() + ' · ' + z.status, wx, sy + 25);
      // Distance
      var distTxt = isInside ? '● IN ZONE' : item.distPips.toFixed(0) + ' pips';
      ctx.fillStyle = zColor;
      ctx.font = 'bold 9px DM Mono,monospace';
      ctx.fillText(distTxt, wx, sy + 36);

      // Pulse ring if inside
      if (isInside) {
        var pulse = 0.35 + 0.3 * Math.sin(Date.now() / 300);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(wx - zoneW/2 - 4, roadTop - 4, zoneW + 8, roadH + 8, 4);
        else ctx.rect(wx - zoneW/2 - 4, roadTop - 4, zoneW + 8, roadH + 8);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });

    ctx.restore(); // end world pan

    // ── TRUCK (fixed in viewport, world moves under it) ──
    // Truck screen X = world X + pan
    var tx = RoadMap._truckX + pan;
    var ty = roadY - 10;

    ctx.save();
    ctx.translate(tx, 0);
    ctx.scale(dir, 1);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(0, ty + 18, 28, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-26, ty - 10, 36, 20, 3);
    else ctx.rect(-26, ty - 10, 36, 20);
    ctx.fill();
    ctx.strokeStyle = '#1e40af'; ctx.lineWidth = 1; ctx.stroke();

    // Stripes
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (var s = 0; s < 3; s++) ctx.fillRect(-22 + s * 10, ty - 8, 2, 16);

    // Cab
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(10, ty - 14, 18, 22, 4);
    else ctx.rect(10, ty - 14, 18, 22);
    ctx.fill();

    // Windshield
    ctx.fillStyle = '#93c5fd'; ctx.globalAlpha = 0.9;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(12, ty - 12, 14, 10, 2);
    else ctx.rect(12, ty - 12, 14, 10);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Headlight
    ctx.fillStyle = '#fef08a';
    ctx.beginPath(); ctx.ellipse(27, ty + 3, 3, 4, 0, 0, Math.PI * 2); ctx.fill();

    // Wheels
    var wRot = (Date.now() / 80) * dir;
    [[-16, ty + 12], [16, ty + 12]].forEach(function(w) {
      ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(w[0], w[1], 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6b7280'; ctx.beginPath(); ctx.arc(w[0], w[1], 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w[0] + Math.cos(wRot) * 4, w[1] + Math.sin(wRot) * 4);
      ctx.lineTo(w[0] - Math.cos(wRot) * 4, w[1] - Math.sin(wRot) * 4);
      ctx.stroke();
    });

    // Exhaust
    var pa = 0.25 + 0.2 * Math.sin(Date.now() / 200);
    ctx.fillStyle = 'rgba(156,163,175,' + pa + ')';
    ctx.beginPath(); ctx.arc(-30, ty - 6, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-38, ty - 10, 3.5, 0, Math.PI * 2); ctx.fill();

    ctx.restore();

    // Direction arrow
    ctx.fillStyle = dir === 1 ? '#10b981' : '#ef4444';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(dir === 1 ? '▶' : '◀', tx, ty - 28);

    // Price pill position — follow truck screen X
    var pill = document.getElementById('road-price-pill');
    if (pill) {
      var pillLeft = Math.max(10, Math.min(tx - 50, W - 120));
      pill.style.left  = pillLeft + 'px';
      pill.style.top   = (roadTop - 54) + 'px';
    }
    var priceVal = document.getElementById('road-price-val');
    if (priceVal) priceVal.textContent = RoadMap._price.toFixed(RoadMap._decimals);

    // Minimap — show where we are in world
    var mmW = 80, mmH = 6;
    var mmX = W/2 - mmW/2, mmY = H - 14;
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(mmX, mmY, mmW, mmH, 3);
    else ctx.rect(mmX, mmY, mmW, mmH);
    ctx.fill();
    // Viewport indicator
    var vpRatio = W / WORLD_W;
    var vpX = mmX + (-pan / WORLD_W) * mmW;
    var vpW = vpRatio * mmW;
    ctx.fillStyle = 'rgba(59,130,246,0.6)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(Math.max(mmX, vpX), mmY, Math.min(vpW, mmW), mmH, 3);
    else ctx.rect(Math.max(mmX, vpX), mmY, Math.min(vpW, mmW), mmH);
    ctx.fill();

    RoadMap._animFrame = requestAnimationFrame(RoadMap._tick);
  },

  stop() {
    if (RoadMap._animFrame) {
      cancelAnimationFrame(RoadMap._animFrame);
      RoadMap._animFrame = null;
    }
    RoadMap._initialized = false;
    RoadMap._clouds = [];
    RoadMap._priceHistory = [];
    RoadMap._dashOffset = 0;
    RoadMap._panOffset = 0;
    RoadMap._isDragging = false;
  }
};
