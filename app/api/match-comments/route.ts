import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendPush } from '@/lib/onesignal';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const MATCHES_URL='https://www.pestebnidelnici.cz/?tab=matches';

async function auth(request:Request){
  const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/,'');
  if(!token)throw new Error('Missing session');
  const admin=getSupabaseAdmin();
  const {data,error}=await admin.auth.getUser(token);
  if(error||!data.user)throw new Error('Invalid session');
  const {data:player,error:pErr}=await admin.from('players')
    .select('id,display_name,active').eq('user_id',data.user.id).maybeSingle();
  if(pErr)throw pErr;
  if(!player||player.active!==true)throw new Error('Active player required');
  return {admin,player};
}

function hasEveryoneMention(text:string){
  return /(^|\s)@(všichni|vsichni|everyone)(?=$|\s|[,.!?;:])/i.test(text);
}

async function resolveMentions(admin:any,text:string,authorId:string){
  const {data,error}=await admin.from('players')
    .select('id,display_name').eq('active',true).not('user_id','is',null);
  if(error)throw error;
  const players=data||[];
  if(hasEveryoneMention(text))return players.map((p:any)=>p.id).filter((id:string)=>id!==authorId);
  const lower=text.toLocaleLowerCase('cs-CZ');
  return players
    .filter((p:any)=>lower.includes(`@${String(p.display_name).toLocaleLowerCase('cs-CZ')}`))
    .map((p:any)=>p.id)
    .filter((id:string)=>id!==authorId);
}

export async function POST(request:Request){
  try{
    const {admin,player}=await auth(request);
    const body=await request.json().catch(()=>({}));
    const matchId=String(body?.matchId||'');
    const parentId=body?.parentId?String(body.parentId):null;
    const text=String(body?.body||'').trim().slice(0,1000);
    if(!matchId||!text)return NextResponse.json({ok:false,error:'Missing comment'},{status:400});

    const {data:match,error:matchErr}=await admin.from('matches')
      .select('id,home_team,away_team').eq('id',matchId).maybeSingle();
    if(matchErr)throw matchErr;
    if(!match)return NextResponse.json({ok:false,error:'Match not found'},{status:404});

    let parentPlayerId:string|null=null;
    if(parentId){
      const {data:parent,error:parentErr}=await admin.from('match_comments')
        .select('id,match_id,player_id').eq('id',parentId).eq('match_id',matchId).maybeSingle();
      if(parentErr)throw parentErr;
      if(!parent)return NextResponse.json({ok:false,error:'Parent comment not found'},{status:404});
      parentPlayerId=parent.player_id;
    }

    const {data:created,error}=await admin.from('match_comments').insert({
      match_id:matchId,player_id:player.id,parent_id:parentId,body:text
    }).select('id').single();
    if(error)throw error;

    try{
      const mentioned=await resolveMentions(admin,text,player.id);
      const recipients=new Set<string>(mentioned);
      if(parentPlayerId&&parentPlayerId!==player.id)recipients.add(parentPlayerId);
      if(recipients.size){
        const all=hasEveryoneMention(text);
        const titleCs=all?`📣 ${player.display_name} označil celý tým`:mentioned.length?`@ ${player.display_name} tě označil v komentáři`:`↩️ ${player.display_name} odpověděl na tvůj komentář`;
        const titleEn=all?`📣 ${player.display_name} mentioned the whole team`:mentioned.length?`@ ${player.display_name} mentioned you in a comment`:`↩️ ${player.display_name} replied to your comment`;
        const excerpt=text.length>150?`${text.slice(0,147)}…`:text;
        await sendPush({externalIds:[...recipients],titleCs,bodyCs:excerpt,titleEn,bodyEn:excerpt,url:MATCHES_URL});
      }
    }catch(e){console.warn('match comment notification failed',e);}

    return NextResponse.json({ok:true,id:created.id});
  }catch(e:any){
    return NextResponse.json({ok:false,error:e?.message||'Could not post comment'},{status:500});
  }
}
