// ── Zones Module ──

const Zones = {

  // ── Render all TF sections for a pair ──
  async renderAll(pair) {
    const dashboard = document.getElementById('pair-dashboard');
    dashboard.innerHTML = `
      <div class="pair-header">
        <div class="pair-name">${pair}</div>
      </div>
      <div class="tf-sections" id="tf-sections"></div>
    `;

    const tfSections = document.getElementById('tf-sections');

    for (const tf of TIMEFRAMES) {
      const section = document.createElement('div');
      section.className = 'tf-section';
      section.id = `tf-${tf.key}`;
      section.innerHTML = `
        <div class="tf-header" data-tf="${tf.key}">
          <div class="tf-header-left">
            <span class="tf-label ${tf.cssClass}">${tf.label}</span>
            <span class="tf-count" id="count-${tf.key}">loading...</span>
          </div>
          <span class="tf-chevron">▼</span>
        </div>
        <div class="tf-body">
          <div class="zones-list" id="zones-${tf.key}">
            <div class="loader">Loading zones...</div>
          </div>
          <button class="btn-add-zone" data-tf="${tf.key}" data-pair="${pair}">
            + Add Zone
          </button>
        </div>
      `;
      tfSections.appendChild(section);

      // Toggle expand/collapse
      section.querySelector('.tf-header').addEventListener('click', () => {
        section.classList.toggle('open');
      });

      // Add zone button
      section.querySelector('.btn-add-zone').addEventListener('click', (e) => {
        e.stopPropagation();
        Zones.openAddModal(pair, tf.key);
      });

      // Load zones for this TF
      this.loadZones(pair, tf.key);
    }
  },

  // ── Load & render zones for one TF ──
  async loadZones(pair, timeframe) {
    const list  = document.getElementById(`zones-${timeframe}`);
    const count = document.getElementById(`count-${timeframe}`);
    if (!list) return;

    list.innerHTML = '<div class="loader">Loading...</div>';
    const zones = await DB.getZones(pair, timeframe);
    count.textContent = `${zones.length} zone${zones.length !== 1 ? 's' : ''}`;

    if (zones.length === 0) {
      list.innerHTML = '<div class="loader" style="padding:14px 0; font-size:11px;">No zones yet</div>';
      return;
    }

    list.innerHTML = '';
    zones.forEach(z => list.appendChild(this.buildZoneCard(z)));
  },

  // ── Build a single zone card DOM element ──
  buildZoneCard(zone) {
    const card = document.createElement('div');
    card.className = `zone-card ${zone.status}`;
    card.dataset.id = zone.id;

    const testsHtml = (zone.status === 'tested' && zone.test_count > 0)
      ? `<span class="zone-tests">×${zone.test_count}</span>`
      : '';

    const date = zone.zone_date
      ? new Date(zone.zone_date).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' })
      : '';

    card.innerHTML = `
      <div class="zone-row">
        <span class="zone-tag tag-${zone.status}">${zone.status}</span>
        <span class="zone-name">${zone.name}</span>
        <div class="zone-meta">
          ${testsHtml}
          <span class="zone-date">${date}</span>
        </div>
        <div class="zone-actions">
          <button class="btn-icon edit" title="Edit">✎</button>
          <button class="btn-icon del" title="Delete">✕</button>
        </div>
      </div>
      <div class="zone-comments" id="comments-${zone.id}">
        <div class="comments-header">
          <span class="comments-title">Comments & Screenshots</span>
        </div>
        <div class="comment-list" id="comment-list-${zone.id}">
          <div class="loader">Loading...</div>
        </div>
        <button class="btn-add-comment" data-zone="${zone.id}">+ Add Comment / Screenshot</button>
      </div>
    `;

    // Click zone row → expand comments
    card.querySelector('.zone-row').addEventListener('click', (e) => {
      if (e.target.closest('.zone-actions')) return;
      this.toggleComments(card, zone.id);
    });

    // Edit
    card.querySelector('.btn-icon.edit').addEventListener('click', (e) => {
      e.stopPropagation();
      this.openEditModal(zone);
    });

    // Delete
    card.querySelector('.btn-icon.del').addEventListener('click', (e) => {
      e.stopPropagation();
      this.confirmDelete(zone);
    });

    // Add comment
    card.querySelector('.btn-add-comment').addEventListener('click', () => {
      Comments.openModal(zone.id);
    });

    return card;
  },

  // ── Toggle comments panel ──
  async toggleComments(card, zoneId) {
    const wasOpen = card.classList.contains('expanded');
    card.classList.toggle('expanded', !wasOpen);
    if (!wasOpen) {
      await Comments.loadComments(zoneId);
    }
  },

  // ── ADD modal ──
  openAddModal(pair, timeframe) {
    const modal = document.getElementById('zone-modal');
    const overlay = document.getElementById('modal-overlay');

    modal.innerHTML = `
      <div class="modal-header">
        <span class="modal-title">Add Zone — ${timeframe.toUpperCase()}</span>
        <button class="modal-close" id="zone-modal-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Zone Name</label>
          <input class="form-input" id="z-name" placeholder="e.g. Daily Demand 1.0820–1.0850" />
        </div>
        <div class="form-group">
          <label class="form-label">Date Created</label>
          <input class="form-input" id="z-date" type="date" value="${new Date().toISOString().slice(0,10)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" id="z-status">
            <option value="fresh">Fresh</option>
            <option value="tested">Tested</option>
            <option value="broken">Broken</option>
          </select>
        </div>
        <div class="form-group" id="tests-group" style="display:none;">
          <label class="form-label">Times Tested</label>
          <div class="tests-group">
            <input class="form-input" id="z-tests" type="number" min="1" value="1" />
            <span class="tests-label">times</span>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="zone-modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="zone-modal-save">Add Zone</button>
      </div>
    `;

    // Show/hide test count
    modal.querySelector('#z-status').addEventListener('change', e => {
      modal.querySelector('#tests-group').style.display =
        e.target.value === 'tested' ? 'flex' : 'none';
    });

    const close = () => { modal.classList.add('hidden'); overlay.classList.add('hidden'); };
    modal.querySelector('#zone-modal-close').addEventListener('click', close);
    modal.querySelector('#zone-modal-cancel').addEventListener('click', close);
    overlay.addEventListener('click', close, { once: true });

    modal.querySelector('#zone-modal-save').addEventListener('click', async () => {
      const name   = modal.querySelector('#z-name').value.trim();
      const status = modal.querySelector('#z-status').value;
      const date   = modal.querySelector('#z-date').value;
      const tests  = status === 'tested' ? parseInt(modal.querySelector('#z-tests').value) || 1 : 0;

      if (!name) { alert('Please enter a zone name.'); return; }

      const btn = modal.querySelector('#zone-modal-save');
      btn.textContent = 'Saving...'; btn.disabled = true;

      const zone = await DB.addZone({ pair, timeframe, name, status, zone_date: date || null, test_count: tests });
      if (zone) {
        close();
        await this.loadZones(pair, timeframe);
      } else {
        btn.textContent = 'Add Zone'; btn.disabled = false;
        alert('Error saving zone. Check console.');
      }
    });

    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
    modal.querySelector('#z-name').focus();
  },

  // ── EDIT modal ──
  openEditModal(zone) {
    const modal = document.getElementById('zone-modal');
    const overlay = document.getElementById('modal-overlay');

    modal.innerHTML = `
      <div class="modal-header">
        <span class="modal-title">Edit Zone</span>
        <button class="modal-close" id="zone-modal-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Zone Name</label>
          <input class="form-input" id="z-name" value="${zone.name}" />
        </div>
        <div class="form-group">
          <label class="form-label">Date Created</label>
          <input class="form-input" id="z-date" type="date" value="${zone.zone_date ? zone.zone_date.slice(0,10) : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" id="z-status">
            <option value="fresh"  ${zone.status==='fresh'  ? 'selected':''}>Fresh</option>
            <option value="tested" ${zone.status==='tested' ? 'selected':''}>Tested</option>
            <option value="broken" ${zone.status==='broken' ? 'selected':''}>Broken</option>
          </select>
        </div>
        <div class="form-group" id="tests-group" style="display:${zone.status==='tested'?'flex':'none'};">
          <label class="form-label">Times Tested</label>
          <div class="tests-group">
            <input class="form-input" id="z-tests" type="number" min="1" value="${zone.test_count || 1}" />
            <span class="tests-label">times</span>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="zone-modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="zone-modal-save">Save Changes</button>
      </div>
    `;

    modal.querySelector('#z-status').addEventListener('change', e => {
      modal.querySelector('#tests-group').style.display =
        e.target.value === 'tested' ? 'flex' : 'none';
    });

    const close = () => { modal.classList.add('hidden'); overlay.classList.add('hidden'); };
    modal.querySelector('#zone-modal-close').addEventListener('click', close);
    modal.querySelector('#zone-modal-cancel').addEventListener('click', close);
    overlay.addEventListener('click', close, { once: true });

    modal.querySelector('#zone-modal-save').addEventListener('click', async () => {
      const name   = modal.querySelector('#z-name').value.trim();
      const status = modal.querySelector('#z-status').value;
      const date   = modal.querySelector('#z-date').value;
      const tests  = status === 'tested' ? parseInt(modal.querySelector('#z-tests').value) || 1 : 0;

      if (!name) { alert('Please enter a zone name.'); return; }

      const btn = modal.querySelector('#zone-modal-save');
      btn.textContent = 'Saving...'; btn.disabled = true;

      const updated = await DB.updateZone(zone.id, { name, status, zone_date: date || null, test_count: tests });
      if (updated) {
        close();
        await this.loadZones(zone.pair, zone.timeframe);
      } else {
        btn.textContent = 'Save Changes'; btn.disabled = false;
      }
    });

    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
  },

  // ── Delete confirm ──
  async confirmDelete(zone) {
    if (!confirm(`Delete zone "${zone.name}"? This will also remove all comments.`)) return;
    const ok = await DB.deleteZone(zone.id);
    if (ok) await this.loadZones(zone.pair, zone.timeframe);
  }

};
