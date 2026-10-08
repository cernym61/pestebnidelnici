import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { detailsTextFromRawHtml, parseSeasonDetails } from '@/lib/history-events';

export const runtime='nodejs';

export async function GET(request:Request){
  try{
    const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/,'');
    if(!token)return NextResponse.json({error:'Unauthorized'},{status:401});
    const admin=getSupabaseAdmin();
    const {data:userData,error:userErr}=await admin.auth.getUser(token);
    if(userErr||!userData.user)return NextResponse.json({error:'Unauthorized'},{status:401});
    const {data:player}=await admin.from('players').select('id,active').eq('user_id',userData.user.id).maybeSingle();
    if(!player||player.active!==true)return NextResponse.json({error:'Forbidden'},{status:403});
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
    for(const d of details||[]){
      // Parse exact PSMF DOM classes from stored raw HTML.
      // Fall back to details_text only for old rows that do not have HTML.
      const sourceText=d.details_html
        ? detailsTextFromRawHtml(d.details_html)
        : String(d.details_text||'');
      seasons[d.season]=parseSeasonDetails(sourceText,players.get(d.season)||[]);
    }
    return NextResponse.json({seasons});
  }catch(e:any){
    return NextResponse.json({error:e?.message||'History events failed'},{status:500});
  }
}
