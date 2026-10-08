import { NextResponse } from 'next/server';
import { parse } from 'node-html-parser';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { SEASON, SOURCE_URL, TEAM } from '@/lib/data';
import { syncHistory, syncOneSeason } from '@/lib/psmf-history';

export const dynamic='force-dynamic';
export const maxDuration=60;

const VENUES_URL='https://www.psmf.cz/hriste/';
const TEAM_SLUG='pestebni-delnici-a';

type SeasonState={
  current_season:string;
  current_url:string;
  current_year:number;
  current_phase:'jaro'|'podzim';
  current_division:string;
  status:'active'|'waiting';
  waiting_for_season:string|null;
  waiting_for_label:string|null;
  last_checked_at:string|null;
};

function clean(s:string){return s.replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();}
function int(s:string){const n=Number(clean(s).replace(/[^0-9-]/g,''));return Number.isFinite(n)?n:0;}
function dateIso(s:string){
  const m=clean(s).match(/(\d{1,2})\.(\d{1,2})\.(\d{2})/);
  if(!m)throw new Error(`Unknown PSMF date: ${s}`);
  return `20${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
}
function lastSundayOfOctober(year:number){const d=new Date(Date.UTC(year,9,31));return 31-d.getUTCDay();}
function pragueOffset(isoDate:string){
  const [y,m,d]=isoDate.split('-').map(Number);
  if(m<3||m>10)return '+01:00';
  if(m>3&&m<10)return '+02:00';
  if(m===10)return d<=lastSundayOfOctober(y)?'+02:00':'+01:00';
  return '+02:00';
}
function kickoff(date:string,time:string){return `${date}T${time}:00${pragueOffset(date)}`;}
function tableHeaders(table:any){return table.querySelectorAll('tr')[0]?.querySelectorAll('th,td').map((x:any)=>clean(x.text))??[];}
function findTable(root:any,required:string[],exactCols?:number){
  return root.querySelectorAll('table').find((table:any)=>{
    const h=tableHeaders(table);
    return (!exactCols||h.length===exactCols)&&required.every(x=>h.some((v:string)=>v.includes(x)));
  });
}
function rows(table:any){return table?table.querySelectorAll('tr').slice(1):[];}
function teamsFromCell(cell:any){
  const names=(cell?.querySelectorAll('a')??[]).map((a:any)=>clean(a.text)).filter(Boolean);
  return names.length>=2?names.slice(0,2):[];
}
function multilineText(node:any){
  const html=String(node?.innerHTML??'').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<\/div>/gi,'\n');
  const text=parse(`<div>${html}</div>`).text;
  return text.split(/\n+/).map(clean).filter(Boolean);
}
function labelFor(year:number,phase:'jaro'|'podzim'){
  return `${phase==='jaro'?'Jaro':'Podzim'} ${year}`;
}
function nextSeason(current:SeasonState){
  if(current.current_phase==='jaro'){
    return {key:`${current.current_year}-podzim`,year:current.current_year,phase:'podzim' as const,label:`Podzim ${current.current_year}`};
  }
  const year=current.current_year+1;
  return {key:`${year}-jaro`,year,phase:'jaro' as const,label:`Jaro ${year}`};
}
function divisionFromUrl(url:string){
  return url.match(/\/(\d+-[a-z])\/(?:tymy\/)?/i)?.[1]?.toUpperCase().replace('-','')||'';
}
function absolute(href:string,base:string){
  try{return new URL(href,base).toString();}catch{return '';}
}

async function getState(admin:any):Promise<SeasonState>{
  const {data}=await admin.from('season_state').select('*').eq('id',1).maybeSingle();
  return data||{
    current_season:SEASON,current_url:SOURCE_URL,current_year:2026,current_phase:'podzim',
    current_division:'5D',status:'active',waiting_for_season:null,waiting_for_label:null,last_checked_at:null
  };
}
async function saveState(admin:any,state:Partial<SeasonState>){
  const {error}=await admin.from('season_state').upsert({id:1,...state,updated_at:new Date().toISOString()},{onConflict:'id'});
  if(error)throw error;
}

async function discoverSeason(target:{key:string;year:number;phase:'jaro'|'podzim';label:string}){
  const rootUrl=`https://www.psmf.cz/souteze/${target.year}-hanspaulska-liga-${target.phase}/`;
  const rootRes=await fetch(rootUrl,{cache:'no-store',headers:{'user-agent':'PestebniDelniciKabina/1.0'}});
  if(!rootRes.ok)return null;
  const root=parse(await rootRes.text());

  const divisionUrls=[...new Set(
    root.querySelectorAll('a')
      .map((a:any)=>absolute(a.getAttribute('href')||'',rootUrl))
      .filter((u:string)=>new RegExp(`/souteze/${target.year}-hanspaulska-liga-${target.phase}/\\d+-[a-z]/?$`,'i').test(u))
  )];

  // PSMF has many groups, so check them in modest parallel batches.
  for(let i=0;i<divisionUrls.length;i+=8){
    const batch=divisionUrls.slice(i,i+8);
    const found=await Promise.all(batch.map(async divisionUrl=>{
      try{
        const r=await fetch(divisionUrl,{cache:'no-store',headers:{'user-agent':'PestebniDelniciKabina/1.0'}});
        if(!r.ok)return null;
        const doc=parse(await r.text());
        const teamLink=doc.querySelectorAll('a').find((a:any)=>{
          const text=clean(a.text);
          const href=String(a.getAttribute('href')||'');
          return text===TEAM || href.includes(`/tymy/${TEAM_SLUG}/`);
        });
        if(!teamLink)return null;
        const teamUrl=absolute(teamLink.getAttribute('href')||'',divisionUrl);
        if(!teamUrl)return null;
        return {
          key:target.key,label:target.label,year:target.year,phase:target.phase,
          division:divisionFromUrl(divisionUrl),team:TEAM,url:teamUrl
        };
      }catch{return null;}
    }));
    const hit=found.find(Boolean);
    if(hit)return hit;
  }
  return null;
}

