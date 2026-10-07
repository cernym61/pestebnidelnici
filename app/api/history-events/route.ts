import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { parseSeasonDetails } from '@/lib/history-events';

export const runtime='nodejs';

export async function GET(){
  try{
    const admin=getSupabaseAdmin();
    const [{data:details,error:de},{data:stats,error:se}]=await Promise.all([
      admin.from('psmf_season_details').select('season,details_text,details_html').order('season'),
      admin.from('player_season_stats').select('season,player_name').order('season')
    ]);
    if(de)throw de;if(se)throw se;
    const players=new Map<string,string[]>();
    for(const x of stats||[]){
      const arr=players.get(x.season)||[];
      if(!arr.includes(x.player_name))arr.push(x.player_name);
      players.set(x.season,arr);
    }
    const seasons:Record<string,any>={};
    for(const d of details||[])seasons[d.season]=parseSeasonDetails(d.details_text,players.get(d.season)||[]);
    return NextResponse.json({seasons});
  }catch(e:any){
    return NextResponse.json({error:e?.message||'History events failed'},{status:500});
  }
}
