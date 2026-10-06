export type Match = {
  date: string; time: string; venue: string; home: string; away: string;
  round: number; result?: string; status: 'past' | 'upcoming';
};

export const TEAM = 'Pěstební dělníci A';
export const SOURCE_URL = 'https://www.psmf.cz/souteze/2026-hanspaulska-liga-podzim/5-d/tymy/pestebni-delnici-a/';

export const matches: Match[] = [
  { date:'2026-09-02', time:'20:45', venue:'P1', home:TEAM, away:'Masáže FC', round:1, result:'2:2', status:'past' },
  { date:'2026-09-16', time:'20:30', venue:'PODV1', home:'Penál AFK', away:TEAM, round:2, result:'2:0', status:'past' },
  { date:'2026-09-23', time:'19:30', venue:'DEKAN', home:TEAM, away:'Santovi Sobi', round:3, result:'1:8', status:'past' },
  { date:'2026-10-07', time:'20:45', venue:'BECH', home:'Princ Praha FC', away:TEAM, round:4, status:'upcoming' },
  { date:'2026-10-14', time:'20:45', venue:'HOSTI', home:TEAM, away:'Batalion 91 A', round:5, status:'upcoming' },
  { date:'2026-10-21', time:'19:15', venue:'PODV2', home:'Credit Praha FC', away:TEAM, round:6, status:'upcoming' },
  { date:'2026-11-04', time:'20:45', venue:'P3', home:TEAM, away:'Favorit FC', round:7, status:'upcoming' },
  { date:'2026-11-11', time:'19:30', venue:'STER1', home:TEAM, away:'XXX', round:8, status:'upcoming' },
  { date:'2026-11-18', time:'19:15', venue:'HRAB2', home:'Botič FC', away:TEAM, round:9, status:'upcoming' },
  { date:'2026-11-25', time:'20:45', venue:'P1', home:TEAM, away:'Olexton FC', round:10, status:'upcoming' },
  { date:'2026-12-09', time:'20:15', venue:'ZABEH', home:'Cirkus Praha', away:TEAM, round:11, status:'upcoming' }
];

export const standings = [
  ['Batalion 91 A',4,3,0,1,'21:9',6],['Penál AFK',3,3,0,0,'12:1',6],['Santovi Sobi',4,3,0,1,'18:9',6],
  ['Favorit FC',4,3,0,1,'14:9',6],['Botič FC',3,2,0,1,'15:11',4],['Credit Praha FC',4,2,0,2,'14:18',4],
  ['Olexton FC',3,1,1,1,'9:4',3],['Masáže FC',3,1,1,1,'6:12',3],['XXX',4,1,0,3,'9:10',2],
  ['Cirkus Praha',4,0,1,3,'7:16',1],[TEAM,3,0,1,2,'3:12',1],['Princ Praha FC',3,0,0,3,'5:22',0]
] as const;

export const players = [
  ['Černý Martin',3,0],['Horák Adam',3,0],['Jelenčiak Jakub',2,2],['Kolář Adam',3,0],['Kubala Martin',3,0],
  ['Landfeld Jan',2,1],['Landfeld Vít',3,0],['Sigmund Radek',3,0],['Varner Howard',3,0],['Veselý Mikuláš',3,0]
] as const;

export const venueLinks: Record<string,string> = {
  BECH: 'https://www.google.com/maps/search/?api=1&query=BECH+PSMF+Praha',
  HOSTI: 'https://www.google.com/maps/search/?api=1&query=HOSTI+PSMF+Praha',
  PODV2: 'https://www.google.com/maps/search/?api=1&query=PODV2+PSMF+Praha',
  P3: 'https://www.google.com/maps/search/?api=1&query=P3+PSMF+Praha',
  STER1: 'https://www.google.com/maps/search/?api=1&query=STER1+PSMF+Praha',
  HRAB2: 'https://www.google.com/maps/search/?api=1&query=HRAB2+PSMF+Praha',
  P1: 'https://www.google.com/maps/search/?api=1&query=P1+PSMF+Praha',
  ZABEH: 'https://www.google.com/maps/search/?api=1&query=ZABEH+PSMF+Praha'
};
