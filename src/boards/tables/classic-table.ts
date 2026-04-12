import {
  absolutePoint,
  anchorPoint,
  createFlipperPair,
  createMirroredRollovers,
  createMirroredStandupTargets,
  createSlingshotPair,
} from '../layout-primitives';
import type { BoardLayoutDefinition } from '../layout-schema';
import { compileBuiltInBoardLayout } from '../layout-compiler';

const classicRulesScript = `
const BALLS_PER_GAME = 3;
const TOP_LANES = ['top-left-lane', 'top-center-lane', 'top-right-lane'];

function resetTopLanes(ctx) {
  TOP_LANES.forEach((lane) => ctx.setMachine(lane, false));
}

function areTopLanesComplete(ctx) {
  return TOP_LANES.every((lane) => ctx.getMachine(lane) === true);
}

return {
  onGameStart(ctx) {
    ctx.setBallsPerGame(BALLS_PER_GAME);
    ctx.setBallsRemaining(BALLS_PER_GAME);
    ctx.setCurrentBall(1);
    ctx.setBonus(0);
    ctx.setBonusMultiplier(1);
    resetTopLanes(ctx);
  },

  onBallStart(ctx) {
    ctx.setBonus(0);
    ctx.setBonusMultiplier(1);
    resetTopLanes(ctx);
  },

  onEvent(event, ctx) {
    if (event.type === 'bumper-hit') {
      ctx.addScore(event.score);
      ctx.addBonus(100);
      return;
    }

    if (event.type === 'standup-target-hit') {
      ctx.addScore(event.score);
      ctx.addBonus(500);
      return;
    }

    if (event.type === 'drop-target-hit') {
      ctx.addScore(event.score);
      ctx.addBonus(1000);
      ctx.increaseBonusMultiplier(1, 3);
      return;
    }

    if (event.type === 'saucer-captured') {
      ctx.addScore(event.score);
      ctx.addBonus(1500);
      return;
    }

    if (event.type === 'spinner-spin') {
      ctx.addScore(event.score);
      ctx.addBonus(25);
      return;
    }

    if (event.type === 'slingshot-hit') {
      ctx.addScore(event.score);
      ctx.addBonus(75);
      return;
    }

    if (event.type === 'rollover-hit') {
      ctx.addScore(event.score);
      ctx.addBonus(250);

      const lane = TOP_LANES[event.index] ?? 'lane-' + String(event.index);
      ctx.setMachine(lane, true);

      if (areTopLanesComplete(ctx)) {
        ctx.addScore(1000);
        ctx.increaseBonusMultiplier(1, 5);
        resetTopLanes(ctx);
      }

      return;
    }

    if (event.type === 'ball-drained') {
      const bonusAward = ctx.getBonus() * ctx.getBonusMultiplier();

      if (bonusAward > 0) {
        ctx.addScore(bonusAward);
      }

      if (ctx.getBallsRemaining() > 1) {
        ctx.startNextBall();
      } else {
        ctx.endGame();
      }
    }
  },
};
`;

const classicSlingshots = createSlingshotPair({
  leftCenter: absolutePoint(291, 1116),
  rightCenter: absolutePoint(609, 1116),
  width: 152,
  height: 24,
  leftAngle: 0.375,
  rightAngle: Math.PI - 0.375,
  score: 10,
  strength: 560,
});

const classicTableLayout: BoardLayoutDefinition = {
  name: 'Classic Table',
  template: 'solid-state-two-flipper',
  width: 900,
  height: 1400,
  rulesScript: classicRulesScript,
  drainY: 1425,
  launchPosition: absolutePoint(770, 1180),
  materials: {
    playfield: 'playfieldWood',
    walls: 'metalGuide',
  },
  anchors: [
    { id: 'top-rollover-center', point: absolutePoint(450, 170) },
    { id: 'standup-center', point: absolutePoint(450, 760) },
  ],
  bumpers: [
    {
      position: absolutePoint(300, 350),
      radius: 44,
      score: 100,
      material: 'rubberPost',
    },
    {
      position: absolutePoint(600, 420),
      radius: 44,
      score: 100,
      material: 'rubberPost',
    },
    {
      position: absolutePoint(450, 600),
      radius: 52,
      score: 250,
      material: 'rubberPost',
    },
  ],
  standupTargets: createMirroredStandupTargets({
    center: anchorPoint('standup-center'),
    offsetX: 220,
    width: 60,
    height: 16,
    angleOffset: 0.2,
    score: 50,
    material: 'rubberPost',
  }),
  dropTargets: [
    {
      position: absolutePoint(450, 470),
      width: 54,
      height: 16,
      angle: -Math.PI / 2,
      score: 100,
      material: 'rubberPost',
    },
  ],
  saucers: [
    {
      position: absolutePoint(450, 240),
      radius: 30,
      score: 500,
      holdSeconds: 0.5,
      ejectSpeed: 980,
      ejectAngle: Math.PI / 2,
      material: 'metalGuide',
    },
  ],
  spinners: [
    {
      position: absolutePoint(450, 820),
      length: 96,
      thickness: 10,
      angle: 0,
      score: 10,
      material: 'metalGuide',
    },
  ],
  slingshots: classicSlingshots.slingshots,
  rollovers: createMirroredRollovers({
    center: anchorPoint('top-rollover-center'),
    offsetsX: [-150, 0, 150],
    radius: 24,
    score: 25,
  }),
  guides: [
    {
      start: absolutePoint(90, 880),
      end: absolutePoint(170, 1260),
      thickness: 14,
      material: 'metalGuide',
      plane: 'raised',
    },
    {
      start: absolutePoint(250, 1000),
      end: absolutePoint(214, 1284),
      thickness: 18,
      material: 'metalGuide',
      plane: 'raised',
    },
    {
      start: absolutePoint(810, 880),
      end: absolutePoint(730, 1260),
      thickness: 14,
      material: 'metalGuide',
      plane: 'raised',
    },
    {
      start: absolutePoint(650, 1000),
      end: absolutePoint(686, 1284),
      thickness: 18,
      material: 'metalGuide',
      plane: 'raised',
    },
  ],
  flippers: createFlipperPair({
    leftX: 270,
    rightX: 630,
    y: 1220,
    length: 150,
    thickness: 20,
    restingAngleOffset: 0.28,
    activeAngleOffset: -0.42,
    material: 'flipperRubber',
  }),
};

export const classicTable = compileBuiltInBoardLayout(classicTableLayout);
