import {
  getFlipperRadiusAt,
  getFlipperTipPosition,
} from '../game/flipper-geometry';
import {
  getArcGuidePoint,
  getArcGuideSweep,
  isArcGuide,
} from '../game/guide-geometry';
import type {
  BoardDefinition,
  FlipperDefinition,
  GuideDefinition,
  Point,
} from '../types/board-definition';

const MIN_OVERLAP_PENETRATION = 4;
const MIN_SAMPLE_SPACING = 16;

export interface TableAnalysisElementRef {
  kind: string;
  index: number;
  label: string;
}

export interface TableAnalysisWarning {
  severity: 'warning';
  code: 'element-overlap';
  message: string;
  elements: [TableAnalysisElementRef, TableAnalysisElementRef];
}

interface SampleCircle {
  x: number;
  y: number;
  radius: number;
}

interface AnalyzableElement {
  ref: TableAnalysisElementRef;
  samples: SampleCircle[];
}

export const analyzeBoard = (
  board: BoardDefinition,
): TableAnalysisWarning[] => {
  const elements = collectAnalyzableElements(board);
  const warnings: TableAnalysisWarning[] = [];

  for (let leftIndex = 0; leftIndex < elements.length; leftIndex += 1) {
    const left = elements[leftIndex];

    for (
      let rightIndex = leftIndex + 1;
      rightIndex < elements.length;
      rightIndex += 1
    ) {
      const right = elements[rightIndex];

      if (!elementsPotentiallyOverlap(left.samples, right.samples)) {
        continue;
      }

      warnings.push({
        severity: 'warning',
        code: 'element-overlap',
        message: `${left.ref.label} overlaps ${right.ref.label}.`,
        elements: [left.ref, right.ref],
      });
    }
  }

  return warnings;
};

const collectAnalyzableElements = (
  board: BoardDefinition,
): AnalyzableElement[] => {
  const elements: AnalyzableElement[] = [];

  board.bumpers.forEach((bumper, index) => {
    elements.push({
      ref: createRef('bumper', index, 'Bumper'),
      samples: [{ x: bumper.x, y: bumper.y, radius: bumper.radius }],
    });
  });

  board.posts.forEach((post, index) => {
    elements.push({
      ref: createRef('post', index, 'Post'),
      samples: [{ x: post.x, y: post.y, radius: post.radius }],
    });
  });

  board.saucers.forEach((saucer, index) => {
    elements.push({
      ref: createRef('saucer', index, 'Saucer'),
      samples: [{ x: saucer.x, y: saucer.y, radius: saucer.radius }],
    });
  });

  board.rollovers.forEach((rollover, index) => {
    elements.push({
      ref: createRef('rollover', index, 'Rollover'),
      samples: [{ x: rollover.x, y: rollover.y, radius: rollover.radius }],
    });
  });

  board.standupTargets.forEach((target, index) => {
    elements.push({
      ref: createRef('standup-target', index, 'Target'),
      samples: createOrientedCapsuleSamples(
        target,
        target.width,
        target.height,
        target.angle,
      ),
    });
  });

  board.dropTargets.forEach((target, index) => {
    elements.push({
      ref: createRef('drop-target', index, 'Drop Target'),
      samples: createOrientedCapsuleSamples(
        target,
        target.width,
        target.height,
        target.angle,
      ),
    });
  });

  board.spinners.forEach((spinner, index) => {
    elements.push({
      ref: createRef('spinner', index, 'Spinner'),
      samples: createOrientedCapsuleSamples(
        spinner,
        spinner.length,
        spinner.thickness,
        spinner.angle,
      ),
    });
  });

  board.slingshots.forEach((slingshot, index) => {
    elements.push({
      ref: createRef('slingshot', index, 'Slingshot'),
      samples: createOrientedCapsuleSamples(
        slingshot,
        slingshot.width,
        slingshot.height,
        slingshot.angle,
      ),
    });
  });

  board.flippers.forEach((flipper, index) => {
    elements.push({
      ref: createRef('flipper', index, 'Flipper'),
      samples: createFlipperSamples(flipper),
    });
  });

  board.guides.forEach((guide, index) => {
    if ((guide.plane ?? 'playfield') === 'raised') {
      return;
    }

    elements.push({
      ref: createRef('guide', index, 'Guide'),
      samples: createGuideSamples(guide),
    });
  });

  return elements;
};

