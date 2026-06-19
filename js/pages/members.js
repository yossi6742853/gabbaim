// Members list page

const PAGE_MEMBERS = (function() {
  let _allMembers = [];

  async function render(el) {
    el.innerHTML = '<div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">' +
      '<h3 class="mb-0"><i class="bi bi-people-fill"></i> מתפללים</h3>' +
      '<div class="d-flex gap-2 flex-wrap">' +
      '<input type="search" id="memSearch" class="form-control" placeholder="חיפוש…" style="min-width:200px;" autocomplete="off">' +
      '<select id="memTribe" class="form-select" style="width:auto;">' +
      '<option value="">כל השבטים</option>' +
      '<option value="כהן">כהן</option>' +
      '<option value="לוי">לוי</option>' +
      '<option value="ישראל">ישראל</option>' +
      '</select>' +
      '<a href="#/tribes" class="btn btn-outline-warning"><i class="bi bi-tags"></i> סימון שבטים</a>' +
      '<button class="btn btn-primary" id="addMemBtn"><i class="bi bi-plus-lg"></i> הוסף</button>' +
      '</div></div>' +
      '<div class="card"><div class="card-body p-2"><div id="memList">' + UI.skeleton(300) + '</div></div></div>';

    document.getElementById('addMemBtn').addEventListener('click', _openAddMember);
    const search = document.getElementById('memSearch');
    const tribe = document.getElementById('memTribe');
    search.addEventListener('input', UTIL.debounce(_filterAndRender, 200));
    tribe.addEventListener('change', _filterAndRender);

    await _loadAll();
  }

  async function _loadAll() {
    const synId = STATE.get('currentSynagogueId');
    try {
      _allMembers = await API.read('listMembers', { synagogue_id: synId, status: 'active' });
      _filterAndRender();
    } catch (e) {
      document.getElementById('memList').innerHTML = UI.errorState('שגיאה: ' + e.message, _loadAll);
    }
  }

  function _filterAndRender() {
    const q = (document.getElementById('memSearch').value || '').trim().toLowerCase();
    const tribe = document.getElementById('memTribe').value;
    let filtered = _allMembers;
    if (tribe) filtered = filtered.filter(function(m) { return m.tribe === tribe; });
    if (q) {
      filtered = filtered.filter(function(m) {
        const full = ((m.first_name || '') + ' ' + (m.last_name || '') + ' ' + (m.father_name || '')).toLowerCase();
        return full.indexOf(q) >= 0;
      });
    }
    const listEl = document.getElementById('memList');
    if (!filtered.length) { listEl.innerHTML = UI.emptyState('אין מתפללים תואמים'); return; }
    listEl.innerHTML = '<div class="row g-2">' + filtered.map(function(m) {
      const name = (m.first_name || '') + ' ' + (m.last_name || '');
      return '<div class="col-md-6 col-lg-4">' +
        '<div class="member-row" onclick="ROUTER.navigate(\'/member/' + UTIL.escAttr(m.id) + '\')">' +
        UTIL.avatarHtml(m) +
        '<div class="info"><div class="name">' + (q ? UTIL.highlightSearch(name, q) : UTIL.escHtml(name)) + '</div>' +
        '<div class="meta">' + (m.father_name ? 'בן ' + UTIL.escHtml(m.father_name) : '') + '</div></div>' +
        UTIL.tribeBadge(m.tribe) + '</div></div>';
    }).join('') + '</div>';
  }

  function _openAddMember() {
    const synOpts = (STATE.get('synagogues') || []).map(function(s) {
      const sel = s.id === STATE.get('currentSynagogueId') ? 'selected' : '';
      return '<option value="' + UTIL.escAttr(s.id) + '" ' + sel + '>' + UTIL.escHtml(s.name) + '</option>';
    }).join('');
    const body = '<form id="memForm" novalidate><div class="row g-3">' +
      '<div class="col-md-6"><label class="form-label">שם פרטי *</label><input class="form-control" name="first_name" required></div>' +
      '<div class="col-md-6"><label class="form-label">שם משפחה</label><input class="form-control" name="last_name"></div>' +
      '<div class="col-md-6"><label class="form-label">שם האב</label><input class="form-control" name="father_name"></div>' +
      '<div class="col-md-6"><label class="form-label">שבט *</label><select class="form-select" name="tribe" required>' +
      '<option value="ישראל">ישראל</option><option value="כהן">כהן</option><option value="לוי">לוי</option>' +
      '</select></div>' +
      '<div class="col-md-6"><label class="form-label">טלפון</label><input class="form-control" name="phone" type="tel"></div>' +
      '<div class="col-md-6"><label class="form-label">בית כנסת</label><select class="form-select" name="primary_synagogue_id">' + synOpts + '</select></div>' +
      '<div class="col-12"><label class="form-label">הערות</label><textarea class="form-control" name="notes" rows="2"></textarea></div>' +
      '</div></form>';
    const footer = '<button class="btn btn-secondary" data-bs-dismiss="modal">ביטול</button>' +
      '<button class="btn btn-primary" id="saveBtn">שמור</button>';
    UI.modal('הוסף מתפלל', body, footer);
    document.getElementById('saveBtn').addEventListener('click', _saveMember);
  }

  async function _saveMember() {
    const form = document.getElementById('memForm');
    const data = UTIL.formData(form);
    if (!data.first_name) { UI.toast('שם פרטי חובה', 'warning'); return; }
    try {
      await API.write('addMember', data);
      UI.toast('נוסף', 'success');
      UI.closeModal();
      await _loadAll();
    } catch (e) { UI.toast('שגיאה: ' + e.message, 'danger'); }
  }

  return { render: render };
})();
