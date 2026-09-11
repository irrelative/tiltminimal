export interface TableRuleCard {
  balls: number;
  objective: string;
  rules: string[];
}

/** Summaries of this game's rule scripts, including simplified recreations. */
export const TABLE_RULE_CARDS: Record<string, TableRuleCard> = {
  'just-one-more': {
    balls: 3,
    objective:
      'Play, fix, and collect your next pin for Just One More multiball.',
    rules: [
      'PLAY: spin both different spinners. FIX: hit all four different repair targets. You can complete these in any order during the same ball.',
      'With PLAY and FIX complete, shoot NEW PIN DAY to score 5,000 and lock one ball. Plunge the replacement for two-ball multiball on the same turn.',
      'In multiball, spin both different spinners to light a 10,000-point NEW PIN DAY jackpot. Collect it, then spin both again to relight.',
      'Spinners score 100 per spin. Repair targets score 500; completing all four outside multiball adds 2,000 once per qualification. Unlit saucer captures score 1,000.',
      'Losing one ball ends multiball and clears progress. The remaining ball continues. Each new ball starts fresh; no end-of-ball bonus or extra balls.',
    ],
  },
  switchyard: {
    balls: 3,
    objective: 'Connect five routes, then lock at Dispatch for multiball.',
    rules: [
      'Complete each full Express orbit, hit both Cargo targets and both Signal targets, and shoot Dispatch to connect all five routes. Spins alone do not complete an orbit.',
      'With all five connected, shoot Dispatch again to lock one ball. Plunge the replacement to start two-ball multiball without using another turn.',
      'In multiball, each full Express orbit and either target in each bank collect a different 10,000-point jackpot. Collect all four, then shoot Dispatch for 50,000 and relight them.',
      'Outside multiball, complete a different orbit or bank within four seconds for a 2,000-point combo. Dispatch clears the combo window.',
      'Build up to 20,000 bonus and collect it on the final drain. Losing one ball ends multiball and clears network progress; new balls start with fresh routes and bonus.',
    ],
  },
  'classic-table': {
    balls: 3,
    objective: 'Build bonus and complete the top lanes.',
    rules: [
      'Complete all three top lanes for 1,000 points and advance the bonus multiplier, up to 5×.',
      'Hit the drop target to add 1,000 bonus and advance the bonus multiplier up to 3×. Currently, this also reduces a higher multiplier to 3×.',
      'The saucer adds 1,500 bonus. Standups, bumpers, lanes, slings and spinner hits also build bonus.',
      'At the end of each ball, collect bonus × multiplier. Bonus and lane progress reset for the next ball.',
    ],
  },
  andromeda: {
    balls: 3,
    objective: 'Lock a ball, then release two-ball multiball.',
    rules: [
      'Clear the left guard drop and shoot the saucer to lock a ball for 30,000 points.',
      'Plunge the replacement ball, then hit the yellow RELEASE target. Two-ball multiball doubles playfield scoring.',
      'Complete the three top lanes to advance bonus multiplication up to 10×. The right flipper shifts the lit lanes.',
      'Clear all six bank drops for 50,000 and a higher spinner value. The second completion lights extra ball at the right inlane; the third lights a 100,000-point special at the right outlane. Shoot the lit lane to collect.',
      'Standups power up the bumpers. Build up to 80,000 bonus and collect it × multiplier at the end of the ball.',
    ],
  },
  'double-crossed': {
    balls: 3,
    objective: 'Complete both CROSS banks to light two-ball multiball.',
    rules: [
      'Complete each pair of CROSS standups to light the central lock. Shoot the lit saucer for 5,000 and lock one ball; unlit captures score 1,000.',
      'Plunge the replacement ball to release the lock and start two-ball multiball. Your ball number and bonus stay the same.',
      'During multiball, hit both different spinners to light the saucer jackpot: 10,000, then 15,000, then 20,000 maximum. Relight both spinners after each collection.',
      'Losing one ball ends multiball. Complete both banks again to relight lock; the final drain collects bonus × multiplier.',
      'Bank, top-lane and drop-pair completions light double-value spinners. Complete four top lanes to advance bonus multiplication up to 2×; both drops advance it up to 3×. Currently, completing the top lanes at 3× reduces it to 2×.',
    ],
  },
  'harlem-globetrotters': {
    balls: 3,
    objective: 'Shoot the upper saucers for the biggest awards.',
    rules: [
      'The upper-right saucer scores 25,000 points; the upper-center saucer scores 5,000.',
      'Each drop target scores 500. Standup targets score 300.',
      'Keep the ball moving through bumpers, spinners and rollovers to add points.',
      'This recreation currently uses direct scoring. Original-machine bonus ladders, extra-ball and special rules are not implemented.',
    ],
  },
  'starlight-em': {
    balls: 5,
    objective: 'Light the constellation and collect the observatory.',
    rules: [
      'Spell STAR in the four top lanes for 2,000, light 1,000-point pops, and advance bonus multiplication up to 5×.',
      'Complete the left COMET bank to light its orbit spinner for 500 per spin. Complete the right NOVA bank to light the center spinner for 1,000.',
      'With both banks lit, the observatory saucer collects 10,000, rising by 5,000 each collection up to 25,000. Both banks and spinner lights reset after collection.',
      'Complete STAR during the same ball before collecting the lit observatory to earn an extra ball, once per game.',
      'Build up to 20,000 bonus and collect it × multiplier on drain. Feature lights reset each ball; the observatory award carries across balls.',
    ],
  },
};
