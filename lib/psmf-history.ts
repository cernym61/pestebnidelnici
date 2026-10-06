import { parse } from 'node-html-parser';
import { LEGACY_TEAM, SOURCE_URL, TEAM } from '@/lib/data';

export const HISTORY_SEASONS = [
  {key:'2020-podzim',label:'Podzim 2020',year:2020,phase:'podzim',division:'5A',team:LEGACY_TEAM,url:'https://www.psmf.cz/souteze/2020-hanspaulska-liga-podzim/5-a/tymy/pestebni-delnici/'},
  {key:'2021-podzim',label:'Podzim 2021',year:2021,phase:'podzim',division:'5B',team:LEGACY_TEAM,url:'https://www.psmf.cz/souteze/2021-hanspaulska-liga-podzim/5-b/tymy/pestebni-delnici/'},
  {key:'2022-jaro',label:'Jaro 2022',year:2022,phase:'jaro',division:'5A',team:LEGACY_TEAM,url:'https://www.psmf.cz/souteze/2022-hanspaulska-liga-jaro/5-a/tymy/pestebni-delnici/'},
  {key:'2022-podzim',label:'Podzim 2022',year:2022,phase:'podzim',division:'5D',team:LEGACY_TEAM,url:'https://www.psmf.cz/souteze/2022-hanspaulska-liga-podzim/5-d/tymy/pestebni-delnici/'},
  {key:'2023-jaro',label:'Jaro 2023',year:2023,phase:'jaro',division:'5B',team:LEGACY_TEAM,url:'https://www.psmf.cz/souteze/2023-hanspaulska-liga-jaro/5-b/tymy/pestebni-delnici/'},
  {key:'2023-podzim',label:'Podzim 2023',year:2023,phase:'podzim',division:'4D',team:LEGACY_TEAM,url:'https://www.psmf.cz/souteze/2023-hanspaulska-liga-podzim/4-d/tymy/pestebni-delnici/'},
  {key:'2024-jaro',label:'Jaro 2024',year:2024,phase:'jaro',division:'4B',team:LEGACY_TEAM,url:'https://www.psmf.cz/souteze/2024-hanspaulska-liga-jaro/4-b/tymy/pestebni-delnici/'},
  {key:'2024-podzim',label:'Podzim 2024',year:2024,phase:'podzim',division:'5B',team:LEGACY_TEAM,url:'https://www.psmf.cz/souteze/2024-hanspaulska-liga-podzim/5-b/tymy/pestebni-delnici/'},
  {key:'2025-jaro',label:'Jaro 2025',year:2025,phase:'jaro',division:'4B',team:LEGACY_TEAM,url:'https://www.psmf.cz/souteze/2025-hanspaulska-liga-jaro/4-b/tymy/pestebni-delnici/'},
  {key:'2025-podzim',label:'Podzim 2025',year:2025,phase:'podzim',division:'4C',team:LEGACY_TEAM,url:'https://www.psmf.cz/souteze/2025-hanspaulska-liga-podzim/4-c/tymy/pestebni-delnici/'},
  {key:'2026-jaro',label:'Jaro 2026',year:2026,phase:'jaro',division:'4C',team:TEAM,url:'https://www.psmf.cz/souteze/2026-hanspaulska-liga-jaro/4-c/tymy/pestebni-delnici-a/'},
  {key:'2026-podzim',label:'Podzim 2026',year:2026,phase:'podzim',division:'5D',team:TEAM,url:SOURCE_URL}
] as const;

