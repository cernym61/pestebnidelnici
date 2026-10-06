export type Match = {
  id?: string;
  psmfKey?: string;
  date: string;
  time: string;
  venue: string;
  home: string;
  away: string;
  round: number;
  result?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  status: 'past' | 'upcoming';
  season?: string;
};

export type PlayerStat = { name:string; games:number; goals:number; avatarUrl?:string|null };
export type Standing = [string, number, number, number, number, string, number];

export const TEAM = 'Pěstební dělníci A';
export const LEGACY_TEAM = 'Pěstební dělníci';
export const SEASON = '2026-podzim';
export const SOURCE_URL = 'https://www.psmf.cz/souteze/2026-hanspaulska-liga-podzim/5-d/tymy/pestebni-delnici-a/';

export const fallbackMatches: Match[] = [
  { psmfKey:'2026-podzim-r1', date:'2026-09-02', time:'20:45', venue:'P1', home:TEAM, away:'Masáže FC', round:1, result:'2:2', homeScore:2, awayScore:2, status:'past', season:SEASON },
  { psmfKey:'2026-podzim-r2', date:'2026-09-16', time:'20:30', venue:'PODV1', home:'Penál AFK', away:TEAM, round:2, result:'2:0', homeScore:2, awayScore:0, status:'past', season:SEASON },
  { psmfKey:'2026-podzim-r3', date:'2026-09-23', time:'19:30', venue:'DEKAN', home:TEAM, away:'Santovi Sobi', round:3, result:'1:8', homeScore:1, awayScore:8, status:'past', season:SEASON },
  { psmfKey:'2026-podzim-r4', date:'2026-10-07', time:'20:45', venue:'BECH', home:'Princ Praha FC', away:TEAM, round:4, status:'upcoming', season:SEASON },
  { psmfKey:'2026-podzim-r5', date:'2026-10-14', time:'20:45', venue:'HOSTI', home:TEAM, away:'Batalion 91 A', round:5, status:'upcoming', season:SEASON },
  { psmfKey:'2026-podzim-r6', date:'2026-10-21', time:'19:15', venue:'PODV2', home:'Credit Praha FC', away:TEAM, round:6, status:'upcoming', season:SEASON },
  { psmfKey:'2026-podzim-r7', date:'2026-11-04', time:'20:45', venue:'P3', home:TEAM, away:'Favorit FC', round:7, status:'upcoming', season:SEASON },
  { psmfKey:'2026-podzim-r8', date:'2026-11-11', time:'19:30', venue:'STER1', home:TEAM, away:'XXX', round:8, status:'upcoming', season:SEASON },
  { psmfKey:'2026-podzim-r9', date:'2026-11-18', time:'19:15', venue:'HRAB2', home:'Botič FC', away:TEAM, round:9, status:'upcoming', season:SEASON },
  { psmfKey:'2026-podzim-r10', date:'2026-11-25', time:'20:45', venue:'P1', home:TEAM, away:'Olexton FC', round:10, status:'upcoming', season:SEASON },
  { psmfKey:'2026-podzim-r11', date:'2026-12-09', time:'20:15', venue:'ZABEH', home:'Cirkus Praha', away:TEAM, round:11, status:'upcoming', season:SEASON }
];

export const fallbackStandings: Standing[] = [
  ['Batalion 91 A',4,3,0,1,'21:9',6],['Penál AFK',3,3,0,0,'12:1',6],['Santovi Sobi',4,3,0,1,'18:9',6],
  ['Favorit FC',4,3,0,1,'14:9',6],['Olexton FC',4,2,1,1,'15:7',5],['Botič FC',3,2,0,1,'15:11',4],
  ['Credit Praha FC',4,2,0,2,'14:18',4],['Masáže FC',4,1,1,2,'9:18',3],['XXX',4,1,0,3,'9:10',2],
  ['Cirkus Praha',4,0,1,3,'7:16',1],[TEAM,3,0,1,2,'3:12',1],['Princ Praha FC',3,0,0,3,'5:22',0]
];

export const fallbackPlayers: PlayerStat[] = [
  {name:'Bouzek Filip Oliver',games:0,goals:0},{name:'Černý Martin',games:3,goals:0},{name:'Dusil Jan',games:0,goals:0},{name:'Herko Daniel',games:0,goals:0},{name:'Horák Adam',games:3,goals:0},
  {name:'Jelenčiak Jakub',games:2,goals:2},{name:'Kolář Adam',games:3,goals:0},{name:'Kozák Tomáš',games:0,goals:0},{name:'Kubala Martin',games:3,goals:0},{name:'Landfeld Jan',games:2,goals:1},
  {name:'Landfeld Vít',games:3,goals:0},{name:'Sigmund Radek',games:3,goals:0},{name:'Varner Howard',games:3,goals:0},{name:'Veselý Mikuláš',games:3,goals:0}
];
