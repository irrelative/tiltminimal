import { classicRulesScript } from './classic-rules-script';
import {
  absolutePoint,
  anchorPoint,
  createFlipperPair,
  createMirroredRollovers,
  createMirroredStandupTargets,
} from './layout-primitives';
import type { BoardLayoutDefinition } from './layout-schema';

export const classicTableLayout: BoardLayoutDefinition = {
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
    { position: absolutePoint(300, 350), radius: 44, score: 100, material: 'rubberPost' },
    { position: absolutePoint(600, 420), radius: 44, score: 100, material: 'rubberPost' },
    { position: absolutePoint(450, 600), radius: 52, score: 250, material: 'rubberPost' },
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
      start: absolutePoint(220, 1088),
      end: absolutePoint(362, 1144),
      thickness: 20,
      material: 'rubberPost',
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
    {
      start: absolutePoint(680, 1088),
      end: absolutePoint(538, 1144),
      thickness: 20,
      material: 'rubberPost',
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
