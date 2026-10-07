import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendPush } from '@/lib/onesignal';
import { TEAM } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Candidate = { id:string; display_name:string; user_id:string|null };
type MatchRow = {
  id:string; kickoff:string; venue_code:string|null; home_team:string; away_team:string;
  home_score:number|null; away_score:number|null; season:string;
};
type StandingRow = { rank:number; team:string; played:number; wins:number; draws:number; losses:number; score:string; points:number };
type HistoricMatch = { season:string; kickoff:string; home_team:string; away_team:string; home_score:number; away_score:number };

type MailContext = {
  opponent:string;
  whenCz:string;
  whenEn:string;
  venueCode:string;
  venueName:string | null;
  venueAddress:string | null;
  mapsUrl:string | null;
  wazeUrl:string | null;
  ourStanding:StandingRow | null;
  oppStanding:StandingRow | null;
  h2h:{games:number;wins:number;draws:number;losses:number;gf:number;ga:number;recent:Array<HistoricMatch & {gf:number;ga:number;result:'W'|'D'|'L'}>};
};

function pragueYmd(date:Date){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Prague',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
function plusDaysYmd(days:number){
  const d=new Date(); d.setUTCDate(d.getUTCDate()+days); return pragueYmd(d);
}
function fmtKickoff(iso:string, locale:'cs-CZ'|'en-GB'){
  return new Intl.DateTimeFormat(locale,{timeZone:'Europe/Prague',weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}).format(new Date(iso));
}
function fmtShortDate(iso:string, locale:'cs-CZ'|'en-GB'){
  return new Intl.DateTimeFormat(locale,{timeZone:'Europe/Prague',day:'numeric',month:'numeric',year:'numeric'}).format(new Date(iso));
}
function esc(s:string){ return String(s ?? '').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":"&#039;"}[c] || c)); }
function isOurTeam(name:string){ return name === TEAM || name.startsWith('Pěstební dělníci'); }
function pointsCz(n:number){ return n===1?'1 bod':(n>=2&&n<=4?`${n} body`:`${n} bodů`); }
function ordinalEn(n:number){ const mod100=n%100; if(mod100>=11&&mod100<=13) return `${n}th`; switch(n%10){case 1:return `${n}st`;case 2:return `${n}nd`;case 3:return `${n}rd`;default:return `${n}th`;} }
function standingCz(s:StandingRow|null){
  if(!s) return 'údaj zatím není k dispozici';
  return `<strong>${s.rank}. místo</strong> · ${pointsCz(s.points)} · ${s.wins}-${s.draws}-${s.losses} · skóre ${esc(s.score)}`;
}
function standingEn(s:StandingRow|null){
  if(!s) return 'not available yet';
  return `<strong>${ordinalEn(s.rank)} place</strong> · ${s.points} ${s.points===1?'point':'points'} · ${s.wins}-${s.draws}-${s.losses} · goals ${esc(s.score)}`;
}
function h2hCz(h:MailContext['h2h']){
  if(!h.games) return 'Podle historie PSMF jsme se zatím v evidovaných zápasech nepotkali.';
  return `${h.games} ${h.games===1?'zápas':(h.games>=2&&h.games<=4?'zápasy':'zápasů')} · <strong>${h.wins} V / ${h.draws} R / ${h.losses} P</strong> · skóre ${h.gf}:${h.ga}`;
}
function h2hEn(h:MailContext['h2h']){
  if(!h.games) return 'No previous meeting is currently recorded in the PSMF history.';
  return `${h.games} ${h.games===1?'match':'matches'} · <strong>${h.wins} W / ${h.draws} D / ${h.losses} L</strong> · goals ${h.gf}:${h.ga}`;
}
function resultLabel(r:'W'|'D'|'L', lang:'cz'|'en'){ return lang==='cz' ? (r==='W'?'výhra':r==='D'?'remíza':'prohra') : (r==='W'?'win':r==='D'?'draw':'loss'); }

async function sendEmail(to:string, subject:string, html:string){
  const apiKey = process.env.RESEND_API_KEY;
  const configured = process.env.REMINDER_FROM_EMAIL || 'kabina@pestebnidelnici.cz';
  const address = configured.match(/<([^>]+)>/)?.[1] || configured;
  const from = `Pěstební dělníci A <${address}>`;
  if(!apiKey) throw new Error('Missing RESEND_API_KEY');
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to,subject,html})});
  if(!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

async function buildContext(admin:any, match:MatchRow):Promise<MailContext>{
  const opponent=match.home_team===TEAM?match.away_team:match.home_team;
  const [{data:standingRows},{data:venue},{data:historyRows}] = await Promise.all([
    admin.from('standings').select('rank,team,played,wins,draws,losses,score,points').eq('season',match.season),
    match.venue_code ? admin.from('venues').select('name,address').eq('code',match.venue_code).maybeSingle() : Promise.resolve({data:null}),
    admin.from('historical_matches').select('season,kickoff,home_team,away_team,home_score,away_score').order('kickoff',{ascending:false})
  ]);

  const standings=(standingRows ?? []) as StandingRow[];
  const ourStanding=standings.find(s=>isOurTeam(s.team)) ?? null;
  const oppStanding=standings.find(s=>s.team===opponent) ?? null;

  const relevant=((historyRows ?? []) as HistoricMatch[]).filter(h=>{
    const hasUs=isOurTeam(h.home_team)||isOurTeam(h.away_team);
    const hasOpp=h.home_team===opponent||h.away_team===opponent;
    return hasUs && hasOpp;
  });

  let wins=0,draws=0,losses=0,gf=0,ga=0;
  const recent=relevant.map(h=>{
    const ourHome=isOurTeam(h.home_team);
    const gameGf=ourHome?h.home_score:h.away_score;
    const gameGa=ourHome?h.away_score:h.home_score;
    const result: 'W'|'D'|'L' = gameGf>gameGa?'W':gameGf<gameGa?'L':'D';
    if(result==='W')wins++; else if(result==='D')draws++; else losses++;
    gf+=gameGf; ga+=gameGa;
    return {...h,gf:gameGf,ga:gameGa,result};
  }).slice(0,3);

  const address=venue?.address ?? null;
  return {
    opponent,
    whenCz:fmtKickoff(match.kickoff,'cs-CZ'),
    whenEn:fmtKickoff(match.kickoff,'en-GB'),
    venueCode:match.venue_code ?? '',
    venueName:venue?.name ?? null,
    venueAddress:address,
    mapsUrl:address?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`:null,
    wazeUrl:address?`https://www.waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`:null,
    ourStanding,oppStanding,
    h2h:{games:relevant.length,wins,draws,losses,gf,ga,recent}
  };
}

function recentHtml(ctx:MailContext, lang:'cz'|'en'){
  if(!ctx.h2h.recent.length) return '';
  const title=lang==='cz'?'Poslední vzájemné zápasy':'Recent head-to-head meetings';
  const rows=ctx.h2h.recent.map(m=>{
    const date=fmtShortDate(m.kickoff,lang==='cz'?'cs-CZ':'en-GB');
    const label=resultLabel(m.result,lang);
    return `<div style="padding:6px 0;border-bottom:1px solid #e8ece7"><strong>${m.gf}:${m.ga}</strong> · ${esc(date)} · ${esc(label)} <span style="color:#788178">(${esc(m.season)})</span></div>`;
  }).join('');
  return `<div style="margin-top:12px"><div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#7b8579;font-weight:700">${title}</div>${rows}</div>`;
}

function venueHtml(ctx:MailContext, lang:'cz'|'en'){
  const where=[ctx.venueCode,ctx.venueName,ctx.venueAddress].flatMap((value) => value ? [esc(value)] : []).join(' · ');
  if(!where) return '';
  const nav: string[] = [];
  if(ctx.mapsUrl) nav.push(`<a href="${ctx.mapsUrl}" style="color:#1f5a39;font-weight:700;text-decoration:none">Google Maps</a>`);
  if(ctx.wazeUrl) nav.push(`<a href="${ctx.wazeUrl}" style="color:#1f5a39;font-weight:700;text-decoration:none">Waze</a>`);
  return `<p style="margin:8px 0"><strong>${lang==='cz'?'Hřiště':'Venue'}:</strong> ${where}${nav.length?` · ${nav.join(' · ')}`:''}</p>`;
}

function buildEmailHtml(playerName:string, ctx:MailContext, test=false){
  const banner=test?`<div style="font-size:12px;font-weight:bold;color:#8a6413;background:#fff4d6;padding:9px 11px;border-radius:8px;margin-bottom:16px">TESTOVACÍ E-MAIL · přijde pouze tobě / TEST EMAIL · sent only to you</div>`:'';
  const website='https://www.pestebnidelnici.cz';
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:auto;color:#153427;line-height:1.5">
    ${banner}
    <h2 style="margin-bottom:8px">Ahoj ${esc(playerName)},</h2>
    <p>${test?'tohle je náhled ostré týmové připomínky.':'za dva dny hrajeme'} proti <strong>${esc(ctx.opponent)}</strong>.</p>
    <div style="background:#f5f7f2;border:1px solid #e2e7df;border-radius:12px;padding:16px;margin:16px 0">
      <p style="margin:0 0 8px"><strong>${esc(ctx.whenCz)}</strong></p>
      ${venueHtml(ctx,'cz')}
    </div>
    <div style="display:block;border:1px solid #e2e7df;border-radius:12px;padding:16px;margin:16px 0">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#7b8579;font-weight:700;margin-bottom:8px">Aktuální tabulka</div>
      <p style="margin:6px 0"><strong>Pěstební dělníci A:</strong> ${standingCz(ctx.ourStanding)}</p>
      <p style="margin:6px 0"><strong>${esc(ctx.opponent)}:</strong> ${standingCz(ctx.oppStanding)}</p>
    </div>
    <div style="border:1px solid #e2e7df;border-radius:12px;padding:16px;margin:16px 0">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#7b8579;font-weight:700;margin-bottom:8px">Vzájemná bilance od roku 2020</div>
      <p style="margin:6px 0">${h2hCz(ctx.h2h)}</p>
      ${recentHtml(ctx,'cz')}
    </div>
    <p><strong>Ještě nemáš vyplněnou účast.</strong> Dej prosím vědět, jestli dorazíš.</p>
    <p style="margin:26px 0"><a href="${website}" style="background:#1f5a39;color:white;padding:13px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Vyplnit účast</a></p>

    <div style="border-top:2px solid #e2e7df;margin:34px 0 26px"></div>
    <div style="font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:#7b8579;font-weight:700;margin-bottom:10px">English version</div>
    <h2 style="margin-bottom:8px">Hi ${esc(playerName)},</h2>
    <p>${test?'this is a preview of the live team reminder.':'we play'} <strong>${esc(ctx.opponent)}</strong> in two days.</p>
    <div style="background:#f5f7f2;border:1px solid #e2e7df;border-radius:12px;padding:16px;margin:16px 0">
      <p style="margin:0 0 8px"><strong>${esc(ctx.whenEn)}</strong></p>
      ${venueHtml(ctx,'en')}
    </div>
    <div style="border:1px solid #e2e7df;border-radius:12px;padding:16px;margin:16px 0">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#7b8579;font-weight:700;margin-bottom:8px">Current standings</div>
      <p style="margin:6px 0"><strong>Pěstební dělníci A:</strong> ${standingEn(ctx.ourStanding)}</p>
      <p style="margin:6px 0"><strong>${esc(ctx.opponent)}:</strong> ${standingEn(ctx.oppStanding)}</p>
    </div>
    <div style="border:1px solid #e2e7df;border-radius:12px;padding:16px;margin:16px 0">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#7b8579;font-weight:700;margin-bottom:8px">Head-to-head record since 2020</div>
      <p style="margin:6px 0">${h2hEn(ctx.h2h)}</p>
      ${recentHtml(ctx,'en')}
    </div>
    <p><strong>You have not answered the availability poll yet.</strong> Please let the team know if you can make it.</p>
    <p style="margin:26px 0"><a href="${website}" style="background:#1f5a39;color:white;padding:13px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Confirm availability</a></p>
    <p style="font-size:12px;color:#758073">Automatická připomínka / Automatic reminder · Pěstební dělníci A</p>
  </div>`;
}

export async function GET(){
  try{
    const admin=getSupabaseAdmin();
    const target=plusDaysYmd(2);
    const {data:allUpcoming,error:matchError}=await admin.from('matches').select('id,kickoff,venue_code,home_team,away_team,home_score,away_score,season').is('home_score',null).order('kickoff');
    const matches=((allUpcoming ?? []) as MatchRow[]).filter(m=>pragueYmd(new Date(m.kickoff))===target);
    if(matchError) throw matchError;
    if(!matches.length) return NextResponse.json({ok:true,target,matches:0,sent:0,skipped:'No match two days away'});

    let sent=0, skipped=0;
    for(const match of matches){
      const ctx=await buildContext(admin,match);
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
        const subject=`⚽ Pěstební dělníci A · Potvrď účast proti ${ctx.opponent}`;
        await sendEmail(userResult.user.email,subject,buildEmailHtml(player.display_name,ctx,false));
        try{
          await sendPush({
            externalIds:[player.id],
            titleCs:'⚽ Pěstební dělníci A',
            bodyCs:`Za dva dny hrajeme proti ${ctx.opponent}. Ještě jsi nepotvrdil účast.`,
            titleEn:'⚽ Pěstební dělníci A',
            bodyEn:`We play ${ctx.opponent} in two days. You have not confirmed availability yet.`,
            url:'https://www.pestebnidelnici.cz'
          });
        }catch(pushError){ console.error('OneSignal push reminder failed',pushError); }
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

    const {data:matches,error:mErr}=await admin.from('matches').select('id,kickoff,venue_code,home_team,away_team,home_score,away_score,season').is('home_score',null).order('kickoff').limit(1);
    if(mErr) throw mErr;
    const match=(matches?.[0] ?? null) as MatchRow|null;
    if(!match) return NextResponse.json({ok:false,error:'No upcoming match'},{status:400});

    const email=authData.user.email;
    if(!email) return NextResponse.json({ok:false,error:'Account has no email'},{status:400});
    const ctx=await buildContext(admin,match);
    const subject=`⚽ Pěstební dělníci A · Potvrď účast proti ${ctx.opponent}`;
    await sendEmail(email,subject,buildEmailHtml(player.display_name,ctx,true));
    return NextResponse.json({ok:true,sentTo:email,player:player.display_name,opponent:ctx.opponent});
  }catch(error:any){
    console.error(error); return NextResponse.json({ok:false,error:error?.message??'Test reminder failed'},{status:500});
  }
}
