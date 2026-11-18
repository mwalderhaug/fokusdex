'use strict';
/* Fokusdex – arenaene: stedet der en legendarisk møter deg, som terreng i stedet for et bilde med to plattformer (work/RAIDS.md regel 5–7).
   Én beskrivelse per art (ARENA.def) brukes både av filmen og av kampen, så filmens siste bilde er arenaen kampen starter i:
     yh, hc    horisonten i kampvinkelen, og kameraets høyde over bakken når den ikke følger av horisonten (K.stage)
     use       bilder fra pakken (bare ekstra detalj: alt skal se like bra ut uten)
     scene(S)  alt bak de to figurene: himmel, fjell, bakken (K.ground) og det de står på. Setter også etterbehandlingen (K.P).
     mid(S)    det som ligger mellom de to figurene: foran den legendariske og bak din egen (vann den står i, sprut, tåke). Tegnes i arenaens egne
               piksler (før kampens kamera zoomer); S.back er det ferdige bildet bak figurene, så en bit av det kan legges foran den legendariske.
     front(S)  det som ligger foran figurene: nære partikler, røyk og det som sitter på «linsa»
     ev        hendelsene kampen kan be om: { field: { len, cues }, rage: { len, cues }, enter: { len, cues } } (lyd og risting som i raidx.js)
     film      introen (som filmene i raid.js, med gl: 1): draw(t, P, c) flytter kameraet (K.camTo) og kaller ARENA.scene og ARENA.front selv
     pose      { cz, k } kampvinkelen og størrelsen til figuren når ingen kamp sier noe annet (filmverkstedet)
   S er arenaens tilstand i øyeblikket: { t, film, cc, p2 (fase 2: 0 → 1 når den legendariske blir rasende), since(navn) (sekunder siden en hendelse),
     hits [{ t, side, big }], foe og me (plassene i bildet), fk og mk (størrelsen på de to figurene: K.mon tegner dem med 1,6 ganger dette),
     ft og ftm (hvor i animasjonen de er, til skygger og speilbilder), er og andre tall filmen setter selv }.
   I kampen tegnes scenen på et lerret bak figurene (gjennom WebGL, fxgl.js), mid på et lerret mellom dem og front på et lerret foran dem.
   FIGURENE I KAMPEN eies av kampskjermen (plass, størrelse, treff, besvimelse, EBDX), men arenaen tegner dem selv, så de får scenens lys (K.lightSet):
   et lerret legges ved siden av bildet i samme element og får samme stil, bildet skjules, og lerretet tegnes for hvert bilde med K.mon. scene(S) kan
   derfor også tegne skyggen og speilbildet til de to (K.cur.sp = den legendariske, K.cur.sps.me = din egen) i takt med figurene.
   Lar bildet seg ikke hente, står kampskjermens eget bilde som før. */
