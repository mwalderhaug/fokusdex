'use strict';
/* Fokusdex – ressurspakken: baner, angrepsanimasjoner, baller, kampmusikk og lyder som spilleren selv har samlet.
   Ingenting av dette ligger i appens offentlige kode. Pakken ligger i mappa pack/ i det private synk-repoet, appen henter filene
   med synk-nøkkelen første gang de trengs og lagrer dem på enheten. Uten pakke (eller uten synk) brukes de innebygde, kodetegnede effektene.
   Animasjonene er rammedata (ark med ruter på 192 × 192 og én liste per ramme med hvor hver rute skal tegnes) og spilles av én felles avspiller. */
const PACK = (() => {
  const P = { ok: false, man: null, anims: null, err: '' }, mem = new Map(), pend = new Map(), imgs = new Map(), bufs = new Map(), CN = 'fokusdex-pack';
  const dev = () => { try { return localStorage.getItem('fokusdex.pack') || ''; } catch (_) { return ''; } };
  /* Filene lagres på enheten under en utgave. Hver mappe i pakken har sin egen (manifest.g), så en endring i én mappe ikke gjør at alt det andre
     (musikken er det store) må hentes på nytt. Mapper uten egen utgave følger pakkens versjon. */
  const gen = p => { const m = P.man, t = p.split('/')[0]; return m ? (m.g && m.g[t] != null ? m.g[t] : m.v) : 0; };
  const key = p => 'https://pack.invalid/' + gen(p) + '/' + p;
  const MIME = { png: 'image/png', mp3: 'audio/mpeg', json: 'application/json', ttf: 'font/ttf', webp: 'image/webp' };
  /* Henter én fil fra kilden: det private repoet, eller en egen adresse satt for utvikling. */
  async function raw(path) {
    const d = dev();
    if (d) { const r = await fetch(d + path, { cache: 'no-store' }); if (!r.ok) throw new Error(r.status); return r.blob(); }
    if (!GH || !GH.ok) throw new Error('nosync');
    await slot();
    try { return await ghGet(path); } finally { free(); }
  }
  /* Høyst seks nedlastinger om gangen, så GitHub ikke bremser oss når en kamp trenger mange filer på en gang. */
  let busy = 0; const wait = [];
  const slot = () => busy < 6 ? (busy++, Promise.resolve()) : new Promise(r => wait.push(r)), free = () => { const n = wait.shift(); if (n) n(); else busy--; };
  async function ghGet(path) {
    const r = await fetch(`https://api.github.com/repos/${GH.repo}/contents/pack/${path.split('/').map(encodeURIComponent).join('/')}`,
      { headers: { Authorization: 'Bearer ' + GH.t, Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28' }, cache: 'no-store' });
    if (!r.ok) { P.err = String(r.status); throw new Error(r.status); }
    return r.blob();
  }
  async function blob(path) {
    let c = null;
    try { c = await caches.open(CN); const hit = await c.match(key(path)); if (hit) return hit.blob(); } catch (_) {}
    /* GitHub svarer med sin egen innholdstype. Lyd og bilder må merkes riktig, ellers nekter noen nettlesere å spille dem. */
    const b = new Blob([await raw(path)], { type: MIME[path.split('.').pop()] || 'application/octet-stream' });
    try { if (c) await c.put(key(path), new Response(b, { headers: { 'Content-Type': b.type } })); } catch (_) {}
    return b;
  }
  /* Adresse til en fil i pakken, til bruk i bilder og lyd. Samme fil hentes bare én gang; '' hvis den ikke finnes. */
  P.url = path => {
    if (mem.has(path)) return Promise.resolve(mem.get(path));
    if (!pend.has(path)) pend.set(path, blob(path).then(b => { const u = URL.createObjectURL(b); mem.set(path, u); pend.delete(path); return u; }).catch(() => { pend.delete(path); return ''; }));
    return pend.get(path);
  };
  P.now = path => mem.get(path) || '';
  P.img = async path => { if (imgs.has(path)) return imgs.get(path); const u = await P.url(path); if (!u) return null; const im = new Image(); im.src = u; try { await im.decode(); } catch (_) { return null; } imgs.set(path, im); return im; };
  /* Leser innholdsfortegnelsen. Går det ikke (ingen synk, ingen pakke, ikke nett), brukes den forrige som ble lest. */
  let tried = 0;
  P.init = async force => {
    if (P.ok && !force) return true;
    if (!dev() && !(GH && GH.ok)) return false;
    if (!force && Date.now() - tried < 60000) return P.ok;
    tried = Date.now();
    let m = null;
    try { m = JSON.parse(await (await raw('manifest.json')).text()); localStorage.setItem('fokusdex.packman', JSON.stringify(m)); }
    catch (_) { try { m = JSON.parse(localStorage.getItem('fokusdex.packman')); } catch (_) {} }
    if (!m || !m.v) return false;
    P.man = m; P.ok = true; P.err = '';
    setTimeout(warmUp, 600); setTimeout(sweep, 9000);
    return true;
  };
  /* Når pakken er oppdatert, slettes det som ble lagret fra eldre utgaver, og låter som er tatt ut av pakken, så de ikke blir liggende og ta plass. */
  async function sweep() {
    try {
      const c = await caches.open(CN), mus = new Set((P.man.music || []).map(x => x.f));
      for (const r of await c.keys()) { const u = decodeURI(r.url), m = /^https:\/\/pack\.invalid\/[^/]+\/(.+)$/.exec(u), path = m ? m[1] : ''; if (!path || u !== key(path) || (path.indexOf('music/') === 0 && !mus.has(path))) await c.delete(r); }
    } catch (_) {}
  }
  /* Rett etter at pakken er funnet, hentes det første kampen trenger i bakgrunnen: HP-boksene, introbildene, ballene, animasjonsdataene og trenerlåtene. */
  function warmUp() {
    const m = P.man, list = [m.hud && m.hud.f, m.vs && m.vs.f, 'ui/ball_pokeball.png', 'ui/ball_pokeball_open.png'].filter(Boolean);
    list.forEach(f => P.url(f)); loadHud(); loadMenu(); loadFont(); loadAnims(); loadEbx();
    (m.music || []).filter(x => x.c === 'trainer').forEach(x => P.url(x.f));
    /* Bildet og låta til den som venter i ligaen hentes også, og forsiden tegnes på nytt når bildet er klart (bare hvis den står framme). */
    try { if (S.party.length) { const t = nextTrainer(), tr = trainerInfo(t), f = P.trackFor({ tr, lap: t.lap, rd: Math.floor(t.n / 2), mode: 'league' }), pt = m.trainers && m.trainers[tr.img.split('|')[0]]; if (f) P.url(f); if (pt && !mem.get(pt)) P.url(pt).then(u => { if (u && !S.timer && $('#ov').hidden && U.tab === 'fokus' && $('#sheet').hidden !== false) render(); }); } } catch (_) {}
  }
  /* DS-skriften til tekstboksen og menyene i kampen. Når den er lastet, slås den på for kampskjermen (klassen dsf på siden). */
  let fontJob = null;
  const loadFont = () => fontJob || (!P.man.font || typeof FontFace === 'undefined' ? Promise.resolve() : (fontJob = P.url(P.man.font).then(u => { if (!u) throw new Error('font'); return new FontFace('FdxDS', `url(${u})`).load(); })
    .then(f => { document.fonts.add(f); document.documentElement.classList.add('dsf'); }).catch(() => { fontJob = null; })));
  let animJob = null;
  const loadAnims = () => P.anims || !P.man.anims ? Promise.resolve() : animJob || (animJob = blob(P.man.anims).then(b => b.text()).then(t => { P.anims = JSON.parse(t); }).catch(() => { animJob = null; }));
  /* Angrepsanimasjonene fra Elite Battle DX: programmene (som data, se ebx.js) og bildene de bruker. Bildene ligger etter hverandre i samlefiler,
     og innholdslisten sier hvor hvert av dem ligger. */
  let ebxJob = null; const ebxBin = new Map();
  const loadEbx = () => !P.man.ebx || typeof EBX === 'undefined' || EBX.ok ? Promise.resolve() : ebxJob || (ebxJob = blob(P.man.ebx).then(b => b.text()).then(t => {
    const d = JSON.parse(t); if (!d || !d.anims || !d.img) throw new Error('ebx'); P.ebx = d; EBX.load(d); (d.files || []).forEach(f => { if (!ebxBin.has(f)) ebxBin.set(f, blob(f)); });
  }).catch(() => { ebxJob = null; }));
  if (typeof EBXP !== 'undefined') EBXP.source = async name => {
    const e = P.ebx && P.ebx.img[name], f = e && P.ebx.files[e[2]]; if (!f) return null;
    if (!ebxBin.has(f)) ebxBin.set(f, blob(f));
    let b; try { b = await ebxBin.get(f); } catch (_) { ebxBin.delete(f); return null; }
    const u = URL.createObjectURL(b.slice(e[3], e[3] + e[4], e[5] ? 'image/webp' : 'image/png')), im = new Image();
    im.src = u; try { await im.decode(); } catch (_) { URL.revokeObjectURL(u); return null; }
    URL.revokeObjectURL(u); return im;
  };
  /* Bildene til raid-filmene (raid.js): en innholdsliste og én samlefil der bildene ligger etter hverandre. */
  if (typeof CINE !== 'undefined') CINE.source = async () => { if (!(await P.init()) || !P.man.raid) return null; const [j, b] = await Promise.all([blob(P.man.raid.idx), blob(P.man.raid.bin)]); return { idx: JSON.parse(await j.text()).img, blob: b }; };
  /* Hvilken EBDX-animasjon et angrep har. Angrep uten sin egen låner en som likner (listen ligger i pakken). '' hvis ingen. */
  P.ebxFor = m => { if (!P.ebx || S.dx === 0 || typeof EBX === 'undefined' || !EBX.ok) return ''; const n = animId(m), k = P.ebx.map[n] || 'MOVE:' + n; return EBX.has(k) ? k : ''; };
  P.ebxCommon = k => { const key = 'COMMON:' + String(k).toUpperCase(); return P.ebx && S.dx !== 0 && typeof EBX !== 'undefined' && EBX.has(key) ? key : ''; };
  /* Egne trenerbilder i pakken (manifest.trainers: navn → fil). Gir adressen hvis bildet er hentet, ellers '' mens det hentes til neste gang. */
  P.portrait = name => { const f = P.ok && P.man.trainers && P.man.trainers[name]; if (!f) return ''; const u = mem.get(f); if (!u) P.url(f); return u || ''; };
  /* Henter flere trenerbilder på en gang (til figurvelgeren). Gir antallet som ble hentet nå. */
  P.portraits = async names => { if (!P.ok || !P.man.trainers) return 0; const l = names.map(n => P.man.trainers[n]).filter(f => f && !mem.get(f)); await Promise.all(l.map(P.url)); return l.filter(f => mem.get(f)).length; };
  P.title = () => { const x = P.ok && cur && (P.man.music || []).find(m => m.f === cur); return x ? x.t : ''; };
  const animId = m => m[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
  P.animFor = m => P.anims && P.anims.a['Move:' + animId(m)] ? 'Move:' + animId(m) : '';
  P.common = k => P.anims && P.anims.a['Common:' + k] ? 'Common:' + k : '';
  const sheetOf = n => { const a = P.anims && P.anims.a[n]; return a && a.g && P.anims.sheets[a.g] ? 'anim/' + P.anims.sheets[a.g] + '.png' : ''; };
  /* Hvilken bane en trener møter deg på: etter klassen for bosser, etter trenertypen ellers. Noen har sin egen sal. */
  const SCENE = { field: ['grass', 'tall_grass', 'puddle_1'], forest: ['pinwheel_road', 'tall_grass'], cave: ['cave', 'mountain'], beach: ['shallow_water', 'water'], dojo: ['building'], lab: ['building'], night: ['mountain', 'snowy_tall_grass'], factory: ['pwt'],
    gym: ['black_tower_1_2', 'building', 'black_tower_3_5'], evilteam: ['building', 'cave'], eviladmin: ['black_tower_3_5', 'cave'], e4: ['caitlin', 'grimsley'], rival: ['pwt', 'black_tower_3_5'],
    evilboss: ['kyurem_cave', 'black_tower_10'], champ: ['black_tower_10', 'black_tower_1_2'], supreme: ['kyurem_cave', 'black_tower_10'], brain: ['pwt', 'black_tower_1_2'] };
  P.sceneFor = B => {
    if (!P.ok) return '';
    const tr = B.tr, own = tr.boss && (P.man.scenes[tr.sc] || P.man.scenes[tr.n.toLowerCase()]); if (own) return own;
    const l = SCENE[tr.boss ? tr.kind : tr.fr ? 'factory' : tr.arena] || SCENE.field, s = l[(tr.v + tr.n.length) % l.length]; return P.man.scenes[s] || '';
  };
  /* Hvilken låt som hører til treneren. Låtene ligger i én mappe per klasse, og tittelen sier hvem de tilhører: hver boss har et søk (mre)
     som plukker ut sin egen låt i klassens mappe. Finnes ingen der, lånes lagets låt fra en naboklasse, og til slutt en fra klassen.
     I Battle Frontier stiger musikken gjennom runden: trenerlåter først, de store kamplåtene (Elite Four og finalelåta) før bossen. Samme trener får samme låt hver gang,
     men har de flere låter (som Ghetsis), byttes det for hver runde i ligaen. */
  const SFXCAP = -18;
  const FALL = { evilteam: ['eviladmin'], eviladmin: ['evilteam', 'evilboss'], evilboss: ['evilteam', 'eviladmin'], champ: ['supreme'], supreme: ['champ', 'evilboss'], rival: ['champ'] };
  P.trackFor = B => {
    if (!P.ok || !P.man.music) return '';
    /* Låtene til de legendariske brukes bare mot legendariske, uansett hvilke mapper filene ellers ligger i. */
    const tr = B.tr, n = tr.n, leg = tr.kind === 'legend', LF = new Set(P.man.music.filter(x => x.c === 'legend').map(x => x.f)), M = P.man.music.filter(x => leg || !LF.has(x.f)), by = (c, re) => M.filter(x => x.c === c && (!re || re.test(x.t)));
    /* Søketeksten kan ha flere ledd med «>>» mellom: det første som finnes i pakken, gjelder (så en egen låt kan gå foran en lånt). */
    let re = null, l = [], h = B.lap || 0;
    for (const q of String(tr.mre || '').split('>>')) { if (!q) continue; try { const r = new RegExp(q); if (!re) re = r; if (M.some(x => r.test(x.t))) { re = r; break; } } catch (_) {} }
    if (tr.kind === 'legend') { l = by('legend', re); if (!l.length) l = by('legend'); }
    else if (tr.kind === 'brain') { l = by('frontier', re); if (!l.length) l = by('frontier', /Frontier Brain/); }
    else if (tr.boss) { if (re) { l = by(tr.kind, re); for (const c of FALL[tr.kind] || []) if (!l.length) l = by(c, re); } if (!l.length) l = by(tr.kind); }
    /* Battle Frontier: de første trenerne får trenerlåter, de siste får de store. Alt i Frontier-mappa som ikke er en Brain-låt eller den rolige, hører til de store. */
    else if (tr.fr) { l = (B.w || 0) >= 4 ? by('frontier').filter(x => !/Frontier Brain|Aether/.test(x.t)).concat(by('e4')) : by('frontier', /Aether/).concat(by('trainer')); h = (B.w || 0) + (B.round || 0) * 3; }
    /* Vanlige trenere bytter mellom trenerlåtene fra kamp til kamp. */
    if (!l.length) { l = by('trainer'); if (l.length) { if (B.pick == null) B.pick = B.mode === 'league' ? (B.rd || 0) + (B.lap || 0) : Math.floor(Math.random() * 97); return l[B.pick % l.length].f; } }
    if (!l.length) return '';
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
    return l[h % l.length].f;
  };
  /* HP-boksene (ett ark med boksene, linjene, tallene og bokstavene) og bildene til boss-introen (fargebånd, VS, lyn, stjerner). */
  P.hud = null; P.vs = null; P.menu = null;
  /* Klipper et ark opp i enkeltbilder etter rutene i manifestet. */
  const cut = (im, R) => { const o = {}, c = document.createElement('canvas'), g = c.getContext('2d'); for (const k in R) { const r = R[k]; c.width = r[2]; c.height = r[3]; g.clearRect(0, 0, r[2], r[3]); g.drawImage(im, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]); o[k] = c.toDataURL(); } return o; };
  /* Kampmenyen og lagskjermen fra Black og White (ballen, FIGHT, BAG, RUN, POKÉMON og panelene). */
  async function loadMenu() { if (P.menu || !P.man.menu) return; const im = await P.img(P.man.menu.f); if (im && !P.menu) P.menu = cut(im, P.man.menu.r); }
  async function loadHud() { if (P.hud || !P.man.hud) return; const im = await P.img(P.man.hud.f); if (im) P.hud = { im, r: P.man.hud.r }; }
  async function loadVs() {
    if (P.vs || !P.man.vs) return; const im = await P.img(P.man.vs.f); if (!im) return;
    const o = {}, c = document.createElement('canvas'), g = c.getContext('2d');
    for (const k in P.man.vs.r) { const r = P.man.vs.r[k]; c.width = r[2]; c.height = r[3]; g.clearRect(0, 0, r[2], r[3]); g.drawImage(im, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]); o[k] = c.toDataURL(); }
    P.vs = o;
  }
  /* Bildene til boss-introen må være klare før introen starter. Venter høyst et par sekunder. */
  P.introPrep = async B => { if (!(await P.init())) return; const T = P.man.trainers || {}, pt = B && T[B.tr.img.split('|')[0]], av = S.av && T[S.av.split('|')[0]]; await Promise.race([Promise.all([loadVs(), loadFont(), pt ? P.url(pt) : 0, av ? P.url(av) : 0]), new Promise(r => setTimeout(r, 2500))]); };
  /* Musikken dekodes og spilles gjennom samme lydutgang som effektene (WebAudio). Det er den veien som virker sikkert på iPhone, der et lydelement
     verken kan dempes eller tones inn. Går ikke dekodingen, brukes et vanlig lydelement som låses opp av trykket som starter kampen.
     Dekodede låter er store, så høyst to ligger i minnet om gangen. */
  const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
  let au = null, cur = '', node = null, mode = '', job = 0, sting = null;
  const dec = new Map(), decJob = new Map();
  const mvol = () => Math.min(1, Math.pow((S.mvol == null ? 70 : S.mvol) / 100, 1.3));
  /* Hver låt kan ha en liten justering i manifestet (g, i dB): alle låtene er jevnet til samme lydstyrke, og g retter opp for at bassrike låter
     ellers høres svakere ut på små høyttalere. k = tonearten ([tonika 0–11 fra C, 0 moll / 1 dur / 2 uviss]), til den innebygde introen. */
  const ent = path => (P.ok && P.man.music && P.man.music.find(x => x.f === path)) || null;
  const tgain = path => { const e = ent(path); return e && e.g ? Math.pow(10, e.g / 20) : 1; };
  P.keyOf = path => { const e = path && ent(path); return e && e.k ? e.k : null; };
  /* Lydelementet låses opp av et trykk ved å spille et tomt klipp én gang. Klippet må ikke gå i sløyfe: en sløyfe uten lyd i seg spinner
     i enkelte nettlesere og eter minne. Sløyfa slås først på når en ekte låt spilles gjennom elementet. */
  P.unlock = () => { try { ac(); if (!au) { au = new Audio(); au.preload = 'auto'; } if (mode !== 'el') { au.loop = false; au.src = SILENT; au.play().catch(() => {}); } } catch (_) {} };
  function decode(path) {
    if (dec.has(path)) return Promise.resolve(dec.get(path));
    if (decJob.has(path)) return decJob.get(path);
    const j = (async () => {
      const u = await P.url(path), a = ac(); if (!u || !a) return null;
      const ab = await (await fetch(u)).arrayBuffer();
      const d = await new Promise((res, rej) => { try { const q = a.decodeAudioData(ab, res, rej); if (q && q.catch) q.catch(rej); } catch (e) { rej(e); } });
      dec.set(path, d);
      for (const k of [...dec.keys()]) { if (dec.size <= 2) break; if (k !== path && k !== cur) dec.delete(k); }
      return d;
    })().catch(() => null).then(d => { decJob.delete(path); return d; });
    decJob.set(path, j); return j;
  }
  /* Gjør en låt klar på forhånd, så den starter med en gang når kampen begynner. */
  P.cue = path => { if (path && S.sound && S.music !== 0) decode(path); };
  function startBuf(d, o) {
    try {
      const a = ac(); if (!a) return false;
      const s = a.createBufferSource(), g2 = a.createGain(), v = Math.min(1, mvol() * (o.tg || 1)), t = a.currentTime;
      s.buffer = d; s.loop = o.loop !== false; s.connect(g2); g2.connect(a.destination);
      if (o.fade) { g2.gain.setValueAtTime(Math.max(0.0001, v * (o.from || 0)), t); g2.gain.linearRampToValueAtTime(v, t + o.fade); } else g2.gain.setValueAtTime(v, t);
      s.start(0, Math.max(0, Math.min(d.duration - 0.2, o.at || 0)));
      return { s, g: g2, t0: t };
    } catch (_) { return null; }
  }
  function fadeOut(h, sec) {
    if (!h) return;
    try { const t = AC.currentTime, f = Math.max(0.03, sec); h.g.gain.cancelScheduledValues(t); h.g.gain.setValueAtTime(Math.max(0.0001, h.g.gain.value), t); h.g.gain.linearRampToValueAtTime(0.0001, t + f); h.s.stop(t + f + 0.05); } catch (_) { try { h.s.stop(); } catch (_) {} }
  }
  /* Spiller en låt i sløyfe. o.fade = sekunder den toner inn over (så den glir inn i stedet for å smelle på), o.out = sekunder den forrige toner ut over.
     Gir true når låta spiller, og false hvis den ikke finnes eller musikken er slått av. */
  P.music = async (path, o = {}) => {
    if (path === cur) return !!path;
    job++; cur = path || '';
    if (node) { fadeOut(node, o.out == null ? 0.25 : o.out); node = null; }
    if (au && mode === 'el') { try { au.pause(); } catch (_) {} }
    mode = '';
    if (!path || !S.sound || S.music === 0) return false;
    const my = job, d = await decode(path);
    if (my !== job) return cur === path;
    const h = d && startBuf(d, Object.assign({ tg: tgain(path) }, o));
    if (h) { node = h; mode = 'wa'; return true; }
    const u = await P.url(path);
    if (my !== job || !u) return false;
    try { P.unlock(); au.loop = true; au.src = u; au.currentTime = 0; au.volume = Math.min(1, mvol() * tgain(path)); mode = 'el'; await au.play(); return my === job; } catch (_) { if (my === job) mode = ''; return false; }
  };
  /* Egen intro til en boss (mappa «Intro» blant sangene): spilles mens bossen viser seg, og tones ut når kamplåta glir inn.
     En introlåt hører til én bestemt boss og brukes bare hos den: navnet på bossen må stå som eget ord i tittelen («Champion Cynthia Encounter»
     spilles hos Cynthia og ingen andre). Alle andre får den innebygde introen. */
  P.introFor = B => {
    if (!P.ok || !P.man.music) return '';
    const n = B.tr.n.replace(/[^A-Za-z ]/g, '').trim(); if (n.length < 2 || B.tr.wild) return '';
    const re = new RegExp('(^|[^A-Za-z])' + n + '([^A-Za-z]|$)', 'i'), hit = P.man.music.find(x => x.c === 'intro' && re.test(x.t));
    return hit ? hit.f : '';
  };
  P.sting = async (path, loop) => { const my = job, d = await decode(path); if (!d || my !== job) return false; P.stingOut(0.05); sting = startBuf(d, { loop: !!loop, tg: tgain(path) }); return !!sting; };
  P.stinging = () => !!sting;
  P.stingOut = sec => { if (sting) { fadeOut(sting, sec == null ? 1.2 : sec); sting = null; } };
  P.playing = () => !!cur;
  /* Musikkskyveren flyttes mens en låt spiller. */
  P.vol = () => { try { if (node && mode === 'wa') node.g.gain.setTargetAtTime(Math.min(1, mvol() * tgain(cur)), AC.currentTime, 0.05); else if (au && mode === 'el') au.volume = Math.min(1, mvol() * tgain(cur)); } catch (_) {} };
  /* Sekunder siden låta som spiller nå ble startet (til å holde raid-filmene i takt med den), justert for forsinkelsen ut til høyttaleren. −1 hvis ingen låt spiller. */
  P.clock = () => { try { return node && mode === 'wa' && AC.state === 'running' ? AC.currentTime - node.t0 - (AC.outputLatency || AC.baseLatency || 0) : -1; } catch (_) { return -1; } };
  /* Korte lyder (angrep, treff, status) dekodes og spilles gjennom appens vanlige lydutgang, så volumknappen gjelder. Gir false hvis lyden ikke er klar. */
  P.sfxPath = name => (P.ok && P.man.sfx && P.man.sfx[name]) || '';
  P.warm = name => { const f = P.sfxPath(name); if (!f || bufs.has(f) || !S.sound) return; bufs.set(f, null); P.url(f).then(u => u && fetch(u)).then(r => r && r.arrayBuffer()).then(b => b && ac() && AC.decodeAudioData(b)).then(d => { if (d) bufs.set(f, d); else bufs.delete(f); }).catch(() => bufs.delete(f)); };
  P.sfx = (name, vol) => {
    const f = P.sfxPath(name), d = f && bufs.get(f);
    if (!f || !S.sound) return false;
    if (!d) { P.warm(name); return false; }
    /* Lydene i pakken er tatt opp mye sterkere enn musikken. Hver lyd får derfor et tak: det sterkeste øyeblikket skal ikke ligge over SFXCAP (LUFS),
       som er så vidt over musikknivået. Svake lyder løftes ikke, så de stille effektene forblir stille. */
    try { const o = out(); if (!o) return false; const s = AC.createBufferSource(), g = AC.createGain(), L = loudOf(d); s.buffer = d; g.gain.value = (vol == null ? 0.8 : vol) * (L > SFXCAP ? Math.pow(10, (SFXCAP - L) / 20) : 1); s.connect(g); g.connect(o); s.start(); return true; } catch (_) { return false; }
  };
  /* Gjør klart til en kamp: bane, animasjonsdata, arkene til alle angrepene på begge lag, baller og lyder. Venter høyst noen sekunder. */
  P.prep = async B => {
    if (!(await P.init())) return;
    const jobs = [loadAnims(), loadEbx()];
    const tk = P.trackFor(B); if (tk) P.cue(tk);
    const it = B.tr.ultra && B.mode !== 'fac' ? P.introFor(B) : ''; if (it) P.cue(it);
    if (B.tr.wild && typeof CINE !== 'undefined') CINE.prep(B.tr.dk ? 'dk' + B.tr.leg : B.tr.leg, 6000);
    const pt = P.man.trainers && P.man.trainers[B.tr.img.split('|')[0]]; if (pt) jobs.push(P.url(pt));
    const sc = P.sceneFor(B); if (sc) jobs.push(P.url(sc));
    jobs.push(loadHud()); jobs.push(loadMenu()); jobs.push(loadFont()); jobs.push(loadVs());
    for (const b of ['pokeball', 'greatball', 'ultraball']) { jobs.push(P.url(`ui/ball_${b}.png`)); jobs.push(P.url(`ui/ball_${b}_open.png`)); }
    ['Hit Super Effective', 'Hit Normal Damage', 'Hit Weak Not Very Effective', 'Stat Rise Up', 'Stat Fall', 'In-Battle Faint No Health', 'In-Battle Heal HP Restore', 'In-Battle Recall Switch Pokeball', 'Status Burned', 'Status Poisoned', 'Status Paralyzed', 'Status Frozen'].forEach(P.warm);
    const all = B.me.concat(B.foe);
    all.forEach(b => b.mv.forEach(x => P.warm(MOVES[x.i][0])));
    await Promise.race([Promise.all(jobs), new Promise(r => setTimeout(r, 7000))]);
    /* EBDX-animasjonene går foran arkene der de finnes. Bildene til alle angrepene i kampen hentes nå, så ingen animasjon må vente. */
    const CM = ['StatUp', 'StatDown', 'Sleep', 'Poison', 'Burn', 'Paralysis', 'Frozen', 'Confusion', 'HealthUp', 'LeechSeed'], ex = typeof EBXP !== 'undefined' && P.ebx && EBXP.able(), keys = new Set();
    if (ex) { CM.forEach(k => keys.add(P.ebxCommon(k))); all.forEach(b => b.mv.forEach(x => keys.add(P.ebxFor(MOVES[x.i])))); keys.delete(''); }
    const wj = ex ? Promise.all([...keys].map(EBXP.warm)) : null;
    if (P.anims) {
      const need = new Set(CM.filter(k => !(ex && P.ebxCommon(k))).map(k => sheetOf('Common:' + k)));
      all.forEach(b => b.mv.forEach(x => { if (!(ex && P.ebxFor(MOVES[x.i]))) need.add(sheetOf(P.animFor(MOVES[x.i]))); }));
      need.delete('');
      await Promise.race([Promise.all([...need].map(P.img)), new Promise(r => setTimeout(r, 8000))]);
    }
    if (wj) await Promise.race([wj, new Promise(r => setTimeout(r, 8000))]);
  };
  /* Er animasjonen og arket dens klart til å spilles? */
  P.ready = name => { const a = P.anims && P.anims.a[name], path = a ? sheetOf(name) : ''; if (!a) return false; if (path && !imgs.get(path)) { P.img(path); return false; } return true; };
  P.frames = name => { const a = P.anims && P.anims.a[name]; return a ? a.f.length : 0; };
  /* Bildet i animasjonen der angrepet treffer: første gang målet blinker eller skjermen lyser opp. Finnes ikke det, regnes det litt over halvveis. */
  P.hitAt = name => {
    const a = P.anims && P.anims.a[name]; if (!a) return 0;
    if (a.hf == null) { let f = -1; for (const tm of a.t) if ((tm[2] === 1 || tm[2] === 2) && (f < 0 || tm[0] < f)) f = tm[0]; if (f < 2) f = Math.round(a.f.length * 0.55); a.hf = Math.max(2, Math.min(a.f.length - 1, f)); }
    return a.hf;
  };
  /* Flytter animasjonen selv på angriperen (som i Tackle)? Da lar kampskjermen være å gjøre det. */
  P.movesUser = name => { const a = P.anims && P.anims.a[name]; if (!a) return false; if (a.mu == null) a.mu = a.f.some(fr => fr.some(c => c && c[6] === -1 && (Math.abs(c[0] - 128) > 12 || Math.abs(c[1] - 224) > 12))); return a.mu; };
  /* Treff-stopp: animasjonen står stille i ms millisekunder. */
  let holdT = 0;
  P.hold = ms => { holdT = performance.now() + ms; };
  /* Spiller en ark-animasjon på lerretet cv (512 × 384). u og t er midten av brukeren og målet. opp = motstanderen angriper.
     h = kroker inn i kampskjermen: sprite(hvem, dx, dy, synlig), flash(farge, ms), tflash(farge, ms), thide(ms). Gir false hvis arket ikke er lastet.
     Starter en ny animasjon på samme lerret mens denne spiller, gir denne seg. */
  P.play = async (name, cv, u, t, opp, speed, h) => {
    const a = P.anims && P.anims.a[name], path = sheetOf(name), im = path ? imgs.get(path) : null;
    if (!a || !cv || (path && !im)) { if (path) P.img(path); return false; }
    const g = cv.getContext('2d'), ms = 50 / (speed || 1), dx = t.x - u.x, dy = t.y - u.y, rev = dx < 0, tok = cv._tok = (cv._tok || 0) + 1;
    g.imageSmoothingEnabled = false;
    for (let fi = 0; fi < a.f.length; fi++) {
      if (!cv.isConnected || cv._tok !== tok) return true;
      const fr = a.f[fi];
      g.clearRect(0, 0, 512, 384);
      for (const tm of a.t) if (tm[0] === fi && tm[2] && h) { const c = tm[3] || [255, 255, 255, 255], css = `rgba(${c[0]},${c[1]},${c[2]},${(c[3] / 255).toFixed(2)})`; if (tm[2] === 2) h.flash(css, tm[4] * ms); else if (tm[2] === 1) h.tflash(css, tm[4] * ms); else if (tm[2] === 3) h.thide(tm[4] * ms); }
      for (let i = 0; i < fr.length; i++) {
        const c = fr[i]; if (!c) { if (i < 2 && h) h.sprite(i === 0 ? 'u' : 't', 0, 0, true); continue; }
        if (c[6] < 0) { if (h) { const who = c[6] === -1 ? 'u' : 't', ox = c[0] - (who === 'u' ? 128 : 384), oy = c[1] - (who === 'u' ? 224 : 96), s = opp ? -1 : 1; h.sprite(who, ox * s, oy * s, c[7] > 0); } continue; }
        if (!im) continue;
        let x = c[0], y = c[1], mir = c[4] > 0;
        if (c[9] === 1) { x += t.x - 384; y += t.y - 96; }
        else if (c[9] === 2) { x += u.x - 128; y += u.y - 224; }
        else if (c[9] === 3) { x = u.x + (c[0] - 128) * dx / 256; y = u.y + (c[1] - 224) * dy / -128; if (rev) mir = !mir; }
        g.save(); g.translate(Math.round(x), Math.round(y)); if (c[3]) g.rotate(-c[3] * Math.PI / 180);
        g.scale(c[2] / 100 * (mir ? -1 : 1), c[8] / 100); g.globalAlpha = Math.max(0, Math.min(1, c[7] / 255)); g.globalCompositeOperation = c[5] === 1 ? 'lighter' : 'source-over';
        if (a.h && 'filter' in g) g.filter = `hue-rotate(${a.h}deg)`;
        g.drawImage(im, (c[6] % 5) * 192, Math.floor(c[6] / 5) * 192, 192, 192, -96, -96, 192, 192); g.restore();
      }
      await new Promise(r => setTimeout(r, ms));
      while (performance.now() < holdT) await new Promise(r => setTimeout(r, 16));
    }
    if (cv._tok !== tok) return true;
    g.clearRect(0, 0, 512, 384);
    if (h) { h.sprite('u', 0, 0, true); h.sprite('t', 0, 0, true); }
    return true;
  };
  return P;
})();