function clean(s:string){ return s.replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim(); }
function int(s:string){ const n=Number(clean(s).replace(/[^0-9-]/g,'')); return Number.isFinite(n)?n:0; }
function dateIso(s:string){ const m=clean(s).match(/(\d{1,2})\.(\d{1,2})\.(\d{2})/); if(!m) throw new Error(`Unknown PSMF date: ${s}`); return `20${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`; }
function lastSundayOfOctober(year:number){ const d=new Date(Date.UTC(year,9,31)); return 31-d.getUTCDay(); }
function pragueOffset(isoDate:string){ const [y,m,d]=isoDate.split('-').map(Number); if(m<3||m>10)return '+01:00'; if(m>3&&m<10)return '+02:00'; if(m===10)return d<=lastSundayOfOctober(y)?'+02:00':'+01:00'; return '+02:00'; }
function kickoff(date:string,time:string){ return `${date}T${time}:00${pragueOffset(date)}`; }
function headers(table:any){ return table.querySelectorAll('tr')[0]?.querySelectorAll('th,td').map((x:any)=>clean(x.text))??[]; }
function findTable(root:any, required:string[], cols?:number){ return root.querySelectorAll('table').find((table:any)=>{ const h=headers(table); return (!cols||h.length===cols)&&required.every(x=>h.some((v:string)=>v.includes(x))); }); }
function rows(table:any){ return table?table.querySelectorAll('tr').slice(1):[]; }
function teams(cell:any){ const names=(cell?.querySelectorAll('a')??[]).map((a:any)=>clean(a.text)).filter(Boolean); return names.length>=2?names.slice(0,2):[]; }

