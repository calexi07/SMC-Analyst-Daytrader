// ── Pairs Module ──
// Populates the pair dropdown with grouped options

const Pairs = {

  init() {
    const select = document.getElementById('pair-select');
    const groups = {};

    TRADING_PAIRS.forEach(p => {
      if (!groups[p.group]) groups[p.group] = [];
      groups[p.group].push(p);
    });

    Object.entries(groups).forEach(([groupName, pairs]) => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = groupName;
      pairs.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.value;
        opt.textContent = p.label;
        optgroup.appendChild(opt);
      });
      select.appendChild(optgroup);
    });

    select.addEventListener('change', e => {
      const pair = e.target.value;
      if (pair) {
        App.loadPair(pair);
      } else {
        App.clearPair();
      }
    });
  }

};
