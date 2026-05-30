// ── Notifications Module ──
// Global bell with pending zones across all pairs

const Notifications = {

  _pending: [],
  _interval: null,
  _open: false,

  init() {
    this.poll();
    this._interval = setInterval(function() {
      Notifications.poll();
    }, 30000); // every 30s

    // Close panel on outside click
    document.addEventListener('click', function(e) {
      if (!e.target.closest('#notif-bell-wrap') && Notifications._open) {
        Notifications.closePanel();
      }
    });
  },

  async poll() {
    var all = [];
    for (var i = 0; i < TRADING_PAIRS.length; i++) {
      var pair = TRADING_PAIRS[i].value;
      var zones = await DB.getPendingZones(pair);
      zones.forEach(function(z) { z._pairLabel = TRADING_PAIRS[i].label; });
      all = all.concat(zones);
    }
    this._pending = all;
    this.updateBell();
  },

  updateBell() {
    var badge = document.getElementById('notif-badge');
    var count = this._pending.length;
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 9 ? '9+' : count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  },

  togglePanel() {
    if (this._open) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  },

  openPanel() {
    this._open = true;
    var panel = document.getElementById('notif-panel');
    panel.classList.remove('hidden');
    this.renderPanel();
  },

  closePanel() {
    this._open = false;
    var panel = document.getElementById('notif-panel');
    panel.classList.add('hidden');
  },

  renderPanel() {
    var panel = document.getElementById('notif-panel');
    var pending = this._pending;

    if (pending.length === 0) {
      panel.innerHTML =
        '<div class="notif-header">' +
          '<span class="notif-title">🔔 Notifications</span>' +
          '<button class="notif-close" id="notif-close-btn">✕</button>' +
        '</div>' +
        '<div class="notif-empty">No pending zones</div>';
      document.getElementById('notif-close-btn').addEventListener('click', function() {
        Notifications.closePanel();
      });
      return;
    }

    var items = pending.map(function(pz) {
      var dirCls  = pz.direction === 'bull' ? 'map-bull' : 'map-bear';
      var dirIcon = pz.direction === 'bull' ? '▲' : '▼';
      var tf      = (pz.timeframe || '').toUpperCase();
      var top     = parseFloat(pz.top || 0).toFixed(pz.top > 100 ? 2 : 5);
      var btm     = parseFloat(pz.btm || 0).toFixed(pz.btm > 100 ? 2 : 5);
      var timeAgo = Notifications._timeAgo(pz.created_at);

      return '<div class="notif-item" data-id="' + pz.id + '">' +
        '<div class="notif-item-top">' +
          '<div class="notif-item-left">' +
            '<span class="notif-pair">' + pz.pair + '</span>' +
            '<span class="notif-tf">' + tf + '</span>' +
            '<span class="' + dirCls + '" style="font-weight:700; font-size:12px;">' + dirIcon + ' ' + (pz.direction === 'bull' ? 'Bull' : 'Bear') + '</span>' +
          '</div>' +
          '<span class="notif-time">' + timeAgo + '</span>' +
        '</div>' +
        '<div class="notif-item-prices">T: ' + top + ' · B: ' + btm + '</div>' +
        '<div class="notif-item-actions">' +
          '<button class="btn-validate notif-validate" ' +
            'data-id="' + pz.id + '" ' +
            'data-pair="' + pz.pair + '" ' +
            'data-tf="' + pz.timeframe + '" ' +
            'data-dir="' + pz.direction + '" ' +
            'data-top="' + pz.top + '" ' +
            'data-btm="' + pz.btm + '">' +
            '✓ Validate & Name' +
          '</button>' +
          '<button class="btn-dismiss notif-dismiss" data-id="' + pz.id + '" data-pair="' + pz.pair + '">✕ Dismiss</button>' +
        '</div>' +
      '</div>';
    }).join('');

    panel.innerHTML =
      '<div class="notif-header">' +
        '<span class="notif-title">🔔 New Zones <span class="notif-count">' + pending.length + '</span></span>' +
        '<button class="notif-close" id="notif-close-btn">✕</button>' +
      '</div>' +
      '<div class="notif-list">' + items + '</div>';

    document.getElementById('notif-close-btn').addEventListener('click', function() {
      Notifications.closePanel();
    });

    // Validate buttons
    panel.querySelectorAll('.notif-validate').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        Notifications.closePanel();
        Live.openValidateModal(btn.dataset);
      });
    });

    // Dismiss buttons
    panel.querySelectorAll('.notif-dismiss').forEach(function(btn) {
      btn.addEventListener('click', async function(e) {
        e.stopPropagation();
        await DB.dismissPendingZone(btn.dataset.id);
        // Remove from local list
        Notifications._pending = Notifications._pending.filter(function(p) {
          return p.id !== btn.dataset.id;
        });
        Notifications.updateBell();
        Notifications.renderPanel();
        // Refresh pending in pair view if visible
        var pair = btn.dataset.pair;
        if (pair) Live._loadPendingZones(pair);
      });
    });
  },

  _timeAgo(isoStr) {
    if (!isoStr) return '';
    var secs = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
    if (secs < 60)   return secs + 's ago';
    if (secs < 3600) return Math.floor(secs / 60) + 'm ago';
    if (secs < 86400) return Math.floor(secs / 3600) + 'h ago';
    return Math.floor(secs / 86400) + 'd ago';
  },
};
