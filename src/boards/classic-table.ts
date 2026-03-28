import type { BoardDefinition } from '../types/board-definition';

export const classicTable: BoardDefinition = {
  name: 'Classic Table',
  width: 900,
  height: 1400,
  gravity: 1600,
  drainY: 1425,
  ball: {
    radius: 16,
    mass: 0.08,
  },
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
};
