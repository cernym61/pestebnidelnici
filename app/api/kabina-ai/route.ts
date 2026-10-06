import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const runtime='nodejs';

const TEAM='Pěstební dělníci A';
const USER_DAILY_LIMIT=5;
const GLOBAL_DAILY_LIMIT=40;

function todayUtc(){
  return new Date().toISOString().slice(0,10);
}
function dayStartIso(){
  return `${todayUtc()}T00:00:00.000Z`;
}
function compact<T>(rows:T[]|null|undefined,limit=250){
  return (rows||[]).slice(0,limit);
}

export async function POST(req:NextRequest){
  try{
    const apiKey=(process.env.OPENROUTER_API_KEY||'').trim();
    if(!apiKey)return NextResponse.json({error:'OPENROUTER_API_KEY is not configured'},{status:503});

    const auth=req.headers.get('authorization')||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return NextResponse.json({error:'Unauthorized'},{status:401});

    const admin=getSupabaseAdmin();
    const {data:userData,error:userError}=await admin.auth.getUser(token);
    if(userError||!userData.user)return NextResponse.json({error:'Unauthorized'},{status:401});

    const {data:profile}=await admin.from('players').select('id,display_name,active').eq('user_id',userData.user.id).maybeSingle();
    if(!profile||profile.active!==true)return NextResponse.json({error:'Player profile required'},{status:403});

    const body=await req.json().catch(()=>({}));
    const question=String(body?.question||'').trim().slice(0,600);
    const lang=body?.lang==='en'?'en':'cs';
    if(question.length<2)return NextResponse.json({error:'Question is empty'},{status:400});

    // Free-tier guardrail. OpenRouter Free currently allows 50 requests/day.
    const since=dayStartIso();
    const [userUsage,globalUsage]=await Promise.all([
      admin.from('ai_requests').select('*',{count:'exact',head:true}).eq('user_id',userData.user.id).gte('created_at',since),
      admin.from('ai_requests').select('*',{count:'exact',head:true}).gte('created_at',since)
    ]);
    if(userUsage.error||globalUsage.error){
      return NextResponse.json({
        error:`Supabase ai_requests error: ${userUsage.error?.message||globalUsage.error?.message||'unknown error'}. Run supabase/update-v3.0.sql.`
      },{status:500});
    }
    const userCount=userUsage.count||0;
    const globalCount=globalUsage.count||0;
    if((userCount||0)>=USER_DAILY_LIMIT){
      return NextResponse.json({error:'Daily player AI limit reached'},{status:429});
    }
    if((globalCount||0)>=GLOBAL_DAILY_LIMIT){
      return NextResponse.json({error:'Daily team AI limit reached'},{status:429});
    }

    // Sports-only context: no emails, auth IDs, comments or other private account data.
    const [seasons,matches,historyMatches,standings,historyStandings,playerStats,players]=await Promise.all([
      admin.from('seasons').select('season,label,year,phase,division,final_rank,played,wins,draws,losses,score,points').order('year',{ascending:false}),
      admin.from('matches').select('season,kickoff,venue_code,home_team,away_team,home_score,away_score').order('kickoff',{ascending:false}),
      admin.from('historical_matches').select('season,kickoff,venue_code,home_team,away_team,home_score,away_score,round').order('kickoff',{ascending:false}).limit(250),
      admin.from('standings').select('season,rank,team,played,wins,draws,losses,score,points').order('rank'),
      admin.from('historical_standings').select('season,rank,team,played,wins,draws,losses,score,points').limit(300),
      admin.from('player_season_stats').select('season,player_name,games,goals').limit(500),
      admin.from('players').select('display_name,psmf_games,psmf_goals,active').eq('active',true).order('display_name')
    ]);

    const contextErrors=[
      ['seasons',seasons.error],['matches',matches.error],['historical_matches',historyMatches.error],
      ['standings',standings.error],['historical_standings',historyStandings.error],
      ['player_season_stats',playerStats.error],['players',players.error]
    ].filter(([,e])=>Boolean(e));
    if(contextErrors.length){
      return NextResponse.json({
        error:'Supabase sports data error: '+contextErrors.map(([name,e]:any)=>`${name}: ${e.message}`).join(' | ')
      },{status:500});
    }

    const sportsContext={
      team:TEAM,
      current_date:new Date().toISOString().slice(0,10),
      seasons:compact(seasons.data,30),
      current_matches:compact(matches.data,80),
      historical_matches:compact(historyMatches.data,250),
      current_standings:compact(standings.data,40),
      historical_standings:compact(historyStandings.data,300),
      player_season_stats:compact(playerStats.data,500),
      current_players:compact(players.data,80)
    };

    const system=lang==='cs'
      ? `Jsi Kabina AI, statistický asistent týmu ${TEAM} v Hanspaulské lize. Odpovídej česky, stručně a konkrétně. Smíš používat POUZE data v JSON kontextu. Nic nevymýšlej. Když data nestačí, řekni přesně, co chybí. U výpočtů ukaž stručný rozpad po sezonách/zápasech, pokud to pomůže. "Poslední dvě sezony" znamená dvě nejnovější sezony podle year a phase. Při vzájemných zápasech počítej skóre vždy z pohledu ${TEAM}.`
      : `You are Locker Room AI, the statistics assistant for ${TEAM} in the Hanspaulska league. Answer in English, concise and specific. Use ONLY the supplied JSON sports context. Never invent facts. If the data is insufficient, say exactly what is missing. For calculations, show a short season/match breakdown when useful. "Last two seasons" means the two newest seasons by year and phase. Head-to-head goals must be calculated from ${TEAM}'s perspective.`;

    const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':`Bearer ${apiKey}`,
        'HTTP-Referer':'https://www.pestebnidelnici.cz',
        'X-Title':'Pestebni delnici A - Kabina AI'
      },
      body:JSON.stringify({
        model:'openrouter/free',
        temperature:0.15,
        max_tokens:650,
        messages:[
          {role:'system',content:system},
          {role:'user',content:`SPORTS DATA JSON:\n${JSON.stringify(sportsContext)}\n\nQUESTION:\n${question}`}
        ]
      })
    });

    const payload=await response.json().catch(()=>({}));
    if(!response.ok){
      const msg=payload?.error?.message||payload?.message||'Unknown OpenRouter error';
      return NextResponse.json({error:`OpenRouter ${response.status}: ${msg}`},{status:502});
    }
    const answer=payload?.choices?.[0]?.message?.content;
    if(typeof answer!=='string'||!answer.trim()){
      return NextResponse.json({error:'AI returned no answer'},{status:502});
    }

    await admin.from('ai_requests').insert({user_id:userData.user.id,player_id:profile.id});
    // keep table small
    const prune=new Date(Date.now()-14*86400000).toISOString();
    await admin.from('ai_requests').delete().lt('created_at',prune);

    const remaining=Math.max(0,USER_DAILY_LIMIT-(userCount||0)-1);
    return NextResponse.json({answer:answer.trim(),remaining,model:payload?.model||'openrouter/free'});
  }catch(e:any){
    console.error('Kabina AI',e);
    return NextResponse.json({error:e?.message||'Kabina AI failed'},{status:500});
  }
}
