import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { detailsTextFromRawHtml, parseSeasonDetails } from '@/lib/history-events';

export const runtime='nodejs';

export async function GET(){
  try{
    const admin=getSupabaseAdmin();
    const [{data:details,error:de},{data:stats,error:se}]=await Promise.all([
      admin.from('psmf_season_details').select('season,details_html,details_text').order('season'),
      admin.from('player_season_stats').select('season,player_name').order('season')
    ]);
    if(de)throw de;if(se)throw se;

    const players=new Map<string,string[]>();
    for(const x of stats||[]){
      const arr=players.get(x.season)||[];
      if(!arr.includes(x.player_name))arr.push(x.player_name);
      players.set(x.season,arr);
    }

    const out=(details||[]).map((d:any)=>{
      const html=String(d.details_html||'');
      const text=html?detailsTextFromRawHtml(html):String(d.details_text||'');
      const parsed=parseSeasonDetails(text,players.get(d.season)||[]);
      return {
        season:d.season,
        raw_is_best:(html.match(/\bis-best\b/gi)||[]).length,
        raw_is_captain:(html.match(/\bis-captain\b/gi)||[]).length,
        parsed_motm:parsed.reduce((n:number,e:any)=>n+(e.manOfMatch?.length||0),0),
        parsed_captains:parsed.reduce((n:number,e:any)=>n+(e.captains?.length||0),0),
        motm:parsed.flatMap((e:any)=>e.manOfMatch.map((name:string)=>({date:e.date,name}))),
        captains:parsed.flatMap((e:any)=>e.captains.map((name:string)=>({date:e.date,name})))
      };
    });
    return NextResponse.json({seasons:out});
  }catch(e:any){
    return NextResponse.json({error:e?.message||'History debug failed'},{status:500});
  }
}
