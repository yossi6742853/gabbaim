// API — thin wrapper that mirrors the original backend interface,
// but everything runs locally against DB (localStorage).
// Pages call API.read / API.write — they don't care it's local.

const API = (function() {

  // Members ---------------------------------------------------------------

  function listMembers(args) {
    args = args || {};
    let all = DB.list('members');
    if (args.synagogue_id) {
      all = all.filter(function(m) {
        if (m.primary_synagogue_id === args.synagogue_id) return true;
        const also = (m.also_synagogue_ids || '').split(',').map(function(x){ return x.trim(); });
        return also.indexOf(args.synagogue_id) >= 0;
      });
    }
    if (args.status) all = all.filter(function(m) { return m.status === args.status; });
    if (args.tribe) all = all.filter(function(m) { return m.tribe === args.tribe; });
    if (args.search) {
      const q = String(args.search).toLowerCase();
      all = all.filter(function(m) {
        return ((m.first_name || '') + ' ' + (m.last_name || '')).toLowerCase().indexOf(q) >= 0;
      });
    }
    return all;
  }

  function getMember(args) { return DB.findById('members', args.id); }

  function addMember(args) {
    if (!args.first_name) throw new Error('שם פרטי חובה');
    if (!args.tribe) args.tribe = 'ישראל';
    if (!args.status) args.status = 'active';
    return DB.insert('members', args);
  }

  function updateMember(args) {
    if (!args.id) throw new Error('id חובה');
    const id = args.id;
    const patch = Object.assign({}, args);
    delete patch.id;
    return DB.update('members', id, patch);
  }

  function deleteMember(args) { return DB.remove('members', args.id); }

  function searchMembersByName(args) {
    const q = String(args.q || '').trim();
    if (!q) return [];
    const all = DB.list('members');
    const ql = q.toLowerCase();
    return all.filter(function(m) {
      const full = ((m.first_name || '') + ' ' + (m.last_name || '') + ' ' + (m.father_name || '')).toLowerCase();
      return full.indexOf(ql) >= 0;
    }).slice(0, 50);
  }

  function memberLastAliyah(memberId) {
    const mine = DB.list('aliyot').filter(function(a) { return String(a.member_id) === String(memberId); });
    if (!mine.length) return null;
    mine.sort(function(a, b) { return String(b.date).localeCompare(String(a.date)); });
    return mine[0];
  }

  function memberStats(args) {
    const id = args.id;
    const aliyot = DB.list('aliyot').filter(function(a) { return String(a.member_id) === String(id); });
    aliyot.sort(function(a, b) { return String(b.date).localeCompare(String(a.date)); });
    const now = new Date();
    const thirty = new Date(now - 30 * 86400000).toISOString().substring(0, 10);
    const ninety = new Date(now - 90 * 86400000).toISOString().substring(0, 10);
    const year = new Date(now - 365 * 86400000).toISOString().substring(0, 10);
    return {
      total: aliyot.length,
      last_30: aliyot.filter(function(a) { return String(a.date) >= thirty; }).length,
      last_90: aliyot.filter(function(a) { return String(a.date) >= ninety; }).length,
      last_year: aliyot.filter(function(a) { return String(a.date) >= year; }).length,
      last_aliyah: aliyot[0] || null,
      recent: aliyot.slice(0, 20)
    };
  }

  // Aliyot ----------------------------------------------------------------

  function logAliyah(args) {
    if (!args.member_id) throw new Error('יש לבחור מתפלל');
    if (!args.synagogue_id) throw new Error('יש לבחור בית כנסת');
    if (!args.date) args.date = new Date().toISOString().substring(0, 10);
    if (!args.channel) args.channel = 'web';
    if (!args.gabbai_id && window.AUTH) args.gabbai_id = AUTH.actorId();
    if (args.event_id) {
      try { DB.update('events', args.event_id, { status: 'done' }); } catch (e) {}
    }
    return DB.insert('aliyot', args);
  }

  function listAliyot(args) {
    args = args || {};
    let all = DB.list('aliyot');
    if (args.synagogue_id) all = all.filter(function(a) { return a.synagogue_id === args.synagogue_id; });
    if (args.from) all = all.filter(function(a) { return String(a.date) >= args.from; });
    if (args.to) all = all.filter(function(a) { return String(a.date) <= args.to; });
    if (args.member_id) all = all.filter(function(a) { return String(a.member_id) === String(args.member_id); });
    if (args.date) all = all.filter(function(a) { return String(a.date) === args.date; });
    all.sort(function(a, b) {
      const c = String(b.date).localeCompare(String(a.date));
      if (c !== 0) return c;
      return (a.aliyah_order || 0) - (b.aliyah_order || 0);
    });
    return all;
  }

  function aliyotForShabbat(args) {
    return DB.list('aliyot').filter(function(a) {
      return String(a.date) === String(args.date) && a.synagogue_id === args.synagogue_id;
    });
  }

  function deleteAliyah(args) { return DB.remove('aliyot', args.id); }

  function lastAliyahPerMember(args) {
    args = args || {};
    let aliyot = DB.list('aliyot');
    if (args.synagogue_id) aliyot = aliyot.filter(function(a) { return a.synagogue_id === args.synagogue_id; });
    const by = {};
    aliyot.forEach(function(a) {
      const d = String(a.date);
      if (!by[a.member_id] || by[a.member_id].date < d) {
        by[a.member_id] = { date: d, aliyah: a };
      }
    });
    return by;
  }

  function suggestForSlot(args) {
    const date = args.date;
    const synId = args.synagogue_id;
    const aliyahName = args.aliyah_name;
    let members = listMembers({ synagogue_id: synId, status: 'active' });
    if (aliyahName === 'כהן') members = members.filter(function(m) { return m.tribe === 'כהן'; });
    else if (aliyahName === 'לוי') members = members.filter(function(m) { return m.tribe === 'לוי'; });
    else members = members.filter(function(m) { return m.tribe === 'ישראל'; });

    const todays = aliyotForShabbat({ date: date, synagogue_id: synId });
    const given = {};
    todays.forEach(function(a) { given[a.member_id] = true; });
    members = members.filter(function(m) { return !given[m.id]; });

    const lastMap = lastAliyahPerMember({ synagogue_id: synId });
    members.forEach(function(m) {
      m._lastDate = (lastMap[m.id] && lastMap[m.id].date) || '0000-00-00';
    });
    members.sort(function(a, b) { return String(a._lastDate).localeCompare(String(b._lastDate)); });
    return members.slice(0, 20);
  }

  // Events ----------------------------------------------------------------

  const EVENT_TYPES = ['יארצייט', 'בר_מצווה', 'חתן', 'ברית', 'אבל_שבעה', 'אבל_שלושים', 'אבל_שנה', 'שמחה', 'חולה', 'גומל', 'אורח', 'אחר'];

  function eventTypes() { return EVENT_TYPES; }

  function listEvents(args) {
    args = args || {};
    let all = DB.list('events');
    if (args.synagogue_id) all = all.filter(function(e) { return e.synagogue_id === args.synagogue_id; });
    if (args.status) all = all.filter(function(e) { return e.status === args.status; });
    if (args.member_id) all = all.filter(function(e) { return String(e.member_id) === String(args.member_id); });
    return all;
  }

  function addEvent(args) {
    if (!args.member_id) throw new Error('בחר מתפלל');
    if (!args.type) throw new Error('בחר סוג אירוע');
    if (!args.status) args.status = 'pending';
    if (args.recurring === undefined) args.recurring = (args.type === 'יארצייט');
    if (!args.synagogue_id) {
      const m = DB.findById('members', args.member_id);
      if (m) args.synagogue_id = m.primary_synagogue_id;
    }
    if (!args.relevant_shabbat && args.hebrew_day && args.hebrew_month) {
      const greg = CAL.hebrewToGregorian({
        day: parseInt(args.hebrew_day),
        month: args.hebrew_month,
        year: CAL.currentHebrewYear()
      });
      if (greg) {
        const d = new Date(greg);
        while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
        args.relevant_shabbat = d.toISOString().substring(0, 10);
      }
    }
    return DB.insert('events', args);
  }

  function updateEvent(args) {
    const id = args.id;
    const patch = Object.assign({}, args);
    delete patch.id;
    return DB.update('events', id, patch);
  }

  function deleteEvent(args) { return DB.remove('events', args.id); }

  function eventsForShabbat(args) {
    const synId = args.synagogue_id;
    const refDate = args.date ? new Date(args.date) : CAL.nextShabbat(new Date());
    const refStr = refDate.toISOString().substring(0, 10);
    const weekStart = new Date(refDate.getTime() - 7 * 86400000).toISOString().substring(0, 10);

    let all = DB.list('events');
    if (synId) all = all.filter(function(e) { return e.synagogue_id === synId; });
    all = all.filter(function(e) { return e.status === 'pending'; });

    const matches = [];
    all.forEach(function(e) {
      if (e.recurring && e.hebrew_day && e.hebrew_month) {
        const heb = CAL.nextHebrewAnniversary({ day: parseInt(e.hebrew_day), month: e.hebrew_month }, refDate);
        if (heb && heb.gregorian) {
          const diff = (new Date(heb.gregorian) - refDate) / 86400000;
          if (diff >= -7 && diff <= 7) {
            e._upcoming = heb.gregorian;
            matches.push(e);
          }
        }
      } else if (e.relevant_shabbat) {
        if (String(e.relevant_shabbat) >= weekStart && String(e.relevant_shabbat) <= refStr) {
          e._upcoming = e.relevant_shabbat;
          matches.push(e);
        }
      }
    });
    const members = DB.list('members');
    const byId = {};
    members.forEach(function(m) { byId[m.id] = m; });
    matches.forEach(function(e) { e._member = byId[e.member_id] || null; });
    return matches;
  }

  // Reports ---------------------------------------------------------------

  function reportRotation(args) {
    const synId = args.synagogue_id;
    const members = listMembers({ synagogue_id: synId, status: 'active' });
    const lastMap = lastAliyahPerMember({ synagogue_id: synId });
    members.forEach(function(m) {
      m.last_aliyah_date = (lastMap[m.id] && lastMap[m.id].date) || '—';
      m.days_since = lastMap[m.id] ? Math.floor((new Date() - new Date(lastMap[m.id].date)) / 86400000) : 9999;
    });
    members.sort(function(a, b) { return b.days_since - a.days_since; });
    return members;
  }

  function reportFairness(args) {
    const synId = args.synagogue_id;
    const months = args.months || 6;
    const since = new Date();
    since.setMonth(since.getMonth() - months);
    const sinceStr = since.toISOString().substring(0, 10);
    let aliyot = DB.list('aliyot');
    if (synId) aliyot = aliyot.filter(function(a) { return a.synagogue_id === synId; });
    aliyot = aliyot.filter(function(a) { return String(a.date) >= sinceStr; });
    const byMember = {};
    aliyot.forEach(function(a) { byMember[a.member_id] = (byMember[a.member_id] || 0) + 1; });
    const members = listMembers({ synagogue_id: synId, status: 'active' });
    members.forEach(function(m) { m.count = byMember[m.id] || 0; });
    members.sort(function(a, b) { return b.count - a.count; });
    return { members: members, period_months: months };
  }

  function reportOpenObligations(args) {
    return listEvents({ synagogue_id: args.synagogue_id, status: 'pending' });
  }

  function reportShabbatRecap(args) {
    const aliyot = aliyotForShabbat({ date: args.date, synagogue_id: args.synagogue_id });
    const members = DB.list('members');
    const byId = {};
    members.forEach(function(m) { byId[m.id] = m; });
    aliyot.forEach(function(a) { a._member = byId[a.member_id] || null; });
    return aliyot;
  }

  function reportTribes(args) {
    const members = listMembers({ synagogue_id: args.synagogue_id, status: 'active' });
    const r = { 'כהן': [], 'לוי': [], 'ישראל': [] };
    members.forEach(function(m) { if (r[m.tribe]) r[m.tribe].push(m); });
    return {
      cohen: r['כהן'], levi: r['לוי'], israel: r['ישראל'],
      counts: { cohen: r['כהן'].length, levi: r['לוי'].length, israel: r['ישראל'].length }
    };
  }

  function reportLongAbsent(args) {
    const synId = args.synagogue_id;
    const days = args.days || 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().substring(0, 10);
    const lastMap = lastAliyahPerMember({ synagogue_id: synId });
    const members = listMembers({ synagogue_id: synId, status: 'active' });
    return members.filter(function(m) {
      const last = lastMap[m.id];
      return !last || String(last.date) < cutoffStr;
    }).map(function(m) {
      const last = lastMap[m.id];
      m.last_aliyah_date = last ? last.date : 'מעולם לא';
      return m;
    });
  }

  function dashboardSummary(args) {
    const synId = args.synagogue_id || 'sg1';
    const shabbat = CAL.thisWeekShabbat({});
    const obligations = eventsForShabbat({ synagogue_id: synId, date: shabbat.date });
    const longAbsent = reportLongAbsent({ synagogue_id: synId, days: 90 });
    const tribes = reportTribes({ synagogue_id: synId });
    const members = listMembers({ synagogue_id: synId, status: 'active' });
    const recent = listAliyot({ synagogue_id: synId }).slice(0, 10);
    const memMap = {};
    members.forEach(function(m) { memMap[m.id] = m; });
    recent.forEach(function(a) { a._member = memMap[a.member_id] || null; });

    const thirty = new Date();
    thirty.setDate(thirty.getDate() - 30);
    const thirtyStr = thirty.toISOString().substring(0, 10);
    const aliyot30 = DB.list('aliyot').filter(function(a) {
      return a.synagogue_id === synId && String(a.date) >= thirtyStr;
    });

    return {
      shabbat: shabbat,
      obligations: obligations,
      long_absent_top: longAbsent.slice(0, 5),
      tribes_count: tribes.counts,
      members_total: members.length,
      aliyot_last_30: aliyot30.length,
      recent_aliyot: recent
    };
  }

  // Synagogues / Gabbais --------------------------------------------------

  function listSynagogues() { return DB.list('synagogues'); }
  function listGabbais() { return DB.list('gabbais'); }
  function addGabbai(args) { return DB.insert('gabbais', Object.assign({ status: 'active' }, args)); }
  function deleteGabbai(args) { return DB.remove('gabbais', args.id); }
  function addSynagogue(args) {
    if (!args.name) throw new Error('שם בית כנסת חובה');
    return DB.insert('synagogues', args);
  }
  function updateSynagogue(args) {
    const id = args.id;
    const patch = Object.assign({}, args);
    delete patch.id;
    return DB.update('synagogues', id, patch);
  }
  function deleteSynagogue(args) { return DB.remove('synagogues', args.id); }

  // Calendar passthroughs -------------------------------------------------

  function thisWeekShabbat(args) { return CAL.thisWeekShabbat(args); }
  function dayInfo(args) { return CAL.dayInfo(args && args.date); }

  // Dispatch --------------------------------------------------------------

  const HANDLERS = {
    listMembers, getMember, addMember, updateMember, deleteMember,
    searchMembersByName, memberStats,
    logAliyah, listAliyot, aliyotForShabbat, deleteAliyah,
    lastAliyahPerMember, suggestForSlot,
    eventTypes, listEvents, addEvent, updateEvent, deleteEvent, eventsForShabbat,
    reportRotation, reportFairness, reportOpenObligations, reportShabbatRecap,
    reportTribes, reportLongAbsent, dashboardSummary,
    listSynagogues, listGabbais, addGabbai, deleteGabbai,
    addSynagogue, updateSynagogue, deleteSynagogue,
    thisWeekShabbat, dayInfo
  };

  // The async wrappers — pages call read/write
  function read(action, args) {
    return new Promise(function(resolve, reject) {
      try {
        const fn = HANDLERS[action];
        if (typeof fn !== 'function') throw new Error('פעולה לא ידועה: ' + action);
        // Allow the UI's skeletons to render once before sync compute (improves perceived perf)
        Promise.resolve().then(function() {
          try { resolve(fn(args || {})); }
          catch (e) { reject(e); }
        });
      } catch (e) { reject(e); }
    });
  }

  // Actions classified as writes — used for audit
  const WRITE_ACTIONS = {
    addMember: 1, updateMember: 1, deleteMember: 1,
    logAliyah: 1, deleteAliyah: 1, updateAliyah: 1,
    addEvent: 1, updateEvent: 1, deleteEvent: 1,
    addGabbai: 1, deleteGabbai: 1,
    addSynagogue: 1, updateSynagogue: 1, deleteSynagogue: 1
  };

  function write(action, args) {
    return read(action, args).then(function(result) {
      // Audit: record who did what
      try {
        if (WRITE_ACTIONS[action] && window.AUTH) {
          DB.audit({
            actor: AUTH.actorName() || 'anonymous',
            actor_id: AUTH.actorId() || '',
            action: action,
            entity: _entityFor(action),
            entity_id: (result && result.id) || (args && args.id) || '',
            summary: _summary(action, args, result)
          });
        }
      } catch (e) { console.warn('audit dispatch failed', e); }
      // Fire-and-forget sync
      try { if (window.SYNC) SYNC.scheduleSync(); } catch (e) {}
      return result;
    });
  }

  function _entityFor(action) {
    if (action.indexOf('Member') >= 0) return 'members';
    if (action.indexOf('Aliyah') >= 0) return 'aliyot';
    if (action.indexOf('Event') >= 0) return 'events';
    if (action.indexOf('Gabbai') >= 0) return 'gabbais';
    if (action.indexOf('Synagogue') >= 0) return 'synagogues';
    return 'unknown';
  }

  function _summary(action, args, result) {
    if (action === 'logAliyah') {
      const m = DB.findById('members', args.member_id) || {};
      return (args.aliyah_name || '') + ' → ' + (m.first_name || '') + ' ' + (m.last_name || '');
    }
    if (action === 'addMember') return (args.first_name || '') + ' ' + (args.last_name || '');
    if (action === 'addEvent') {
      const m = DB.findById('members', args.member_id) || {};
      return (args.type || '') + ' — ' + (m.first_name || '') + ' ' + (m.last_name || '');
    }
    return '';
  }

  function isOnline() { return true; }
  function onConnectivityChange() {}

  return {
    read: read,
    write: write,
    isOnline: isOnline,
    onConnectivityChange: onConnectivityChange,
    HANDLERS: HANDLERS
  };
})();
