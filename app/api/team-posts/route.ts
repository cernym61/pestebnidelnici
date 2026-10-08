import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendPush } from '@/lib/onesignal';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;

const SITE_URL='https://www.pestebnidelnici.cz';
const BOARD_URL=`${SITE_URL}/?tab=board`;

function esc(s:string){
  return String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":"&#039;"}[c]||c));
}
function todayPrague(){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Prague',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}
async function getAuthPlayer(request:Request){
  const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/,'');
  if(!token) throw new Error('Missing session token');
  const admin=getSupabaseAdmin();
  const {data,error}=await admin.auth.getUser(token);
  if(error||!data.user) throw new Error('Invalid session');
  const {data:player,error:pErr}=await admin.from('players')
    .select('id,display_name,role,active,avatar_url,user_id')
    .eq('user_id',data.user.id).maybeSingle();
  if(pErr)throw pErr;
  if(!player||player.active!==true)throw new Error('Active player profile required');
  return {admin,user:data.user,player};
}

async function playerEmails(admin:any,playerIds?:string[]){
  let q=admin.from('players').select('id,user_id').eq('active',true).not('user_id','is',null);
  if(playerIds?.length)q=q.in('id',playerIds);
  const {data:players,error}=await q;
  if(error)throw error;
  const ids=new Set((players||[]).map((p:any)=>p.user_id).filter(Boolean));
  if(!ids.size)return [];
  const {data:list,error:listErr}=await admin.auth.admin.listUsers({page:1,perPage:1000});
  if(listErr)throw listErr;
  return list.users.filter((u:any)=>ids.has(u.id)&&u.email).map((u:any)=>String(u.email));
}

async function sendTeamPostEmail(admin:any,title:string,body:string,pollQuestion:string|null,pollOptions:string[],eventDate:string|null,playerIds?:string[]){
  const apiKey=(process.env.RESEND_API_KEY||'').trim();
  const configured=process.env.REMINDER_FROM_EMAIL||'kabina@pestebnidelnici.cz';
  const address=configured.match(/<([^>]+)>/)?.[1]||configured;
  const from=`Pěstební dělníci A <${address}>`;
  if(!apiKey)throw new Error('Missing RESEND_API_KEY');

  const emails=await playerEmails(admin,playerIds);
  if(!emails.length)return 0;

  const dateHtml=eventDate?`<div style="margin:0 0 14px;font-size:14px;color:#6d786f"><b>Datum:</b> ${esc(eventDate)}</div>`:'';
  const pollHtml=pollQuestion&&pollOptions.length>=2
    ? `<div style="margin:22px 0;padding:16px;border-radius:12px;background:#f3f6ef;border:1px solid #e0e6dc">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#778273;font-weight:800;margin-bottom:8px">Anketa</div>
        <strong style="font-size:17px">${esc(pollQuestion)}</strong>
        <div style="margin-top:10px">${pollOptions.map(o=>`<div style="padding:7px 0;border-bottom:1px solid #e4e8e0">• ${esc(o)}</div>`).join('')}</div>
      </div>`:'';

  const html=`<div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:auto;color:#153427;line-height:1.55">
    <div style="font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:#7b8579;font-weight:800">Pěstební dělníci A · týmová nástěnka</div>
    <h1 style="font-size:28px;line-height:1.15;margin:12px 0 12px">${esc(title)}</h1>
    ${dateHtml}
    ${body&&body!==title?`<div style="font-size:16px;white-space:pre-wrap">${esc(body).replace(/\n/g,'<br>')}</div>`:''}
    ${pollHtml}
    <p style="margin:28px 0"><a href="${BOARD_URL}" style="display:inline-block;background:#1f5a39;color:#fff;padding:12px 17px;border-radius:10px;text-decoration:none;font-weight:800">Otevřít týmovou kabinu</a></p>
  </div>`;

  let sent=0;
  for(const to of emails){
    const r=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({from,to,subject:`⚽ ${title}`,html})
    });
    if(!r.ok)throw new Error(`Resend ${r.status}: ${await r.text()}`);
    sent++;
  }
  return sent;
}

