'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ExternalLink, Languages, LogIn, LogOut, MapPin, RefreshCw, ShieldCheck, UserRound, Users, X } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { matches, players, SOURCE_URL, standings, TEAM, venueLinks } from '@/lib/data';
import { supabase } from '@/lib/supabase';

type Lang = 'cs' | 'en';
type Tab = 'matches' | 'table' | 'stats' | 'h2h';
type Attendance = 'yes' | 'no' | 'maybe' | null;
type Profile = { id:string; display_name:string; role:string; user_id:string|null };
type AttendanceRow = { status:'yes'|'no'|'maybe'; player_id:string; players:{display_name:string}|null };

const copy = {
  cs: { tagline:'JEDEN TÝM. JEDNA KABINA.', league:'PSMF · 5D · podzim 2026', verified:'Data ověřena 6. 10. 2026', refresh:'PSMF', matches:'Zápasy', table:'Tabulka', stats:'Statistiky', h2h:'Vzájemné zápasy', heading:'Jdeme hrát.', sub:'Potvrď účast a měj přehled o dalších zápasech.', next:'NEJBLIŽŠÍ ZÁPAS', away:'Venku', home:'Doma', count:'Počítáme s tebou?', yes:'Přijdu', no:'Nepřijdu', maybe:'Zatím nevím', saved:'Uloženo do týmové kabiny.', upcoming:'Další zápasy', past:'Odehráno', pos:'Poř.', team:'Tým', played:'Z', wins:'V', draws:'R', losses:'P', score:'Skóre', pts:'B', player:'Hráč', goals:'Góly', games:'Zápasy', history:'Historii vzájemných zápasů doplníme automaticky ze starších sezon PSMF.', account:'Týmová kabina', login:'Přihlásit', logout:'Odhlásit', signup:'Vytvořit účet', email:'E-mail', password:'Heslo', choosePlayer:'Který hráč jsi?', haveAccount:'Už mám účet', newAccount:'Jsem tu poprvé', signedAs:'Přihlášen jako', loginNeeded:'Pro potvrzení účasti se přihlas.', responses:'Odpovědi týmu', noResponses:'Zatím nikdo neodpověděl.', confirmEmail:'Účet je vytvořený. Potvrď e-mail a potom se přihlas.', playerLinked:'Účet je propojen s hráčem.', genericError:'Něco se nepovedlo. Zkus to prosím znovu.' },
  en: { tagline:'ONE TEAM. ONE LOCKER ROOM.', league:'PSMF · 5D · autumn 2026', verified:'Data checked 6 Oct 2026', refresh:'PSMF', matches:'Matches', table:'Table', stats:'Stats', h2h:'Head-to-head', heading:"We're playing.", sub:'Confirm your availability and keep track of upcoming matches.', next:'NEXT MATCH', away:'Away', home:'Home', count:'Can we count on you?', yes:"I'm in", no:"I'm out", maybe:'Not sure yet', saved:'Saved to the team locker room.', upcoming:'Upcoming matches', past:'Results', pos:'Pos.', team:'Team', played:'P', wins:'W', draws:'D', losses:'L', score:'GD', pts:'Pts', player:'Player', goals:'Goals', games:'Games', history:'Historical head-to-head results will be synced from older PSMF seasons.', account:'Team locker room', login:'Sign in', logout:'Sign out', signup:'Create account', email:'Email', password:'Password', choosePlayer:'Which player are you?', haveAccount:'I already have an account', newAccount:"I'm new here", signedAs:'Signed in as', loginNeeded:'Sign in to confirm your availability.', responses:'Team responses', noResponses:'No responses yet.', confirmEmail:'Account created. Confirm your email and then sign in.', playerLinked:'Your account is linked to the player.', genericError:'Something went wrong. Please try again.' }
} as const;

