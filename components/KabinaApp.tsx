'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ExternalLink, Languages, LogIn, LogOut, MapPin, Navigation, RefreshCw, ShieldCheck, UserRound, Users, X } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { fallbackMatches, fallbackPlayers, fallbackStandings, Match, PlayerStat, SEASON, SOURCE_URL, Standing, TEAM } from '@/lib/data';
import { supabase } from '@/lib/supabase';

type Lang = 'cs' | 'en';
type Tab = 'matches' | 'table' | 'stats' | 'h2h';
type Attendance = 'yes' | 'no' | 'maybe' | null;
type Profile = { id:string; display_name:string; role:string; user_id:string|null };
type AttendanceRow = { status:'yes'|'no'|'maybe'; player_id:string; players:{display_name:string}|null };
type Venue = { code:string; name:string; address:string; notes:string|null };


const copy = {
  cs: { tagline:'JEDEN TÝM. JEDNA KABINA.', league:'PSMF · 5D · podzim 2026', verified:'Automatická synchronizace PSMF', refresh:'Obnovit PSMF', matches:'Zápasy', table:'Tabulka', stats:'Statistiky', h2h:'Vzájemné zápasy', heading:'Jdeme hrát.', sub:'Potvrď účast a měj přehled o dalších zápasech.', next:'NEJBLIŽŠÍ ZÁPAS', away:'Venku', home:'Doma', count:'Počítáme s tebou?', yes:'Přijdu', no:'Nepřijdu', maybe:'Zatím nevím', saved:'Uloženo do týmové kabiny.', upcoming:'Další zápasy', past:'Odehráno', pos:'Poř.', team:'Tým', played:'Z', wins:'V', draws:'R', losses:'P', score:'Skóre', pts:'B', player:'Hráč', goals:'Góly', games:'Zápasy', history:'Historii vzájemných zápasů doplníme automaticky ze starších sezon PSMF.', account:'Týmová kabina', login:'Přihlásit', logout:'Odhlásit', signup:'Vytvořit účet', email:'E-mail', password:'Heslo', choosePlayer:'Který hráč jsi?', haveAccount:'Už mám účet', newAccount:'Jsem tu poprvé', signedAs:'Přihlášen jako', loginNeeded:'Pro potvrzení účasti se přihlas.', responses:'Odpovědi týmu', noResponses:'Zatím nikdo neodpověděl.', confirmEmail:'Účet je vytvořený. Potvrď e-mail a potom se přihlas.', playerLinked:'Účet je propojen s hráčem.', genericError:'Něco se nepovedlo. Zkus to prosím znovu.', synced:'PSMF aktualizováno.', venue:'Hřiště', address:'Adresa', google:'Google Maps', waze:'Waze', resend:'Poslat ověřovací e-mail znovu', resent:'Ověřovací e-mail byl znovu odeslán.' },
  en: { tagline:'ONE TEAM. ONE LOCKER ROOM.', league:'PSMF · 5D · autumn 2026', verified:'Automatic PSMF sync', refresh:'Refresh PSMF', matches:'Matches', table:'Table', stats:'Stats', h2h:'Head-to-head', heading:"We're playing.", sub:'Confirm your availability and keep track of upcoming matches.', next:'NEXT MATCH', away:'Away', home:'Home', count:'Can we count on you?', yes:"I'm in", no:"I'm out", maybe:'Not sure yet', saved:'Saved to the team locker room.', upcoming:'Upcoming matches', past:'Results', pos:'Pos.', team:'Team', played:'P', wins:'W', draws:'D', losses:'L', score:'GD', pts:'Pts', player:'Player', goals:'Goals', games:'Games', history:'Historical head-to-head results will be synced from older PSMF seasons.', account:'Team locker room', login:'Sign in', logout:'Sign out', signup:'Create account', email:'Email', password:'Password', choosePlayer:'Which player are you?', haveAccount:'I already have an account', newAccount:"I'm new here", signedAs:'Signed in as', loginNeeded:'Sign in to confirm your availability.', responses:'Team responses', noResponses:'No responses yet.', confirmEmail:'Account created. Confirm your email and then sign in.', playerLinked:'Your account is linked to the player.', genericError:'Something went wrong. Please try again.', synced:'PSMF refreshed.', venue:'Venue', address:'Address', google:'Google Maps', waze:'Waze', resend:'Resend confirmation email', resent:'Confirmation email sent again.' }
} as const;

