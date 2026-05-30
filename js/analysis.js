// ── Analysis Module ──

const Analysis = {

  _currentDate: {},
  _currentData: {},

  today() {
    return new Date().toISOString().slice(0, 10);
  },

  async render(pair, container) {
    const today = this.today();
    this._currentDate[pair] = this._currentDate[pair] || today;

    container.innerHTML = `
      <div class="analysis-wrap" id="analysis-${pair}">
        <div class="analysis-topbar">
          <div class="analysis-title">
            <span class="analysis-icon">📋</span>
            <span>Route Analysis</span>
          </div>
          <div class="analysis-date-nav">
            <button class="date-nav-btn" id="an-prev-${pair}">◀</button>
            <input type="date" class="date-picker" id="an-date-${pair}" value="${this._currentDate[pair]}" />
            <button class="date-nav-btn" id="an-next-${pair}">▶</button>
            <button class="date-nav-btn today-btn" id="an-today-${pair}">Today</button>
          </div>
        </div>
        <div class="analysis-dot-nav" id="an-dots-${pair}"></div>
        <div class="analysis-body" id="an-body-${pair}">
          <div class="loader">Loading analysis...</div>
        </div>
      </div>
    `;

    document.getElementById('an-date-' + pair).addEventListener('change', function(e) {
      Analysis._currentDate[pair] = e.target.value;
      Analysis.loadForDate(pair);
    });

    document.getElementById('an-prev-' + pair).addEventListener('click', function() {
      Analysis.shiftDate(pair, -1);
    });

    document.getElementById('an-next-' + pair).addEventListener('click', function() {
      Analysis.shiftDate(pair, 1);
    });

    document.getElementById('an-today-' + pair).addEventListener('click', function() {
      Analysis._currentDate[pair] = Analysis.today();
      document.getElementById('an-date-' + pair).value = Analysis._currentDate[pair];
      Analysis.loadForDate(pair);
    });

    await this.loadDots(pair);
    await this.loadForDate(pair);
  },

  shiftDate(pair, delta) {
    var d = new Date(this._currentDate[pair]);
    d.setDate(d.getDate() + delta);
    this._currentDate[pair] = d.toISOString().slice(0, 10);
    document.getElementById('an-date-' + pair).value = this._currentDate[pair];
    this.loadForDate(pair);
  },

  async loadDots(pair) {
    var dots = document.getElementById('an-dots-' + pair);
    if (!dots) return;
    var dates = await DB.getAnalysisDates(pair);
    if (dates.length === 0) { dots.innerHTML = ''; return; }

    dots.innerHTML = dates.slice(0, 10).map(function(d) {
      var label = new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      return '<button class="date-pill" data-date="' + d + '" data-pair="' + pair + '">' + label + '</button>';
    }).join('');

    dots.querySelectorAll('.date-pill').forEach(function(btn) {
      btn.addEventListener('click', function() {
        Analysis._currentDate[pair] = btn.dataset.date;
        document.getElementById('an-date-' + pair).value = btn.dataset.date;
        Analysis.loadForDate(pair);
      });
    });
  },

  async loadForDate(pair) {
    var date = this._currentDate[pair];
    var body = document.getElementById('an-body-' + pair);
    if (!body) return;

    body.innerHTML = '<div class="loader">Loading...</div>';
    var analysis = await DB.getAnalysis(pair, date);
    this._currentData[pair] = analysis;

    document.querySelectorAll('#an-dots-' + pair + ' .date-pill').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.date === date);
    });

    if (analysis) {
      Analysis.renderView(pair, date, analysis, body);
    } else {
      Analysis.renderEmpty(pair, date, body);
    }
  },

  renderView(pair, date, analysis, body) {
    var dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    var tfBlocks = [
      { key: 'weekly', label: 'Weekly', icon: '🗺' },
      { key: 'daily',  label: 'Daily',  icon: '📅' },
      { key: '4h',     label: '4H',     icon: '⏱' },
      { key: '1h',     label: '1H',     icon: '🔍' },
    ];

    var tfHtml = tfBlocks.map(function(tf) {
      var text = analysis['tf_' + tf.key] || '';
      var img  = analysis['img_' + tf.key] || '';
      if (!text && !img) return '';
      return '<div class="an-tf-block">' +
        '<div class="an-tf-header">' +
          '<span class="an-tf-icon">' + tf.icon + '</span>' +
          '<span class="an-tf-label ' + tf.key + '">' + tf.label + '</span>' +
        '</div>' +
        (text ? '<div class="an-tf-text">' + text.replace(/\n/g, '<br>') + '</div>' : '') +
        (img  ? '<img class="an-tf-img" src="' + img + '" alt="' + tf.label + '" loading="lazy" />' : '') +
      '</div>';
    }).join('');

    body.innerHTML =
      '<div class="an-view-header">' +
        '<span class="an-date-label">📅 ' + dateLabel + '</span>' +
        '<div class="an-view-actions">' +
          '<button class="btn btn-discord btn-sm" id="an-discord-' + pair + '">🔗 Discord</button>' +
          '<button class="btn btn-secondary btn-sm" id="an-edit-' + pair + '">✎ Edit</button>' +
          '<button class="btn btn-danger btn-sm" id="an-del-' + pair + '">✕ Delete</button>' +
        '</div>' +
      '</div>' +
      '<div class="an-tf-grid">' + tfHtml + '</div>';

    document.getElementById('an-discord-' + pair).addEventListener('click', function() {
      Analysis.openDiscordModal(pair, date, analysis);
    });

    document.getElementById('an-edit-' + pair).addEventListener('click', function() {
      Analysis.renderForm(pair, date, analysis, body);
    });

    document.getElementById('an-del-' + pair).addEventListener('click', async function() {
      if (!confirm('Delete this analysis?')) return;
      var ok = await DB.deleteAnalysis(analysis.id);
      if (ok) {
        Analysis._currentData[pair] = null;
        await Analysis.loadDots(pair);
        Analysis.renderEmpty(pair, date, body);
      }
    });

    body.querySelectorAll('.an-tf-img').forEach(function(img) {
      img.addEventListener('click', function() {
        var lb = document.createElement('div');
        lb.className = 'lightbox';
        lb.innerHTML = '<img src="' + img.src + '" />';
        lb.addEventListener('click', function() { lb.remove(); });
        document.body.appendChild(lb);
      });
    });
  },

  renderEmpty(pair, date, body) {
    var dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    body.innerHTML =
      '<div class="an-empty">' +
        '<div class="an-empty-date">📅 ' + dateLabel + '</div>' +
        '<div class="an-empty-text">No analysis logged for this date</div>' +
        '<button class="btn btn-primary btn-sm" id="an-new-' + pair + '">+ Log Analysis</button>' +
      '</div>';
    document.getElementById('an-new-' + pair).addEventListener('click', function() {
      Analysis.renderForm(pair, date, null, body);
    });
  },

  renderForm(pair, date, existing, body) {
    var tfBlocks = [
      { key: 'weekly', label: 'Weekly', icon: '🗺', cls: 'weekly' },
      { key: 'daily',  label: 'Daily',  icon: '📅', cls: 'daily'  },
      { key: '4h',     label: '4H',     icon: '⏱', cls: 'h4'     },
      { key: '1h',     label: '1H',     icon: '🔍', cls: 'h1'     },
    ];

    var blocksHtml = tfBlocks.map(function(tf) {
      var textVal = existing ? (existing['tf_' + tf.key] || '') : '';
      var imgVal  = existing ? (existing['img_' + tf.key] || '') : '';
      var prevStyle = imgVal ? '' : 'display:none;';
      return '<div class="an-tf-form-block">' +
        '<div class="an-tf-header">' +
          '<span class="an-tf-icon">' + tf.icon + '</span>' +
          '<span class="an-tf-label ' + tf.cls + '">' + tf.label + '</span>' +
        '</div>' +
        '<textarea class="form-textarea an-textarea" id="an-text-' + tf.key + '-' + pair + '" ' +
          'placeholder="' + tf.label + ' analysis — bias, key levels, narrative...">' + textVal + '</textarea>' +
        '<input class="form-input an-img-input" id="an-img-' + tf.key + '-' + pair + '" ' +
          'placeholder="TradingView chart URL (optional)" value="' + imgVal + '" />' +
        '<div class="an-img-preview-wrap" id="an-prev-' + tf.key + '-' + pair + '" style="' + prevStyle + '">' +
          '<img class="an-img-preview" src="' + imgVal + '" />' +
        '</div>' +
      '</div>';
    }).join('');

    body.innerHTML =
      '<div class="an-form">' +
        '<div class="an-tf-form-grid">' + blocksHtml + '</div>' +
        '<div class="an-form-footer">' +
          '<button class="btn btn-secondary btn-sm" id="an-cancel-' + pair + '">Cancel</button>' +
          '<button class="btn btn-primary" id="an-save-' + pair + '">💾 Save Analysis</button>' +
        '</div>' +
      '</div>';

    // Live image previews
    tfBlocks.forEach(function(tf) {
      document.getElementById('an-img-' + tf.key + '-' + pair).addEventListener('input', function(e) {
        var url  = e.target.value.trim();
        var wrap = document.getElementById('an-prev-' + tf.key + '-' + pair);
        var img  = wrap.querySelector('.an-img-preview');
        if (!url) { wrap.style.display = 'none'; return; }
        wrap.style.display = 'block';
        img.src = url;
        img.onerror = function() { wrap.style.display = 'none'; };
      });
    });

    document.getElementById('an-cancel-' + pair).addEventListener('click', function() {
      if (existing) Analysis.renderView(pair, date, existing, body);
      else Analysis.renderEmpty(pair, date, body);
    });

    document.getElementById('an-save-' + pair).addEventListener('click', async function() {
      var fields = {};
      tfBlocks.forEach(function(tf) {
        fields['tf_'  + tf.key] = document.getElementById('an-text-' + tf.key + '-' + pair).value.trim() || null;
        fields['img_' + tf.key] = document.getElementById('an-img-'  + tf.key + '-' + pair).value.trim() || null;
      });

      var btn = document.getElementById('an-save-' + pair);
      btn.textContent = 'Saving...'; btn.disabled = true;

      var saved = await DB.saveAnalysis(pair, date, fields);
      if (saved) {
        Analysis._currentData[pair] = saved;
        await Analysis.loadDots(pair);
        Analysis.renderView(pair, date, saved, body);
      } else {
        btn.textContent = '💾 Save Analysis'; btn.disabled = false;
        alert('Error saving analysis.');
      }
    });
  },

  openDiscordModal(pair, date, analysis) {
    var modal   = document.getElementById('comment-modal');
    var overlay = document.getElementById('modal-overlay');

    var dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    var tfBlocks = [
      { key: 'weekly', label: 'Weekly', icon: '🗺', div: '═══════════════════════' },
      { key: 'daily',  label: 'Daily',  icon: '📅', div: '───────────────────────' },
      { key: '4h',     label: '4H',     icon: '⏱', div: '───────────────────────' },
      { key: '1h',     label: '1H',     icon: '🔍', div: '───────────────────────' },
    ];

    var lines = [];
    lines.push('# 🚗 The Delivery Man — Route Analysis');
    lines.push('## ' + pair + ' · ' + dateLabel);
    lines.push('');
    lines.push('> *Every zone is a city. Every trade is a delivery.*');
    lines.push('');

    tfBlocks.forEach(function(tf) {
      var text = analysis['tf_' + tf.key] || '';
      var img  = analysis['img_' + tf.key] || '';
      if (!text && !img) return;

      lines.push(tf.div);
      lines.push(tf.icon + ' **' + tf.label + ' Analysis**');
      lines.push(tf.div);

      if (text) {
        text.split('\n').forEach(function(line) {
          line = line.trim();
          if (!line) { lines.push(''); return; }
          if (line.startsWith('-') || line.startsWith('•')) {
            lines.push('> ' + line);
          } else if (line === line.toUpperCase() && line.length > 3) {
            lines.push('**' + line + '**');
          } else {
            lines.push(line);
          }
        });
      }

      if (img) {
        lines.push('');
        lines.push(img);
      }

      lines.push('');
    });

    lines.push('═══════════════════════');
    lines.push('📍 **Pair:** ' + pair + ' · 📅 **Date:** ' + dateLabel);
    lines.push('🚗 *Logged via The Delivery Man — SMC Analyst Platform*');

    var discordText = lines.join('\n');
    var escaped = discordText.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    modal.innerHTML =
      '<div class="modal-header">' +
        '<span class="modal-title">🔗 Share to Discord</span>' +
        '<button class="modal-close" id="dc-close">✕</button>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div class="discord-preview-label">' +
          '<span class="form-label">Discord Format — Ready to Copy</span>' +
          '<span class="discord-hint">Images auto-embed when pasted</span>' +
        '</div>' +
        '<div class="discord-preview">' + escaped + '</div>' +
        '<div class="discord-char-count">' + discordText.length + ' / 2000 chars</div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" id="dc-close2">Close</button>' +
        '<button class="btn btn-discord" id="dc-copy">📋 Copy to Clipboard</button>' +
      '</div>';

    var close = function() { modal.classList.add('hidden'); overlay.classList.add('hidden'); };
    modal.querySelector('#dc-close').addEventListener('click', close);
    modal.querySelector('#dc-close2').addEventListener('click', close);
    overlay.addEventListener('click', close, { once: true });

    modal.querySelector('#dc-copy').addEventListener('click', async function() {
      try {
        await navigator.clipboard.writeText(discordText);
      } catch(e) {
        var ta = document.createElement('textarea');
        ta.value = discordText;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      var btn = modal.querySelector('#dc-copy');
      btn.textContent = '✅ Copied!';
      btn.style.background = '#059669';
      setTimeout(function() {
        btn.textContent = '📋 Copy to Clipboard';
        btn.style.background = '';
      }, 2000);
    });

    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
  },
};
