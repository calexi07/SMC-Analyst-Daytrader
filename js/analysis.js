// ── Analysis Module ──
// Per-pair daily analysis with calendar navigation

const Analysis = {

  _currentDate: {},   // pair → selected date string YYYY-MM-DD
  _currentData: {},   // pair → loaded analysis object

  today() {
    return new Date().toISOString().slice(0, 10);
  },

  // ── Render the full analysis section for a pair ──
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
            <button class="date-nav-btn" id="an-prev-${pair}" title="Previous">◀</button>
            <input type="date" class="date-picker" id="an-date-${pair}" value="${this._currentDate[pair]}" />
            <button class="date-nav-btn" id="an-next-${pair}" title="Next">▶</button>
            <button class="date-nav-btn today-btn" id="an-today-${pair}" title="Today">Today</button>
          </div>
        </div>

        <div class="analysis-dot-nav" id="an-dots-${pair}"></div>

        <div class="analysis-body" id="an-body-${pair}">
          <div class="loader">Loading analysis...</div>
        </div>
      </div>
    `;

    // Date navigation events
    document.getElementById(`an-date-${pair}`).addEventListener('change', e => {
      this._currentDate[pair] = e.target.value;
      this.loadForDate(pair);
    });

    document.getElementById(`an-prev-${pair}`).addEventListener('click', () => {
      this.shiftDate(pair, -1);
    });

    document.getElementById(`an-next-${pair}`).addEventListener('click', () => {
      this.shiftDate(pair, 1);
    });

    document.getElementById(`an-today-${pair}`).addEventListener('click', () => {
      this._currentDate[pair] = this.today();
      document.getElementById(`an-date-${pair}`).value = this._currentDate[pair];
      this.loadForDate(pair);
    });

    await this.loadDots(pair);
    await this.loadForDate(pair);
  },

  shiftDate(pair, delta) {
    const d = new Date(this._currentDate[pair]);
    d.setDate(d.getDate() + delta);
    this._currentDate[pair] = d.toISOString().slice(0, 10);
    document.getElementById(`an-date-${pair}`).value = this._currentDate[pair];
    this.loadForDate(pair);
  },

  // Load dot indicators for dates that have analysis
  async loadDots(pair) {
    const dots = document.getElementById(`an-dots-${pair}`);
    if (!dots) return;
    const dates = await DB.getAnalysisDates(pair);
    if (dates.length === 0) { dots.innerHTML = ''; return; }

    // Show last 10 dates as clickable pills
    dots.innerHTML = dates.slice(0, 10).map(d => {
      const label = new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day:'2-digit', month:'short' });
      return `<button class="date-pill" data-date="${d}" data-pair="${pair}">${label}</button>`;
    }).join('');

    dots.querySelectorAll('.date-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this._currentDate[pair] = btn.dataset.date;
        document.getElementById(`an-date-${pair}`).value = btn.dataset.date;
        this.loadForDate(pair);
      });
    });
  },

  // Load analysis for current date
  async loadForDate(pair) {
    const date = this._currentDate[pair];
    const body = document.getElementById(`an-body-${pair}`);
    if (!body) return;

    body.innerHTML = '<div class="loader">Loading...</div>';
    const analysis = await DB.getAnalysis(pair, date);
    this._currentData[pair] = analysis;

    // Update active dot
    document.querySelectorAll(`#an-dots-${pair} .date-pill`).forEach(btn => {
      btn.classList.toggle('active', btn.dataset.date === date);
    });

    if (analysis) {
      this.renderView(pair, date, analysis, body);
    } else {
      this.renderEmpty(pair, date, body);
    }
  },

  // ── Render saved analysis (view mode) ──
  renderView(pair, date, analysis, body) {
    const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    const tfBlocks = [
      { key: 'weekly', label: 'Weekly',  icon: '🗺' },
      { key: 'daily',  label: 'Daily',   icon: '📅' },
      { key: 'h4',     label: '4H',      icon: '⏱' },
      { key: 'h1',     label: '1H',      icon: '🔍' },
    ];

    body.innerHTML = `
      <div class="an-view-header">
        <span class="an-date-label">📅 ${dateLabel}</span>
        <div class="an-view-actions">
          <button class="btn btn-secondary btn-sm" id="an-edit-${pair}">✎ Edit</button>
          <button class="btn btn-danger btn-sm"    id="an-del-${pair}">✕ Delete</button>
        </div>
      </div>
      <div class="an-tf-grid">
        ${tfBlocks.map(tf => {
          const text = analysis[`tf_${tf.key}`] || '';
          const img  = analysis[`img_${tf.key}`] || '';
          if (!text && !img) return '';
          return `
            <div class="an-tf-block">
              <div class="an-tf-header">
                <span class="an-tf-icon">${tf.icon}</span>
                <span class="an-tf-label">${tf.label}</span>
              </div>
              ${text ? `<div class="an-tf-text">${text.replace(/\n/g,'<br>')}</div>` : ''}
              ${img  ? `<img class="an-tf-img" src="${img}" alt="${tf.label} chart" loading="lazy" />` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;

    document.getElementById(`an-edit-${pair}`).addEventListener('click', () => {
      this.renderForm(pair, date, analysis, body);
    });

    document.getElementById(`an-del-${pair}`).addEventListener('click', async () => {
      if (!confirm('Delete this analysis?')) return;
      const ok = await DB.deleteAnalysis(analysis.id);
      if (ok) {
        this._currentData[pair] = null;
        await this.loadDots(pair);
        this.renderEmpty(pair, date, body);
      }
    });

    // Lightbox on images
    body.querySelectorAll('.an-tf-img').forEach(img => {
      img.addEventListener('click', () => {
        const lb = document.createElement('div');
        lb.className = 'lightbox';
        lb.innerHTML = `<img src="${img.src}" />`;
        lb.addEventListener('click', () => lb.remove());
        document.body.appendChild(lb);
      });
    });
  },

  // ── Render empty state for date ──
  renderEmpty(pair, date, body) {
    const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    body.innerHTML = `
      <div class="an-empty">
        <div class="an-empty-date">📅 ${dateLabel}</div>
        <div class="an-empty-text">No analysis logged for this date</div>
        <button class="btn btn-primary btn-sm" id="an-new-${pair}">+ Log Analysis</button>
      </div>
    `;
    document.getElementById(`an-new-${pair}`).addEventListener('click', () => {
      this.renderForm(pair, date, null, body);
    });
  },

  // ── Render edit/create form ──
  renderForm(pair, date, existing, body) {
    const tfBlocks = [
      { key: 'weekly', label: 'Weekly',  icon: '🗺',  cls: 'weekly' },
      { key: 'daily',  label: 'Daily',   icon: '📅',  cls: 'daily'  },
      { key: 'h4',     label: '4H',      icon: '⏱',  cls: 'h4'     },
      { key: 'h1',     label: '1H',      icon: '🔍',  cls: 'h1'     },
    ];

    body.innerHTML = `
      <div class="an-form">
        <div class="an-tf-form-grid">
          ${tfBlocks.map(tf => `
            <div class="an-tf-form-block">
              <div class="an-tf-header">
                <span class="an-tf-icon">${tf.icon}</span>
                <span class="an-tf-label ${tf.cls}">${tf.label}</span>
              </div>
              <textarea class="form-textarea an-textarea" id="an-text-${tf.key}-${pair}"
                placeholder="${tf.label} analysis — bias, key levels, narrative..."
              >${existing ? (existing[`tf_${tf.key}`] || '') : ''}</textarea>
              <input class="form-input an-img-input" id="an-img-${tf.key}-${pair}"
                placeholder="TradingView chart URL (optional)"
                value="${existing ? (existing[`img_${tf.key}`] || '') : ''}" />
              <div class="an-img-preview-wrap" id="an-prev-${tf.key}-${pair}" style="${existing && existing['img_'+tf.key] ? '' : 'display:none;'}">
                <img class="an-img-preview" src="${existing ? (existing[`img_${tf.key}`] || '') : ''}" />
              </div>
            </div>
          `).join('')}
        </div>
        <div class="an-form-footer">
          <button class="btn btn-secondary btn-sm" id="an-cancel-${pair}">Cancel</button>
          <button class="btn btn-primary" id="an-save-${pair}">💾 Save Analysis</button>
        </div>
      </div>
    `;

    // Live image preview per TF
    tfBlocks.forEach(tf => {
      document.getElementById(`an-img-${tf.key}-${pair}`).addEventListener('input', e => {
        const url  = e.target.value.trim();
        const wrap = document.getElementById(`an-prev-${tf.key}-${pair}`);
        const img  = wrap.querySelector('.an-img-preview');
        if (!url) { wrap.style.display = 'none'; return; }
        wrap.style.display = 'block';
        img.src = url;
        img.onerror = () => { wrap.style.display = 'none'; };
      });
    });

    // Cancel
    document.getElementById(`an-cancel-${pair}`).addEventListener('click', () => {
      if (existing) this.renderView(pair, date, existing, body);
      else this.renderEmpty(pair, date, body);
    });

    // Save
    document.getElementById(`an-save-${pair}`).addEventListener('click', async () => {
      const fields = {};
      tfBlocks.forEach(tf => {
        fields[`tf_${tf.key}`]  = document.getElementById(`an-text-${tf.key}-${pair}`).value.trim() || null;
        fields[`img_${tf.key}`] = document.getElementById(`an-img-${tf.key}-${pair}`).value.trim() || null;
      });

      const btn = document.getElementById(`an-save-${pair}`);
      btn.textContent = 'Saving...'; btn.disabled = true;

      const saved = await DB.saveAnalysis(pair, date, fields);
      if (saved) {
        this._currentData[pair] = saved;
        await this.loadDots(pair);
        this.renderView(pair, date, saved, body);
      } else {
        btn.textContent = '💾 Save Analysis'; btn.disabled = false;
        alert('Error saving analysis.');
      }
    });
  },
};
