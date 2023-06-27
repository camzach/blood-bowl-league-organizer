from json import load
from itertools import permutations, combinations, chain

options = [
    *['rp', 'cp', 'rs', 'cs']*6,
    # *['st', 'ag', 'pa', 'mv', 'av']*2
]

costs = {
    'rp': ([3, 4, 6, 8, 10, 15], 10000),
    'cp': ([6, 8, 12, 16, 20, 30], 20000),
    'rs': ([6, 8, 12, 16, 20, 30], 20000),
    'cs': ([12, 14, 18, 22, 26, 40], 40000),
    # 'st': ([18, 20, 24, 28, 32, 50], 80000),
    # 'ag': ([18, 20, 24, 28, 32, 50], 40000),
    # 'pa': ([18, 20, 24, 28, 32, 50], 20000),
    # 'mv': ([18, 20, 24, 28, 32, 50], 20000),
    # 'av': ([18, 20, 24, 28, 32, 50], 10000),
}

combs = chain(*(combinations(options, n) for n in range(1, 7)))
unique = set(combs)
perms = chain(*(permutations(comb, len(comb)) for comb in unique))
unique_unambiguous = set(perms)

costs_unambiguous = {
    perm: (
        sum(costs[thing][0][i] for i, thing in enumerate(perm)),
        sum(costs[thing][1] for thing in perm)
    )
    for perm in unique_unambiguous
}

ambiguous = options = [
    *['p', 's']*6,
    # *['st', 'ag', 'pa', 'mv', 'av']*2
]

# combs = chain(*(combinations(ambiguous, n) for n in range(1, 7)))
# unique = set(combs)
# perms = chain(*(permutations(comb, len(comb)) for comb in unique))
# unique_ambiguous = set(perms)


def options(things: list[str]):
    indices = [i for i, thing in enumerate(
        things) if thing == 'p' or thing == 's']
    perms = set(permutations(
        [*['r']*len(indices), *['c']*len(indices)], len(indices)))
    for perm in perms:
        yield tuple(
            thing if i not in indices else f'{perm[indices.index(i)]}{thing}' for i, thing in enumerate(things)
        )


# costs_ambiguous = {
#     perm: {
#         option: (
#             sum(costs[thing][0][i] for i, thing in enumerate(option)),
#             sum(costs[thing][1] for thing in option)
#         ) for option in options(perm)
#     }
#     for perm in unique_ambiguous
# }


with open('updates.json') as f:
    updates = load(f)

sequences = {}
meta = {}
for update in updates:
    totalSPP = update['touchdowns'] * 3 + update['completions'] * 1 + update['deflections'] * \
        1 + update['interceptions'] * 1 + \
        update['MVPs'] * 4 + update['casualties'] * 2
    spentSPP = totalSPP - update['starPlayerPoints']
    learnedSkills = ['p' if skill['category'] in update['primary']
                     else 's' for skill in update['learnedSkills']]
    upgradeValue = update['teamValue'] - update['position']['cost']
    possibilities = options(learnedSkills)
    possibilities = set(chain(*(permutations(poss)
                                for poss in possibilities)))
    possibilities = [perm for perm in possibilities if costs_unambiguous[perm] == (
        spentSPP, upgradeValue)]

    skills = {
        "p": [skill['name'] for skill in update['learnedSkills'] if skill['category'] in update['primary']],
        "s": [skill['name'] for skill in update['learnedSkills'] if skill['category'] in update['secondary']]
    }
    newseq = [
        (thing, skills[thing[1]].pop()) for thing in possibilities[0]
    ]
    sequences[update['id']] = newseq

    meta[update['id']] = (
        totalSPP, spentSPP, update['starPlayerPoints'], learnedSkills, upgradeValue)

translate = {
    "cs": "Chosen Secondary",
    "rs": "Random Secondary",
    "cp": "Chosen Primary",
    "rp": "Random Primary",
}

relations = [
    {
        "type": translate[thing[0]],
        "playerId": pid,
        "order": i+1,
        "skill": thing[1]
    } for pid in sequences for i, thing in enumerate(sequences[pid])
]

print(relations)
