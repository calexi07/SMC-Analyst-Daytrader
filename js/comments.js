// ── Comments Module ──

const Comments = {

  async loadComments(zoneId) {
    const list = document.getElementById(`comment-list-${zoneId}`);
    if (!list) return;

    list.innerHTML = '<div class="loader">Loading...</div>';
    const comments = await DB.getComments(zoneId);

    if (comments.length === 0) {
      list.innerHTML = '<div class="loader" style="padding:8px 0; font-size:11px;">No comments yet</div>';
      return;
    }

    list.innerHTML = '';
    comments.forEach(c => list.appendChild(this.buildCommentEl(c, zoneId)));
  },

  buildCommentEl(comment, zoneId) {
    const el = document.createElement('div');
    el.className = 'comment-item';
    el.dataset.id = comment.id;

    const ts = new Date(comment.created_at).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const imgHtml = comment.image_url
      ? `<img class="comment-img" src="${comment.image_url}" alt="screenshot" loading="lazy" />`
      : '';

    el.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="comment-ts">${ts}</span>
        <button class="btn-icon del comment-del" title="Delete comment">✕</button>
      </div>
      ${comment.text ? `<div class="comment-text">${this.escapeHtml(comment.text)}</div>` : ''}
      ${imgHtml}
    `;

    const img = el.querySelector('.comment-img');
    if (img) img.addEventListener('click', () => this.openLightbox(comment.image_url));

    el.querySelector('.comment-del').addEventListener('click', async () => {
      if (!confirm('Delete this comment?')) return;
      const ok = await DB.deleteComment(comment.id);
      if (ok) await this.loadComments(zoneId);
    });

    return el;
  },

  openModal(zoneId) {
    const modal   = document.getElementById('comment-modal');
    const overlay = document.getElementById('modal-overlay');

    modal.innerHTML = `
      <div class="modal-header">
        <span class="modal-title">Add Comment</span>
        <button class="modal-close" id="cm-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Text (optional)</label>
          <textarea class="form-textarea" id="cm-text" placeholder="Analysis, notes, observations..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Image URL (paste TradingView link)</label>
          <input class="form-input" id="cm-url" placeholder="https://www.tradingview.com/x/..." />
          <div id="url-preview-wrap" style="display:none; margin-top:8px;">
            <img id="url-preview" class="upload-preview" style="display:block; max-height:180px;" />
            <span id="url-preview-err" style="display:none; font-size:12px; color:var(--danger);">⚠ Could not load image — check the URL</span>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="cm-cancel">Cancel</button>
        <button class="btn btn-primary" id="cm-save">Add Comment</button>
      </div>
    `;

    // Live preview when URL is pasted
    modal.querySelector('#cm-url').addEventListener('input', e => {
      const url = e.target.value.trim();
      const wrap = modal.querySelector('#url-preview-wrap');
      const img  = modal.querySelector('#url-preview');
      const err  = modal.querySelector('#url-preview-err');

      if (!url) { wrap.style.display = 'none'; return; }

      wrap.style.display = 'block';
      img.style.display  = 'block';
      err.style.display  = 'none';
      img.src = url;
      img.onerror = () => {
        img.style.display = 'none';
        err.style.display = 'block';
      };
      img.onload = () => {
        img.style.display = 'block';
        err.style.display = 'none';
      };
    });

    const close = () => { modal.classList.add('hidden'); overlay.classList.add('hidden'); };
    modal.querySelector('#cm-close').addEventListener('click', close);
    modal.querySelector('#cm-cancel').addEventListener('click', close);
    overlay.addEventListener('click', close, { once: true });

    modal.querySelector('#cm-save').addEventListener('click', async () => {
      const text = modal.querySelector('#cm-text').value.trim();
      const url  = modal.querySelector('#cm-url').value.trim();

      if (!text && !url) { alert('Please add text or an image URL.'); return; }

      const btn = modal.querySelector('#cm-save');
      btn.textContent = 'Saving...'; btn.disabled = true;

      const comment = await DB.addComment({
        zone_id:   zoneId,
        text:      text || null,
        image_url: url  || null
      });

      if (comment) {
        close();
        await Comments.loadComments(zoneId);
      } else {
        btn.textContent = 'Add Comment'; btn.disabled = false;
        alert('Error saving comment.');
      }
    });

    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
    modal.querySelector('#cm-text').focus();
  },

  openLightbox(url) {
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML = `<img src="${url}" alt="screenshot" />`;
    lb.addEventListener('click', () => lb.remove());
    document.body.appendChild(lb);
  },

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};
