// ── Comments Module ──

const Comments = {

  // ── Load comments into the zone's panel ──
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

  // ── Build single comment DOM element ──
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

    // Lightbox on image click
    const img = el.querySelector('.comment-img');
    if (img) {
      img.addEventListener('click', () => this.openLightbox(comment.image_url));
    }

    // Delete comment
    el.querySelector('.comment-del').addEventListener('click', async () => {
      if (!confirm('Delete this comment?')) return;
      const ok = await DB.deleteComment(comment.id);
      if (ok) await this.loadComments(zoneId);
    });

    return el;
  },

  // ── Open add-comment modal ──
  openModal(zoneId) {
    const modal   = document.getElementById('comment-modal');
    const overlay = document.getElementById('modal-overlay');
    let selectedFile = null;

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
          <label class="form-label">Screenshot (optional)</label>
          <div class="upload-area" id="upload-area">
            <input type="file" id="cm-file" accept="image/*" />
            <div class="upload-label" id="upload-label">📷 Click to upload TradingView screenshot</div>
            <img class="upload-preview" id="upload-preview" />
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="cm-cancel">Cancel</button>
        <button class="btn btn-primary" id="cm-save">Add Comment</button>
      </div>
    `;

    // Preview selected image
    modal.querySelector('#cm-file').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      selectedFile = file;
      const reader = new FileReader();
      reader.onload = ev => {
        const preview = modal.querySelector('#upload-preview');
        const label   = modal.querySelector('#upload-label');
        preview.src = ev.target.result;
        preview.style.display = 'block';
        label.textContent = file.name;
      };
      reader.readAsDataURL(file);
    });

    const close = () => {
      modal.classList.add('hidden');
      overlay.classList.add('hidden');
    };

    modal.querySelector('#cm-close').addEventListener('click', close);
    modal.querySelector('#cm-cancel').addEventListener('click', close);
    overlay.addEventListener('click', close, { once: true });

    modal.querySelector('#cm-save').addEventListener('click', async () => {
      const text = modal.querySelector('#cm-text').value.trim();
      if (!text && !selectedFile) {
        alert('Please add text or an image.');
        return;
      }

      const btn = modal.querySelector('#cm-save');
      btn.textContent = 'Saving...'; btn.disabled = true;

      let imageUrl = null;
      if (selectedFile) {
        imageUrl = await DB.uploadImage(selectedFile);
        if (!imageUrl) {
          btn.textContent = 'Add Comment'; btn.disabled = false;
          alert('Image upload failed. Check Supabase Storage bucket "zone-images" exists and is public.');
          return;
        }
      }

      const comment = await DB.addComment({
        zone_id: zoneId,
        text: text || null,
        image_url: imageUrl
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

  // ── Lightbox ──
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
