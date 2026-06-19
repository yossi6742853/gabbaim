// Tribes page — bulk assignment of כהן / לוי / ישראל
// Three columns. Click a member to cycle: ישראל → כהן → לוי → ישראל.
// Or use the three small buttons in each row.

const PAGE_TRIBES = (function() {
  let _all = [];
  let _searchQuery = '';

  async function render(el) {
    el.innerHTML = '<div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">' +
      '<div><h3 class="mb-0"><i class="bi bi-people"></i> סימון שבטים</h3>' +
      '<small class="text-muted">לחץ על מתפלל כדי להעביר בין השבטים. כל שינוי נשמר מיד.</small></div>' +
      '<input type="search" id="trbSearch" class="form-control" placeholder="חיפוש…" style="max-width:240px;" autocomplete="off">' +
      '</div>' +
      '<div class="row g-3" id="tribesGrid">' + UI.skeleton(400) + '</div>';

    document.getElementById('trbSearch').addEventListener('input', UTIL.debounce(function(e) {
      _searchQuery = e.target.value.trim().toLowerCase();
      _renderGrid();
    }, 150));

    await _load();
  }

  async function _load() {
    const synId = STATE.get('currentSynagogueId');
    _all = await API.read('listMembers', { synagogue_id: synId, status: 'active' }, { forceFresh: true });
    _renderGrid();
  }

  function _renderGrid() {
    const grid = document.getElementById('tribesGrid');
    if (!grid) return;

    let members = _all;
    if (_searchQuery) {
      members = members.filter(function(m) {
        const full = ((m.first_name || '') + ' ' + (m.last_name || '')).toLowerCase();
        return full.indexOf(_searchQuery) >= 0;
      });
    }

    const byTribe = { 'כהן': [], 'לוי': [], 'ישראל': [] };
    members.forEach(function(m) {
      const t = m.tribe || 'ישראל';
      if (byTribe[t]) byTribe[t].push(m);
      else byTribe['ישראל'].push(m);
    });

    grid.innerHTML =
      _column('כהן', byTribe['כהן'], 'tribe-כהן', '#fef3c7', '#92400e') +
      _column('לוי', byTribe['לוי'], 'tribe-לוי', '#dbeafe', '#1e40af') +
      _column('ישראל', byTribe['ישראל'], 'tribe-ישראל', '#e5e7eb', '#374151');

    grid.querySelectorAll('[data-set-tribe]').forEach(function(b) {
      b.addEventListener('click', function(ev) {
        ev.stopPropagation();
        _setTribe(b.dataset.member, b.dataset.setTribe);
      });
    });
    grid.querySelectorAll('[data-cycle]').forEach(function(row) {
      row.addEventListener('click', function() {
        _cycleTribe(row.dataset.cycle);
      });
    });
  }

  function _column(tribe, members, badgeClass, bg, color) {
    return '<div class="col-md-4">' +
      '<div class="card h-100">' +
      '<div class="card-header d-flex justify-content-between" style="background:' + bg + ';color:' + color + ';">' +
      '<b>' + UTIL.escHtml(tribe) + '</b>' +
      '<span class="badge bg-light text-dark">' + members.length + '</span>' +
      '</div>' +
      '<div class="card-body p-1" style="max-height:65vh;overflow-y:auto;">' +
      (members.length
        ? members.map(function(m) { return _memberRow(m); }).join('')
        : UI.emptyState('—')) +
      '</div></div></div>';
  }

  function _memberRow(m) {
    const name = (m.first_name || '') + ' ' + (m.last_name || '');
    return '<div class="member-row" data-cycle="' + UTIL.escAttr(m.id) + '" style="padding:0.45rem 0.6rem;">' +
      UTIL.avatarHtml(m, 'avatar-sm') +
      '<div class="info"><div class="name" style="font-size:0.92rem;">' + UTIL.escHtml(name) + '</div></div>' +
      '<div class="btn-group btn-group-sm" role="group">' +
      _tribeBtn(m, 'כהן', 'warning') +
      _tribeBtn(m, 'לוי', 'info') +
      _tribeBtn(m, 'ישראל', 'secondary') +
      '</div></div>';
  }

  function _tribeBtn(m, tribe, color) {
    const active = m.tribe === tribe;
    return '<button class="btn btn-' + (active ? '' : 'outline-') + color + ' btn-icon" ' +
      'data-set-tribe="' + UTIL.escAttr(tribe) + '" data-member="' + UTIL.escAttr(m.id) + '" ' +
      'title="' + UTIL.escAttr(tribe) + '" style="font-size:0.7rem;padding:0.15rem 0.5rem;">' +
      UTIL.escHtml(tribe.charAt(0)) +
      '</button>';
  }

  async function _setTribe(memberId, tribe) {
    const m = _all.find(function(x) { return x.id === memberId; });
    if (!m) return;
    if (m.tribe === tribe) return;
    const prev = m.tribe;
    m.tribe = tribe;        // optimistic
    _renderGrid();
    try {
      await API.write('updateMember', { id: memberId, tribe: tribe });
      UI.toast(m.first_name + ' ' + m.last_name + ' → ' + tribe, 'success');
    } catch (e) {
      m.tribe = prev;
      _renderGrid();
      UI.toast('שגיאה: ' + e.message, 'danger');
    }
  }

  function _cycleTribe(memberId) {
    const m = _all.find(function(x) { return x.id === memberId; });
    if (!m) return;
    const order = ['ישראל', 'כהן', 'לוי'];
    const idx = order.indexOf(m.tribe || 'ישראל');
    const next = order[(idx + 1) % 3];
    _setTribe(memberId, next);
  }

  return { render: render };
})();
