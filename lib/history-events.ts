export type TeamMatchEvent={
  date:string;
  goals:{player:string;minute:number}[];
  yellowCards:{player:string;minute:number|null}[];
  redCards:{player:string;minute:number|null}[];
  manOfMatch:string[];
  captains:string[];
  goalkeepers:string[];
};

function esc(s:string){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function clean(s:string){return String(s||'').replace(/\s+/g,' ').trim();}
function fold(s:string){return clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function variants(psmfName:string){
  const n=clean(psmfName), p=n.split(/\s+/);
  const reversed=p.length>=2?[...p.slice(1),p[0]].join(' '):n;
  return [...new Set([n,reversed])].sort((a,b)=>b.length-a.length);
}
function parseDate(line:string){
  const m=line.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{2})\b/);
  return m?`20${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:null;
}
function goalMinutes(text:string,names:string[]){
  const out:number[]=[];
  for(const name of names){
    const re=new RegExp(`((?:\\d{1,2}\\.\\s*,?\\s*)+)${esc(name)}`,'ig');
    for(const m of text.matchAll(re))
      out.push(...[...m[1].matchAll(/(\d{1,2})\./g)].map(x=>Number(x[1])));
  }
  return [...new Set(out)].sort((a,b)=>a-b);
}
function markerMinutes(text:string,names:string[],marker:string){
  const out:(number|null)[]=[];
  for(const name of names){
    const e=esc(name), mk=esc(marker);
    for(const re of [
      new RegExp(`(?:(\\d{1,2})\\.\\s*)?${mk}\\s*${e}`,'ig'),
      new RegExp(`(?:(\\d{1,2})\\.\\s*)?${e}\\s*${mk}`,'ig')
    ]){
      for(const m of text.matchAll(re))out.push(m[1]?Number(m[1]):null);
    }
  }
  return out;
}
function nearestMarkerBefore(line:string,name:string,markerPattern:string){
  const idx=fold(line).indexOf(fold(name));
  if(idx<0)return false;
  const before=line.slice(Math.max(0,idx-100),idx);
  // Limit to the current player token, not the previous player in the comma-separated lineup.
  const local=before.slice(Math.max(before.lastIndexOf(','),before.lastIndexOf('–'),before.lastIndexOf('-'))+1);
  return new RegExp(markerPattern,'i').test(local);
}
function hasStar(line:string,names:string[]){
  return names.some(name=>nearestMarkerBefore(
    line,name,
    String.raw`(?:\[★\s*HRÁČ\s*ZÁPASU\]|★|⭐|\bstar\b|\bmotm\b)`
  ));
}
function hasCaptain(line:string,names:string[]){
  return names.some(name=>nearestMarkerBefore(
    line,name,
    String.raw`(?:\[C\s*KAPITÁN\]|\bC\b|\bkapit[aá]n\b|\bcaptain\b)`
  ));
}
function lineupLine(lines:string[],players:string[]){
  let best=''; let bestCount=0;
  for(const line of lines){
    if(!/[–-]/.test(line))continue;
    let count=0;
    for(const p of players){
      if(variants(p).some(v=>fold(line).includes(fold(v))))count++;
    }
    if(count>bestCount){best=line;bestCount=count;}
  }
  return bestCount>=2?best:'';
}
function orderedTeamPlayers(line:string,players:string[]){
  const hits:{player:string;idx:number}[]=[];
  for(const player of players){
    let best=-1;
    for(const v of variants(player)){
      const idx=fold(line).indexOf(fold(v));
      if(idx>=0&&(best<0||idx<best))best=idx;
    }
    if(best>=0)hits.push({player,idx:best});
  }
  return hits.sort((a,b)=>a.idx-b.idx).map(x=>x.player);
}

export function parseSeasonDetails(detailsText:string,players:string[]):TeamMatchEvent[]{
  const lines=String(detailsText||'').split(/\n+/).map(s=>s.trim()).filter(Boolean);
  const chunks:{date:string,lines:string[]}[]=[];
  let current:{date:string;lines:string[]}|null=null;
  for(const line of lines){
    const date=parseDate(line);
    if(date){
      if(current)chunks.push(current);
      current={date,lines:[line]};
    }else if(current)current.lines.push(line);
  }
  if(current)chunks.push(current);

  return chunks.map(({date,lines})=>{
    const text=lines.join('\n');
    const goals:{player:string;minute:number}[]=[];
    const yellowCards:{player:string;minute:number|null}[]=[];
    const redCards:{player:string;minute:number|null}[]=[];
    const manOfMatch:string[]=[];
    const captains:string[]=[];
    const goalkeepers:string[]=[];

    const lineup=lineupLine(lines,players);
    const ordered=lineup?orderedTeamPlayers(lineup,players):[];

    // PSMF convention confirmed by team page: first listed player is the goalkeeper.
    if(ordered[0])goalkeepers.push(ordered[0]);

    for(const player of players){
      const names=variants(player);
      for(const minute of goalMinutes(text,names))goals.push({player,minute});
      for(const minute of markerMinutes(text,names,'[ŽK]'))yellowCards.push({player,minute});
      for(const minute of markerMinutes(text,names,'[ČK]'))redCards.push({player,minute});
      if(lineup && hasStar(lineup,names))manOfMatch.push(player);
      if(lineup && hasCaptain(lineup,names))captains.push(player);
    }
    return {
      date,
      goals:goals.sort((a,b)=>a.minute-b.minute),
      yellowCards,
      redCards,
      manOfMatch:[...new Set(manOfMatch)],
      captains:[...new Set(captains)],
      goalkeepers:[...new Set(goalkeepers)]
    };
  });
}
