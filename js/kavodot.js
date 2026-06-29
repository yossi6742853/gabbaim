// Kavodot (כיבודים) catalog — what slots exist for each day type
//
// Each kavod has:
//   id:        stable identifier (used as aliyah_name in DB for backward-compat)
//   cat:       category — 'opening' | 'aliyah' | 'lift' | 'wrap' | 'reading' | 'closing' | 'special'
//   tribe:     'כהן' | 'לוי' | 'ישראל' | null (no tribe constraint)
//   required:  is this kavod almost always assigned? (used for UI emphasis)
//   note:      hover hint

const KAVODOT = (function() {

  function _ali(name, tribe) {
    return { id: name, cat: 'aliyah', tribe: tribe, required: true };
  }

  function _open(name, note) { return { id: name, cat: 'opening', tribe: null, required: false, note: note || '' }; }
  function _close(name, note) { return { id: name, cat: 'closing', tribe: null, required: false, note: note || '' }; }
  function _lift(name) { return { id: name, cat: 'lift', tribe: null, required: true }; }
  function _wrap(name) { return { id: name, cat: 'wrap', tribe: null, required: true }; }
  function _read(name) { return { id: name, cat: 'reading', tribe: null, required: false }; }
  function _spc(name, note) { return { id: name, cat: 'special', tribe: null, required: false, note: note || '' }; }

  // The 8 standard shabbat aliyot
  const SHABBAT_ALIYOT = [
    _ali('כהן',    'כהן'),
    _ali('לוי',    'לוי'),
    _ali('שלישי',  'ישראל'),
    _ali('רביעי',  'ישראל'),
    _ali('חמישי',  'ישראל'),
    _ali('שישי',   'ישראל'),
    _ali('שביעי',  'ישראל'),
    _ali('מפטיר',  'ישראל')
  ];

  // Mincha (Shabbat afternoon) kavodot
  const MINCHA_SHABBAT = [
    _open('פתיחת ארון — מנחה'),
    _open('הוצאת ספר תורה — מנחה'),
    _ali('כהן (מנחה)', 'כהן'),
    _ali('לוי (מנחה)', 'לוי'),
    _ali('שלישי (מנחה)', 'ישראל'),
    _lift('הגבהה (מנחה)'),
    _wrap('גלילה (מנחה)'),
    _close('הכנסת ספר תורה — מנחה'),
    _spc('חזן מנחה')
  ];

  const SHABBAT = [
    _open('פתיחה לפסוקי דזמרא', 'אופציונלי — אצל חלק'),
    _spc('אנעים זמירות'),
    _open('פתיחת ארון — הוצאה'),
    _open('הוצאת ספר תורה'),
  ].concat(SHABBAT_ALIYOT).concat([
    _lift('הגבהה'),
    _wrap('גלילה'),
    _read('הפטרה'),
    _close('הכנסת ספר תורה'),
    _open('פתיחת ארון — מוסף'),
    _spc('חזן מוסף')
  ]).concat(MINCHA_SHABBAT);

  const SHABBAT_2_TORAHS = [
    _open('פתיחת ארון — הוצאה'),
    _open('הוצאת ספר תורה ראשון'),
    _open('הוצאת ספר תורה שני')
  ].concat(SHABBAT_ALIYOT).concat([
    _lift('הגבהה ראשונה'),
    _wrap('גלילה ראשונה'),
    _lift('הגבהה שנייה (מפטיר)'),
    _wrap('גלילה שנייה'),
    _read('הפטרה'),
    _close('הכנסת ספרי תורה'),
    _spc('חזן מוסף')
  ]).concat(MINCHA_SHABBAT);

  const WEEKDAY = [
    _open('פתיחת ארון'),
    _open('הוצאת ספר תורה'),
    _ali('כהן', 'כהן'),
    _ali('לוי', 'לוי'),
    _ali('שלישי', 'ישראל'),
    _lift('הגבהה'),
    _wrap('גלילה'),
    _close('הכנסת ספר תורה')
  ];

  const ROSH_CHODESH = [
    _open('פתיחת ארון'),
    _open('הוצאת ספר תורה'),
    _ali('כהן',    'כהן'),
    _ali('לוי',    'לוי'),
    _ali('שלישי',  'ישראל'),
    _ali('רביעי',  'ישראל'),
    _lift('הגבהה'),
    _wrap('גלילה'),
    _close('הכנסת ספר תורה'),
    _spc('חזן מוסף')
  ];

  // Fast day - Mincha (afternoon prayer with Torah reading + haftarah)
  const FAST_MINCHA = [
    _open('פתיחת ארון — מנחה'),
    _open('הוצאת ספר תורה — מנחה'),
    _ali('כהן (מנחה)', 'כהן'),
    _ali('לוי (מנחה)', 'לוי'),
    _ali('מפטיר (מנחה)', 'ישראל'),
    _lift('הגבהה (מנחה)'),
    _wrap('גלילה (מנחה)'),
    _read('הפטרה (מנחה)'),
    _close('הכנסת ספר תורה — מנחה'),
    _spc('חזן מנחה')
  ];

  const CHOL_HAMOED = [
    _open('פתיחת ארון'),
    _open('הוצאת ספר תורה'),
    _ali('כהן',    'כהן'),
    _ali('לוי',    'לוי'),
    _ali('שלישי',  'ישראל'),
    _ali('רביעי',  'ישראל'),
    _lift('הגבהה'),
    _wrap('גלילה'),
    _close('הכנסת ספר תורה'),
    _spc('חזן מוסף')
  ];

  const CHANUKAH = [
    _open('פתיחת ארון'),
    _open('הוצאת ספר תורה'),
    _ali('כהן', 'כהן'),
    _ali('לוי', 'לוי'),
    _ali('שלישי', 'ישראל'),
    _lift('הגבהה'),
    _wrap('גלילה'),
    _close('הכנסת ספר תורה'),
    _spc('מדליק חנוכייה בבית הכנסת')
  ];

  const FAST_DAY = [
    _open('פתיחת ארון'),
    _open('הוצאת ספר תורה'),
    _ali('כהן', 'כהן'),
    _ali('לוי', 'לוי'),
    _ali('שלישי', 'ישראל'),
    _lift('הגבהה'),
    _wrap('גלילה'),
    _close('הכנסת ספר תורה')
  ].concat(FAST_MINCHA);

  const PURIM = [
    _open('פתיחת ארון'),
    _open('הוצאת ספר תורה'),
    _ali('כהן', 'כהן'),
    _ali('לוי', 'לוי'),
    _ali('שלישי', 'ישראל'),
    _lift('הגבהה'),
    _wrap('גלילה'),
    _close('הכנסת ספר תורה'),
    _spc('קריאת המגילה — שחרית'),
    _spc('קריאת המגילה — ליל')
  ];

  const YOM_TOV = [
    _open('פתיחת ארון — הוצאה'),
    _open('הוצאת ספר תורה ראשון'),
    _open('הוצאת ספר תורה שני (מפטיר)'),
    _ali('כהן',    'כהן'),
    _ali('לוי',    'לוי'),
    _ali('שלישי',  'ישראל'),
    _ali('רביעי',  'ישראל'),
    _ali('חמישי',  'ישראל'),
    _ali('מפטיר',  'ישראל'),
    _lift('הגבהה ראשונה'),
    _wrap('גלילה ראשונה'),
    _lift('הגבהה שנייה'),
    _wrap('גלילה שנייה'),
    _read('הפטרה'),
    _close('הכנסת ספרי תורה'),
    _spc('חזן מוסף'),
    _spc('חזן מנחה')
  ];

  const YOM_KIPPUR = [
    _open('פתיחת ארון — כל נדרי'),
    _spc('כל נדרי'),
    _open('פתיחת ארון — שחרית'),
    _open('הוצאת ספר תורה'),
    _ali('כהן',    'כהן'),
    _ali('לוי',    'לוי'),
    _ali('שלישי',  'ישראל'),
    _ali('רביעי',  'ישראל'),
    _ali('חמישי',  'ישראל'),
    _ali('שישי',   'ישראל'),
    _ali('מפטיר',  'ישראל'),
    _lift('הגבהה'),
    _wrap('גלילה'),
    _read('הפטרה (יונה)'),
    _close('הכנסת ספר תורה'),
    _spc('פתיחת ארון — נעילה'),
    _spc('חזן נעילה')
  ];

  const MAP = {
    shabbat: SHABBAT,
    shabbat_special: SHABBAT_2_TORAHS,
    weekday_no_torah: [],
    sheni_chamishi: WEEKDAY,
    rosh_chodesh: ROSH_CHODESH,
    chol_hamoed: CHOL_HAMOED,
    chanukah: CHANUKAH,
    fast: FAST_DAY,
    purim: PURIM,
    yom_tov: YOM_TOV,
    yom_kippur: YOM_KIPPUR
  };

  // Group kavodot by category for the UI
  const CATEGORY_LABELS = {
    opening: { label: 'פתיחות', icon: 'bi-door-open', color: '#0ea5e9' },
    aliyah:  { label: 'עליות לתורה', icon: 'bi-book', color: '#1e40af' },
    lift:    { label: 'הגבהה',  icon: 'bi-arrow-up-circle', color: '#7c3aed' },
    wrap:    { label: 'גלילה',  icon: 'bi-bandaid', color: '#7c3aed' },
    reading: { label: 'הפטרה / קריאה', icon: 'bi-card-text', color: '#10b981' },
    closing: { label: 'הכנסת ספר תורה', icon: 'bi-door-closed', color: '#0ea5e9' },
    special: { label: 'תפקידים מיוחדים', icon: 'bi-stars', color: '#f59e0b' }
  };

  const CATEGORY_ORDER = ['opening', 'aliyah', 'lift', 'wrap', 'reading', 'closing', 'special'];

  function forDayType(type) {
    return MAP[type] || [];
  }

  function grouped(type) {
    const list = forDayType(type);
    const groups = {};
    CATEGORY_ORDER.forEach(function(c) { groups[c] = []; });
    list.forEach(function(k) {
      if (!groups[k.cat]) groups[k.cat] = [];
      groups[k.cat].push(k);
    });
    return CATEGORY_ORDER
      .filter(function(c) { return groups[c].length > 0; })
      .map(function(c) {
        return {
          category: c,
          info: CATEGORY_LABELS[c],
          items: groups[c]
        };
      });
  }

  return {
    forDayType: forDayType,
    grouped: grouped,
    CATEGORY_LABELS: CATEGORY_LABELS,
    CATEGORY_ORDER: CATEGORY_ORDER
  };
})();