async function serializePosts(admin:any,currentPlayer:any){
  const [{data:posts,error:pe},{data:options,error:oe},{data:votes,error:ve},{data:players,error:ple}]=await Promise.all([
    admin.from('team_posts').select('id,author_player_id,title,body,poll_question,email_sent,push_sent,event_date,background_url,created_at,updated_at').order('created_at',{ascending:false}).limit(150),
    admin.from('team_post_poll_options').select('id,post_id,label,sort_order').order('sort_order'),
    admin.from('team_post_votes').select('post_id,option_id,player_id,created_at'),
    admin.from('players').select('id,display_name,avatar_url,role,user_id,active')
  ]);
  if(pe)throw pe;if(oe)throw oe;if(ve)throw ve;if(ple)throw ple;

  const today=todayPrague();
  const playerMap=new Map((players||[]).map((p:any)=>[p.id,p]));
  const optionsByPost=new Map<string,any[]>();
  for(const option of options||[]){
    const arr=optionsByPost.get(option.post_id)||[];
    arr.push(option);optionsByPost.set(option.post_id,arr);
  }
  const votesByOption=new Map<string,any[]>();
  for(const vote of votes||[]){
    const arr=votesByOption.get(vote.option_id)||[];
    arr.push(vote);votesByOption.set(vote.option_id,arr);
  }

  const serialized=(posts||[]).map((post:any)=>{
    const author=playerMap.get(post.author_player_id) as any;
    const archived=Boolean(post.event_date&&String(post.event_date)<today);
    const postOptions=(optionsByPost.get(post.id)||[]).map((option:any)=>({
      id:option.id,
      label:option.label,
      sortOrder:option.sort_order,
      votes:(votesByOption.get(option.id)||[]).map((v:any)=>{
        const p=playerMap.get(v.player_id) as any;
        return {playerId:v.player_id,playerName:p?.display_name||'Hráč',avatarUrl:p?.avatar_url||null};
      })
    }));
    const postVotes=(votes||[]).filter((v:any)=>v.post_id===post.id);
    const votedIds=new Set(postVotes.map((v:any)=>v.player_id));
    const unvoted=(players||[])
      .filter((p:any)=>p.active===true&&p.user_id&&!votedIds.has(p.id))
      .map((p:any)=>({playerId:p.id,playerName:p.display_name||'Hráč',avatarUrl:p.avatar_url||null}))
      .sort((a:any,b:any)=>a.playerName.localeCompare(b.playerName,'cs'));
    const myVote=postVotes.find((v:any)=>v.player_id===currentPlayer.id);
    return {
      id:post.id,title:post.title,body:post.body,createdAt:post.created_at,updatedAt:post.updated_at,
      author:{id:post.author_player_id,name:author?.display_name||'Tým',avatarUrl:author?.avatar_url||null,role:author?.role||'player'},
      pollQuestion:post.poll_question,
      options:postOptions,
      unvoted,
      myOptionId:myVote?.option_id||null,
      emailSent:Boolean(post.email_sent),pushSent:Boolean(post.push_sent),
      eventDate:post.event_date||null,
      backgroundUrl:post.background_url||null,
      archived,
      canManage:currentPlayer.role==='admin'||currentPlayer.id===post.author_player_id
    };
  });

  // Expired polls are private history for admin only.
  return serialized.filter((p:any)=>!p.archived||currentPlayer.role==='admin');
}

export async function GET(request:Request){
  try{
    const {admin,player}=await getAuthPlayer(request);
    const posts=await serializePosts(admin,player);
    return NextResponse.json({ok:true,posts});
  }catch(error:any){
    return NextResponse.json({ok:false,error:error?.message||'Could not load posts'},{status:401});
  }
}

