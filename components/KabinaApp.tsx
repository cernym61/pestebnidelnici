'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ExternalLink, Languages, MapPin, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { matches, players, SOURCE_URL, standings, TEAM, venueLinks } from '@/lib/data';

type Lang = 'cs' | 'en';
type Tab = 'matches' | 'table' | 'stats' | 'h2h';
type Attendance = 'yes' | 'no' | 'maybe' | null;

const copy = {
  cs: { tagline:'JEDEN TÝM. JEDNA KABINA.', league:'PSMF · 5D · podzim 2026', verified:'Data ověřena 6. 10. 2026', refresh:'PSMF', matches:'Zápasy', table:'Tabulka', stats:'Statistiky', h2h:'Vzájemné zápasy', heading:'Jdeme hrát.', sub:'Potvrď účast a měj přehled o dalších zápasech.', next:'NEJBLIŽŠÍ ZÁPAS', away:'Venku', home:'Doma', count:'Počítáme s tebou?', yes:'Přijdu', no:'Nepřijdu', maybe:'Zatím nevím', saved:'Tvoje volba je uložená v tomto zařízení.', upcoming:'Další zápasy', past:'Odehráno', pos:'Poř.', team:'Tým', played:'Z', wins:'V', draws:'R', losses:'P', score:'Skóre', pts:'B', player:'Hráč', goals:'Góly', games:'Zápasy', history:'Historii vzájemných zápasů doplníme automaticky ze starších sezon PSMF.', account:'Přihlášení hráče', accountText:'V další fázi se účet spáruje s konkrétním hráčem a účast se bude ukládat do týmové databáze.' },
  en: { tagline:'ONE TEAM. ONE LOCKER ROOM.', league:'PSMF · 5D · autumn 2026', verified:'Data checked 6 Oct 2026', refresh:'PSMF', matches:'Matches', table:'Table', stats:'Stats', h2h:'Head-to-head', heading:"We're playing.", sub:'Confirm your availability and keep track of upcoming matches.', next:'NEXT MATCH', away:'Away', home:'Home', count:'Can we count on you?', yes:"I'm in", no:"I'm out", maybe:'Not sure yet', saved:'Your choice is saved on this device.', upcoming:'Upcoming matches', past:'Results', pos:'Pos.', team:'Team', played:'P', wins:'W', draws:'D', losses:'L', score:'GD', pts:'Pts', player:'Player', goals:'Goals', games:'Games', history:'Historical head-to-head results will be synced from older PSMF seasons.', account:'Player sign-in', accountText:'Next, each account will be linked to a specific player and availability will be stored in the team database.' }
} as const;

function fmtDate(iso:string, lang:Lang) {
  return new Intl.DateTimeFormat(lang==='cs'?'cs-CZ':'en-GB',{day:'numeric',month:'long'}).format(new Date(iso+'T12:00:00'));
}

export default function KabinaApp(){
  const [lang,setLang] = useState<Lang>('cs');
  const [tab,setTab] = useState<Tab>('matches');
  const [attendance,setAttendance] = useState<Attendance>(null);
  useEffect(()=>{ setAttendance((localStorage.getItem('attendance-2026-10-07') as Attendance)||null); },[]);
  const t = copy[lang];
  const next = useMemo(()=>matches.find(m=>m.status==='upcoming')!,[]);
  const opponent = next.home===TEAM?next.away:next.home;
  const setA=(v:Attendance)=>{setAttendance(v); if(v)localStorage.setItem('attendance-2026-10-07',v)};

  return <main className="shell">
    <header className="top">
      <div>
        <div className="tag">{t.tagline}</div>
        <h1>Pěstební dělníci<br className="mobileBreak"/> A<span>.</span></h1>
      </div>
      <div className="actions">
        <button className="ghost" onClick={()=>setLang(lang==='cs'?'en':'cs')}><Languages size={18}/>{lang==='cs'?'EN':'CZ'}</button>
        <button className="ghost"><Users size={18}/><span className="desktopOnly">Kabina</span></button>
      </div>
    </header>

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
        <div className="attendanceHead"><strong>{t.count}</strong><span>1 / 11</span></div>
        <div className="attendance">
          <button className={attendance==='yes'?'picked':''} onClick={()=>setA('yes')}>✓ {t.yes}</button>
          <button className={attendance==='no'?'picked':''} onClick={()=>setA('no')}>× {t.no}</button>
          <button className={attendance==='maybe'?'picked':''} onClick={()=>setA('maybe')}>? {t.maybe}</button>
        </div>
        {attendance && <p className="saved">{t.saved}</p>}
      </section>

      <h3 className="sectionTitle">{t.upcoming}</h3>
      <div className="list">{matches.filter(m=>m.status==='upcoming').slice(1).map(m=><article className="matchRow" key={m.date+m.time}><div className="dateBox"><b>{fmtDate(m.date,lang)}</b><span>{m.time}</span></div><div className="matchTeams"><b>{m.home}</b><span>vs</span><b>{m.away}</b></div><a href={venueLinks[m.venue]} target="_blank" rel="noreferrer"><MapPin size={17}/>{m.venue}</a></article>)}</div>

      <h3 className="sectionTitle">{t.past}</h3>
      <div className="list">{matches.filter(m=>m.status==='past').reverse().map(m=><article className="matchRow" key={m.date}><div className="dateBox"><b>{fmtDate(m.date,lang)}</b><span>{m.time}</span></div><div className="matchTeams"><b>{m.home}</b><span className="result">{m.result}</span><b>{m.away}</b></div><span className="venueText">{m.venue}</span></article>)}</div>
    </>}

    {tab==='table' && <section className="panel"><h2>{t.table}</h2><div className="tableWrap"><table><thead><tr><th>{t.pos}</th><th>{t.team}</th><th>{t.played}</th><th>{t.wins}</th><th>{t.draws}</th><th>{t.losses}</th><th>{t.score}</th><th>{t.pts}</th></tr></thead><tbody>{standings.map((r,i)=><tr key={r[0]} className={r[0]===TEAM?'ours':''}><td>{i+1}.</td><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td>{r[4]}</td><td>{r[5]}</td><td><b>{r[6]}</b></td></tr>)}</tbody></table></div></section>}

    {tab==='stats' && <section className="panel"><h2>{t.stats}</h2><div className="tableWrap"><table><thead><tr><th>{t.player}</th><th>{t.games}</th><th>{t.goals}</th></tr></thead><tbody>{players.map(r=><tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td><td><b>{r[2]}</b></td></tr>)}</tbody></table></div></section>}

    {tab==='h2h' && <section className="panel empty"><h2>{t.h2h}</h2><p>{t.history}</p></section>}

    <section className="accountCard"><div className="accountIcon"><Users/></div><div><strong>{t.account}</strong><p>{t.accountText}</p></div><span className="soon">Supabase</span></section>

    <footer>Neoficiální týmová aplikace · Data PSMF</footer>
  </main>
}