function fmtDate(iso:string, lang:Lang) {
  return new Intl.DateTimeFormat(lang==='cs'?'cs-CZ':'en-GB',{day:'numeric',month:'long'}).format(new Date(iso+'T12:00:00'));
}

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
  const [selectedPlayer,setSelectedPlayer] = useState(players[0][0]);
  const [authMessage,setAuthMessage] = useState('');
  const [authBusy,setAuthBusy] = useState(false);
  const [saving,setSaving] = useState(false);
  const t = copy[lang];
  const next = useMemo(()=>matches.find(m=>m.status==='upcoming')!,[]);
  const opponent = next.home===TEAM?next.away:next.home;
  const nextKey = `2026-podzim-r${next.round}`;

  const loadCabin = useCallback(async (activeSession:Session|null) => {
    if (!activeSession) {
      setProfile(null); setAttendance(null); setAttendanceRows([]); return;
    }

    let { data: me } = await supabase.from('players').select('id,display_name,role,user_id').eq('user_id',activeSession.user.id).maybeSingle();

    const pending = localStorage.getItem('pending-player-name');
    if (!me && pending) {
      const { error } = await supabase.rpc('claim_player',{ player_name: pending });
      if (!error) {
        localStorage.removeItem('pending-player-name');
        const result = await supabase.from('players').select('id,display_name,role,user_id').eq('user_id',activeSession.user.id).maybeSingle();
        me = result.data;
        setAuthMessage(t.playerLinked);
      }
    }
    setProfile(me as Profile|null);

    const matchResult = await supabase.from('matches').select('id').eq('psmf_key',nextKey).maybeSingle();
    if (!matchResult.data?.id) return;

    const board = await supabase.from('attendance').select('status,player_id,players(display_name)').eq('match_id',matchResult.data.id);
    const normalized = (board.data ?? []).map((row:any)=>({
      status: row.status,
      player_id: row.player_id,
      players: Array.isArray(row.players) ? row.players[0] ?? null : row.players ?? null,
    })) as AttendanceRow[];
    setAttendanceRows(normalized);
    if (me) setAttendance((normalized.find(r=>r.player_id===me!.id)?.status as Attendance)||null);
  },[nextKey,t.playerLinked]);

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{ setSession(data.session); loadCabin(data.session); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event,newSession)=>{
      setSession(newSession);
      setTimeout(()=>loadCabin(newSession),0);
    });
    return ()=>sub.subscription.unsubscribe();
  },[loadCabin]);

  async function submitAuth(e:FormEvent){
    e.preventDefault(); setAuthBusy(true); setAuthMessage('');
    try {
      if(authMode==='signup'){
        localStorage.setItem('pending-player-name',selectedPlayer);
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options:{ emailRedirectTo: window.location.origin }
        });
        if(error) throw error;
        if(data.session){ await loadCabin(data.session); setAuthOpen(false); }
        else setAuthMessage(t.confirmEmail);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({email,password});
        if(error) throw error;
        await loadCabin(data.session);
        setAuthOpen(false);
      }
    } catch(err:any){ setAuthMessage(err?.message || t.genericError); }
    finally{ setAuthBusy(false); }
  }

  async function logout(){ await supabase.auth.signOut(); setProfile(null); setAttendance(null); setAttendanceRows([]); }

  async function setA(v:Exclude<Attendance,null>){
    if(!session || !profile){ setAuthMode('login'); setAuthOpen(true); return; }
    setSaving(true);
    try{
      const matchResult = await supabase.from('matches').select('id').eq('psmf_key',nextKey).single();
      if(matchResult.error) throw matchResult.error;
      const { error } = await supabase.from('attendance').upsert({
        match_id: matchResult.data.id,
        player_id: profile.id,
        status: v,
        updated_at: new Date().toISOString()
      },{onConflict:'match_id,player_id'});
      if(error) throw error;
      setAttendance(v);
      await loadCabin(session);
    } catch(err:any){ alert(err?.message || t.genericError); }
    finally{ setSaving(false); }
  }

  const responseGroups = {
    yes: attendanceRows.filter(r=>r.status==='yes'),
    maybe: attendanceRows.filter(r=>r.status==='maybe'),
    no: attendanceRows.filter(r=>r.status==='no')
  };

  return <main className="shell">
    <header className="top">
      <div>
        <div className="tag">{t.tagline}</div>
        <h1>Pěstební dělníci<br className="mobileBreak"/> A<span>.</span></h1>
      </div>
      <div className="actions">
        <button className="ghost" onClick={()=>setLang(lang==='cs'?'en':'cs')}><Languages size={18}/>{lang==='cs'?'EN':'CZ'}</button>
        {session ? <button className="ghost" onClick={logout}><LogOut size={18}/><span className="desktopOnly">{t.logout}</span></button> : <button className="ghost" onClick={()=>{setAuthMode('login');setAuthOpen(true)}}><LogIn size={18}/><span className="desktopOnly">{t.login}</span></button>}
      </div>
    </header>

    {profile && <div className="signedStrip"><UserRound size={17}/>{t.signedAs}: <strong>{profile.display_name}</strong></div>}

    <section className="sourceCard">
      <div><strong>{t.league}</strong><div className="muted">{t.verified}</div></div>
      <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="ghost"><RefreshCw size={18}/>{t.refresh}<ExternalLink size={15}/></a>
    </section>

    <nav className="tabs">
      {(['matches','table','stats','h2h'] as Tab[]).map(k=><button key={k} className={tab===k?'active':''} onClick={()=>setTab(k)}>{t[k]}</button>)}
    </nav>

    {tab==='matches' && <>
      <section className="intro"><div><h2>{t.heading}</h2><p>{t.sub}</p></div><div className="seasonBadge"><ShieldCheck size={17}/> 5D</div></section>
      <section className="heroCard">
        <div className="heroTop"><span>{t.next}</span><b>{next.home===TEAM?t.home:t.away}</b></div>
        <div className="teams"><div><small>{TEAM}</small><h3>{opponent}</h3></div><div className="vs">VS</div></div>
        <div className="meta"><span><CalendarDays size={20}/>{fmtDate(next.date,lang)} · {next.time}</span><a href={venueLinks[next.venue]} target="_blank" rel="noreferrer"><MapPin size={20}/>{next.venue}</a></div>
        <hr/>
        <div className="attendanceHead"><strong>{t.count}</strong><span>{attendanceRows.length} / 11</span></div>
        {session && profile ? <>
          <div className="attendance">
            <button disabled={saving} className={attendance==='yes'?'picked':''} onClick={()=>setA('yes')}>✓ {t.yes}</button>
            <button disabled={saving} className={attendance==='no'?'picked':''} onClick={()=>setA('no')}>× {t.no}</button>
            <button disabled={saving} className={attendance==='maybe'?'picked':''} onClick={()=>setA('maybe')}>? {t.maybe}</button>
          </div>
          {attendance && <p className="saved">{t.saved}</p>}
        </> : <button className="loginCta" onClick={()=>{setAuthMode('login');setAuthOpen(true)}}><LogIn size={18}/>{t.loginNeeded}</button>}

        {session && <div className="responseBoard">
          <h4>{t.responses}</h4>
          {attendanceRows.length===0 ? <p className="muted">{t.noResponses}</p> : <div className="responseCols">
            <div><b>✓ {t.yes} ({responseGroups.yes.length})</b>{responseGroups.yes.map(r=><span key={r.player_id}>{r.players?.display_name}</span>)}</div>
            <div><b>? {t.maybe} ({responseGroups.maybe.length})</b>{responseGroups.maybe.map(r=><span key={r.player_id}>{r.players?.display_name}</span>)}</div>
            <div><b>× {t.no} ({responseGroups.no.length})</b>{responseGroups.no.map(r=><span key={r.player_id}>{r.players?.display_name}</span>)}</div>
          </div>}
        </div>}
      </section>

      <h3 className="sectionTitle">{t.upcoming}</h3>
      <div className="list">{matches.filter(m=>m.status==='upcoming').slice(1).map(m=><article className="matchRow" key={m.date+m.time}><div className="dateBox"><b>{fmtDate(m.date,lang)}</b><span>{m.time}</span></div><div className="matchTeams"><b>{m.home}</b><span>vs</span><b>{m.away}</b></div><a href={venueLinks[m.venue]} target="_blank" rel="noreferrer"><MapPin size={17}/>{m.venue}</a></article>)}</div>

      <h3 className="sectionTitle">{t.past}</h3>
      <div className="list">{matches.filter(m=>m.status==='past').reverse().map(m=><article className="matchRow" key={m.date}><div className="dateBox"><b>{fmtDate(m.date,lang)}</b><span>{m.time}</span></div><div className="matchTeams"><b>{m.home}</b><span className="result">{m.result}</span><b>{m.away}</b></div><span className="venueText">{m.venue}</span></article>)}</div>
    </>}

    {tab==='table' && <section className="panel"><h2>{t.table}</h2><div className="tableWrap"><table><thead><tr><th>{t.pos}</th><th>{t.team}</th><th>{t.played}</th><th>{t.wins}</th><th>{t.draws}</th><th>{t.losses}</th><th>{t.score}</th><th>{t.pts}</th></tr></thead><tbody>{standings.map((r,i)=><tr key={r[0]} className={r[0]===TEAM?'ours':''}><td>{i+1}.</td><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td>{r[4]}</td><td>{r[5]}</td><td><b>{r[6]}</b></td></tr>)}</tbody></table></div></section>}

    {tab==='stats' && <section className="panel"><h2>{t.stats}</h2><div className="tableWrap"><table><thead><tr><th>{t.player}</th><th>{t.games}</th><th>{t.goals}</th></tr></thead><tbody>{players.map(r=><tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td><td><b>{r[2]}</b></td></tr>)}</tbody></table></div></section>}

    {tab==='h2h' && <section className="panel empty"><h2>{t.h2h}</h2><p>{t.history}</p></section>}

    <section className="accountCard">
      <div className="accountIcon"><Users/></div>
      <div><strong>{t.account}</strong><p>{profile ? `${t.signedAs}: ${profile.display_name}` : t.loginNeeded}</p></div>
      {session ? <button className="miniBtn" onClick={logout}>{t.logout}</button> : <button className="miniBtn" onClick={()=>setAuthOpen(true)}>{t.login}</button>}
    </section>

    <footer>Neoficiální týmová aplikace · Data PSMF</footer>

    {authOpen && <div className="modalBackdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)setAuthOpen(false)}}>
      <div className="authModal">
        <button className="modalClose" onClick={()=>setAuthOpen(false)}><X/></button>
        <h2>{authMode==='login'?t.login:t.signup}</h2>
        <div className="authSwitch">
          <button className={authMode==='login'?'active':''} onClick={()=>{setAuthMode('login');setAuthMessage('')}}>{t.haveAccount}</button>
          <button className={authMode==='signup'?'active':''} onClick={()=>{setAuthMode('signup');setAuthMessage('')}}>{t.newAccount}</button>
        </div>
        <form onSubmit={submitAuth} className="authForm">
          {authMode==='signup' && <label>{t.choosePlayer}<select value={selectedPlayer} onChange={e=>setSelectedPlayer(e.target.value)}>{players.map(p=><option key={p[0]} value={p[0]}>{p[0]}</option>)}</select></label>}
          <label>{t.email}<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>
          <label>{t.password}<input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={authMode==='login'?'current-password':'new-password'}/></label>
          <button className="primaryBtn" disabled={authBusy}>{authBusy?'…':authMode==='login'?t.login:t.signup}</button>
          {authMessage && <p className="authMessage">{authMessage}</p>}
        </form>
      </div>
    </div>}
  </main>
}
