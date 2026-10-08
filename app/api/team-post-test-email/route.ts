import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const runtime='nodejs';
export const maxDuration=30;

function esc(s:string){
  return String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":"&#039;"}[c]||c));
}

export async function POST(request:Request){
  try{
    const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/,'');
    if(!token)return NextResponse.json({error:'Missing session'},{status:401});
    const admin=getSupabaseAdmin();
    const {data,error}=await admin.auth.getUser(token);
    if(error||!data.user)return NextResponse.json({error:'Invalid session'},{status:401});

    const {data:player}=await admin.from('players').select('id,display_name,active').eq('user_id',data.user.id).maybeSingle();
    if(!player||player.active!==true)return NextResponse.json({error:'Active player required'},{status:403});
    if(!data.user.email)return NextResponse.json({error:'Your account has no email'},{status:400});

    const body=await request.json().catch(()=>({}));
    const title=String(body?.title||'Test ankety').trim().slice(0,120);
    const question=String(body?.pollQuestion||'Jdeš?').trim().slice(0,240);
    const options=(Array.isArray(body?.pollOptions)?body.pollOptions:[])
      .map((x:any)=>String(x||'').trim().slice(0,120))
      .filter(Boolean)
      .slice(0,8);
    const eventDate=/^\d{4}-\d{2}-\d{2}$/.test(String(body?.eventDate||''))?String(body.eventDate):null;

    const apiKey=(process.env.RESEND_API_KEY||'').trim();
    const configured=process.env.REMINDER_FROM_EMAIL||'kabina@pestebnidelnici.cz';
    const address=configured.match(/<([^>]+)>/)?.[1]||configured;
    if(!apiKey)throw new Error('Missing RESEND_API_KEY');

    const dateHtml=eventDate?`<div style="display:inline-block;margin:0 0 16px;padding:8px 11px;border-radius:10px;background:#edf4e9;color:#31543e;font-size:13px;font-weight:800">📅 ${esc(eventDate)}</div>`:'';
    const opts=(options.length>=2?options:['Ano','Ne']).map((o:string)=>`<div style="margin-top:8px;padding:12px 14px;border:1px solid #dfe6dc;border-radius:11px;background:#fbfcf9;font-weight:700">${esc(o)}</div>`).join('');
    const html=`<div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:auto;background:#f7f8f3;padding:24px;color:#153427">
      <div style="background:#1f5a39;color:white;border-radius:18px;padding:22px 24px">
        <div style="font-size:11px;letter-spacing:.08em;font-weight:800;color:#c7ddb9">PĚSTEBNÍ DĚLNÍCI A · TEST ANKETY</div>
        <h1 style="margin:10px 0 4px;font-size:28px">${esc(title)}</h1>
      </div>
      <div style="background:white;border:1px solid #dfe3d8;border-radius:18px;padding:22px;margin-top:12px">
        ${dateHtml}
        <div style="font-size:18px;font-weight:800;margin-bottom:12px">${esc(question)}</div>
        ${opts}
        <div style="margin-top:18px;font-size:11px;color:#758073">Toto je pouze testovací náhled e-mailu. Hlasování probíhá v týmové Kabině.</div>
        <div style="margin-top:20px"><a href="https://www.pestebnidelnici.cz/?tab=board" style="display:inline-block;background:#1f5a39;color:white;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:800">Otevřít Nástěnku</a></div>
      </div>
    </div>`;

    const rr=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        from:`Pěstební dělníci A <${address}>`,
        to:data.user.email,
        subject:`TEST · ${title}`,
        html
      })
    });
    if(!rr.ok)throw new Error(`Resend ${rr.status}: ${await rr.text()}`);
    return NextResponse.json({ok:true,to:data.user.email});
  }catch(e:any){
    return NextResponse.json({error:e?.message||'Test email failed'},{status:500});
  }
}
