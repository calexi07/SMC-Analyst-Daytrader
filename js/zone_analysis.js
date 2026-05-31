// ── Zone Analysis Module ──
// Per-zone text + TradingView image analysis logs

const ZoneAnalysis = {

  async loadAnalyses(zoneId) {
    var list = document.getElementById('analysis-list-' + zoneId);
    if (!list) return;
    list.innerHTML = '<div class="loader">Loading...</div>';

    var { data, error } = await db
      .from('zone_analyses')
      .select('*')
      .eq('zone_id', zoneId)
      .order('created_at', { ascending: false });

    if (error) { console.error(error); return; }

    if (!data || data.length === 0) {
      list.innerHTML = '<div class="loader" style="padding:10px 0; font-size:11px;">No analysis logged yet</div>';
      return;
    }

    list.innerHTML = '';

    // Share all button
    if (data.length > 0) {
      var shareAllBtn = document.createElement('button');
      shareAllBtn.className = 'btn btn-discord btn-sm';
      shareAllBtn.style.cssText = 'margin-bottom:10px; font-size:11px; padding:5px 12px;';
      shareAllBtn.textContent = '🔗 Share All Analyses';
      shareAllBtn.addEventListener('click', function() {
        ZoneAnalysis.shareAllToDiscord(data, zoneId);
      });
      list.appendChild(shareAllBtn);
    }

    data.forEach(function(item) {
      list.appendChild(ZoneAnalysis.buildItem(item, zoneId));
    });
  },

  buildItem(item, zoneId) {
    var el = document.createElement('div');
    el.className = 'za-item';

    var ts = new Date(item.created_at).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    el.innerHTML =
      '<div class="za-header">' +
        '<span class="comment-ts">' + ts + '</span>' +
        '<div style="display:flex;gap:5px;">' +
          '<button class="btn-icon za-discord" title="Share to Discord" style="color:#5865F2;">🔗</button>' +
          '<button class="btn-icon del za-del" title="Delete">✕</button>' +
        '</div>' +
      '</div>' +
      (item.text ? '<div class="za-text">' + ZoneAnalysis._escape(item.text) + '</div>' : '') +
      (item.image_url ? '<img class="comment-img za-img" src="' + item.image_url + '" alt="analysis" loading="lazy" />' : '');

    el.querySelector('.za-del').addEventListener('click', async function() {
      if (!confirm('Delete this analysis entry?')) return;
      await db.from('zone_analyses').delete().eq('id', item.id);
      ZoneAnalysis.loadAnalyses(zoneId);
    });

    el.querySelector('.za-discord').addEventListener('click', function() {
      ZoneAnalysis.shareOneToDiscord(item, zoneId);
    });

    var img = el.querySelector('.za-img');
    if (img) {
      img.addEventListener('click', function() {
        var lb = document.createElement('div');
        lb.className = 'lightbox';
        lb.innerHTML = '<img src="' + item.image_url + '" />';
        lb.addEventListener('click', function() { lb.remove(); });
        document.body.appendChild(lb);
      });
    }

    return el;
  },

  openModal(zoneId) {
    var modal   = document.getElementById('comment-modal');
    var overlay = document.getElementById('modal-overlay');

    modal.innerHTML =
      '<div class="modal-header">' +
        '<span class="modal-title">📋 Log Zone Analysis</span>' +
        '<button class="modal-close" id="za-close">✕</button>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div class="form-group">' +
          '<label class="form-label">Analysis / Notes</label>' +
          '<textarea class="form-textarea" id="za-text" placeholder="What happened at this zone? Structure, reaction, context..." style="min-height:110px;"></textarea>' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">TradingView Chart URL</label>' +
          '<input class="form-input" id="za-url" placeholder="https://www.tradingview.com/x/..." />' +
          '<div id="za-preview-wrap" style="display:none; margin-top:8px;">' +
            '<img id="za-preview" class="upload-preview" style="display:block; max-height:200px;" />' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" id="za-cancel">Cancel</button>' +
        '<button class="btn btn-primary" id="za-save">Save Analysis</button>' +
      '</div>';

    // Image preview
    modal.querySelector('#za-url').addEventListener('input', function(e) {
      var url  = e.target.value.trim();
      var wrap = modal.querySelector('#za-preview-wrap');
      var img  = modal.querySelector('#za-preview');
      if (!url) { wrap.style.display = 'none'; return; }
      wrap.style.display = 'block';
      img.src = url;
      img.onerror = function() { wrap.style.display = 'none'; };
    });

    var close = function() { modal.classList.add('hidden'); overlay.classList.add('hidden'); };
    modal.querySelector('#za-close').addEventListener('click', close);
    modal.querySelector('#za-cancel').addEventListener('click', close);
    overlay.addEventListener('click', close, { once: true });

    modal.querySelector('#za-save').addEventListener('click', async function() {
      var text = modal.querySelector('#za-text').value.trim();
      var url  = modal.querySelector('#za-url').value.trim();

      if (!text && !url) { alert('Please add text or an image URL.'); return; }

      var btn = modal.querySelector('#za-save');
      btn.textContent = 'Saving...'; btn.disabled = true;

      var { data, error } = await db
        .from('zone_analyses')
        .insert([{ zone_id: zoneId, text: text || null, image_url: url || null }])
        .select().single();

      if (data) {
        close();
        ZoneAnalysis.loadAnalyses(zoneId);
      } else {
        console.error(error);
        btn.textContent = 'Save Analysis'; btn.disabled = false;
        alert('Error saving. Check console.');
      }
    });

    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
    modal.querySelector('#za-text').focus();
  },

  shareOneToDiscord(item, zoneId) {
    var ts = new Date(item.created_at).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    var lines = [];
    lines.push('# 📋 Zone Analysis');
    lines.push('🗓 ' + ts);
    lines.push('');
    if (item.text) {
      item.text.split('\n').forEach(function(line) {
        line = line.trim();
        if (!line) { lines.push(''); return; }
        if (line.startsWith('-') || line.startsWith('•')) lines.push('> ' + line);
        else lines.push(line);
      });
    }
    if (item.image_url) {
      lines.push('');
      lines.push(item.image_url);
    }
    lines.push('');
    lines.push('🚗 *The Delivery Man — Zone Analysis*');
    ZoneAnalysis._copyToDiscord(lines.join('\n'));
  },

  shareAllToDiscord(data, zoneId) {
    var lines = [];
    lines.push('# 📋 Zone Analysis — Full Log');
    lines.push('');
    data.forEach(function(item, idx) {
      var ts = new Date(item.created_at).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
      lines.push('─────────────────────────');
      lines.push('📅 **Entry ' + (idx + 1) + '** · ' + ts);
      lines.push('');
      if (item.text) {
        item.text.split('\n').forEach(function(line) {
          line = line.trim();
          if (!line) { lines.push(''); return; }
          if (line.startsWith('-') || line.startsWith('•')) lines.push('> ' + line);
          else lines.push(line);
        });
      }
      if (item.image_url) {
        lines.push('');
        lines.push(item.image_url);
      }
      lines.push('');
    });
    lines.push('─────────────────────────');
    lines.push('🚗 *The Delivery Man — Zone Analysis Log*');
    ZoneAnalysis._copyToDiscord(lines.join('\n'));
  },

  _copyToDiscord(text) {
    var modal   = document.getElementById('comment-modal');
    var overlay = document.getElementById('modal-overlay');
    var escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    modal.innerHTML =
      '<div class="modal-header">' +
        '<span class="modal-title">🔗 Share Analysis — Discord</span>' +
        '<button class="modal-close" id="zad-close">✕</button>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div class="discord-preview-label">' +
          '<span class="form-label">Ready to Copy</span>' +
          '<span class="discord-hint">Images auto-embed in Discord</span>' +
        '</div>' +
        '<div class="discord-preview">' + escaped + '</div>' +
        '<div class="discord-char-count">' + text.length + ' / 2000 chars</div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" id="zad-close2">Close</button>' +
        '<button class="btn btn-discord" id="zad-copy">📋 Copy to Clipboard</button>' +
      '</div>';

    var close = function() { modal.classList.add('hidden'); overlay.classList.add('hidden'); };
    modal.querySelector('#zad-close').addEventListener('click', close);
    modal.querySelector('#zad-close2').addEventListener('click', close);
    overlay.addEventListener('click', close, { once: true });

    modal.querySelector('#zad-copy').addEventListener('click', async function() {
      try { await navigator.clipboard.writeText(text); }
      catch(e) {
        var ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove();
      }
      var btn = modal.querySelector('#zad-copy');
      btn.textContent = '✅ Copied!'; btn.style.background = '#059669';
      setTimeout(function() { btn.textContent = '📋 Copy to Clipboard'; btn.style.background = ''; }, 2000);
    });

    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
  },

  _escape(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  }
};
