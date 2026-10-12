import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendPush } from '@/lib/onesignal';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const BOARD_URL='https://www.pestebnidelnici.cz/?tab=board';

function hasEveryoneMention(text:string){
  return /(^|\s)@(všichni|vsichni|everyone)(?=$|\s|[,.!?;:])/i.test(text);
}

async function resolveMentions(admin:any,text:string,authorId:string){
  const {data,error}=await admin.from('players').select('id,display_name').eq('active',true).not('user_id','is',null);
  if(error)throw error;
  const players=data||[];
  if(hasEveryoneMention(text))return players.map((p:any)=>p.id).filter((id:string)=>id!==authorId);
  const lower=text.toLocaleLowerCase('cs-CZ');
  return players.filter((p:any)=>lower.includes(`@${String(p.display_name).toLocaleLowerCase('cs-CZ')}`)).map((p:any)=>p.id).filter((id:string)=>id!==authorId);
}

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

    let parentPlayerId:string|null=null;
    if(parentId){
      const {data:parent,error:parentErr}=await admin.from('team_post_comments')
        .select('id,post_id,player_id').eq('id',parentId).eq('post_id',postId).maybeSingle();
      if(parentErr)throw parentErr;
      if(!parent)return NextResponse.json({ok:false,error:'Parent comment not found'},{status:404});
      parentPlayerId=parent.player_id;
    }

    const {data:created,error}=await admin.from('team_post_comments').insert({
      post_id:postId,player_id:player.id,parent_id:parentId,body:text
    }).select('id').single();
    if(error)throw error;

    // Mentions and replies share one deduplicated push. @všichni/@everyone targets the whole active team.
    try{
      const mentioned=await resolveMentions(admin,text,player.id);
      const recipients=new Set<string>(mentioned);
      if(parentPlayerId&&parentPlayerId!==player.id)recipients.add(parentPlayerId);
      if(recipients.size){
        const all=hasEveryoneMention(text);
        const titleCs=all?`📣 ${player.display_name} označil celý tým`:mentioned.length?`@ ${player.display_name} tě označil v komentáři`:`↩️ ${player.display_name} odpověděl na tvůj komentář`;
        const titleEn=all?`📣 ${player.display_name} mentioned the whole team`:mentioned.length?`@ ${player.display_name} mentioned you in a comment`:`↩️ ${player.display_name} replied to your comment`;
        const excerpt=text.length>150?`${text.slice(0,147)}…`:text;
        await sendPush({externalIds:[...recipients],titleCs,bodyCs:excerpt,titleEn,bodyEn:excerpt,url:BOARD_URL});
      }
    }catch(e){console.warn('comment notification failed',e);}

    return NextResponse.json({ok:true,id:created.id});
  }catch(e:any){
    return NextResponse.json({ok:false,error:e?.message||'Could not post comment'},{status:500});
  }
}
