const $ = s => document.querySelector(s);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const fmt = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
const dur = w => w.steps.reduce((a, s) => a + s.sec * (s.rep || 1), 0) * (w.rounds || 1);
/* Déplie les répétitions et les tours en une liste d'étapes à jouer */
function expand(w) {
  const out = [];
  for (let r = 0; r < (w.rounds || 1); r++)
    w.steps.forEach(s => { for (let k = 0; k < (s.rep || 1); k++) out.push(s); });
  return out;
}

let workouts = [];
try { workouts = JSON.parse(localStorage.getItem('workouts') || '[]'); } catch (e) {}
function persist() {
  try { localStorage.setItem('workouts', JSON.stringify(workouts)); }
  catch (e) { alert('Stockage plein : retire quelques images.'); }
}

/* Le bouton + et l'accueil sont activés en premier, quoi qu'il arrive ensuite */
$('#fab').onclick = () => openEditor(null);
setTimeout(renderHome, 0);

/* ---------- Accueil ---------- */
function renderHome() {
  const list = $('#list'); list.innerHTML = '';
  $('#empty').hidden = workouts.length > 0;
  workouts.forEach(w => {
    const card = el('div', 'card');
    const th = el('div', 'thumb');
    const cover = w.img || (w.steps.find(s => s.img) || {}).img;
    if (cover) th.style.backgroundImage = 'url("' + cover + '")';
    const info = el('div', 'info');
    info.append(el('strong', '', w.title), el('span', '', expand(w).length + ' étapes, durée ' + fmt(dur(w))));
    const ed = el('button', 'icon', '✎'); ed.setAttribute('aria-label', 'Modifier');
    ed.onclick = e => { e.stopPropagation(); openEditor(w); };
    const del = el('button', 'icon', '🗑'); del.setAttribute('aria-label', 'Supprimer');
    del.onclick = e => {
      e.stopPropagation();
      if (confirm('Supprimer « ' + w.title + ' » ?')) { workouts = workouts.filter(x => x !== w); persist(); renderHome(); }
    };
    card.append(th, info, ed, del);
    card.onclick = () => startPlayer(w);
    list.append(card);
  });
}

/* ---------- Éditeur ---------- */
let draft = null;
const newStep = t => ({ type: t, title: t === 'work' ? 'Effort' : 'Pause', sec: t === 'work' ? 30 : 10, rep: 1, img: '' });

function openEditor(w) {
  draft = w ? JSON.parse(JSON.stringify(w)) : { id: Date.now(), title: '', rounds: 1, img: '', voice: true, steps: [newStep('work'), newStep('rest')] };
  $('#wTitle').value = draft.title;
  if ($('#wRounds')) $('#wRounds').value = draft.rounds || 1;
  if ($('#wVoice')) $('#wVoice').checked = draft.voice !== false;
  renderSteps();
  renderCover();
  $('#editor').hidden = false;
}

function resize(file, cb) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 480 / Math.max(im.width, im.height));
      const c = document.createElement('canvas');
      c.width = im.width * k; c.height = im.height * k;
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      cb(c.toDataURL('image/jpeg', .7));
    };
    im.src = r.result;
  };
  r.readAsDataURL(file);
}

function numInput(v) { const i = el('input'); i.type = 'number'; i.min = 0; i.inputMode = 'numeric'; i.value = v; return i; }

function renderSteps() {
  const box = $('#steps'); box.innerHTML = '';
  draft.steps.forEach((s, i) => {
    const d = el('div', 'step ' + s.type);
    const top = el('div', 'row', null);
    top.append(el('b', '', s.type === 'work' ? 'Entraînement' : 'Pause'));
    const mv = (d, label, aria) => {
      const b = el('button', 'icon', label); b.setAttribute('aria-label', aria);
      b.disabled = i + d < 0 || i + d >= draft.steps.length;
      b.onclick = () => { const [x] = draft.steps.splice(i, 1); draft.steps.splice(i + d, 0, x); renderSteps(); };
      return b;
    };
    top.append(mv(-1, '↑', 'Monter'), mv(1, '↓', 'Descendre'));
    const dup = el('button', 'icon', '⧉'); dup.setAttribute('aria-label', 'Dupliquer');
    dup.onclick = () => { draft.steps.splice(i + 1, 0, JSON.parse(JSON.stringify(s))); renderSteps(); };
    top.append(dup);
    const rm = el('button', 'icon', '✕'); rm.setAttribute('aria-label', 'Retirer');
    rm.onclick = () => { draft.steps.splice(i, 1); renderSteps(); };
    top.append(rm);

    const t = el('input'); t.placeholder = 'Titre'; t.value = s.title; t.oninput = () => { s.title = t.value; };

    const tm = el('div', 'row time');
    const m = numInput(Math.floor(s.sec / 60)), se = numInput(s.sec % 60);
    const upd = () => { s.sec = Math.max(1, (+m.value || 0) * 60 + (+se.value || 0)); };
    m.oninput = se.oninput = upd;
    tm.append(m, el('span', '', 'min'), se, el('span', '', 's'));

    const rp = el('div', 'row time');
    const rn = numInput(s.rep || 1); rn.min = 1;
    rn.oninput = () => { s.rep = Math.max(1, +rn.value || 1); };
    rp.append(el('span', '', 'Répéter'), rn, el('span', '', 'fois de suite'));

    d.append(top, t, tm, rp); box.append(d);
  });
}

