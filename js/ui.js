// UI primitives — modals, toasts, skeletons, common patterns

const UI = (function() {
  function toast(msg, type) {
    type = type || 'info';
    const colors = {
      success: 'bg-success text-white',
      danger: 'bg-danger text-white',
      warning: 'bg-warning text-dark',
      info: 'bg-info text-dark'
    };
    const icons = {
      success: 'bi-check-circle-fill',
      danger: 'bi-exclamation-triangle-fill',
      warning: 'bi-exclamation-circle-fill',
      info: 'bi-info-circle-fill'
    };
    const id = 'toast_' + Date.now();
    const html = '<div id="' + id + '" class="toast align-items-center ' + colors[type] + ' border-0 mb-2" role="alert">' +
      '<div class="d-flex">' +
      '<div class="toast-body"><i class="bi ' + icons[type] + '"></i> ' + UTIL.escHtml(msg) + '</div>' +
      '<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>' +
      '</div></div>';
    const container = document.getElementById('toastContainer');
    container.insertAdjacentHTML('beforeend', html);
    const el = document.getElementById(id);
    const t = new bootstrap.Toast(el, { delay: 4500 });
    t.show();
    el.addEventListener('hidden.bs.toast', function() { el.remove(); });
  }

  function confirm(msg, title) {
    return new Promise(function(resolve) {
      const body = '<p class="mb-0">' + UTIL.escHtml(msg) + '</p>';
      const footer = '<button class="btn btn-secondary" data-bs-dismiss="modal">ביטול</button>' +
        '<button class="btn btn-danger" id="cnfYes">אישור</button>';
      const m = modal(title || 'אישור', body, footer);
      document.getElementById('cnfYes').addEventListener('click', function() {
        m.hide();
        resolve(true);
      });
      document.getElementById('appModal').addEventListener('hidden.bs.modal', function once() {
        resolve(false);
      }, { once: true });
    });
  }

  function modal(title, bodyHtml, footerHtml) {
    const html = '<div class="modal fade" id="appModal" tabindex="-1" aria-modal="true">' +
      '<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<h5 class="modal-title">' + UTIL.escHtml(title) + '</h5>' +
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="סגור"></button>' +
      '</div>' +
      '<div class="modal-body">' + bodyHtml + '</div>' +
      (footerHtml ? '<div class="modal-footer">' + footerHtml + '</div>' : '') +
      '</div></div></div>';
    document.getElementById('modalRoot').innerHTML = html;
    const el = document.getElementById('appModal');
    const m = new bootstrap.Modal(el);
    m.show();
    el.addEventListener('hidden.bs.modal', function() { el.remove(); });
    return m;
  }

  function closeModal() {
    const el = document.getElementById('appModal');
    if (el) bootstrap.Modal.getInstance(el)?.hide();
  }

  function skeleton(height) {
    return '<div class="skeleton" style="height:' + (height || 200) + 'px;"></div>';
  }

  function emptyState(msg, icon) {
    return '<div class="empty-state">' +
      '<i class="bi ' + (icon || 'bi-inbox') + '"></i>' +
      '<p class="mt-2 mb-0">' + UTIL.escHtml(msg) + '</p>' +
      '</div>';
  }

  function errorState(msg, retryCb) {
    const id = 'retry_' + Date.now();
    const html = '<div class="empty-state text-danger">' +
      '<i class="bi bi-exclamation-triangle-fill"></i>' +
      '<p class="mt-2 mb-2">' + UTIL.escHtml(msg) + '</p>' +
      (retryCb ? '<button id="' + id + '" class="btn btn-outline-primary btn-sm"><i class="bi bi-arrow-clockwise"></i> נסה שוב</button>' : '') +
      '</div>';
    setTimeout(function() {
      const b = document.getElementById(id);
      if (b && retryCb) b.addEventListener('click', retryCb);
    }, 0);
    return html;
  }

  function statCard(label, value, icon, klass) {
    return '<div class="col-6 col-md-3 col-lg-3">' +
      '<div class="stat-card ' + (klass || '') + '">' +
      '<div class="d-flex justify-content-between align-items-start">' +
      '<div><div class="stat-value">' + UTIL.escHtml(value) + '</div>' +
      '<div class="stat-label">' + UTIL.escHtml(label) + '</div></div>' +
      '<i class="bi ' + icon + '" style="font-size:2rem;opacity:0.4;"></i>' +
      '</div></div></div>';
  }

  function setActiveNav(route) {
    document.querySelectorAll('#navLinks .nav-link').forEach(function(a) {
      a.classList.toggle('active', a.dataset.route === route);
    });
  }

  function renderUserMenu() {
    const wrap = document.getElementById('userMenu');
    if (!wrap) return;
    const g = AUTH.currentGabbai();
    if (!g) {
      wrap.innerHTML = '<a href="#/login" class="btn btn-outline-light btn-sm"><i class="bi bi-box-arrow-in-left"></i> כניסה</a>';
      return;
    }
    wrap.innerHTML =
      '<div class="dropdown">' +
      '<button class="btn btn-sm btn-outline-light dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">' +
      '<i class="bi bi-person-circle"></i> ' + UTIL.escHtml(g.name) +
      '</button>' +
      '<ul class="dropdown-menu dropdown-menu-end">' +
      '<li><h6 class="dropdown-header">' + UTIL.escHtml(g.name) +
      ' <small class="text-muted">' + UTIL.escHtml({super_admin:'מנהל על', chief:'גבאי ראשי', secondary:'גבאי משני'}[g.role] || g.role) + '</small></h6></li>' +
      '<li><a class="dropdown-item" href="#/settings"><i class="bi bi-gear"></i> הגדרות</a></li>' +
      '<li><hr class="dropdown-divider"></li>' +
      '<li><a class="dropdown-item text-danger" href="#" id="logoutBtn"><i class="bi bi-box-arrow-right"></i> התנתק</a></li>' +
      '</ul></div>';
    document.getElementById('logoutBtn')?.addEventListener('click', function(ev) {
      ev.preventDefault();
      AUTH.logout();
      UI.toast('התנתקת', 'info');
      window.location.hash = '#/login';
    });
  }

  function renderSynSelector() {
    const sel = document.getElementById('synSelector');
    const syns = STATE.get('synagogues') || [];
    sel.innerHTML = syns.map(function(s) {
      return '<option value="' + UTIL.escAttr(s.id) + '">' + UTIL.escHtml(s.name) + '</option>';
    }).join('');
    sel.value = STATE.get('currentSynagogueId') || '';
    sel.onchange = function() {
      STATE.setCurrentSynagogue(sel.value);
      ROUTER.refresh();
    };
  }

  return {
    toast: toast,
    confirm: confirm,
    modal: modal,
    closeModal: closeModal,
    skeleton: skeleton,
    emptyState: emptyState,
    errorState: errorState,
    statCard: statCard,
    setActiveNav: setActiveNav,
    renderSynSelector: renderSynSelector,
    renderUserMenu: renderUserMenu
  };
})();
