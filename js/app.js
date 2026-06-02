// ── App Controller ──

const App = {

  currentPair: null,

  init() {
    document.getElementById('nav-dashboard').addEventListener('click', () => this.showDashboard());
    document.getElementById('nav-pairs').addEventListener('click', () => this.showPairsView());
    document.getElementById('nav-deliveries').addEventListener('click', () => Deliveries.show());
    document.getElementById('nav-vans').addEventListener('click', () => Vans.show());

    document.getElementById('notif-bell').addEventListener('click', function(e) {
      e.stopPropagation();
      Notifications.togglePanel();
    });

    Notifications.init();
    Vans.load(); // preload vans cache
    Pairs.init();

    const lastView = localStorage.getItem('zt_last_view') || 'dashboard';
    if (lastView === 'vans') {
      this.showVansView();
    } else if (lastView === 'pairs') {
      this.showPairsView();
    } else {
      this.showDashboard();
    }
  },

  showDashboard() {
    document.getElementById('dashboard-view').classList.remove('hidden');
    document.getElementById('pairs-view').classList.add('hidden');
    document.getElementById('deliveries-view').classList.add('hidden');
    document.getElementById('nav-dashboard').classList.add('active');
    document.getElementById('nav-pairs').classList.remove('active');
    localStorage.setItem('zt_last_view', 'dashboard');
    Dashboard.refresh();
  },

  showPairsView() {
    document.getElementById('pairs-view').classList.remove('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('deliveries-view').classList.add('hidden');
    document.getElementById('nav-pairs').classList.add('active');
    document.getElementById('nav-dashboard').classList.remove('active');
    localStorage.setItem('zt_last_view', 'pairs');

    const lastPair = localStorage.getItem('zt_last_pair');
    if (lastPair) {
      const select = document.getElementById('pair-select');
      select.value = lastPair;
      if (select.value === lastPair) this.loadPair(lastPair);
    }
  },

  async loadPair(pair) {
    // Stop previous pair polling + road map
    if (this.currentPair && this.currentPair !== pair) {
      Live.stopPolling(this.currentPair);
      Live._prices = {};   // clear cached prices so old pair price doesn't show
      RoadMap.stop();
    }

    this.currentPair = pair;
    localStorage.setItem('zt_last_pair', pair);
    document.getElementById('empty-state').classList.add('hidden');
    const dashboard = document.getElementById('pair-dashboard');
    dashboard.classList.remove('hidden');
    dashboard.innerHTML = '<div class="loader" style="padding:60px;">Loading zones...</div>';
    await Zones.renderAll(pair);
  },

  showVansView() {
    Vans.show();
  },

  clearPair() {
    if (this.currentPair) {
      Live.stopPolling(this.currentPair);
      Live._prices = {};
      RoadMap.stop();
    }
    this.currentPair = null;
    localStorage.removeItem('zt_last_pair');
    document.getElementById('empty-state').classList.remove('hidden');
    document.getElementById('pair-dashboard').classList.add('hidden');
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