export async function POST(request:Request){
  try{
    const {admin,player}=await getAuthPlayer(request);
    const body=await request.json().catch(()=>({}));
    const title=String(body?.title||'').trim().slice(0,120);
    const text=String(body?.body||'').trim().slice(0,4000)||title;
    const pollQuestion=body?.pollQuestion?String(body.pollQuestion).trim().slice(0,240):null;
    const pollOptions:string[]=Array.isArray(body?.pollOptions)
      ? ([...new Set(body.pollOptions.map((x:any)=>String(x||'').trim().slice(0,120)).filter(Boolean))].slice(0,8) as string[])
      : [];
    const eventDate=/^\d{4}-\d{2}-\d{2}$/.test(String(body?.eventDate||''))?String(body.eventDate):null;
    const backgroundUrl=body?.backgroundUrl?String(body.backgroundUrl).slice(0,1000):null;
    const privileged=['admin','captain'].includes(player.role);
    const sendEmail=privileged&&body?.sendEmail===true;
    const sendPushFlag=privileged&&body?.sendPush===true;

    if(!title)return NextResponse.json({ok:false,error:'Title is required'},{status:400});
    if(pollQuestion&&pollOptions.length<2)return NextResponse.json({ok:false,error:'Poll requires at least two options'},{status:400});
    if(!pollQuestion&&pollOptions.length)return NextResponse.json({ok:false,error:'Poll question is required'},{status:400});

    const {data:post,error:postErr}=await admin.from('team_posts').insert({
      author_player_id:player.id,title,body:text,poll_question:pollQuestion,
      event_date:eventDate,background_url:backgroundUrl,email_sent:false,push_sent:false
    }).select('id').single();
    if(postErr)throw postErr;

    if(pollQuestion&&pollOptions.length){
      const {error}=await admin.from('team_post_poll_options').insert(
        pollOptions.map((label:string,index:number)=>({post_id:post.id,label,sort_order:index}))
      );
      if(error)throw error;
    }

    const warnings:string[]=[];
    let emailSent=false,pushSent=false;
    if(sendEmail){
      try{
        await sendTeamPostEmail(admin,title,text,pollQuestion,pollOptions,eventDate);
        emailSent=true;
      }catch(e:any){console.error('team post email',e);warnings.push(`E-mail: ${e?.message||'odeslání selhalo'}`);}
    }
    if(sendPushFlag){
      try{
        const {data:targets,error}=await admin.from('players').select('id').eq('active',true).not('user_id','is',null);
        if(error)throw error;
        const ids=(targets||[]).map((x:any)=>x.id);
        await sendPush({
          externalIds:ids,
          titleCs:`⚽ ${title}`,
          bodyCs:pollQuestion||text,
          titleEn:`⚽ ${title}`,
          bodyEn:pollQuestion||text,
          url:BOARD_URL
        });
        pushSent=true;
      }catch(e:any){console.error('team post push',e);warnings.push(`Push: ${e?.message||'odeslání selhalo'}`);}
    }

    await admin.from('team_posts').update({email_sent:emailSent,push_sent:pushSent}).eq('id',post.id);
    return NextResponse.json({ok:true,id:post.id,emailSent,pushSent,warnings});
  }catch(error:any){
    return NextResponse.json({ok:false,error:error?.message||'Could not publish post'},{status:500});
  }
}

export async function DELETE(request:Request){
  try{
    const {admin,player}=await getAuthPlayer(request);
    const id=new URL(request.url).searchParams.get('id')||'';
    if(!id)return NextResponse.json({ok:false,error:'Missing post id'},{status:400});

    const {data:post,error:findErr}=await admin.from('team_posts').select('id,author_player_id').eq('id',id).maybeSingle();
    if(findErr)throw findErr;
    if(!post)return NextResponse.json({ok:false,error:'Post not found'},{status:404});
    if(player.role!=='admin'&&post.author_player_id!==player.id)
      return NextResponse.json({ok:false,error:'You can delete only your own posts'},{status:403});

    const {error}=await admin.from('team_posts').delete().eq('id',id);
    if(error)throw error;
    return NextResponse.json({ok:true});
  }catch(error:any){
    return NextResponse.json({ok:false,error:error?.message||'Could not delete post'},{status:500});
  }
}
