import { NextResponse } from 'next/server';
import { parse } from 'node-html-parser';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { SEASON, SOURCE_URL, TEAM } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function clean(s:string){ return s.replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim(); }
function int(s:string){ const n = Number(clean(s).replace(/[^0-9-]/g,'')); return Number.isFinite(n) ? n : 0; }
function dateIso(s:string){
  const m = clean(s).match(/(\d{1,2})\.(\d{1,2})\.(\d{2})/);
  if(!m) throw new Error(`Unknown PSMF date: ${s}`);
  return `20${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
}
function lastSundayOfOctober(year:number){
  const d = new Date(Date.UTC(year,9,31));
  return 31 - d.getUTCDay();
}
function pragueOffset(isoDate:string){
  const [y,m,d] = isoDate.split('-').map(Number);
  if(m < 3 || m > 10) return '+01:00';
  if(m > 3 && m < 10) return '+02:00';
  if(m === 10) return d <= lastSundayOfOctober(y) ? '+02:00' : '+01:00';
  // All Hanspaulka spring dates are after the DST switch in late March.
  return '+02:00';
}
function kickoff(date:string,time:string){ return `${date}T${time}:00${pragueOffset(date)}`; }
function tableHeaders(table:any){ return table.querySelectorAll('tr')[0]?.querySelectorAll('th,td').map((x:any)=>clean(x.text)) ?? []; }
function findTable(root:any, required:string[], exactCols?:number){
  return root.querySelectorAll('table').find((table:any)=>{
    const h = tableHeaders(table);
    return (!exactCols || h.length===exactCols) && required.every(x=>h.some((v:string)=>v.includes(x)));
  });
}
function rows(table:any){ return table ? table.querySelectorAll('tr').slice(1) : []; }
function teamsFromCell(cell:any){
  const links = cell?.querySelectorAll('a') ?? [];
  const names = links.map((a:any)=>clean(a.text)).filter(Boolean);
  return names.length >= 2 ? names.slice(0,2) : [];
}

async function sync(){
  const response = await fetch(SOURCE_URL,{ cache:'no-store', headers:{'user-agent':'PestebniDelniciKabina/1.0'} });
  if(!response.ok) throw new Error(`PSMF returned ${response.status}`);
  const html = await response.text();
  const root = parse(html);
  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();

  const statsTable = findTable(root,['Hráč','Zápasů','Gólů']);
  const playerRows = rows(statsTable).map((tr:any)=>{
    const c = tr.querySelectorAll('td');
    if(c.length < 3) return null;
    const name = clean(c[0].text); if(!name) return null;
    return { display_name:name, psmf_name:name, psmf_games:int(c[1].text), psmf_goals:int(c[2].text), active:true, last_seen_at:now };
  }).filter(Boolean);
  if(playerRows.length){
    const { error } = await admin.from('players').upsert(playerRows,{onConflict:'display_name'});
    if(error) throw error;
  }

  const standingsTable = findTable(root,['Pořadí','Tým','Odehrané zápasy','Počet bodů']);
  const standingRows = rows(standingsTable).map((tr:any)=>{
    const c = tr.querySelectorAll('td'); if(c.length < 8) return null;
    return { season:SEASON, rank:int(c[0].text), team:clean(c[1].text), played:int(c[2].text), wins:int(c[3].text), draws:int(c[4].text), losses:int(c[5].text), score:clean(c[6].text), points:int(c[7].text), synced_at:now };
  }).filter(Boolean);
  if(standingRows.length){
    const { error } = await admin.from('standings').upsert(standingRows,{onConflict:'season,team'});
    if(error) throw error;
  }

  const parseMatchTable = (table:any, hasResult:boolean) => rows(table).map((tr:any)=>{
    const c = tr.querySelectorAll('td'); if(c.length < (hasResult?6:5)) return null;
    const names = teamsFromCell(c[3]); if(names.length < 2 || !names.includes(TEAM)) return null;
    const date = dateIso(c[0].text); const time = clean(c[1].text); const venue = clean(c[2].text); const round = int(c[4].text);
    let home_score:null|number = null, away_score:null|number = null;
    if(hasResult){ const sm=clean(c[5].text).match(/(\d+)\s*:\s*(\d+)/); if(sm){home_score=Number(sm[1]);away_score=Number(sm[2]);} }
    return { psmf_key:`${SEASON}-r${round}`, kickoff:kickoff(date,time), venue_code:venue, home_team:names[0], away_team:names[1], home_score, away_score, season:SEASON };
  }).filter(Boolean);

  const resultsTable = findTable(root,['Datum','Čas','Hřiště','Domácí - Hosté','Kolo','Výsledek'],6);
  const upcomingTable = findTable(root,['Datum','Čas','Hřiště','Domácí - Hosté','Kolo'],5);
  const matchRows = [...parseMatchTable(resultsTable,true), ...parseMatchTable(upcomingTable,false)];
  if(matchRows.length){
    const { error } = await admin.from('matches').upsert(matchRows,{onConflict:'psmf_key'});
    if(error) throw error;
  }

  await admin.from('sync_meta').upsert({ key:'psmf-current-team', last_synced_at:now, source_url:SOURCE_URL },{onConflict:'key'});
  return { players:playerRows.length, standings:standingRows.length, matches:matchRows.length, syncedAt:now };
}

export async function GET(){
  try { return NextResponse.json({ok:true,...await sync()}); }
  catch(error:any){ console.error(error); return NextResponse.json({ok:false,error:error?.message ?? 'Sync failed'},{status:500}); }
}
