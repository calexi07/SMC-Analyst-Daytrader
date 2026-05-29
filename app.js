// ── App Controller ──

const App = {

  currentPair: null,

  init() {
    Pairs.init();
    // Restore last selected pair from localStorage
    const lastPair = localStorage.getItem('zt_last_pair');
    if (lastPair) {
      const select = document.getElementById('pair-select');
      select.value = lastPair;
      if (select.value === lastPair) this.loadPair(lastPair);
    }
  },

  async loadPair(pair) {
    this.currentPair = pair;
    localStorage.setItem('zt_last_pair', pair);

    document.getElementById('empty-state').classList.add('hidden');
    const dashboard = document.getElementById('pair-dashboard');
    dashboard.classList.remove('hidden');
    dashboard.innerHTML = '<div class="loader" style="padding:60px;">Loading zones...</div>';

    await Zones.renderAll(pair);
  },

  clearPair() {
    this.currentPair = null;
    localStorage.removeItem('zt_last_pair');
    document.getElementById('empty-state').classList.remove('hidden');
    document.getElementById('pair-dashboard').classList.add('hidden');
  }

};

document.addEventListener('DOMContentLoaded', () => App.init());
