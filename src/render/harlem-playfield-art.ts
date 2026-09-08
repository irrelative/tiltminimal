// Original vector interpretation of the photographed 1979 playfield artwork.
// This layer is decorative; collision geometry lives entirely in the board.
export const drawHarlemPlayfield = (
  c: CanvasRenderingContext2D,
  width: number,
  height: number,
): void => {
  c.save();
  c.scale(width / 1000, height / 2000);
  c.fillStyle = '#dfbf66';
  c.fillRect(0, 0, 1000, 2000);
  c.strokeStyle = '#b59145';
  c.lineWidth = 1;
  for (let x = 20; x < 900; x += 24) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, 1350);
    c.stroke();
    for (let y = (x % 5) * 100; y < 1350; y += 290) {
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 24, y);
      c.stroke();
    }
  }
  const polygon = (
    points: number[][],
    fill: string,
    stroke = '#efe5c4',
    lineWidth = 6,
  ) => {
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    c.strokeStyle = stroke;
    c.lineWidth = lineWidth;
    c.stroke();
  };
  polygon(
    [
      [25, 1280],
      [450, 1160],
      [880, 1270],
      [880, 1850],
      [490, 1970],
      [25, 1810],
    ],
    '#32669b',
  );
  const stripe = (points: number[][]) => {
    for (const [lineWidth, color] of [
      [66, '#b73231'],
      [43, '#f2e6c6'],
      [21, '#254f83'],
    ] as const) {
      c.beginPath();
      points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.lineWidth = lineWidth;
      c.strokeStyle = color;
      c.stroke();
    }
  };
  stripe([
    [35, 110],
    [35, 1750],
    [480, 1950],
    [860, 1770],
    [860, 150],
  ]);
  stripe([
    [240, 520],
    [450, 980],
    [620, 520],
  ]);
  stripe([
    [175, 1160],
    [450, 1270],
    [745, 1110],
  ]);
  const star = (x: number, y: number, r: number, fill: string) => {
    const pts = Array.from({ length: 10 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const radius = i % 2 ? r * 0.44 : r;
      return [x + Math.cos(a) * radius, y + Math.sin(a) * radius];
    });
    polygon(pts, fill, '#e7ca68', 7);
  };
  c.beginPath();
  c.arc(450, 1110, 240, 0, Math.PI * 2);
  c.fillStyle = '#b73032';
  c.fill();
  c.strokeStyle = '#eee1b8';
  c.lineWidth = 8;
  c.stroke();
  star(450, 1100, 250, '#244f8d');
  const label = (
    text: string,
    x: number,
    y: number,
    size = 24,
    color = '#17345b',
  ) => {
    c.fillStyle = color;
    c.font = `bold ${size}px Georgia, serif`;
    c.textAlign = 'center';
    c.fillText(text, x, y);
  };
  label('HARLEM', 450, 1055, 45, '#f6e3ab');
  label('GLOBETROTTERS', 450, 1138, 31, '#f6e3ab');
  label('ON TOUR', 450, 1180, 23, '#f6e3ab');
  label('THE MAGIC CIRCLE', 450, 918, 22, '#f6e3ab');
  for (const [i, letter] of [...'GLOBE'].entries()) {
    c.beginPath();
    c.ellipse(322 + i * 64, 1090, 24, 17, 0, 0, Math.PI * 2);
    c.fillStyle = '#e3bd57';
    c.fill();
    label(letter, 322 + i * 64, 1098, 24, '#a2292e');
  }
  for (const [i, text] of ['2X', '3X', '5X'].entries())
    label(text, 330 + i * 120, 1280, 28);
  const rowStart = [7, 4, 2, 1];
  for (let row = 0; row < 4; row++)
    for (let j = 0; j < 4 - row; j++) {
      const x = 450 + (j - (3 - row) / 2) * 72,
        y = 1450 + row * 95;
      star(x, y, 42, '#b53332');
      c.beginPath();
      c.ellipse(x, y, 24, 17, 0, 0, Math.PI * 2);
      c.fillStyle = '#eedaa0';
      c.fill();
      label(String(rowStart[row] + j), x, y + 8, 22);
    }
  label('GLOBE', 450, 155, 24);
  label('FREE THROW', 748, 800, 23);
  label('DUNK SHOT', 775, 990, 21);
  label('25,000', 750, 195, 23);
  label('5000', 450, 305, 19);
  label('Bally', 810, 1930, 36, '#a8292f');
  for (let i = 0; i < 5; i++) {
    c.beginPath();
    c.ellipse(165, 730 + i * 90, 20, 15, 0, 0, Math.PI * 2);
    c.fillStyle = '#b73331';
    c.fill();
    label(String(5 - i), 165, 736 + i * 90, 18, '#f2deaa');
  }
  c.restore();
};
