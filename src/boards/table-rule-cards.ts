export interface TableRuleCard {
  balls: number;
  objective: string;
  rules: string[];
}

/** Summaries of this game's rule scripts, including simplified recreations. */
export const TABLE_RULE_CARDS: Record<string, TableRuleCard> = {
  'classic-table': {
    balls: 3,
    objective: 'Build bonus and complete the top lanes.',
    rules: [
      'Complete all three top lanes for 1,000 points and advance the bonus multiplier, up to 5×.',
      'Hit the drop target to add 1,000 bonus and advance its multiplier up to 3×.',
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
      'Clear all six bank drops for 50,000 and a higher spinner value. The second completion lights extra ball; the third lights special.',
      'Standups power up the bumpers. Build up to 80,000 bonus and collect it × multiplier at the end of the ball.',
    ],
  },
  'double-crossed': {
    balls: 3,
    objective: 'Complete the crosses to light double-value spinners.',
    rules: [
      'Complete either pair of cross standups for 1,500 points, 1,000 bonus and lit spinners.',
      'Complete all four top lanes for 2,000 points, 1,000 bonus and lit spinners; advance bonus multiplication up to 2×.',
      'Hit both drop targets for 3,000 points, 1,500 bonus and lit spinners; advance bonus multiplication up to 3×.',
      'Lit spinners score double for the rest of the ball. Collect bonus × multiplier when the ball drains.',
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
      'Complete STAR before collecting the lit observatory to earn an extra ball, once per game.',
      'Build up to 20,000 bonus and collect it × multiplier on drain. Feature lights reset each ball; the observatory award carries across balls.',
    ],
  },
};
