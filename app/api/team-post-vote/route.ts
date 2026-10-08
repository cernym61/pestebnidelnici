import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const runtime='nodejs';

async function getAuthPlayer(request:Request){
  const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/,'');
  if(!token) throw new Error('Missing session token');
  const admin=getSupabaseAdmin();
  const {data,error}=await admin.auth.getUser(token);
  if(error||!data.user) throw new Error('Invalid session');
  const {data:player,error:pErr}=await admin.from('players').select('id,active').eq('user_id',data.user.id).maybeSingle();
  if(pErr)throw pErr;
  if(!player||player.active!==true)throw new Error('Active player profile required');
  return {admin,player};
}

export async function POST(request:Request){
  try{
    const {admin,player}=await getAuthPlayer(request);
    const body=await request.json().catch(()=>({}));
    const postId=String(body?.postId||'');
    const optionId=String(body?.optionId||'');
    if(!postId||!optionId)return NextResponse.json({ok:false,error:'Missing poll selection'},{status:400});

    const {data:post,error:postErr}=await admin.from('team_posts').select('id,event_date').eq('id',postId).maybeSingle();
    if(postErr)throw postErr;
    if(!post)return NextResponse.json({ok:false,error:'Poll not found'},{status:404});
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Prague',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    if(post.event_date&&String(post.event_date)<today)return NextResponse.json({ok:false,error:'Poll has ended'},{status:400});

    const {data:option,error:optionErr}=await admin.from('team_post_poll_options')
      .select('id,post_id').eq('id',optionId).eq('post_id',postId).maybeSingle();
    if(optionErr)throw optionErr;
    if(!option)return NextResponse.json({ok:false,error:'Poll option not found'},{status:404});

    const {error}=await admin.from('team_post_votes').upsert(
      {post_id:postId,option_id:optionId,player_id:player.id,created_at:new Date().toISOString()},
      {onConflict:'post_id,player_id'}
    );
    if(error)throw error;
    return NextResponse.json({ok:true});
  }catch(error:any){
    return NextResponse.json({ok:false,error:error?.message||'Vote failed'},{status:500});
  }
}


export async function DELETE(request:Request){
  try{
    const {admin,player}=await getAuthPlayer(request);
    const body=await request.json().catch(()=>({}));
    const postId=String(body?.postId||'');
    if(!postId)return NextResponse.json({ok:false,error:'Missing poll id'},{status:400});

    const {error}=await admin.from('team_post_votes')
      .delete()
      .eq('post_id',postId)
      .eq('player_id',player.id);
    if(error)throw error;
    return NextResponse.json({ok:true});
  }catch(error:any){
    return NextResponse.json({ok:false,error:error?.message||'Could not cancel vote'},{status:500});
  }
}
