import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TEAM } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Candidate = { id:string; display_name:string; user_id:string|null };

function pragueYmd(date:Date){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Prague',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
function plusDaysYmd(days:number){
  const d=new Date(); d.setUTCDate(d.getUTCDate()+days); return pragueYmd(d);
}
function fmtKickoff(iso:string){
  return new Intl.DateTimeFormat('cs-CZ',{timeZone:'Europe/Prague',weekday:'long',day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(iso));
}
function esc(s:string){ return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":"&#039;"}[c] || c)); }

async function sendEmail(to:string, subject:string, html:string){
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.REMINDER_FROM_EMAIL || 'Kabina Pěstební dělníci <kabina@pestebnidelnici.cz>';
  if(!apiKey) throw new Error('Missing RESEND_API_KEY');
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to,subject,html})});
  if(!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

export async function GET(){
  try{
    const admin=getSupabaseAdmin();
    // Daily cron; only acts on matches exactly two Prague calendar days away.
    const target=plusDaysYmd(2);
    const {data:allUpcoming,error:matchError}=await admin.from('matches').select('id,kickoff,venue_code,home_team,away_team').is('home_score',null).order('kickoff');
    const matches=(allUpcoming ?? []).filter((m:any)=>pragueYmd(new Date(m.kickoff))===target);
    if(matchError) throw matchError;
    if(!matches?.length) return NextResponse.json({ok:true,target,matches:0,sent:0,skipped:'No match two days away'});

    let sent=0, skipped=0;
    for(const match of matches){
      const {data:players,error:pErr}=await admin.from('players').select('id,display_name,user_id').eq('active',true).not('user_id','is',null);
      if(pErr) throw pErr;
      const {data:attendance,error:aErr}=await admin.from('attendance').select('player_id').eq('match_id',match.id);
      if(aErr) throw aErr;
      const answered=new Set((attendance??[]).map((x:any)=>x.player_id));
      const candidates=((players ?? []) as Candidate[]).filter(p=>p.user_id && !answered.has(p.id));
      for(const player of candidates){
        const {data:already}=await admin.from('reminder_log').select('id').eq('match_id',match.id).eq('player_id',player.id).eq('kind','attendance-2d').maybeSingle();
        if(already){ skipped++; continue; }
        const {data:userResult,error:uErr}=await admin.auth.admin.getUserById(player.user_id!);
        if(uErr || !userResult.user?.email){ skipped++; continue; }
        const opponent=match.home_team===TEAM?match.away_team:match.home_team;
        const when=fmtKickoff(match.kickoff);
        const subject=`⚽ Potvrď účast: ${opponent}`;
        const html=`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#153427"><h2 style="margin-bottom:8px">Ahoj ${esc(player.display_name)},</h2><p>za dva dny hrajeme proti <strong>${esc(opponent)}</strong>.</p><p><strong>${esc(when)}</strong>${match.venue_code?` · ${esc(match.venue_code)}`:''}</p><p>Ještě nemáš vyplněnou účast. Klikni prosím na tlačítko a dej vědět, jestli dorazíš.</p><p style="margin:26px 0"><a href="https://www.pestebnidelnici.cz" style="background:#1f5a39;color:white;padding:13px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Vyplnit účast</a></p><p style="font-size:12px;color:#758073">Automatická připomínka týmové Kabiny. Pokud už jsi mezitím odpověděl, nemusíš nic řešit.</p></div>`;
        await sendEmail(userResult.user.email,subject,html);
        await admin.from('reminder_log').insert({match_id:match.id,player_id:player.id,kind:'attendance-2d',sent_to:userResult.user.email});
        sent++;
      }
    }
    return NextResponse.json({ok:true,target,matches:matches.length,sent,skipped});
  }catch(error:any){
    console.error(error); return NextResponse.json({ok:false,error:error?.message??'Reminder failed'},{status:500});
  }
}

export async function POST(request:Request){
  try{
    const authHeader=request.headers.get('authorization') || '';
    const token=authHeader.startsWith('Bearer ')?authHeader.slice(7):'';
    if(!token) return NextResponse.json({ok:false,error:'Missing session token'},{status:401});

    const admin=getSupabaseAdmin();
    const {data:authData,error:authError}=await admin.auth.getUser(token);
    if(authError || !authData.user) return NextResponse.json({ok:false,error:'Invalid session'},{status:401});

    const {data:player,error:pErr}=await admin.from('players').select('id,display_name,user_id').eq('user_id',authData.user.id).maybeSingle();
    if(pErr) throw pErr;
    if(!player) return NextResponse.json({ok:false,error:'Account is not linked to a player'},{status:400});

    const {data:matches,error:mErr}=await admin.from('matches').select('id,kickoff,venue_code,home_team,away_team').is('home_score',null).order('kickoff').limit(1);
    if(mErr) throw mErr;
    const match=matches?.[0];
    if(!match) return NextResponse.json({ok:false,error:'No upcoming match'},{status:400});

    const email=authData.user.email;
    if(!email) return NextResponse.json({ok:false,error:'Account has no email'},{status:400});
    const opponent=match.home_team===TEAM?match.away_team:match.home_team;
    const when=fmtKickoff(match.kickoff);
    const subject=`TEST · ⚽ Potvrď účast: ${opponent}`;
    const html=`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#153427"><div style="font-size:12px;font-weight:bold;color:#758073;margin-bottom:12px">TESTOVACÍ E-MAIL · přijde pouze tobě</div><h2 style="margin-bottom:8px">Ahoj ${esc(player.display_name)},</h2><p>tohle je test týmové připomínky před zápasem proti <strong>${esc(opponent)}</strong>.</p><p><strong>${esc(when)}</strong>${match.venue_code?` · ${esc(match.venue_code)}`:''}</p><p>V ostrém provozu dostane podobný e-mail jen hráč, který ještě nevyplnil účast.</p><p style="margin:26px 0"><a href="https://www.pestebnidelnici.cz" style="background:#1f5a39;color:white;padding:13px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Otevřít Kabinu</a></p><p style="font-size:12px;color:#758073">Tento test se nezapisuje do reminder logu a nijak neovlivní automatické připomínky.</p></div>`;
    await sendEmail(email,subject,html);
    return NextResponse.json({ok:true,sentTo:email,player:player.display_name,opponent});
  }catch(error:any){
    console.error(error); return NextResponse.json({ok:false,error:error?.message??'Test reminder failed'},{status:500});
  }
}

