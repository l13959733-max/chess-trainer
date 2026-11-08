# Pick well-liked Lichess puzzles (CC0) per theme for King of Chess, spread over the ratings of a
# 600-1200 player. Reads the decompressed CSV from stdin, writes JSON.
# zstd -dc lichess_db_puzzle.csv.zst | python3 scripts/pick-lichess-puzzles.py > src/data/lichess-puzzles.json
# Columns: PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags
import csv, json, sys, random

THEMES = {
    'fork': {'need': ['fork'], 'avoid': ['mateIn1', 'mateIn2']},
    'pin': {'need': ['pin'], 'avoid': ['mateIn1']},
    'skewer': {'need': ['skewer'], 'avoid': []},
    'hanging': {'need': ['hangingPiece'], 'avoid': ['mate']},
    'mate1': {'need': ['mateIn1'], 'avoid': []},
    'backrank': {'need': ['backRankMate'], 'avoid': []},
    'mate2': {'need': ['mateIn2'], 'avoid': []},
    'smothered': {'need': ['smotheredMate'], 'avoid': []},
    # the armoury (BAUPLAN 2): one theme per weapon / shield, mating patterns, endgames, middlegame
    'discovered': {'need': ['discoveredAttack'], 'avoid': ['mate']},
    'removal': {'need': ['capturingDefender'], 'avoid': ['mate']},
    'deflection': {'need': ['deflection'], 'avoid': ['mate']},
    'attraction': {'need': ['attraction'], 'avoid': []},
    'intermezzo': {'need': ['intermezzo'], 'avoid': ['mate']},
    'combo': {'need': ['sacrifice', 'advantage'], 'avoid': ['mate', 'oneMove']},
    'arabian': {'need': ['arabianMate'], 'avoid': []},
    'anastasia': {'need': ['anastasiaMate'], 'avoid': []},
    'hook': {'need': ['hookMate'], 'avoid': []},
    'pawnEnd': {'need': ['pawnEndgame'], 'avoid': ['mate']},
    'rookEnd': {'need': ['rookEndgame'], 'avoid': ['mate']},
    'minorEnd': {'need': ['knightEndgame'], 'avoid': ['mate'], 'or': ['bishopEndgame']},
    'queenEnd': {'need': ['queenEndgame'], 'avoid': ['mate']},
    'convert': {'need': ['middlegame', 'crushing', 'quietMove'], 'avoid': ['mate']},
    'defend': {'need': ['defensiveMove', 'middlegame'], 'avoid': ['mate']},
}
LOW, HIGH = 450, 1350
PER = 40
pools = {k: [] for k in THEMES}
r = csv.reader(sys.stdin)
next(r)
for row in r:
    pid, fen, moves, rating, dev, pop, plays, themes = row[:8]
    rating, pop, plays = int(rating), int(pop), int(plays)
    if not (LOW <= rating <= HIGH) or pop < 85 or plays < 2000 or int(dev) > 90:
        continue
    t = set(themes.split())
    ms = moves.split()
    if len(ms) > 6:
        continue
    for k, rule in THEMES.items():
        need = all(n in t for n in rule['need']) or ('or' in rule and all(n in t for n in rule['or']))
        if need and not any(a in t for a in rule['avoid']):
            pools[k].append({'id': pid, 'fen': fen, 'moves': ms, 'rating': rating, 'plays': plays})
random.seed(7)
out = {}
for k, pool in pools.items():
    # spread over the rating range: equal buckets of 100 points, the most played first
    buckets = {}
    for p in pool:
        buckets.setdefault(p['rating'] // 100, []).append(p)
    pick = []
    keys = sorted(buckets)
    for b in keys:
        buckets[b].sort(key=lambda p: -p['plays'])
    i = 0
    while len(pick) < PER and any(buckets[b] for b in keys):
        b = keys[i % len(keys)]
        if buckets[b]:
            pick.append(buckets[b].pop(0))
        i += 1
    pick.sort(key=lambda p: p['rating'])
    out[k] = [{'id': p['id'], 'fen': p['fen'], 'moves': p['moves'], 'rating': p['rating']} for p in pick]
    print(k, len(pool), '->', len(out[k]), file=sys.stderr)
json.dump(out, sys.stdout, separators=(',', ':'))
