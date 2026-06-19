// Authentication — gabbai login by name + PIN
// Session stored in localStorage; per device. No expiry by default.

const AUTH = (function() {
  const KEY = 'gabbai_session_v1';
  const _listeners = [];

  function _load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function _save(s) {
    try {
      if (s) localStorage.setItem(KEY, JSON.stringify(s));
      else localStorage.removeItem(KEY);
    } catch (e) {}
    _emit();
  }
  function _emit() {
    _listeners.forEach(function(fn) { try { fn(currentGabbai()); } catch (e) {} });
  }

  function currentGabbai() { return _load(); }
  function isLoggedIn() { return !!_load(); }

  function onChange(fn) { _listeners.push(fn); }

  // Verify a gabbai exists and PIN matches. Returns the gabbai row or null.
  function _verify(gabbaiId, pin) {
    const gabs = DB.list('gabbais');
    const g = gabs.find(function(x) { return x.id === gabbaiId; });
    if (!g) return null;
    if (g.status === 'inactive') return null;
    if (String(g.pin_code) !== String(pin)) return null;
    return g;
  }

  function login(gabbaiId, pin) {
    const g = _verify(gabbaiId, pin);
    if (!g) return { ok: false, error: 'שם משתמש או קוד שגויים' };
    const session = {
      gabbai_id: g.id,
      name: g.name,
      role: g.role,
      synagogue_id: g.synagogue_id,
      logged_in_at: new Date().toISOString()
    };
    _save(session);
    return { ok: true, session: session };
  }

  function logout() { _save(null); }

  // Returns the active gabbai_id for audit logging, or null
  function actorId() {
    const s = _load();
    return s ? s.gabbai_id : null;
  }

  function actorName() {
    const s = _load();
    return s ? s.name : null;
  }

  function isSuperAdmin() {
    const s = _load();
    return s && s.role === 'super_admin';
  }

  return {
    currentGabbai: currentGabbai,
    isLoggedIn: isLoggedIn,
    isSuperAdmin: isSuperAdmin,
    login: login,
    logout: logout,
    onChange: onChange,
    actorId: actorId,
    actorName: actorName
  };
})();
