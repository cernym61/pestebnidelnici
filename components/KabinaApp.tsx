'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Bell, CalendarDays, Camera, Check, Download, ExternalLink, Eye, ImageOff, Languages, LogIn, LogOut, Mail, Map as MapIcon, MapPin, Megaphone, MessageCircle, Navigation, Pencil, Plus, RefreshCw, Reply, Send, ShieldCheck, Smartphone, Trash2, UserRound, Users, Vote, X } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { fallbackMatches, fallbackPlayers, fallbackStandings, Match, PlayerStat, SEASON, SOURCE_URL, Standing, TEAM } from '@/lib/data';
import { supabase } from '@/lib/supabase';

const VenueMap=dynamic(()=>import('./VenueMap'),{ssr:false});

type Lang='cs'|'en';
type Tab='matches'|'board'|'map'|'table'|'stats'|'history'|'h2h'|'ids'|'admin';
type Attendance='yes'|'no'|'maybe'|null;
type Profile={id:string;display_name:string;role:string;user_id:string|null;avatar_url:string|null};
type AttendanceRow={status:'yes'|'no'|'maybe';player_id:string;players:{display_name:string;avatar_url:string|null;registration_id:string|null;jersey_number:number|null}|null};
type RegisteredPlayer={id:string;display_name:string;avatar_url:string|null};
type Venue={code:string;name:string;address:string;notes:string|null};
type Season={season:string;label:string;year:number;phase:string;division:string|null;team_name:string;final_rank:number|null;played:number|null;wins:number|null;draws:number|null;losses:number|null;score:string|null;points:number|null};
type HistMatch={psmf_key:string;season:string;kickoff:string;venue_code:string|null;home_team:string;away_team:string;home_score:number;away_score:number;round:number;team_name:string};
type SeasonStat={season:string;player_name:string;games:number;goals:number};
type HistStanding={season:string;rank:number;team:string;played:number;wins:number;draws:number;losses:number;score:string;points:number};
type CommentRow={id:string;match_id:string;player_id:string;parent_id:string|null;body:string;created_at:string;updated_at:string;players:{display_name:string;avatar_url:string|null;role:string}|null};
type AdminPlayer={id:string;display_name:string;email:string|null;role:'player'|'captain'|'admin';active:boolean;user_id:string|null;avatar_url:string|null;registration_id:string|null;jersey_number:number|null};
type PublicRosterRow={id:string;display_name:string;avatar_url:string|null;registration_id:string|null;jersey_number:number|null;attending:boolean};
type TeamMatchEvent={date:string;goals:{player:string;minute:number}[];yellowCards:{player:string;minute:number|null}[];redCards:{player:string;minute:number|null}[];manOfMatch:string[];captains:string[];goalkeepers:string[];appearances:string[]};
type TeamPostVote={playerId:string;playerName:string};
type TeamPostOption={id:string;label:string;sortOrder:number;votes:TeamPostVote[]};
type TeamPost={id:string;title:string;body:string;createdAt:string;updatedAt:string;author:{id:string;name:string;avatarUrl:string|null;role:string};pollQuestion:string|null;options:TeamPostOption[];myOptionId:string|null;emailSent:boolean;pushSent:boolean};


const copy={
 cs:{tagline:'JEDEN TÝM. JEDNA KABINA.',league:'PSMF · 5D · podzim 2026',verified:'Automatická synchronizace PSMF',refresh:'Obnovit PSMF',matches:'Zápasy',map:'Mapa hřišť',table:'Tabulka',stats:'Statistiky',history:'Historie',h2h:'Vzájemné zápasy',heading:'Jdeme hrát.',sub:'Potvrď účast a měj přehled o dalších zápasech.',next:'NEJBLIŽŠÍ ZÁPAS',away:'Venku',home:'Doma',count:'Počítáme s tebou?',yes:'Přijdu',no:'Nepřijdu',maybe:'Zatím nevím',cancel:'Zrušit odpověď',saved:'Uloženo do týmové kabiny.',upcoming:'Další zápasy',past:'Odehráno',pos:'Poř.',team:'Tým',played:'Z',wins:'V',draws:'R',losses:'P',score:'Skóre',pts:'B',player:'Hráč',goals:'Góly',games:'Zápasy',account:'Týmová kabina',login:'Přihlásit',logout:'Odhlásit',signup:'Vytvořit účet',email:'E-mail',password:'Heslo',choosePlayer:'Který hráč jsi?',haveAccount:'Už mám účet',newAccount:'Jsem tu poprvé',signedAs:'Přihlášen jako',loginNeeded:'Pro týmové funkce se přihlas.',responses:'Odpovědi týmu',noResponses:'Zatím nikdo neodpověděl.',unanswered:'Nevyjádřil se',confirmEmail:'Účet je vytvořený. Potvrď e-mail a potom se přihlas.',playerLinked:'Účet je propojen s hráčem.',genericError:'Něco se nepovedlo. Zkus to prosím znovu.',synced:'PSMF aktualizováno včetně historie.',address:'Adresa',google:'Google Maps',waze:'Waze',resend:'Poslat ověřovací e-mail znovu',resent:'Ověřovací e-mail byl znovu odeslán.',testReminder:'Poslat test reminder sobě',testReminderSent:'Testovací reminder byl odeslán jen na tvůj e-mail.',comments:'Komentáře',writeComment:'Napiš zprávu k zápasu…',send:'Odeslat',reply:'Odpovědět',edit:'Upravit',delete:'Smazat',noComments:'Zatím žádné komentáře.',photo:'Profilová fotka',uploadPhoto:'Nahrát fotku',career:'Kariéra od 2020',season:'Sezóna',rank:'Umístění',record:'Bilance',selectOpponent:'Vyber soupeře',meetings:'Zápasy',h2hRecord:'Bilance V–R–P',manageTeam:'Správa týmu',role:'Role',active:'Aktivní',unlink:'Odpojit účet',captain:'Kapitán',admin:'Admin',regularPlayer:'Hráč',noAccount:'Bez účtu',adminSaved:'Změna uložena.',adminTab:'Správa',noH2H:'Zatím žádný odehraný vzájemný zápas.',pushEnable:'Zapnout upozornění',pushEnabled:'Upozornění zapnutá',pushDenied:'Upozornění jsou v prohlížeči zakázaná.',pushTest:'Poslat test push sobě',pushTestSent:'Testovací push byl odeslán.',iosInstall:'Na iPhonu nejdřív otevři Sdílet → Přidat na plochu, spusť Kabinu z ikony a potom zapni upozornění.',adminPush:'Týmová push notifikace',pushTitle:'Nadpis',pushMessage:'Zpráva',pushRecipients:'Příjemci',pushAll:'Vybrat všechny',pushUnanswered:'Nevyjádření',pushNone:'Zrušit výběr',pushDefaultHint:'Automaticky jsou předvybraní registrovaní hráči, kteří se ještě nevyjádřili k nejbližšímu zápasu.',pushSend:'Odeslat push',pushSent:'Push notifikace byla odeslána.',ids:'ID hráčů',registrationId:'ID hráče',jersey:'Číslo dresu',goingPlayers:'Všichni hráči',noGoingPlayers:'Zatím nejsou evidováni žádní hráči.',attendingLegend:'Zeleně = potvrdil účast na nejbližší zápas',playerData:'Hráčské údaje',savePlayerData:'Uložit údaje',exportPdf:'Náhled PDF',attendanceCol:'Účast',pdfPreview:'Náhled PDF',pdfGenerating:'Připravuji PDF…',pdfDownload:'Stáhnout PDF',pdfClose:'Zavřít',forgotPassword:'Zapomenuté heslo?',forgotTitle:'Obnovit heslo',forgotIntro:'Zadej e-mail, na který ti pošleme odkaz pro nastavení nového hesla.',sendReset:'Poslat odkaz',resetSent:'Odkaz pro nastavení nového hesla byl odeslán na e-mail.',newPassword:'Nové heslo',repeatPassword:'Zopakovat heslo',setNewPassword:'Nastavit nové heslo',passwordChanged:'Heslo bylo změněno. Můžeš se přihlásit.',passwordMismatch:'Hesla se neshodují.',rateLimit:'Byl překročen limit e-mailů. Počkej chvíli a zkus to znovu. Pro ostrý provoz doporučujeme v Supabase nastavit vlastní SMTP přes Resend.',replacePhoto:'Vyměnit foto',removePhoto:'Smazat foto',photoRemoved:'Fotka byla smazána.',photoChanged:'Fotka byla změněna.',minutes:'Minuty',yellowCards:'ŽK',redCards:'ČK',motm:'★ Hráč zápasu',goalScorers:'Střelci',noGoals:'Bez vstřeleného gólu',keeper:'Brankář',overall:'Celková bilance od založení',winRate:'Úspěšnost',goalsForAgainst:'Skóre',goalsConceded:'Obdržené góly',keeperRecord:'Brankářská bilance',board:'Nástěnka',boardIntro:'Důležité týmové informace, oznámení a ankety.',newPost:'Nový příspěvek',postTitle:'Nadpis',postBody:'Text příspěvku',poll:'Anketa',addPoll:'Přidat anketu',pollQuestion:'Otázka ankety',pollOption:'Možnost',addOption:'Přidat možnost',sendEmailAll:'Poslat všem e-mail',sendPushAll:'Poslat všem push notifikaci',publishPost:'Publikovat příspěvek',published:'Příspěvek byl zveřejněn.',vote:'Hlasovat',votes:'hlasů',yourVote:'Tvůj hlas',noPosts:'Zatím tu nejsou žádné příspěvky.',captainOrAdmin:'Příspěvek může přidat kapitán nebo správce.',deletePost:'Smazat příspěvek',notificationWarning:'Příspěvek se zveřejnil, ale některé notifikace se nepodařilo odeslat.'},
 en:{tagline:'ONE TEAM. ONE LOCKER ROOM.',league:'PSMF · 5D · autumn 2026',verified:'Automatic PSMF sync',refresh:'Refresh PSMF',matches:'Matches',map:'Venue map',table:'Table',stats:'Stats',history:'History',h2h:'Head-to-head',heading:"We're playing.",sub:'Confirm your availability and keep track of upcoming matches.',next:'NEXT MATCH',away:'Away',home:'Home',count:'Can we count on you?',yes:"I'm in",no:"I'm out",maybe:'Not sure yet',cancel:'Clear answer',saved:'Saved to the team locker room.',upcoming:'Upcoming matches',past:'Results',pos:'Pos.',team:'Team',played:'P',wins:'W',draws:'D',losses:'L',score:'Score',pts:'Pts',player:'Player',goals:'Goals',games:'Games',account:'Team locker room',login:'Sign in',logout:'Sign out',signup:'Create account',email:'Email',password:'Password',choosePlayer:'Which player are you?',haveAccount:'I already have an account',newAccount:"I'm new here",signedAs:'Signed in as',loginNeeded:'Sign in for team features.',responses:'Team responses',noResponses:'No responses yet.',unanswered:'No response',confirmEmail:'Account created. Confirm your email and then sign in.',playerLinked:'Your account is linked to the player.',genericError:'Something went wrong. Please try again.',synced:'PSMF refreshed including history.',address:'Address',google:'Google Maps',waze:'Waze',resend:'Resend confirmation email',resent:'Confirmation email sent again.',testReminder:'Send test reminder to me',testReminderSent:'Test reminder was sent only to your email.',comments:'Comments',writeComment:'Write a match message…',send:'Send',reply:'Reply',edit:'Edit',delete:'Delete',noComments:'No comments yet.',photo:'Profile photo',uploadPhoto:'Upload photo',career:'Career since 2015',season:'Season',rank:'Rank',record:'Record',selectOpponent:'Choose opponent',meetings:'Matches',h2hRecord:'W–D–L',manageTeam:'Manage team',role:'Role',active:'Active',unlink:'Unlink account',captain:'Captain',admin:'Admin',regularPlayer:'Player',noAccount:'No account',adminSaved:'Change saved.',adminTab:'Admin',noH2H:'No completed head-to-head match yet.',pushEnable:'Enable notifications',pushEnabled:'Notifications enabled',pushDenied:'Notifications are blocked in the browser.',pushTest:'Send test push to me',pushTestSent:'Test push was sent.',iosInstall:'On iPhone, first use Share → Add to Home Screen, open the locker room from the icon, then enable notifications.',adminPush:'Team push notification',pushTitle:'Title',pushMessage:'Message',pushRecipients:'Recipients',pushAll:'Select all',pushUnanswered:'No response',pushNone:'Clear selection',pushDefaultHint:'Registered players who have not answered the next match are selected by default.',pushSend:'Send push',pushSent:'Push notification sent.',ids:'Player IDs',registrationId:'Player ID',jersey:'Jersey number',goingPlayers:'All players',noGoingPlayers:'No players are listed yet.',attendingLegend:'Green = confirmed for the next match',playerData:'Player details',savePlayerData:'Save details',exportPdf:'PDF preview',attendanceCol:'Attendance',pdfPreview:'PDF preview',pdfGenerating:'Preparing PDF…',pdfDownload:'Download PDF',pdfClose:'Close',forgotPassword:'Forgot password?',forgotTitle:'Reset password',forgotIntro:'Enter your email and we will send you a link to set a new password.',sendReset:'Send reset link',resetSent:'Password reset link was sent to your email.',newPassword:'New password',repeatPassword:'Repeat password',setNewPassword:'Set new password',passwordChanged:'Password changed. You can sign in now.',passwordMismatch:'Passwords do not match.',rateLimit:'Email rate limit exceeded. Wait a little and try again. For production, configure custom SMTP in Supabase using Resend.',replacePhoto:'Replace photo',removePhoto:'Remove photo',photoRemoved:'Photo removed.',photoChanged:'Photo changed.',minutes:'Minutes',yellowCards:'YC',redCards:'RC',motm:'★ Player of the match',goalScorers:'Scorers',noGoals:'No goals scored',keeper:'Goalkeeper',overall:'All-time record since foundation',winRate:'Win rate',goalsForAgainst:'Goals',goalsConceded:'Goals conceded',keeperRecord:'Goalkeeper record',board:'Board',boardIntro:'Important team information, announcements and polls.',newPost:'New post',postTitle:'Title',postBody:'Post text',poll:'Poll',addPoll:'Add a poll',pollQuestion:'Poll question',pollOption:'Option',addOption:'Add option',sendEmailAll:'Email everyone',sendPushAll:'Send push notification to everyone',publishPost:'Publish post',published:'Post published.',vote:'Vote',votes:'votes',yourVote:'Your vote',noPosts:'No posts yet.',captainOrAdmin:'A captain or admin can publish a post.',deletePost:'Delete post',notificationWarning:'The post was published, but some notifications could not be sent.'}
} as const;

