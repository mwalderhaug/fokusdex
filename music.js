'use strict';
/* Fokusdex – innebygd kampmusikk.
   For spillere uten ressurspakke. Ingen lydfiler: en liten synth med fire stemmer (melodi, akkordbrytning, bass og trommer) spiller
   sju egne låter, én for hver type motstander. En låt er skrevet som akkorder og en melodi per takt. Bassen, akkordbrytningen og
   trommene lages fra akkordene etter et mønster. Låtene går i sløyfe uten skjøt (introen spilles én gang), og de tones inn og ut.
   Musikken har sin egen utgang, så den følger musikkskyveren og kan tones ut uten at lydeffektene blir med. */
const MUSIC = (() => {
  const PC = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  const acc = s => s === '#' ? 1 : s === 'b' ? -1 : 0;
  const midi = s => { const m = /^([a-g])([#b]?)(\d)$/.exec(s); if (!m) throw new Error('note ' + s); return PC[m[1]] + acc(m[2]) + 12 * (+m[3] + 1); };
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  const QUAL = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], sus4: [0, 5, 7], dim: [0, 3, 6] };
  const chord = s => { const m = /^([A-G])([#b]?)(m7|m|7|sus4|dim)?$/.exec(s); if (!m) throw new Error('chord ' + s); return { root: (PC[m[1].toLowerCase()] + acc(m[2]) + 12) % 12, iv: QUAL[m[3] || ''] }; };

  /* Mønstre, 16 steg per takt.
     Bass: r grunntone, o oktaven over, f kvinten, m liten ters, n halvtonen over, t tritonus, s kvarten, - hold, . pause.
     Akkordbrytning: tall = tone i akkordstigen (0 er grunntonen, 3 er grunntonen en oktav opp), x = hele akkorden kort, p = hele akkorden holdt.
     Trommer: K stortromme, S skarp, h lukket hi-hat, o åpen, k stortromme + hat, s skarp + hat, c crash + stortromme, t og T tammer. */
  const BASS = {
    drive: 'r.ror.ror.ror.fo', gallop: 'r.rrr.rrr.rrr.ro', eight: 'r.r.r.r.r.r.r.o.', pedal: 'rrrrrrrrrrrrrrro', long: 'r---------------',
    half: 'r-------r-----f-', octs: 'rororororororofo', synco: 'r..r..r.r..r.or.', riff: 'rr.rmr.nrr.rtsmn', pulse: 'r.rrr.rrr.rrr.rr', none: '................'
  };
  const ARP = {
    up: '0123012301230123', wave: '0123432101234321', high: '3432343234323432', broken: '0212021202120212', off: '.0.1.2.1.0.1.2.3',
    stab: '..x...x...x...x.', stab2: 'x..x..x...x..x..', pad: 'p...............', none: '................'
  };
  const DRUM = {
    rock: 'k.h.s.h.k.k.s.h.', drive: 'k.hks.h.k.khs.ho', fast: 'khhhshhhkhkhshhh', ride: 'k.h.s.hkk.h.s.o.', half: 'k.h.h.h.s.h.h.k.', heavy: 'k.hkh.h.s.h.hkk.',
    fill: 'k.h.s.h.k.ssstTT', fill2: 'k.k.s.s.tttTTTSS', build1: 'S...S...S.S.S.S.', build2: 'S.S.S.S.SSSSSSSS', toms: 'T..T..T.T..T..tt', tick: 'h...h...h...h...',
    boom: 'c...............', none: '................'
  };

  /* ---------- Låtene ----------
     ch = akkorder, én per takt («F|E» = to i samme takt). ld = melodien, én tekst per takt med 16 steg: tone, - (hold) eller . (pause).
     bs, ar, dr = mønster for bass, akkordbrytning og trommer: ett for hele delen, eller en liste med ett per takt.
     seq = rekkefølgen på delene, loop = delen sløyfa går tilbake til. tp = hele låta flyttes så mange halvtoner. */
  const SONGS = {
    /* Vanlige trenere: lett og framoverlent. */
    trainer: { bpm: 168, tp: -3, seq: ['i', 'a', 'b', 'c'], loop: 1, sec: {
      i: { ch: 'E E', bs: 'pedal', ar: 'none', dr: ['build1', 'build2'], ld: [
        'e5 . e5 . e5 . e5 e5 . e5 . e5 e5 . e5 e5',
        'e5 - f5 - g#5 - a5 - b5 - c6 - d6 - e6 -'] },
      a: { ch: 'Am Am F G Am Am F E', bs: 'drive', ar: 'wave', dr: 'drive', ld: [
        'e5 - - e5 - - d5 - e5 - - - a5 - - -',
        'g5 - - e5 - - c5 - d5 - e5 - - - . .',
        'f5 - - f5 - - e5 - f5 - - - a5 - - -',
        'g5 - - d5 - - g5 - b5 - - - a5 - g5 -',
        'a5 - - e5 - - a5 - c6 - - - b5 - a5 -',
        'g5 - e5 - c5 - e5 - g5 - - - e5 - - -',
        'f5 - - a5 - - c6 - a5 - - - f5 - - -',
        'e5 - - g#5 - - b5 - e6 - - - - - . .'] },
      b: { ch: 'Am G F E Am G F|E Am', bs: 'gallop', ar: 'up', dr: 'rock', ld: [
        'a5 - c6 - a5 - e5 - a5 - c6 - a5 - e5 -',
        'g5 - b5 - g5 - d5 - g5 - b5 - d6 - b5 -',
        'f5 - a5 - f5 - c5 - f5 - a5 - c6 - a5 -',
        'e5 - g#5 - b5 - g#5 - e5 - - - . . . .',
        'c6 - - b5 - - a5 - e5 - - - a5 - - -',
        'b5 - - a5 - - g5 - d5 - - - g5 - - -',
        'a5 - - g5 - - f5 - g#5 - - b5 - - e6 -',
        'a5 - - - - - - - . . e5 g5 a5 c6 e6 -'] },
      c: { ch: 'F G Em Am F G E E', bs: 'eight', ar: 'stab', dr: 'ride', ld: [
        'c6 - - - a5 - f5 - a5 - - - c6 - - -',
        'd6 - - - b5 - g5 - b5 - - - d6 - - -',
        'e6 - - - b5 - g5 - b5 - e6 - d6 - b5 -',
        'c6 - - - a5 - e5 - a5 - - - . . . .',
        'f5 - a5 - c6 - f6 - e6 - c6 - a5 - c6 -',
        'g5 - b5 - d6 - g6 - f6 - d6 - b5 - d6 -',
        'e6 - - e6 - - e6 - d6 - - d6 - - b5 -',
        'g#5 - b5 - e6 - g#5 - b5 - e6 - g#5 - b5 e6'] } } },

    /* Gymledere og Elite Four: staselig, som en marsj. */
    gym: { bpm: 156, tp: -3, seq: ['i', 'a', 'b', 'a', 'c'], loop: 1, sec: {
      i: { ch: 'Asus4 A', bs: 'half', ar: 'none', dr: ['toms', 'build2'], ld: [
        'a4 - - a4 a4 - a4 - d5 - - d5 d5 - d5 -',
        'e5 - - e5 e5 - e5 - a5 - - - c#5 e5 a5 -'] },
      a: { ch: 'Dm Dm Bb C Dm Dm Bb A', bs: 'gallop', ar: 'broken', dr: 'rock', ld: [
        'd5 - - - f5 - a5 - d6 - - - c6 - a5 -',
        'a5 - f5 - d5 - f5 - a5 - - - . . a4 c5',
        'd5 - - - f5 - bb5 - d6 - - - bb5 - f5 -',
        'e5 - - - g5 - c6 - e6 - - - d6 - c6 -',
        'd6 - - a5 - - f5 - a5 - - d6 - - a5 -',
        'f5 - - e5 - - d5 - a4 - - - d5 - - -',
        'bb4 - d5 - f5 - d5 - bb4 - d5 - f5 - bb5 -',
        'a5 - e5 - c#5 - e5 - a5 - - - a4 a4 a4 a4'] },
      b: { ch: 'F C Dm Bb F C Bb A', bs: 'drive', ar: 'stab2', dr: 'ride', ld: [
        'a5 - - - c6 - f5 - - - - - a5 - c6 -',
        'g5 - - - c6 - e5 - - - - - g5 - c6 -',
        'f5 - - - a5 - d5 - - - - - f5 - a5 -',
        'bb5 - - - d6 - - - bb5 - - - f5 - d5 -',
        'c6 - - c6 - - a5 - c6 - - f6 - - e6 -',
        'e6 - - d6 - - c6 - g5 - - - c6 - - -',
        'd6 - - d6 - - bb5 - d6 - - f6 - - d6 -',
        'e6 - - - c#6 - - - a5 - c#6 - e6 - a5 -'] },
      c: { ch: 'Gm Gm Dm Dm Bb C A A', bs: 'eight', ar: 'wave', dr: 'heavy', ld: [
        'g5 - - - bb5 - d6 - - - - - bb5 - g5 -',
        'd5 - - - g5 - bb5 - - - - - g5 - d5 -',
        'f5 - - - a5 - d6 - - - - - a5 - f5 -',
        'd5 - - - - - - - . . d5 f5 a5 d6 a5 f5',
        'bb5 - - bb5 - - d6 - f6 - - - d6 - bb5 -',
        'c6 - - c6 - - e6 - g6 - - - e6 - c6 -',
        'a5 - - - c#6 - - - e6 - - - c#6 - a5 -',
        'a5 - c#6 - e6 - c#6 - a5 - - - a4 a4 a4 a4'] } } },

    /* Onde lag og sjefene deres: mørkt, med en bass som maler. */
    evil: { bpm: 144, tp: -4, seq: ['i', 'a', 'b', 'c'], loop: 1, sec: {
      i: { ch: 'Em Em Em Em', bs: 'riff', ar: ['none', 'none', 'pad', 'pad'], dr: ['boom', 'tick', 'heavy', 'fill2'], ld: [
        '. . . . . . . . . . . . . . . .',
        '. . . . . . . . . . . . . . . .',
        'e5 - - - - - - - - - - - - - - -',
        'g5 - - - - - - - f#5 - - - e5 - - -'] },
      a: { ch: 'Em Em F Em Em Em F B', bs: ['riff', 'riff', 'gallop', 'riff', 'riff', 'riff', 'gallop', 'gallop'], ar: 'off', dr: 'heavy', ld: [
        'b4 - - - - - e5 - - - g5 - f#5 - e5 -',
        'b4 - - - - - . . e5 - g5 - b5 - a5 g5',
        'a5 - - - - - f5 - - - a5 - c6 - a5 -',
        'b5 - - - g5 - e5 - b4 - - - . . . .',
        'e5 - e5 g5 - g5 b5 - - b5 d6 - c6 - b5 -',
        'g5 - g5 b5 - b5 d6 - - d6 e6 - d6 - b5 -',
        'c6 - - a5 - - f5 - a5 - - c6 - - f5 -',
        'd#5 - - f#5 - - b5 - d#6 - - - b5 - f#5 -'] },
      b: { ch: 'C D Em Em C D B B', bs: 'pulse', ar: 'wave', dr: 'drive', ld: [
        'g5 - - - e5 - c5 - e5 - - - g5 - - -',
        'a5 - - - f#5 - d5 - f#5 - - - a5 - - -',
        'b5 - - - g5 - e5 - g5 - b5 - e6 - - -',
        'd6 - b5 - g5 - b5 - e5 - - - . . . .',
        'c6 - - c6 - - g5 - e5 - - g5 - - c6 -',
        'd6 - - d6 - - a5 - f#5 - - a5 - - d6 -',
        'd#6 - - - b5 - - - f#5 - - - b5 - - -',
        'f#5 - b5 - d#6 - f#6 - d#6 - b5 - f#5 - b4 -'] },
      c: { ch: 'Am Am Em Em Am B Em B', bs: 'half', ar: 'off', dr: 'half', ld: [
        'a5 - - - - - - - e5 - - - - - - -',
        'c6 - - - b5 - - - a5 - - - e5 - - -',
        'g5 - - - - - - - b5 - - - - - - -',
        'e6 - - - d6 - - - b5 - - - g5 - - -',
        'a5 - c6 - e6 - c6 - a5 - c6 - e6 - c6 -',
        'b5 - d#6 - f#6 - d#6 - b5 - d#6 - f#6 - d#6 -',
        'e6 - - - - - b5 - g5 - - - e5 - - -',
        'f#5 - - - b5 - - - d#6 - - - f#6 - - -'] } } },

    /* Rivalen: raskt og urolig. */
    rival: { bpm: 176, tp: -3, seq: ['i', 'a', 'b', 'c'], loop: 1, sec: {
      i: { ch: 'F# F#', bs: 'pedal', ar: 'none', dr: ['build1', 'build2'], ld: [
        'f#5 . f#5 f#5 . f#5 . f#5 f#5 . f#5 . a#5 . c#6 .',
        'f#6 - e6 - c#6 - a#5 - f#5 - a#5 - c#6 - e6 -'] },
      a: { ch: 'Bm G A F#m Bm G A F#', bs: 'octs', ar: 'up', dr: 'fast', ld: [
        'f#5 - b5 - - f#5 - b5 - - d6 - c#6 - b5 -',
        'd6 - - b5 - - g5 - b5 - - d6 - - b5 -',
        'e5 - a5 - - e5 - a5 - - c#6 - b5 - a5 -',
        'c#6 - - a5 - - f#5 - a5 - - c#6 - - - -',
        'b4 - d5 - f#5 - d5 - b4 - d5 - f#5 - b5 -',
        'b4 - d5 - g5 - d5 - b4 - d5 - g5 - b5 -',
        'a4 - c#5 - e5 - c#5 - a4 - c#5 - e5 - a5 -',
        'a#4 - - c#5 - - f#5 - a#5 - - - c#6 - e6 -'] },
      b: { ch: 'G A Bm Bm G A F# F#', bs: 'drive', ar: 'stab', dr: 'drive', ld: [
        'b5 - - - d6 - - - g5 - - - b5 - d6 -',
        'c#6 - - - e6 - - - a5 - - - c#6 - e6 -',
        'd6 - - - f#6 - - - e6 - d6 - b5 - d6 -',
        'b5 - - - - - - - . . f#5 b5 d6 f#6 d6 b5',
        'g5 b5 d6 b5 g5 b5 d6 b5 g5 b5 d6 g6 d6 b5 g5 b5',
        'a5 c#6 e6 c#6 a5 c#6 e6 c#6 e5 a5 c#6 e6 c#6 a5 e5 a5',
        'f#5 - - f#5 - - f#5 - a#5 - - a#5 - - c#6 -',
        'e6 - - - c#6 - - - a#5 - c#6 - e6 - f#6 -'] },
      c: { ch: 'Em Em G A Em Em F# F#', bs: ['half', 'half', 'half', 'eight', 'gallop', 'gallop', 'pedal', 'pedal'], ar: ['pad', 'pad', 'pad', 'pad', 'up', 'up', 'high', 'high'], dr: ['half', 'half', 'half', 'half', 'rock', 'rock', 'build1', 'build2'], ld: [
        'e5 - - - - - g5 - b5 - - - - - - -',
        'g5 - - - - - e5 - b4 - - - . . . .',
        'g5 - - - - - b5 - d6 - - - - - - -',
        'c#6 - - - - - a5 - e5 - - - a5 - c#6 -',
        'e6 - - d6 - - b5 - g5 - - b5 - - e5 -',
        'g5 - - b5 - - e6 - d6 - - b5 - - g5 -',
        'f#5 - a#5 - c#6 - a#5 - f#5 - a#5 - c#6 - e6 -',
        'f#6 - - - e6 - - - c#6 - a#5 - f#5 - a#5 c#6'] } } },

    /* Mestere og de aller største: stort og høytidelig. */
    champ: { bpm: 180, tp: -3, seq: ['i', 'a', 'b', 'a', 'c'], loop: 1, sec: {
      i: { ch: 'Cm Cm G G', bs: 'long', ar: 'pad', dr: ['boom', 'toms', 'toms', 'build2'], ld: [
        'c5 - - - - - - - g5 - - - - - - -',
        'c6 - - - - - - - eb6 - - - d6 - c6 -',
        'b5 - - - - - - - d6 - - - - - - -',
        'g5 g5 . g5 g5 . g5 g5 b5 b5 . d6 d6 . g6 -'] },
      a: { ch: 'Cm Ab Bb G Cm Ab Bb G', bs: 'octs', ar: 'high', dr: 'fast', ld: [
        'g5 - - - c6 - - eb6 - - - - d6 - c6 -',
        'ab5 - - - c6 - - eb6 - - - - d6 - c6 -',
        'bb5 - - - d6 - - f6 - - - - eb6 - d6 -',
        'd6 - - - b5 - g5 - b5 - d6 - g6 - - -',
        'c5 - eb5 - g5 - eb5 - c5 - eb5 - g5 - c6 -',
        'ab4 - c5 - eb5 - c5 - ab4 - c5 - eb5 - ab5 -',
        'bb4 - d5 - f5 - d5 - bb4 - d5 - f5 - bb5 -',
        'g4 - b4 - d5 - g5 - b5 - d6 - f6 - d6 -'] },
      b: { ch: 'Eb Bb Cm Ab Eb Bb G G', bs: 'gallop', ar: 'wave', dr: 'ride', ld: [
        'g5 - - - bb5 - eb6 - - - - - d6 - eb6 -',
        'f5 - - - bb5 - d6 - - - - - c6 - d6 -',
        'eb6 - - - d6 - c6 - g5 - - - c6 - - -',
        'c6 - - - bb5 - ab5 - eb5 - - - ab5 - c6 -',
        'eb6 - - eb6 - - d6 - eb6 - - g6 - - f6 -',
        'd6 - - d6 - - c6 - d6 - - f6 - - eb6 -',
        'd6 - - - b5 - - - g5 - - - b5 - d6 -',
        'd6 - - - b5 - - - g5 - b5 - d6 - f6 -'] },
      c: { ch: 'Fm Fm Cm Cm Ab Bb G G', bs: 'drive', ar: 'up', dr: 'heavy', ld: [
        'c6 - - - ab5 - f5 - ab5 - - - c6 - - -',
        'f6 - - - eb6 - c6 - ab5 - - - . . . .',
        'eb6 - - - c6 - g5 - c6 - - - eb6 - - -',
        'g6 - - - eb6 - c6 - g5 - - - . . g5 c6',
        'eb6 - - c6 - - ab5 - c6 - - eb6 - - c6 -',
        'f6 - - d6 - - bb5 - d6 - - f6 - - d6 -',
        'g5 - b5 - d6 - b5 - g5 - b5 - d6 - g6 -',
        'g5 g5 . g5 g5 . g5 g5 b5 b5 . d6 d6 . g6 -'] } } },

    /* Legendariske raid: tungt og truende, før det tar av. */
    legend: { bpm: 138, tp: -2, seq: ['i', 'a', 'b', 'c'], loop: 1, sec: {
      i: { ch: 'Dm Dm Dm Dm', bs: ['long', 'long', 'pedal', 'pedal'], ar: ['none', 'pad', 'pad', 'pad'], dr: ['boom', 'none', 'toms', 'fill2'], ld: [
        '. . . . . . . . . . . . . . . .',
        'd5 - - - - - - - - - - - - - - -',
        'f5 - - - - - - - e5 - - - - - - -',
        'a5 - - - - - - - - - - - . . . .'] },
      a: { ch: 'Dm Dm Bb A Dm Dm Gm A', bs: 'pedal', ar: 'off', dr: 'half', ld: [
        'd5 - - - - - - - a5 - - - - - - -',
        'f5 - - - e5 - - - d5 - - - . . . .',
        'd5 - - - - - - - bb5 - - - - - - -',
        'a5 - - - g5 - - - e5 - - - c#5 - - -',
        'd6 - - - a5 - - - f5 - - - a5 - - -',
        'd6 - - c6 - - a5 - - - f5 - - - d5 -',
        'bb5 - - - g5 - - - d5 - - - g5 - bb5 -',
        'a5 - - - - - c#6 - - - e6 - - - - -'] },
      b: { ch: 'Dm C Bb A Dm C Bb A', bs: 'octs', ar: 'stab2', dr: 'heavy', ld: [
        'd5 f5 a5 d6 a5 f5 d5 f5 a5 d6 f6 d6 a5 f5 a5 d6',
        'c5 e5 g5 c6 g5 e5 c5 e5 g5 c6 e6 c6 g5 e5 g5 c6',
        'bb4 d5 f5 bb5 f5 d5 bb4 d5 f5 bb5 d6 bb5 f5 d5 f5 bb5',
        'a4 c#5 e5 a5 e5 c#5 a4 c#5 e5 a5 c#6 a5 e5 c#5 e5 a5',
        'f6 - - - e6 - d6 - a5 - - - d6 - - -',
        'e6 - - - d6 - c6 - g5 - - - c6 - - -',
        'd6 - - - c6 - bb5 - f5 - - - bb5 - - -',
        'c#6 - - - - - e6 - - - - - a5 - - -'] },
      c: { ch: 'Bb C Dm Dm Bb C A A', bs: 'gallop', ar: 'wave', dr: 'heavy', ld: [
        'f5 - - - bb5 - - - d6 - - - - - - -',
        'g5 - - - c6 - - - e6 - - - - - - -',
        'f6 - - - e6 - d6 - a5 - - - d6 - - -',
        'a5 - - - - - - - . . d5 f5 a5 d6 f6 -',
        'd6 - - bb5 - - f5 - bb5 - - d6 - - f6 -',
        'e6 - - c6 - - g5 - c6 - - e6 - - g6 -',
        'e6 - - - c#6 - - - a5 - - - e5 - - -',
        'a5 - c#6 - e6 - c#6 - a5 - c#6 - e6 - g6 -'] } } },

    /* Battle Frontier og World Tournament: lyst, som en konkurranse. */
    frontier: { bpm: 164, tp: -5, seq: ['i', 'a', 'b', 'a', 'c'], loop: 1, sec: {
      i: { ch: 'D D7', bs: 'pedal', ar: 'none', dr: ['build1', 'build2'], ld: [
        'd5 - d5 d5 - d5 - - f#5 - f#5 f#5 - f#5 - -',
        'a5 - a5 a5 - a5 - - d6 - c6 - a5 - f#5 -'] },
      a: { ch: 'G D Em C G D C D', bs: 'drive', ar: 'up', dr: 'drive', ld: [
        'b5 - - - d6 - g5 - b5 - - - d6 - - -',
        'a5 - - - d6 - f#5 - a5 - - - d6 - - -',
        'g5 - b5 - e6 - b5 - g5 - b5 - e6 - d6 -',
        'c6 - - - e6 - - - g5 - c6 - e6 - g5 -',
        'g5 - - b5 - - d6 - g6 - - - d6 - b5 -',
        'a5 - - d6 - - f#6 - e6 - - d6 - - a5 -',
        'e6 - - - c6 - g5 - c6 - - - e6 - - -',
        'd6 - - - f#5 - a5 - d6 - f#6 - a5 - d6 -'] },
      b: { ch: 'Em C G D Em C D D', bs: 'gallop', ar: 'stab', dr: 'ride', ld: [
        'e6 - - - - - b5 - g5 - - - b5 - e6 -',
        'e6 - - - - - c6 - g5 - - - c6 - e6 -',
        'd6 - - - - - b5 - g5 - - - b5 - d6 -',
        'd6 - - - a5 - f#5 - a5 - - - d6 - - -',
        'g5 b5 e6 b5 g5 b5 e6 b5 g5 b5 e6 g6 e6 b5 g5 b5',
        'g5 c6 e6 c6 g5 c6 e6 c6 g5 c6 e6 g6 e6 c6 g5 c6',
        'f#5 a5 d6 a5 f#5 a5 d6 a5 f#5 a5 d6 f#6 d6 a5 f#5 a5',
        'd6 - - d6 - - d6 - e6 - - e6 - - f#6 -'] },
      c: { ch: 'C D Bm Em C D G D', bs: 'eight', ar: 'wave', dr: 'rock', ld: [
        'e6 - - - c6 - g5 - c6 - - - e6 - - -',
        'f#6 - - - d6 - a5 - d6 - - - f#6 - - -',
        'd6 - - - b5 - f#5 - b5 - d6 - f#6 - d6 -',
        'e6 - - - b5 - g5 - e5 - - - . . . .',
        'c6 - - c6 - - e6 - g6 - - - e6 - c6 -',
        'd6 - - d6 - - f#6 - a5 - - - d6 - f#6 -',
        'g6 - - - d6 - b5 - g5 - - - b5 - d6 -',
        'a5 - d6 - f#6 - d6 - a5 - d6 - f#6 - a5 -'] } } }
  };

  /* ---------- Fra tekst til steg ----------
     Gir { spb, steps, loop }: steps[i] er hendelsene på steg i, hver [stemme, tone(r), lengde i steg]. */
  const COMP = {};
  const BOFF = { r: 0, o: 12, f: 7, m: 3, n: 1, t: 6, s: 5 };
  function compile(S0) {
    const steps = [], tp = S0.tp || 0, starts = {}; let loop = 0;
    const per = (v, i) => Array.isArray(v) ? v[i] : v;
    S0.seq.forEach((name, si) => {
      const sec = S0.sec[name], bars = sec.ch.split(' '), n = bars.length; if (si === S0.loop) loop = steps.length; starts[si] = steps.length;
      if (sec.ld.length !== n) throw new Error(`${name}: ${sec.ld.length} melody bars for ${n} chords`);
      const base = steps.length; for (let i = 0; i < n * 16; i++) steps.push([]);
      for (let b = 0; b < n; b++) {
        const cs = bars[b].split('|').map(chord), at = s => cs.length > 1 && s >= 8 ? cs[1] : cs[0];
        /* Melodien */
        const tok = sec.ld[b].trim().split(/\s+/); if (tok.length !== 16) throw new Error(`${name} bar ${b + 1}: ${tok.length} steps`);
        for (let s = 0; s < 16; s++) { const t = tok[s]; if (t === '.' || t === '-') continue; let len = 1; while (s + len < 16 && tok[s + len] === '-') len++; steps[base + b * 16 + s].push(['L', midi(t) + tp, len]); }
        /* Bassen: grunntonen legges mellom E2 og D#3. */
        const bp = BASS[per(sec.bs, b)]; if (!bp) throw new Error('bass ' + per(sec.bs, b));
        for (let s = 0; s < 16; s++) { const c = bp[s]; if (c === '.' || c === '-') continue; let len = 1; while (s + len < 16 && bp[s + len] === '-') len++; const r = 40 + ((at(s).root + tp - 40) % 12 + 12) % 12; steps[base + b * 16 + s].push(['B', r + BOFF[c], len]); }
        /* Akkordbrytningen: stigen begynner på grunntonen mellom E3 og D#4, under melodien. */
        const ap = ARP[per(sec.ar, b)]; if (!ap) throw new Error('arp ' + per(sec.ar, b));
        for (let s = 0; s < 16; s++) {
          const c = ap[s]; if (c === '.') continue; const ch = at(s), r = 52 + ((ch.root + tp - 52) % 12 + 12) % 12, tri = ch.iv.slice(0, 3), lad = k => r + tri[k % 3] + 12 * Math.floor(k / 3);
          if (c === 'x') steps[base + b * 16 + s].push(['C', ch.iv.map(v => r + v), 2]);
          else if (c === 'p') steps[base + b * 16 + s].push(['P', ch.iv.slice(0, 3).map(v => r + v), cs.length > 1 ? 8 : 16]);
          else steps[base + b * 16 + s].push(['A', lad(+c), 1]);
        }
        if (cs.length > 1 && ap[0] === 'p') steps[base + b * 16 + 8].push(['P', cs[1].iv.slice(0, 3).map(v => 52 + ((cs[1].root + tp - 52) % 12 + 12) % 12 + v), 8]);
        /* Trommene: siste takt i en del på åtte får et overgangsfyll, og hver del åpner med en crash. */
        let dn = per(sec.dr, b); if (!Array.isArray(sec.dr) && n >= 8 && b === n - 1) dn = 'fill';
        const dp = DRUM[dn]; if (!dp) throw new Error('drum ' + dn);
        for (let s = 0; s < 16; s++) { let c = dp[s]; if (b === 0 && s === 0 && n >= 8 && (c === 'k' || c === 'K')) c = 'c'; if (c !== '.') steps[base + b * 16 + s].push(['D', c, 1]); }
      }
    });
    return { spb: 60 / S0.bpm / 4, steps, loop, starts };
  }
  const comp = k => COMP[k] || (COMP[k] = compile(SONGS[k]));

  /* ---------- Synthen ---------- */
  function synth(ctx, dest) {
    const master = ctx.createGain(), cmp = ctx.createDynamicsCompressor();
    cmp.threshold.value = -16; cmp.knee.value = 12; cmp.ratio.value = 3.5; cmp.attack.value = 0.005; cmp.release.value = 0.14;
    master.connect(cmp); cmp.connect(dest);
    /* Pulsbølger med ulik bredde: 12,5 % er tynn og nasal, 25 % er den klassiske melodistemmen, 50 % er hul og rund. */
    const pw = d => { const n = 24, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) { re[k] = 2 * Math.sin(2 * Math.PI * k * d) / (Math.PI * k); im[k] = 2 * (1 - Math.cos(2 * Math.PI * k * d)) / (Math.PI * k); } return ctx.createPeriodicWave(re, im); };
    const W = { p12: pw(0.125), p25: pw(0.25), p50: pw(0.5) };
    const nbuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), nd = nbuf.getChannelData(0); let seed = 4711; for (let i = 0; i < nd.length; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; nd[i] = seed / 0x3fffffff - 1; }
    /* Melodien går gjennom et mykt filter og et ekko (tre sekstendedeler), som gir den rom uten romklang. */
    const lead = ctx.createGain(), lp = ctx.createBiquadFilter(), dly = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 5200; lp.Q.value = 0.5; lead.connect(lp); lp.connect(master); lp.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(master); fb.gain.value = 0.26; wet.gain.value = 0.26;
    const bassBus = ctx.createBiquadFilter(); bassBus.type = 'lowpass'; bassBus.frequency.value = 2200; bassBus.Q.value = 0.6; bassBus.connect(master);
    const arpBus = ctx.createBiquadFilter(); arpBus.type = 'lowpass'; arpBus.frequency.value = 4200; arpBus.connect(master);
    function pulse(t, n, dur, v, wave, bus, o) {
      o = o || {};
      const osc = ctx.createOscillator(), g = ctx.createGain(), a = 0.004, end = t + dur;
      osc.setPeriodicWave(W[wave]); osc.frequency.value = hz(n); if (o.det) osc.detune.value = o.det;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.setTargetAtTime(v * (o.sus == null ? 0.6 : o.sus), t + a, o.dec || 0.08); g.gain.setTargetAtTime(0, end, 0.014);
      /* Lange toner får en liten vibrato etter et øyeblikk. */
      if (o.vib && dur > 0.3) { const m = Math.max(4, Math.round((dur - 0.18) * 48)), cv = new Float32Array(m); for (let i = 0; i < m; i++) { const x = i / 48; cv[i] = 10 * Math.min(1, x / 0.18) * Math.sin(2 * Math.PI * 5.6 * x); } try { osc.detune.setValueCurveAtTime(cv, t + 0.18, dur - 0.18); } catch (_) {} }
      osc.connect(g); g.connect(bus); osc.start(t); osc.stop(end + 0.1);
    }
    function bass(t, n, dur, v) {
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain(), end = t + dur;
      o1.type = 'triangle'; o2.setPeriodicWave(W.p25); o1.frequency.value = o2.frequency.value = hz(n); g2.gain.value = 0.5;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.005); g.gain.setTargetAtTime(v * 0.6, t + 0.005, 0.1); g.gain.setTargetAtTime(0, end, 0.016);
      o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(bassBus); o1.start(t); o2.start(t); o1.stop(end + 0.1); o2.stop(end + 0.1);
    }
    function kick(t, v) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(175, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.1); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.21); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.23); }
    function nz(t, dur, v, type, f, q) { const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = nbuf; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q || 0.7; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(fl); fl.connect(g); g.connect(master); s.start(t, (t * 7.13) % 0.9); s.stop(t + dur + 0.02); }
    function snare(t, v) { nz(t, 0.15, v, 'bandpass', 2100, 0.6); const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(235, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.07); g.gain.setValueAtTime(v * 0.8, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.11); }
    function tom(t, f, v) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.16); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.24); }
    const hat = (t, v) => nz(t, 0.045, v, 'highpass', 8500), ohat = (t, v) => nz(t, 0.2, v, 'highpass', 7600), crash = (t, v) => nz(t, 1.2, v, 'highpass', 5200);
    function drum(t, c) {
      if (c === 'K') kick(t, 0.42); else if (c === 'k') { kick(t, 0.42); hat(t, 0.06); } else if (c === 'S') snare(t, 0.26); else if (c === 's') { snare(t, 0.3); hat(t, 0.055); }
      else if (c === 'h') hat(t, 0.075); else if (c === 'o') ohat(t, 0.075); else if (c === 'c') { kick(t, 0.46); crash(t, 0.12); } else if (c === 't') tom(t, 230, 0.3); else if (c === 'T') tom(t, 150, 0.32);
    }
    /* Alt som skjer på ett steg. */
    function step(ev, t, spb) {
      for (const e of ev) {
        if (e[0] === 'L') pulse(t, e[1], Math.max(0.05, e[2] * spb * 0.93), e[1] > 86 ? 0.1 : 0.125, e[1] > 86 ? 'p50' : 'p25', lead, { vib: 1 });
        else if (e[0] === 'B') bass(t, e[1], Math.max(0.05, e[2] * spb * 0.9), 0.14);
        else if (e[0] === 'A') pulse(t, e[1], spb * 0.85, 0.044, 'p12', arpBus, { sus: 0.35, dec: 0.045 });
        else if (e[0] === 'C') e[1].forEach((n, i) => pulse(t, n, spb * 1.5, 0.034, 'p50', arpBus, { sus: 0.3, dec: 0.05, det: (i - 1) * 4 }));
        else if (e[0] === 'P') e[1].forEach((n, i) => pulse(t, n, e[2] * spb * 0.98, 0.022, 'p50', arpBus, { sus: 0.9, dec: 0.3, det: (i - 1) * 5 }));
        else if (e[0] === 'D') drum(t, e[1]);
      }
    }
    dly.delayTime.value = 0.25;
    return { ctx, master, step, echo: spb => { dly.delayTime.value = Math.min(0.9, spb * 3); }, kill: () => { try { cmp.disconnect(); master.disconnect(); } catch (_) {} } };
  }

  /* ---------- Avspilling ---------- */
  /* Nivået følger musikkskyveren på samme måte som låtene i pakken, så de to kildene høres omtrent like sterke ut. */
  const GAIN = 0.6;
  const level = () => Math.min(1, Math.pow((S.mvol == null ? 70 : S.mvol) / 100, 1.3)) * GAIN;
  let cur = null;
  function stop(sec) {
    const st = cur; if (!st) return; cur = null; clearInterval(st.id);
    try {
      const a = st.sy.ctx, t = a.currentTime, g = st.sy.master.gain, f = Math.max(0.04, sec || 0.04), v = Math.max(0.0001, g.value);
      g.cancelScheduledValues(t); g.setValueAtTime(v, t);
      /* En lang uttoning dukker først raskt (så seierslyden slipper til), og klinger så ut. */
      if (f > 1) { g.linearRampToValueAtTime(v * 0.42, t + 0.4); g.linearRampToValueAtTime(0.0001, t + f); } else g.linearRampToValueAtTime(0.0001, t + f);
      setTimeout(() => st.sy.kill(), f * 1000 + 500);
    } catch (_) { try { st.sy.kill(); } catch (_) {} }
  }
  /* o.fade = sekunder låta toner inn over, o.from = hvor sterkt den begynner (0–1), o.out = sekunder den forrige toner ut over. */
  function play(key, o) {
    o = o || {};
    if (cur && cur.key === key) return true;
    stop(o.out == null ? 0.25 : o.out);
    if (!SONGS[key] || !S.sound || S.music === 0) return false;
    const a = typeof ac === 'function' ? ac() : null; if (!a) return false;
    let c; try { c = comp(key); } catch (_) { return false; }
    const sy = synth(a, (typeof master === 'function' && master()) || a.destination), v = level(), t0 = a.currentTime + 0.09; sy.echo(c.spb);
    sy.master.gain.setValueAtTime(o.fade ? Math.max(0.0001, v * (o.from || 0)) : v, a.currentTime); if (o.fade) sy.master.gain.linearRampToValueAtTime(v, a.currentTime + o.fade);
    const st = cur = { key, sy, i: 0, t: t0, id: 0 };
    const tick = () => {
      if (cur !== st) return;
      const now = a.currentTime, until = now + 0.32; let guard = 0;
      while (st.t < until && guard++ < 4000) { if (st.t > now - 0.02) sy.step(c.steps[st.i], st.t, c.spb); st.t += c.spb; if (++st.i >= c.steps.length) st.i = c.loop; }
    };
    tick(); st.id = setInterval(tick, 70);
    return true;
  }
  const vol = () => { if (!cur) return; try { const a = cur.sy.ctx; cur.sy.master.gain.setTargetAtTime(level(), a.currentTime, 0.05); } catch (_) {} };
  /* Til testene: spiller en låt inn i en lydbuffer uten å spille den av. Stegene legges inn litt og litt (som ved vanlig avspilling),
     så regnetiden sier noe om hva avspillingen koster. */
  async function render(key, secs, rate) {
    const c = comp(key), ctx = new OfflineAudioContext(2, Math.round(secs * (rate || 44100)), rate || 44100), sy = synth(ctx, ctx.destination); sy.echo(c.spb); sy.master.gain.value = 1;
    let i = 0, t = 0.05; const fill = until => { while (t < until && t < secs) { sy.step(c.steps[i], t, c.spb); t += c.spb; if (++i >= c.steps.length) i = c.loop; } };
    fill(0.5);
    if (ctx.suspend) for (let at = 0.25; at < secs; at += 0.25) ctx.suspend(at).then(() => { fill(at + 0.5); ctx.resume(); }); else fill(secs);
    return ctx.startRendering();
  }
  return { play, stop, vol, render, comp, playing: () => (cur ? cur.key : ''), keys: Object.keys(SONGS), SONGS };
})();
/* Den innebygde musikken: music('gym') starter en låt, music('') stopper den. o.out = sekunder uttoning. */
function music(k, o) { if (k) return MUSIC.play(k, o); MUSIC.stop(o && o.out); return false; }
