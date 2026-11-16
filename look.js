'use strict';
/* Fokusdex – utseendet (lys eller mørk, og fargesettet). Lastes i <head> før stilarket, så siden tegnes riktig med en gang.
   Valget ligger per enhet (localStorage), ikke i lagringen: telefonen kan være mørk mens Mac-en er lys.
   t: 'auto' (følger enheten, standard), 'light' eller 'dark' · c: 'dusk' (standard), 'night' (mørkere) eller 'sage'. Fargene selv står
   i style.css; bar er fargen på statuslinja i mørk og lys modus. */
const LOOK = {
  K: 'fokusdex.look',
  COLORS: { dusk: { n: 'Dusk', bar: ['#1a1729', '#efedf7'] }, night: { n: 'Night', bar: ['#121117', '#f2f1f5'] }, sage: { n: 'Sage', bar: ['#1a1814', '#f1eee4'] } },
  get() { let o = null; try { o = JSON.parse(localStorage.getItem(LOOK.K)); } catch (_) {} o = o || {}; return { t: o.t === 'light' || o.t === 'dark' ? o.t : 'auto', c: LOOK.COLORS[o.c] ? o.c : 'dusk' }; },
  sys() { try { return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; } catch (_) { return 'dark'; } },
  /* Det som faktisk vises nå: { t: 'light' | 'dark', c } */
  now() { const o = LOOK.get(); return { t: o.t === 'auto' ? LOOK.sys() : o.t, c: o.c }; },
  apply() {
    const o = LOOK.now(), r = document.documentElement; r.dataset.theme = o.t; r.dataset.color = o.c;
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', LOOK.COLORS[o.c].bar[o.t === 'light' ? 1 : 0]);
  },
  set(k, v) { const o = LOOK.get(); o[k] = v; try { localStorage.setItem(LOOK.K, JSON.stringify(o)); } catch (_) {} LOOK.apply(); }
};
LOOK.apply();
try { matchMedia('(prefers-color-scheme: light)').addEventListener('change', LOOK.apply); } catch (_) {}