async function syncTeam(admin:any,now:string,state:SeasonState){
  const response=await fetch(state.current_url,{cache:'no-store',headers:{'user-agent':'PestebniDelniciKabina/1.0'}});
  if(!response.ok)throw new Error(`PSMF team page returned ${response.status}`);
  const root=parse(await response.text());

  const statsTable=findTable(root,['Hráč','Zápasů','Gólů']);
  const playerRows=rows(statsTable).map((tr:any)=>{
    const c=tr.querySelectorAll('td');if(c.length<3)return null;
    const name=clean(c[0].text);if(!name)return null;
    return {display_name:name,psmf_name:name,psmf_games:int(c[1].text),psmf_goals:int(c[2].text),active:true,last_seen_at:now};
  }).filter(Boolean);
  if(playerRows.length){
    const {error}=await admin.from('players').upsert(playerRows,{onConflict:'display_name'});
    if(error)throw error;
  }

  const standingsTable=findTable(root,['Pořadí','Tým','Odehrané zápasy','Počet bodů']);
  const standingRows=rows(standingsTable).map((tr:any)=>{
    const c=tr.querySelectorAll('td');if(c.length<8)return null;
    return {season:state.current_season,rank:int(c[0].text),team:clean(c[1].text),played:int(c[2].text),wins:int(c[3].text),draws:int(c[4].text),losses:int(c[5].text),score:clean(c[6].text),points:int(c[7].text),synced_at:now};
  }).filter(Boolean);
  if(standingRows.length){
    const {error}=await admin.from('standings').upsert(standingRows,{onConflict:'season,team'});
    if(error)throw error;
  }

  const parseMatchTable=(table:any,hasResult:boolean)=>rows(table).map((tr:any)=>{
    const c=tr.querySelectorAll('td');if(c.length<(hasResult?6:5))return null;
    const names=teamsFromCell(c[3]);if(names.length<2||!names.includes(TEAM))return null;
    const date=dateIso(c[0].text),time=clean(c[1].text),venue=clean(c[2].text),round=int(c[4].text);
    let home_score:null|number=null,away_score:null|number=null;
    if(hasResult){
      const sm=clean(c[5].text).match(/(\d+)\s*:\s*(\d+)/);
      if(sm){home_score=Number(sm[1]);away_score=Number(sm[2]);}
    }
    return {psmf_key:`${state.current_season}-r${round}`,kickoff:kickoff(date,time),venue_code:venue,home_team:names[0],away_team:names[1],home_score,away_score,season:state.current_season};
  }).filter(Boolean);

  const resultsTable=findTable(root,['Datum','Čas','Hřiště','Domácí - Hosté','Kolo','Výsledek'],6);
  const upcomingTable=findTable(root,['Datum','Čas','Hřiště','Domácí - Hosté','Kolo'],5);
  const results=parseMatchTable(resultsTable,true);
  const upcoming=parseMatchTable(upcomingTable,false);
  const matchRows=[...results,...upcoming];
  if(matchRows.length){
    const {error}=await admin.from('matches').upsert(matchRows,{onConflict:'psmf_key'});
    if(error)throw error;
  }

  return {players:playerRows.length,standings:standingRows.length,matches:matchRows.length,results:results.length,upcoming:upcoming.length};
}

