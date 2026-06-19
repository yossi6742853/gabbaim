// Application bootstrap

(function() {
  function _setBootHint(s) {
    const el = document.getElementById('bootLoader');
    if (el) {
      const p = el.querySelector('p');
      if (p) p.textContent = s;
    }
  }

  function _updateSyncBadge(status, error) {
    const badge = document.getElementById('syncBadge');
    if (!badge) return;
    const map = {
      idle:    { cls: 'bg-success', icon: 'bi-cloud-check', title: 'מסונכרן' },
      syncing: { cls: 'bg-info', icon: 'bi-arrow-repeat', title: 'מסנכרן…' },
      offline: { cls: 'bg-warning', icon: 'bi-wifi-off', title: 'אופליין — שמור מקומית' },
      error:   { cls: 'bg-danger', icon: 'bi-exclamation-circle', title: 'שגיאת סנכרון: ' + (error || '') },
      no_pat:  { cls: 'bg-secondary', icon: 'bi-cloud-slash', title: 'לא מסונכרן — הזן GitHub PAT בהגדרות' }
    };
    const conf = map[status] || map.no_pat;
    badge.className = 'badge ms-2 ' + conf.cls;
    badge.innerHTML = '<i class="bi ' + conf.icon + '"></i>';
    badge.title = conf.title;
    badge.style.cursor = 'pointer';
    badge.onclick = function() { window.location.hash = '#/settings'; };
  }

  async function boot() {
    try {
      _setBootHint('טוען מסד נתונים מקומי…');
      DB.init();

      _setBootHint('מושך נתונים מ-GitHub…');
      try { await SYNC.pullOnly(); } catch (e) { console.warn('initial pull failed', e); }

      _setBootHint('מעלה ממשק…');
      await STATE.initSynagogues();

      STATE.onChange(function(key) {
        if (key === 'synagogues' || key === 'currentSynagogueId') UI.renderSynSelector();
      });
      AUTH.onChange(function() { UI.renderUserMenu(); });

      UI.renderSynSelector();
      UI.renderUserMenu();
      SYNC.onStatusChange(_updateSyncBadge);
      _updateSyncBadge(SYNC.getStatus().status, SYNC.getStatus().error);

      document.querySelectorAll('#navLinks .nav-link').forEach(function(a) {
        a.addEventListener('click', function() {
          const collapse = document.getElementById('mainNav');
          if (collapse && collapse.classList.contains('show')) {
            bootstrap.Collapse.getInstance(collapse)?.hide();
          }
        });
      });

      ROUTER.init();
      SYNC.start();

      // Auto-sync when window regains focus / network returns
      window.addEventListener('online', function() { SYNC.syncNow(); });
      window.addEventListener('focus', function() { SYNC.syncNow(); });

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(function() {});
      }
    } catch (e) {
      console.error('Boot failed', e);
      document.getElementById('app').innerHTML = UI.errorState(
        'שגיאת אתחול: ' + e.message,
        function() { window.location.reload(); }
      );
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