function fmtDate(iso:string, lang:Lang) { return new Intl.DateTimeFormat(lang==='cs'?'cs-CZ':'en-GB',{day:'numeric',month:'long'}).format(new Date(iso+'T12:00:00')); }
function googleMaps(address:string){ return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`; }
function waze(address:string){ return `https://www.waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`; }

export default function KabinaApp(){
  const [lang,setLang] = useState<Lang>('cs');
  const [tab,setTab] = useState<Tab>('matches');
  const [session,setSession] = useState<Session|null>(null);
  const [profile,setProfile] = useState<Profile|null>(null);
  const [attendance,setAttendance] = useState<Attendance>(null);
  const [attendanceRows,setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [authOpen,setAuthOpen] = useState(false);
  const [authMode,setAuthMode] = useState<'login'|'signup'>('login');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [matches,setMatches] = useState<Match[]>(fallbackMatches);
  const [players,setPlayers] = useState<PlayerStat[]>(fallbackPlayers);
  const [standings,setStandings] = useState<Standing[]>(fallbackStandings);
  const [venues,setVenues] = useState<Record<string,Venue>>({});
  const [venueOpen,setVenueOpen] = useState<Venue|null>(null);
  const [selectedPlayer,setSelectedPlayer] = useState<string>(fallbackPlayers[0][0]);
  const [authMessage,setAuthMessage] = useState('');
  const [authBusy,setAuthBusy] = useState(false);
  const [saving,setSaving] = useState(false);
  const [syncing,setSyncing] = useState(false);
  const t = copy[lang];

  const loadPublicData = useCallback(async()=>{
    const [m,s,p,v] = await Promise.all([
      supabase.from('matches').select('psmf_key,kickoff,venue_code,home_team,away_team,home_score,away_score').eq('season',SEASON).order('kickoff'),
      supabase.from('standings').select('rank,team,played,wins,draws,losses,score,points').eq('season',SEASON).order('rank'),
      supabase.from('players').select('display_name,psmf_games,psmf_goals').eq('active',true).order('display_name'),
      supabase.from('venues').select('code,name,address,notes').order('code')
    ]);
    if(m.data?.length){ setMatches(m.data.map((r:any)=>{ const d=new Date(r.kickoff); return { psmfKey:r.psmf_key, date:d.toLocaleDateString('en-CA',{timeZone:'Europe/Prague'}), time:d.toLocaleTimeString('cs-CZ',{timeZone:'Europe/Prague',hour:'2-digit',minute:'2-digit'}), venue:r.venue_code||'', home:r.home_team, away:r.away_team, round:Number(String(r.psmf_key).match(/r(\d+)$/)?.[1]||0), result:r.home_score==null?undefined:`${r.home_score}:${r.away_score}`, status:r.home_score==null?'upcoming':'past' } as Match; })); }
    if(s.data?.length){ setStandings(s.data.map((r:any)=>[r.team,r.played,r.wins,r.draws,r.losses,r.score,r.points] as Standing)); }
    if(p.data?.length){ const list=p.data.map((r:any)=>[r.display_name,r.psmf_games??0,r.psmf_goals??0] as PlayerStat); setPlayers(list); setSelectedPlayer(prev=>list.some(x=>x[0]===prev)?prev:list[0][0]); }
    if(v.data?.length){ setVenues(Object.fromEntries(v.data.map((r:any)=>[r.code,r as Venue]))); }
  },[]);

  useEffect(()=>{ loadPublicData(); },[loadPublicData]);

  const next = useMemo(()=>matches.find(m=>m.status==='upcoming'),[matches]);
  const opponent = next ? (next.home===TEAM?next.away:next.home) : '';
  const nextKey = next?.psmfKey ?? (next ? `${SEASON}-r${next.round}` : '');

  const loadCabin = useCallback(async (activeSession:Session|null) => {
    if (!activeSession || !nextKey) { setProfile(null); setAttendance(null); setAttendanceRows([]); return; }
    let { data: me } = await supabase.from('players').select('id,display_name,role,user_id').eq('user_id',activeSession.user.id).maybeSingle();
    const pending = localStorage.getItem('pending-player-name');
    if (!me && pending) {
      const { error } = await supabase.rpc('claim_player',{ player_name: pending });
      if (!error) { localStorage.removeItem('pending-player-name'); const result = await supabase.from('players').select('id,display_name,role,user_id').eq('user_id',activeSession.user.id).maybeSingle(); me = result.data; setAuthMessage(t.playerLinked); }
    }
    setProfile(me as Profile|null);
    const matchResult = await supabase.from('matches').select('id').eq('psmf_key',nextKey).maybeSingle();
    if (!matchResult.data?.id) return;
    const board = await supabase.from('attendance').select('status,player_id,players(display_name)').eq('match_id',matchResult.data.id);
    const normalized = (board.data ?? []).map((row:any)=>({ status: row.status, player_id: row.player_id, players: Array.isArray(row.players) ? row.players[0] ?? null : row.players ?? null })) as AttendanceRow[];
    setAttendanceRows(normalized); if (me) setAttendance((normalized.find(r=>r.player_id===me!.id)?.status as Attendance)||null);
  },[nextKey,t.playerLinked]);

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{ setSession(data.session); loadCabin(data.session); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event,newSession)=>{ setSession(newSession); setTimeout(()=>loadCabin(newSession),0); });
    return ()=>sub.subscription.unsubscribe();
  },[loadCabin]);

  async function refreshPsmf(){
    setSyncing(true);
    try { const r=await fetch('/api/sync-psmf',{cache:'no-store'}); if(!r.ok) throw new Error('sync'); await loadPublicData(); alert(t.synced); }
    catch { alert(t.genericError); }
    finally { setSyncing(false); }
  }

  async function submitAuth(e:FormEvent){
    e.preventDefault(); setAuthBusy(true); setAuthMessage('');
    try {
      if(authMode==='signup'){
        localStorage.setItem('pending-player-name',selectedPlayer);
        const { data, error } = await supabase.auth.signUp({ email, password, options:{ emailRedirectTo: window.location.origin } });
        if(error) throw error; if(data.session){ await loadCabin(data.session); setAuthOpen(false); } else setAuthMessage(t.confirmEmail);
      } else { const { data, error } = await supabase.auth.signInWithPassword({email,password}); if(error) throw error; await loadCabin(data.session); setAuthOpen(false); }
    } catch(err:any){ setAuthMessage(err?.message || t.genericError); } finally{ setAuthBusy(false); }
  }
  async function logout(){ await supabase.auth.signOut(); setProfile(null); setAttendance(null); setAttendanceRows([]); }
  async function resendConfirmation(){
    if(!email){ setAuthMessage(lang==='cs'?'Nejdřív vyplň e-mail.':'Enter your email first.'); return; }
    setAuthBusy(true); setAuthMessage('');
    try{ const {error}=await supabase.auth.resend({type:'signup',email,options:{emailRedirectTo:window.location.origin}}); if(error) throw error; setAuthMessage(t.resent); }
    catch(err:any){ setAuthMessage(err?.message||t.genericError); } finally{ setAuthBusy(false); }
  }
  function openVenue(code:string){
    const venue=venues[code];
    if(venue) setVenueOpen(venue);
    else window.open(googleMaps(`${code} PSMF Praha`),'_blank','noopener,noreferrer');
  }
  async function setA(v:Exclude<Attendance,null>){
    if(!session || !profile || !nextKey){ setAuthMode('login'); setAuthOpen(true); return; }
    setSaving(true);
    try{ const matchResult = await supabase.from('matches').select('id').eq('psmf_key',nextKey).single(); if(matchResult.error) throw matchResult.error; const { error } = await supabase.from('attendance').upsert({ match_id: matchResult.data.id, player_id: profile.id, status: v, updated_at: new Date().toISOString() },{onConflict:'match_id,player_id'}); if(error) throw error; setAttendance(v); await loadCabin(session); }
    catch(err:any){ alert(err?.message || t.genericError); } finally{ setSaving(false); }
  }

  const responseGroups = { yes: attendanceRows.filter(r=>r.status==='yes'), maybe: attendanceRows.filter(r=>r.status==='maybe'), no: attendanceRows.filter(r=>r.status==='no') };

  return <main className="shell">
    <header className="top"><div><div className="tag">{t.tagline}</div><h1>Pěstební dělníci<br className="mobileBreak"/> A<span>.</span></h1></div><div className="actions"><button className="ghost" onClick={()=>setLang(lang==='cs'?'en':'cs')}><Languages size={18}/>{lang==='cs'?'EN':'CZ'}</button>{session ? <button className="ghost" onClick={logout}><LogOut size={18}/><span className="desktopOnly">{t.logout}</span></button> : <button className="ghost" onClick={()=>{setAuthMode('login');setAuthOpen(true)}}><LogIn size={18}/><span className="desktopOnly">{t.login}</span></button>}</div></header>
    {profile && <div className="signedStrip"><UserRound size={17}/>{t.signedAs}: <strong>{profile.display_name}</strong></div>}
    <section className="sourceCard"><div><strong>{t.league}</strong><div className="muted">{t.verified}</div></div><div className="actions"><button className="ghost" onClick={refreshPsmf} disabled={syncing}><RefreshCw size={18}/>{syncing?'…':t.refresh}</button><a href={SOURCE_URL} target="_blank" rel="noreferrer" className="ghost"><ExternalLink size={16}/></a></div></section>
    <nav className="tabs">{(['matches','table','stats','h2h'] as Tab[]).map(k=><button key={k} className={tab===k?'active':''} onClick={()=>setTab(k)}>{t[k]}</button>)}</nav>

    {tab==='matches' && <>{next ? <><section className="intro"><div><h2>{t.heading}</h2><p>{t.sub}</p></div><div className="seasonBadge"><ShieldCheck size={17}/> 5D</div></section><section className="heroCard"><div className="heroTop"><span>{t.next}</span><b>{next.home===TEAM?t.home:t.away}</b></div><div className="teams"><div><small>{TEAM}</small><h3>{opponent}</h3></div><div className="vs">VS</div></div><div className="meta"><span><CalendarDays size={20}/>{fmtDate(next.date,lang)} · {next.time}</span><button className="venueBtn" onClick={()=>openVenue(next.venue)}><MapPin size={20}/>{next.venue}</button></div><hr/><div className="attendanceHead"><strong>{t.count}</strong><span>{attendanceRows.length} / {players.length}</span></div>{session && profile ? <><div className="attendance"><button disabled={saving} className={attendance==='yes'?'picked':''} onClick={()=>setA('yes')}>✓ {t.yes}</button><button disabled={saving} className={attendance==='no'?'picked':''} onClick={()=>setA('no')}>× {t.no}</button><button disabled={saving} className={attendance==='maybe'?'picked':''} onClick={()=>setA('maybe')}>? {t.maybe}</button></div>{attendance && <p className="saved">{t.saved}</p>}</> : <button className="loginCta" onClick={()=>{setAuthMode('login');setAuthOpen(true)}}><LogIn size={18}/>{t.loginNeeded}</button>}{session && <div className="responseBoard"><h4>{t.responses}</h4>{attendanceRows.length===0 ? <p className="muted">{t.noResponses}</p> : <div className="responseCols"><div><b>✓ {t.yes} ({responseGroups.yes.length})</b>{responseGroups.yes.map(r=><span key={r.player_id}>{r.players?.display_name}</span>)}</div><div><b>? {t.maybe} ({responseGroups.maybe.length})</b>{responseGroups.maybe.map(r=><span key={r.player_id}>{r.players?.display_name}</span>)}</div><div><b>× {t.no} ({responseGroups.no.length})</b>{responseGroups.no.map(r=><span key={r.player_id}>{r.players?.display_name}</span>)}</div></div>}</div>}</section></> : <section className="panel"><p>Žádný další zápas není v PSMF naplánovaný.</p></section>}
      <h3 className="sectionTitle">{t.upcoming}</h3><div className="list">{matches.filter(m=>m.status==='upcoming').slice(1).map(m=><article className="matchRow" key={m.psmfKey||m.date+m.time}><div className="dateBox"><b>{fmtDate(m.date,lang)}</b><span>{m.time}</span></div><div className="matchTeams"><b>{m.home}</b><span>vs</span><b>{m.away}</b></div><button className="venueBtn" onClick={()=>openVenue(m.venue)}><MapPin size={17}/>{m.venue}</button></article>)}</div>
      <h3 className="sectionTitle">{t.past}</h3><div className="list">{matches.filter(m=>m.status==='past').slice().reverse().map(m=><article className="matchRow" key={m.psmfKey||m.date}><div className="dateBox"><b>{fmtDate(m.date,lang)}</b><span>{m.time}</span></div><div className="matchTeams"><b>{m.home}</b><span className="result">{m.result}</span><b>{m.away}</b></div><button className="venueBtn venueText" onClick={()=>openVenue(m.venue)}>{m.venue}</button></article>)}</div></>}

    {tab==='table' && <section className="panel"><h2>{t.table}</h2><div className="tableWrap"><table><thead><tr><th>{t.pos}</th><th>{t.team}</th><th>{t.played}</th><th>{t.wins}</th><th>{t.draws}</th><th>{t.losses}</th><th>{t.score}</th><th>{t.pts}</th></tr></thead><tbody>{standings.map((r,i)=><tr key={r[0]} className={r[0]===TEAM?'ours':''}><td>{i+1}.</td><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td>{r[4]}</td><td>{r[5]}</td><td><b>{r[6]}</b></td></tr>)}</tbody></table></div></section>}
    {tab==='stats' && <section className="panel"><h2>{t.stats}</h2><div className="tableWrap"><table><thead><tr><th>{t.player}</th><th>{t.games}</th><th>{t.goals}</th></tr></thead><tbody>{players.map(r=><tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td><td><b>{r[2]}</b></td></tr>)}</tbody></table></div></section>}
    {tab==='h2h' && <section className="panel empty"><h2>{t.h2h}</h2><p>{t.history}</p></section>}
    <section className="accountCard"><div className="accountIcon"><Users/></div><div><strong>{t.account}</strong><p>{profile ? `${t.signedAs}: ${profile.display_name}` : t.loginNeeded}</p></div>{session ? <button className="miniBtn" onClick={logout}>{t.logout}</button> : <button className="miniBtn" onClick={()=>setAuthOpen(true)}>{t.login}</button>}</section>
    <footer>Neoficiální týmová aplikace · Data PSMF</footer>


    {venueOpen && <div className="modalBackdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)setVenueOpen(null)}}><div className="authModal venueModal"><button className="modalClose" onClick={()=>setVenueOpen(null)}><X/></button><div className="venueCode"><MapPin size={18}/>{venueOpen.code}</div><h2>{venueOpen.name}</h2><div className="venueAddress"><span>{t.address}</span><strong>{venueOpen.address}</strong></div>{venueOpen.notes && <p className="venueNotes">{venueOpen.notes}</p>}<div className="navButtons"><a className="primaryBtn navLink" href={googleMaps(venueOpen.address)} target="_blank" rel="noreferrer"><Navigation size={18}/>{t.google}</a><a className="ghost navLink" href={waze(venueOpen.address)} target="_blank" rel="noreferrer"><Navigation size={18}/>{t.waze}</a></div></div></div>}

    {authOpen && <div className="modalBackdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)setAuthOpen(false)}}><div className="authModal"><button className="modalClose" onClick={()=>setAuthOpen(false)}><X/></button><h2>{authMode==='login'?t.login:t.signup}</h2><div className="authSwitch"><button className={authMode==='login'?'active':''} onClick={()=>{setAuthMode('login');setAuthMessage('')}}>{t.haveAccount}</button><button className={authMode==='signup'?'active':''} onClick={()=>{setAuthMode('signup');setAuthMessage('')}}>{t.newAccount}</button></div><form onSubmit={submitAuth} className="authForm">{authMode==='signup' && <label>{t.choosePlayer}<select value={selectedPlayer} onChange={e=>setSelectedPlayer(e.target.value)}>{players.map(p=><option key={p[0]} value={p[0]}>{p[0]}</option>)}</select></label>}<label>{t.email}<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label><label>{t.password}<input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={authMode==='login'?'current-password':'new-password'}/></label><button className="primaryBtn" disabled={authBusy}>{authBusy?'…':authMode==='login'?t.login:t.signup}</button>{authMode==='login' && <button type="button" className="textBtn" disabled={authBusy} onClick={resendConfirmation}>{t.resend}</button>}{authMessage && <p className="authMessage">{authMessage}</p>}</form></div></div>}
  </main>
}
