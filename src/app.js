import { cloud, friendlyError } from './cloud.js';
const key = 'jhh2.notes.v1';
const $ = s => document.querySelector(s);
let notes = [], localNotes = [], view = 'Alle', editing = null, editingRevision = null;
let session = null, busy = false, generation = 0, localReadable = true, loadedCloud = false, refreshSequence = 0;
function notice(message) { $('#notice').textContent = message; $('#editor-status').textContent = message; }
function valid(n) { return n && typeof n.id === 'string' && typeof n.title === 'string' && n.title.trim().length > 0 && n.title.length <= 160 && typeof n.body === 'string' && ['Innboks','Privat','Jobb'].includes(n.area) && Number.isFinite(n.updated) && !Number.isNaN(new Date(n.updated).getTime()); }
try {
  const saved = JSON.parse(localStorage.getItem(key) || '[]');
  if (!Array.isArray(saved) || !saved.every(valid)) throw Error();
  localNotes = saved; notes = [...saved];
} catch { localReadable = false; notice('Lokale notater kunne ikke leses. Lokal lagring er stanset for å bevare eksisterende data.'); }
function persistLocal(next) {
  if (!localReadable) { notice('Kan ikke endre lokale notater før de eksisterende dataene er gjenopprettet.'); return false; }
  try { localStorage.setItem(key, JSON.stringify(next)); localNotes = next; notes = [...next]; render(); return true; }
  catch { notice('Lagring mislyktes. Kopier teksten før du lukker.'); return false; }
}
function accountUI() {
  $('#account').textContent = session ? session.user.email : 'Logg inn / Opprett konto';
  $('#logout').hidden = !session;
  $('#refresh').hidden = !session;
  $('#migrate').hidden = !session || !localNotes.length;
  $('#storage-label').textContent = session ? 'Notater på kontoen · oppdateres når du åpner appen' : 'Lagret i denne nettleseren · Logg inn for å synkronisere';
  $('#sync-status').textContent = session ? 'Henter notater fra kontoen …' : 'Lokale notater · bare på denne enheten';
}
async function refresh() {
  if (!session || busy || $('#editor').open) return;
  const current = generation;
  const request = ++refreshSequence;
  $('#sync-status').textContent = 'Henter notater fra kontoen …';
  const { data, error } = await cloud.from('notes').select('id,title,body,area,updated,revision').order('updated', {ascending:false});
  if (current !== generation || request !== refreshSequence) return;
  if (error) { loadedCloud = false; $('#sync-status').textContent = friendlyError(error); return; }
  notes = data; loadedCloud = true; render();
  $('#sync-status').textContent = 'Oppdatert fra kontoen · ' + new Date().toLocaleTimeString('nb-NO', {hour:'2-digit',minute:'2-digit'});
}
function setBusy(value) {
  busy = value; if (value) refreshSequence++;
  document.querySelectorAll('#note-form button, #note-form input, #note-form textarea, #note-form select, #logout, #migrate').forEach(b => b.disabled = value);
}
async function saveNote(note) {
  if (!session) return persistLocal([...notes.filter(n => n.id !== note.id), note]);
  if (!loadedCloud) { notice('Hent notatene fra kontoen før du lagrer. Trykk Oppdater notater.'); return false; }
  const current = generation;
  const fields = {title:note.title,body:note.body,area:note.area,updated:note.updated};
  const result = editing
    ? await cloud.from('notes').update(fields).eq('id', note.id).eq('revision', editingRevision).select()
    : await cloud.from('notes').insert({...fields,id:note.id,user_id:session.user.id}).select();
  if (generation !== current) { notice('Kontoen ble endret. Kopier teksten og åpne notatet på nytt.'); return false; }
  if (result.error) { notice(friendlyError(result.error)); return false; }
  if (!result.data.length) { notice('Notatet er endret eller slettet på en annen enhet. Kopier teksten, lukk notatet og trykk Oppdater notater før du prøver igjen.'); return false; }
  notes = [...notes.filter(n => n.id !== note.id), result.data[0]]; render();
  $('#sync-status').textContent = 'Lagret på kontoen'; return true;
}
function render(){const query=$('#search').value.toLocaleLowerCase('nb');const filtered=notes.filter(n=>(view==='Alle'||n.area===view)&&`${n.title} ${n.body}`.toLocaleLowerCase('nb').includes(query)).sort((a,b)=>b.updated-a.updated);$('#view-title').textContent=view==='Alle'?'Dine notater':view;$('#count').textContent=`${filtered.length} ${filtered.length===1?'notat':'notater'} · litt mindre å huske på`;const grid=$('#notes');grid.replaceChildren();if(!filtered.length){const empty=document.createElement('div');empty.className='empty';const h=document.createElement('h3');h.textContent=query?'Ingen treff denne gangen':'Her begynner oversikten din';const p=document.createElement('p');p.textContent=query?'Prøv et annet søkeord.':'En idé, en huskeliste eller noe du vil lære. Ta vare på din første tanke.';const b=document.createElement('button');b.className='primary';b.textContent='＋ Skriv et notat';b.onclick=()=>open();empty.append(h,p,b);grid.append(empty);}for(const n of filtered){const card=document.createElement('button');card.className='note';const area=document.createElement('span');area.className='badge '+n.area.toLowerCase();area.textContent=n.area;const title=document.createElement('h3');title.textContent=n.title;const body=document.createElement('p');body.textContent=n.body||'Et lite frø til en ny tanke.';const date=document.createElement('small');date.textContent=new Intl.DateTimeFormat('nb-NO',{day:'numeric',month:'short',year:'numeric'}).format(n.updated);card.append(area,title,body,date);card.onclick=()=>open(n);grid.append(card);}}
function open(n) {
  if (busy) return;
  if (session && !loadedCloud) { notice('Hent notatene fra kontoen først. Trykk Oppdater notater.'); return; }
  $('#editor-status').textContent = '';
  editing = n?.id || null; editingRevision = n?.revision || null;
  $('#title').value = n?.title || ''; $('#body').value = n?.body || '';
  $('#area').value = n?.area || (view === 'Alle' ? 'Innboks' : view);
  $('#delete').hidden = !n; $('#editor').showModal(); $('#title').focus();
}
$('#new-note').onclick = () => open();
$('#close').onclick = () => $('#editor').close();
$('#editor').addEventListener('cancel', e => { if (busy) e.preventDefault(); });
$('#search').oninput = render;
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => {
  view = b.dataset.view; document.querySelectorAll('[data-view]').forEach(x => x.classList.toggle('active', x === b)); render();
});
$('#note-form').onsubmit = async e => {
  e.preventDefault(); if (busy) return;
  const title = $('#title').value.trim();
  if (!title) { $('#title').setCustomValidity('Skriv en tittel.'); $('#title').reportValidity(); return; }
  const note = {id:editing || crypto.randomUUID(),title,body:$('#body').value,area:$('#area').value,updated:Date.now()};
  setBusy(true);
  try { if (await saveNote(note)) { $('#editor').close(); notice('Notatet er lagret.'); } }
  catch { notice('Lagring mislyktes. Kopier teksten og prøv igjen.'); }
  finally { setBusy(false); }
};
$('#title').oninput = () => $('#title').setCustomValidity('');
$('#delete').onclick = async () => {
  if (busy || !confirm('Vil du slette dette notatet?')) return;
  setBusy(true);
  try {
    if (!session) { if (persistLocal(notes.filter(n => n.id !== editing))) $('#editor').close(); return; }
    const {data,error} = await cloud.from('notes').delete().eq('id',editing).eq('revision',editingRevision).select();
    if (error) { notice(friendlyError(error)); return; }
    if (!data.length) { notice('Notatet er endret på en annen enhet. Lukk og oppdater før du sletter.'); return; }
    notes = notes.filter(n => n.id !== editing); render(); $('#editor').close(); notice('Notatet er slettet fra kontoen.');
  } finally { setBusy(false); }
};
$('#export').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(notes,null,2)],{type:'application/json'}));
  const a = document.createElement('a'); a.href=url; a.download='JHH2-notater.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
};
async function importToCloud(data) {
  // New IDs preserve all existing notes and never overwrite a note on another device.
  const rows = data.map(n => ({id:crypto.randomUUID(),user_id:session.user.id,title:n.title,body:n.body,area:n.area,updated:n.updated}));
  if (!rows.length) return;
  const {error} = await cloud.from('notes').insert(rows);
  if (error) throw error;
}
$('#import').onchange = async e => {
  if (busy) return; const file = e.target.files[0]; if (!file) return;
  setBusy(true);
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data) || !data.every(valid)) { notice('Velg en gyldig JSON-fil eksportert fra JHH2.0.'); return; }
    if (session) { if (!loadedCloud) { notice('Hent notatene fra kontoen først.'); return; } await importToCloud(data); }
    else { const ids = new Set(notes.map(n => n.id)); if (!persistLocal([...notes,...data.filter(n => !ids.has(n.id))])) return; }
    notice('Notatene er importert. Eksisterende notater er bevart.');
  } catch (error) { notice(friendlyError(error)); }
  finally { setBusy(false); e.target.value=''; await refresh(); }
};
$('#migrate').onclick = async () => {
  if (busy || !session || !loadedCloud || !confirm('Kopiere lokale notater til denne kontoen? Den lokale kopien beholdes.')) return;
  setBusy(true);
  try {
    // Deterministic IDs make repeat attempts safe, including after a lost response.
    const rows = localNotes.map(n => ({...n,user_id:session.user.id}));
    const {error} = await cloud.from('notes').upsert(rows,{onConflict:'id',ignoreDuplicates:true});
    if (error) throw error;
    notice('Lokale notater er kopiert til kontoen. Den lokale sikkerhetskopien er beholdt.');
  } catch (error) { notice(friendlyError(error)); }
  finally { setBusy(false); await refresh(); }
};
$('#account').onclick = () => {
  if (session) { notice('Du er logget inn som ' + session.user.email); return; }
  if (!cloud) { notice('Tilkoblingen til Supabase er ikke ferdig konfigurert. Lokale notater fungerer fortsatt.'); return; }
  $('#auth-message').textContent=''; $('#auth-dialog').showModal();
};
$('#auth-close').onclick = () => $('#auth-dialog').close();
async function authenticate(signup) {
  if (!$('#auth-form').reportValidity()) return;
  const buttons = $('#auth-form').querySelectorAll('button'); buttons.forEach(b => b.disabled=true);
  $('#auth-message').textContent = signup ? 'Oppretter konto …' : 'Logger inn …';
  try {
    const credentials = {email:$('#email').value.trim(),password:$('#password').value};
    const {data,error} = signup
      ? await cloud.auth.signUp({...credentials,options:{emailRedirectTo:location.origin}})
      : await cloud.auth.signInWithPassword(credentials);
    if (error) { $('#auth-message').textContent=friendlyError(error); return; }
    $('#password').value='';
    if (data.session) $('#auth-dialog').close();
    else $('#auth-message').textContent='Se etter en e-post fra Supabase og bekreft adressen din. Sjekk også søppelpost. Logg deretter inn her.';
  } catch { $('#auth-message').textContent='Kunne ikke logge inn. Kontroller forbindelsen og prøv igjen.'; }
  finally { buttons.forEach(b => b.disabled=false); }
}
$('#auth-form').onsubmit = e => {e.preventDefault(); authenticate(false);};
$('#signup').onclick = () => authenticate(true);
$('#logout').onclick = async () => {
  if (busy) return;
  const {error} = await cloud.auth.signOut({scope:'local'});
  if (error) notice(friendlyError(error));
};
$('#refresh').onclick = () => refresh();
function changeSession(next) {
  const changed = session?.user.id !== next?.user.id;
  session=next;
  if (changed) {
    generation++; loadedCloud=false;
    notes=session ? [] : [...localNotes]; render(); accountUI();
    if ($('#editor').open) { $('#editor').close(); notice('Kontoen ble endret. Åpne notatet på nytt.'); }
  }
  if (session) refresh();
}
if (cloud) {
  cloud.auth.onAuthStateChange((_event,next) => { setTimeout(() => changeSession(next),0); });
  cloud.auth.getSession().then(({data,error}) => { if (error) notice(friendlyError(error)); else changeSession(data.session); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.addEventListener('online', () => refresh());
  setInterval(() => { if (!document.hidden) refresh(); },60000);
}
accountUI(); render();
