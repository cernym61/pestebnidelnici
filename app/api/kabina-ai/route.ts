import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { parseSeasonDetails } from '@/lib/history-events';

export const runtime='nodejs';

const TEAM='Pěstební dělníci A';
function compact<T>(rows:T[]|null|undefined,limit=250){
  return (rows||[]).slice(0,limit);
}

export async function POST(req:NextRequest){
  try{
    const geminiKey=(process.env.GEMINI_API_KEY||'').trim();
    const openRouterKey=(process.env.OPENROUTER_API_KEY||'').trim();
    if(!geminiKey&&!openRouterKey)return NextResponse.json({error:'No free AI provider is configured'},{status:503});

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


    // Sports-only context: no emails, auth IDs, comments or other private account data.
    const [seasons,matches,historyMatches,standings,historyStandings,playerStats,players,seasonDetails,advancedStats]=await Promise.all([
      admin.from('seasons').select('season,label,year,phase,division,final_rank,played,wins,draws,losses,score,points').order('year',{ascending:false}),
      admin.from('matches').select('season,kickoff,venue_code,home_team,away_team,home_score,away_score').order('kickoff',{ascending:false}),
      admin.from('historical_matches').select('season,kickoff,venue_code,home_team,away_team,home_score,away_score,round').order('kickoff',{ascending:false}).limit(400),
      admin.from('standings').select('season,rank,team,played,wins,draws,losses,score,points').order('rank'),
      admin.from('historical_standings').select('season,rank,team,played,wins,draws,losses,score,points').limit(800),
      admin.from('player_season_stats').select('season,player_name,games,goals').limit(500),
      admin.from('players').select('display_name,psmf_name,psmf_games,psmf_goals,active').eq('active',true).order('display_name'),
      admin.from('psmf_season_details').select('season,label,details_text,details_html,source_url').order('season',{ascending:false}),
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


    const statsBySeason=new Map<string,string[]>();
    for(const row of playerStats.data||[]){
      const list=statsBySeason.get(row.season)||[];
      if(!list.includes(row.player_name))list.push(row.player_name);
      statsBySeason.set(row.season,list);
    }

    const structuredEvents=(seasonDetails.data||[]).flatMap((d:any)=>
      parseSeasonDetails(String(d.details_text||''),statsBySeason.get(d.season)||[])
        .map((event:any)=>({season:d.season,...event}))
    );

    const fold=(value:string)=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const key=(value:string)=>fold(value).split(/\s+/).filter(Boolean).sort().join('|');
    const qFold=fold(question);

    const playerCandidates=(players.data||[]).map((p:any)=>{
      const display=String(p.display_name||'').trim();
      const psmf=String(p.psmf_name||'').trim();
      const names=[display,psmf].filter(Boolean);
      const tokens=[...new Set(names.flatMap(n=>fold(n).split(/\s+/).filter((x:string)=>x.length>=4)))];
      const exact=names.some(n=>qFold.includes(fold(n)));
      const score=exact?100:tokens.reduce((sum:number,t:string)=>sum+(qFold.includes(t)?1:0),0);
      return {display,psmf,score};
    }).filter((x:any)=>x.score>0).sort((a:any,b:any)=>b.score-a.score);
    const targetPlayer=playerCandidates[0]||null;
    const targetKeys=targetPlayer?[targetPlayer.display,targetPlayer.psmf].filter(Boolean).map(key):[];
    const isTarget=(name:string)=>targetKeys.includes(key(name));

    const allOpponents=[...new Set([
      ...(historyMatches.data||[]).flatMap((m:any)=>[m.home_team,m.away_team]),
      ...(matches.data||[]).flatMap((m:any)=>[m.home_team,m.away_team])
    ].filter((n:any)=>n&&!String(n).startsWith('Pěstební dělníci')))] as string[];
    const targetOpponent=allOpponents.find((name:string)=>qFold.includes(fold(name)))||null;

    const relevantStats=targetPlayer
      ? (playerStats.data||[]).filter((x:any)=>isTarget(x.player_name))
      : (playerStats.data||[]).slice(0,300);

    const relevantEvents=targetPlayer
      ? structuredEvents.filter((e:any)=>
          (e.appearances||[]).some((n:string)=>isTarget(n)) ||
          (e.goals||[]).some((x:any)=>isTarget(x.player)) ||
          (e.yellowCards||[]).some((x:any)=>isTarget(x.player)) ||
          (e.redCards||[]).some((x:any)=>isTarget(x.player)) ||
          (e.manOfMatch||[]).some((n:string)=>isTarget(n)) ||
          (e.captains||[]).some((n:string)=>isTarget(n)) ||
          (e.goalkeepers||[]).some((n:string)=>isTarget(n))
        )
      : structuredEvents.slice(-120);

    const matchIndex=(historyMatches.data||[]).map((m:any)=>({
      season:m.season,date:String(m.kickoff).slice(0,10),kickoff:m.kickoff,home_team:m.home_team,away_team:m.away_team,
      home_score:m.home_score,away_score:m.away_score,venue_code:m.venue_code
    }));
    const findMatch=(season:string,date:string)=>matchIndex.find((m:any)=>m.season===season&&m.date===date);

    let playerProfile:any=null;
    if(targetPlayer){
      const games=relevantStats.reduce((a:number,x:any)=>a+Number(x.games||0),0);
      const goals=relevantStats.reduce((a:number,x:any)=>a+Number(x.goals||0),0);
      const minutes=games*60;
      const goalsList=relevantEvents.flatMap((e:any)=>(e.goals||[]).filter((g:any)=>isTarget(g.player)).map((g:any)=>({season:e.season,date:e.date,minute:g.minute,match:findMatch(e.season,e.date)}))).sort((a:any,b:any)=>String(b.date).localeCompare(String(a.date)));
      const appearances=relevantEvents.filter((e:any)=>(e.appearances||[]).some((n:string)=>isTarget(n))).map((e:any)=>({season:e.season,date:e.date,match:findMatch(e.season,e.date)})).sort((a:any,b:any)=>String(b.date).localeCompare(String(a.date)));
      const yellowCards=relevantEvents.flatMap((e:any)=>(e.yellowCards||[]).filter((x:any)=>isTarget(x.player)).map((x:any)=>({season:e.season,date:e.date,minute:x.minute,match:findMatch(e.season,e.date)})));
      const redCards=relevantEvents.flatMap((e:any)=>(e.redCards||[]).filter((x:any)=>isTarget(x.player)).map((x:any)=>({season:e.season,date:e.date,minute:x.minute,match:findMatch(e.season,e.date)})));
      const motm=relevantEvents.filter((e:any)=>(e.manOfMatch||[]).some((n:string)=>isTarget(n)));
      const captain=relevantEvents.filter((e:any)=>(e.captains||[]).some((n:string)=>isTarget(n)));
      const keeperEvents=relevantEvents.filter((e:any)=>(e.goalkeepers||[]).some((n:string)=>isTarget(n)));
      let keeperGoalsAgainst=0;
      for(const e of keeperEvents){
        const m=findMatch(e.season,e.date);
        if(!m)continue;
        keeperGoalsAgainst+=String(m.home_team).startsWith('Pěstební dělníci')?Number(m.away_score||0):Number(m.home_score||0);
      }
      playerProfile={
        player:targetPlayer.display||targetPlayer.psmf,
        psmf_name:targetPlayer.psmf,
        career:{games,minutes,goals,goals_per_game:games?Number((goals/games).toFixed(3)):0},
        season_breakdown:relevantStats,
        last_appearance:appearances[0]||null,
        last_goal:goalsList[0]||null,
        yellow_cards:yellowCards.length,
        red_cards:redCards.length,
        yellow_card_events:yellowCards.slice(0,20),
        red_card_events:redCards.slice(0,20),
        player_of_match_count:motm.length,
        captain_matches:captain.length,
        goalkeeper:{matches:keeperEvents.length,goals_conceded:keeperGoalsAgainst,average_conceded:keeperEvents.length?Number((keeperGoalsAgainst/keeperEvents.length).toFixed(2)):null}
      };
    }

    const h2hMatches=targetOpponent
      ? matchIndex.filter((m:any)=>m.home_team===targetOpponent||m.away_team===targetOpponent)
      : [];

    const sportsContext={
      team:TEAM,
      current_date:new Date().toISOString().slice(0,10),
      resolved_player_profile:playerProfile,
      resolved_opponent:targetOpponent,
      head_to_head_matches:h2hMatches,
      relevant_structured_events:relevantEvents.slice(0,160),
      relevant_player_season_stats:relevantStats,
      current_standings:compact(standings.data,40),
      seasons:compact(seasons.data,30)
    };
    const system=lang==='cs'
      ? `Jsi Kabina AI, statistický asistent týmu ${TEAM} v Hanspaulské lize.
JAZYK: Odpovídej VÝHRADNĚ ČESKY. Ani úvod, mezikroky, nadpisy nebo vysvětlení nesmí být anglicky.
STYL: Odpověz rovnou výsledkem. Nevyprávěj svůj postup, nepiš "podívám se", "musím zjistit", "looking at" apod.
ROZSAH ODPOVĚDI: Nebuď strohý. U jednoduché otázky dej alespoň 3–5 užitečných vět nebo bodů. U dotazu na statistiky konkrétního hráče vytvoř přehledný mini-profil: zápasy, minuty, góly, průměr gólů na zápas, poslední známý start, poslední známý gól (datum/soupeř/minuta, pokud data existují), ŽK, ČK, počet ★ hráč zápasu, počet zápasů jako kapitán a pokud chytal, počet zápasů v bráně + inkasované góly/průměr. Přidej krátké shrnutí kariéry nebo sezonní rozpad, pokud je v datech. Když některý údaj chybí, napiš "v dostupných datech neuvedeno" místo vynechání celé odpovědi.
FORMÁT: Používej krátké nadpisy a odrážky; žádné markdown tabulky. Důležité hodnoty zvýrazni pomocí běžného textu a dvojtečky.
ZDROJE: Smíš používat POUZE data v dodaném JSON kontextu. Nic nevymýšlej.
ČASOVÝ ROZSAH: Historii vyhodnocuj od prvního ročníku týmu v roce 2015 včetně.
DETAILY ZÁPASŮ: structured_match_events_since_2015 obsahuje text oficiálních detailů PSMF – sestavy, góly s minutami, případné karty, poločas, popis zápasu a rozhodčí. Použij ho při dotazech typu "kdy hráč naposledy hrál", "kdy dal gól", "v jakém zápase", "karta" apod.
MINUTY: Pro tento tým platí pevné pravidlo zadané správcem: každý hráč, který je evidovaný jako účastník/sestava v daném utkání, odehrál 60 minut. Pro sezonní součty tedy vždy počítej minuty = počet zápasů × 60. Neoznačuj to jako odhad; je to interní pravidlo Kabiny.
KARTY: Žluté a červené karty hledej v oficiálních detailech PSMF od roku 2015. Pokud u hráče karta v dostupném detailu není uvedena, nevymýšlej ji.
HRÁČ ZÁPASU: Hráč zápasu je na PSMF označen hvězdičkou u jména. V textu detailů může být hvězdička serializovaná jako [★ HRÁČ ZÁPASU] nebo jiný star marker těsně u jména. Takto označeného hráče považuj za hráče zápasu. Nikdy hráče zápasu neurčuj podle vlastního názoru.
BRANKÁŘ A KAPITÁN: V structured_match_events_since_2015 platí: goalkeepers = první hráč uvedený v sestavě daného týmu; captains = hráč označený na PSMF symbolem C. Hráč zápasu je označen hvězdičkou ★ před jménem.
POKROČILÉ STATISTIKY: advanced_player_match_stats může obsahovat ručně/strukturovaně doplněné minuty, karty a hráče zápasu; pokud je tam údaj, má přednost před odvozeným součtem.
JMÉNA: U hráčů porovnávej české pořadí i PSMF pořadí příjmení/jméno (např. "Filip Oliver Bouzek" = "Bouzek Filip Oliver").
VÝPOČTY: U výpočtů ukaž krátký rozpad po sezonách/zápasech, pokud je užitečný. "Poslední dvě sezony" znamená dvě nejnovější sezony podle year a phase. Při vzájemných zápasech počítej skóre vždy z pohledu ${TEAM}.`
      : `You are Locker Room AI, the statistics assistant for ${TEAM} in the Hanspaulska league.
LANGUAGE: Answer EXCLUSIVELY IN ENGLISH. Do not use Czech in the answer.
STYLE: Give the final answer directly. Do not narrate your process or say "I need to check", "looking at", etc.
ANSWER DEPTH: Do not be terse. For a simple question give at least 3–5 useful sentences or bullets. For a player-statistics request, produce a compact profile including appearances, minutes, goals, goals per game, latest known appearance, latest known goal (date/opponent/minute when available), yellow cards, red cards, ★ player-of-the-match count, captain appearances, and if the player was a goalkeeper, goalkeeper appearances + goals conceded/average. Add a short career summary or season breakdown when the data supports it. If a field is unavailable, say "not available in the supplied data" rather than omitting the whole answer.
FORMAT: Use short headings and bullets; do not use markdown tables.
SOURCES: Use ONLY the supplied JSON context. Never invent facts.
TIME RANGE: Evaluate the complete team history from its first PSMF season in 2015 onward.
MATCH DETAILS: structured_match_events_since_2015 contains official PSMF match detail text: lineups, goals with minutes, cards when published, halftime score, match report and referees. Use it for questions such as when a player last played/scored/received a card.
MINUTES: For this team, the administrator has defined a fixed rule: every player listed as having appeared in a match is credited with 60 minutes. Season totals are therefore minutes = appearances × 60. Treat this as a Locker Room rule, not an estimate.
CARDS: Find yellow and red cards in official PSMF match details from 2015 onward. Never invent a card.
MAN OF THE MATCH: On PSMF, the player of the match is marked with a star next to the player's name. In serialized match details this can appear as [★ HRÁČ ZÁPASU] or another star marker adjacent to the name. Treat that player as man of the match. Never choose one based on your own opinion.
GOALKEEPER AND CAPTAIN: In structured_match_events_since_2015, goalkeepers means the first player listed in the team lineup; captains means a player marked C on PSMF. Man of the match is the player with a ★ star before the name.
ADVANCED STATS: advanced_player_match_stats can contain structured/manual minutes, cards and man-of-the-match; when present, those values take precedence.
NAMES: Match Czech display order and PSMF surname-first order (e.g. "Filip Oliver Bouzek" = "Bouzek Filip Oliver").
CALCULATIONS: Show a short season/match breakdown when useful. "Last two seasons" means the two newest seasons by year and phase. Head-to-head goals must be calculated from ${TEAM}'s perspective.`;

    const userPrompt=`${lang==='cs'?'DŮLEŽITÉ: Odpověz pouze česky.':'IMPORTANT: Answer only in English.'}

SPORTS DATA JSON:
${JSON.stringify(sportsContext)}

QUESTION:
${question}`;

    let answer='';
    let usedModel='';
    let quotaHit=false;
    let providerAttempted=false;
    let nonQuotaFailure=false;

    // Primary provider: Google Gemini free tier.
    if(geminiKey){
      providerAttempted=true;
      try{
        const gr=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent',{
          method:'POST',
          headers:{'Content-Type':'application/json','x-goog-api-key':geminiKey},
          body:JSON.stringify({
            system_instruction:{parts:[{text:system}]},
            contents:[{role:'user',parts:[{text:userPrompt}]}],
            generationConfig:{temperature:0.15,maxOutputTokens:1400}
          })
        });
        const gp=await gr.json().catch(()=>({}));
        if(gr.ok){
          answer=(gp?.candidates?.[0]?.content?.parts||[]).map((p:any)=>p?.text||'').join('').trim();
          if(answer)usedModel='gemini-3.7-flash';
        }else{
          if(gr.status===429)quotaHit=true; else nonQuotaFailure=true;
          console.warn('Gemini AI error',gr.status,gp?.error?.message||gp);
        }
      }catch(e){console.warn('Gemini AI request failed',e);}
    }

    // Secondary provider: OpenRouter free models only.
    if(!answer && openRouterKey){
      providerAttempted=true;
      try{
        const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{
          method:'POST',
          headers:{
            'Content-Type':'application/json',
            'Authorization':`Bearer ${openRouterKey}`,
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
            max_tokens:1400,
            messages:[
              {role:'system',content:system},
              {role:'user',content:userPrompt}
            ]
          })
        });
        const payload=await response.json().catch(()=>({}));
        if(response.ok){
          answer=String(payload?.choices?.[0]?.message?.content||'').trim();
          if(answer)usedModel=payload?.model||'openrouter-free';
        }else{
          if(response.status===429)quotaHit=true; else nonQuotaFailure=true;
          console.warn('OpenRouter AI error',response.status,payload?.error?.message||payload);
        }
      }catch(e){console.warn('OpenRouter AI request failed',e);}
    }

    if(!answer){
      if(quotaHit && !nonQuotaFailure)return NextResponse.json({
        error:lang==='cs'?'Bezplatný limit AI je pro tuto chvíli vyčerpaný. Zkus to znovu později.':'The free AI quota is currently exhausted. Please try again later.',
        code:'FREE_QUOTA_EXHAUSTED'
      },{status:429});
      return NextResponse.json({error:'Free AI providers are temporarily unavailable',code:'AI_UNAVAILABLE'},{status:503});
    }

    await admin.from('ai_requests').insert({user_id:userData.user.id,player_id:profile.id});
    // keep table small
    const prune=new Date(Date.now()-14*86400000).toISOString();
    await admin.from('ai_requests').delete().lt('created_at',prune);

    return NextResponse.json({answer:answer.trim(),model:usedModel});
  }catch(e:any){
    console.error('Kabina AI',e);
    return NextResponse.json({error:e?.message||'Kabina AI failed'},{status:500});
  }
}