function fmtDate(iso:string,lang:Lang){return new Intl.DateTimeFormat(lang==='cs'?'cs-CZ':'en-GB',{day:'numeric',month:'long'}).format(new Date(`${iso}T12:00:00`));}
function fmtDateTime(iso:string,lang:Lang){return new Intl.DateTimeFormat(lang==='cs'?'cs-CZ':'en-GB',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(iso));}
function googleMaps(address:string){return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;}
function waze(address:string){return `https://www.waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;}
function ours(name:string){return name.startsWith('Pěstební dělníci');}
const APP_VERSION='3.7.6';

function stripDiacritics(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function parseScore(score:string|null|undefined){const m=String(score||'').match(/(\d+)\s*:\s*(\d+)/);return m?[Number(m[1]),Number(m[2])] as const:null;}
function seasonOrder(s:Season){return s.year*10+(s.phase==='podzim'?2:1);}
function wordsToNumber(q:string){
 const x=stripDiacritics(q);
 const map:Record<string,number>={jednu:1,jedna:1,jeden:1,one:1,dve:2,dva:2,two:2,tri:3,three:3,ctyri:4,four:4,pet:5,five:5};
 const n=x.match(/\b(\d+)\b/); if(n)return Math.max(1,Math.min(20,Number(n[1])));
 for(const [k,v] of Object.entries(map))if(new RegExp(`\\b${k}\\b`).test(x))return v;
 return null;
}

function outcome(home:string,away:string,hs:number|null|undefined,as:number|null|undefined){if(hs==null||as==null)return '';const gf=ours(home)?hs:as;const ga=ours(home)?as:hs;return gf>ga?'win':gf<ga?'loss':'draw';}
function avatar(name:string,url?:string|null,size='md'){const src=url?`/api/avatar?url=${encodeURIComponent(url)}`:null;return src?<img className={`avatar ${size}`} src={src} alt={name} loading="lazy"/>:<span className={`avatar avatarFallback ${size}`}>{name.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase()}</span>;}

export default function KabinaApp(){
 const [lang,setLang]=useState<Lang>('cs'); const [tab,setTab]=useState<Tab>('matches'); const t=copy[lang];
 const [session,setSession]=useState<Session|null>(null); const [profile,setProfile]=useState<Profile|null>(null);
 const [attendance,setAttendance]=useState<Attendance>(null); const [attendanceRows,setAttendanceRows]=useState<AttendanceRow[]>([]); const [registeredPlayers,setRegisteredPlayers]=useState<RegisteredPlayer[]>([]);
 const [authOpen,setAuthOpen]=useState(false); const [authMode,setAuthMode]=useState<'login'|'signup'>('login'); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [forgotOpen,setForgotOpen]=useState(false); const [resetOpen,setResetOpen]=useState(false); const [newPassword,setNewPassword]=useState(''); const [repeatPassword,setRepeatPassword]=useState('');
 const [historyEvents,setHistoryEvents]=useState<Record<string,TeamMatchEvent[]>>({}); const adminAvatarInput=useRef<HTMLInputElement>(null); const [adminAvatarTarget,setAdminAvatarTarget]=useState<string|null>(null); const [adminAvatarBusy,setAdminAvatarBusy]=useState<string|null>(null);
 const [matches,setMatches]=useState<Match[]>(fallbackMatches); const [players,setPlayers]=useState<PlayerStat[]>(fallbackPlayers); const [standings,setStandings]=useState<Standing[]>(fallbackStandings); const [venues,setVenues]=useState<Record<string,Venue>>({}); const [venueOpen,setVenueOpen]=useState<Venue|null>(null);
 const [selectedPlayer,setSelectedPlayer]=useState<string>(fallbackPlayers[0].name); const [authMessage,setAuthMessage]=useState(''); const [authBusy,setAuthBusy]=useState(false); const [saving,setSaving]=useState(false); const [syncing,setSyncing]=useState(false); const [reminderBusy,setReminderBusy]=useState(false);
 const [seasons,setSeasons]=useState<Season[]>([]); const [historyMatches,setHistoryMatches]=useState<HistMatch[]>([]); const [historyStandings,setHistoryStandings]=useState<HistStanding[]>([]); const [seasonStats,setSeasonStats]=useState<SeasonStat[]>([]); const [historySeason,setHistorySeason]=useState(''); const [h2hOpponent,setH2hOpponent]=useState('');
 const [comments,setComments]=useState<CommentRow[]>([]); const [commentDrafts,setCommentDrafts]=useState<Record<string,string>>({});
 const [adminOpen,setAdminOpen]=useState(false); const [adminPlayers,setAdminPlayers]=useState<AdminPlayer[]>([]); const [adminBusy,setAdminBusy]=useState<string|null>(null); const [replyTo,setReplyTo]=useState<Record<string,string|null>>({}); const [commentBusy,setCommentBusy]=useState<string|null>(null); const avatarInput=useRef<HTMLInputElement|null>(null); const [avatarBusy,setAvatarBusy]=useState(false);
 const [pushReady,setPushReady]=useState(false); const [pushPermission,setPushPermission]=useState<'default'|'granted'|'denied'>('default'); const [pushBusy,setPushBusy]=useState(false);
 const [isIos,setIsIos]=useState(false); const [isStandalone,setIsStandalone]=useState(false);
 const [adminPushTitle,setAdminPushTitle]=useState('⚽ Pěstební dělníci A'); const [adminPushMessage,setAdminPushMessage]=useState(''); const [adminPushPlayers,setAdminPushPlayers]=useState<string[]>([]); const [adminPushBusy,setAdminPushBusy]=useState(false);
 const [playerDataDrafts,setPlayerDataDrafts]=useState<Record<string,{registration_id:string;jersey_number:string}>>({});
 const [publicRoster,setPublicRoster]=useState<PublicRosterRow[]>([]);
 const [pdfPreviewUrl,setPdfPreviewUrl]=useState<string|null>(null); const [pdfBusy,setPdfBusy]=useState(false);
 const [teamPosts,setTeamPosts]=useState<TeamPost[]>([]); const [teamPostsBusy,setTeamPostsBusy]=useState(false); const currentStatsWrapRef=useRef<HTMLDivElement>(null); const careerStatsWrapRef=useRef<HTMLDivElement>(null); const [mobileStatsMode,setMobileStatsMode]=useState<'cards'|'table'>('table');
 const [postTitle,setPostTitle]=useState(''); const [postBody,setPostBody]=useState(''); const [postPollEnabled,setPostPollEnabled]=useState(false); const [postPollQuestion,setPostPollQuestion]=useState(''); const [postPollOptions,setPostPollOptions]=useState<string[]>(['Ano','Ne']); const [postSendEmail,setPostSendEmail]=useState(false); const [postSendPush,setPostSendPush]=useState(false); const [postPublishing,setPostPublishing]=useState(false);

 useEffect(()=>{
   if(typeof window==='undefined')return;
   const requestedTab=new URLSearchParams(window.location.search).get('tab');
   if(requestedTab==='board')setTab('board');
 },[]);

 useEffect(()=>{
   if(typeof window==='undefined')return;
   let checking=false;
   const checkVersion=async()=>{
     if(checking)return;
     checking=true;
     try{
       const r=await fetch(`/api/app-version?t=${Date.now()}`,{cache:'no-store'});
       const b=await r.json().catch(()=>({}));
       const serverVersion=String(b?.version||'');
       if(serverVersion&&serverVersion!==APP_VERSION){
         const url=new URL(window.location.href);
         url.searchParams.set('appv',serverVersion);
         window.location.replace(url.toString());
         return;
       }
     }catch(e){console.warn('version check failed',e);}
     finally{checking=false;}
   };
   const onVisible=()=>{if(document.visibilityState==='visible')void checkVersion();};
   void checkVersion();
   window.addEventListener('focus',checkVersion);
   document.addEventListener('visibilitychange',onVisible);
   return()=>{window.removeEventListener('focus',checkVersion);document.removeEventListener('visibilitychange',onVisible);};
 },[]);

 useEffect(()=>{
   if(typeof window==='undefined')return;
   const ua=window.navigator.userAgent;
   setIsIos(/iPad|iPhone|iPod/.test(ua) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1));
   setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as any).standalone));
   if('Notification' in window)setPushPermission(Notification.permission as 'default'|'granted'|'denied');
   const appId=process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
   if(!appId)return;
   const w=window as any;
   w.OneSignalDeferred=w.OneSignalDeferred||[];
   w.OneSignalDeferred.push(async(OneSignal:any)=>{
     try{
       await OneSignal.init({appId,serviceWorkerPath:'/OneSignalSDKWorker.js',serviceWorkerParam:{scope:'/'},notifyButton:{enable:false}});
       setPushReady(true);
       if('Notification' in window)setPushPermission(Notification.permission as 'default'|'granted'|'denied');
     }catch(e){console.error('OneSignal init failed',e);}
   });
   if(!document.querySelector('script[data-onesignal-sdk]')){
     const script=document.createElement('script');
     script.src='https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
     script.defer=true;script.dataset.onesignalSdk='1';document.head.appendChild(script);
   }
 },[]);

 useEffect(()=>{
   if(typeof window==='undefined' || !pushReady)return;
   const w=window as any; w.OneSignalDeferred=w.OneSignalDeferred||[];
   w.OneSignalDeferred.push(async(OneSignal:any)=>{
     try{if(profile?.id)await OneSignal.login(profile.id);else await OneSignal.logout();}catch(e){console.error('OneSignal identity failed',e);}
   });
 },[profile?.id,pushReady]);

 const loadPublicData=useCallback(async()=>{
   const [m,s,p,v,sea,hm,hs,ps]=await Promise.all([
    supabase.from('matches').select('id,psmf_key,kickoff,venue_code,home_team,away_team,home_score,away_score,season').eq('season',SEASON).order('kickoff'),
    supabase.from('standings').select('rank,team,played,wins,draws,losses,score,points').eq('season',SEASON).order('rank'),
    supabase.rpc('list_public_players'),
    supabase.from('venues').select('code,name,address,notes').order('code'),
    supabase.from('seasons').select('season,label,year,phase,division,team_name,final_rank,played,wins,draws,losses,score,points').order('year',{ascending:false}),
    supabase.from('historical_matches').select('psmf_key,season,kickoff,venue_code,home_team,away_team,home_score,away_score,round,team_name').order('kickoff',{ascending:false}),
    supabase.from('historical_standings').select('season,rank,team,played,wins,draws,losses,score,points').order('rank'),
    supabase.from('player_season_stats').select('season,player_name,games,goals')
   ]);
   if(m.data?.length)setMatches(m.data.map((r:any)=>{const d=new Date(r.kickoff);return{id:r.id,psmfKey:r.psmf_key,date:d.toLocaleDateString('en-CA',{timeZone:'Europe/Prague'}),time:d.toLocaleTimeString('cs-CZ',{timeZone:'Europe/Prague',hour:'2-digit',minute:'2-digit'}),venue:r.venue_code||'',home:r.home_team,away:r.away_team,round:Number(String(r.psmf_key).match(/r(\d+)$/)?.[1]||0),result:r.home_score==null?undefined:`${r.home_score}:${r.away_score}`,homeScore:r.home_score,awayScore:r.away_score,status:r.home_score==null?'upcoming':'past',season:r.season} as Match;}));
   if(s.data?.length)setStandings(s.data.map((r:any)=>[r.team,r.played,r.wins,r.draws,r.losses,r.score,r.points] as Standing));
   if(p.data?.length){const list=p.data.map((r:any)=>({name:r.display_name,games:r.psmf_games??0,goals:r.psmf_goals??0,avatarUrl:r.avatar_url??null}));setPlayers(list);setSelectedPlayer(prev=>list.some((x:PlayerStat)=>x.name===prev)?prev:list[0].name);}
   if(v.data?.length)setVenues(Object.fromEntries(v.data.map((r:any)=>[r.code,r as Venue])));
   if(sea.data?.length){const sorted=(sea.data as Season[]).sort((a,b)=>b.year-a.year||(b.phase==='podzim'?1:0)-(a.phase==='podzim'?1:0));setSeasons(sorted);setHistorySeason(prev=>prev||sorted[0]?.season||'');}
   if(hm.data)setHistoryMatches(hm.data as HistMatch[]); if(hs.data)setHistoryStandings(hs.data as HistStanding[]); if(ps.data)setSeasonStats(ps.data as SeasonStat[]);
   try{const rr=await fetch('/api/history-events',{cache:'no-store'});const jj=await rr.json();if(rr.ok&&jj?.seasons)setHistoryEvents(jj.seasons);}catch(e){console.error('history-events',e);}
 },[]);

 useEffect(()=>{loadPublicData();},[loadPublicData]);
 const next=useMemo(()=>matches.find(m=>m.status==='upcoming'),[matches]); const opponent=next?(next.home===TEAM?next.away:next.home):''; const nextKey=next?.psmfKey??'';
 useEffect(()=>{
   let alive=true;
   if(!session){setPublicRoster([]);return()=>{alive=false;};}
   (async()=>{
     const {data,error}=await supabase.rpc('public_player_roster',{target_match_id:next?.id??null});
     if(!alive)return;
     if(error){console.error('player_roster',error);setPublicRoster([]);return;}
     setPublicRoster((data||[]) as PublicRosterRow[]);
   })();
   return()=>{alive=false;};
 },[next?.id,session?.access_token]);


 const loadComments=useCallback(async()=>{if(!session){setComments([]);return;}const ids=matches.filter(m=>m.status==='upcoming'&&m.id).map(m=>m.id!) ;if(!ids.length)return;const {data}=await supabase.from('match_comments').select('id,match_id,player_id,parent_id,body,created_at,updated_at,players(display_name,avatar_url,role)').in('match_id',ids).order('created_at');if(data)setComments(data.map((r:any)=>({...r,players:Array.isArray(r.players)?r.players[0]??null:r.players??null})) as CommentRow[]);},[session,matches]);
 useEffect(()=>{loadComments();},[loadComments]);

 const loadCabin=useCallback(async(active:Session|null)=>{if(!active||!nextKey){setProfile(null);setAttendance(null);setAttendanceRows([]);setRegisteredPlayers([]);return;}let {data:me}=await supabase.from('players').select('id,display_name,role,user_id,avatar_url').eq('user_id',active.user.id).maybeSingle();const pending=localStorage.getItem('pending-player-name');if(!me&&pending){const {error}=await supabase.rpc('claim_player',{player_name:pending});if(!error){localStorage.removeItem('pending-player-name');const r=await supabase.from('players').select('id,display_name,role,user_id,avatar_url').eq('user_id',active.user.id).maybeSingle();me=r.data;setAuthMessage(t.playerLinked);}}if(me){const {data:boot}=await supabase.rpc('bootstrap_admin');if(boot===true){const r=await supabase.from('players').select('id,display_name,role,user_id,avatar_url').eq('user_id',active.user.id).maybeSingle();me=r.data;}}setProfile(me as Profile|null);
 const registered=await supabase.from('players').select('id,display_name,avatar_url').eq('active',true).not('user_id','is',null).order('display_name');
 setRegisteredPlayers((registered.data||[]) as RegisteredPlayer[]);
 const mr=await supabase.from('matches').select('id').eq('psmf_key',nextKey).maybeSingle();if(!mr.data?.id)return;const board=await supabase.from('attendance').select('status,player_id,players(display_name,avatar_url,registration_id,jersey_number)').eq('match_id',mr.data.id);const normalized=(board.data??[]).map((r:any)=>({...r,players:Array.isArray(r.players)?r.players[0]??null:r.players??null})) as AttendanceRow[];setAttendanceRows(normalized);if(me){
 const own=normalized.find(r=>r.player_id===me!.id)?.status;
 setAttendance(own==='yes'||own==='no'?own:null);
}},[nextKey,t.playerLinked]);
 useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session);loadCabin(data.session);});const {data:sub}=supabase.auth.onAuthStateChange((event,s)=>{setSession(s);if(event==='PASSWORD_RECOVERY'){setAuthMessage('');setResetOpen(true);setAuthOpen(false);setForgotOpen(false);}setTimeout(()=>loadCabin(s),0);});return()=>sub.subscription.unsubscribe();},[loadCabin]);

 async function refreshPsmf(){setSyncing(true);try{const r=await fetch('/api/sync-psmf',{cache:'no-store'});const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body?.error||'sync');await loadPublicData();alert(t.synced);}catch(e:any){alert(e?.message||t.genericError);}finally{setSyncing(false);}}
 function authErrorMessage(err:any){
   const msg=String(err?.message||'');
   if(msg.toLowerCase().includes('rate limit')) return t.rateLimit;
   return msg||t.genericError;
 }
 async function requestPasswordReset(e:FormEvent){
   e.preventDefault();
   if(!email)return;
   setAuthBusy(true);setAuthMessage('');
   try{
     const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/?password-reset=1`});
     if(error)throw error;
     setAuthMessage(t.resetSent);
   }catch(e:any){setAuthMessage(authErrorMessage(e));}
   finally{setAuthBusy(false);}
 }
 async function submitNewPassword(e:FormEvent){
   e.preventDefault();
   setAuthMessage('');
   if(newPassword!==repeatPassword){setAuthMessage(t.passwordMismatch);return;}
   if(newPassword.length<6){setAuthMessage(lang==='cs'?'Heslo musí mít alespoň 6 znaků.':'Password must be at least 6 characters.');return;}
   setAuthBusy(true);
   try{
     const {error}=await supabase.auth.updateUser({password:newPassword});
     if(error)throw error;
     setAuthMessage(t.passwordChanged);
     setNewPassword('');setRepeatPassword('');
     setTimeout(()=>{setResetOpen(false);setAuthOpen(true);setAuthMode('login');},900);
   }catch(e:any){setAuthMessage(authErrorMessage(e));}
   finally{setAuthBusy(false);}
 }
 async function submitAuth(e:FormEvent){e.preventDefault();setAuthBusy(true);setAuthMessage('');try{if(authMode==='signup'){localStorage.setItem('pending-player-name',selectedPlayer);const {error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin}});if(error)throw error;setAuthMessage(t.confirmEmail);}else{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;setAuthOpen(false);}}catch(e:any){setAuthMessage(authErrorMessage(e));}finally{setAuthBusy(false);}}
 async function logout(){await supabase.auth.signOut();setProfile(null);setAttendance(null);setAttendanceRows([]);setRegisteredPlayers([]);}
 async function resendConfirmation(){if(!email){setAuthMessage(lang==='cs'?'Nejdřív vyplň e-mail.':'Enter your email first.');return;}setAuthBusy(true);try{const {error}=await supabase.auth.resend({type:'signup',email,options:{emailRedirectTo:window.location.origin}});if(error)throw error;setAuthMessage(t.resent);}catch(e:any){setAuthMessage(authErrorMessage(e));}finally{setAuthBusy(false);}}
 async function setA(v:'yes'|'no'){if(!session||!profile||!next?.id){setAuthOpen(true);return;}setSaving(true);try{const {error}=await supabase.from('attendance').upsert({match_id:next.id,player_id:profile.id,status:v,updated_at:new Date().toISOString()},{onConflict:'match_id,player_id'});if(error)throw error;setAttendance(v);await loadCabin(session);}catch(e:any){alert(e?.message||t.genericError);}finally{setSaving(false);}}
 async function clearA(){if(!profile||!next?.id)return;setSaving(true);try{const {error}=await supabase.from('attendance').delete().eq('match_id',next.id).eq('player_id',profile.id);if(error)throw error;setAttendance(null);await loadCabin(session);}catch(e:any){alert(e?.message||t.genericError);}finally{setSaving(false);}}
 async function sendTestReminder(){if(!session)return;setReminderBusy(true);try{const r=await fetch('/api/send-reminders',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`}});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b?.error||'reminder');alert(t.testReminderSent);}catch(e:any){alert(e?.message||t.genericError);}finally{setReminderBusy(false);}}
 async function enablePush(){
   if(!session||!profile){setAuthOpen(true);return;}
   if(isIos&&!isStandalone){alert(t.iosInstall);return;}
   if(pushPermission==='denied'){alert(t.pushDenied);return;}
   setPushBusy(true);
   try{
     const w=window as any;w.OneSignalDeferred=w.OneSignalDeferred||[];
     await new Promise<void>((resolve,reject)=>w.OneSignalDeferred.push(async(OneSignal:any)=>{try{await OneSignal.login(profile.id);await OneSignal.Notifications.requestPermission();setPushPermission(Notification.permission as 'default'|'granted'|'denied');resolve();}catch(e){reject(e);}}));
   }catch(e:any){alert(e?.message||t.genericError);}finally{setPushBusy(false);}
 }
 async function sendTestPush(){if(!session||!profile)return;setPushBusy(true);try{const r=await fetch('/api/push-notifications',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({mode:'test'})});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b?.error||'push');alert(t.pushTestSent);}catch(e:any){alert(e?.message||t.genericError);}finally{setPushBusy(false);}}
 async function sendAdminPush(){
   if(!session||profile?.role!=='admin')return;
   if(!adminPushTitle.trim()||!adminPushMessage.trim())return;
   if(!adminPushPlayers.length){alert(lang==='cs'?'Vyber alespoň jednoho příjemce.':'Select at least one recipient.');return;}
   setAdminPushBusy(true);
   try{
     const r=await fetch('/api/push-notifications',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({mode:'admin',title:adminPushTitle.trim(),message:adminPushMessage.trim(),playerIds:adminPushPlayers})});
     const b=await r.json().catch(()=>({}));
     if(!r.ok)throw new Error(b?.error||'push');
     alert(`${t.pushSent} (${b?.count??adminPushPlayers.length})`);
     setAdminPushMessage('');
   }catch(e:any){alert(e?.message||t.genericError);}
   finally{setAdminPushBusy(false);}
 }
 function openVenue(code:string){const v=venues[code];if(v)setVenueOpen(v);else window.open(googleMaps(`${code} PSMF Praha`),'_blank','noopener,noreferrer');}
 const openVenueFromMap=useCallback((code:string)=>{const v=venues[code];if(v)setVenueOpen(v);else window.open(googleMaps(`${code} PSMF Praha`),'_blank','noopener,noreferrer');},[venues]);

 async function postComment(matchId:string,parentId:string|null=null){if(!profile){setAuthOpen(true);return;}const key=parentId?`${matchId}:${parentId}`:matchId;const body=(commentDrafts[key]||'').trim();if(!body)return;setCommentBusy(key);try{const {error}=await supabase.from('match_comments').insert({match_id:matchId,player_id:profile.id,parent_id:parentId,body});if(error)throw error;setCommentDrafts(d=>({...d,[key]:''}));setReplyTo(r=>({...r,[matchId]:null}));await loadComments();}catch(e:any){alert(e?.message||t.genericError);}finally{setCommentBusy(null);}}
 async function deleteComment(c:CommentRow){if(!confirm(lang==='cs'?'Smazat komentář?':'Delete comment?'))return;const {error}=await supabase.from('match_comments').delete().eq('id',c.id);if(error)alert(error.message);else await loadComments();}
 async function editComment(c:CommentRow){const body=prompt(lang==='cs'?'Upravit komentář':'Edit comment',c.body)?.trim();if(!body||body===c.body)return;const {error}=await supabase.from('match_comments').update({body,updated_at:new Date().toISOString()}).eq('id',c.id);if(error)alert(error.message);else await loadComments();}
 async function uploadAvatar(e:ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!file||!session||!profile)return;if(file.size>5*1024*1024){alert('Max. 5 MB');return;}setAvatarBusy(true);try{const ext=file.name.split('.').pop()?.toLowerCase()||'jpg';const path=`${session.user.id}/avatar-${Date.now()}.${ext}`;const {error}=await supabase.storage.from('player-avatars').upload(path,file,{upsert:true});if(error)throw error;const {data}=supabase.storage.from('player-avatars').getPublicUrl(path);const finalUrl=`${data.publicUrl}?v=${Date.now()}`;const rpc=await supabase.rpc('set_my_avatar',{url:finalUrl});if(rpc.error)throw rpc.error;const refreshed=await supabase.from('players').select('id,display_name,role,user_id,avatar_url').eq('user_id',session.user.id).maybeSingle();if(refreshed.data)setProfile(refreshed.data as Profile);else setProfile({...profile,avatar_url:finalUrl});await loadPublicData();}catch(err:any){alert(err?.message||t.genericError);}finally{setAvatarBusy(false);e.target.value='';}}
 async function loadAdminPlayers(){
   if(profile?.role!=='admin')return;
   const {data,error}=await supabase.rpc('admin_list_players');
   if(error){alert(error.message);return;}
   const list=(data||[]) as AdminPlayer[];
   setAdminPlayers(list);
   setPlayerDataDrafts(Object.fromEntries(list.map(p=>[p.id,{registration_id:p.registration_id||'',jersey_number:p.jersey_number==null?'':String(p.jersey_number)}])));
   // Default push recipients = registered active players who have NOT answered yes/no.
   const answered=new Set(attendanceRows.filter(r=>r.status==='yes'||r.status==='no').map(r=>r.player_id));
   const unanswered=list.filter(p=>p.user_id&&p.active&&!answered.has(p.id)).map(p=>p.id);
   setAdminPushPlayers(unanswered);
 }
 async function openAdmin(){setAdminOpen(true);await loadAdminPlayers();}
 async function setPlayerRole(id:string,role:'player'|'captain'|'admin'){setAdminBusy(id);try{const {error}=await supabase.rpc('admin_set_player_role',{target_player_id:id,new_role:role});if(error)throw error;await loadAdminPlayers();if(id===profile?.id)await loadCabin(session);}catch(e:any){alert(e?.message||t.genericError);}finally{setAdminBusy(null);}}
 async function setPlayerActive(id:string,active:boolean){setAdminBusy(id);try{const {error}=await supabase.rpc('admin_set_player_active',{target_player_id:id,new_active:active});if(error)throw error;await loadAdminPlayers();}catch(e:any){alert(e?.message||t.genericError);}finally{setAdminBusy(null);}}
 async function unlinkPlayer(id:string){if(!confirm(lang==='cs'?'Odpojit účet od tohoto hráče?':'Unlink this account from the player?'))return;setAdminBusy(id);try{const {error}=await supabase.rpc('admin_unlink_player',{target_player_id:id});if(error)throw error;await loadAdminPlayers();}catch(e:any){alert(e?.message||t.genericError);}finally{setAdminBusy(null);}}


 async function savePlayerData(id:string){
   if(profile?.role!=='admin')return;
   const d=playerDataDrafts[id]||{registration_id:'',jersey_number:''};
   const jersey=d.jersey_number.trim()===''?null:Number(d.jersey_number);
   if(jersey!==null&&(!Number.isInteger(jersey)||jersey<0||jersey>99)){alert(lang==='cs'?'Číslo dresu musí být 0–99.':'Jersey number must be 0–99.');return;}
   setAdminBusy(id);
   try{
     const {error}=await supabase.rpc('admin_set_player_game_data',{target_player_id:id,new_registration_id:d.registration_id.trim()||null,new_jersey_number:jersey});
     if(error)throw error;
     await loadAdminPlayers();
     await loadCabin(session);
   }catch(e:any){alert(e?.message||t.genericError);}finally{setAdminBusy(null);}
 }


 async function exportPlayerIdsPdf(){
   if(typeof window==='undefined'||pdfBusy)return;
   const source=document.getElementById('player-ids-export');
   if(!source)return;
   setPdfBusy(true);
   try{
     const [{default:html2canvas},{jsPDF}]=await Promise.all([import('html2canvas'),import('jspdf')]);
     const clone=source.cloneNode(true) as HTMLElement;
     clone.querySelectorAll('.noPdf').forEach(el=>el.remove());
     clone.querySelectorAll('.printOnly').forEach(el=>(el as HTMLElement).style.display='table-cell');
     clone.querySelectorAll('.printMatchTitle').forEach(el=>(el as HTMLElement).style.display='flex');
     Object.assign(clone.style,{
       position:'fixed',left:'-10000px',top:'0',width:'794px',maxWidth:'794px',
       background:'#ffffff',padding:'34px',margin:'0',boxShadow:'none',border:'0',
       zIndex:'-1',overflow:'visible'
     });
     clone.querySelectorAll<HTMLElement>('.tableWrap').forEach(el=>el.style.overflow='visible');
     document.body.appendChild(clone);
     await new Promise(resolve=>setTimeout(resolve,80));
     const canvas=await html2canvas(clone,{scale:2,backgroundColor:'#ffffff',useCORS:true,logging:false});
     clone.remove();

     const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
     const pageW=210,pageH=297,margin=8;
     const maxW=pageW-margin*2,maxH=pageH-margin*2;
     const ratio=Math.min(maxW/canvas.width,maxH/canvas.height);
     const imgW=canvas.width*ratio,imgH=canvas.height*ratio;
     const x=(pageW-imgW)/2,y=(pageH-imgH)/2;
     pdf.addImage(canvas.toDataURL('image/jpeg',0.92),'JPEG',x,y,imgW,imgH,undefined,'FAST');

     const blob=pdf.output('blob');
     if(pdfPreviewUrl)URL.revokeObjectURL(pdfPreviewUrl);
     setPdfPreviewUrl(URL.createObjectURL(blob));
   }catch(e:any){
     console.error(e);
     alert(e?.message||t.genericError);
   }finally{setPdfBusy(false);}
 }


 async function adminAvatarUpload(e:ChangeEvent<HTMLInputElement>){
   const file=e.target.files?.[0]; const playerId=adminAvatarTarget;
   if(!file||!playerId||!session||profile?.role!=='admin')return;
   if(file.size>5*1024*1024){alert('Max. 5 MB');return;}
   setAdminAvatarBusy(playerId);
   try{
     const fd=new FormData(); fd.append('playerId',playerId); fd.append('file',file);
     const r=await fetch('/api/admin-player-avatar',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`},body:fd});
     const b=await r.json().catch(()=>({})); if(!r.ok)throw new Error(b?.error||'avatar');
     await loadAdminPlayers(); await loadPublicData(); alert(t.photoChanged);
   }catch(err:any){alert(err?.message||t.genericError);}
   finally{setAdminAvatarBusy(null);setAdminAvatarTarget(null);e.target.value='';}
 }
 async function adminRemoveAvatar(playerId:string){
   if(!session||profile?.role!=='admin')return;
   if(!confirm(lang==='cs'?'Opravdu smazat profilovou fotku tohoto hráče?':'Remove this player photo?'))return;
   setAdminAvatarBusy(playerId);
   try{
     const r=await fetch('/api/admin-player-avatar',{method:'DELETE',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({playerId})});
     const b=await r.json().catch(()=>({})); if(!r.ok)throw new Error(b?.error||'avatar');
     await loadAdminPlayers(); await loadPublicData(); alert(t.photoRemoved);
   }catch(err:any){alert(err?.message||t.genericError);}
   finally{setAdminAvatarBusy(null);}
 }



 const loadTeamPosts=useCallback(async()=>{
   if(!session?.access_token){setTeamPosts([]);return;}
   setTeamPostsBusy(true);
   try{
     const r=await fetch('/api/team-posts',{headers:{Authorization:`Bearer ${session.access_token}`}});
     const b=await r.json().catch(()=>({}));
     if(!r.ok)throw new Error(b?.error||'posts');
     setTeamPosts(Array.isArray(b?.posts)?b.posts:[]);
   }catch(e:any){console.error('team posts',e);setTeamPosts([]);}
   finally{setTeamPostsBusy(false);}
 },[session?.access_token]);

 useEffect(()=>{void loadTeamPosts();},[loadTeamPosts]);

 async function publishTeamPost(){
   if(!session||!profile||!['admin','captain'].includes(profile.role))return;
   const title=postTitle.trim(),body=postBody.trim();
   if(!title||!body)return;
   const options=postPollOptions.map(x=>x.trim()).filter(Boolean);
   if(postPollEnabled&&(!postPollQuestion.trim()||options.length<2)){
     alert(lang==='cs'?'Anketa musí mít otázku a alespoň dvě možnosti.':'A poll needs a question and at least two options.');
     return;
   }
   setPostPublishing(true);
   try{
     const r=await fetch('/api/team-posts',{
       method:'POST',
       headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},
       body:JSON.stringify({
         title,body,
         pollQuestion:postPollEnabled?postPollQuestion.trim():null,
         pollOptions:postPollEnabled?options:[],
         sendEmail:postSendEmail,
         sendPush:postSendPush
       })
     });
     const b=await r.json().catch(()=>({}));
     if(!r.ok)throw new Error(b?.error||'post');
     setPostTitle('');setPostBody('');setPostPollEnabled(false);setPostPollQuestion('');setPostPollOptions(['Ano','Ne']);setPostSendEmail(false);setPostSendPush(false);
     await loadTeamPosts();
     if(Array.isArray(b?.warnings)&&b.warnings.length)alert(`${t.notificationWarning}\n\n${b.warnings.join('\n')}`);
     else alert(t.published);
   }catch(e:any){alert(e?.message||t.genericError);}
   finally{setPostPublishing(false);}
 }

 async function voteTeamPost(postId:string,optionId:string){
   if(!session||!profile){setAuthOpen(true);return;}
   try{
     const r=await fetch('/api/team-post-vote',{
       method:'POST',
       headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},
       body:JSON.stringify({postId,optionId})
     });
     const b=await r.json().catch(()=>({}));
     if(!r.ok)throw new Error(b?.error||'vote');
     await loadTeamPosts();
   }catch(e:any){alert(e?.message||t.genericError);}
 }

 async function deleteTeamPost(postId:string){
   if(!session||!profile||!['admin','captain'].includes(profile.role))return;
   if(!confirm(lang==='cs'?'Opravdu smazat tento příspěvek?':'Delete this post?'))return;
   try{
     const r=await fetch(`/api/team-posts?id=${encodeURIComponent(postId)}`,{method:'DELETE',headers:{Authorization:`Bearer ${session.access_token}`}});
     const b=await r.json().catch(()=>({}));
     if(!r.ok)throw new Error(b?.error||'delete');
     await loadTeamPosts();
   }catch(e:any){alert(e?.message||t.genericError);}
 }


 function scrollStats(ref:{current:HTMLDivElement|null},direction:-1|1){
   ref.current?.scrollBy({left:direction*420,behavior:'smooth'});
 }


 function renderMobileStatCard(name:string,games:number,goals:number,x:{yellow:number;red:number;motm:number;keeper:number;captain:number;keeperGoalsAgainst:number},avatarUrl?:string|null){
   return <article className="mobileStatCard" key={`mobile-${name}`}>
     <div className="mobileStatPlayer">
       {avatar(name,avatarUrl||null,'sm')}
       <div><strong>{name}</strong><span>{games} {lang==='cs'?'záp.':'apps'} · {games*60} min</span></div>
     </div>
     <div className="mobileStatGrid">
       <div><span>{t.goals}</span><b>{goals}</b></div>
       <div><span>{t.yellowCards}</span><b>{x.yellow}</b></div>
       <div><span>{t.redCards}</span><b>{x.red}</b></div>
       <div><span>{t.motm}</span><b>{x.motm}</b></div>
       <div><span>{t.captain}</span><b>{x.captain}</b></div>
       <div><span>{t.keeper}</span><b>{x.keeper}</b></div>
       {x.keeper>0&&<div className="wide"><span>{t.goalsConceded}</span><b>{x.keeperGoalsAgainst}</b></div>}
     </div>
   </article>;
 }


 const responseGroups={yes:attendanceRows.filter(r=>r.status==='yes'),no:attendanceRows.filter(r=>r.status==='no')};
 const expressedPlayerIds=new Set([...responseGroups.yes,...responseGroups.no].map(r=>r.player_id));
 const unansweredPlayers=registeredPlayers.filter(p=>!expressedPlayerIds.has(p.id));
 const answeredCount=responseGroups.yes.length+responseGroups.no.length;
 const nextAttendanceNeedsAnswer=Boolean(profile&&next&&!attendanceRows.some(r=>r.player_id===profile.id&&(r.status==='yes'||r.status==='no')));
 const openPollCount=profile?teamPosts.filter(p=>p.pollQuestion&&p.options.length>=2&&!p.myOptionId).length:0;

 const selectedSeason=seasons.find(s=>s.season===historySeason); const selectedSeasonMatches=historyMatches.filter(m=>m.season===historySeason).sort((a,b)=>+new Date(a.kickoff)-+new Date(b.kickoff)); const selectedHistoricalStanding=historyStandings.filter(r=>r.season===historySeason).sort((a,b)=>a.rank-b.rank);
 const opponents=useMemo(()=>Array.from(new Set([...historyMatches.flatMap(m=>[m.home_team,m.away_team]),...matches.flatMap(m=>[m.home,m.away])].filter(n=>!ours(n)))).sort((a,b)=>a.localeCompare(b,'cs')),[historyMatches,matches]);
 useEffect(()=>{if(!h2hOpponent&&opponents.length)setH2hOpponent(opponent&&opponents.includes(opponent)?opponent:opponents[0]);},[opponents,h2hOpponent,opponent]);
 const h2h=historyMatches.filter(m=>m.home_team===h2hOpponent||m.away_team===h2hOpponent).sort((a,b)=>+new Date(b.kickoff)-+new Date(a.kickoff));
 const h2hTotals=h2h.reduce((a,m)=>{const o=outcome(m.home_team,m.away_team,m.home_score,m.away_score);if(o==='win')a.w++;else if(o==='draw')a.d++;else if(o==='loss')a.l++;return a;},{w:0,d:0,l:0});
 const career=useMemo(()=>{const map=new Map<string,{name:string,games:number,goals:number}>();for(const r of seasonStats){const x=map.get(r.player_name)||{name:r.player_name,games:0,goals:0};x.games+=r.games;x.goals+=r.goals;map.set(r.player_name,x);}return [...map.values()].sort((a,b)=>b.goals-a.goals||b.games-a.games||a.name.localeCompare(b.name,'cs'));},[seasonStats]);
 function playerKey(name:string){return stripDiacritics(name).split(/\s+/).filter(Boolean).sort().join('|');}
 function eventForMatch(m:HistMatch){return (historyEvents[m.season]||[]).find(e=>e.date===m.kickoff.slice(0,10));}

 const eventTotals=useMemo(()=>{
  const map=new Map<string,{yellow:number;red:number;motm:number;keeper:number;captain:number;keeperGoalsAgainst:number}>();
  for(const evs of Object.values(historyEvents))for(const ev of evs){
   for(const x of ev.yellowCards){const k=playerKey(x.player),v=map.get(k)||{yellow:0,red:0,motm:0,keeper:0,captain:0,keeperGoalsAgainst:0};v.yellow++;map.set(k,v);}
   for(const x of ev.redCards){const k=playerKey(x.player),v=map.get(k)||{yellow:0,red:0,motm:0,keeper:0,captain:0,keeperGoalsAgainst:0};v.red++;map.set(k,v);}
   for(const name of ev.manOfMatch){const k=playerKey(name),v=map.get(k)||{yellow:0,red:0,motm:0,keeper:0,captain:0,keeperGoalsAgainst:0};v.motm++;map.set(k,v);}
   for(const name of ev.goalkeepers||[]){const k=playerKey(name),v=map.get(k)||{yellow:0,red:0,motm:0,keeper:0,captain:0,keeperGoalsAgainst:0};v.keeper++;map.set(k,v);}
   for(const name of ev.captains||[]){const k=playerKey(name),v=map.get(k)||{yellow:0,red:0,motm:0,keeper:0,captain:0,keeperGoalsAgainst:0};v.captain++;map.set(k,v);}
  }
  // Goals conceded are assigned to the first-listed goalkeeper for each historical match.
  for(const match of historyMatches){
   const ev=(historyEvents[match.season]||[]).find(e=>e.date===match.kickoff.slice(0,10));
   const gk=ev?.goalkeepers?.[0];
   if(!gk)continue;
   const k=playerKey(gk),v=map.get(k)||{yellow:0,red:0,motm:0,keeper:0,captain:0,keeperGoalsAgainst:0};
   const conceded=ours(match.home_team)?match.away_score:match.home_score;
   v.keeperGoalsAgainst+=Number(conceded||0);
   map.set(k,v);
  }
  return map;
 },[historyEvents,historyMatches]);

 const currentEventTotals=useMemo(()=>{
  const map=new Map<string,{yellow:number;red:number;motm:number;keeper:number;captain:number;keeperGoalsAgainst:number}>();
  for(const ev of historyEvents['2026-podzim']||[]){
   for(const x of ev.yellowCards){const k=playerKey(x.player),v=map.get(k)||{yellow:0,red:0,motm:0,keeper:0,captain:0,keeperGoalsAgainst:0};v.yellow++;map.set(k,v);}
   for(const x of ev.redCards){const k=playerKey(x.player),v=map.get(k)||{yellow:0,red:0,motm:0,keeper:0,captain:0,keeperGoalsAgainst:0};v.red++;map.set(k,v);}
   for(const name of ev.manOfMatch){const k=playerKey(name),v=map.get(k)||{yellow:0,red:0,motm:0,keeper:0,captain:0,keeperGoalsAgainst:0};v.motm++;map.set(k,v);}
   for(const name of ev.goalkeepers||[]){const k=playerKey(name),v=map.get(k)||{yellow:0,red:0,motm:0,keeper:0,captain:0,keeperGoalsAgainst:0};v.keeper++;map.set(k,v);}
   for(const name of ev.captains||[]){const k=playerKey(name),v=map.get(k)||{yellow:0,red:0,motm:0,keeper:0,captain:0,keeperGoalsAgainst:0};v.captain++;map.set(k,v);}
  }
  for(const match of historyMatches.filter(m=>m.season==='2026-podzim')){
   const ev=(historyEvents[match.season]||[]).find(e=>e.date===match.kickoff.slice(0,10));
   const gk=ev?.goalkeepers?.[0];
   if(!gk)continue;
   const k=playerKey(gk),v=map.get(k)||{yellow:0,red:0,motm:0,keeper:0,captain:0,keeperGoalsAgainst:0};
   const conceded=ours(match.home_team)?match.away_score:match.home_score;
   v.keeperGoalsAgainst+=Number(conceded||0);
   map.set(k,v);
  }
  return map;
 },[historyEvents,historyMatches]);
 const allTime=useMemo(()=>{
  let w=0,d=0,l=0,gf=0,ga=0;
  const list=historyMatches.filter(m=>Number(m.season.slice(0,4))>=2015);
  for(const m of list){
   const home=ours(m.home_team);
   const a=home?m.home_score:m.away_score;
   const b=home?m.away_score:m.home_score;
   gf+=a;ga+=b;
   if(a>b)w++;else if(a===b)d++;else l++;
  }
  const games=w+d+l;
  return {games,w,d,l,gf,ga,winRate:games?Math.round((w/games)*100):0};
 },[historyMatches]);



 function renderDiscussion(match:Match){if(!match.id)return null;const rows=comments.filter(c=>c.match_id===match.id);const roots=rows.filter(c=>!c.parent_id);const draft=commentDrafts[match.id]||'';return <div className="discussion"><div className="discussionTitle"><MessageCircle size={18}/><strong>{t.comments}</strong><span>{rows.length}</span></div>{session&&profile?<><div className="commentComposer"><textarea value={draft} maxLength={1000} placeholder={t.writeComment} onChange={e=>setCommentDrafts(d=>({...d,[match.id!]:e.target.value}))}/><button onClick={()=>postComment(match.id!)} disabled={!draft.trim()||commentBusy===match.id}>{t.send}</button></div>{roots.length===0&&<p className="muted smallText">{t.noComments}</p>}{roots.map(c=>renderCommentItem(c,rows.filter(r=>r.parent_id===c.id),match.id!))}</>:<button className="textBtn" onClick={()=>setAuthOpen(true)}>{t.loginNeeded}</button>}</div>;}
 function renderCommentItem(c:CommentRow,replies:CommentRow[],matchId:string){const canManage=profile&&(profile.id===c.player_id||profile.role==='admin'||profile.role==='captain');const rk=`${matchId}:${c.id}`;return <div className="commentThread"><div className="comment"><div>{avatar(c.players?.display_name||'?',c.players?.avatar_url,'sm')}</div><div className="commentBody"><div className="commentMeta"><strong>{c.players?.display_name||'Hráč'}</strong><span>{fmtDateTime(c.created_at,lang)}</span></div><p>{c.body}</p><div className="commentActions"><button onClick={()=>setReplyTo(r=>({...r,[matchId]:r[matchId]===c.id?null:c.id}))}><Reply size={14}/>{t.reply}</button>{canManage&&<><button onClick={()=>editComment(c)}><Pencil size={14}/>{t.edit}</button><button onClick={()=>deleteComment(c)}><Trash2 size={14}/>{t.delete}</button></>}</div></div></div>{replies.map(r=><div className="comment replyComment" key={r.id}><div>{avatar(r.players?.display_name||'?',r.players?.avatar_url,'sm')}</div><div className="commentBody"><div className="commentMeta"><strong>{r.players?.display_name||'Hráč'}</strong><span>{fmtDateTime(r.created_at,lang)}</span></div><p>{r.body}</p>{profile&&(profile.id===r.player_id||profile.role==='admin'||profile.role==='captain')&&<div className="commentActions"><button onClick={()=>editComment(r)}><Pencil size={14}/>{t.edit}</button><button onClick={()=>deleteComment(r)}><Trash2 size={14}/>{t.delete}</button></div>}</div></div>)}{replyTo[matchId]===c.id&&<div className="replyComposer"><input value={commentDrafts[rk]||''} maxLength={1000} placeholder={`${t.reply}…`} onChange={e=>setCommentDrafts(d=>({...d,[rk]:e.target.value}))}/><button onClick={()=>postComment(matchId,c.id)}>{t.send}</button></div>}</div>;}

 return <main className="shell">
  <header className="teamHeroHeader"><div className="heroShade"/><div className="heroHeaderContent"><div><div className="tag light">{t.tagline}</div><h1>Pěstební dělníci<br className="mobileBreak"/> A<span>.</span></h1></div><div className="actions"><button className="glassBtn" onClick={()=>setLang(lang==='cs'?'en':'cs')}><Languages size={18}/>{lang==='cs'?'EN':'CZ'}</button>{session?<button className="glassBtn" onClick={logout}><LogOut size={18}/><span className="desktopOnly">{t.logout}</span></button>:<button className="glassBtn" onClick={()=>{setAuthMode('login');setAuthOpen(true)}}><LogIn size={18}/><span className="desktopOnly">{t.login}</span></button>}</div></div></header>
  {profile&&<div className="signedStrip">{avatar(profile.display_name,profile.avatar_url,'sm')}<span>{t.signedAs}: <strong>{profile.display_name}</strong></span></div>}
  <section className="sourceCard"><div><strong>{t.league}</strong><div className="muted">{t.verified}</div></div><div className="actions"><button className="ghost" onClick={refreshPsmf} disabled={syncing}><RefreshCw size={18}/>{syncing?'…':t.refresh}</button><a href={SOURCE_URL} target="_blank" rel="noreferrer" className="ghost"><ExternalLink size={16}/></a></div></section>
  <nav className="tabs">{((['matches','board','table','stats','history','h2h','map'] as Tab[]).filter(k=>k!=='board'||Boolean(profile))).map(k=>{
   const badge=k==='matches'&&nextAttendanceNeedsAnswer?1:k==='board'?openPollCount:0;
   return <button key={k} className={tab===k?'active':''} onClick={()=>setTab(k)}>
     <span className="tabLabel">{k==='board'?<><Megaphone size={15}/>{t.board}</>:k==='map'?<><MapIcon size={15}/>{t.map}</>:t[k]}</span>
     {badge>0&&<span className="tabBadge">{badge>9?'9+':badge}</span>}
   </button>
 })}{profile&&<button className={tab==='ids'?'active':''} onClick={()=>setTab('ids')}><UserRound size={15}/>{t.ids}</button>}{profile?.role==='admin'&&<button className={tab==='admin'?'active':''} onClick={()=>{setTab('admin');loadAdminPlayers();}}><ShieldCheck size={15}/>{t.adminTab}</button>}</nav>

  {tab==='matches'&&<>{next?<><section className="intro"><div><h2>{t.heading}</h2><p>{t.sub}</p></div><div className="seasonBadge"><ShieldCheck size={17}/>5D</div></section><section className="heroCard"><div className="heroTop"><span>{t.next}</span><b>{next.home===TEAM?t.home:t.away}</b></div><div className="teams"><div><small>{TEAM}</small><h3>{opponent}</h3></div><div className="vs">VS</div></div><div className="meta"><span><CalendarDays size={20}/>{fmtDate(next.date,lang)} · {next.time}</span><button className="venueBtn" onClick={()=>openVenue(next.venue)}><MapPin size={20}/>{next.venue}</button></div><hr/><div className="attendanceHead"><strong>{t.count}</strong><span>{answeredCount} / {registeredPlayers.length}</span></div>{session&&profile?<><div className="attendance attendanceTwo"><button disabled={saving} className={attendance==='yes'?'picked':''} onClick={()=>setA('yes')}>✓ {t.yes}</button><button disabled={saving} className={attendance==='no'?'picked':''} onClick={()=>setA('no')}>× {t.no}</button></div>{attendance&&<div className="savedRow"><p className="saved">{t.saved}</p><button className="textBtn dangerText" onClick={clearA} disabled={saving}>{t.cancel}</button></div>}</>:<button className="loginCta" onClick={()=>setAuthOpen(true)}><LogIn size={18}/>{t.loginNeeded}</button>}{session&&<div className="responseBoard"><h4>{t.responses}</h4><div className="responseCols">
 <div><b>✓ {t.yes} ({responseGroups.yes.length})</b>{responseGroups.yes.map(r=><span key={r.player_id}>{avatar(r.players?.display_name||'?',r.players?.avatar_url,'xs')}{r.players?.display_name}</span>)}</div>
 <div><b>× {t.no} ({responseGroups.no.length})</b>{responseGroups.no.map(r=><span key={r.player_id}>{avatar(r.players?.display_name||'?',r.players?.avatar_url,'xs')}{r.players?.display_name}</span>)}</div>
 <div><b>? {t.unanswered} ({unansweredPlayers.length})</b>{unansweredPlayers.map(p=><span key={p.id}>{avatar(p.display_name,p.avatar_url,'xs')}{p.display_name}</span>)}</div>
 </div></div>}{renderDiscussion(next)}</section></>:<section className="panel"><p>Žádný další zápas není v PSMF naplánovaný.</p></section>}
   <h3 className="sectionTitle">{t.upcoming}</h3><div className="list">{matches.filter(m=>m.status==='upcoming').slice(1).map(m=><article className="matchCard" key={m.psmfKey||m.date+m.time}><div className="matchRow"><div className="dateBox"><b>{fmtDate(m.date,lang)}</b><span>{m.time}</span></div><div className="matchTeams"><b>{m.home}</b><span>vs</span><b>{m.away}</b></div><button className="venueBtn" onClick={()=>openVenue(m.venue)}><MapPin size={17}/>{m.venue}</button></div>{renderDiscussion(m)}</article>)}</div>
   <h3 className="sectionTitle">{t.past}</h3><div className="list">{matches.filter(m=>m.status==='past').slice().reverse().map(m=><article className={`matchRow resultRow ${outcome(m.home,m.away,m.homeScore,m.awayScore)}`} key={m.psmfKey||m.date}><div className="dateBox"><b>{fmtDate(m.date,lang)}</b><span>{m.time}</span></div><div className="matchTeams"><b>{m.home}</b><span className="result">{m.result}</span><b>{m.away}</b></div><button className="venueBtn venueText" onClick={()=>openVenue(m.venue)}>{m.venue}</button></article>)}</div></>}

  {tab==='board'&&<section className="boardSection">
    <div className="boardHero">
      <div><span className="boardEyebrow"><Megaphone size={15}/>{lang==='cs'?'TÝMOVÁ NÁSTĚNKA':'TEAM BOARD'}</span><h2>{t.board}</h2><p>{t.boardIntro}</p></div>
      {profile&&['admin','captain'].includes(profile.role)&&<span className="boardRole">{profile.role==='admin'?t.admin:t.captain}</span>}
    </div>

    {profile&&['admin','captain'].includes(profile.role)&&<div className="postComposer">
      <div className="postComposerHead"><div className="postComposerIcon"><Plus size={20}/></div><div><strong>{t.newPost}</strong><span>{lang==='cs'?'Zveřejní se okamžitě na nástěnce.':'Published immediately to the board.'}</span></div></div>
      <div className="postFields">
        <label><span>{t.postTitle}</span><input value={postTitle} maxLength={120} onChange={e=>setPostTitle(e.target.value)} placeholder={lang==='cs'?'Např. Zápisné 2026/27':'e.g. Membership fee 2026/27'}/></label>
        <label><span>{t.postBody}</span><textarea value={postBody} maxLength={4000} onChange={e=>setPostBody(e.target.value)} placeholder={lang==='cs'?'Napiš vše důležité pro tým…':'Write the important information for the team…'}/></label>
      </div>
      <label className="pollToggle"><input type="checkbox" checked={postPollEnabled} onChange={e=>setPostPollEnabled(e.target.checked)}/><Vote size={17}/><span>{t.addPoll}</span></label>
      {postPollEnabled&&<div className="pollBuilder">
        <label><span>{t.pollQuestion}</span><input value={postPollQuestion} maxLength={240} onChange={e=>setPostPollQuestion(e.target.value)} placeholder={lang==='cs'?'Např. Máš už zápisné zaplacené?':'e.g. Have you paid the fee?'}/></label>
        <div className="pollOptionBuilder">{postPollOptions.map((opt,i)=><div key={i}><span>{i+1}</span><input value={opt} maxLength={120} onChange={e=>setPostPollOptions(v=>v.map((x,j)=>j===i?e.target.value:x))}/>{postPollOptions.length>2&&<button type="button" onClick={()=>setPostPollOptions(v=>v.filter((_,j)=>j!==i))}><X size={14}/></button>}</div>)}</div>
        {postPollOptions.length<8&&<button type="button" className="addPollOption" onClick={()=>setPostPollOptions(v=>[...v,''])}><Plus size={14}/>{t.addOption}</button>}
      </div>}
      <div className="notifyChoices">
        <label><input type="checkbox" checked={postSendEmail} onChange={e=>setPostSendEmail(e.target.checked)}/><span className="notifyIcon email"><Mail size={17}/></span><div><strong>{t.sendEmailAll}</strong><small>{lang==='cs'?'Všem aktivním hráčům, kteří mají účet a e-mail.':'All active players with an account and email.'}</small></div></label>
        <label><input type="checkbox" checked={postSendPush} onChange={e=>setPostSendPush(e.target.checked)}/><span className="notifyIcon push"><Bell size={17}/></span><div><strong>{t.sendPushAll}</strong><small>{lang==='cs'?'Dostanou ji hráči, kteří mají push povolený.':'Players who enabled push will receive it.'}</small></div></label>
      </div>
      <button className="publishPostBtn" disabled={postPublishing||!postTitle.trim()||!postBody.trim()} onClick={publishTeamPost}><Send size={17}/>{postPublishing?'…':t.publishPost}</button>
    </div>}

    {!profile&&<div className="boardLogin"><UserRound size={24}/><div><strong>{t.loginNeeded}</strong><span>{lang==='cs'?'Příspěvky a ankety jsou určené členům týmu.':'Posts and polls are for team members.'}</span></div><button className="miniBtn" onClick={()=>setAuthOpen(true)}>{t.login}</button></div>}

    {profile&&<div className="boardFeed">
      {teamPostsBusy&&<div className="boardEmpty">{lang==='cs'?'Načítám nástěnku…':'Loading board…'}</div>}
      {!teamPostsBusy&&teamPosts.length===0&&<div className="boardEmpty"><Megaphone size={24}/><strong>{t.noPosts}</strong></div>}
      {teamPosts.map(post=>{
        const totalVotes=post.options.reduce((n,o)=>n+o.votes.length,0);
        return <article className="teamPost" key={post.id}>
          <div className="teamPostTop">
            <div className="teamPostAuthor">{avatar(post.author.name,post.author.avatarUrl,'sm')}<div><strong>{post.author.name}</strong><span>{new Intl.DateTimeFormat(lang==='cs'?'cs-CZ':'en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(post.createdAt))} · {post.author.role==='admin'?t.admin:post.author.role==='captain'?t.captain:t.regularPlayer}</span></div></div>
            {profile&&((profile.role==='admin')||profile.id===post.author.id)&&<button className="postDeleteBtn" title={t.deletePost} onClick={()=>deleteTeamPost(post.id)}><Trash2 size={15}/></button>}
          </div>
          <h3>{post.title}</h3>
          <p className="teamPostBody">{post.body}</p>
          {(post.emailSent||post.pushSent)&&<div className="postDelivery">{post.emailSent&&<span><Mail size={13}/>{lang==='cs'?'Rozesláno e-mailem':'Sent by email'}</span>}{post.pushSent&&<span><Bell size={13}/>{lang==='cs'?'Odeslán push':'Push sent'}</span>}</div>}
          {post.pollQuestion&&post.options.length>=2&&<div className="postPoll">
            <div className="postPollTitle"><Vote size={18}/><div><strong>{post.pollQuestion}</strong><span>{totalVotes} {t.votes}</span></div></div>
            <div className="postPollOptions">{post.options.map(opt=>{
              const count=opt.votes.length,pct=totalVotes?Math.round(count/totalVotes*100):0,chosen=post.myOptionId===opt.id;
              return <button key={opt.id} className={chosen?'chosen':''} onClick={()=>voteTeamPost(post.id,opt.id)}>
                <span className="pollBar" style={{width:`${pct}%`}}/>
                <span className="pollChoice">{chosen?<Check size={15}/>:<span className="pollRadio"/>}<b>{opt.label}</b></span>
                <span className="pollCount">{count} · {pct}%</span>
              </button>
            })}</div>
            {post.myOptionId&&<div className="myVoteHint"><Check size={13}/>{t.yourVote} · {lang==='cs'?'kliknutím můžeš volbu změnit':'click another option to change it'}</div>}
          </div>}
        </article>
      })}
    </div>}
  </section>}

  {tab==='map'&&<section className="mapPage">
    <div className="mapPageHead">
      <div><span className="mapEyebrow"><MapIcon size={15}/>{lang==='cs'?'HŘIŠTĚ PSMF':'PSMF VENUES'}</span><h2>{t.map}</h2><p>{lang==='cs'?'Všechna hřiště, na kterých jsme hráli nebo máme naplánovaný zápas.':'All venues where we have played or have a scheduled match.'}</p></div>
      {next?.venue&&<button className="nextVenueChip" onClick={()=>openVenue(next.venue)}><MapPin size={15}/><span>{lang==='cs'?'Nejbližší':'Next'}:</span><b>{next.venue}</b></button>}
    </div>
    <VenueMap lang={lang} nextVenue={next?.venue} onVenueClick={openVenueFromMap}/>
  </section>}

  {tab==='table'&&<section className="panel"><h2>{t.table}</h2><div className="tableWrap"><table><thead><tr><th>{t.pos}</th><th>{t.team}</th><th>{t.played}</th><th>{t.wins}</th><th>{t.draws}</th><th>{t.losses}</th><th>{t.score}</th><th>{t.pts}</th></tr></thead><tbody>{standings.map((r,i)=><tr key={r[0]} className={r[0]===TEAM?'ours':''}><td>{i+1}.</td><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td>{r[4]}</td><td>{r[5]}</td><td><b>{r[6]}</b></td></tr>)}</tbody></table></div></section>}
  
  {tab==='stats'&&<><div className="mobileStatsMode">
  <button className={mobileStatsMode==='table'?'active':''} onClick={()=>setMobileStatsMode('table')}>{lang==='cs'?'Tabulka':'Table'}</button>
  <button className={mobileStatsMode==='cards'?'active':''} onClick={()=>setMobileStatsMode('cards')}>{lang==='cs'?'Karty':'Cards'}</button>
</div><section className="panel overallPanel"><div className="panelHead"><div><h2>{t.overall}</h2><p className="muted">PSMF · 2015–2026</p></div></div><div className="seasonSummary overallSummary"><div><span>{t.games}</span><strong>{allTime.games}</strong></div><div><span>{t.record}</span><strong>{allTime.w}–{allTime.d}–{allTime.l}</strong></div><div><span>{t.goalsForAgainst}</span><strong>{allTime.gf}:{allTime.ga}</strong></div><div><span>{t.winRate}</span><strong>{allTime.winRate}%</strong></div></div></section><section className="panel statsPanel"><div className="statsPanelHead"><h2>{t.stats} · 2026 podzim</h2><div className="tableScrollControls"><button type="button" onClick={()=>scrollStats(currentStatsWrapRef,-1)} aria-label="Posunout tabulku doleva">‹</button><span>{lang==='cs'?'Posun tabulky':'Scroll table'}</span><button type="button" onClick={()=>scrollStats(currentStatsWrapRef,1)} aria-label="Posunout tabulku doprava">›</button></div></div><div className="tableWrap richStats statsScroller" ref={currentStatsWrapRef}><table><thead><tr><th>{t.player}</th><th>{t.games}</th><th>{t.minutes}</th><th>{t.goals}</th><th>{t.yellowCards}</th><th>{t.redCards}</th><th>{t.keeper}</th><th>{t.goalsConceded}</th><th>{t.captain}</th><th>{t.motm}</th></tr></thead><tbody>{players.map(p=>{const x=currentEventTotals.get(playerKey(p.name))||{yellow:0,red:0,motm:0,keeper:0,captain:0,keeperGoalsAgainst:0};return <tr key={p.name}><td><div className="statPlayer">{avatar(p.name,p.avatarUrl,'sm')}<b>{p.name}</b></div></td><td>{p.games}</td><td>{p.games*60}</td><td><b>{p.goals}</b></td><td>{x.yellow}</td><td>{x.red}</td><td>{x.keeper}</td><td>{x.keeperGoalsAgainst}</td><td>{x.captain}</td><td>{x.motm}</td></tr>})}</tbody></table></div><div className={`mobileStatsList ${mobileStatsMode==='cards'?'show':''}`}>{players.map(p=>{const x=currentEventTotals.get(playerKey(p.name))||{yellow:0,red:0,motm:0,keeper:0,captain:0,keeperGoalsAgainst:0};return renderMobileStatCard(p.name,p.games,p.goals,x,p.avatarUrl);})}</div>
<div className={`mobileCompactStats ${mobileStatsMode==='table'?'show':''}`}><table><thead><tr><th>{t.player}</th><th>{t.games}</th><th>{t.goals}</th><th>★</th><th>C</th><th>🧤</th></tr></thead><tbody>{players.map(p=>{const x=currentEventTotals.get(playerKey(p.name))||{yellow:0,red:0,motm:0,keeper:0,captain:0,keeperGoalsAgainst:0};return <tr key={`mt-${p.name}`}><td><div className="mobileCompactPlayer">{avatar(p.name,p.avatarUrl,'xs')}<b>{p.name}</b></div></td><td>{p.games}</td><td><b>{p.goals}</b></td><td>{x.motm}</td><td>{x.captain}</td><td>{x.keeper}</td></tr>})}</tbody></table></div></section><section className="panel statsPanel"><div className="statsPanelHead"><h2>{t.career}</h2><div className="tableScrollControls"><button type="button" onClick={()=>scrollStats(careerStatsWrapRef,-1)} aria-label="Posunout tabulku doleva">‹</button><span>{lang==='cs'?'Posun tabulky':'Scroll table'}</span><button type="button" onClick={()=>scrollStats(careerStatsWrapRef,1)} aria-label="Posunout tabulku doprava">›</button></div></div><div className="tableWrap richStats statsScroller" ref={careerStatsWrapRef}><table><thead><tr><th>{t.player}</th><th>{t.games}</th><th>{t.minutes}</th><th>{t.goals}</th><th>{t.yellowCards}</th><th>{t.redCards}</th><th>{t.keeper}</th><th>{t.goalsConceded}</th><th>{t.captain}</th><th>{t.motm}</th></tr></thead><tbody>{career.map(r=>{const x=eventTotals.get(playerKey(r.name))||{yellow:0,red:0,motm:0,keeper:0,captain:0,keeperGoalsAgainst:0};return <tr key={r.name}><td><b>{r.name}</b></td><td>{r.games}</td><td>{r.games*60}</td><td><b>{r.goals}</b></td><td>{x.yellow}</td><td>{x.red}</td><td>{x.keeper}</td><td>{x.keeperGoalsAgainst}</td><td>{x.captain}</td><td>{x.motm}</td></tr>})}</tbody></table></div><div className={`mobileStatsList ${mobileStatsMode==='cards'?'show':''}`}>{career.map(r=>{const x=eventTotals.get(playerKey(r.name))||{yellow:0,red:0,motm:0,keeper:0,captain:0,keeperGoalsAgainst:0};return renderMobileStatCard(r.name,r.games,r.goals,x,null);})}</div>
<div className={`mobileCompactStats ${mobileStatsMode==='table'?'show':''}`}><table><thead><tr><th>{t.player}</th><th>{t.games}</th><th>{t.goals}</th><th>★</th><th>C</th><th>🧤</th></tr></thead><tbody>{career.map(r=>{const x=eventTotals.get(playerKey(r.name))||{yellow:0,red:0,motm:0,keeper:0,captain:0,keeperGoalsAgainst:0};return <tr key={`mc-${r.name}`}><td><b>{r.name}</b></td><td>{r.games}</td><td><b>{r.goals}</b></td><td>{x.motm}</td><td>{x.captain}</td><td>{x.keeper}</td></tr>})}</tbody></table></div></section></>}
  {tab==='history'&&<section className="panel"><div className="panelHead"><div><h2>{t.history}</h2><p className="muted">PSMF · 2015–2026</p></div><select className="seasonSelect" value={historySeason} onChange={e=>setHistorySeason(e.target.value)}>{seasons.map(s=><option key={s.season} value={s.season}>{s.label} · {s.division}</option>)}</select></div>{selectedSeason&&<div className="seasonSummary"><div><span>{t.rank}</span><strong>{selectedSeason.final_rank?`${selectedSeason.final_rank}.`: '—'}</strong></div><div><span>{t.record}</span><strong>{selectedSeason.wins??0}–{selectedSeason.draws??0}–{selectedSeason.losses??0}</strong></div><div><span>{t.score}</span><strong>{selectedSeason.score||'—'}</strong></div><div><span>{t.pts}</span><strong>{selectedSeason.points??'—'}</strong></div></div>}<div className="list historyList">{selectedSeasonMatches.map(m=>{const ev=eventForMatch(m);return <article className={`matchRow resultRow historyRich ${outcome(m.home_team,m.away_team,m.home_score,m.away_score)}`} key={m.psmf_key}><div className="dateBox"><b>{fmtDate(new Date(m.kickoff).toLocaleDateString('en-CA',{timeZone:'Europe/Prague'}),lang)}</b><span>{new Date(m.kickoff).toLocaleTimeString('cs-CZ',{timeZone:'Europe/Prague',hour:'2-digit',minute:'2-digit'})}</span></div><div className="matchTeams"><b>{m.home_team}</b><span className="result">{m.home_score}:{m.away_score}</span><b>{m.away_team}</b>{ev&&<div className="matchEventSummary"><div><span className="eventLabel">⚽ {t.goalScorers}</span>{ev.goals.length?ev.goals.map((g,i)=><span className="eventChip goalChip" key={`${g.player}-${g.minute}-${i}`}>{g.minute}&apos; {g.player}</span>):<span className="eventNone">{t.noGoals}</span>}</div>{ev.yellowCards.length>0&&<div><span className="eventLabel">🟨</span>{ev.yellowCards.map((c,i)=><span className="eventChip" key={`y-${i}`}>{c.minute!=null?`${c.minute}' `:''}{c.player}</span>)}</div>}{ev.redCards.length>0&&<div><span className="eventLabel">🟥</span>{ev.redCards.map((c,i)=><span className="eventChip" key={`r-${i}`}>{c.minute!=null?`${c.minute}' `:''}{c.player}</span>)}</div>}{ev.goalkeepers?.length>0&&<div><span className="eventLabel">🧤 {t.keeper}</span>{ev.goalkeepers.map(name=><span className="eventChip" key={`gk-${name}`}>{name}</span>)}</div>}{ev.captains?.length>0&&<div><span className="eventLabel">C {t.captain}</span>{ev.captains.map(name=><span className="eventChip" key={`cap-${name}`}>{name}</span>)}</div>}{ev.manOfMatch.length>0&&<div><span className="eventLabel">★ {lang==='cs'?'Hráč zápasu':'Player of the match'}</span>{ev.manOfMatch.map(name=><span className="eventChip starChip" key={name}>{name}</span>)}</div>}</div>}</div><button className="venueBtn venueText" onClick={()=>m.venue_code&&openVenue(m.venue_code)}>{m.venue_code}</button></article>})}</div>{selectedHistoricalStanding.length>0&&<><h3 className="sectionTitle compactTitle">{t.table}</h3><div className="tableWrap"><table><thead><tr><th>{t.pos}</th><th>{t.team}</th><th>{t.played}</th><th>{t.wins}</th><th>{t.draws}</th><th>{t.losses}</th><th>{t.score}</th><th>{t.pts}</th></tr></thead><tbody>{selectedHistoricalStanding.map(r=><tr key={r.team} className={ours(r.team)?'ours':''}><td>{r.rank}.</td><td>{r.team}</td><td>{r.played}</td><td>{r.wins}</td><td>{r.draws}</td><td>{r.losses}</td><td>{r.score}</td><td><b>{r.points}</b></td></tr>)}</tbody></table></div></>}</section>}
  {tab==='h2h'&&<section className="panel"><div className="panelHead"><div><h2>{t.h2h}</h2><p className="muted">Historie od roku 2015</p></div><select className="seasonSelect" value={h2hOpponent} onChange={e=>setH2hOpponent(e.target.value)}>{opponents.map(o=><option key={o}>{o}</option>)}</select></div><div className="h2hSummary"><strong>{h2hOpponent}</strong><span>{t.meetings}: {h2h.length}</span><span>{t.h2hRecord}: <b>{h2hTotals.w}–{h2hTotals.d}–{h2hTotals.l}</b></span></div>{h2h.length===0?<p className="muted">{t.noH2H}</p>:<div className="list">{h2h.map(m=>{const ev=eventForMatch(m);return <article className={`matchRow resultRow historyRich ${outcome(m.home_team,m.away_team,m.home_score,m.away_score)}`} key={m.psmf_key}><div className="dateBox"><b>{fmtDate(new Date(m.kickoff).toLocaleDateString('en-CA',{timeZone:'Europe/Prague'}),lang)}</b><span>{new Date(m.kickoff).toLocaleTimeString('cs-CZ',{timeZone:'Europe/Prague',hour:'2-digit',minute:'2-digit'})}</span></div><div className="matchTeams"><b>{m.home_team}</b><span className="result">{m.home_score}:{m.away_score}</span><b>{m.away_team}</b>{ev&&<div className="matchEventSummary"><div><span className="eventLabel">⚽ {t.goalScorers}</span>{ev.goals.length?ev.goals.map((g,i)=><span className="eventChip goalChip" key={`h2h-${g.player}-${g.minute}-${i}`}>{g.minute}&apos; {g.player}</span>):<span className="eventNone">{t.noGoals}</span>}</div>{ev.manOfMatch.length>0&&<div><span className="eventLabel">★ {t.motm}</span>{ev.manOfMatch.map(name=><span className="eventChip starChip" key={`h2h-star-${name}`}>{name}</span>)}</div>}</div>}</div><button className="venueBtn venueText" onClick={()=>m.venue_code&&openVenue(m.venue_code)}>{m.venue_code}</button></article>})}</div>}</section>}


  {tab==='ids'&&!profile&&<section className="panel"><p className="muted">{t.loginNeeded}</p><button className="miniBtn" onClick={()=>setAuthOpen(true)}>{t.login}</button></section>}
  {tab==='ids'&&profile&&<section className="panel idsExportPanel" id="player-ids-export"><div className="panelHead"><div><h2>{t.ids}</h2><p className="muted">{next?`${fmtDate(next.date,lang)} · ${next.time} · ${opponent}`:''}</p></div><button className="exportPdfBtn noPdf" onClick={exportPlayerIdsPdf} disabled={pdfBusy}><Eye size={16}/>{pdfBusy?t.pdfGenerating:t.exportPdf}</button></div><div className="printMatchTitle"><strong>Pěstební dělníci A</strong>{next&&<span>{fmtDate(next.date,lang)} · {next.time} · {opponent}{next.venue?` · ${next.venue}`:''}</span>}</div><div className="idsLegend"><span className="idsLegendDot"/>{t.attendingLegend}</div><h3 className="sectionTitle compactTitle">{t.goingPlayers}</h3>{publicRoster.length===0?<p className="muted">{t.noGoingPlayers}</p>:<div className="tableWrap"><table className="playerIdsTable"><thead><tr><th>{t.player}</th><th>{t.registrationId}</th><th>{t.jersey}</th><th className="printOnly">{t.attendanceCol}</th></tr></thead><tbody>{publicRoster.map(r=><tr key={r.id} className={r.attending?'attendingRow':''}><td><span className="playerIdName">{avatar(r.display_name,r.avatar_url,'xs')}<b>{r.display_name}</b>{r.attending&&<span className="attendingPill">✓ {lang==='cs'?'Přijde':'Going'}</span>}</span></td><td><b>{r.registration_id||'—'}</b></td><td><span className="jerseyBadge">{r.jersey_number??'—'}</span></td><td className="printOnly">{r.attending?(lang==='cs'?'PŘIJDE':'GOING'):'—'}</td></tr>)}</tbody></table></div>}</section>}

  {tab==='admin'&&profile?.role==='admin'&&<section className="panel"><div className="panelHead"><div><h2>{t.manageTeam}</h2><p className="muted">{lang==='cs'?'Role hráčů, účty, aktivní členové a týmové push notifikace.':'Player roles, accounts, active members and team push notifications.'}</p></div><button className="ghost" onClick={loadAdminPlayers}><RefreshCw size={16}/>{lang==='cs'?'Obnovit':'Refresh'}</button></div><div className="pushAdminBox"><div className="pushAdminHead"><Bell size={19}/><div><strong>{t.adminPush}</strong><span>{lang==='cs'?'Pokud nikoho nevybereš, zpráva půjde všem hráčům s účtem a povoleným push.':'If nobody is selected, the message goes to all players with accounts and push enabled.'}</span></div></div><label>{t.pushTitle}<input value={adminPushTitle} onChange={e=>setAdminPushTitle(e.target.value)}/></label><label>{t.pushMessage}<textarea value={adminPushMessage} onChange={e=>setAdminPushMessage(e.target.value)} placeholder={lang==='cs'?'Např. změna času nebo hřiště…':'For example a time or venue change…'}/></label><div className="pushRecipients">
  <div className="pushRecipientsHead"><span>{t.pushRecipients}</span><b>{adminPushPlayers.length}</b></div>
  <p className="pushDefaultHint">{t.pushDefaultHint}</p>
  <div className="pushPresetBtns">
    <button type="button" className="pushPreset primary" onClick={()=>{
      const answered=new Set(attendanceRows.filter(r=>r.status==='yes'||r.status==='no').map(r=>r.player_id));
      setAdminPushPlayers(adminPlayers.filter(p=>p.user_id&&p.active&&!answered.has(p.id)).map(p=>p.id));
    }}>{t.pushUnanswered} ({adminPlayers.filter(p=>p.user_id&&p.active&&!attendanceRows.some(r=>r.player_id===p.id&&(r.status==='yes'||r.status==='no'))).length})</button>
    <button type="button" className="pushPreset" onClick={()=>setAdminPushPlayers(adminPlayers.filter(p=>p.user_id&&p.active).map(p=>p.id))}>{t.pushAll}</button>
    <button type="button" className="pushPreset" onClick={()=>setAdminPushPlayers([])}>{t.pushNone}</button>
  </div>
  <div>{adminPlayers.filter(p=>p.user_id&&p.active).map(p=>{
    const answered=attendanceRows.some(r=>r.player_id===p.id&&(r.status==='yes'||r.status==='no'));
    return <label key={p.id} className={!answered?'unansweredRecipient':''}>
      <input type="checkbox" checked={adminPushPlayers.includes(p.id)} onChange={e=>setAdminPushPlayers(v=>e.target.checked?[...new Set([...v,p.id])]:v.filter(id=>id!==p.id))}/>
      <span>{p.display_name}</span>{!answered&&<em>{t.unanswered}</em>}
    </label>
  })}</div>
</div><button className="primaryBtn pushSendBtn" disabled={adminPushBusy||!adminPushMessage.trim()} onClick={sendAdminPush}><Send size={16}/>{adminPushBusy?'…':t.pushSend}</button></div><div className="adminList">{adminPlayers.map(p=><div className="adminRow adminRowExtended" key={p.id}><div className="adminPerson">{avatar(p.display_name,p.avatar_url,'sm')}<div><strong>{p.display_name}</strong><span>{p.email||t.noAccount}</span></div></div><div className="adminPhotoTools"><button className="adminPhotoBtn" disabled={adminAvatarBusy===p.id} onClick={()=>{setAdminAvatarTarget(p.id);setTimeout(()=>adminAvatarInput.current?.click(),0)}}><Camera size={14}/>{t.replacePhoto}</button><button className="adminPhotoBtn dangerPhoto" disabled={!p.avatar_url||adminAvatarBusy===p.id} onClick={()=>adminRemoveAvatar(p.id)}><ImageOff size={14}/>{t.removePhoto}</button></div><label><span>{t.role}</span><select value={p.role} disabled={adminBusy===p.id} onChange={e=>setPlayerRole(p.id,e.target.value as 'player'|'captain'|'admin')}><option value="player">{t.regularPlayer}</option><option value="captain">{t.captain}</option><option value="admin">{t.admin}</option></select></label><label className="playerDataField"><span>{t.registrationId}</span><input value={playerDataDrafts[p.id]?.registration_id??''} onChange={e=>setPlayerDataDrafts(d=>({...d,[p.id]:{registration_id:e.target.value,jersey_number:d[p.id]?.jersey_number??''}}))}/></label><label className="playerDataField jerseyField"><span>{t.jersey}</span><input inputMode="numeric" value={playerDataDrafts[p.id]?.jersey_number??''} onChange={e=>setPlayerDataDrafts(d=>({...d,[p.id]:{registration_id:d[p.id]?.registration_id??'',jersey_number:e.target.value.replace(/\D/g,'').slice(0,2)}}))}/></label><button className="savePlayerDataBtn" disabled={adminBusy===p.id} onClick={()=>savePlayerData(p.id)}>{t.savePlayerData}</button><label className="activeToggle"><input type="checkbox" checked={p.active} disabled={adminBusy===p.id} onChange={e=>setPlayerActive(p.id,e.target.checked)}/><span>{t.active}</span></label><button className="unlinkBtn" disabled={!p.user_id||adminBusy===p.id} onClick={()=>unlinkPlayer(p.id)}>{t.unlink}</button></div>)}</div></section>}

  {profile?.role==='admin'&&<input ref={adminAvatarInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={adminAvatarUpload}/>}
  <section className="accountCard"><div className="accountAvatar">{profile?avatar(profile.display_name,profile.avatar_url,'lg'):<Users/>}</div><div className="accountMain"><strong>{t.account}</strong><p>{profile?`${t.signedAs}: ${profile.display_name}`:t.loginNeeded}</p>{session&&profile&&<div className="accountTools"><input ref={avatarInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar}/><button className="testReminderBtn" onClick={()=>avatarInput.current?.click()} disabled={avatarBusy}><Camera size={16}/>{avatarBusy?'…':t.uploadPhoto}</button><button className="testReminderBtn" onClick={sendTestReminder} disabled={reminderBusy}><Mail size={16}/>{reminderBusy?'…':t.testReminder}</button><button className={`testReminderBtn ${pushPermission==='granted'?'pushOn':''}`} onClick={enablePush} disabled={pushBusy}><Bell size={16}/>{pushBusy?'…':pushPermission==='granted'?t.pushEnabled:t.pushEnable}</button>{pushPermission==='granted'&&<button className="testReminderBtn" onClick={sendTestPush} disabled={pushBusy}><Smartphone size={16}/>{t.pushTest}</button>}{profile.role==='admin'&&<button className="testReminderBtn" onClick={openAdmin}><ShieldCheck size={16}/>{t.manageTeam}</button>}</div>}{session&&profile&&isIos&&!isStandalone&&<p className="pushHint">{t.iosInstall}</p>}</div>{session?<button className="miniBtn" onClick={logout}>{t.logout}</button>:<button className="miniBtn" onClick={()=>setAuthOpen(true)}>{t.login}</button>}</section>
  <footer>Neoficiální týmová aplikace · Data PSMF</footer>


  {pdfPreviewUrl&&<div className="modalBackdrop pdfBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget){URL.revokeObjectURL(pdfPreviewUrl);setPdfPreviewUrl(null)}}}><div className="pdfPreviewModal"><div className="pdfPreviewHead"><div><strong>{t.pdfPreview}</strong><span>{next?`${fmtDate(next.date,lang)} · ${opponent}`:''}</span></div><div><a className="ghost pdfDownloadBtn" href={pdfPreviewUrl} download={`Pestebni-delnici-A_${next?.date||'sestava'}.pdf`}><Download size={16}/>{t.pdfDownload}</a><button className="modalClose pdfCloseBtn" onClick={()=>{URL.revokeObjectURL(pdfPreviewUrl);setPdfPreviewUrl(null)}}><X/></button></div></div><iframe className="pdfPreviewFrame" src={pdfPreviewUrl} title={t.pdfPreview}/></div></div>}

  {venueOpen&&<div className="modalBackdrop venueModalBackdrop"><div className="authModal venueModal" onMouseDown={e=>e.stopPropagation()}><button className="modalClose" onClick={()=>setVenueOpen(null)}><X/></button><div className="venueCode"><MapPin size={18}/>{venueOpen.code}</div><h2>{venueOpen.name}</h2><div className="venueAddress"><span>{t.address}</span><strong>{venueOpen.address}</strong></div>{venueOpen.notes&&<p className="venueNotes">{venueOpen.notes}</p>}<div className="navButtons"><a className="primaryBtn navLink" href={googleMaps(venueOpen.address)} target="_blank" rel="noreferrer" onClick={()=>setVenueOpen(null)}><Navigation size={18}/>{t.google}</a><a className="ghost navLink" href={waze(venueOpen.address)} target="_blank" rel="noreferrer" onClick={()=>setVenueOpen(null)}><Navigation size={18}/>{t.waze}</a></div></div></div>}

  {adminOpen&&profile?.role==='admin'&&<div className="modalBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setAdminOpen(false)}}><div className="authModal adminModal"><button className="modalClose" onClick={()=>setAdminOpen(false)}><X/></button><h2>{t.manageTeam}</h2><p className="muted adminIntro">{lang==='cs'?'Admin může měnit role, aktivovat/deaktivovat hráče a odpojit účet.':'Admins can change roles, activate/deactivate players and unlink accounts.'}</p><div className="adminList">{adminPlayers.map(p=><div className="adminRow adminRowExtended" key={p.id}><div className="adminPerson">{avatar(p.display_name,p.avatar_url,'sm')}<div><strong>{p.display_name}</strong><span>{p.email||t.noAccount}</span></div></div><div className="adminPhotoTools"><button className="adminPhotoBtn" disabled={adminAvatarBusy===p.id} onClick={()=>{setAdminAvatarTarget(p.id);setTimeout(()=>adminAvatarInput.current?.click(),0)}}><Camera size={14}/>{t.replacePhoto}</button><button className="adminPhotoBtn dangerPhoto" disabled={!p.avatar_url||adminAvatarBusy===p.id} onClick={()=>adminRemoveAvatar(p.id)}><ImageOff size={14}/>{t.removePhoto}</button></div><label><span>{t.role}</span><select value={p.role} disabled={adminBusy===p.id} onChange={e=>setPlayerRole(p.id,e.target.value as 'player'|'captain'|'admin')}><option value="player">{t.regularPlayer}</option><option value="captain">{t.captain}</option><option value="admin">{t.admin}</option></select></label><label className="playerDataField"><span>{t.registrationId}</span><input value={playerDataDrafts[p.id]?.registration_id??''} onChange={e=>setPlayerDataDrafts(d=>({...d,[p.id]:{registration_id:e.target.value,jersey_number:d[p.id]?.jersey_number??''}}))}/></label><label className="playerDataField jerseyField"><span>{t.jersey}</span><input inputMode="numeric" value={playerDataDrafts[p.id]?.jersey_number??''} onChange={e=>setPlayerDataDrafts(d=>({...d,[p.id]:{registration_id:d[p.id]?.registration_id??'',jersey_number:e.target.value.replace(/\D/g,'').slice(0,2)}}))}/></label><button className="savePlayerDataBtn" disabled={adminBusy===p.id} onClick={()=>savePlayerData(p.id)}>{t.savePlayerData}</button><label className="activeToggle"><input type="checkbox" checked={p.active} disabled={adminBusy===p.id} onChange={e=>setPlayerActive(p.id,e.target.checked)}/><span>{t.active}</span></label><button className="unlinkBtn" disabled={!p.user_id||adminBusy===p.id} onClick={()=>unlinkPlayer(p.id)}>{t.unlink}</button></div>)}</div></div></div>}

  {forgotOpen&&<div className="modalBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setForgotOpen(false)}}><div className="authModal"><button className="modalClose" onClick={()=>setForgotOpen(false)}><X/></button><h2>{t.forgotTitle}</h2><p className="muted authIntro">{t.forgotIntro}</p><form onSubmit={requestPasswordReset} className="authForm"><label>{t.email}<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label><button className="primaryBtn" disabled={authBusy}>{authBusy?'…':t.sendReset}</button><button type="button" className="textBtn" onClick={()=>{setForgotOpen(false);setAuthOpen(true);setAuthMode('login');setAuthMessage('')}}>{t.haveAccount}</button>{authMessage&&<p className="authMessage">{authMessage}</p>}</form></div></div>}
  {resetOpen&&<div className="modalBackdrop"><div className="authModal"><h2>{t.forgotTitle}</h2><form onSubmit={submitNewPassword} className="authForm"><label>{t.newPassword}<input type="password" required minLength={6} value={newPassword} onChange={e=>setNewPassword(e.target.value)} autoComplete="new-password"/></label><label>{t.repeatPassword}<input type="password" required minLength={6} value={repeatPassword} onChange={e=>setRepeatPassword(e.target.value)} autoComplete="new-password"/></label><button className="primaryBtn" disabled={authBusy}>{authBusy?'…':t.setNewPassword}</button>{authMessage&&<p className="authMessage">{authMessage}</p>}</form></div></div>}

  {authOpen&&<div className="modalBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setAuthOpen(false)}}><div className="authModal"><button className="modalClose" onClick={()=>setAuthOpen(false)}><X/></button><h2>{authMode==='login'?t.login:t.signup}</h2><div className="authSwitch"><button className={authMode==='login'?'active':''} onClick={()=>{setAuthMode('login');setAuthMessage('')}}>{t.haveAccount}</button><button className={authMode==='signup'?'active':''} onClick={()=>{setAuthMode('signup');setAuthMessage('')}}>{t.newAccount}</button></div><form onSubmit={submitAuth} className="authForm">{authMode==='signup'&&<label>{t.choosePlayer}<select value={selectedPlayer} onChange={e=>setSelectedPlayer(e.target.value)}>{players.map(p=><option key={p.name}>{p.name}</option>)}</select></label>}<label>{t.email}<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label><label>{t.password}<input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={authMode==='login'?'current-password':'new-password'}/></label><button className="primaryBtn" disabled={authBusy}>{authBusy?'…':authMode==='login'?t.login:t.signup}</button>{authMode==='login'&&<><button type="button" className="textBtn" disabled={authBusy} onClick={()=>{setAuthMessage('');setForgotOpen(true);setAuthOpen(false)}}>{t.forgotPassword}</button><button type="button" className="textBtn secondaryTextBtn" disabled={authBusy} onClick={resendConfirmation}>{t.resend}</button></>}{authMessage&&<p className="authMessage">{authMessage}</p>}</form></div></div>}
 </main>;
}
