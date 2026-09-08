import type { GameState } from '../game/game-state';

// Vector interpretation of the photographed orange bubble/ray artwork.
// All painted panels and inserts are decorative, not collision boundaries.
export function drawAndromedaPlayfield(
  c: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  c.save();
  c.scale(width / 1000, height / 1800);
  c.fillStyle = '#121319';
  c.fillRect(0, 0, 1000, 1800);
  const panel = (points: number[][], fill: string, stroke = '#eab94f') => {
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    c.lineWidth = 4;
    c.strokeStyle = stroke;
    c.stroke();
  };
  // Orange radial beams and dense outlined circles are the original's most
  // distinctive surface treatment, replacing the former generic starfield.
  for (let i = 0; i < 22; i++) {
    const a = (i * Math.PI * 2) / 22;
    panel(
      [
        [470, 620],
        [470 + 1300 * Math.cos(a), 620 + 1300 * Math.sin(a)],
        [470 + 1300 * Math.cos(a + 0.12), 620 + 1300 * Math.sin(a + 0.12)],
      ],
      i % 2 ? '#67291a' : '#b4471d',
      '#3b2018',
    );
  }
  for (let row = 0; row < 30; row++)
    for (let col = 0; col < 23; col++) {
      const x = 20 + col * 43 + (row % 2) * 17,
        y = 25 + row * 43;
      const radius = 5 + ((row * 7 + col * 11) % 15);
      c.beginPath();
      c.arc(x, y, radius, 0, Math.PI * 2);
      c.fillStyle = ['#c64a1b', '#e77e19', '#efb52c', '#7e2a18'][
        (row + col) % 4
      ];
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = '#191b1d';
      c.stroke();
    }
  panel(
    [
      [30, 1050],
      [280, 1010],
      [450, 1190],
      [780, 1120],
      [855, 1710],
      [450, 1760],
      [35, 1640],
    ],
    '#161518',
  );
  // One diagonal target platform with two colored groups of three.
  panel(
    [
      [277, 793],
      [747, 1065],
      [657, 1193],
      [190, 921],
    ],
    '#ed8b20',
    '#101d26',
  );
  const label = (
    text: string,
    x: number,
    y: number,
    size = 18,
    color = '#ffe3a0',
  ) => {
    c.font = `700 ${size}px Futura, sans-serif`;
    c.fillStyle = color;
    c.textAlign = 'center';
    c.fillText(text, x, y);
  };
  for (let i = 0; i < 6; i++) {
    const x = 330 + i * 76,
      y = 780 + i * 44;
    panel(
      [
        [x - 23, y + 25],
        [x + 25, y + 53],
        [x - 27, y + 133],
        [x - 74, y + 105],
      ],
      i < 3 ? '#b84523' : '#275b75',
    );
    c.beginPath();
    c.ellipse(x - 44, y + 135, 29, 18, 0.52, 0, Math.PI * 2);
    c.fillStyle = '#eaca58';
    c.fill();
    label('3000', x - 44, y + 140, 14, '#191818');
  }
  c.save();
  c.translate(515, 980);
  c.rotate(0.52);
  label('ALL TARGETS DOWN · 50,000', 0, 0, 18, '#101a22');
  label('ADVANCE SPINNER VALUE', 0, 24, 15, '#101a22');
  c.restore();
  // Stylized gold helmet/face and dark shoulder silhouette in the lower left,
  // positioned like the original portrait without importing a scanned image.
  panel(
    [
      [92, 1200],
      [158, 1120],
      [268, 1120],
      [326, 1210],
      [300, 1380],
      [340, 1570],
      [115, 1590],
      [82, 1350],
    ],
    '#392d28',
  );
  panel(
    [
      [145, 1190],
      [180, 1136],
      [255, 1150],
      [292, 1220],
      [255, 1312],
      [202, 1330],
      [152, 1280],
    ],
    '#cda763',
  );
  panel(
    [
      [145, 1190],
      [180, 1136],
      [255, 1150],
      [292, 1220],
      [245, 1200],
      [208, 1225],
      [165, 1199],
    ],
    '#293942',
  );
  panel(
    [
      [172, 1226],
      [204, 1232],
      [187, 1245],
    ],
    '#121c23',
  );
  panel(
    [
      [230, 1232],
      [267, 1223],
      [250, 1244],
    ],
    '#121c23',
  );
  c.strokeStyle = '#35221c';
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(216, 1237);
  c.lineTo(204, 1270);
  c.lineTo(220, 1272);
  c.moveTo(198, 1290);
  c.lineTo(235, 1286);
  c.stroke();
  // Bonus and multiplier inserts descend into the open central lower field.
  for (let i = 0; i < 9; i++) {
    const x = 450 + (i % 2 ? 70 : -70),
      y = 1300 + Math.floor(i / 2) * 55;
    c.beginPath();
    c.ellipse(x, y, 21, 16, 0, 0, Math.PI * 2);
    c.fillStyle = '#d98828';
    c.fill();
    label(String(9 - i), x, y + 6, 17, '#18191d');
  }
  ['10X', '5X', '4X', '3X', '2X'].forEach((t, i) =>
    label(t, 450, 1260 + i * 54, 24),
  );
  [
    [360, 1230, '10'],
    [548, 1210, '20'],
    [305, 1320, '40'],
    [600, 1155, '80'],
  ].forEach(([x, y, t]) => {
    c.beginPath();
    c.ellipse(Number(x), Number(y), 28, 20, 0, 0, Math.PI * 2);
    c.fillStyle = '#efcb72';
    c.fill();
    label(String(t), Number(x), Number(y) + 7, 21, '#17181c');
  });
  for (const [text, x, y] of [
    ['LOCK · 30,000', 110, 285],
    ['5,000', 110, 588],
    ['SPINNER', 245, 570],
    ['LAUNCH BALL', 160, 1110],
    ['20,000', 833, 925],
    ['20,000', 833, 1115],
    ['EXTRA', 770, 1410],
    ['SPECIAL', 850, 1410],
  ] as const)
    label(text, x, y, 17);
  ['1', '2', '3'].forEach((t, i) => label(t, 340 + i * 110, 265, 23));
  label('ANDROMEDA', 450, 1755, 34, '#ef862a');
  label('GAME PLAN · A NEW GENERATION', 450, 1780, 13);
  c.restore();
}

export function drawAndromedaInserts(
  c: CanvasRenderingContext2D,
  state: GameState,
): void {
  const lamp = (x: number, y: number, lit: boolean) => {
    c.fillStyle = lit ? '#fff495' : '#53352d';
    c.strokeStyle = '#efb568';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(x, y, 16, 10, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  };
  lamp(
    160,
    1195,
    state.lockedBalls.length > 0 || Boolean(state.rules.ballValues.multiball),
  );
  lamp(832, 995, Boolean(state.rules.ballValues.upperLane));
  lamp(832, 1185, Boolean(state.rules.ballValues.lowerLane));
  lamp(770, 1435, Boolean(state.rules.ballValues.extraLit));
  lamp(850, 1435, Boolean(state.rules.ballValues.specialLit));
}
