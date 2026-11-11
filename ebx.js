'use strict';
/* Fokusdex – avspiller for angrepsanimasjoner skrevet for Elite Battle DX (EBDX).
   EBDX-animasjonene er små programmer: de lager sprites, flytter dem bilde for bilde, zoomer kameraet og farger Pokémonene.
   Selve animasjonene (og bildene de bruker) ligger i spillerens private ressurspakke, som alt annet spilleren har samlet selv.
   Her ligger bare det som trengs for å spille dem av:
   1. en liten tolk for det utsnittet av språket animasjonene er skrevet i. Den kan bare regne og flytte sprites: ingen filer, ikke noe nett.
   2. de samme byggeklossene som EBDX gir animasjonene (Sprite, Bitmap, Color, Tone, kameravektoren, banen, de to Pokémonene)
   3. et opptak: animasjonen kjøres ferdig med en gang den trengs, og hvert bilde lagres som en liste over hva som skal tegnes hvor
   4. en avspiller som tegner opptaket med WebGL i tre lag (bak begge Pokémonene, mellom dem og foran) og flytter kamera og sprites i takt.
   Koordinatene er EBDX sine: en skjerm på 512 × 384, der motstanderen står oppe til høyre og din egen Pokémon nede til venstre. */
const EBX = (() => {
  const E = { data: null, ok: false, log: [] };

  /* ---------- Verdier ----------
     Heltall er vanlige tall. Desimaltall pakkes i Fl, fordi språket skiller dem (7 / 2 er 3, mens 7 / 2.0 er 3.5).
     nil er null, symboler er Sym, lister er vanlige lister, og oppslagstabeller er RHash. */
  class Fl { constructor(v) { this.v = v; } }
  class Sym { constructor(n) { this.n = n; } }
  class Rng { constructor(a, b, ex) { this.a = a; this.b = b; this.ex = ex; } }
  class Blk { constructor(p, b, sc, self) { this.p = p; this.b = b; this.sc = sc; this.self = self; } }
  class RErr extends Error { }
  const syms = new Map(), sym = n => { let s = syms.get(n); if (!s) syms.set(n, s = new Sym(n)); return s; };
  const F = v => new Fl(v);
  const isN = v => typeof v === 'number' || v instanceof Fl;
  const N = v => typeof v === 'number' ? v : v instanceof Fl ? v.v : v === null || v === undefined ? bad('nil can\'t be coerced into a number') : v === true || v === false ? bad('boolean is not a number') : bad('not a number: ' + show(v));
  const I = v => { const x = N(v); if (!Number.isFinite(x)) bad('number out of range'); return Math.trunc(x); };
  const T = v => v !== null && v !== false && v !== undefined;
  const bad = m => { throw new RErr(m); };
  const show = v => v === null || v === undefined ? 'nil' : v instanceof Fl ? String(v.v) : v instanceof Sym ? ':' + v.n : Array.isArray(v) ? '[' + v.map(show).join(', ') + ']' : typeof v === 'object' ? '#<' + (v.k ? v.k.n : v.constructor.name) + '>' : String(v);
  const str = v => v === null || v === undefined ? '' : v instanceof Fl ? (Number.isInteger(v.v) ? v.v.toFixed(1) : String(v.v)) : v instanceof Sym ? v.n : typeof v === 'string' ? v : Array.isArray(v) ? '[' + v.map(show).join(', ') + ']' : String(v);
  class RHash {
    constructor() { this.m = new Map(); }
    key(k) { return k instanceof Fl ? 'f' + k.v : k; }
    get(k) { const v = this.m.get(this.key(k)); return v === undefined ? null : v[1]; }
    set(k, v) { this.m.set(this.key(k), [k, v]); return v; }
    has(k) { return this.m.has(this.key(k)); }
    del(k) { const kk = this.key(k), v = this.m.get(kk); this.m.delete(kk); return v === undefined ? null : v[1]; }
    keys() { return [...this.m.values()].map(x => x[0]); }
    vals() { return [...this.m.values()].map(x => x[1]); }
  }
  const eq = (a, b) => {
    if (a === b) return true;
    if (isN(a) && isN(b)) return N(a) === N(b);
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => eq(x, b[i]));
    if (a && b && a.k && a.k === b.k && a.k.eq) return a.k.eq(a, b);
    return false;
  };
  /* Tallregning slik språket gjør den: heltall deles nedover, og resten følger fortegnet til deleren. */
  function arith(op, a, b) {
    const fa = a instanceof Fl, fb = b instanceof Fl;
    if (typeof a === 'number' && typeof b === 'number') {
      switch (op) {
        case '+': return a + b; case '-': return a - b; case '*': return a * b;
        case '/': if (b === 0) bad('divided by 0'); return Math.floor(a / b);
        case '%': if (b === 0) bad('divided by 0'); return a - b * Math.floor(a / b);
        case '**': return b >= 0 ? Math.pow(a, b) : F(Math.pow(a, b));
      }
    }
    if ((fa || typeof a === 'number') && (fb || typeof b === 'number')) {
      const x = fa ? a.v : a, y = fb ? b.v : b;
      switch (op) {
        case '+': return F(x + y); case '-': return F(x - y); case '*': return F(x * y); case '/': return F(x / y);
        case '%': return F(x - y * Math.floor(x / y)); case '**': return F(Math.pow(x, y));
      }
    }
    if (typeof a === 'string') { if (op === '+') return a + str(b); if (op === '*') return a.repeat(I(b)); if (op === '%') return a; }
    if (Array.isArray(a)) { if (op === '+') return a.concat(b); if (op === '-') return a.filter(x => !b.some(y => eq(x, y))); if (op === '*') { let o = []; for (let i = 0; i < I(b); i++) o = o.concat(a); return o; } }
    bad(`undefined method '${op}' for ${show(a)} (with ${show(b)})`);
  }
  function cmp(op, a, b) {
    if (isN(a) && isN(b)) { const x = N(a), y = N(b); return op === '<' ? x < y : op === '>' ? x > y : op === '<=' ? x <= y : x >= y; }
    if (typeof a === 'string' && typeof b === 'string') return op === '<' ? a < b : op === '>' ? a > b : op === '<=' ? a <= b : a >= b;
    bad(`comparison of ${show(a)} with ${show(b)} failed`);
  }

  /* ---------- Klasser ----------
     En klasse er en tabell med metoder (m) og klassemetoder (s). Objekter er vanlige objekter med feltet k = klassen. */
  const classes = {};
  function cls(n, parent) { const c = { n, parent: parent || null, m: Object.create(parent ? parent.m : null), s: Object.create(parent ? parent.s : null) }; classes[n] = c; return c; }
  const isA = (o, c) => { for (let k = o && o.k; k; k = k.parent) if (k === c) return true; return false; };
  /* Egenskaper med typen de har i spillmotoren: heltall kuttes (ikke avrundes), og dekkevne holder seg mellom 0 og 255. */
  const aInt = (c, n, f) => { f = f || n; c.m[n] = o => o[f]; c.m[n + '='] = (o, a) => { o[f] = I(a[0]); return a[0]; }; };
  const aFlt = (c, n, f) => { f = f || n; c.m[n] = o => F(o[f]); c.m[n + '='] = (o, a) => { o[f] = N(a[0]); return a[0]; }; };
  const aAny = (c, n, f) => { f = f || n; c.m[n] = o => o[f] === undefined ? null : o[f]; c.m[n + '='] = (o, a) => { o[f] = a[0]; return a[0]; }; };
  const aBool = (c, n, f) => { f = f || n; c.m[n] = o => o[f]; c.m[n + '='] = (o, a) => { o[f] = T(a[0]); return a[0]; }; };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  const KColor = cls('Color'), KTone = cls('Tone'), KRect = cls('Rect'), KBitmap = cls('Bitmap'), KViewport = cls('Viewport'), KSprite = cls('Sprite');
  const mkColor = (r, g, b, a) => ({ k: KColor, r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a: clamp(a === undefined ? 255 : a, 0, 255) });
  const mkTone = (r, g, b, y) => ({ k: KTone, r: clamp(r, -255, 255), g: clamp(g, -255, 255), b: clamp(b, -255, 255), y: clamp(y || 0, 0, 255) });
  const mkRect = (x, y, w, h) => ({ k: KRect, x, y, w, h });
  KColor.s.new = a => {
    if (a.length === 1) { let h = typeof a[0] === 'string' ? a[0].replace('#', '') : I(a[0]).toString(16); return mkColor(parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0); }
    if (a.length < 3) bad('wrong number of arguments for Color.new');
    return mkColor(N(a[0]), N(a[1]), N(a[2]), a.length > 3 ? N(a[3]) : 255);
  };
  for (const [n, c] of Object.entries({ red: [255, 0, 0], green: [0, 255, 0], blue: [0, 0, 255], black: [0, 0, 0], white: [255, 255, 255], yellow: [255, 255, 0], orange: [255, 155, 0], purple: [155, 0, 255], brown: [112, 72, 32], teal: [0, 255, 255], magenta: [255, 0, 255] })) KColor.s[n] = () => mkColor(c[0], c[1], c[2]);
  for (const [n, f, lo] of [['red', 'r', 0], ['green', 'g', 0], ['blue', 'b', 0], ['alpha', 'a', 0]]) { KColor.m[n] = o => F(o[f]); KColor.m[n + '='] = (o, a) => { o[f] = clamp(N(a[0]), lo, 255); return a[0]; }; }
  KColor.m.set = (o, a) => { if (a.length === 1 && isA(a[0], KColor)) { o.r = a[0].r; o.g = a[0].g; o.b = a[0].b; o.a = a[0].a; } else { o.r = clamp(N(a[0]), 0, 255); o.g = clamp(N(a[1]), 0, 255); o.b = clamp(N(a[2]), 0, 255); o.a = a.length > 3 ? clamp(N(a[3]), 0, 255) : 255; } return o; };
  KColor.m.clone = KColor.m.dup = o => mkColor(o.r, o.g, o.b, o.a);
  KColor.m.darken = (o, a) => { const t = a.length ? N(a[0]) : 0.2; return mkColor(o.r - o.r * t, o.g - o.g * t, o.b - o.b * t); };
  KColor.eq = (a, b) => a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
  KTone.s.new = a => mkTone(a.length ? N(a[0]) : 0, a.length > 1 ? N(a[1]) : 0, a.length > 2 ? N(a[2]) : 0, a.length > 3 ? N(a[3]) : 0);
  for (const [n, f, lo] of [['red', 'r', -255], ['green', 'g', -255], ['blue', 'b', -255], ['gray', 'y', 0]]) { KTone.m[n] = o => F(o[f]); KTone.m[n + '='] = (o, a) => { o[f] = clamp(N(a[0]), lo, 255); return a[0]; }; }
  KTone.m.all = o => F((o.r + o.g + o.b) / 3);
  KTone.m['all='] = (o, a) => { const v = clamp(N(a[0]), -255, 255); o.r = o.g = o.b = v; return a[0]; };
  KTone.m.set = (o, a) => { if (a.length === 1 && isA(a[0], KTone)) { o.r = a[0].r; o.g = a[0].g; o.b = a[0].b; o.y = a[0].y; } else { o.r = clamp(N(a[0]), -255, 255); o.g = clamp(N(a[1]), -255, 255); o.b = clamp(N(a[2]), -255, 255); o.y = a.length > 3 ? clamp(N(a[3]), 0, 255) : 0; } return o; };
  KTone.m.clone = KTone.m.dup = o => mkTone(o.r, o.g, o.b, o.y);
  KTone.eq = (a, b) => a.r === b.r && a.g === b.g && a.b === b.b && a.y === b.y;
  KRect.s.new = a => mkRect(a.length ? I(a[0]) : 0, a.length > 1 ? I(a[1]) : 0, a.length > 2 ? I(a[2]) : 0, a.length > 3 ? I(a[3]) : 0);
  aInt(KRect, 'x'); aInt(KRect, 'y'); aInt(KRect, 'width', 'w'); aInt(KRect, 'height', 'h');
  KRect.m.set = (o, a) => { if (a.length === 1 && isA(a[0], KRect)) { o.x = a[0].x; o.y = a[0].y; o.w = a[0].w; o.h = a[0].h; } else { o.x = I(a[0]); o.y = I(a[1]); o.w = I(a[2]); o.h = I(a[3]); } return o; };
  KRect.m.clone = KRect.m.dup = o => mkRect(o.x, o.y, o.w, o.h);
  KRect.eq = (a, b) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

  /* Bilder. Et Bitmap er enten en fil fra pakken (img = navnet) eller et tegnet bilde: da huskes hvert tegnesteg (ops),
     og avspilleren tegner det samme på et eget lerret. ver teller stegene, så et bilde som endres underveis blir riktig i hvert bilde. */
  let R = null;      /* opptaket som er i gang */
  function mkBitmap(w, h, img) { const b = { k: KBitmap, id: R.bmps.length, w: Math.max(1, w), h: Math.max(1, h), img: img || '', ops: [], ver: 0, gone: false }; R.bmps.push(b); return b; }
  /* Tar vare på tegnestegene til et bilde slik det ser ut akkurat nå, så avspilleren kan lage samme bilde. Gir versjonsnummeret. */
  const keepVer = b => { if (b.ops.length) { const k = b.id + ':' + b.ver; if (!R.vers[k]) R.vers[k] = b.ops.slice(); } return b.ver; };
  const col4 = c => { if (!isA(c, KColor)) bad('expected a Color'); return [Math.round(c.r), Math.round(c.g), Math.round(c.b), c.a / 255]; };
  function loadBitmap(path) {
    const name = String(path).split('/').pop().replace(/\.(png|gif|jpg)$/i, ''), d = E.data.img[name] || E.data.img[name.toLowerCase()];
    if (!d) { R.missing.push(name); return mkBitmap(2, 2, ''); }
    R.uses.add(name);
    return mkBitmap(d[0], d[1], name);
  }
  KBitmap.s.new = a => { if (a.length === 1 && typeof a[0] === 'string') return loadBitmap(a[0]); if (a.length < 2) bad('wrong number of arguments for Bitmap.new'); return mkBitmap(I(a[0]), I(a[1])); };
  KBitmap.m.width = o => o.w; KBitmap.m.height = o => o.h;
  KBitmap.m.rect = o => mkRect(0, 0, o.w, o.h);
  KBitmap.m.dispose = o => { o.gone = true; return null; };
  KBitmap.m['disposed?'] = o => o.gone;
  KBitmap.m.storedPath = o => o.img || null; KBitmap.m['storedPath='] = (o, a) => a[0];
  const bop = (o, op) => { if (o.img && !o.ops.length) o.ops.push(['img']); o.ops.push(op); o.ver++; };
  KBitmap.m.fill_rect = (o, a) => { let x, y, w, h, c; if (a.length === 2) { x = a[0].x; y = a[0].y; w = a[0].w; h = a[0].h; c = a[1]; } else { x = I(a[0]); y = I(a[1]); w = I(a[2]); h = I(a[3]); c = a[4]; } bop(o, ['fr', x, y, w, h, col4(c)]); return null; };
  KBitmap.m.clear = o => { o.ops = [['cl']]; o.ver++; return null; };
  KBitmap.m.blt = (o, a) => { const s = a[2], r = a[3] || mkRect(0, 0, s.w, s.h); if (!isA(s, KBitmap)) bad('blt needs a Bitmap'); bop(o, ['bl', I(a[0]), I(a[1]), s.id, keepVer(s), r.x, r.y, r.w, r.h, a.length > 4 ? clamp(I(a[4]), 0, 255) / 255 : 1]); return null; };
  KBitmap.m.stretch_blt = (o, a) => { const d = a[0], s = a[1], r = a[2]; if (!isA(s, KBitmap)) bad('stretch_blt needs a Bitmap'); bop(o, ['sb', d.x, d.y, d.w, d.h, s.id, keepVer(s), r.x, r.y, r.w, r.h, a.length > 3 ? clamp(I(a[3]), 0, 255) / 255 : 1]); return null; };
  /* En fylt (eller hul) sirkel, tegnet kolonne for kolonne akkurat som i EBDX. */
  KBitmap.m.bmp_circle = KBitmap.m.draw_circle = (o, a) => {
    const c = a.length ? a[0] : mkColor(255, 255, 255), r = a.length > 1 ? N(a[1]) : Math.floor(o.w / 2), tx = a.length > 2 ? N(a[2]) : Math.floor(o.w / 2), ty = a.length > 3 ? N(a[3]) : Math.floor(o.h / 2);
    bop(o, ['ci', col4(c), r, tx, ty, a.length > 4 && T(a[4]) ? 1 : 0]); return null;
  };
  KBitmap.m.set_pixel = (o, a) => { bop(o, ['fr', I(a[0]), I(a[1]), 1, 1, col4(a[2])]); return null; };
  KBitmap.m.get_pixel = () => mkColor(0, 0, 0, 0);
  KBitmap.m.hue_change = (o, a) => { bop(o, ['hu', I(a[0])]); return null; };
  KBitmap.m.clone = KBitmap.m.dup = o => { const b = mkBitmap(o.w, o.h, o.img); b.ops = o.ops.slice(); b.ver = b.ops.length ? 1 : 0; return b; };
  KBitmap.m.draw_text = KBitmap.m.set_font = KBitmap.m.font = () => null;

  const mkViewport = (x, y, w, h) => ({ k: KViewport, rect: mkRect(x, y, w, h), color: mkColor(0, 0, 0, 0), tone: mkTone(0, 0, 0, 0), z: 0, ox: 0, oy: 0, visible: true });
  KViewport.s.new = a => a.length === 1 ? mkViewport(a[0].x, a[0].y, a[0].w, a[0].h) : mkViewport(I(a[0]), I(a[1]), I(a[2]), I(a[3]));
  KViewport.m.rect = o => o.rect; KViewport.m.width = o => o.rect.w; KViewport.m.height = o => o.rect.h;
  KViewport.m.color = o => o.color; KViewport.m['color='] = (o, a) => { KColor.m.set(o.color, [a[0]]); return a[0]; };
  KViewport.m.tone = o => o.tone; KViewport.m['tone='] = (o, a) => { KTone.m.set(o.tone, [a[0]]); return a[0]; };
  aInt(KViewport, 'z'); aInt(KViewport, 'ox'); aInt(KViewport, 'oy'); aBool(KViewport, 'visible');
  KViewport.m.dispose = () => null; KViewport.m['disposed?'] = () => false; KViewport.m.update = () => null; KViewport.m.flash = () => null;

  /* Sprites. Feltene følger spillmotoren: x, y, z, ox, oy og opacity er heltall, zoom og vinkel er desimaltall. */
  function mkSprite(k, vp) {
    const s = { k, id: R.seq++, vp: vp || null, x: 0, y: 0, z: 0, ox: 0, oy: 0, zx: 1, zy: 1, angle: 0, mirror: false, opacity: 255, blend: 0, hue: 0, visible: true, bmp: null, src: mkRect(0, 0, 0, 0), color: mkColor(0, 0, 0, 0), tone: mkTone(0, 0, 0, 0), gone: false, plane: false };
    R.sprites.push(s); return s;
  }
  KSprite.s.new = a => mkSprite(KSprite, a.length ? a[0] : null);
  aInt(KSprite, 'x'); aInt(KSprite, 'y'); aInt(KSprite, 'z'); aInt(KSprite, 'ox'); aInt(KSprite, 'oy'); aFlt(KSprite, 'zoom_x', 'zx'); aFlt(KSprite, 'zoom_y', 'zy'); aFlt(KSprite, 'angle');
  aBool(KSprite, 'mirror'); aBool(KSprite, 'visible'); aInt(KSprite, 'blend_type', 'blend'); aInt(KSprite, 'bush_depth', 'bush');
  KSprite.m.opacity = o => o.opacity; KSprite.m['opacity='] = (o, a) => { o.opacity = clamp(I(a[0]), 0, 255); return a[0]; };
  KSprite.m.bitmap = o => o.bmp;
  KSprite.m['bitmap='] = (o, a) => { const b = a[0]; if (b !== null && !isA(b, KBitmap)) bad('bitmap= needs a Bitmap'); o.bmp = b; if (b) { o.src.x = 0; o.src.y = 0; o.src.w = b.w; o.src.h = b.h; } return b; };
  KSprite.m.src_rect = o => o.src; KSprite.m['src_rect='] = (o, a) => { KRect.m.set(o.src, [a[0]]); return a[0]; };
  KSprite.m.color = o => o.color; KSprite.m['color='] = (o, a) => { KColor.m.set(o.color, [a[0]]); return a[0]; };
  KSprite.m.tone = o => o.tone; KSprite.m['tone='] = (o, a) => { KTone.m.set(o.tone, [a[0]]); return a[0]; };
  KSprite.m.viewport = o => o.vp; KSprite.m['viewport='] = (o, a) => { o.vp = a[0]; return a[0]; };
  KSprite.m.dispose = o => { o.gone = true; return null; }; KSprite.m['disposed?'] = o => o.gone;
  KSprite.m.update = () => null; KSprite.m.flash = () => null;
  KSprite.m.width = o => o.src.w; KSprite.m.height = o => o.src.h;
  KSprite.m.zoom = o => F(o.zx); KSprite.m['zoom='] = (o, a) => { o.zx = o.zy = N(a[0]); return a[0]; };
  KSprite.m['center!'] = (o, a) => { o.ox = Math.floor(o.src.w / 2); o.oy = Math.floor(o.src.h / 2); if (a.length && T(a[0]) && o.vp) { o.x = Math.floor(o.vp.rect.w / 2); o.y = Math.floor(o.vp.rect.h / 2); } return null; };
  KSprite.m.center = o => [Math.floor(o.src.w / 2), Math.floor(o.src.h / 2)];
  KSprite.m['bottom!'] = o => { o.ox = Math.floor(o.src.w / 2); o.oy = o.src.h; return null; };
  KSprite.m.bottom = o => [Math.floor(o.src.w / 2), o.src.h];
  KSprite.m.create_rect = (o, a) => { const b = mkBitmap(I(a[0]), I(a[1])); KBitmap.m.fill_rect(b, [0, 0, b.w, b.h, a[2]]); KSprite.m['bitmap='](o, [b]); return null; };
  KSprite.m.full_rect = (o, a) => { if (!o.bmp) KSprite.m['bitmap='](o, [mkBitmap(512, 384)]); KBitmap.m.fill_rect(o.bmp, [0, 0, o.bmp.w, o.bmp.h, a[0]]); return null; };
  KSprite.m.blank_screen = o => { KSprite.m['bitmap='](o, [mkBitmap(512, 384)]); return null; };
  KSprite.m['default!'] = o => { o.speed = 1; o.toggle = 1; o.end_x = 0; o.end_y = 0; o.ex = 0; o.ey = 0; o.zx_ = 1; o.zy_ = 1; o.param = 1; o.direction = 1; return null; };
  for (const n of ['speed', 'toggle', 'end_x', 'end_y', 'param', 'ex', 'ey', 'direction', 'skew_d', 'storedBitmap']) aAny(KSprite, n);
  aAny(KSprite, 'zx', 'zx_'); aAny(KSprite, 'zy', 'zy_');
  KSprite.m.colorize = (o, a) => { const c = a[0]; o.color = mkColor(c.r, c.g, c.b, a.length > 1 ? N(a[1]) : 255); return null; };
  KSprite.m.glow = KSprite.m.blur_sprite = KSprite.m.memorize_bitmap = KSprite.m.restore_bitmap = KSprite.m.skew = () => null;

  /* En flate som fliselegger bildet sitt over hele skjermen (brukes til vind og tåke). */
  const KPlane = cls('AnimatedPlane', KSprite); classes.Plane = KPlane;
  KPlane.s.new = a => { const s = mkSprite(KPlane, a.length ? a[0] : null); s.plane = true; return s; };
  KPlane.m.setBitmap = (o, a) => { KSprite.m['bitmap='](o, [typeof a[0] === 'string' ? loadBitmap(a[0]) : a[0]]); return null; };
  /* Bakgrunn som ruller: bildet legges to ganger etter hverandre, og utsnittet flyttes for hvert bilde. */
  const KScroll = cls('ScrollingSprite', KSprite);
  KScroll.s.new = a => mkSprite(KScroll, a.length ? a[0] : null);
  for (const n of ['vertical', 'pulse', 'min_o', 'max_o']) aAny(KScroll, n);
  KScroll.m.setBitmap = (o, a) => {
    o.vertical = a.length > 1 && T(a[1]); o.pulse = a.length > 2 && T(a[2]); if (o.direction === undefined || o.direction === null) o.direction = 1; o.gopac = 1; o.frame = 0; if (o.speed === undefined || o.speed === null) o.speed = 32; o.min_o = 0; o.max_o = 255;
    const v = typeof a[0] === 'string' ? loadBitmap(a[0]) : a[0], dir = N(o.direction);
    const b = o.vertical ? mkBitmap(v.w, v.h * 2) : mkBitmap(v.w * 2, v.h);
    for (let i = 0; i < 2; i++) KBitmap.m.blt(b, [o.vertical ? 0 : v.w * i, o.vertical ? v.h * i : 0, v, mkRect(0, 0, v.w, v.h)]);
    KSprite.m['bitmap='](o, [b]);
    if (o.vertical) KRect.m.set(o.src, [0, dir > 0 ? 0 : v.h, v.w, v.h]); else KRect.m.set(o.src, [dir > 0 ? 0 : v.w, 0, v.w, v.h]);
    return null;
  };
  KScroll.m.update = o => {
    if (!o.bmp || o.frame === undefined) return null;
    const sp = N(o.speed), dir = N(o.direction), s = Math.trunc(1 / sp);
    o.frame += 1; if (o.frame < s) return null;
    const m0 = dir, m1 = (sp < 1 ? 1 : sp) * dir, step = I(dir > 0 ? Math.max(m0, m1) : Math.min(m0, m1));
    if (o.vertical) { o.src.y += step; if (dir > 0 && o.src.y >= o.src.h) o.src.y = 0; if (dir < 0 && o.src.y <= 0) o.src.y = o.src.h; }
    else { o.src.x += step; if (dir > 0 && o.src.x >= o.src.w) o.src.x = 0; if (dir < 0 && o.src.x <= 0) o.src.x = o.src.w; }
    if (o.pulse) { o.opacity = clamp(Math.trunc(o.opacity - o.gopac * (sp < 1 ? 1 : sp)), 0, 255); if (o.opacity === N(o.max_o) || o.opacity === N(o.min_o)) o.gopac *= -1; }
    o.frame = 0; return null;
  };
  /* Sprite som skifter farge hele tiden. */
  const KRainbow = cls('RainbowSprite', KSprite);
  KRainbow.s.new = a => mkSprite(KRainbow, a.length ? a[0] : null);
  KRainbow.m.setBitmap = (o, a) => { o.val = typeof a[0] === 'string' ? loadBitmap(a[0]) : a[0]; o.speed = a.length > 1 ? a[1] : 1; KSprite.m['bitmap='](o, [o.val]); o.hue = 0; return null; };
  KRainbow.m.update = o => { if (!o.val) return null; o.hue += Math.max(1, N(o.speed)); if (o.hue >= 360) o.hue = 0; return null; };
  /* Sprite som legger igjen et spor av kopier som blekner og krymper. */
  const KTrail = cls('TrailingSprite');
  KTrail.s.new = a => ({ k: KTrail, vp: a[0], bmp: a[1], list: [], x: 0, y: 0, z: 0, i: 0, frame: 128, keyFrame: 0, color: mkColor(0, 0, 0, 0), zx: 1, zy: 1, opacity: 255 });
  for (const n of ['x', 'y', 'z', 'keyFrame', 'opacity']) aAny(KTrail, n);
  aAny(KTrail, 'zoom_x', 'zx'); aAny(KTrail, 'zoom_y', 'zy');
  KTrail.m.color = o => o.color; KTrail.m['color='] = (o, a) => { o.color = a[0]; return a[0]; };
  KTrail.m.update = o => {
    o.frame += 1;
    if (o.frame > N(o.keyFrame)) {
      const s = mkSprite(KSprite, o.vp); KSprite.m['bitmap='](s, [o.bmp]);
      s.x = I(o.x); s.y = I(o.y); s.z = I(o.z); s.zx = N(o.zx); s.zy = N(o.zy); s.opacity = clamp(I(o.opacity), 0, 255);
      o.list.push(s); o.i += 1; o.frame = 0;
    }
    for (const s of o.list) if (s.opacity > N(o.keyFrame)) { s.opacity = clamp(s.opacity - 24, 0, 255); s.zx -= 0.035; s.zy -= 0.035; KColor.m.set(s.color, [o.color]); }
    return null;
  };
  KTrail.m['visible='] = (o, a) => { for (const s of o.list) s.visible = T(a[0]); return a[0]; };
  KTrail.m.dispose = o => { for (const s of o.list) s.gone = true; o.list = []; return null; };
  KTrail.m['disposed?'] = o => o.list.length < 1;

  /* ---------- EBDX-scenen ----------
     Kameraet er en vektor fra spillerens side (x, y) til motstanderens (x2, y2). Banen og de to Pokémonene plasseres etter den,
     så når vektoren glir mot et nytt mål, zoomer og panorerer hele scenen. Tallene er de samme som i EBDX. */
  const VEC = { MAIN: [102, 408, 32, 342, 1, 1], SINGLE: [102, 408, 32, 342, 1, 1], DOUBLE: [102, 408, 32, 342, 1, 1], TRIPLE: [102, 408, 32, 342, 1, 1], SENDOUT: [234, 306, 24, 206, 0.5, 1],
    ENEMY: [-272, 628, 28, 642, 1.5, 1], PLAYER: [238, 332, 32, 292, 1, 1], DUAL: [196, 306, 26, 242, 0.6, 1], DYNAMAX: [202, 308, 18, 136, 0.5, 1] };
  /* Kameraet i EBDX er laget for en bane som er mye større enn skjermen, og for en egen Pokémon som står halvveis utenfor bildet i ro.
     Her fyller banebildet akkurat skjermen, og begge står helt inne i den. Derfor regnes kamerastillingene ut på nytt for hver kamp:
     «mot motstanderen» og «mot din egen» zoomer inn på den det gjelder uten å gå utenfor banebildet, og «begge» er et lite rykk innover.
     En stilling er: skjerm = (tx, ty) + S · bane. Den gjøres om til en vektor som gir akkurat den forskyvningen, og samme forstørrelse på Pokémonene. */
  function camVec(S, tx, ty) {
    const d = spoof(VEC.MAIN), a = 32 * Math.PI / 180, sc = 342 * Math.pow(S, 1 / 0.6);
    tx = Math.min(0, Math.max(512 * (1 - S), tx)); ty = Math.min(0, Math.max(384 * (1 - S), ty));
    const x2 = tx + d[0] * S, y2 = ty + d[1] * S;
    return [x2 - Math.cos(a) * sc, y2 + Math.sin(a) * sc, 32, sc, Math.pow(S, 1 / 0.75), 1];
  }
  function setCams(me, foe) {
    if (foe) VEC.ENEMY = camVec(1.35, 330 - 1.35 * foe.x, 268 - 1.35 * foe.y);
    if (me) VEC.PLAYER = camVec(1.25, 175 - 1.25 * me.x, 384 - 1.25 * me.y);
    VEC.DUAL = camVec(1.06, 256 * (1 - 1.06), 192 * (1 - 1.06));
  }
  const ROOM_SCALE = 2.25;
  const vecArr = k => VEC[k].map(v => Number.isInteger(v) ? v : F(v));
  const KVector = cls('Vector');
  const vcalc = v => { const a = v.angle * Math.PI / 180; v.x2 = v.x + Math.cos(a) * v.scale; v.y2 = v.y - Math.sin(a) * v.scale; };
  const spoof = q => { const a = q[2] * Math.PI / 180; return [q[0] + Math.cos(a) * q[3], q[1] - Math.sin(a) * q[3]]; };
  function mkVector() { const m = VEC.MAIN, v = { k: KVector, x: m[0], y: m[1], angle: m[2], scale: m[3], zoom1: m[4], zoom2: m[5], inc: 0.2, set: m.slice(), x2: 0, y2: 0 }; vcalc(v); return v; }
  for (const n of ['x2', 'y2', 'angle', 'scale', 'zoom1', 'zoom2', 'inc']) KVector.m[n] = o => F(o[n]);
  KVector.m.x = o => F(o.x); KVector.m.y = o => F(o.y);
  KVector.m['x='] = (o, a) => { o.x = N(a[0]); o.set[0] = o.x; vcalc(o); return a[0]; };
  KVector.m['y='] = (o, a) => { o.y = N(a[0]); o.set[1] = o.y; vcalc(o); return a[0]; };
  KVector.m['angle='] = (o, a) => { o.angle = N(a[0]); vcalc(o); return a[0]; };
  KVector.m['scale='] = (o, a) => { o.scale = N(a[0]); vcalc(o); return a[0]; };
  KVector.m['zoom1='] = (o, a) => { o.zoom1 = N(a[0]); return a[0]; }; KVector.m['zoom2='] = (o, a) => { o.zoom2 = N(a[0]); return a[0]; };
  KVector.m['inc='] = (o, a) => { o.inc = N(a[0]); return a[0]; };
  KVector.m.set = (o, a) => { const q = Array.isArray(a[0]) ? a[0] : a; if (q.length < 5) bad('vector needs five values'); o.set = [N(q[0]), N(q[1]), N(q[2]), N(q[3]), N(q[4]), q.length > 5 && q[5] !== null ? N(q[5]) : 1]; return null; };
  KVector.m.reset = o => { o.inc = 0.2; o.set = VEC.MAIN.slice(); return null; };
  KVector.m.setXY = (o, a) => { o.set[0] = N(a[0]); o.set[1] = N(a[1]); return null; };
  KVector.m.get = o => [F(o.x), F(o.y), F(o.angle), F(o.scale), F(o.zoom1), F(o.zoom2)];
  KVector.m.spoof = (o, a) => { const q = (Array.isArray(a[0]) ? a[0] : a).map(N), r = spoof(q); return [F(r[0]), F(r[1])]; };
  KVector.m['finished?'] = o => Math.abs((o.set[0] - o.x) * o.inc) <= 0.00004;
  KVector.m.force = KVector.m.lock = () => null; KVector.m['locked?'] = () => false;
  const vupdate = v => { const s = v.set, k = v.inc; v.x += (s[0] - v.x) * k; v.y += (s[1] - v.y) * k; v.angle += (s[2] - v.angle) * k; v.scale += (s[3] - v.scale) * k; v.zoom1 += (s[4] - v.zoom1) * k; v.zoom2 += (s[5] - v.zoom2) * k; vcalc(v); };

  /* Banen: flyttes og forstørres etter vektoren. defocus senker den bak effektene, så et angrep kan legge sin egen bakgrunn foran. */
  const KRoom = cls('BattleSceneRoom');
  KRoom.m.defocus = o => { o.focused = false; return null; }; KRoom.m.focus = o => { o.focused = true; return null; };
  KRoom.m.configure = KRoom.m.update = KRoom.m.reset = KRoom.m.reconfigure = () => null;
  KRoom.m.scale_y = o => F(o.zy);
  KRoom.m.battler = (o, a) => { const b = R.scene.bat[I(a[0])]; return b ? b.base : null; };
  KRoom.m.spoof = (o, a) => { const q = a[0].map(N), b = spoof(q), d = spoof(VEC.MAIN), i = a.length > 1 ? I(a[1]) : 1, t = R.scene.bat[i]; if (!t) return [0, 0];
    const zx = ROOM_SCALE * Math.pow((b[0] - q[0]) / (d[0] - VEC.MAIN[0]), 0.6), zy = ROOM_SCALE * Math.pow((b[1] - q[1]) / (d[1] - VEC.MAIN[1]), 0.6);
    return [F(b[0] - (o.ox - t.ex) * zx), F(b[1] - (o.oy - t.ey) * zy)]; };
  KRoom.m.color = o => R.scene.vp.color; KRoom.m['color='] = (o, a) => { KColor.m.set(R.scene.vp.color, [a[0]]); return a[0]; };
  KRoom.m.visible = () => true; KRoom.m['visible='] = (o, a) => a[0];
  function roomUpdate(room, v) {
    const d = spoof(VEC.MAIN);
    room.x = v.x2; room.y = v.y2;
    room.zx = ROOM_SCALE * Math.pow((v.x2 - v.x) / (d[0] - VEC.MAIN[0]), 0.6); room.zy = ROOM_SCALE * Math.pow((v.y2 - v.y) / (d[1] - VEC.MAIN[1]), 0.6);
    if (!Number.isFinite(room.zx)) room.zx = ROOM_SCALE; if (!Number.isFinite(room.zy)) room.zy = ROOM_SCALE;
    for (const b of R.scene.bat) if (b) { b.base.x = Math.trunc(room.x - (room.ox - b.ex) * room.zx); b.base.y = Math.trunc(room.y - (room.oy - b.ey) * room.zy); }
  }

  /* En Pokémon i scenen. Den tegnes ikke her: avspilleren flytter og farger det vanlige bildet i kampskjermen etter disse verdiene. */
  const KMon = cls('DynamicPokemonSprite');
  const KBase = cls('BasePoint');
  aInt(KBase, 'x'); aInt(KBase, 'y'); aInt(KBase, 'z');
  function mkMon(i, w, h, z0) {
    return { k: KMon, i, w, h, z0, x: 0, y: 0, z: i % 2 ? 11 : 21, ox: Math.floor(w / 2), oy: h, ox0: Math.floor(w / 2), oy0: h, zx: z0, zy: z0, angle: 0, mirror: false, opacity: 255, visible: true, hidden: false, color: mkColor(0, 0, 0, 0), tone: mkTone(0, 0, 0, 0),
      src: mkRect(0, 0, w, h), still: false, anim: false, fainted: false, base: { k: KBase, x: 0, y: 0, z: 0 }, ex: 0, ey: 0, bm: null, touched: -1 };
  }
  const touch = o => { if (o.touched < 0) o.touched = R.frames.length; };
  aInt(KMon, 'x'); aInt(KMon, 'y'); aInt(KMon, 'ox'); aInt(KMon, 'oy'); aFlt(KMon, 'zoom_x', 'zx'); aFlt(KMon, 'zoom_y', 'zy'); aFlt(KMon, 'angle'); aBool(KMon, 'mirror');
  /* En endring teller bare som berøring hvis verdien faktisk blir en annen. */
  for (const [n, fld] of [['x=', 'x'], ['y=', 'y'], ['ox=', 'ox'], ['oy=', 'oy'], ['angle=', 'angle'], ['zoom_x=', 'zx'], ['zoom_y=', 'zy']]) { const f = KMon.m[n]; KMon.m[n] = (o, a) => { const was = o[fld], r = f(o, a); if (o[fld] !== was) touch(o); return r; }; }
  KMon.m.z = o => o.z; KMon.m['z='] = (o, a) => { const v = I(a[0]); o.z = v < 11 ? 11 : v; return a[0]; };
  KMon.m.zoom = o => F(o.zx); KMon.m['zoom='] = (o, a) => { const v = N(a[0]); if (v !== o.zx) touch(o); o.zx = o.zy = v; return a[0]; };
  KMon.m.opacity = o => o.opacity; KMon.m['opacity='] = (o, a) => { const v = clamp(I(a[0]), 0, 255); if (v !== o.opacity) touch(o); o.opacity = v; return a[0]; };
  KMon.m.visible = o => o.visible; KMon.m['visible='] = (o, a) => { if (!o.hidden) { if (T(a[0]) !== o.visible) touch(o); o.visible = T(a[0]); } return a[0]; };
  aBool(KMon, 'hidden'); aBool(KMon, 'anim'); aBool(KMon, 'fainted'); aBool(KMon, 'showshadow'); aBool(KMon, 'charged'); aBool(KMon, 'noshadow'); aBool(KMon, 'legacy_anim'); aBool(KMon, 'isShadow'); aAny(KMon, 'status'); aAny(KMon, 'selected');
  KMon.m.tone = o => o.tone; KMon.m['tone='] = (o, a) => { KTone.m.set(o.tone, [a[0]]); return a[0]; };
  KMon.m.color = o => o.color; KMon.m['color='] = (o, a) => { KColor.m.set(o.color, [a[0]]); return a[0]; };
  KMon.m.toneAll = (o, a) => { const v = N(a[0]); o.tone.r = clamp(o.tone.r + v, -255, 255); o.tone.g = clamp(o.tone.g + v, -255, 255); o.tone.b = clamp(o.tone.b + v, -255, 255); return null; };
  KMon.m.width = o => o.w; KMon.m.height = o => o.h;
  KMon.m.bitmap = o => o.bm || (o.bm = mkBitmap(o.w, o.h, '@mon' + o.i));
  KMon.m['bitmap='] = (o, a) => a[0];
  KMon.m.actualBitmap = o => ({ k: KAnimBmp, w: o.w, h: o.h });
  KMon.m.src_rect = o => o.src; KMon.m['src_rect='] = (o, a) => { KRect.m.set(o.src, [a[0]]); return a[0]; };
  KMon.m.getCenter = (o, a) => { const z = !a.length || T(a[0]) ? o.zy : 1; return [o.x, F(o.y + (o.h - o.oy) * z - o.h * z / 2)]; };
  KMon.m.getAnchor = (o, a) => KMon.m.getCenter(o, a);
  KMon.m.anchor = () => null;
  KMon.m.still = o => { o.still = true; return null; };
  KMon.m.index = o => o.i; KMon.m.battleIndex = o => o.i; KMon.m.sideSize = () => 1;
  KMon.m.isSub = () => false; KMon.m['disposed?'] = () => false; KMon.m.loaded = () => true; KMon.m.dynamax = () => false; KMon.m.blend_type = () => 0;
  KMon.m.viewport = () => R.scene.vp; KMon.m.species = () => null; KMon.m.pokemon = () => null; KMon.m.shadow = o => o;
  for (const n of ['update', 'lock', 'play', 'formatShadow', 'resetParticles', 'pbSetOrigin', 'setSubstitute', 'removeSubstitute', 'refreshMetrics', 'shadowUpdate', 'chargedUpdate', 'energyUpdate', 'dispose', 'setFrame', 'clear', 'blend_type=']) KMon.m[n] = () => null;
  const KAnimBmp = cls('BitmapEBDX');
  KAnimBmp.m.width = o => o.w; KAnimBmp.m.height = o => o.h;
  for (const n of ['setSpeed', 'update', 'play', 'dispose', 'to_frame', 'deanimate', 'reverse']) KAnimBmp.m[n] = () => null;
  KAnimBmp.m.bitmap = o => mkBitmap(o.w, o.h, ''); KAnimBmp.m['finished?'] = () => true; KAnimBmp.m.totalFrames = () => 1; KAnimBmp.m.currentIndex = () => 0;
  const KBox = cls('DataBox');
  aBool(KBox, 'visible'); aInt(KBox, 'x'); aInt(KBox, 'y'); aInt(KBox, 'opacity');
  for (const n of ['update', 'damage', 'refresh', 'dispose']) KBox.m[n] = () => null;

  /* Kampen og scenen slik animasjonene ser dem. Indeks 0 er din Pokémon, 1 er motstanderens. */
  const KBattle = cls('Battle'), KScene = cls('Scene'), KBattler = cls('Battler');
  KBattle.m['opposes?'] = (o, a) => (a.length > 1 ? I(a[0]) % 2 !== I(a[1]) % 2 : I(a[0]) % 2 === 1);
  KBattle.m.pbSideSize = () => 1; KBattle.m.pbMaxSize = () => 1; KBattle.m['doublebattle?'] = () => false; KBattle.m['triplebattle?'] = () => false; KBattle.m['singlebattle?'] = () => true;
  KBattle.m.battlers = o => o.battlers; KBattle.m.opponent = () => null; KBattle.m.battlescene = () => true; KBattle.m.pbParty = () => [null];
  KBattler.m.index = o => o.i; KBattler.m['fainted?'] = () => false; KBattler.m.status = () => sym('NONE'); KBattler.m.hp = () => 100; KBattler.m.totalhp = () => 100; KBattler.m.effects = () => new RHash(); KBattler.m.species = () => null; KBattler.m.pokemon = () => null; KBattler.m['shadowPokemon?'] = () => false;
  KScene.m.battle = o => o.battle; KScene.m.sprites = o => o.sprites; KScene.m.vector = o => o.vec; KScene.m.viewport = o => o.vp; KScene.m.battlers = o => o.battle.battlers;
  aAny(KScene, 'afterAnim'); aAny(KScene, 'inMoveAnim'); aAny(KScene, 'briefMessage');
  KScene.m.getRealVector = (o, a) => vecArr(T(a[1]) ? 'PLAYER' : 'ENEMY');
  KScene.m.moveEntireScene = (o, a) => { const x = a.length ? N(a[0]) : 0, y = a.length > 1 ? N(a[1]) : 0, ex = a.length > 4 && a[4] !== null ? I(a[4]) : -1; for (const b of o.bat) if (b && b.i !== ex) { b.x = Math.trunc(b.x + x); b.y = Math.trunc(b.y + y); } o.vec.x += x; o.vec.set[0] = o.vec.x; o.vec.y += y; o.vec.set[1] = o.vec.y; vcalc(o.vec); return null; };
  KScene.m.applySpriteProperties = (o, a) => { const s = a[0], d = a[1], g = n => call(s, n, [], null), p = (n, v) => call(d, n + '=', [v], null); for (const n of ['x', 'y', 'z', 'zoom_x', 'zoom_y', 'opacity', 'angle', 'tone', 'color', 'visible']) p(n, g(n)); return null; };
  KScene.m.setVector = (o, a) => KVector.m.set(o.vec, a);
  KScene.m.pbHideAllDataboxes = o => { o.boxes = false; return null; }; KScene.m.pbShowAllDataboxes = o => { o.boxes = true; return null; };
  for (const n of ['clearMessageWindow', 'setSubstitute', 'substitueAll', 'pbRefresh', 'pbUpdate', 'revertMoveTransformations', 'pbDisplay', 'playBattlerCry', 'pbCommonAnimation', 'pbAnimation', 'setBGMLowHP']) KScene.m[n] = () => null;
  /* Ett eller flere bilder går: kameraet glir, banen følger, og hvis align er satt, stilles Pokémonene på plass etter banen. Så tas et bilde til opptaket. */
  KScene.m.wait = (o, a, blk) => {
    const n = a.length ? I(a[0]) : 1, align = a.length > 1 && T(a[1]);
    for (let i = 0; i < n; i++) { if (blk) callBlock(blk, []); tick(o, align); }
    return null;
  };
  KScene.m.animateScene = (o, a) => { tick(o, a.length && T(a[0])); return null; };
  function tick(S, align) {
    vupdate(S.vec); roomUpdate(S.room, S.vec);
    for (const b of S.bat) if (b) {
      b.still = false;
      if (align) { const z = Math.pow(S.vec.zoom1, 0.75) * b.z0; b.x = b.base.x; b.y = b.base.y; b.zx = z; b.zy = z; }
    }
    snap(S);
    if (R.frames.length > 1500) bad('animation runs too long');
  }

  /* ---------- Opptaket ----------
     Hvert bilde: listen over sprites som synes (sortert slik spillmotoren tegner dem), de to Pokémonene, banen og skjermfargen. */
  const STR = 26;      /* tall per sprite i et bilde */
  function snap(S) {
    const list = [];
    for (const s of R.sprites) {
      if (s.gone || !s.visible || !s.bmp || s.bmp.gone || s.opacity <= 0 || (!s.plane && (s.zx === 0 || s.zy === 0))) continue;
      /* Utsnittet kan ikke stikke utenfor bildet. Det som havner utenfor, tegnes ikke. */
      s.cw = Math.min(s.src.w, s.bmp.w - s.src.x); s.ch = Math.min(s.src.h, s.bmp.h - s.src.y);
      if (s.cw <= 0 || s.ch <= 0 || s.src.x < 0 || s.src.y < 0) continue;
      list.push(s);
    }
    list.sort((p, q) => p.z - q.z || p.id - q.id);
    const n = list.length, d = new Float32Array(n * STR);
    let n0 = 0, n1 = 0;
    for (let i = 0; i < n; i++) {
      const s = list[i], b = s.bmp, t = s.tone, c = s.color, o = i * STR;
      d[o] = b.id; d[o + 1] = keepVer(b); d[o + 2] = s.src.x; d[o + 3] = s.src.y; d[o + 4] = s.cw; d[o + 5] = s.ch; d[o + 6] = s.x; d[o + 7] = s.y; d[o + 8] = s.ox; d[o + 9] = s.oy;
      d[o + 10] = s.zx; d[o + 11] = s.zy; d[o + 12] = s.angle; d[o + 13] = s.mirror ? 1 : 0; d[o + 14] = s.opacity; d[o + 15] = t.r; d[o + 16] = t.g; d[o + 17] = t.b; d[o + 18] = t.y;
      d[o + 19] = c.r; d[o + 20] = c.g; d[o + 21] = c.b; d[o + 22] = c.a; d[o + 23] = s.z; d[o + 24] = s.hue || 0; d[o + 25] = s.plane ? 1 : 0;
      /* Lagene: bak begge Pokémonene (z under 11), mellom dem (11–20) og foran (21 og opp). */
      if (s.z < 11) n0++; if (s.z < 21) n1++;
    }
    const fr = { s: d, n, n0, n1, b: [], room: [S.room.x, S.room.y, S.room.zx, S.room.zy], vc: S.vp.color.a > 0 ? [S.vp.color.r, S.vp.color.g, S.vp.color.b, S.vp.color.a / 255] : null };
    for (const m of S.bat) {
      if (!m) { fr.b.push(null); continue; }
      const t = m.tone, c = m.color;
      /* Regning med desimaltall etterlater bitte små rester (12.8 fem ganger ned og fem ganger opp blir ikke nøyaktig null). De regnes som null. */
      if (m.touched < 0 && (Math.abs(t.r) > 0.5 || Math.abs(t.g) > 0.5 || Math.abs(t.b) > 0.5 || t.y > 0.5 || c.a > 0.5)) m.touched = R.frames.length;
      fr.b.push([m.x, m.y, m.ox, m.oy, m.zx, m.zy, m.angle, m.mirror ? 1 : 0, m.visible && !m.hidden ? m.opacity : 0, t.r, t.g, t.b, t.y, c.r, c.g, c.b, c.a]);
    }
    R.frames.push(fr);
  }

  /* ---------- Tolken ---------- */
  let SELF = null, CTL = 0;      /* instansvariablene til animasjonen som kjører, og next (1) / break (2) på vei ut av en løkke */
  const consts = {};
  const scope = (parent) => ({ v: Object.create(null), up: parent });
  const scAt = (sc, d) => { while (d-- > 0) sc = sc.up; return sc; };
  function ev(n, sc) {
    if (typeof n === 'number' || n === null || n === true || n === false) return n;
    switch (n[0]) {
      case 'l': { const v = scAt(sc, n[2]).v[n[1]]; return v === undefined ? null : v; }
      case '=l': return scAt(sc, n[2]).v[n[1]] = ev(n[3], sc);
      case 'x': return evCall(n, sc);
      case 'i': { const v = SELF[n[1]]; return v === undefined ? null : v; }
      case 'f': return new Fl(n[1]);
      case 's': return n[1];
      case 'is': { let s = ''; for (let i = 1; i < n.length; i++) s += typeof n[i] === 'string' ? n[i] : str(ev(n[i], sc)); return s; }
      case 'if': { if (T(ev(n[1], sc))) return n[2] === null ? null : ev(n[2], sc); return n[3] === null ? null : ev(n[3], sc); }
      case 'S': { let v = null; for (let i = 1; i < n.length; i++) { v = ev(n[i], sc); if (CTL) return null; } return v; }
      case 'ox': { const r = ev(n[1], sc), cur = call(r, n[2], [], null), v = n[4] === '||' ? (T(cur) ? cur : ev(n[5], sc)) : n[4] === '&&' ? (T(cur) ? ev(n[5], sc) : cur) : arith(n[4], cur, ev(n[5], sc)); call(r, n[3], [v], null); return v; }
      case 'ol': { const s = scAt(sc, n[2]), cur = s.v[n[1]] === undefined ? null : s.v[n[1]]; return s.v[n[1]] = n[3] === '||' ? (T(cur) ? cur : ev(n[4], sc)) : n[3] === '&&' ? (T(cur) ? ev(n[4], sc) : cur) : arith(n[3], cur, ev(n[4], sc)); }
      case 'oi': { const r = ev(n[1], sc), a = evArgs(n[2], sc), cur = call(r, '[]', a, null), v = n[3] === '||' ? (T(cur) ? cur : ev(n[4], sc)) : arith(n[3], cur, ev(n[4], sc)); call(r, '[]=', a.concat([v]), null); return v; }
      case '&&': { const a = ev(n[1], sc); return T(a) ? ev(n[2], sc) : a; }
      case '||': { const a = ev(n[1], sc); return T(a) ? a : ev(n[2], sc); }
      case 'for': return evFor(n, sc);
      case 'r': return new Rng(ev(n[1], sc), ev(n[2], sc), !!n[3]);
      case 'a': return evArgs(n.slice(1), sc);
      case 'h': { const h = new RHash(); for (let i = 1; i < n.length; i += 2) h.set(ev(n[i], sc), ev(n[i + 1], sc)); return h; }
      case 'y': return sym(n[1]);
      case 'm': { let v = ev(n[2], sc); const arr = Array.isArray(v) ? v : [v]; n[1].forEach((t, i) => assign(t, i < arr.length ? arr[i] : null, sc, arr, i, n[1].length)); return v; }
      case '=i': return SELF[n[1]] = ev(n[2], sc);
      case 'c': return constGet(n[1]);
      case 'cp': { if (n[1] === null) return constGet(n[2]); const p = ev(n[1], sc); if (p === MATH && n[2] === 'PI') return F(Math.PI); if (p && p.consts && n[2] in p.consts) return p.consts[n[2]]; bad('uninitialized constant ' + n[2]); }
      case '=c': return consts[n[1]] = ev(n[2], sc);
      case 'g': if (n[1] === '$game_switches') return new RHash(); return null;
      case 'nx': CTL = 1; return null;
      case 'br': CTL = 2; return null;
      case 'b': return new Blk(n[1], n[2], sc, SELF);
      case '*': return ev(n[1], sc);
      default: bad('unknown node ' + n[0]);
    }
  }
  function evArgs(list, sc) {
    const out = [];
    for (const a of list) { if (a !== null && typeof a === 'object' && a[0] === '*') { const v = ev(a[1], sc); if (Array.isArray(v)) out.push(...v); else if (v !== null) out.push(v); } else out.push(ev(a, sc)); }
    return out;
  }
  function assign(t, v, sc, arr, i, n) {
    switch (t[0]) {
      case 'l': scAt(sc, t[2]).v[t[1]] = v; break;
      case 'xt': call(ev(t[1], sc), t[2], [v], null); break;
      case 'it': call(ev(t[1], sc), '[]=', evArgs(t[2], sc).concat([v]), null); break;
      case '*': if (t[1]) assign(t[1], arr.slice(i, arr.length - (n - 1 - i)), sc); break;
      default: bad('cannot assign to ' + t[0]);
    }
  }
  function evFor(n, sc) {
    const col = ev(n[2], sc), body = n[3], tgt = n[1];
    const step = v => { assign(tgt, v, sc, [v], 0, 1); if (body !== null) ev(body, sc); if (CTL === 2) { CTL = 0; return true; } CTL = 0; return false; };
    if (col instanceof Rng) { const a = I(col.a), b = I(col.b) - (col.ex ? 1 : 0); for (let i = a; i <= b; i++) if (step(i)) break; }
    else if (Array.isArray(col)) { for (let i = 0; i < col.length; i++) if (step(col[i])) break; }
    else if (col instanceof RHash) { for (const k of col.keys()) if (step([k, col.get(k)])) break; }
    else bad('cannot loop over ' + show(col));
    return col;
  }
  function evCall(n, sc) {
    const name = n[2];
    /* De vanligste først: oppslag i tabeller og regning. */
    if (n[1] !== null) {
      const r = ev(n[1], sc), al = n[3];
      if (al.length === 1 && n[4] === null && (al[0] === null || typeof al[0] !== 'object' || al[0][0] !== '*')) {
        const b = ev(al[0], sc);
        switch (name) {
          case '[]': if (r instanceof RHash) return r.get(b); if (Array.isArray(r) && typeof b === 'number') { const v = r[b < 0 ? r.length + b : b]; return v === undefined ? null : v; } break;
          case '+': case '-': case '*': case '/': case '%': case '**': if (isN(r)) return arith(name, r, b); break;
          case '<': case '>': case '<=': case '>=': if (isN(r)) return cmp(name, r, b); break;
          case '==': return eq(r, b);
          case '!=': return !eq(r, b);
        }
        return call(r, name, [b], null);
      }
      return call(r, name, al.length ? evArgs(al, sc) : [], n[4] === null ? null : ev(n[4], sc));
    }
    const fn = FUNCS[name];
    if (!fn) bad(`undefined method '${name}'`);
    return fn(n[3].length ? evArgs(n[3], sc) : [], n[4] === null ? null : ev(n[4], sc));
  }
  /* Kaller en blokk. Én liste som eneste argument pakkes ut hvis blokken tar flere, som i språket. */
  function callBlock(b, args) {
    const sc = scope(b.sc), old = SELF; SELF = b.self;
    if (b.p.length > 1 && args.length === 1 && Array.isArray(args[0])) args = args[0];
    b.p.forEach((p, i) => { sc.v[p] = i < args.length ? args[i] : null; });
    try { return b.b === null ? null : ev(b.b, sc); } finally { SELF = old; }
  }
  /* En løkke over en blokk: next går til neste runde, break avslutter. */
  const loopBlock = (b, args) => { callBlock(b, args); if (CTL === 2) { CTL = 0; return true; } CTL = 0; return false; };

  const MATH = { consts: { PI: F(Math.PI) }, mod: 'Math' }, GRAPHICS = { mod: 'Graphics' }, ELITE = { mod: 'EliteBattle', consts: {} }, SETTINGS = { mod: 'Settings', consts: {} }, PBFX = { mod: 'PBEffects', consts: { Substitute: 0 } };
  function constGet(n) {
    if (n in consts) return consts[n];
    switch (n) { case 'Math': return MATH; case 'Graphics': return GRAPHICS; case 'EliteBattle': return ELITE; case 'Settings': return SETTINGS; case 'PBEffects': return PBFX; case 'PI': return F(Math.PI); }
    if (classes[n]) return classes[n];
    bad('uninitialized constant ' + n);
  }
  const MODS = {
    Math: { sin: a => F(Math.sin(N(a[0]))), cos: a => F(Math.cos(N(a[0]))), tan: a => F(Math.tan(N(a[0]))), atan: a => F(Math.atan(N(a[0]))), atan2: a => F(Math.atan2(N(a[0]), N(a[1]))), asin: a => F(Math.asin(N(a[0]))), acos: a => F(Math.acos(N(a[0]))),
      sqrt: a => { const x = N(a[0]); if (x < 0) bad('Numerical argument is out of domain - "sqrt"'); return F(Math.sqrt(x)); }, exp: a => F(Math.exp(N(a[0]))), log: a => F(Math.log(N(a[0]))), hypot: a => F(Math.hypot(N(a[0]), N(a[1]))) },
    Graphics: { frame_rate: () => 40, width: () => 512, height: () => 384, update: () => null, frame_count: () => R.frames.length },
    Settings: {},
    PBEffects: {},
    EliteBattle: {
      get_vector: a => { const k = a[0] instanceof Sym ? a[0].n : str(a[0]); if (k === 'BATTLER') return vecArr(T(a[1]) ? 'PLAYER' : 'ENEMY'); return vecArr(VEC[k] ? k : 'MAIN'); },
      playMoveAnimation: a => { const id = a[0] instanceof Sym ? a[0].n : str(a[0]); return runAnim('MOVE:' + id, a[1], I(a[2]), I(a[3]), a.length > 4 ? I(a[4]) : 0, a.length > 5 && T(a[5]), a.slice(7)); },
      playCommonAnimation: a => { const id = a[0] instanceof Sym ? a[0].n : str(a[0]), u = I(a[2]); return runAnim('COMMON:' + id, a[1], u, a.length > 3 && a[3] !== null ? I(a[3]) : u, a.length > 4 ? I(a[4]) : 0, false, a.slice(5)); },
      get: () => null, log: () => ({ k: KLog })
    }
  };
  const KLog = cls('Log'); for (const n of ['warn', 'error', 'debug', 'info', 'log']) KLog.m[n] = () => null;

  /* Funksjonene animasjonene kaller uten mottaker. */
  const rnd = n => Math.floor(Math.random() * n);
  const FUNCS = {
    rand: a => { if (!a.length || a[0] === null) return F(Math.random()); if (a[0] instanceof Rng) { const lo = I(a[0].a), hi = I(a[0].b) - (a[0].ex ? 1 : 0); return lo + rnd(hi - lo + 1); } const n = Math.abs(I(a[0])); return n === 0 ? F(Math.random()) : rnd(n); },
    pbBitmap: a => loadBitmap(str(a[0])),
    pbSEPlay: a => { R.cues.push([R.frames.length, str(a[0]), a.length > 1 && a[1] !== null ? N(a[1]) : 100, a.length > 2 && a[2] !== null ? N(a[2]) : 100]); return null; },
    pbDisposeSpriteHash: a => { const h = a[0]; if (h instanceof RHash) { for (const v of h.vals()) if (v && v.k && v.k.m.dispose) v.k.m.dispose(v, []); h.m.clear(); } return null; },
    pbDisposeSprite: a => { const h = a[0], v = h.get(a[1]); if (v && v.k) v.k.m.dispose(v, []); h.set(a[1], null); return null; },
    randCircleCord: a => { const r = N(a[0]), x = a.length > 1 && a[1] !== null ? N(a[1]) : rnd(Math.abs(Math.trunc(r * 2)) || 1), f = r * r - (x - r) * (x - r); if (f < 0) bad('Numerical argument is out of domain - "sqrt"'); const y = Math.sqrt(f); return [x, (rnd(2) === 0 ? Math.trunc(-y) : Math.trunc(y)) + r]; },
    /* Kurve gjennom tre punkter (kubisk Bézier der de to siste styrepunktene faller sammen), delt i like mange steg som det er bilder. */
    calculateCurve: a => { const [x1, y1, x2, y2, x3, y3] = a.slice(0, 6).map(N), fr = a.length > 6 ? I(a[6]) : 10, out = []; for (let i = 0; i < fr; i++) { const t = i / fr, u = 1 - t; out.push([F(u * u * u * x1 + 3 * u * u * t * x2 + 3 * u * t * t * x3 + t * t * t * x3), F(u * u * u * y1 + 3 * u * u * t * y2 + 3 * u * t * t * y3 + t * t * t * y3)]); } return out; },
    getPolygonPoints: a => { const n = I(a[0]), rx = a.length > 1 ? N(a[1]) : 50, ry = a.length > 2 ? N(a[2]) : 50, tx = a.length > 4 ? N(a[4]) : 256, ty = a.length > 5 ? N(a[5]) : 192, out = []; let an = a.length > 3 ? N(a[3]) : 0; for (let i = 0; i < n; i++) { const b = an * Math.PI / 180, r = rx * Math.abs(Math.cos(b)) + ry * Math.abs(Math.sin(b)); out.push([F(tx + r * Math.cos(b)), F(ty - r * Math.sin(b))]); an += Math.floor(360 / n); } return out; },
    playBattlerCry: () => null, pbWait: () => null, pbMEPlay: () => null, pbBGMPlay: () => null, pbMessage: () => null, echoln: () => null, p: () => null, puts: () => null, print: () => null,
    sprintf: a => { let i = 1; return str(a[0]).replace(/%(0?)(\d*)([dsf])/g, (m, z, w, t) => { let v = a[i++], s = t === 'd' ? String(I(v)) : t === 'f' ? String(N(v)) : str(v); while (s.length < +w) s = (z ? '0' : ' ') + s; return s; }); },
    isConst: () => false, playerBattler: a => (a[0] && a[0].i % 2 === 0),
    block_given: () => false, defined: () => false, lambda: (a, b) => b, proc: (a, b) => b, loop: (a, b) => { for (let i = 0; i < 100000; i++) if (loopBlock(b, [])) break; return null; }
  };
  FUNCS['isConst?'] = FUNCS.isConst; FUNCS['playerBattler?'] = FUNCS.playerBattler;

  /* Metodekall. Tall, tekst, lister og tabeller har sine egne metoder, resten slås opp i klassen. */
  function call(r, name, a, blk) {
    if (typeof r === 'number' || r instanceof Fl) return numCall(r, name, a, blk);
    if (r === null || r === undefined) {
      switch (name) { case 'nil?': return true; case '!': return true; case '==': return a[0] === null; case '!=': return a[0] !== null; case 'to_a': return []; case 'to_s': return ''; case 'to_i': return 0; case 'to_f': return F(0); case 'is_a?': return false; case 'respond_to?': return false; case 'inspect': return 'nil'; case '&': return false; case '|': return T(a[0]); }
      bad(`undefined method '${name}' for nil`);
    }
    if (r === true || r === false) {
      switch (name) { case '!': return !r; case '==': return a[0] === r; case '!=': return a[0] !== r; case 'nil?': return false; case '&': return r && T(a[0]); case '|': return r || T(a[0]); case '^': return r !== T(a[0]); case 'to_s': return String(r); case 'is_a?': return false; }
      bad(`undefined method '${name}' for ${r}`);
    }
    if (typeof r === 'string') return strCall(r, name, a, blk);
    if (Array.isArray(r)) return arrCall(r, name, a, blk);
    if (r instanceof RHash) return hashCall(r, name, a, blk);
    if (r instanceof Sym) { switch (name) { case '==': return a[0] === r; case '!=': return a[0] !== r; case 'to_s': case 'id2name': return r.n; case 'to_sym': return r; case 'nil?': return false; case '!': return false; case 'is_a?': return false; case 'inspect': return ':' + r.n; } bad(`undefined method '${name}' for a symbol`); }
    if (r instanceof Rng) { switch (name) { case 'each': { const lo = I(r.a), hi = I(r.b) - (r.ex ? 1 : 0); for (let i = lo; i <= hi; i++) if (loopBlock(blk, [i])) break; return r; } case 'to_a': { const o = []; for (let i = I(r.a); i <= I(r.b) - (r.ex ? 1 : 0); i++) o.push(i); return o; } case 'include?': case '===': return N(a[0]) >= N(r.a) && (r.ex ? N(a[0]) < N(r.b) : N(a[0]) <= N(r.b)); case 'first': return r.a; case 'last': return r.b; case 'nil?': return false; case '!': return false; } bad(`undefined method '${name}' for a range`); }
    if (r instanceof Blk) { if (name === 'call' || name === '[]' || name === 'yield') return callBlock(r, a); if (name === 'nil?') return false; if (name === '!') return false; bad(`undefined method '${name}' for a block`); }
    if (r.mod) { const f = MODS[r.mod][name]; if (f) return f(a, blk); if (r.consts && name in r.consts) return r.consts[name]; bad(`undefined method '${name}' for ${r.mod}`); }
    if (r.k) {
      const f = r.k.m[name];
      if (f) return f(r, a, blk);
      switch (name) { case 'nil?': return false; case '!': return false; case '==': return eq(r, a[0]); case '!=': return !eq(r, a[0]); case 'is_a?': case 'kind_of?': return isA(r, a[0]); case 'respond_to?': return !!r.k.m[a[0] instanceof Sym ? a[0].n : str(a[0])]; case 'instance_variable_get': return null; }
      bad(`undefined method '${name}' for ${r.k.n}`);
    }
    if (r.m && r.s) {       /* en klasse */
      const f = r.s[name];
      if (f) return f(a, blk);
      switch (name) { case '==': return r === a[0]; case 'nil?': return false; case '!': return false; case 'name': case 'to_s': return r.n; }
      bad(`undefined method '${name}' for ${r.n}`);
    }
    bad(`undefined method '${name}' for ${show(r)}`);
  }
  function numCall(r, name, a, blk) {
    const fl = r instanceof Fl, x = fl ? r.v : r;
    switch (name) {
      case '+': case '-': case '*': case '/': case '%': case '**': return arith(name, r, a[0]);
      case '<': case '>': case '<=': case '>=': return cmp(name, r, a[0]);
      case '==': return isN(a[0]) && N(a[0]) === x; case '!=': return !(isN(a[0]) && N(a[0]) === x);
      case '<=>': return isN(a[0]) ? (x < N(a[0]) ? -1 : x > N(a[0]) ? 1 : 0) : null;
      case '-@': return fl ? F(-x) : -x; case '+@': return r; case '!': return false; case 'nil?': return false;
      case 'abs': return fl ? F(Math.abs(x)) : Math.abs(x);
      case 'to_i': case 'to_int': case 'truncate': if (!Number.isFinite(x)) bad('FloatDomainError'); return Math.trunc(x);
      case 'to_f': return F(x);
      case 'to_s': case 'inspect': return str(r);
      case 'floor': if (!Number.isFinite(x)) bad('FloatDomainError'); return Math.floor(x);
      case 'ceil': if (!Number.isFinite(x)) bad('FloatDomainError'); return Math.ceil(x);
      /* EBDX bytter ut round med en variant som alltid gir et desimaltall. */
      case 'round': { const n = a.length ? I(a[0]) : 0, t = x * Math.pow(10, n); return F((t < 0 ? -Math.round(-t) : Math.round(t)) / Math.pow(10, n)); }
      case 'between?': return x >= N(a[0]) && x <= N(a[1]);
      case 'clamp': return fl ? F(clamp(x, N(a[0]), N(a[1]))) : clamp(x, N(a[0]), N(a[1]));
      case 'times': { for (let i = 0; i < x; i++) if (loopBlock(blk, [i])) break; return r; }
      case 'upto': { for (let i = x; i <= I(a[0]); i++) if (loopBlock(blk, [i])) break; return r; }
      case 'downto': { for (let i = x; i >= I(a[0]); i--) if (loopBlock(blk, [i])) break; return r; }
      case 'zero?': return x === 0; case 'even?': return x % 2 === 0; case 'odd?': return Math.abs(x % 2) === 1; case 'nan?': return Number.isNaN(x); case 'positive?': return x > 0; case 'negative?': return x < 0;
      case 'succ': case 'next': return x + 1; case 'pred': return x - 1;
      case 'is_a?': case 'kind_of?': return false;
      case 'delta_add': case 'delta_sub': case 'delta': return a.length && !T(a[a.length - 1]) ? F(x) : (name === 'delta_sub' ? Math.floor(x) : Math.trunc(x));
      case '&': return x & I(a[0]); case '|': return x | I(a[0]); case '^': return x ^ I(a[0]); case '<<': return x << I(a[0]); case '>>': return x >> I(a[0]);
      case 'chr': return String.fromCharCode(x);
    }
    bad(`undefined method '${name}' for a number`);
  }
  function strCall(r, name, a) {
    switch (name) {
      case '+': return r + str(a[0]); case '*': return r.repeat(I(a[0])); case '==': return r === a[0]; case '!=': return r !== a[0]; case '!': return false; case 'nil?': return false;
      case 'to_s': case 'to_str': return r; case 'to_i': return parseInt(r, a.length ? I(a[0]) : 10) || 0; case 'to_f': return F(parseFloat(r) || 0); case 'to_sym': return sym(r);
      case 'length': case 'size': return r.length; case 'include?': return r.includes(str(a[0])); case 'upcase': return r.toUpperCase(); case 'downcase': return r.toLowerCase();
      case 'split': return r.split(str(a[0])); case '[]': { if (a[0] instanceof Rng) return r.slice(I(a[0].a), a[0].ex ? I(a[0].b) : I(a[0].b) + 1); const c = r[I(a[0]) < 0 ? r.length + I(a[0]) : I(a[0])]; return c === undefined ? null : c; }
      case 'empty?': return r.length === 0; case 'start_with?': return r.startsWith(str(a[0])); case 'end_with?': return r.endsWith(str(a[0])); case 'gsub': case 'sub': return typeof a[0] === 'string' ? r.split(a[0]).join(str(a[1])) : r; case 'is_a?': return false; case 'dup': case 'clone': return r;
    }
    bad(`undefined method '${name}' for a string`);
  }
  function arrCall(r, name, a, blk) {
    switch (name) {
      case '[]': { if (a.length === 2) return r.slice(I(a[0]), I(a[0]) + I(a[1])); if (a[0] instanceof Rng) { const lo = I(a[0].a), hi = I(a[0].b); return r.slice(lo < 0 ? r.length + lo : lo, (hi < 0 ? r.length + hi : hi) + (a[0].ex ? 0 : 1)); } const i = I(a[0]), v = r[i < 0 ? r.length + i : i]; return v === undefined ? null : v; }
      case '[]=': { const i = I(a[0]); while (r.length < i) r.push(null); r[i < 0 ? r.length + i : i] = a[1]; return a[1]; }
      case 'push': case '<<': case 'append': r.push(...a); return r;
      case 'pop': return r.length ? r.pop() : null; case 'shift': return r.length ? r.shift() : null; case 'unshift': r.unshift(...a); return r;
      case 'length': case 'size': case 'count': return r.length;
      case 'each': for (let i = 0; i < r.length; i++) if (loopBlock(blk, [r[i]])) break; return r;
      case 'each_with_index': for (let i = 0; i < r.length; i++) if (loopBlock(blk, [r[i], i])) break; return r;
      case 'each_index': for (let i = 0; i < r.length; i++) if (loopBlock(blk, [i])) break; return r;
      case 'map': case 'collect': return r.map(v => callBlock(blk, [v]));
      case 'select': case 'filter': return r.filter(v => T(callBlock(blk, [v]))); case 'reject': return r.filter(v => !T(callBlock(blk, [v])));
      case 'include?': return r.some(v => eq(v, a[0])); case 'index': { const i = r.findIndex(v => eq(v, a[0])); return i < 0 ? null : i; }
      case 'first': return r.length ? r[0] : null; case 'last': return r.length ? r[r.length - 1] : null;
      case 'max': { if (!r.length) return null; let m = r[0]; for (const v of r) if (N(v) > N(m)) m = v; return m; }
      case 'min': { if (!r.length) return null; let m = r[0]; for (const v of r) if (N(v) < N(m)) m = v; return m; }
      case 'sum': return r.reduce((s, v) => arith('+', s, v), 0);
      case 'delete': { let f = null; for (let i = r.length - 1; i >= 0; i--) if (eq(r[i], a[0])) { f = r[i]; r.splice(i, 1); } return f; }
      case 'delete_at': { const i = I(a[0]); if (i >= r.length || i < -r.length) return null; return r.splice(i, 1)[0]; }
      case 'clear': r.length = 0; return r; case 'empty?': return r.length === 0; case 'any?': return r.length > 0;
      case 'clone': case 'dup': return r.slice(); case 'reverse': return r.slice().reverse(); case 'compact': return r.filter(v => v !== null); case 'flatten': return r.flat(Infinity); case 'uniq': return r.filter((v, i) => r.findIndex(w => eq(v, w)) === i);
      case 'sample': return r.length ? r[rnd(r.length)] : null; case 'shuffle': { const o = r.slice(); for (let i = o.length - 1; i > 0; i--) { const j = rnd(i + 1); [o[i], o[j]] = [o[j], o[i]]; } return o; }
      case 'join': return r.map(str).join(a.length ? str(a[0]) : ''); case 'sort': return r.slice().sort((p, q) => N(p) - N(q));
      case '+': return r.concat(a[0]); case '-': return r.filter(v => !a[0].some(w => eq(v, w))); case '*': return arith('*', r, a[0]);
      case '==': return eq(r, a[0]); case '!=': return !eq(r, a[0]); case '!': return false; case 'nil?': return false; case 'is_a?': return false; case 'to_a': return r;
      case 'string_include?': return r.some(v => typeof v === 'string' && str(a[0]).includes(v));
    }
    bad(`undefined method '${name}' for a list`);
  }
  function hashCall(r, name, a, blk) {
    switch (name) {
      case '[]': return r.get(a[0]); case '[]=': return r.set(a[0], a[1]);
      case 'keys': return r.keys(); case 'values': return r.vals(); case 'length': case 'size': return r.m.size;
      case 'has_key?': case 'key?': case 'include?': case 'member?': return a.every(k => r.has(k)); case 'try_key?': return a.every(k => r.has(k) && T(r.get(k)));
      case 'delete': return r.del(a[0]); case 'clear': r.m.clear(); return r; case 'empty?': return r.m.size === 0;
      case 'each': case 'each_pair': for (const k of r.keys()) if (loopBlock(blk, [k, r.get(k)])) break; return r;
      case 'each_key': for (const k of r.keys()) if (loopBlock(blk, [k])) break; return r; case 'each_value': for (const v of r.vals()) if (loopBlock(blk, [v])) break; return r;
      case 'clone': case 'dup': { const h = new RHash(); for (const k of r.keys()) h.set(k, r.get(k)); return h; }
      case '==': return r === a[0]; case '!': return false; case 'nil?': return false; case 'is_a?': return false;
    }
    bad(`undefined method '${name}' for a table`);
  }

  /* ---------- Kjøring ---------- */
  /* Starter én animasjon i scenen: user og target er 0 (din) eller 1 (motstanderens). Blokken får de samme navngitte verdiene som i EBDX. */
  function runAnim(key, S, user, target, hitNum, multiHit, extra) {
    let k = key; for (let i = 0; i < 4 && E.data.alias[k]; i++) k = E.data.alias[k];
    const a = E.data.anims[k];
    if (!a) { R.noanim.push(k); return false; }
    if (++R.depth > 6) bad('animations nested too deep');
    const old = SELF, oldCtl = CTL;
    SELF = { '@scene': S, '@battle': S.battle, '@sprites': S.sprites, '@userSprite': S.bat[user] || null, '@targetSprite': S.bat[target] || null, '@userDatabox': S.box[user] || null, '@targetDatabox': S.box[target] || null,
      '@multiHit': !!multiHit, '@hitNum': hitNum || 0, '@itself': user === target, '@userIsPlayer': user % 2 === 0, '@targetIsPlayer': target % 2 === 0, '@vector': S.vec, '@battlers': S.battle.battlers, '@opponent': null,
      '@userIndex': user, '@targetIndex': target, '@viewport': S.vp };
    try {
      const sc = scope(null); CTL = 0;
      /* Blokken får hele listen med ekstra verdier som sitt ene argument. Har den flere navn, fordeles listen på dem. */
      if (a.p.length === 1) sc.v[a.p[0]] = extra; else a.p.forEach((p, i) => { sc.v[p] = i < extra.length ? extra[i] : null; });
      if (a.b !== null) ev(a.b, sc);
    } finally { SELF = old; CTL = oldCtl; R.depth--; }
    return true;
  }
  /* Gjør et opptak av animasjonen key ('MOVE:TACKLE', 'COMMON:BURN' …).
     o.me og o.foe beskriver de to Pokémonene i kampskjermen: føttenes plass (x, y) og bildets størrelse (w, h), alt i 512 × 384.
     o.user og o.target er 0 eller 1. Gir null hvis animasjonen ikke finnes eller stopper med en feil. */
  E.record = (key, o) => {
    if (!E.ok) return null;
    let k = key; for (let i = 0; i < 4 && E.data.alias[k]; i++) k = E.data.alias[k];
    if (!E.data.anims[k]) return null;
    const prev = R;
    R = { sprites: [], bmps: [], frames: [], cues: [], uses: new Set(), missing: [], noanim: [], vers: {}, seq: 0, depth: 0, scene: null, key };
    for (const n of Object.keys(consts)) delete consts[n];
    setCams(o.me, o.foe);
    try {
      const vp = mkViewport(0, 0, 512, 384), vec = mkVector(), d = spoof(VEC.MAIN);
      const room = { k: KRoom, x: 0, y: 0, zx: ROOM_SCALE, zy: ROOM_SCALE, ox: d[0] / 1.5 - 16, oy: d[1] / 1.5 + 16, focused: true };
      const S = { k: KScene, vp, vec, room, bat: [null, null], box: [null, null], battle: { k: KBattle, battlers: [] }, sprites: new RHash(), boxes: true, afterAnim: false, inMoveAnim: false };
      R.scene = S;
      [o.me, o.foe].forEach((p, i) => {
        if (!p) return;
        const z = p.z0 || (i ? 1 : 2), m = mkMon(i, Math.max(2, Math.round(p.w / z)), Math.max(2, Math.round(p.h / z)), z);
        /* Plassen på banen regnes ut baklengs, så Pokémonen står akkurat der den står i kampskjermen når kameraet er i ro. */
        m.ex = room.ox - (d[0] - p.x) / ROOM_SCALE; m.ey = room.oy - (d[1] - p.y) / ROOM_SCALE;
        m.base.z = m.z;
        /* En som er borte fra før (oppe i lufta, nede i bakken) starter skjult. Animasjonen henter den selv fram. */
        if (o.hide && o.hide[i]) { m.hidden = true; m.visible = false; }
        S.bat[i] = m; S.box[i] = { k: KBox, visible: true, x: 0, y: 0, opacity: 255 };
        S.battle.battlers[i] = { k: KBattler, i };
        S.sprites.set('pokemon_' + i, m); S.sprites.set('dataBox_' + i, S.box[i]);
      });
      S.sprites.set('battlebg', room);
      roomUpdate(room, vec);
      for (const m of S.bat) if (m) { m.x = m.base.x; m.y = m.base.y; }
      R.rest = S.bat.map(m => m ? [m.x, m.y, m.z0, m.ox0, m.oy0] : null);
      const ok = runAnim(key, S, o.user, o.target, o.hitNum || 0, !!o.multiHit, o.args || []);
      if (!ok) return null;
      const main = R.frames.length;
      /* Hvor lenge det faktisk skjer noe: siste bilde med en effekt på skjermen, eller der en Pokémon er flyttet, farget eller gjemt. Etter det er det bare kameraet som glir hjem. */
      let busy = 0;
      for (let i = main - 1; i >= 0 && !busy; i--) { const f = R.frames[i]; if (f.n || f.vc || f.b.some((b, j) => b && (b[2] !== S.bat[j].ox0 || b[3] !== S.bat[j].oy0 || b[8] < 255 || Math.abs(b[9]) > 0.5 || Math.abs(b[10]) > 0.5 || Math.abs(b[11]) > 0.5 || b[12] > 0.5 || b[16] > 0.5))) busy = i + 1; }
      /* Etterpå glir kameraet hjem, og Pokémonene stilles på plass igjen. */
      KVector.m.reset(vec);
      for (const s of R.sprites) s.gone = true;
      vp.color.a = 0; S.boxes = true; room.focused = true;
      /* En Pokémon som animasjonen har sendt bort (opp i lufta, ut av banen) blir borte hvis kampen sier at den skal være det (o.keep). */
      const gone = S.bat.map((m, i) => !!(m && o.keep && o.keep[i] && (m.hidden || !m.visible || m.opacity === 0)));
      for (const m of S.bat) if (m) { m.ox = m.ox0; m.oy = m.oy0; m.angle = 0; m.mirror = false; m.opacity = 255; m.visible = !gone[m.i]; m.hidden = gone[m.i]; KTone.m.set(m.tone, [0, 0, 0, 0]); m.color.a = 0; }
      for (let i = 0; i < 40; i++) { tick(S, true); const v = vec, s = v.set; if (Math.abs(s[0] - v.x) < 0.6 && Math.abs(s[1] - v.y) < 0.6 && Math.abs(s[3] - v.scale) < 0.6 && Math.abs(s[4] - v.zoom1) < 0.004) break; }
      if (R.frames.length === 0) return null;
      /* Treffet: første bilde der animasjonen rører målet (rister det, farger det, flytter det), men aldri før en tredel er spilt. */
      const tg = S.bat[o.target], tt = tg && o.user !== o.target && tg.touched >= 0 ? tg.touched : -1;
      busy = Math.max(1, Math.min(main, busy || main));
      const rec = { key, frames: R.frames, n: R.frames.length, main, busy, touch: tt, hit: tt >= 0 ? Math.min(busy, Math.max(tt, Math.round(busy * 0.25))) : busy, bmps: R.bmps.map(b => ({ w: b.w, h: b.h, img: b.img })), vers: R.vers, cues: R.cues, uses: [...R.uses], missing: R.missing, noanim: R.noanim, rest: R.rest, gone, user: o.user, target: o.target };
      return rec;
    } catch (e) {
      if (!(e instanceof RErr) && !(e instanceof RangeError)) throw e;
      E.log.push(key + ': ' + e.message); if (E.log.length > 60) E.log.shift();
      E.lastError = e.message;
      return null;
    } finally { R = prev; SELF = null; CTL = 0; }
  };
  /* Tar i bruk animasjonene fra pakken: { anims, alias, img, map }. */
  E.load = d => { E.data = d && d.anims ? { anims: d.anims, alias: d.alias || {}, img: d.img || {}, map: d.map || {}, uses: d.uses || {} } : null; E.ok = !!E.data; };
  E.has = key => { if (!E.ok) return false; let k = key; for (let i = 0; i < 4 && E.data.alias[k]; i++) k = E.data.alias[k]; return !!E.data.anims[k]; };
  /* Bildene en animasjon kan komme til å bruke (regnet ut da pakken ble bygd). */
  E.imagesOf = key => { if (!E.ok) return []; let k = key; for (let i = 0; i < 4 && E.data.alias[k]; i++) k = E.data.alias[k]; return E.data.uses[k] || []; };
  E.VEC = VEC; E.ROOM_SCALE = ROOM_SCALE; E.spoof = spoof; E.STR = STR;
  return E;
})();
if (typeof module !== 'undefined') module.exports = EBX;