const createRef = (
  kind: string,
  index: number,
  labelPrefix: string,
): TableAnalysisElementRef => ({
  kind,
  index,
  label: `${labelPrefix} ${index + 1}`,
});

const elementsPotentiallyOverlap = (
  left: SampleCircle[],
  right: SampleCircle[],
): boolean => {
  for (const leftCircle of left) {
    for (const rightCircle of right) {
      const distance = Math.hypot(
        leftCircle.x - rightCircle.x,
        leftCircle.y - rightCircle.y,
      );
      const penetration =
        leftCircle.radius + rightCircle.radius - distance;

      if (penetration >= MIN_OVERLAP_PENETRATION) {
        return true;
      }
    }
  }

  return false;
};

const createOrientedCapsuleSamples = (
  center: Point,
  length: number,
  thickness: number,
  angle: number,
): SampleCircle[] => {
  const halfLength = length / 2;
  const radius = thickness / 2;
  const segmentStart = {
    x: center.x - Math.cos(angle) * halfLength,
    y: center.y - Math.sin(angle) * halfLength,
  };
  const segmentEnd = {
    x: center.x + Math.cos(angle) * halfLength,
    y: center.y + Math.sin(angle) * halfLength,
  };

  return sampleSegment(segmentStart, segmentEnd, radius);
};

const createFlipperSamples = (flipper: FlipperDefinition): SampleCircle[] => {
  const tip = getFlipperTipPosition(flipper, flipper.restingAngle);
  const sampleCount = Math.max(
    5,
    Math.ceil(flipper.length / Math.max(flipper.thickness * 0.7, MIN_SAMPLE_SPACING)),
  );
  const samples: SampleCircle[] = [];

  for (let index = 0; index <= sampleCount; index += 1) {
    const ratio = index / sampleCount;
    samples.push({
      x: flipper.x + (tip.x - flipper.x) * ratio,
      y: flipper.y + (tip.y - flipper.y) * ratio,
      radius: getFlipperRadiusAt(flipper, ratio),
    });
  }

  return samples;
};

const createGuideSamples = (guide: GuideDefinition): SampleCircle[] => {
  const radius = guide.thickness / 2;

  if (!isArcGuide(guide)) {
    return sampleSegment(guide.start, guide.end, radius);
  }

  const sweep = getArcGuideSweep(guide);
  const arcLength = guide.radius * sweep;
  const sampleCount = Math.max(
    4,
    Math.ceil(arcLength / Math.max(radius * 1.3, MIN_SAMPLE_SPACING)),
  );
  const samples: SampleCircle[] = [];

  for (let index = 0; index <= sampleCount; index += 1) {
    const angle = guide.startAngle + (sweep * index) / sampleCount;
    const point = getArcGuidePoint(guide, angle);
    samples.push({
      x: point.x,
      y: point.y,
      radius,
    });
  }

  return samples;
};

const sampleSegment = (
  start: Point,
  end: Point,
  radius: number,
): SampleCircle[] => {
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  const sampleCount = Math.max(
    1,
    Math.ceil(length / Math.max(radius * 1.3, MIN_SAMPLE_SPACING)),
  );
  const samples: SampleCircle[] = [];

  for (let index = 0; index <= sampleCount; index += 1) {
    const ratio = index / sampleCount;
    samples.push({
      x: start.x + (end.x - start.x) * ratio,
      y: start.y + (end.y - start.y) * ratio,
      radius,
    });
  }

  return samples;
};
