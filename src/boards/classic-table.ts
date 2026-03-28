import { createBoardDefinition } from '../game/physics-defaults';

export const classicTable = createBoardDefinition({
  name: 'Classic Table',
  width: 900,
  height: 1400,
  drainY: 1425,
  launchPosition: {
    x: 770,
    y: 1180,
  },
  materials: {
    playfield: 'playfieldWood',
    walls: 'metalGuide',
  },
  bumpers: [
    { x: 300, y: 350, radius: 44, score: 100, material: 'rubberPost' },
    { x: 600, y: 420, radius: 44, score: 100, material: 'rubberPost' },
    { x: 450, y: 600, radius: 52, score: 250, material: 'rubberPost' },
  ],
  guides: [
    {
      start: { x: 90, y: 880 },
      end: { x: 170, y: 1260 },
      thickness: 14,
      material: 'metalGuide',
    },
    {
      start: { x: 250, y: 1000 },
      end: { x: 214, y: 1284 },
      thickness: 18,
      material: 'metalGuide',
    },
    {
      start: { x: 220, y: 1088 },
      end: { x: 362, y: 1144 },
      thickness: 20,
      material: 'rubberPost',
    },
    {
      start: { x: 810, y: 880 },
      end: { x: 730, y: 1260 },
      thickness: 14,
      material: 'metalGuide',
    },
    {
      start: { x: 650, y: 1000 },
      end: { x: 686, y: 1284 },
      thickness: 18,
      material: 'metalGuide',
    },
    {
      start: { x: 680, y: 1088 },
      end: { x: 538, y: 1144 },
      thickness: 20,
      material: 'rubberPost',
    },
  ],
  flippers: [
    {
      side: 'left',
      x: 270,
      y: 1220,
      length: 150,
      thickness: 20,
      restingAngle: 0.28,
      activeAngle: -0.42,
      material: 'flipperRubber',
    },
    {
      side: 'right',
      x: 630,
      y: 1220,
      length: 150,
      thickness: 20,
      restingAngle: Math.PI - 0.28,
      activeAngle: Math.PI + 0.42,
      material: 'flipperRubber',
    },
  ],
});