async function syncVenues(admin:any,now:string){
  const response=await fetch(VENUES_URL,{cache:'no-store',headers:{'user-agent':'PestebniDelniciKabina/1.0'}});
  if(!response.ok)throw new Error(`PSMF venues page returned ${response.status}`);
  const root=parse(await response.text());
  const table=findTable(root,['Název hřiště','Zkratka hřiště','Adresa']);
  const venueRows:any[]=[];
  for(const tr of rows(table)){
    const c=tr.querySelectorAll('td');if(c.length<3)continue;
    const name=clean(c[0].text);if(!name)continue;
    const codes=c[1].querySelectorAll('a').map((a:any)=>clean(a.text)).filter(Boolean);
    if(!codes.length)continue;
    const parts=multilineText(c[2]);
    const address=parts[0]||clean(c[2].text);
    const notes=parts.slice(1).join(' ')||null;
    for(const code of codes)venueRows.push({code,name,address,notes,source_url:VENUES_URL,synced_at:now});
  }
  if(venueRows.length){
    const {error}=await admin.from('venues').upsert(venueRows,{onConflict:'code'});
    if(error)throw error;
  }
  return venueRows.length;
}

async function sync(){
  const admin=getSupabaseAdmin();
  const now=new Date().toISOString();
  let state=await getState(admin);

  // If we're already waiting for a new season, check that target first.
  if(state.status==='waiting'){
    const target=nextSeason(state);
    const discovered=await discoverSeason(target);
    await saveState(admin,{...state,last_checked_at:now,waiting_for_season:target.key,waiting_for_label:target.label});
    if(discovered){
      state={
        ...state,
        current_season:discovered.key,current_url:discovered.url,current_year:discovered.year,
        current_phase:discovered.phase,current_division:discovered.division,status:'active',
        waiting_for_season:null,waiting_for_label:null,last_checked_at:now
      };
      await saveState(admin,state);
    }
  }

  let team=await syncTeam(admin,now,state);

  // A season counts as finished only after at least one result exists and PSMF has no future team match.
  // This avoids skipping a newly discovered season before its schedule is published.
  if(state.status==='active'&&team.results>0&&team.upcoming===0){
    const target=nextSeason(state);
    const discovered=await discoverSeason(target);
    if(discovered){
      state={
        ...state,current_season:discovered.key,current_url:discovered.url,current_year:discovered.year,
        current_phase:discovered.phase,current_division:discovered.division,status:'active',
        waiting_for_season:null,waiting_for_label:null,last_checked_at:now
      };
      await saveState(admin,state);
      team=await syncTeam(admin,now,state);
    }else{
      state={...state,status:'waiting',waiting_for_season:target.key,waiting_for_label:target.label,last_checked_at:now};
      await saveState(admin,state);
    }
  }else{
    await saveState(admin,{...state,last_checked_at:now});
  }

  const currentSeasonMeta={
    key:state.current_season,
    label:labelFor(state.current_year,state.current_phase),
    year:state.current_year,
    phase:state.current_phase,
    division:state.current_division,
    team:TEAM,
    url:state.current_url
  };

  const [venues,history,currentHistory]=await Promise.all([
    syncVenues(admin,now),
    syncHistory(admin,now),
    syncOneSeason(admin,currentSeasonMeta,now).catch((e:any)=>({season:state.current_season,errors:[e?.message||String(e)]}))
  ]);

  await admin.from('sync_meta').upsert({key:'psmf-current-team',last_synced_at:now,source_url:state.current_url},{onConflict:'key'});
  await admin.from('sync_meta').upsert({key:'psmf-venues',last_synced_at:now,source_url:VENUES_URL},{onConflict:'key'});

  return {
    ...team,venues,...history,currentHistory,
    seasonState:{
      currentSeason:state.current_season,currentUrl:state.current_url,currentYear:state.current_year,
      currentPhase:state.current_phase,currentDivision:state.current_division,status:state.status,
      waitingForSeason:state.waiting_for_season,waitingForLabel:state.waiting_for_label
    },
    syncedAt:now
  };
}

export async function GET(){
  try{return NextResponse.json({ok:true,...await sync()});}
  catch(error:any){
    console.error(error);
    return NextResponse.json({ok:false,error:error?.message??'Sync failed'},{status:500});
  }
}
