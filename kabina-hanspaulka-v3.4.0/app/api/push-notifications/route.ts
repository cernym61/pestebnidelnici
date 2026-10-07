import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendPush } from '@/lib/onesignal';

const SITE_URL='https://www.pestebnidelnici.cz';

async function getAuthPlayer(request:Request){
  const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/,'');
  if(!token) throw new Error('Missing session token');
  const admin=getSupabaseAdmin();
  const {data,error}=await admin.auth.getUser(token);
  if(error || !data.user) throw new Error('Invalid session');
  const {data:player,error:pErr}=await admin.from('players').select('id,display_name,role,active').eq('user_id',data.user.id).maybeSingle();
  if(pErr) throw pErr;
  if(!player) throw new Error('Account is not linked to a player');
  return {admin,user:data.user,player};
}

export async function POST(request:Request){
  try{
    const {admin,player}=await getAuthPlayer(request);
    const body=await request.json().catch(()=>({}));
    const mode=body?.mode || 'test';
    if(mode==='test'){
      const result=await sendPush({externalIds:[player.id],titleCs:'⚽ Pěstební dělníci A',bodyCs:'Test push notifikace funguje. Kabina je připravená.',titleEn:'⚽ Pěstební dělníci A',bodyEn:'Test push notification works. Your locker room is ready.',url:SITE_URL});
      return NextResponse.json({ok:true,result});
    }
    if(mode==='admin'){
      if(player.role!=='admin') return NextResponse.json({ok:false,error:'Admin access required'},{status:403});
      const title=String(body?.title||'').trim();
      const message=String(body?.message||'').trim();
      if(!title || !message) return NextResponse.json({ok:false,error:'Title and message are required'},{status:400});
      let ids:string[]=Array.isArray(body?.playerIds)?body.playerIds.filter((x:any)=>typeof x==='string'):[];
      if(!ids.length){
        const {data,error}=await admin.from('players').select('id').eq('active',true).not('user_id','is',null);
        if(error) throw error;
        ids=(data||[]).map((x:any)=>x.id);
      }
      const result=await sendPush({externalIds:ids,titleCs:title,bodyCs:message,titleEn:title,bodyEn:message,url:SITE_URL});
      return NextResponse.json({ok:true,count:ids.length,result});
    }
    return NextResponse.json({ok:false,error:'Unsupported mode'},{status:400});
  }catch(error:any){
    return NextResponse.json({ok:false,error:error?.message||'Push failed'},{status:500});
  }
}