const ARENA = (() => {
  const C = CINE, K = C.kit, I = C._, { W, H, max, min, floor, c01, seg, eo } = K, A = { defs: {} };
  A.def = (id, d) => { A.defs[id] = d; d.id = id; if (d.film) K.film(id, Object.assign({ gl: 1, ani: 1, arena: id, use: d.use || [] }, d.film)); };
  A.has = id => !!A.defs[id];
  /* Plassene i bildet (512 × 384, før kampens kamera zoomer): den legendariske og din egen. */
  A.FOE = [377, 198]; A.ME = [190, 372];
  /* Størrelsen den legendariske får i kampen: pose = { cz, k } fra kampen (foePose i bui.js), med samme tak som kampskjermen setter (seat i bui.js),
     så den aldri kuttes av kanten eller toppen. sp = bildet (med animasjonen, som har målene til GIF-ruta). */
  A.fit = (pose, sp) => { const an = sp && sp.ani, w = an ? an.gw : sp ? sp.cv.width : 96, h = an ? an.gh : sp ? sp.cv.height : 96, cz = pose.cz, fx = 256 * (0.45 + 0.286 * cz), fy = 192 * (0.8 - 0.285 * cz); return { cz, k: min(pose.k, max(60, min(150, 2 * (256 - fx) - 6)) / (w * 0.8 * cz), max(50, min(106, fy - 5)) / (h * 0.8 * cz)), km: pose.km || 1.9 }; };
  /* En tilstand. ev = { navn: tidspunkt }, o = egne tall. */
  const state = (t, o) => { const S = Object.assign({ t, film: false, cc: '#ffffff', p2: 0, hits: [], ev: {}, foe: A.FOE, me: A.ME, ft: 0, ftm: 0, fk: 1, mk: 1.9 }, o || {}); S.since = n => S.ev[n] == null ? 1e9 : S.t - S.ev[n]; return S; };
  A.state = state;
  /* Fra filmene: scenen og forgrunnen til en art, i filmens tid. */
  A.scene = (id, S) => { const d = A.defs[id]; K.stage({ yh: d.yh, hc: d.hc }); if (S.cam) K.camTo(S.cam); d.scene(S); };
  A.mid = (id, S) => { const d = A.defs[id]; if (d.mid) d.mid(S); };
  A.front = (id, S) => { const d = A.defs[id]; if (d.front) d.front(S); };
  /* Lysblinket der et angrep treffer (alle arenaer får det): et kort skjær rundt den som ble truffet. Tegnes i front. */
  const hitGlow = S => { for (const h of S.hits) { const k = (S.t - h.t) / 0.34; if (k < 0 || k >= 1) continue; const p = h.side === 'me' ? S.me : S.foe, y = p[1] - (h.side === 'me' ? 70 : 62); K.blob(p[0], y, (h.big ? 150 : 100) * (0.6 + 0.4 * k), h.big ? '#fff6e0' : '#ffffff', (1 - k) * (h.big ? 0.5 : 0.32), 1); } };

  /* Den legendariske gløder selv (tegnene til Groudon og Kyogre): lyset setter glow = { mask (K.MASK), col, a }, og de pikslene tegnes lysende oppå figuren. */
  /* Den legendariske som 3D-figur (raid3d.js, G3D.sprite): lerretet dekker hele bildet i figurens piksler og flyttes i hele piksler. Tegnes skarpt, uten utjevning. */
  A.fig3 = (x, f) => { if (!f || !f.cv) return; const s = W / f.cv.width, sm = x.imageSmoothingEnabled; x.imageSmoothingEnabled = false; x.drawImage(f.cv, f.ox * s, f.oy * s, W, H); x.imageSmoothingEnabled = sm; };
  A.glow = (x, y, s, G, o) => { if (G && G.a > 0.01) K.mon(x, y, s, Object.assign({}, o, { mask: G.mask, col: G.col, add: 1, a: G.a })); };
  /* En figur på kampskjermen (el = #s-foe eller #s-me), tegnet på et eget lerret med scenens lys. D = det arenaen husker om siden. Gir bildet (sp) når det tegnes. */
  const litDom = (side, el, D, T, L, cur) => {
    const im = el && el.querySelector('img.spr'); if (!im) return null;
    const off = () => { if (D.cv && D.cv.isConnected) D.cv.remove(); D.cv = null; im.classList.remove('lit0'); return null; };
    if (!L || !im.complete || !im.naturalWidth || (el.querySelector('.sprb.dark'))) return off();
    const sp = C.spriteOf(im.currentSrc || im.src); if (!sp) return off();
    if (D.im !== im) { D.im = im; D.t0 = T; }
    let cv = D.cv; if (!cv || !cv.isConnected || cv.previousElementSibling !== im) { if (cv && cv.isConnected) cv.remove(); cv = D.cv = document.createElement('canvas'); cv.className = 'spr ok lit'; im.after(cv); }
    if (cv.width !== sp.w || cv.height !== sp.h) { cv.width = sp.w; cv.height = sp.h; }
    const x = cv.getContext('2d'), P = I.newP(); P.light = side === 'me' && L.me ? Object.assign({}, L, L.me) : L;
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, sp.w, sp.h);
    I.set(x, T, P, { id: 'dom:' + side, f: cur.f, sp, sps: {}, cc: cur.cc });
    try { K.mon(sp.w / 2, sp.h, 1, { box: 1, ft: T - D.t0, hq: 1 }); A.glow(sp.w / 2, sp.h, 1, side === 'foe' ? L.glow : null, { box: 1, ft: T - D.t0, hq: 1 }); } catch (e) { C.err = String(e && e.stack || e); return off(); }
    const fl = im.style.filter || ''; if (cv.style.filter !== fl) cv.style.filter = fl;
    im.classList.add('lit0'); D.ft = T - D.t0; return sp;
  };
  /* ---------- Kampen ---------- back = lerretet bak figurene, front = lerretet foran, o.mid = lerretet mellom figurene. o = { cc, k, mid } (BT.airO i bui.js).
     Gir en funksjon som stopper arenaen, med ev(navn, cue) (spiller en hendelse og gir et løfte), hit(side, big) og on. */
  A.run = (back, front, id, o) => {
    const d = A.defs[id]; o = o || {}; let on = true, raf = 0, slow = 0, skip = 0, last = 0, held = false; const t0 = performance.now(), ev = {}, hits = [], now = () => (performance.now() - t0) / 1000 + 100;
    I.need(d.use || []);
    const cur = { id, f: d, sp: null, sps: {}, cc: o.cc || '#ffffff' }, mid = d.mid && o.mid ? o.mid : null, camEl = mid && back.closest ? back.closest('.cam') : null;
    const kOf = (D, def) => { try { return parseFloat(D.el.style.getPropertyValue('--k')) || def; } catch (_) { return def; } };
    const arEl = back.closest ? back.closest('.arena') : null, dom = { foe: { el: arEl && arEl.querySelector('#s-foe') }, me: { el: arEl && arEl.querySelector('#s-me') } };
    /* Kampens kamera (zoom rundt 45 %, 80 %) akkurat nå, også midt i en overgang. */
    const camZ = () => { try { const m = getComputedStyle(camEl).transform, q = /matrix\(([-\d.e]+)/.exec(m || ''); return q ? +q[1] || 1 : 1; } catch (_) { return 1; } };
    const step = ts => {
      if (!on || !back.isConnected) return; raf = requestAnimationFrame(step); if (held) return;
      /* Holder ikke enheten 60 bilder i sekundet (målt over tid), tegnes annethvert bilde. */
      if (slow > 30 && (skip = !skip)) return;
      const c0 = performance.now(), T = now(), S = state(T, { cc: cur.cc, ev, hits, p2: ev.rage == null ? 0 : eo(seg(T, ev.rage + 0.5, ev.rage + 3.2)), rage: ev.rage != null, ft: dom.foe.ft || 0, ftm: dom.me.ft || 0, fk: kOf(dom.foe, 1), mk: kOf(dom.me, 1.9) });
      const rs = K.gl() ? C.RS : 1, B = I.buf(rs), g = B.getContext('2d'), P = I.newP();
      g.setTransform(rs, 0, 0, rs, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = true; g.clearRect(0, 0, W, H);
      I.set(g, T, P, cur, rs);
      try { A.scene(id, S); } catch (e) { C.err = String(e && e.stack || e); }
      g.setTransform(1, 0, 0, 1, 0, 0); const L = P.light;
      if (!C.gpu(back, B)) { if (rs > 1) { C.RS = 1; return; } I.soften(B); I.present(back, B); }
      if (cur.fig3) { const x = back.getContext('2d'), u = back.width / W; x.save(); x.setTransform(u, 0, 0, u, 0, 0); A.fig3(x, cur.fig3); x.restore(); }
      /* Figurene med scenens lys (neste bilde av scenen får dem til skygger og speilbilder). */
      cur.sp = litDom('foe', dom.foe.el, dom.foe, T, L, cur) || null; const spm = litDom('me', dom.me.el, dom.me, T, L, cur); if (spm) cur.sps.me = spm; else delete cur.sps.me;
      if (mid && mid.isConnected) {
        if (mid.width !== back.width) { mid.width = back.width; mid.height = back.height; mid.style.imageRendering = 'auto'; }
        const f = mid.getContext('2d'), cz = camEl ? camZ() : 1, u = mid.width / W; f.setTransform(u, 0, 0, u, 0, 0); f.globalAlpha = 1; f.globalCompositeOperation = 'source-over'; f.clearRect(0, 0, W, H);
        f.translate(230.4, 307.2); f.scale(cz, cz); f.translate(-230.4, -307.2); S.back = back; S.cz = cz;
        const Pm = I.newP(); Pm.light = L; I.set(f, T, Pm, cur);
        try { A.mid(id, S); } catch (e) { C.err = String(e && e.stack || e); }
      }
      if (front && front.isConnected) {
        const f = front.getContext('2d'); f.setTransform(front.width / W, 0, 0, front.height / H, 0, 0); f.globalAlpha = 1; f.globalCompositeOperation = 'source-over'; f.imageSmoothingEnabled = true; f.clearRect(0, 0, W, H);
        I.set(f, T, I.newP(), cur);
        try { A.front(id, S); hitGlow(S); } catch (e) { C.err = String(e && e.stack || e); }
      }
      C.tick(); const cost = performance.now() - c0; slow = cost > 13 ? min(60, slow + 1) : max(0, slow - 0.25); last = ts;
    };
    raf = requestAnimationFrame(step);
    const stop = () => { on = false; stop.on = false; cancelAnimationFrame(raf); for (const D of [dom.foe, dom.me]) { if (D.cv && D.cv.isConnected) D.cv.remove(); if (D.im) D.im.classList.remove('lit0'); } };
    stop.on = true; stop.id = id; stop.pause = v => { held = !!v; };   /* på vent mens en cutscene spilles over kampen */
    /* En hendelse fra kampen: 'enter' (kampen starter), 'field' (stedet slår til), 'rage' (halv HP: fase 2). cue(navn, verdi) gir lyd og risting. */
    stop.ev = (name, cue) => new Promise(res => {
      if (!on) return res(false); const E = (d.ev || {})[name] || { len: 0.6 }; ev[name] = now();
      const cues = (E.cues || []).map(q => ({ t: q[0], n: q[1], v: q[2], on: false })), s0 = performance.now();
      const tick = () => { const t = (performance.now() - s0) / 1000; for (const q of cues) if (!q.on && t >= q.t) { q.on = true; if (cue) try { cue(q.n, q.v); } catch (_) {} } if (t >= E.len || !on) return res(true); setTimeout(tick, 40); };
      tick();
    });
    stop.hit = (side, big) => { if (!on) return; hits.push({ t: now(), side, big: !!big }); if (hits.length > 4) hits.shift(); };
    return stop;
  };
  /* ---------- Til testing og til «redusert bevegelse»: ett bilde av arenaen slik den står i kampen ----------
     o = { cc, rage (fase 2), ev { navn: sekunder siden }, hit, noFig (uten figurer), me (arten som står nærmest), pose { cz, k }, plain (uten forgrunn) }. */
  let tmp = null;
  C.arenaStill = async (out, id, t, o) => {
    const d = A.defs[id]; if (!d) return 'no arena'; o = o || {}; C.err = '';
    await I.need(d.use || []); const sp = o.noFig ? null : await I.loadSprite(id); if (sp && C.loadAni) await C.loadAni(id, sp);
    const me = o.me && !o.noFig ? await I.loadSprite('back/' + o.me) : null;
    const T = t + 100, ev = {}; Object.keys(o.ev || {}).forEach(k => { ev[k] = T - o.ev[k]; }); if (o.rage && ev.rage == null) ev.rage = T - 30;
    const S = state(T, { cc: o.cc || '#ffffff', ev, hits: o.hit ? [{ t: T - 0.08, side: o.hit, big: true }] : [], p2: ev.rage == null ? 0 : eo(seg(T, ev.rage + 0.5, ev.rage + 3.2)), rage: ev.rage != null });
    const pose = o.noFig ? (o.pose || { cz: 1, k: 1 }) : A.fit(o.pose || d.pose || { cz: 1.1, k: 1 }, sp), cz = pose.cz;
    S.ft = o.ft == null ? 0 : o.ft; S.ftm = 0; S.fk = pose.k; S.mk = pose.km || 1.9;
    const rs = K.gl() ? C.RS : 1, cur = { id, f: d, sp, sps: me ? { me } : {}, cc: S.cc }, B = I.buf(rs), g = B.getContext('2d'), P = I.newP();
    g.setTransform(rs, 0, 0, rs, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = true; g.clearRect(0, 0, W, H);
    I.set(g, T, P, cur, rs); try { A.scene(id, S); } catch (e) { C.err = String(e && e.stack || e); } g.setTransform(1, 0, 0, 1, 0, 0);
    if (!tmp) { tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; }
    if (!C.gpu(tmp, B)) { I.soften(B); I.present(tmp, B); }
    if (out.width !== W * rs && !o.keep) { out.width = W * rs; out.height = H * rs; }
    const x = out.getContext('2d'), u = out.width / W;
    x.setTransform(u, 0, 0, u, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.imageSmoothingEnabled = false; x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    x.save(); x.translate(230.4, 307.2); x.scale(cz, cz); x.translate(-230.4, -307.2); x.imageSmoothingEnabled = true; x.drawImage(tmp, 0, 0, W, H); x.imageSmoothingEnabled = false;
    if (cur.fig3) A.fig3(x, cur.fig3);
    const L = P.light, Pf = I.newP(); Pf.light = o.nolight ? null : L; I.set(x, T, Pf, cur);
    if (sp) { K.mon(A.FOE[0], A.FOE[1], 1.6 * pose.k, { box: 1, ft: o.ft == null ? 0 : o.ft, hq: 1 }); if (L && !o.nolight) A.glow(A.FOE[0], A.FOE[1], 1.6 * pose.k, L.glow, { box: 1, ft: o.ft == null ? 0 : o.ft, hq: 1 }); }
    if (d.mid && !o.plain) { S.back = tmp; S.cz = cz; try { A.mid(id, S); } catch (e) { C.err = String(e && e.stack || e); } }
    if (me) { const Pm = I.newP(); Pm.light = o.nolight || !L ? null : L.me ? Object.assign({}, L, L.me) : L; I.set(x, T, Pm, cur); K.mon(A.ME[0], A.ME[1], 1.6 * (pose.km || 1.9), { id: 'me', hq: 1 }); I.set(x, T, Pf, cur); }
    x.restore();
    if (!o.plain) { I.set(x, T, I.newP(), cur); try { A.front(id, S); hitGlow(S); } catch (e) { C.err = String(e && e.stack || e); } }
    x.setTransform(1, 0, 0, 1, 0, 0);
    return C.err || '';
  };
  C.arena = id => A.defs[id] || null;
  /* Oppløsningen (CINE.RS): halvannen gang 512 × 384 på skjermer med høy tetthet (telefoner og nyere Mac-er), ellers 512 × 384. ?rs=2 i adressen overstyrer (testing).
     raid.js går ned til 1 hvis enheten ikke holder farten. */
  try { const q = /[?&]rs=([\d.]+)/.exec(location.search); C.RS = q ? max(1, min(2, +q[1])) : (window.devicePixelRatio || 1) >= 2 ? 1.5 : 1; } catch (_) {}
  /* Bildetelleren: ?fps=1 i adressen viser bilder i sekundet for filmen eller arenaen som går, og om WebGL er i bruk. */
  try { if (/[?&]fps=1/.test(location.search)) C.onfps = n => { let el = document.getElementById('fpsm'); if (!el) { el = document.createElement('div'); el.id = 'fpsm'; el.style.cssText = 'position:fixed;left:6px;top:6px;z-index:99999;font:700 12px ui-monospace,monospace;color:#9f9;background:rgba(0,0,0,.6);padding:2px 6px;border-radius:6px;pointer-events:none'; document.body.appendChild(el); } el.textContent = n + ' fps · ' + (typeof FXGL !== 'undefined' && FXGL.on ? 'gl' : '2d'); }; } catch (_) {}
  return A;
})();
