// ── Zone Analysis Module ──
// Sessions with date + multiple text/chart entries per session

const ZoneAnalysis = {

  async loadAnalyses(zoneId) {
    var list = document.getElementById('analysis-list-' + zoneId);
    if (!list) return;
    list.innerHTML = '<div class="loader">Loading...</div>';

    var { data, error } = await db
      .from('zone_analyses')
      .select('*')
      .eq('zone_id', zoneId)
      .order('session_date', { ascending: false })
      .order('created_at',   { ascending: false });

    if (error) { console.error(error); return; }
    if (!data || data.length === 0) {
      list.innerHTML = '<div class="loader" style="padding:10px 0; font-size:11px;">No analysis logged yet</div>';
      return;
    }

    // Group by session_date
    var sessions = {};
    var order = [];
    data.forEach(function(item) {
      var key = item.session_date || item.created_at.slice(0,10);
      if (!sessions[key]) { sessions[key] = []; order.push(key); }
      sessions[key].push(item);
    });

    list.innerHTML = '';

    // Share All button
    var shareBtn = document.createElement('button');
    shareBtn.className = 'btn btn-discord btn-sm';
    shareBtn.style.cssText = 'margin-bottom:12px; font-size:11px; padding:5px 12px;';
    shareBtn.textContent = '🔗 Share All';
    shareBtn.addEventListener('click', function() { ZoneAnalysis.shareAllToDiscord(data); });
    list.appendChild(shareBtn);

    // Render sessions
    order.forEach(function(dateKey) {
      var items = sessions[dateKey];
      var dateLabel = new Date(dateKey + 'T00:00:00').toLocaleDateString('en-GB', {
        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
      });

      var session = document.createElement('div');
      session.className = 'za-session';
      session.innerHTML =
        '<div class="za-session-header">' +
          '<span class="za-session-date">📅 ' + dateLabel + '</span>' +
          '<button class="btn-icon za-session-discord" title="Share this session">🔗</button>' +
        '</div>' +
        '<div class="za-session-entries" id="za-entries-' + dateKey.replace(/-/g,'') + zoneId + '"></div>';

      var entriesEl = session.querySelector('.za-session-entries');
      items.forEach(function(item) {
        entriesEl.appendChild(ZoneAnalysis.buildEntry(item, zoneId));
      });

      session.querySelector('.za-session-discord').addEventListener('click', function() {
        ZoneAnalysis.shareSessionToDiscord(items, dateLabel);
      });

      list.appendChild(session);
    });
  },

  buildEntry(item, zoneId) {
    var el = document.createElement('div');
    el.className = 'za-entry';

    var ts = new Date(item.created_at).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });

    el.innerHTML =
      '<div class="za-entry-header">' +
        '<span class="za-entry-time">' + ts + '</span>' +
        '<button class="btn-icon del za-del" title="Delete entry">✕</button>' +
      '</div>' +
      (item.text ? '<div class="za-text">' + ZoneAnalysis._escape(item.text) + '</div>' : '') +
      (item.image_url ? '<img class="comment-img za-img" src="' + item.image_url + '" loading="lazy" />' : '');

    el.querySelector('.za-del').addEventListener('click', async function() {
      if (!confirm('Delete this entry?')) return;
      await db.from('zone_analyses').delete().eq('id', item.id);
      ZoneAnalysis.loadAnalyses(zoneId);
    });

    var img = el.querySelector('.za-img');
    if (img) img.addEventListener('click', function() {
      var lb = document.createElement('div');
      lb.className = 'lightbox';
      lb.innerHTML = '<img src="' + item.image_url + '" />';
      lb.addEventListener('click', function() { lb.remove(); });
      document.body.appendChild(lb);
    });

    return el;
  },

  openModal(zoneId) {
    var modal   = document.getElementById('comment-modal');
    var overlay = document.getElementById('modal-overlay');

    // Build initial state: 1 session with 1 entry
    var sessions = [{ date: new Date().toISOString().slice(0,10), entries: [{ text: '', url: '' }] }];

    function renderModal() {
      modal.innerHTML =
        '<div class="modal-header">' +
          '<span class="modal-title">📋 Log Zone Analysis</span>' +
          '<button class="modal-close" id="za-close">✕</button>' +
        '</div>' +
        '<div class="modal-body" id="za-modal-body">' +
          renderSessions() +
          '<button class="za-add-session" id="za-add-session">+ Add Session</button>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn btn-secondary" id="za-cancel">Cancel</button>' +
          '<button class="btn btn-primary" id="za-save">💾 Save All</button>' +
        '</div>';

      wireEvents();
    }

    function renderSessions() {
      return sessions.map(function(session, si) {
        var entries = session.entries.map(function(entry, ei) {
          return '<div class="za-modal-entry" data-si="' + si + '" data-ei="' + ei + '">' +
            '<textarea class="form-textarea za-entry-text" placeholder="Analysis text..." style="min-height:80px;">' + (entry.text || '') + '</textarea>' +
            '<input class="form-input za-entry-url" placeholder="TradingView URL (optional)" value="' + (entry.url || '') + '" />' +
            (entry.url ? '<div class="za-url-preview-wrap"><img class="upload-preview za-url-preview" src="' + entry.url + '" style="display:block; max-height:120px;" /></div>' : '') +
            '<div class="za-entry-actions">' +
              (session.entries.length > 1 ? '<button class="btn-icon del za-remove-entry" data-si="' + si + '" data-ei="' + ei + '">✕ Remove</button>' : '') +
            '</div>' +
          '</div>';
        }).join('<div class="za-entry-divider"></div>');

        return '<div class="za-modal-session" data-si="' + si + '">' +
          '<div class="za-modal-session-header">' +
            '<label class="form-label">📅 Session Date</label>' +
            (sessions.length > 1 ? '<button class="btn-icon del za-remove-session" data-si="' + si + '">✕ Remove session</button>' : '') +
          '</div>' +
          '<input class="form-input za-session-date" type="date" value="' + session.date + '" data-si="' + si + '" style="margin-bottom:10px;" />' +
          entries +
          '<button class="za-add-entry" data-si="' + si + '">+ Add entry</button>' +
        '</div>';
      }).join('<div class="za-session-divider"></div>');
    }

    function wireEvents() {
      var close = function() { modal.classList.add('hidden'); overlay.classList.add('hidden'); };
      modal.querySelector('#za-close').addEventListener('click', close);
      modal.querySelector('#za-cancel').addEventListener('click', close);
      overlay.addEventListener('click', close, { once: true });

      // Sync text inputs to state
      modal.querySelectorAll('.za-entry-text').forEach(function(el) {
        var si = parseInt(el.closest('.za-modal-entry').dataset.si);
        var ei = parseInt(el.closest('.za-modal-entry').dataset.ei);
        el.addEventListener('input', function() { sessions[si].entries[ei].text = el.value; });
      });

      modal.querySelectorAll('.za-entry-url').forEach(function(el) {
        var si = parseInt(el.closest('.za-modal-entry').dataset.si);
        var ei = parseInt(el.closest('.za-modal-entry').dataset.ei);
        el.addEventListener('input', function() {
          sessions[si].entries[ei].url = el.value.trim();
          // Live preview
          var wrap = el.nextElementSibling;
          if (wrap && wrap.classList.contains('za-url-preview-wrap')) {
            wrap.querySelector('img').src = el.value.trim();
          } else if (el.value.trim()) {
            var preview = document.createElement('div');
            preview.className = 'za-url-preview-wrap';
            preview.innerHTML = '<img class="upload-preview za-url-preview" src="' + el.value.trim() + '" style="display:block; max-height:120px;" />';
            el.insertAdjacentElement('afterend', preview);
          }
        });
      });

      modal.querySelectorAll('.za-session-date').forEach(function(el) {
        var si = parseInt(el.dataset.si);
        el.addEventListener('change', function() { sessions[si].date = el.value; });
      });

      // Add entry
      modal.querySelectorAll('.za-add-entry').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var si = parseInt(btn.dataset.si);
          sessions[si].entries.push({ text: '', url: '' });
          document.getElementById('za-modal-body').innerHTML = renderSessions() + '<button class="za-add-session" id="za-add-session">+ Add Session</button>';
          wireEvents();
        });
      });

      // Remove entry
      modal.querySelectorAll('.za-remove-entry').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var si = parseInt(btn.dataset.si);
          var ei = parseInt(btn.dataset.ei);
          sessions[si].entries.splice(ei, 1);
          document.getElementById('za-modal-body').innerHTML = renderSessions() + '<button class="za-add-session" id="za-add-session">+ Add Session</button>';
          wireEvents();
        });
      });

      // Add session
      document.getElementById('za-add-session').addEventListener('click', function() {
        sessions.push({ date: new Date().toISOString().slice(0,10), entries: [{ text: '', url: '' }] });
        document.getElementById('za-modal-body').innerHTML = renderSessions() + '<button class="za-add-session" id="za-add-session">+ Add Session</button>';
        wireEvents();
      });

      // Remove session
      modal.querySelectorAll('.za-remove-session').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var si = parseInt(btn.dataset.si);
          sessions.splice(si, 1);
          document.getElementById('za-modal-body').innerHTML = renderSessions() + '<button class="za-add-session" id="za-add-session">+ Add Session</button>';
          wireEvents();
        });
      });

      // Save
      modal.querySelector('#za-save').addEventListener('click', async function() {
        var toInsert = [];
        sessions.forEach(function(session) {
          session.entries.forEach(function(entry) {
            if (!entry.text && !entry.url) return;
            toInsert.push({
              zone_id:      zoneId,
              session_date: session.date,
              text:         entry.text || null,
              image_url:    entry.url  || null,
            });
          });
        });

        if (toInsert.length === 0) { alert('Please add at least one text or image.'); return; }

        var btn = modal.querySelector('#za-save');
        btn.textContent = 'Saving...'; btn.disabled = true;

        var { error } = await db.from('zone_analyses').insert(toInsert);
        if (!error) {
          close();
          ZoneAnalysis.loadAnalyses(zoneId);
        } else {
          console.error(error);
          btn.textContent = '💾 Save All'; btn.disabled = false;
          alert('Error saving. Check console.');
        }
      });
    }

    renderModal();
    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
  },

  shareSessionToDiscord(items, dateLabel) {
    var lines = ['# 📋 Zone Analysis — ' + dateLabel, ''];
    items.forEach(function(item, i) {
      if (i > 0) lines.push('──────────────');
      if (item.text) {
        item.text.split('\n').forEach(function(l) {
          l = l.trim();
          if (!l) lines.push('');
          else if (l.startsWith('-') || l.startsWith('•')) lines.push('> ' + l);
          else lines.push(l);
        });
      }
      if (item.image_url) { lines.push(''); lines.push(item.image_url); }
      lines.push('');
    });
    lines.push('🚗 *The Delivery Man — Zone Analysis*');
    ZoneAnalysis._openDiscordModal(lines.join('\n'));
  },

  shareAllToDiscord(data) {
    var sessions = {};
    var order = [];
    data.forEach(function(item) {
      var key = item.session_date || item.created_at.slice(0,10);
      if (!sessions[key]) { sessions[key] = []; order.push(key); }
      sessions[key].push(item);
    });

    var lines = ['# 📋 Zone Analysis — Full Log', ''];
    order.forEach(function(key) {
      var dateLabel = new Date(key + 'T00:00:00').toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
      lines.push('═══════════════════════');
      lines.push('📅 **' + dateLabel + '**');
      lines.push('═══════════════════════');
      lines.push('');
      sessions[key].forEach(function(item, i) {
        if (i > 0) lines.push('──────────────');
        if (item.text) {
          item.text.split('\n').forEach(function(l) {
            l = l.trim();
            if (!l) lines.push('');
            else if (l.startsWith('-') || l.startsWith('•')) lines.push('> ' + l);
            else lines.push(l);
          });
        }
        if (item.image_url) { lines.push(''); lines.push(item.image_url); }
        lines.push('');
      });
    });
    lines.push('🚗 *The Delivery Man — Zone Analysis Log*');
    ZoneAnalysis._openDiscordModal(lines.join('\n'));
  },

  _openDiscordModal(text) {
    var modal   = document.getElementById('comment-modal');
    var overlay = document.getElementById('modal-overlay');
    var escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    modal.innerHTML =
      '<div class="modal-header"><span class="modal-title">🔗 Share — Discord</span>' +
        '<button class="modal-close" id="zad-close">✕</button></div>' +
      '<div class="modal-body">' +
        '<div class="discord-preview-label"><span class="form-label">Ready to Copy</span><span class="discord-hint">Images auto-embed</span></div>' +
        '<div class="discord-preview">' + escaped + '</div>' +
        '<div class="discord-char-count">' + text.length + ' / 2000 chars</div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" id="zad-close2">Close</button>' +
        '<button class="btn btn-discord" id="zad-copy">📋 Copy</button>' +
      '</div>';

    var close = function() { modal.classList.add('hidden'); overlay.classList.add('hidden'); };
    modal.querySelector('#zad-close').addEventListener('click', close);
    modal.querySelector('#zad-close2').addEventListener('click', close);
    overlay.addEventListener('click', close, { once: true });
    modal.querySelector('#zad-copy').addEventListener('click', async function() {
      try { await navigator.clipboard.writeText(text); }
      catch(e) { var ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
      var btn = modal.querySelector('#zad-copy');
      btn.textContent='✅ Copied!'; btn.style.background='#059669';
      setTimeout(function(){ btn.textContent='📋 Copy'; btn.style.background=''; }, 2000);
    });
    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
  },

  _escape(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  }
};
