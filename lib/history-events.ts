export type TeamMatchEvent={
  date:string;
  goals:{player:string;minute:number}[];
  yellowCards:{player:string;minute:number|null}[];
  redCards:{player:string;minute:number|null}[];
  manOfMatch:string[];
};

function esc(s:string){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function clean(s:string){return String(s||'').replace(/\s+/g,' ').trim();}
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
function hasStar(text:string,names:string[]){
  return names.some(name=>{
    const e=esc(name);
    return new RegExp(`(?:\\[★ HRÁČ ZÁPASU\\]|★|⭐)\\s*${e}|${e}\\s*(?:\\[★ HRÁČ ZÁPASU\\]|★|⭐)`,'i').test(text);
  });
}

export function parseSeasonDetails(detailsText:string,players:string[]):TeamMatchEvent[]{
  const lines=String(detailsText||'').split(/\n+/).map(s=>s.trim()).filter(Boolean);
  const chunks:{date:string,text:string}[]=[];
  let current:{date:string;lines:string[]}|null=null;
  for(const line of lines){
    const date=parseDate(line);
    if(date){
      if(current)chunks.push({date:current.date,text:current.lines.join('\n')});
      current={date,lines:[line]};
    }else if(current)current.lines.push(line);
  }
  if(current)chunks.push({date:current.date,text:current.lines.join('\n')});

  return chunks.map(({date,text})=>{
    const goals:{player:string;minute:number}[]=[];
    const yellowCards:{player:string;minute:number|null}[]=[];
    const redCards:{player:string;minute:number|null}[]=[];
    const manOfMatch:string[]=[];
    for(const player of players){
      const names=variants(player);
      for(const minute of goalMinutes(text,names))goals.push({player,minute});
      for(const minute of markerMinutes(text,names,'[ŽK]'))yellowCards.push({player,minute});
      for(const minute of markerMinutes(text,names,'[ČK]'))redCards.push({player,minute});
      if(hasStar(text,names))manOfMatch.push(player);
    }
    return {date,goals:goals.sort((a,b)=>a.minute-b.minute),yellowCards,redCards,manOfMatch:[...new Set(manOfMatch)]};
  });
}
