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
    RoadMap.stop();
  },

  async _fetchAll(pair) {
    var prices = await DB.getAllLivePrices(pair);
    // Clear old prices for this pair first
    Object.keys(Live._prices).forEach(function(k) {
      if (k.startsWith(pair + '_')) delete Live._prices[k];
    });
    prices.forEach(function(p) {
      Live._prices[pair + '_' + p.tf] = Object.assign({}, p, { pair: pair });
    });
    Live._updatePriceDisplay(pair);
    // Update truck position if road map is active
    var p1m = Live.getPrice(pair, '1m');
    if (p1m && p1m.price) RoadMap.updatePrice(safeFloat(p1m.price));
    Live._updateZoneMap(pair);
    Live._loadPendingZones(pair);
  },

  getPrice(pair, tf) {
    return this._prices[pair + '_' + tf] || null;
  },

  // ── Update price badge in TF headers ──
  _updatePriceDisplay(pair) {
    var tfs = ['weekly', 'daily', 'h4', '1h', '1m'];

    // Show 1m price in pair header — only if it matches current pair
    var p1m = Live.getPrice(pair, '1m');
    // Verify price belongs to this pair
    if (p1m && p1m.pair && p1m.pair !== pair) p1m = null;
    var headerEl = document.getElementById('pair-live-price');
    if (headerEl) {
      if (p1m && p1m.price) {
        var age1m = Math.floor((Date.now() - p1m.ts) / 1000);
        var fresh1m = age1m < 120;
        headerEl.innerHTML =
          '<span class="live-price-val ' + (fresh1m ? 'fresh' : 'stale') + '">' +
            parseFloat(p1m.price).toFixed(p1m.price > 100 ? 2 : 5) +
          '</span>' +
          '<span class="price-age">' + Live._fmtAge(age1m) + ' · 1M</span>';
        headerEl.style.display = 'flex';
      } else {
        headerEl.innerHTML = '<span class="live-price-val stale">No live data</span>';
        headerEl.style.display = 'flex';
      }
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

    RoadMap.render(mapEl, allZones, currentPrice, pObj, pipSize);
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
