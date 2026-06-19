// LocalDB — pure localStorage database. No backend needed.
// Schema mirrors the original Sheet design.
// All queries are synchronous (it's just localStorage). The API is wrapped in promises
// so the rest of the app keeps its async patterns.

const DB = (function() {
  const STORAGE_KEY = 'gabbai_db_v1';
  const SCHEMA = {
    synagogues: ['id', 'name', 'address', 'nusach', 'notes', 'created_at'],
    members:    ['id', 'first_name', 'last_name', 'tribe', 'father_name', 'phone', 'primary_synagogue_id', 'also_synagogue_ids', 'status', 'notes', 'created_at', 'updated_at'],
    gabbais:    ['id', 'name', 'phone', 'pin_code', 'synagogue_id', 'role', 'status', 'created_at'],
    events:     ['id', 'member_id', 'synagogue_id', 'type', 'hebrew_day', 'hebrew_month', 'hebrew_year_first', 'recurring', 'relevant_shabbat', 'status', 'notes', 'created_at'],
    aliyot:     ['id', 'date', 'hebrew_date', 'synagogue_id', 'day_type', 'parsha_name', 'aliyah_name', 'aliyah_order', 'member_id', 'reason', 'event_id', 'gabbai_id', 'channel', 'notes', 'created_at'],
    settings:   [],
    audit:      []
  };

  let _data = null;
  let _saveTimer = null;

  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('DB load failed', e);
    }
    return null;
  }

  function _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_data));
    } catch (e) {
      console.error('DB save failed', e);
      throw new Error('שמירה נכשלה — ייתכן שזיכרון האחסון מלא');
    }
  }

  function _debouncedSave() {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(_save, 80);
  }

  function _seed() {
    const now = new Date().toISOString();
    return {
      synagogues: [
        { id: 'sg1', name: 'בית כנסת מרכזי', address: 'מעלה עמוס', nusach: 'ספרד', notes: '', created_at: now },
        { id: 'sg2', name: 'בית כנסת שני', address: 'מעלה עמוס', nusach: 'אשכנז', notes: '', created_at: now }
      ],
      members: [],
      gabbais: [
        { id: 'g1', name: 'יוסף שניידר', phone: '', pin_code: '1234', synagogue_id: 'sg1', role: 'super_admin', status: 'active', created_at: now }
      ],
      events: [],
      aliyot: [],
      settings: { default_synagogue: 'sg1', app_version: '1.0' },
      audit: []
    };
  }

  function init() {
    let data = _load();
    if (!data) {
      data = _seed();
      _data = data;
      _save();
    } else {
      // ensure all tables exist (forward-compat)
      const seed = _seed();
      Object.keys(seed).forEach(function(k) {
        if (!(k in data)) data[k] = seed[k];
      });
      _data = data;
    }
    return _data;
  }

  function getRaw() { return _data; }
  function setRaw(newData) { _data = newData; _save(); }

  function _genId(table) {
    return table.substring(0, 3) + '_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  }

  function _now() { return new Date().toISOString(); }

  // Generic CRUD
  function list(table, filterFn) {
    const arr = _data[table] || [];
    if (!filterFn) return arr.slice();
    return arr.filter(filterFn);
  }

  function findById(table, id) {
    return (_data[table] || []).find(function(r) { return String(r.id) === String(id); }) || null;
  }

  function insert(table, obj) {
    obj = Object.assign({}, obj);
    if (!obj.id) obj.id = _genId(table);
    if (!obj.created_at) obj.created_at = _now();
    if (SCHEMA[table] && SCHEMA[table].indexOf('updated_at') >= 0 && !obj.updated_at) obj.updated_at = _now();
    if (!_data[table]) _data[table] = [];
    _data[table].push(obj);
    _save();
    return obj;
  }

  function update(table, id, patch) {
    const arr = _data[table] || [];
    for (let i = 0; i < arr.length; i++) {
      if (String(arr[i].id) === String(id)) {
        arr[i] = Object.assign({}, arr[i], patch);
        if (SCHEMA[table] && SCHEMA[table].indexOf('updated_at') >= 0) arr[i].updated_at = _now();
        _save();
        return arr[i];
      }
    }
    return null;
  }

  function remove(table, id) {
    const arr = _data[table] || [];
    const i = arr.findIndex(function(r) { return String(r.id) === String(id); });
    if (i === -1) return false;
    arr.splice(i, 1);
    _save();
    return true;
  }

  // Export / Import
  function exportJSON() {
    return JSON.stringify(_data, null, 2);
  }

  function importJSON(json) {
    let parsed;
    try {
      parsed = typeof json === 'string' ? JSON.parse(json) : json;
    } catch (e) {
      throw new Error('JSON לא תקין: ' + e.message);
    }
    if (!parsed.synagogues || !parsed.members) {
      throw new Error('קובץ לא מתאים — חסרים בתי כנסת או מתפללים');
    }
    _data = parsed;
    _save();
    return true;
  }

  function resetAll() {
    _data = _seed();
    _save();
  }

  // Audit trail — append an action entry. Caller decides what to capture.
  function audit(entry) {
    try {
      if (!_data) _data = _load() || {};
      if (!_data.audit) _data.audit = [];
      const row = Object.assign({
        id: 'aud_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        ts: new Date().toISOString()
      }, entry || {});
      _data.audit.push(row);
      // Keep only the last 1000 entries to bound the JSON size
      if (_data.audit.length > 1000) _data.audit = _data.audit.slice(-1000);
      _save();
    } catch (e) { console.warn('audit failed', e); }
  }

  function stats() {
    return {
      synagogues: (_data.synagogues || []).length,
      members: (_data.members || []).length,
      gabbais: (_data.gabbais || []).length,
      events: (_data.events || []).length,
      aliyot: (_data.aliyot || []).length,
      bytes: (localStorage.getItem(STORAGE_KEY) || '').length
    };
  }

  return {
    init: init,
    list: list,
    findById: findById,
    insert: insert,
    update: update,
    remove: remove,
    audit: audit,
    getRaw: getRaw,
    setRaw: setRaw,
    exportJSON: exportJSON,
    importJSON: importJSON,
    resetAll: resetAll,
    stats: stats,
    SCHEMA: SCHEMA
  };
})();
