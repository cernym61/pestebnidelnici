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
    const [seasons,matches,historyMatches,standings,historyStandings,playerStats,players,seasonDetails,advancedStats]=await Promise.all([
      admin.from('seasons').select('season,label,year,phase,division,final_rank,played,wins,draws,losses,score,points').order('year',{ascending:false}),
      admin.from('matches').select('season,kickoff,venue_code,home_team,away_team,home_score,away_score').order('kickoff',{ascending:false}),
      admin.from('historical_matches').select('season,kickoff,venue_code,home_team,away_team,home_score,away_score,round').order('kickoff',{ascending:false}).limit(250),
      admin.from('standings').select('season,rank,team,played,wins,draws,losses,score,points').order('rank'),
      admin.from('historical_standings').select('season,rank,team,played,wins,draws,losses,score,points').limit(300),
      admin.from('player_season_stats').select('season,player_name,games,goals').limit(500),
      admin.from('players').select('display_name,psmf_name,psmf_games,psmf_goals,active').eq('active',true).order('display_name'),
      admin.from('psmf_season_details').select('season,label,details_text,source_url').order('season',{ascending:false}),
      admin.from('player_match_advanced_stats').select('season,match_key,match_date,opponent,player_name,minutes_played,yellow_cards,red_cards,man_of_match,notes').order('match_date',{ascending:false}).limit(1000)
    ]);

    const contextErrors=[
      ['seasons',seasons.error],['matches',matches.error],['historical_matches',historyMatches.error],
      ['standings',standings.error],['historical_standings',historyStandings.error],
      ['player_season_stats',playerStats.error],['players',players.error],
      ['psmf_season_details',seasonDetails.error],['player_match_advanced_stats',advancedStats.error]
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
      player_season_stats:compact(playerStats.data,500).map((x:any)=>({
        ...x,
        assumed_minutes:Number(x.games||0)*60,
        minutes_rule:'Každý evidovaný start = 60 minut'
      })),
      current_players:compact(players.data,80).map((x:any)=>({
        ...x,
        assumed_minutes_current_season:Number(x.psmf_games||0)*60
      })),
      psmf_match_details_since_2020:compact(seasonDetails.data,30).map((x:any)=>({
        season:x.season,label:x.label,source_url:x.source_url,
        details_text:String(x.details_text||'').slice(0,60000)
      })),
      advanced_player_match_stats:compact(advancedStats.data,1000)
    };

    const system=lang==='cs'
      ? `Jsi Kabina AI, statistický asistent týmu ${TEAM} v Hanspaulské lize.
JAZYK: Odpovídej VÝHRADNĚ ČESKY. Ani úvod, mezikroky, nadpisy nebo vysvětlení nesmí být anglicky.
STYL: Odpověz rovnou výsledkem. Nevyprávěj svůj postup, nepiš "podívám se", "musím zjistit", "looking at" apod.
ZDROJE: Smíš používat POUZE data v dodaném JSON kontextu. Nic nevymýšlej.
ČASOVÝ ROZSAH: Historii vyhodnocuj od roku 2020 včetně.
DETAILY ZÁPASŮ: psmf_match_details_since_2020 obsahuje text oficiálních detailů PSMF – sestavy, góly s minutami, případné karty, poločas, popis zápasu a rozhodčí. Použij ho při dotazech typu "kdy hráč naposledy hrál", "kdy dal gól", "v jakém zápase", "karta" apod.
MINUTY: Pro tento tým platí pevné pravidlo zadané správcem: každý hráč, který je evidovaný jako účastník/sestava v daném utkání, odehrál 60 minut. Pro sezonní součty tedy vždy počítej minuty = počet zápasů × 60. Neoznačuj to jako odhad; je to interní pravidlo Kabiny.
KARTY: Žluté a červené karty hledej v oficiálních detailech PSMF od roku 2020. Pokud u hráče karta v dostupném detailu není uvedena, nevymýšlej ji.
HRÁČ ZÁPASU: Hráč zápasu je na PSMF označen hvězdičkou u jména. V textu detailů může být hvězdička serializovaná jako [★ HRÁČ ZÁPASU] nebo jiný star marker těsně u jména. Takto označeného hráče považuj za hráče zápasu. Nikdy hráče zápasu neurčuj podle vlastního názoru.
POKROČILÉ STATISTIKY: advanced_player_match_stats může obsahovat ručně/strukturovaně doplněné minuty, karty a hráče zápasu; pokud je tam údaj, má přednost před odvozeným součtem.
JMÉNA: U hráčů porovnávej české pořadí i PSMF pořadí příjmení/jméno (např. "Filip Oliver Bouzek" = "Bouzek Filip Oliver").
VÝPOČTY: U výpočtů ukaž krátký rozpad po sezonách/zápasech, pokud je užitečný. "Poslední dvě sezony" znamená dvě nejnovější sezony podle year a phase. Při vzájemných zápasech počítej skóre vždy z pohledu ${TEAM}.`
      : `You are Locker Room AI, the statistics assistant for ${TEAM} in the Hanspaulska league.
LANGUAGE: Answer EXCLUSIVELY IN ENGLISH. Do not use Czech in the answer.
STYLE: Give the final answer directly. Do not narrate your process or say "I need to check", "looking at", etc.
SOURCES: Use ONLY the supplied JSON context. Never invent facts.
TIME RANGE: Evaluate team history from 2020 onward.
MATCH DETAILS: psmf_match_details_since_2020 contains official PSMF match detail text: lineups, goals with minutes, cards when published, halftime score, match report and referees. Use it for questions such as when a player last played/scored/received a card.
MINUTES: For this team, the administrator has defined a fixed rule: every player listed as having appeared in a match is credited with 60 minutes. Season totals are therefore minutes = appearances × 60. Treat this as a Locker Room rule, not an estimate.
CARDS: Find yellow and red cards in official PSMF match details from 2020 onward. Never invent a card.
MAN OF THE MATCH: On PSMF, the player of the match is marked with a star next to the player's name. In serialized match details this can appear as [★ HRÁČ ZÁPASU] or another star marker adjacent to the name. Treat that player as man of the match. Never choose one based on your own opinion.
ADVANCED STATS: advanced_player_match_stats can contain structured/manual minutes, cards and man-of-the-match; when present, those values take precedence.
NAMES: Match Czech display order and PSMF surname-first order (e.g. "Filip Oliver Bouzek" = "Bouzek Filip Oliver").
CALCULATIONS: Show a short season/match breakdown when useful. "Last two seasons" means the two newest seasons by year and phase. Head-to-head goals must be calculated from ${TEAM}'s perspective.`;

    const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':`Bearer ${apiKey}`,
        'HTTP-Referer':'https://www.pestebnidelnici.cz',
        'X-Title':'Pestebni delnici A - Kabina AI'
      },
      body:JSON.stringify({
        models:[
          'nvidia/nemotron-3-ultra-550b-a55b:free',
          'thinkingmachines/inkling:free',
          'nvidia/nemotron-3.5-lightning:free'
        ],
        provider:{allow_fallbacks:true},
        temperature:0.15,
        max_tokens:650,
        messages:[
          {role:'system',content:system},
          {role:'user',content:`${lang==='cs'?'DŮLEŽITÉ: Odpověz pouze česky.':'IMPORTANT: Answer only in English.'}\n\nSPORTS DATA JSON:\n${JSON.stringify(sportsContext)}\n\nQUESTION:\n${question}`}
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
    return NextResponse.json({answer:answer.trim(),remaining,model:payload?.model||'free-fallback-chain'});
  }catch(e:any){
    console.error('Kabina AI',e);
    return NextResponse.json({error:e?.message||'Kabina AI failed'},{status:500});
  }
}
