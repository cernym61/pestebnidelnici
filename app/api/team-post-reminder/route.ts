import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendPush } from '@/lib/onesignal';

export const runtime='nodejs';
export const maxDuration=30;
const BOARD_URL='https://www.pestebnidelnici.cz/?tab=board';

async function auth(request:Request){
  const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/,'');
  const admin=getSupabaseAdmin();
  const {data,error}=await admin.auth.getUser(token);
  if(error||!data.user)throw new Error('Invalid session');
  const {data:player}=await admin.from('players').select('id,role,active').eq('user_id',data.user.id).maybeSingle();
  if(!player||player.active!==true)throw new Error('Active player required');
  return {admin,player};
}
async function emailsForPlayers(admin:any,ids:string[]){
  const {data:players,error}=await admin.from('players').select('id,user_id').in('id',ids).not('user_id','is',null);
  if(error)throw error;
  const userIds=new Set((players||[]).map((x:any)=>x.user_id).filter(Boolean));
  const {data:list,error:listErr}=await admin.auth.admin.listUsers({page:1,perPage:1000});
  if(listErr)throw listErr;
  return list.users.filter((u:any)=>userIds.has(u.id)&&u.email).map((u:any)=>String(u.email));
}
export async function POST(request:Request){
  try{
    const {admin,player}=await auth(request);
    const body=await request.json().catch(()=>({}));
    const postId=String(body?.postId||'');
    const channel=body?.channel==='email'?'email':'push';

    const {data:post,error}=await admin.from('team_posts')
      .select('id,author_player_id,title,poll_question,event_date')
      .eq('id',postId).maybeSingle();
    if(error)throw error;
    if(!post)return NextResponse.json({error:'Poll not found'},{status:404});
    if(player.role!=='admin'&&post.author_player_id!==player.id)return NextResponse.json({error:'Only the poll creator or admin can send reminders'},{status:403});

    const [{data:active},{data:votes}]=await Promise.all([
      admin.from('players').select('id').eq('active',true).not('user_id','is',null),
      admin.from('team_post_votes').select('player_id').eq('post_id',postId)
    ]);
    const voted=new Set((votes||[]).map((v:any)=>v.player_id));
    const targetIds=(active||[]).map((p:any)=>p.id).filter((id:string)=>!voted.has(id));
    if(!targetIds.length)return NextResponse.json({ok:true,count:0});

    if(channel==='push'){
      await sendPush({
        externalIds:targetIds,
        titleCs:`⏰ ${post.title}`,
        bodyCs:post.poll_question||'Nezapomeň hlasovat v týmové anketě.',
        titleEn:`⏰ ${post.title}`,
        bodyEn:post.poll_question||'Please vote in the team poll.',
        url:BOARD_URL
      });
      return NextResponse.json({ok:true,count:targetIds.length});
    }

    const apiKey=(process.env.RESEND_API_KEY||'').trim();
    const configured=process.env.REMINDER_FROM_EMAIL||'kabina@pestebnidelnici.cz';
    const address=configured.match(/<([^>]+)>/)?.[1]||configured;
    if(!apiKey)throw new Error('Missing RESEND_API_KEY');
    const emails=await emailsForPlayers(admin,targetIds);
    let sent=0;
    for(const to of emails){
      const html=`<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#153427"><div style="font-size:12px;color:#788278;font-weight:800">PŘIPOMÍNKA ANKETY</div><h1>${post.title}</h1><p>${post.poll_question||'Nezapomeň hlasovat.'}</p>${post.event_date?`<p><b>Datum:</b> ${post.event_date}</p>`:''}<p><a href="${BOARD_URL}" style="display:inline-block;padding:12px 16px;background:#1f5a39;color:white;border-radius:9px;text-decoration:none;font-weight:800">Hlasovat v Kabině</a></p></div>`;
      const rr=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from:`Pěstební dělníci A <${address}>`,to,subject:`⏰ ${post.title}`,html})});
      if(rr.ok)sent++;
    }
    return NextResponse.json({ok:true,count:sent});
  }catch(e:any){
    return NextResponse.json({error:e?.message||'Reminder failed'},{status:500});
  }
}
