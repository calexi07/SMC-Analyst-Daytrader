// ── Road Map — Horizontal Animated ──

const RoadMap = {

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

    // Price range
    var allPrices = zones.map(function(z) { return z.mid; }).concat([currentPrice]);
    var maxP = Math.max.apply(null, allPrices);
    var minP = Math.min.apply(null, allPrices);
    var pad  = (maxP - minP) * 0.3 || currentPrice * 0.002;
    maxP += pad; minP -= pad;
    var range = maxP - minP || 1;

    var roadY   = 180;   // center of road
    var roadH   = 54;
    var roadTop = roadY - roadH / 2;

    function priceToX(p) {
      return ((p - minP) / range) * (W - 80) + 40;
    }

    var truckTargetX = priceToX(currentPrice);

    // Init clouds + trees once
    if (!RoadMap._initialized || RoadMap._clouds.length === 0) {
      RoadMap._clouds = [];
      for (var i = 0; i < 5; i++) {
        RoadMap._clouds.push({ x: Math.random() * W, y: 20 + Math.random() * 40, r: 18 + Math.random() * 18, speed: 0.15 + Math.random() * 0.2 });
      }

      RoadMap._truckX  = truckTargetX;
      RoadMap._initialized = true;
    }
    RoadMap._targetX = truckTargetX;

    // Build canvas HTML
    mapEl.innerHTML =
      '<div class="road-wrap">' +
        '<canvas id="road-canvas" width="' + W + '" height="' + H + '"></canvas>' +
        '<div class="road-price-pill" id="road-price-pill">' +
          '<span class="road-price-live">LIVE</span>' +
          '<span class="road-price-val" id="road-price-val">' + currentPrice.toFixed(decimals) + '</span>' +
        '</div>' +
      '</div>';

    // Store zone data for canvas draw
    RoadMap._zones   = zones;
    RoadMap._W       = W;
    RoadMap._H       = H;
    RoadMap._roadY   = roadY;
    RoadMap._roadH   = roadH;
    RoadMap._roadTop = roadTop;
    RoadMap._minP    = minP;
    RoadMap._maxP    = maxP;
    RoadMap._range   = range;
    RoadMap._price   = currentPrice;
    RoadMap._decimals = decimals;
    RoadMap._pObj    = pObj;

    // Start animation loop
    if (RoadMap._animFrame) cancelAnimationFrame(RoadMap._animFrame);
    RoadMap._tick();
  },

  _tick() {
    var canvas = document.getElementById('road-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = RoadMap._W, H = RoadMap._H;
    var roadTop = RoadMap._roadTop, roadH = RoadMap._roadH, roadY = RoadMap._roadY;

    // Ease truck toward target
    RoadMap._truckX += (RoadMap._targetX - RoadMap._truckX) * 0.04;

    // Animate clouds
    RoadMap._clouds.forEach(function(c) { c.x -= c.speed; if (c.x < -60) c.x = W + 60; });

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Sky gradient
    var sky = ctx.createLinearGradient(0, 0, 0, roadTop);
    sky.addColorStop(0, '#bfdbfe');
    sky.addColorStop(1, '#dbeafe');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, roadTop);

    // Ground
    var ground = ctx.createLinearGradient(0, roadTop + roadH, 0, H);
    ground.addColorStop(0, '#86efac');
    ground.addColorStop(1, '#4ade80');
    ctx.fillStyle = ground;
    ctx.fillRect(0, roadTop + roadH, W, H - roadTop - roadH);

    // Clouds (cartoonish)
    RoadMap._clouds.forEach(function(c) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.arc(c.x + c.r * 0.7, c.y - c.r * 0.3, c.r * 0.7, 0, Math.PI * 2);
      ctx.arc(c.x - c.r * 0.7, c.y - c.r * 0.1, c.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    });



    // Road surface
    var roadGrad = ctx.createLinearGradient(0, roadTop, 0, roadTop + roadH);
    roadGrad.addColorStop(0, '#374151');
    roadGrad.addColorStop(1, '#1f2937');
    ctx.fillStyle = roadGrad;
    ctx.fillRect(0, roadTop, W, roadH);

    // Road edges (yellow lines)
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, roadTop + 3); ctx.lineTo(W, roadTop + 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, roadTop + roadH - 3); ctx.lineTo(W, roadTop + roadH - 3); ctx.stroke();

    // Center dashes (animated)
    var dashOffset = (Date.now() / 20) % 40;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 20]);
    ctx.lineDashOffset = dashOffset;
    ctx.beginPath(); ctx.moveTo(0, roadY); ctx.lineTo(W, roadY); ctx.stroke();
    ctx.setLineDash([]);

    // Zone markers on road
    RoadMap._zones.forEach(function(item) {
      var z = item.zone;
      var x = ((item.mid - RoadMap._minP) / RoadMap._range) * (W - 80) + 40;
      var isBull = z.direction === 'bull';
      var isInside = item.inside;
      var zoneColor = isInside ? '#f59e0b' : isBull ? '#10b981' : '#ef4444';

      // Zone band on road
      var zoneW = Math.max(30, Math.abs(item.top - item.btm) / RoadMap._range * (W - 80));
      ctx.fillStyle = zoneColor + '40';
      ctx.fillRect(x - zoneW/2, roadTop, zoneW, roadH);
      ctx.strokeStyle = zoneColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - zoneW/2, roadTop, zoneW, roadH);

      // Sign post
      var signY = isBull ? roadTop + roadH + 4 : roadTop - 4;
      var postDir = isBull ? 1 : -1;

      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, signY);
      ctx.lineTo(x, signY + postDir * 28);
      ctx.stroke();

      // Sign board
      var bx = x - 42, by = signY + postDir * 28 - (isBull ? 0 : 36);
      var bw = 84, bh = 36;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.roundRect(bx + 2, by + 2, bw, bh, 6);
      ctx.fill();

      // Board
      ctx.fillStyle = isInside ? '#fffbeb' : isBull ? '#ecfdf5' : '#fef2f2';
      ctx.strokeStyle = zoneColor;
      ctx.lineWidth = isInside ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 6);
      ctx.fill();
      ctx.stroke();

      // City name
      ctx.fillStyle = isInside ? '#92400e' : isBull ? '#065f46' : '#991b1b';
      ctx.font = 'bold 11px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(z.name, x, by + 13);

      // Distance
      var distTxt = isInside ? '● IN ZONE' : item.distPips.toFixed(0) + ' pips';
      ctx.fillStyle = zoneColor;
      ctx.font = '9px DM Mono, monospace';
      ctx.fillText(distTxt, x, by + 26);

      // Pulse if inside
      if (isInside) {
        var pulse = 0.4 + 0.3 * Math.sin(Date.now() / 300);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.roundRect(x - zoneW/2 - 3, roadTop - 3, zoneW + 6, roadH + 6, 4);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });

    // TRUCK
    var tx = RoadMap._truckX;
    var ty = roadY - 10;

    // Truck shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(tx, ty + 18, 28, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Truck body (cargo)
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.roundRect(tx - 26, ty - 10, 36, 20, 3);
    ctx.fill();
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Cargo stripes
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (var s = 0; s < 3; s++) {
      ctx.fillRect(tx - 22 + s * 10, ty - 8, 2, 16);
    }

    // Cab
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.roundRect(tx + 10, ty - 14, 18, 22, 4);
    ctx.fill();

    // Windshield
    ctx.fillStyle = '#93c5fd';
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.roundRect(tx + 12, ty - 12, 14, 10, 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Headlight
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(tx + 27, ty + 3, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wheels (with rotation animation)
    var wheelRot = Date.now() / 80;
    [[tx - 16, ty + 12], [tx + 16, ty + 12]].forEach(function(w) {
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(w[0], w[1], 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6b7280';
      ctx.beginPath();
      ctx.arc(w[0], w[1], 4, 0, Math.PI * 2);
      ctx.fill();
      // Spoke
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w[0] + Math.cos(wheelRot) * 4, w[1] + Math.sin(wheelRot) * 4);
      ctx.lineTo(w[0] - Math.cos(wheelRot) * 4, w[1] - Math.sin(wheelRot) * 4);
      ctx.stroke();
    });

    // Exhaust puff
    var puffAlpha = 0.3 + 0.2 * Math.sin(Date.now() / 200);
    ctx.fillStyle = 'rgba(156,163,175,' + puffAlpha + ')';
    ctx.beginPath();
    ctx.arc(tx - 30, ty - 6, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tx - 36, ty - 10, 3, 0, Math.PI * 2);
    ctx.fill();

    // Update price pill position
    var pill = document.getElementById('road-price-pill');
    var priceVal = document.getElementById('road-price-val');
    if (pill) {
      var pillLeft = Math.max(10, Math.min(tx - 50, W - 120));
      pill.style.left = pillLeft + 'px';
      pill.style.top  = (roadTop - 54) + 'px';
    }
    if (priceVal) {
      priceVal.textContent = RoadMap._price.toFixed(RoadMap._decimals);
    }

    RoadMap._animFrame = requestAnimationFrame(RoadMap._tick);
  },

  updatePrice(price) {
    RoadMap._price   = price;
    RoadMap._targetX = ((price - RoadMap._minP) / RoadMap._range) * (RoadMap._W - 80) + 40;
  },

  stop() {
    if (RoadMap._animFrame) {
      cancelAnimationFrame(RoadMap._animFrame);
      RoadMap._animFrame = null;
    }
    RoadMap._initialized = false;
    RoadMap._clouds = [];
    RoadMap._trees  = [];
  }
};