function renderCover() {
  if (!$('#coverPrev')) return;
  const has = !!draft.img;
  $('#coverPrev').style.backgroundImage = has ? 'url("' + draft.img + '")' : '';
  $('#coverText').textContent = has ? 'Changer l’image' : 'Ajouter une image';
  $('#coverDel').hidden = !has;
}
if ($('#wImg')) $('#wImg').onchange = e => { resize(e.target.files[0], u => { draft.img = u; renderCover(); }); e.target.value = ''; };
if ($('#coverDel')) $('#coverDel').onclick = () => { draft.img = ''; renderCover(); };

$('#addWork').onclick = () => { draft.steps.push(newStep('work')); renderSteps(); };
$('#addRest').onclick = () => { draft.steps.push(newStep('rest')); renderSteps(); };
$('#cancel').onclick = () => { $('#editor').hidden = true; };
$('#save').onclick = () => {
  if (!draft.steps.length) { alert('Ajoute au moins une étape.'); return; }
  draft.title = $('#wTitle').value.trim() || 'Entraînement';
  draft.rounds = Math.max(1, +(($('#wRounds') || {}).value) || 1);
  draft.voice = $('#wVoice') ? $('#wVoice').checked : true;
  const i = workouts.findIndex(x => x.id === draft.id);
  if (i < 0) workouts.push(draft); else workouts[i] = draft;
  persist(); $('#editor').hidden = true; renderHome();
};

/* ---------- Lecteur ---------- */
let P = null;
function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    const v = speechSynthesis.getVoices().find(x => x.lang && x.lang.toLowerCase().startsWith('fr'));
    if (v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) {}
}

async function startPlayer(w) {
  P = { w, seq: expand(w), paused: false };
  $('#player').hidden = false;
  loadStep(0);
  P.timer = setInterval(tick, 200);
  try { P.wl = await navigator.wakeLock.request('screen'); } catch (e) {}
}

function loadStep(i) {
  P.i = i;
  const p = $('#player');
  if (i >= P.seq.length) {
    p.className = '';
    $('#pStep').textContent = P.w.title;
    $('#pTitle').textContent = 'Terminé !';
    $('#pImg').hidden = true; $('#pTime').textContent = '';
    $('#pToggle').hidden = $('#pSkip').hidden = true;
    clearInterval(P.timer); P.done = true;
    if (P.w.voice !== false) speak('Entraînement terminé');
    return;
  }
  const s = P.seq[i];
  if (P.w.voice !== false) speak(s.title);
  P.left = s.sec * 1000; P.last = Date.now(); P.shown = s.sec;
  p.className = s.type;
  $('#pStep').textContent = 'Étape ' + (i + 1) + ' sur ' + P.seq.length;
  $('#pTitle').textContent = s.title;
  const im = P.w.img || s.img; $('#pImg').hidden = !im; if (im) $('#pImg').src = im;
  $('#pTime').textContent = fmt(s.sec);
  $('#pToggle').hidden = $('#pSkip').hidden = false;
}

function tick() {
  const now = Date.now();
  if (P.paused) { P.last = now; return; }
  P.left -= now - P.last; P.last = now;
  if (P.left <= 0) { if (navigator.vibrate) navigator.vibrate(300); loadStep(P.i + 1); return; }
  const sec = Math.ceil(P.left / 1000);
  if (sec !== P.shown) { P.shown = sec; $('#pTime').textContent = fmt(sec); }
}

$('#pToggle').onclick = () => { P.paused = !P.paused; $('#pToggle').textContent = P.paused ? 'Reprendre' : 'Suspendre'; };
$('#pSkip').onclick = () => loadStep(P.i + 1);
$('#pQuit').onclick = () => {
  clearInterval(P.timer);
  try { P.wl && P.wl.release(); } catch (e) {}
  try { speechSynthesis.cancel(); } catch (e) {}
  $('#player').hidden = true; $('#pToggle').textContent = 'Suspendre'; P = null;
};

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
