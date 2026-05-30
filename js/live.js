// ── Live Price & Zone Map Module ──

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
    var tfs = ['weekly', 'daily', '4h', '1h', '1m'];

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

    // Get current price — prefer 4h
    var pObj = Live.getPrice(pair, '1m') || Live.getPrice(pair, '4h') || Live.getPrice(pair, 'daily') || Live.getPrice(pair, '1h');
    if (!pObj || !pObj.price) {
      mapEl.innerHTML = '<div class="map-no-price">⏳ Waiting for live price...</div>';
      return;
    }

    var currentPrice = parseFloat(pObj.price);
    var isJPY = pair.includes('JPY');
    var pipSize = isJPY ? 0.01 : 0.0001;

    // Gather all zones from cache
    var allZones = [];
    ['weekly', 'daily', '4h'].forEach(function(tf) {
      var el = document.getElementById('zones-' + tf);
      if (!el || !el.dataset.cache) return;
      var zones = JSON.parse(el.dataset.cache);
      zones.forEach(function(z) {
        if (z.status === 'broken') return;
        if (!z.price_top && !z.price_btm) return;
        var top = parseFloat(z.price_top || 0);
        var btm = parseFloat(z.price_btm || 0);
        var mid = (top + btm) / 2 || top || btm;
        var distPips = Math.abs(currentPrice - mid) / pipSize;
        var inside = currentPrice >= btm && currentPrice <= top;
        allZones.push({
          zone: z, tf: z.timeframe,
          top, btm, mid, distPips, inside,
        });
      });
    });

    if (allZones.length === 0) {
      mapEl.innerHTML = '<div class="map-no-price" style="font-size:12px;">Add price levels to zones to see the map</div>';
      return;
    }

    // Sort by distance
    allZones.sort(function(a, b) { return a.distPips - b.distPips; });

    var rows = allZones.map(function(item) {
      var z = item.zone;
      var cls = z.direction === 'bull' ? 'map-bull' : 'map-bear';
      var statusCls = 'tag-' + z.status;
      var distLabel = item.inside
        ? '<span class="map-inside">● INSIDE</span>'
        : item.distPips.toFixed(1) + ' pips';
      var bar = Math.min(100, 100 - Math.min(item.distPips / 200 * 100, 100));

      return '<div class="map-row ' + (item.inside ? 'map-row-inside' : '') + '">' +
        '<div class="map-row-left">' +
          '<span class="map-dir ' + cls + '">' + (z.direction === 'bull' ? '▲' : '▼') + '</span>' +
          '<span class="map-name">' + z.name + '</span>' +
          '<span class="map-tf">' + item.tf.toUpperCase() + '</span>' +
          '<span class="zone-tag ' + statusCls + '" style="font-size:9px;">' + z.status + '</span>' +
        '</div>' +
        '<div class="map-row-right">' +
          '<div class="map-bar-wrap"><div class="map-bar ' + cls + '" style="width:' + bar + '%"></div></div>' +
          '<span class="map-dist ' + (item.inside ? 'inside' : '') + '">' + distLabel + '</span>' +
        '</div>' +
        '<div class="map-prices">' +
          (item.top ? 'T: ' + item.top.toFixed(5) : '') +
          (item.top && item.btm ? ' · ' : '') +
          (item.btm ? 'B: ' + item.btm.toFixed(5) : '') +
        '</div>' +
      '</div>';
    }).join('');

    var priceBar = '<div class="map-current-price">' +
      '📍 Current Price: <strong>' + currentPrice.toFixed(5) + '</strong>' +
      '<span class="map-price-tf">(' + (pObj.tf || '').toUpperCase() + ')</span>' +
    '</div>';

    mapEl.innerHTML = priceBar + '<div class="map-list">' + rows + '</div>';
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