function attr(tag:string,name:string){
  const m=tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`,'i'));
  return m?.[1]||'';
}
function readableHtml(fragment:string){
  const withImages=fragment.replace(/<img\b[^>]*>/gi,(tag)=>{
    const alt=attr(tag,'alt'), title=attr(tag,'title'), cls=attr(tag,'class'), src=attr(tag,'src');
    const bits=[alt,title,cls,src].filter(Boolean).join(' ');
    const normalized=bits.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const isVs=/\bvs\b/.test(normalized);
    const isStar=!isVs && /(star|hvezd|hvěz|best.?player|player.?of.?match|man.?of.?match|motm)/i.test(normalized);
    const isYellow=/(yellow|zluta|žluta|zluty|žluty|yellow.?card)/i.test(normalized);
    const isRed=/(red|cervena|červena|cerveny|červeny|red.?card)/i.test(normalized);
    if(isStar)return ' [★ HRÁČ ZÁPASU] ';
    if(isYellow)return ' [ŽK] ';
    if(isRed)return ' [ČK] ';
    return bits?` [OBRÁZEK ${bits}] `:' ';
  });
  const formatted=withImages
    .replace(/<br\s*\/?>/gi,'\n')
    .replace(/<\/(tr|p|div|li|h1|h2|h3|h4|h5|section|article)>/gi,'\n')
    .replace(/<\/td>/gi,' | ');
  const text=parse(`<div>${formatted}</div>`).text;
  return text.split(/\n+/).map(clean).filter(Boolean).join('\n').slice(0,60000);
}
function extractMatchDetails(html:string,root:any){
  const headings=root.querySelectorAll('h1,h2,h3,h4,h5');
  const startNode=headings.find((x:any)=>clean(x.text).includes('Detaily utkání'));
  const endNode=headings.find((x:any)=>clean(x.text)==='Statistiky');
  if(!startNode)return '';
  const startTag=String(startNode.toString());
  const endTag=endNode?String(endNode.toString()):'';
  const start=html.indexOf(startTag);
  if(start<0)return '';
  const end=endTag?html.indexOf(endTag,start+startTag.length):-1;
  return readableHtml(html.slice(start,end>start?end:undefined));
}

async function fetchSeason(s:any, now:string){
  const response=await fetch(s.url,{cache:'no-store',headers:{'user-agent':'PestebniDelniciKabina/1.0'}});
  if(!response.ok) throw new Error(`${s.key}: PSMF returned ${response.status}`);
  const html=await response.text();
  const root=parse(html);
  const detailsText=extractMatchDetails(html,root);

  const standingTable=findTable(root,['Pořadí','Tým','Odehrané zápasy','Počet bodů']);
  let summary:any={season:s.key,label:s.label,year:s.year,phase:s.phase,division:s.division,team_name:s.team,source_url:s.url,synced_at:now};
  const standings=rows(standingTable).map((tr:any)=>{
    const c=tr.querySelectorAll('td'); if(c.length<8) return null;
    const name=clean(c[1].text);
    const row={season:s.key,rank:int(c[0].text),team:name,played:int(c[2].text),wins:int(c[3].text),draws:int(c[4].text),losses:int(c[5].text),score:clean(c[6].text),points:int(c[7].text),synced_at:now};
    if(name===s.team || name.startsWith('Pěstební dělníci')) summary={...summary,final_rank:row.rank,played:row.played,wins:row.wins,draws:row.draws,losses:row.losses,score:row.score,points:row.points};
    return row;
  }).filter(Boolean);

  const resultTable=findTable(root,['Datum','Čas','Hřiště','Domácí - Hosté','Kolo','Výsledek'],6);
  const matches=rows(resultTable).map((tr:any)=>{
    const c=tr.querySelectorAll('td'); if(c.length<6) return null;
    const pair=teams(c[3]); if(pair.length<2 || !pair.some((x:string)=>x===s.team || x.startsWith('Pěstební dělníci'))) return null;
    const score=clean(c[5].text).match(/(\d+)\s*:\s*(\d+)/); if(!score) return null;
    const date=dateIso(c[0].text); const round=int(c[4].text);
    return {psmf_key:`${s.key}-r${round}`,season:s.key,kickoff:kickoff(date,clean(c[1].text)),venue_code:clean(c[2].text),home_team:pair[0],away_team:pair[1],home_score:Number(score[1]),away_score:Number(score[2]),round,team_name:s.team,synced_at:now};
  }).filter(Boolean);

  const statsTable=findTable(root,['Hráč','Zápasů','Gólů']);
  const stats=rows(statsTable).map((tr:any)=>{
    const c=tr.querySelectorAll('td'); if(c.length<3) return null; const name=clean(c[0].text); if(!name)return null;
    return {season:s.key,player_name:name,games:int(c[1].text),goals:int(c[2].text),synced_at:now};
  }).filter(Boolean);

  const details={season:s.key,label:s.label,source_url:s.url,details_text:detailsText,synced_at:now};
  return {summary,standings,matches,stats,details};
}

export async function syncHistory(admin:any, now:string){
  const settled=await Promise.allSettled(HISTORY_SEASONS.map(s=>fetchSeason(s,now)));
  let seasons=0,standings=0,matches=0,stats=0,details=0; const errors:string[]=[];
  for(let i=0;i<settled.length;i++){
    const item=settled[i];
    if(item.status==='rejected'){ errors.push(`${HISTORY_SEASONS[i].key}: ${item.reason?.message||item.reason}`); continue; }
    const {summary,standings:st,matches:ms,stats:ss,details:detail}=item.value;
    const a=await admin.from('seasons').upsert(summary,{onConflict:'season'}); if(a.error){errors.push(`${summary.season}: ${a.error.message}`);continue;} seasons++;
    if(st.length){ const h=await admin.from('historical_standings').upsert(st,{onConflict:'season,team'}); if(h.error) errors.push(`${summary.season} standings: ${h.error.message}`); else standings+=st.length; }
    if(ms.length){ const b=await admin.from('historical_matches').upsert(ms,{onConflict:'psmf_key'}); if(b.error) errors.push(`${summary.season} matches: ${b.error.message}`); else matches+=ms.length; }
    if(ss.length){ const c=await admin.from('player_season_stats').upsert(ss,{onConflict:'season,player_name'}); if(c.error) errors.push(`${summary.season} stats: ${c.error.message}`); else stats+=ss.length; }
    if(detail.details_text){
      const d=await admin.from('psmf_season_details').upsert(detail,{onConflict:'season'});
      if(d.error) errors.push(`${summary.season} details: ${d.error.message}`); else details++;
    }
  }
  return {historySeasons:seasons,historyStandings:standings,historyMatches:matches,historyStats:stats,historyDetails:details,historyErrors:errors};
}
