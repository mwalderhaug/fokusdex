'use strict';
/* Fokusdex – arenaene: stedet der en legendarisk møter deg, som terreng i stedet for et bilde med to plattformer (work/RAIDS.md regel 5–7).
   Én beskrivelse per art (ARENA.def) brukes både av filmen og av kampen, så filmens siste bilde er arenaen kampen starter i:
     yh        horisonten i kampvinkelen (K.stage)
     use       bilder fra pakken (bare ekstra detalj: alt skal se like bra ut uten)
     scene(S)  alt bak de to figurene: himmel, fjell, bakken (K.ground) og det de står på. Setter også etterbehandlingen (K.P).
     front(S)  det som ligger foran figurene: nære partikler, røyk og det som sitter på «linsa»
     ev        hendelsene kampen kan be om: { field: { len, cues }, rage: { len, cues }, enter: { len, cues } } (lyd og risting som i raidx.js)
     film      introen (som filmene i raid.js, med gl: 1): draw(t, P, c) flytter kameraet (K.camTo) og kaller ARENA.scene og ARENA.front selv
     pose      { cz, k } kampvinkelen og størrelsen til figuren når ingen kamp sier noe annet (filmverkstedet)
   S er arenaens tilstand i øyeblikket: { t, film, cc, p2 (fase 2: 0 → 1 når den legendariske blir rasende), since(navn) (sekunder siden en hendelse),
     hits [{ t, side, big }], foe og me (plassene i bildet), er og andre tall filmen setter selv }.
   I kampen tegnes scenen på et lerret bak figurene (gjennom WebGL, fxgl.js) og front på et lerret foran dem. */
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
  const state = (t, o) => { const S = Object.assign({ t, film: false, cc: '#ffffff', p2: 0, hits: [], ev: {}, foe: A.FOE, me: A.ME }, o || {}); S.since = n => S.ev[n] == null ? 1e9 : S.t - S.ev[n]; return S; };
  A.state = state;
  /* Fra filmene: scenen og forgrunnen til en art, i filmens tid. */
  A.scene = (id, S) => { const d = A.defs[id]; K.stage({ yh: d.yh }); if (S.cam) K.camTo(S.cam); d.scene(S); };
  A.front = (id, S) => { const d = A.defs[id]; if (d.front) d.front(S); };
  /* Lysblinket der et angrep treffer (alle arenaer får det): et kort skjær rundt den som ble truffet. Tegnes i front. */
  const hitGlow = S => { for (const h of S.hits) { const k = (S.t - h.t) / 0.34; if (k < 0 || k >= 1) continue; const p = h.side === 'me' ? S.me : S.foe, y = p[1] - (h.side === 'me' ? 70 : 62); K.blob(p[0], y, (h.big ? 150 : 100) * (0.6 + 0.4 * k), h.big ? '#fff6e0' : '#ffffff', (1 - k) * (h.big ? 0.5 : 0.32), 1); } };

  /* ---------- Kampen ---------- back = lerretet bak figurene, front = lerretet foran. o = { cc, k } (BT.airO i bui.js).
     Gir en funksjon som stopper arenaen, med ev(navn, cue) (spiller en hendelse og gir et løfte), hit(side, big) og on. */
  A.run = (back, front, id, o) => {
    const d = A.defs[id]; o = o || {}; let on = true, raf = 0, slow = 0, skip = 0, last = 0; const t0 = performance.now(), ev = {}, hits = [], now = () => (performance.now() - t0) / 1000 + 100;
    I.need(d.use || []);
    const cur = { id, f: d, sp: null, sps: {}, cc: o.cc || '#ffffff' };
    const step = ts => {
      if (!on || !back.isConnected) return; raf = requestAnimationFrame(step);
      /* Holder ikke enheten 60 bilder i sekundet (målt over tid), tegnes annethvert bilde. */
      if (slow > 30 && (skip = !skip)) return;
      const c0 = performance.now(), T = now(), S = state(T, { cc: cur.cc, ev, hits, p2: ev.rage == null ? 0 : eo(seg(T, ev.rage + 0.5, ev.rage + 3.2)), rage: ev.rage != null });
      const rs = K.gl() ? C.RS : 1, B = I.buf(rs), g = B.getContext('2d'), P = I.newP();
      g.setTransform(rs, 0, 0, rs, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = true; g.clearRect(0, 0, W, H);
      I.set(g, T, P, cur, rs);
      try { A.scene(id, S); } catch (e) { C.err = String(e && e.stack || e); }
      g.setTransform(1, 0, 0, 1, 0, 0);
      if (!C.gpu(back, B)) { if (rs > 1) { C.RS = 1; return; } I.soften(B); I.present(back, B); }
      if (front && front.isConnected) {
        const f = front.getContext('2d'); f.setTransform(front.width / W, 0, 0, front.height / H, 0, 0); f.globalAlpha = 1; f.globalCompositeOperation = 'source-over'; f.imageSmoothingEnabled = true; f.clearRect(0, 0, W, H);
        I.set(f, T, I.newP(), cur);
        try { A.front(id, S); hitGlow(S); } catch (e) { C.err = String(e && e.stack || e); }
      }
      C.tick(); const cost = performance.now() - c0; slow = cost > 13 ? min(60, slow + 1) : max(0, slow - 0.25); last = ts;
    };
    raf = requestAnimationFrame(step);
    const stop = () => { on = false; stop.on = false; cancelAnimationFrame(raf); };
    stop.on = true; stop.id = id;
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
    const rs = K.gl() ? C.RS : 1, cur = { id, f: d, sp, sps: me ? { me } : {}, cc: S.cc }, B = I.buf(rs), g = B.getContext('2d'), P = I.newP();
    g.setTransform(rs, 0, 0, rs, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = true; g.clearRect(0, 0, W, H);
    I.set(g, T, P, cur, rs); try { A.scene(id, S); } catch (e) { C.err = String(e && e.stack || e); } g.setTransform(1, 0, 0, 1, 0, 0);
    if (!tmp) { tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; }
    if (!C.gpu(tmp, B)) { I.soften(B); I.present(tmp, B); }
    if (out.width !== W * rs && !o.keep) { out.width = W * rs; out.height = H * rs; }
    const x = out.getContext('2d'), pose = o.noFig ? (o.pose || { cz: 1, k: 1 }) : A.fit(o.pose || d.pose || { cz: 1.1, k: 1 }, sp), cz = pose.cz, u = out.width / W;
    x.setTransform(u, 0, 0, u, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.imageSmoothingEnabled = false; x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    x.save(); x.translate(230.4, 307.2); x.scale(cz, cz); x.translate(-230.4, -307.2); x.imageSmoothingEnabled = true; x.drawImage(tmp, 0, 0, W, H); x.imageSmoothingEnabled = false;
    I.set(x, T, I.newP(), cur);
    if (sp) K.mon(A.FOE[0], A.FOE[1], 1.6 * pose.k, { box: 1, ft: o.ft == null ? 0 : o.ft });
    if (me) K.mon(A.ME[0], A.ME[1], 1.6 * (pose.km || 1.9), { id: 'me' });
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
