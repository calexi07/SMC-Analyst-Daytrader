// ── Live Price & Zone Map Module ──

// Safe parse: handles both "73038.62" and "73038,62"
function safeFloat(val) {
  if (val === null || val === undefined || val === '') return null;
  var str = String(val).replace(',', '.');
  var n = parseFloat(str);
  return isNaN(n) ? null : n;
}

const Live = {

  _intervals: {},
  _prices: {},

  // ── Start polling for a pair ──
  startPolling(pair) {
    this.stopPolling(pair);
    this._fetchAll(pair);
    this._intervals[pair] = setInterval(function() {
      Live._fetchAll(pair);
    }, 10000); // every 10s
  },

  stopPolling(pair) {
    if (this._intervals[pair]) {
      clearInterval(this._intervals[pair]);
      delete this._intervals[pair];
    }
  },

  async _fetchAll(pair) {
    var prices = await DB.getAllLivePrices(pair);
    prices.forEach(function(p) {
      Live._prices[pair + '_' + p.tf] = p;
    });
    Live._updatePriceDisplay(pair);
    Live._updateZoneMap(pair);
    Live._loadPendingZones(pair);
  },

  getPrice(pair, tf) {
    return this._prices[pair + '_' + tf] || null;
  },

  // ── Update price badge in TF headers ──
  _updatePriceDisplay(pair) {
    var tfs = ['weekly', 'daily', 'h4', '1h', '1m'];

    // Show 1m price in pair header
    var p1m = Live.getPrice(pair, '1m');
    var headerEl = document.getElementById('pair-live-price');
    if (headerEl && p1m && p1m.price) {
      var age1m = Math.floor((Date.now() - p1m.ts) / 1000);
      var fresh1m = age1m < 120;
      headerEl.innerHTML =
        '<span class="live-price-val ' + (fresh1m ? 'fresh' : 'stale') + '">' +
          parseFloat(p1m.price).toFixed(p1m.price > 100 ? 2 : 5) +
        '</span>' +
        '<span class="price-age">' + Live._fmtAge(age1m) + ' · 1M</span>';
      headerEl.style.display = 'flex';
    }

    tfs.forEach(function(tf) {
      var p = Live.getPrice(pair, tf);
      var el = document.getElementById('price-badge-' + tf);
      if (!el) return;
      if (p && p.price) {
        var age = Math.floor((Date.now() - p.ts) / 1000);
        var fresh = age < 120;
        el.innerHTML =
          '<span class="price-val ' + (fresh ? 'fresh' : 'stale') + '">' +
            parseFloat(p.price).toFixed(p.price > 100 ? 2 : 5) +
          '</span>' +
          '<span class="price-age">' + Live._fmtAge(age) + '</span>';
        el.style.display = 'flex';
      }
    });
  },

  _fmtAge(secs) {
    if (secs < 60)  return secs + 's ago';
    if (secs < 3600) return Math.floor(secs/60) + 'm ago';
    return Math.floor(secs/3600) + 'h ago';
  },

  // ── Zone Map: show distance of current price to each zone ──
  async _updateZoneMap(pair) {
    var mapEl = document.getElementById('zone-map-' + pair);
    if (!mapEl) return;

    // Get current price — prefer 1m then others
    var pObj = Live.getPrice(pair, '1m') || Live.getPrice(pair, 'h4') || Live.getPrice(pair, 'daily') || Live.getPrice(pair, '1h');
    if (!pObj || !pObj.price) {
      mapEl.innerHTML = '<div class="map-no-price">⏳ Waiting for live price...</div>';
      return;
    }

    var currentPrice = safeFloat(pObj.price);
    var isJPY = pair.includes('JPY');
    var isCrypto = currentPrice > 1000;
    var pipSize = isJPY ? 0.01 : isCrypto ? 1 : 0.0001;

    // Fetch zones directly from DB (don't rely on cache)
    var allZones = [];
    var tfs = ['weekly', 'daily', 'h4'];
    for (var i = 0; i < tfs.length; i++) {
      var tf = tfs[i];
      var zones = await DB.getZones(pair, tf);
      console.log('Zone map fetch', tf, zones.length, 'zones');
      zones.forEach(function(z) {
        if (z.status === 'broken') return;
        var top = safeFloat(z.price_top);
        var btm = safeFloat(z.price_btm);
        console.log('Zone:', z.name, 'top:', top, 'btm:', btm);
        if (!top && !btm) return;
        // Auto-correct if top/btm are swapped
        if (top && btm && top < btm) { var tmp = top; top = btm; btm = tmp; }
        var mid = (top && btm) ? (top + btm) / 2 : (top || btm);
        var distPips = Math.abs(currentPrice - mid) / pipSize;
        var inside = btm && top ? (currentPrice >= btm && currentPrice <= top) : false;
        allZones.push({ zone: z, tf: tf, top: top, btm: btm, mid: mid, distPips: distPips, inside: inside });
      });
    }
    console.log('Total zones with prices:', allZones.length);

    if (allZones.length === 0) {
      mapEl.innerHTML = '<div class="map-no-price" style="font-size:12px;">Add price levels to zones to see the map</div>';
      return;
    }

    // Sort by price (highest first = top of road)
    allZones.sort(function(a, b) { return b.mid - a.mid; });

    Live._renderRoadMap(mapEl, allZones, currentPrice, pObj, pipSize);
  },

  _renderRoadMap(mapEl, zones, currentPrice, pObj, pipSize) {
    var decimals = currentPrice > 100 ? 2 : 5;
    var allPrices = zones.map(function(z) { return z.mid; }).concat([currentPrice]);
    var maxP = Math.max.apply(null, allPrices) * 1.001;
    var minP = Math.min.apply(null, allPrices) * 0.999;
    var range = maxP - minP || 1;

    // Map price to Y position (higher price = lower Y = top of SVG)
    function priceToY(p, h) {
      return ((maxP - p) / range) * h;
    }

    var W = mapEl.offsetWidth || 600;
    var H = Math.max(300, zones.length * 90 + 100);
    var roadX = W / 2;
    var roadW = 48;
    var truckY = priceToY(currentPrice, H);

    // Build zone signs
    var signs = zones.map(function(item, i) {
      var z = item.zone;
      var y = priceToY(item.mid, H);
      var isBull = z.direction === 'bull';
      var isInside = item.inside;
      var side = i % 2 === 0 ? 'left' : 'right';
      var signX = side === 'left' ? roadX - roadW/2 - 20 : roadX + roadW/2 + 20;
      var signW = 130;
      var signH = 52;
      var signAnchorX = side === 'left' ? signX - signW : signX;
      var lineX2 = side === 'left' ? signX : signX;
      var lineX1 = side === 'left' ? signX - signW/2 : signX + signW/2;

      // Colors
      var zoneBg   = isInside ? '#fffbeb' : isBull ? '#ecfdf5' : '#fef2f2';
      var zoneBord = isInside ? '#f59e0b' : isBull ? '#059669' : '#dc2626';
      var zoneText = isInside ? '#92400e' : isBull ? '#065f46' : '#991b1b';
      var statusBg = z.status === 'fresh' ? '#d1fae5' : z.status === 'tested' ? '#fef3c7' : '#fee2e2';

      var distText = isInside ? '● IN ZONE' : item.distPips.toFixed(0) + ' pips';

      return '<g class="zone-sign" style="cursor:pointer;">' +
        // connector line
        '<line x1="' + lineX1 + '" y1="' + y + '" x2="' + (side==='left' ? roadX - roadW/2 : roadX + roadW/2) + '" y2="' + y + '" stroke="' + zoneBord + '" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.6"/>' +
        // zone band on road
        '<rect x="' + (roadX - roadW/2) + '" y="' + (y - 6) + '" width="' + roadW + '" height="12" fill="' + zoneBg + '" opacity="0.7" rx="2"/>' +
        // sign box
        '<rect x="' + signAnchorX + '" y="' + (y - signH/2) + '" width="' + signW + '" height="' + signH + '" rx="8" fill="' + zoneBg + '" stroke="' + zoneBord + '" stroke-width="' + (isInside ? 2 : 1.5) + '"/>' +
        // direction arrow
        '<text x="' + (signAnchorX + 10) + '" y="' + (y + 5) + '" font-size="13" fill="' + zoneBord + '">' + (isBull ? '▲' : '▼') + '</text>' +
        // city name
        '<text x="' + (signAnchorX + 26) + '" y="' + (y - 8) + '" font-size="11" font-weight="600" fill="' + zoneText + '" font-family="DM Sans,sans-serif">' + z.name + '</text>' +
        // TF + status
        '<text x="' + (signAnchorX + 26) + '" y="' + (y + 5) + '" font-size="9" fill="' + zoneText + '" font-family="DM Mono,monospace" opacity="0.8">' + (item.tf).toUpperCase() + ' · ' + z.status + '</text>' +
        // distance
        '<text x="' + (signAnchorX + 26) + '" y="' + (y + 17) + '" font-size="9" font-weight="700" fill="' + zoneBord + '" font-family="DM Mono,monospace">' + distText + '</text>' +
      '</g>';
    }).join('');

    // Truck SVG at current price
    var truckSVG =
      '<g transform="translate(' + roadX + ',' + truckY + ')">' +
        // glow
        '<ellipse cx="0" cy="0" rx="18" ry="8" fill="#3b82f6" opacity="0.15"/>' +
        // truck body
        '<rect x="-14" y="-10" width="28" height="16" rx="4" fill="#1d4ed8"/>' +
        // cab
        '<rect x="8" y="-14" width="12" height="14" rx="3" fill="#2563eb"/>' +
        // windshield
        '<rect x="10" y="-12" width="8" height="7" rx="1" fill="#93c5fd" opacity="0.8"/>' +
        // wheels
        '<circle cx="-8" cy="7" r="4" fill="#1e293b"/><circle cx="-8" cy="7" r="2" fill="#64748b"/>' +
        '<circle cx="10" cy="7" r="4" fill="#1e293b"/><circle cx="10" cy="7" r="2" fill="#64748b"/>' +
        // price label
        '<rect x="-38" y="-26" width="76" height="16" rx="4" fill="#1d4ed8"/>' +
        '<text x="0" y="-14" text-anchor="middle" font-size="10" font-weight="700" fill="white" font-family="DM Mono,monospace">📍 ' + currentPrice.toFixed(decimals) + '</text>' +
      '</g>';

    // Road markings
    var dashCount = Math.floor(H / 30);
    var dashes = '';
    for (var d = 0; d < dashCount; d++) {
      dashes += '<rect x="' + (roadX - 2) + '" y="' + (d * 30 + 5) + '" width="4" height="15" fill="white" opacity="0.6" rx="2"/>';
    }

    var svg =
      '<svg width="' + W + '" height="' + H + '" style="overflow:visible;">' +
        '<defs>' +
          '<linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#334155"/>' +
            '<stop offset="100%" stop-color="#1e293b"/>' +
          '</linearGradient>' +
        '</defs>' +
        // road surface
        '<rect x="' + (roadX - roadW/2) + '" y="0" width="' + roadW + '" height="' + H + '" fill="url(#roadGrad)" rx="4"/>' +
        // road edge lines
        '<line x1="' + (roadX - roadW/2) + '" y1="0" x2="' + (roadX - roadW/2) + '" y2="' + H + '" stroke="#f59e0b" stroke-width="2"/>' +
        '<line x1="' + (roadX + roadW/2) + '" y1="0" x2="' + (roadX + roadW/2) + '" y2="' + H + '" stroke="#f59e0b" stroke-width="2"/>' +
        // center dashes
        dashes +
        // zone signs
        signs +
        // truck
        truckSVG +
      '</svg>';

    mapEl.innerHTML = svg;
  },

  // ── Pending zones notification ──
  async _loadPendingZones(pair) {
    var el = document.getElementById('pending-zones-' + pair);
    if (!el) return;

    var pending = await DB.getPendingZones(pair);
    if (pending.length === 0) {
      el.innerHTML = '';
      el.style.display = 'none';
      return;
    }

    el.style.display = 'block';
    el.innerHTML =
      '<div class="pending-header">' +
        '<span class="pending-icon">🔔</span>' +
        '<span>New zones detected by indicator (' + pending.length + ')</span>' +
      '</div>' +
      pending.map(function(pz) {
        var dir = pz.direction === 'bull' ? '▲ Bull' : '▼ Bear';
        var dirCls = pz.direction === 'bull' ? 'map-bull' : 'map-bear';
        return '<div class="pending-row" data-id="' + pz.id + '">' +
          '<div class="pending-row-info">' +
            '<span class="map-dir ' + dirCls + '">' + dir + '</span>' +
            '<span class="pending-tf">' + pz.timeframe.toUpperCase() + '</span>' +
            '<span class="pending-prices">T: ' + parseFloat(pz.top).toFixed(5) + ' · B: ' + parseFloat(pz.btm).toFixed(5) + '</span>' +
          '</div>' +
          '<div class="pending-row-actions">' +
            '<button class="btn-validate" data-id="' + pz.id + '" data-pair="' + pair + '" data-tf="' + pz.timeframe + '" data-dir="' + pz.direction + '" data-top="' + pz.top + '" data-btm="' + pz.btm + '">✓ Validate</button>' +
            '<button class="btn-dismiss" data-id="' + pz.id + '">✕</button>' +
          '</div>' +
        '</div>';
      }).join('');

    // Validate button
    el.querySelectorAll('.btn-validate').forEach(function(btn) {
      btn.addEventListener('click', function() {
        Live.openValidateModal(btn.dataset);
      });
    });

    // Dismiss button
    el.querySelectorAll('.btn-dismiss').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        await DB.dismissPendingZone(btn.dataset.id);
        Live._loadPendingZones(pair);
      });
    });
  },

  // ── Validate modal: give zone a city name ──
  openValidateModal(data) {
    var modal   = document.getElementById('zone-modal');
    var overlay = document.getElementById('modal-overlay');
    var pair    = data.pair;
    var dir     = data.dir;
    var tf      = data.tf;
    var top     = parseFloat(data.top);
    var btm     = parseFloat(data.btm);

    // Get available cities
    var usedCities = Zones._getActiveCities ? Zones._getActiveCities(pair) : [];
    var available  = Cities.getAvailable(pair, dir, usedCities);
    var cityOpts   = available.map(function(c) {
      return '<option value="' + c + '">' + c + '</option>';
    }).join('');

    modal.innerHTML =
      '<div class="modal-header">' +
        '<span class="modal-title">✓ Validate Zone</span>' +
        '<button class="modal-close" id="vm-close">✕</button>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div class="validate-summary">' +
          '<div class="vs-row"><span class="vs-label">Pair</span><span class="vs-val">' + pair + '</span></div>' +
          '<div class="vs-row"><span class="vs-label">Timeframe</span><span class="vs-val">' + tf.toUpperCase() + '</span></div>' +
          '<div class="vs-row"><span class="vs-label">Direction</span><span class="vs-val ' + (dir==='bull'?'text-bull':'text-bear') + '">' + (dir==='bull'?'▲ Bullish':'▼ Bearish') + '</span></div>' +
          '<div class="vs-row"><span class="vs-label">Top</span><span class="vs-val mono">' + top.toFixed(5) + '</span></div>' +
          '<div class="vs-row"><span class="vs-label">Bottom</span><span class="vs-val mono">' + btm.toFixed(5) + '</span></div>' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">City Name</label>' +
          '<select class="form-select" id="vm-city">' + cityOpts + '</select>' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Status</label>' +
          '<select class="form-select" id="vm-status">' +
            '<option value="fresh">Fresh</option>' +
            '<option value="tested">Tested</option>' +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" id="vm-cancel">Cancel</button>' +
        '<button class="btn btn-primary" id="vm-save">✓ Add Zone</button>' +
      '</div>';

    var close = function() { modal.classList.add('hidden'); overlay.classList.add('hidden'); };
    modal.querySelector('#vm-close').addEventListener('click', close);
    modal.querySelector('#vm-cancel').addEventListener('click', close);
    overlay.addEventListener('click', close, { once: true });

    modal.querySelector('#vm-save').addEventListener('click', async function() {
      var name   = modal.querySelector('#vm-city').value;
      var status = modal.querySelector('#vm-status').value;
      if (!name) { alert('Please select a city name.'); return; }

      var btn = modal.querySelector('#vm-save');
      btn.textContent = 'Saving...'; btn.disabled = true;

      var zone = await DB.validatePendingZone(data.id, name, pair, tf, dir, top, btm);
      if (zone) {
        close();
        await Zones.loadZones(pair, tf);
        await Live._loadPendingZones(pair);
        await Live._updateZoneMap(pair);
      } else {
        btn.textContent = '✓ Add Zone'; btn.disabled = false;
        alert('Error saving zone.');
      }
    });

    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
  },
};
