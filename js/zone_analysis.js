// ── Zone Analysis Module ──
// Each session = one DB row with JSON content
// Can edit/delete entire session

const ZoneAnalysis = {

  async loadAnalyses(zoneId) {
    var list = document.getElementById('analysis-list-' + zoneId);
    if (!list) return;
    list.innerHTML = '<div class="loader">Loading...</div>';

    var { data, error } = await db
      .from('zone_analyses')
      .select('*')
      .eq('zone_id', zoneId)
      .order('session_date', { ascending: false });

    if (error) { console.error(error); return; }
    if (!data || data.length === 0) {
      list.innerHTML = '<div class="loader" style="padding:10px 0; font-size:11px;">No analysis logged yet</div>';
      return;
    }

    list.innerHTML = '';

    // Share All button
    var shareBtn = document.createElement('button');
    shareBtn.className = 'btn btn-discord btn-sm';
    shareBtn.style.cssText = 'margin-bottom:12px; font-size:11px; padding:5px 12px;';
    shareBtn.textContent = '🔗 Share All';
    shareBtn.addEventListener('click', function() { ZoneAnalysis.shareAllToDiscord(data); });
    list.appendChild(shareBtn);

    data.forEach(function(row) {
      list.appendChild(ZoneAnalysis.buildSession(row, zoneId));
    });
  },

  buildSession(row, zoneId) {
    var content = {};
    try { content = JSON.parse(row.text || '{}'); } catch(e) {}

    var dateLabel = row.session_date
      ? new Date(row.session_date + 'T00:00:00').toLocaleDateString('en-GB', {
          weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
        })
      : '—';

    var el = document.createElement('div');
    el.className = 'za-session';
    el.dataset.id = row.id;

    // Context image
    var contextHtml = content.context_url
      ? '<div class="za-context-entry"><div class="za-context-label">🖼 Context</div><img class="za-context-img" src="' + content.context_url + '" loading="lazy" /></div>'
      : '';

    // Entries
    var entriesHtml = '';
    if (content.entries && content.entries.length > 0) {
      content.entries.forEach(function(entry, i) {
        if (!entry.text && !entry.url) return;
        entriesHtml +=
          '<div class="za-entry">' +
            (entry.text ? '<div class="za-text">' + ZoneAnalysis._escape(entry.text) + '</div>' : '') +
            (entry.url  ? '<img class="comment-img za-img" src="' + entry.url + '" loading="lazy" />' : '') +
          '</div>';
      });
    }

    el.innerHTML =
      '<div class="za-session-header">' +
        '<span class="za-session-date">📅 ' + dateLabel + '</span>' +
        '<div style="display:flex;gap:5px;">' +
          '<button class="btn-icon za-session-discord" title="Share session" style="color:#5865F2;">🔗</button>' +
          '<button class="btn-icon za-session-edit" title="Edit session">✎</button>' +
          '<button class="btn-icon del za-session-del" title="Delete session">✕</button>' +
        '</div>' +
      '</div>' +
      '<div class="za-session-entries">' +
        contextHtml +
        (entriesHtml || '<div class="loader" style="padding:6px 0; font-size:11px;">No entries</div>') +
      '</div>';

    // Lightbox on images
    el.querySelectorAll('.za-context-img, .za-img').forEach(function(img) {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', function() {
        var lb = document.createElement('div');
        lb.className = 'lightbox';
        lb.innerHTML = '<img src="' + img.src + '" />';
        lb.addEventListener('click', function() { lb.remove(); });
        document.body.appendChild(lb);
      });
    });

    // Edit
    el.querySelector('.za-session-edit').addEventListener('click', function() {
      ZoneAnalysis.openModal(zoneId, row);
    });

    // Delete
    el.querySelector('.za-session-del').addEventListener('click', async function() {
      if (!confirm('Delete this entire session?')) return;
      await db.from('zone_analyses').delete().eq('id', row.id);
      ZoneAnalysis.loadAnalyses(zoneId);
    });

    // Discord share
    el.querySelector('.za-session-discord').addEventListener('click', function() {
      ZoneAnalysis.shareSessionToDiscord(content, dateLabel);
    });

    return el;
  },

  openModal(zoneId, existingRow) {
    var modal   = document.getElementById('comment-modal');
    var overlay = document.getElementById('modal-overlay');
    var isEdit  = !!existingRow;

    // Load existing content or start fresh
    var sessionDate = isEdit
      ? (existingRow.session_date || new Date().toISOString().slice(0,10))
      : new Date().toISOString().slice(0,10);

    var state = { context_url: '', entries: [{ text: '', url: '' }] };
    if (isEdit) {
      try { state = JSON.parse(existingRow.text || '{}'); } catch(e) {}
      if (!state.entries) state.entries = [{ text: '', url: '' }];
      if (!state.context_url) state.context_url = '';
    }

    function renderBody() {
      var entryHtml = state.entries.map(function(entry, ei) {
        return '<div class="za-modal-entry" data-ei="' + ei + '">' +
          '<textarea class="form-textarea za-entry-text" placeholder="Analysis text..." style="min-height:80px;">' + (entry.text || '') + '</textarea>' +
          '<input class="form-input za-entry-url" placeholder="TradingView chart URL (optional)" value="' + (entry.url || '') + '" />' +
          (entry.url ? '<div class="za-url-preview-wrap"><img class="upload-preview" src="' + entry.url + '" style="display:block;max-height:120px;" /></div>' : '') +
          (state.entries.length > 1
            ? '<div class="za-entry-actions"><button class="btn-icon del za-remove-entry" data-ei="' + ei + '">✕ Remove this entry</button></div>'
            : '') +
        '</div>' +
        (ei < state.entries.length - 1 ? '<div class="za-entry-divider"></div>' : '');
      }).join('');

      return '<div class="form-group">' +
          '<label class="form-label">📅 Session Date</label>' +
          '<input class="form-input" id="za-date" type="date" value="' + sessionDate + '" />' +
        '</div>' +
        '<div class="za-context-section">' +
          '<label class="form-label" style="margin-bottom:5px;display:block;">🖼 Context Chart (overview)</label>' +
          '<input class="form-input" id="za-context" placeholder="TradingView context URL..." value="' + (state.context_url || '') + '" />' +
          (state.context_url ? '<div class="za-url-preview-wrap" style="margin-top:6px;"><img class="upload-preview" id="za-context-preview" src="' + state.context_url + '" style="display:block;max-height:140px;" /></div>' : '<div class="za-url-preview-wrap" style="display:none;margin-top:6px;"><img class="upload-preview" id="za-context-preview" src="" style="max-height:140px;" /></div>') +
        '</div>' +
        '<div id="za-entries-wrap">' + entryHtml + '</div>' +
        '<button class="za-add-entry" id="za-add-entry-btn">+ Add entry</button>';
    }

    function buildModal() {
      modal.innerHTML =
        '<div class="modal-header">' +
          '<span class="modal-title">' + (isEdit ? '✎ Edit' : '📋 Log') + ' Zone Analysis</span>' +
          '<button class="modal-close" id="za-close">✕</button>' +
        '</div>' +
        '<div class="modal-body" id="za-body">' + renderBody() + '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn btn-secondary" id="za-cancel">Cancel</button>' +
          '<button class="btn btn-primary" id="za-save">' + (isEdit ? '💾 Update' : '💾 Save') + '</button>' +
        '</div>';

      wireModal();
    }

    function wireModal() {
      var close = function() { modal.classList.add('hidden'); overlay.classList.add('hidden'); };
      modal.querySelector('#za-close').addEventListener('click', close);
      modal.querySelector('#za-cancel').addEventListener('click', close);
      overlay.addEventListener('click', close, { once: true });

      // Date
      modal.querySelector('#za-date').addEventListener('change', function(e) { sessionDate = e.target.value; });

      // Context URL
      modal.querySelector('#za-context').addEventListener('input', function(e) {
        state.context_url = e.target.value.trim();
        var wrap = modal.querySelector('.za-url-preview-wrap');
        var preview = modal.querySelector('#za-context-preview');
        if (state.context_url) {
          wrap.style.display = 'block';
          preview.src = state.context_url;
        } else {
          wrap.style.display = 'none';
        }
      });

      // Delegated events on entries wrap
      var wrap = document.getElementById('za-entries-wrap');
      wrap.addEventListener('input', function(e) {
        var entry = e.target.closest('.za-modal-entry');
        if (!entry) return;
        var ei = parseInt(entry.dataset.ei);
        if (e.target.classList.contains('za-entry-text')) {
          state.entries[ei].text = e.target.value;
        }
        if (e.target.classList.contains('za-entry-url')) {
          state.entries[ei].url = e.target.value.trim();
          var pw = e.target.nextElementSibling;
          if (pw && pw.classList.contains('za-url-preview-wrap')) {
            pw.querySelector('img').src = state.entries[ei].url;
          } else if (state.entries[ei].url) {
            var p = document.createElement('div');
            p.className = 'za-url-preview-wrap';
            p.innerHTML = '<img class="upload-preview" src="' + state.entries[ei].url + '" style="display:block;max-height:120px;" />';
            e.target.insertAdjacentElement('afterend', p);
          }
        }
      });

      wrap.addEventListener('click', function(e) {
        var removeBtn = e.target.closest('.za-remove-entry');
        if (removeBtn) {
          var ei = parseInt(removeBtn.dataset.ei);
          state.entries.splice(ei, 1);
          document.getElementById('za-body').innerHTML = renderBody();
          wireModal();
        }
      });

      // Add entry
      document.getElementById('za-add-entry-btn').addEventListener('click', function() {
        state.entries.push({ text: '', url: '' });
        document.getElementById('za-body').innerHTML = renderBody();
        wireModal();
      });

      // Save / Update
      modal.querySelector('#za-save').addEventListener('click', async function() {
        var btn = modal.querySelector('#za-save');

        // Read final values from DOM
        var dateEl    = modal.querySelector('#za-date');
        var contextEl = modal.querySelector('#za-context');
        if (dateEl)    sessionDate        = dateEl.value;
        if (contextEl) state.context_url  = contextEl.value.trim();

        modal.querySelectorAll('.za-modal-entry').forEach(function(entryEl) {
          var ei   = parseInt(entryEl.dataset.ei);
          var text = entryEl.querySelector('.za-entry-text');
          var url  = entryEl.querySelector('.za-entry-url');
          if (text) state.entries[ei].text = text.value.trim();
          if (url)  state.entries[ei].url  = url.value.trim();
        });

        var hasContent = state.context_url || state.entries.some(function(e) { return e.text || e.url; });
        if (!hasContent) { alert('Please add at least one entry.'); return; }

        btn.textContent = 'Saving...'; btn.disabled = true;

        var payload = {
          zone_id:      zoneId,
          session_date: sessionDate,
          text:         JSON.stringify(state),
          image_url:    null,
        };

        var result;
        if (isEdit) {
          result = await db.from('zone_analyses').update(payload).eq('id', existingRow.id);
        } else {
          result = await db.from('zone_analyses').insert([payload]);
        }

        if (!result.error) {
          close();
          ZoneAnalysis.loadAnalyses(zoneId);
        } else {
          console.error(result.error);
          btn.textContent = isEdit ? '💾 Update' : '💾 Save';
          btn.disabled = false;
          alert('Error saving.');
        }
      });
    }

    buildModal();
    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
  },

  shareSessionToDiscord(content, dateLabel) {
    var lines = ['# 📋 Zone Analysis — ' + dateLabel, ''];
    if (content.context_url) { lines.push(content.context_url); lines.push(''); }
    (content.entries || []).forEach(function(entry, i) {
      if (!entry.text && !entry.url) return;
      if (i > 0) lines.push('──────────────');
      if (entry.text) {
        entry.text.split('\n').forEach(function(l) {
          l = l.trim();
          if (!l) lines.push('');
          else if (l.startsWith('-') || l.startsWith('•')) lines.push('> ' + l);
          else lines.push(l);
        });
      }
      if (entry.url) { lines.push(''); lines.push(entry.url); }
      lines.push('');
    });
    lines.push('🚗 *The Delivery Man — Zone Analysis*');
    ZoneAnalysis._openDiscordModal(lines.join('\n'));
  },

  shareAllToDiscord(rows) {
    var lines = ['# 📋 Zone Analysis — Full Log', ''];
    rows.forEach(function(row) {
      var content = {};
      try { content = JSON.parse(row.text || '{}'); } catch(e) {}
      var dateLabel = row.session_date
        ? new Date(row.session_date + 'T00:00:00').toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
        : '—';
      lines.push('═══════════════════════');
      lines.push('📅 **' + dateLabel + '**');
      lines.push('═══════════════════════');
      if (content.context_url) { lines.push(content.context_url); lines.push(''); }
      (content.entries || []).forEach(function(entry, i) {
        if (!entry.text && !entry.url) return;
        if (i > 0) lines.push('──────────────');
        if (entry.text) {
          entry.text.split('\n').forEach(function(l) {
            l = l.trim();
            if (!l) lines.push('');
            else if (l.startsWith('-') || l.startsWith('•')) lines.push('> ' + l);
            else lines.push(l);
          });
        }
        if (entry.url) { lines.push(''); lines.push(entry.url); }
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
