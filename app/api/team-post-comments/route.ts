import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendPush } from '@/lib/onesignal';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const BOARD_URL='https://www.pestebnidelnici.cz/?tab=board';

async function auth(request:Request){
  const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/,'');
  if(!token)throw new Error('Missing session');
  const admin=getSupabaseAdmin();
  const {data,error}=await admin.auth.getUser(token);
  if(error||!data.user)throw new Error('Invalid session');
  const {data:player,error:pErr}=await admin.from('players')
    .select('id,display_name,avatar_url,role,active')
    .eq('user_id',data.user.id).maybeSingle();
  if(pErr)throw pErr;
  if(!player||player.active!==true)throw new Error('Active player required');
  return {admin,player};
}

export async function GET(request:Request){
  try{
    const {admin,player}=await auth(request);
    const [{data:rows,error},{data:readRow}]=await Promise.all([
      admin.from('team_post_comments')
        .select('id,post_id,player_id,parent_id,body,created_at,players(display_name,avatar_url,role)')
        .order('created_at',{ascending:true}),
      admin.from('team_board_reads').select('last_read_at').eq('player_id',player.id).maybeSingle()
    ]);
    if(error)throw error;

    const lastRead=readRow?.last_read_at?new Date(readRow.last_read_at).getTime():0;
    const normalized=(rows||[]).map((r:any)=>({
      id:r.id,
      postId:r.post_id,
      playerId:r.player_id,
      parentId:r.parent_id,
      body:r.body,
      createdAt:r.created_at,
      author:{
        name:(Array.isArray(r.players)?r.players[0]?.display_name:r.players?.display_name)||'Hráč',
        avatarUrl:(Array.isArray(r.players)?r.players[0]?.avatar_url:r.players?.avatar_url)||null,
        role:(Array.isArray(r.players)?r.players[0]?.role:r.players?.role)||'player'
      }
    }));
    const unreadCount=normalized.filter((x:any)=>x.playerId!==player.id&&new Date(x.createdAt).getTime()>lastRead).length;
    return NextResponse.json({ok:true,comments:normalized,unreadCount});
  }catch(e:any){
    return NextResponse.json({ok:false,error:e?.message||'Could not load comments'},{status:401});
  }
}

export async function PATCH(request:Request){
  try{
    const {admin,player}=await auth(request);
    const {error}=await admin.from('team_board_reads').upsert(
      {player_id:player.id,last_read_at:new Date().toISOString()},
      {onConflict:'player_id'}
    );
    if(error)throw error;
    return NextResponse.json({ok:true});
  }catch(e:any){
    return NextResponse.json({ok:false,error:e?.message||'Could not mark read'},{status:500});
  }
}

export async function POST(request:Request){
  try{
    const {admin,player}=await auth(request);
    const body=await request.json().catch(()=>({}));
    const postId=String(body?.postId||'');
    const parentId=body?.parentId?String(body.parentId):null;
    const text=String(body?.body||'').trim().slice(0,1000);
    if(!postId||!text)return NextResponse.json({ok:false,error:'Missing comment'},{status:400});

    const {data:post,error:postErr}=await admin.from('team_posts').select('id,title,event_date').eq('id',postId).maybeSingle();
    if(postErr)throw postErr;
    if(!post)return NextResponse.json({ok:false,error:'Poll not found'},{status:404});

    if(parentId){
      const {data:parent,error:parentErr}=await admin.from('team_post_comments')
        .select('id,post_id,player_id').eq('id',parentId).eq('post_id',postId).maybeSingle();
      if(parentErr)throw parentErr;
      if(!parent)return NextResponse.json({ok:false,error:'Parent comment not found'},{status:404});
    }

    const {data:created,error}=await admin.from('team_post_comments').insert({
      post_id:postId,player_id:player.id,parent_id:parentId,body:text
    }).select('id').single();
    if(error)throw error;

    // Only replies trigger a push notification, and never to yourself.
    if(parentId){
      try{
        const {data:parent}=await admin.from('team_post_comments').select('player_id').eq('id',parentId).maybeSingle();
        if(parent?.player_id&&parent.player_id!==player.id){
          await sendPush({
            externalIds:[parent.player_id],
            titleCs:`↩️ ${player.display_name} odpověděl na tvůj komentář`,
            bodyCs:text.length>150?`${text.slice(0,147)}…`:text,
            titleEn:`↩️ ${player.display_name} replied to your comment`,
            bodyEn:text.length>150?`${text.slice(0,147)}…`:text,
            url:BOARD_URL
          });
        }
      }catch(e){console.warn('reply push failed',e);}
    }

    return NextResponse.json({ok:true,id:created.id});
  }catch(e:any){
    return NextResponse.json({ok:false,error:e?.message||'Could not post comment'},{status:500});
  }
}
