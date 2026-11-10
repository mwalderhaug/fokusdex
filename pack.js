'use strict';
/* Fokusdex – ressurspakken: baner, angrepsanimasjoner, baller, kampmusikk og lyder som spilleren selv har samlet.
   Ingenting av dette ligger i appens offentlige kode. Pakken ligger i mappa pack/ i det private synk-repoet, appen henter filene
   med synk-nøkkelen første gang de trengs og lagrer dem på enheten. Uten pakke (eller uten synk) brukes de innebygde, kodetegnede effektene.
   Animasjonene er rammedata (ark med ruter på 192 × 192 og én liste per ramme med hvor hver rute skal tegnes) og spilles av én felles avspiller. */
const PACK = (() => {
  const P = { ok: false, man: null, anims: null }, mem = new Map(), pend = new Map(), imgs = new Map(), bufs = new Map(), CN = 'fokusdex-pack';
  const dev = () => { try { return localStorage.getItem('fokusdex.pack') || ''; } catch (_) { return ''; } };
  const key = p => 'https://pack.invalid/' + (P.man ? P.man.v : 0) + '/' + p;
  const MIME = { png: 'image/png', mp3: 'audio/mpeg', json: 'application/json' };
  /* Henter én fil fra kilden: det private repoet, eller en egen adresse satt for utvikling. */
  async function raw(path) {
    const d = dev();
    if (d) { const r = await fetch(d + path, { cache: 'no-store' }); if (!r.ok) throw new Error(r.status); return r.blob(); }
    if (!GH || !GH.ok) throw new Error('nosync');
    const r = await fetch(`https://api.github.com/repos/${GH.repo}/contents/pack/${path.split('/').map(encodeURIComponent).join('/')}`,
      { headers: { Authorization: 'Bearer ' + GH.token, Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28' }, cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
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
    P.man = m; P.ok = true;
    return true;
  };
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
    const tr = B.tr, own = tr.boss && P.man.scenes[tr.n.toLowerCase()]; if (own) return own;
    const l = SCENE[tr.boss ? tr.kind : tr.fr ? 'factory' : tr.arena] || SCENE.field, s = l[(tr.v + tr.n.length) % l.length]; return P.man.scenes[s] || '';
  };
  /* Hvilken låt som hører til treneren. Låtene ligger i én mappe per klasse, og tittelen sier hvem de tilhører: hver boss har et søk (mre)
     som plukker ut sin egen låt i klassens mappe. Finnes ingen der, lånes lagets låt fra en naboklasse, og til slutt en fra klassen.
     I Battle Frontier stiger musikken gjennom runden: trenerlåter først, de store kamplåtene før bossen. Samme trener får samme låt hver gang,
     men har de flere låter (som Ghetsis), byttes det for hver runde i ligaen. */
  const FALL = { evilteam: ['eviladmin'], eviladmin: ['evilteam', 'evilboss'], evilboss: ['evilteam', 'eviladmin'], champ: ['supreme'], supreme: ['champ'], rival: ['champ'] };
  P.trackFor = B => {
    if (!P.ok || !P.man.music) return '';
    const tr = B.tr, n = tr.n, M = P.man.music, by = (c, re) => M.filter(x => x.c === c && (!re || re.test(x.t)));
    let re = null, l = [], h = B.lap || 0; try { if (tr.mre) re = new RegExp(tr.mre); } catch (_) {}
    if (tr.kind === 'brain') { l = by('frontier', re); if (!l.length) l = by('frontier', /Frontier Brain/); }
    else if (tr.boss) { if (re) { l = by(tr.kind, re); for (const c of FALL[tr.kind] || []) if (!l.length) l = by(c, re); } if (!l.length) l = by(tr.kind); }
    else if (tr.fr) { l = (B.w || 0) >= 4 ? by('frontier', /Raikou|Giratina|Rayquaza|Reshiram|Mewtwo/) : by('frontier', /Aether|World Champion/).concat(by('trainer')); h = (B.w || 0) + (B.round || 0) * 3; }
    if (!l.length) l = by('trainer');
    if (!l.length) return '';
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
    return l[h % l.length].f;
  };
  /* HP-boksene (ett ark med boksene, linjene, tallene og bokstavene) og bildene til boss-introen (fargebånd, VS, lyn, stjerner). */
  P.hud = null; P.vs = null;
  async function loadHud() { if (P.hud || !P.man.hud) return; const im = await P.img(P.man.hud.f); if (im) P.hud = { im, r: P.man.hud.r }; }
  async function loadVs() {
    if (P.vs || !P.man.vs) return; const im = await P.img(P.man.vs.f); if (!im) return;
    const o = {}, c = document.createElement('canvas'), g = c.getContext('2d');
    for (const k in P.man.vs.r) { const r = P.man.vs.r[k]; c.width = r[2]; c.height = r[3]; g.clearRect(0, 0, r[2], r[3]); g.drawImage(im, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]); o[k] = c.toDataURL(); }
    P.vs = o;
  }
  /* Bildene til boss-introen må være klare før introen starter. Venter høyst et par sekunder. */
  P.introPrep = async () => { if (!(await P.init())) return; await Promise.race([loadVs(), new Promise(r => setTimeout(r, 2500))]); };
  /* Musikken spilles i ett lydelement som låses opp av trykket som starter kampen (ellers nekter mobilen å spille). */
  let au = null, cur = '';
  P.unlock = () => { try { if (!au) { au = new Audio(); au.loop = true; au.preload = 'auto'; } if (!cur) { au.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='; au.play().catch(() => {}); } } catch (_) {} };
  P.music = async path => {
    if (path === cur) return !!path;
    cur = path || '';
    if (au) { try { au.pause(); } catch (_) {} }
    if (!path || !S.sound || S.music === 0) return false;
    const u = await P.url(path);
    if (cur !== path || !u) return false;
    P.unlock(); au.src = u; au.currentTime = 0; au.volume = Math.min(1, Math.pow((S.vol == null ? 70 : S.vol) / 100, 1.3) * 0.75);
    au.play().catch(() => {});
    return true;
  };
  P.playing = () => !!cur;
  /* Korte lyder (angrep, treff, status) dekodes og spilles gjennom appens vanlige lydutgang, så volumknappen gjelder. Gir false hvis lyden ikke er klar. */
  P.sfxPath = name => (P.ok && P.man.sfx && P.man.sfx[name]) || '';
  P.warm = name => { const f = P.sfxPath(name); if (!f || bufs.has(f) || !S.sound) return; bufs.set(f, null); P.url(f).then(u => u && fetch(u)).then(r => r && r.arrayBuffer()).then(b => b && ac() && AC.decodeAudioData(b)).then(d => { if (d) bufs.set(f, d); else bufs.delete(f); }).catch(() => bufs.delete(f)); };
  P.sfx = (name, vol) => {
    const f = P.sfxPath(name), d = f && bufs.get(f);
    if (!f || !S.sound) return false;
    if (!d) { P.warm(name); return false; }
    try { const o = out(); if (!o) return false; const s = AC.createBufferSource(), g = AC.createGain(); s.buffer = d; g.gain.value = vol == null ? 0.8 : vol; s.connect(g); g.connect(o); s.start(); return true; } catch (_) { return false; }
  };
  /* Gjør klart til en kamp: bane, animasjonsdata, arkene til alle angrepene på begge lag, baller og lyder. Venter høyst noen sekunder. */
  P.prep = async B => {
    if (!(await P.init())) return;
    const jobs = [];
    if (!P.anims && P.man.anims) jobs.push(blob(P.man.anims).then(b => b.text()).then(t => { P.anims = JSON.parse(t); }).catch(() => {}));
    const sc = P.sceneFor(B); if (sc) jobs.push(P.url(sc));
    jobs.push(loadHud()); if (B.tr.boss) jobs.push(loadVs());
    for (const b of ['pokeball', 'greatball', 'ultraball']) { jobs.push(P.url(`ui/ball_${b}.png`)); jobs.push(P.url(`ui/ball_${b}_open.png`)); }
    const tk = P.trackFor(B); if (tk) P.url(tk);
    ['Hit Super Effective', 'Hit Normal Damage', 'Hit Weak Not Very Effective', 'Stat Rise Up', 'Stat Fall', 'In-Battle Faint No Health', 'In-Battle Heal HP Restore', 'In-Battle Recall Switch Pokeball', 'Status Burned', 'Status Poisoned', 'Status Paralyzed', 'Status Frozen'].forEach(P.warm);
    const all = B.me.concat(B.foe);
    all.forEach(b => b.mv.forEach(x => P.warm(MOVES[x.i][0])));
    await Promise.race([Promise.all(jobs), new Promise(r => setTimeout(r, 7000))]);
    if (P.anims) {
      const need = new Set(['Common:StatUp', 'Common:StatDown', 'Common:Sleep', 'Common:Poison', 'Common:Burn', 'Common:Paralysis', 'Common:Frozen', 'Common:Confusion', 'Common:HealthUp', 'Common:LeechSeed'].map(sheetOf));
      all.forEach(b => b.mv.forEach(x => need.add(sheetOf(P.animFor(MOVES[x.i])))));
      need.delete('');
      await Promise.race([Promise.all([...need].map(P.img)), new Promise(r => setTimeout(r, 8000))]);
    }
  };
  /* Spiller en ark-animasjon på lerretet cv (512 × 384). u og t er midten av brukeren og målet. opp = motstanderen angriper.
     h = kroker inn i kampskjermen: sprite(hvem, dx, dy, synlig), flash(farge, ms), tflash(farge, ms), thide(ms). Gir false hvis arket ikke er lastet. */
  P.play = async (name, cv, u, t, opp, speed, h) => {
    const a = P.anims && P.anims.a[name], path = sheetOf(name), im = path ? imgs.get(path) : null;
    if (!a || (path && !im)) { if (path) P.img(path); return false; }
    const g = cv.getContext('2d'), ms = 50 / (speed || 1), dx = t.x - u.x, dy = t.y - u.y, rev = dx < 0;
    g.imageSmoothingEnabled = false;
    for (let fi = 0; fi < a.f.length; fi++) {
      if (!cv.isConnected) return true;
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
    }
    g.clearRect(0, 0, 512, 384);
    if (h) { h.sprite('u', 0, 0, true); h.sprite('t', 0, 0, true); }
    return true;
  };
  return P;
})();
