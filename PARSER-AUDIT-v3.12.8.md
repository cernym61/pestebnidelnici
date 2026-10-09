# Parser audit v3.12.8

Společný `historyEvents` používají:
- Historie — střelci, ŽK, ČK, brankář, kapitán, hráč zápasu, sestava
- Vzájemné zápasy — střelci, hráč zápasu, sestava
- Statistiky sezóny — ŽK, ČK, hráč zápasu, brankář, kapitán
- Kariéra — ŽK, ČK, hráč zápasu, brankář, kapitán

Samotné počty gólů ve Statistikách jsou čtené z oficiálního `player_season_stats`
a nejsou dopočítávány z detailů zápasů.

Vzor QARA 26. 3. 2024:
- góly Pěstebních: 3' Bouzek Filip Oliver, 18' a 43' Dusil Jan
- ŽK: 44' Landfeld Jan
Po opravě se 44' Landfeld Jan nesmí objevit mezi střelci.
