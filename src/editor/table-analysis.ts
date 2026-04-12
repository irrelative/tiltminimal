import {
  getDistanceToFlipperSurface,
  getFlipperRadiusAt,
  getFlipperTipPosition,
} from '../game/flipper-geometry';
import {
  getArcGuidePoint,
  getArcGuideSweep,
  isArcGuide,
} from '../game/guide-geometry';
import {
  getPlungerGuideTopY,
} from '../game/plunger-geometry';
import type {
  BoardDefinition,
  FlipperDefinition,
  GuideDefinition,
  Point,
} from '../types/board-definition';

const MIN_OVERLAP_PENETRATION = 4;
const MIN_SAMPLE_SPACING = 16;
const FLIPPER_KEEPOUT_MARGIN = 14;
const SPINNER_CLEARANCE_MARGIN = 4;
const PATH_SAMPLE_STEP = 14;

export type TableAnalysisWarningCode =
  | 'element-overlap'
  | 'element-out-of-bounds'
  | 'launcher-blocked'
  | 'flipper-keepout'
  | 'spinner-obstructed'
  | 'saucer-eject-obstructed'
  | 'rules-event-unhandled';

export interface TableAnalysisElementRef {
  kind: string;
  index: number;
  label: string;
}

export interface TableAnalysisWarning {
  severity: 'warning';
  code: TableAnalysisWarningCode;
  title: string;
  message: string;
  elements?: TableAnalysisElementRef[];
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
  const warnings: TableAnalysisWarning[] = [];
  const playfieldElements = collectAnalyzableElements(board, false);
  const allElements = collectAnalyzableElements(board, true);

  analyzeElementOverlaps(playfieldElements, warnings);
  analyzeOutOfBounds(board, allElements, warnings);
  analyzeLaunchCorridor(board, playfieldElements, warnings);
  analyzeFlipperKeepouts(board, playfieldElements, warnings);
  analyzeSpinnerClearance(board, playfieldElements, warnings);
  analyzeSaucerEjectPaths(board, playfieldElements, warnings);
  analyzeRulesCoverage(board, warnings);

  return warnings;
};

const analyzeElementOverlaps = (
  elements: AnalyzableElement[],
  warnings: TableAnalysisWarning[],
): void => {
  for (let leftIndex = 0; leftIndex < elements.length; leftIndex += 1) {
    const left = elements[leftIndex];

    for (
      let rightIndex = leftIndex + 1;
      rightIndex < elements.length;
      rightIndex += 1
    ) {
      const right = elements[rightIndex];

      if (shouldIgnoreOverlapPair(left.ref, right.ref)) {
        continue;
      }

      if (!elementsPotentiallyOverlap(left.samples, right.samples)) {
        continue;
      }

      warnings.push({
        severity: 'warning',
        code: 'element-overlap',
        title: 'Potential overlap',
        message: `${left.ref.label} overlaps ${right.ref.label}.`,
        elements: [left.ref, right.ref],
      });
    }
  }
};

const analyzeOutOfBounds = (
  board: BoardDefinition,
  elements: AnalyzableElement[],
  warnings: TableAnalysisWarning[],
): void => {
  for (const element of elements) {
    const extendsBeyondBounds = element.samples.some(
      (sample) =>
        sample.x - sample.radius < 0 ||
        sample.x + sample.radius > board.width ||
        sample.y - sample.radius < 0 ||
        sample.y + sample.radius > board.height,
    );

    if (!extendsBeyondBounds) {
      continue;
    }

    warnings.push({
      severity: 'warning',
      code: 'element-out-of-bounds',
      title: 'Out of bounds',
      message: `${element.ref.label} extends beyond the table bounds.`,
      elements: [element.ref],
    });
  }
};

const analyzeLaunchCorridor = (
  board: BoardDefinition,
  elements: AnalyzableElement[],
  warnings: TableAnalysisWarning[],
): void => {
  const guideTopY = getPlungerGuideTopY(board);
  const upperReachY = Math.max(24, guideTopY - 180);
  const start = {
    x: board.launchPosition.x,
    y: guideTopY - 2,
  };
  const end = {
    x: board.launchPosition.x,
    y: upperReachY,
  };
  const blocker = findPathBlocker(
    start,
    end,
    board.ball.radius + 4,
    elements.filter((element) => element.ref.kind !== 'flipper'),
  );

  if (!blocker) {
    return;
  }

  warnings.push({
    severity: 'warning',
    code: 'launcher-blocked',
    title: 'Shooter lane obstruction',
    message: `The shooter lane launch path is obstructed by ${blocker.label}.`,
    elements: [blocker],
  });
};

const analyzeFlipperKeepouts = (
  board: BoardDefinition,
  elements: AnalyzableElement[],
  warnings: TableAnalysisWarning[],
): void => {
  const keepoutKinds = new Set([
    'guide',
    'post',
    'standup-target',
    'drop-target',
    'slingshot',
  ]);

  const keepoutElements = elements.filter((element) =>
    keepoutKinds.has(element.ref.kind),
  );

  board.flippers.forEach((flipper) => {
    for (const element of keepoutElements) {
      const intrudes = element.samples.some(
        (sample) =>
          getMinFlipperSweepDistance(sample, flipper) <
          sample.radius + FLIPPER_KEEPOUT_MARGIN,
      );

      if (!intrudes) {
        continue;
      }

      warnings.push({
        severity: 'warning',
        code: 'flipper-keepout',
        title: 'Flipper keepout violation',
        message: `${element.ref.label} intrudes into the ${formatFlipperLabel(flipper)} keepout area.`,
        elements: [element.ref],
      });
    }
  });
};

const analyzeSpinnerClearance = (
  board: BoardDefinition,
  elements: AnalyzableElement[],
  warnings: TableAnalysisWarning[],
): void => {
  const obstructingKinds = new Set(['guide', 'post']);

  board.spinners.forEach((spinner, spinnerIndex) => {
    const spinnerRef = createRef('spinner', spinnerIndex, 'Spinner');
    const sweepRadius = spinner.length / 2 + spinner.thickness / 2;

    for (const element of elements) {
      if (!obstructingKinds.has(element.ref.kind)) {
        continue;
      }

      const obstructsSpinner = element.samples.some(
        (sample) =>
          Math.hypot(sample.x - spinner.x, sample.y - spinner.y) <
          sweepRadius + sample.radius + SPINNER_CLEARANCE_MARGIN,
      );

      if (!obstructsSpinner) {
        continue;
      }

      warnings.push({
        severity: 'warning',
        code: 'spinner-obstructed',
        title: 'Spinner clearance issue',
        message: `${element.ref.label} intrudes into ${spinnerRef.label}'s rotation envelope.`,
        elements: [spinnerRef, element.ref],
      });
    }
  });
};

const analyzeSaucerEjectPaths = (
  board: BoardDefinition,
  elements: AnalyzableElement[],
  warnings: TableAnalysisWarning[],
): void => {
  board.saucers.forEach((saucer, saucerIndex) => {
    const saucerRef = createRef('saucer', saucerIndex, 'Saucer');
    const ejectDistance = Math.max(110, Math.min(190, saucer.ejectSpeed * 0.18));
    const start = { x: saucer.x, y: saucer.y };
    const end = {
      x: saucer.x + Math.cos(saucer.ejectAngle) * ejectDistance,
      y: saucer.y + Math.sin(saucer.ejectAngle) * ejectDistance,
    };
    const blocker = findPathBlocker(
      start,
      end,
      board.ball.radius + 2,
      elements.filter(
        (element) =>
          !(
            element.ref.kind === 'saucer' && element.ref.index === saucerIndex
          ) &&
          element.ref.kind !== 'rollover' &&
          !isSaucerPocketGuide(element, saucer),
      ),
    );

    if (!blocker) {
      return;
    }

    warnings.push({
      severity: 'warning',
      code: 'saucer-eject-obstructed',
      title: 'Saucer eject obstruction',
      message: `${saucerRef.label}'s eject path is immediately obstructed by ${blocker.label}.`,
      elements: [saucerRef, blocker],
    });
  });
};

const isSaucerPocketGuide = (
  element: AnalyzableElement,
  saucer: BoardDefinition['saucers'][number],
): boolean => {
  if (element.ref.kind !== 'guide') {
    return false;
  }

  return element.samples.some(
    (sample) =>
      Math.hypot(sample.x - saucer.x, sample.y - saucer.y) <=
      saucer.radius + sample.radius + 12,
  );
};

const analyzeRulesCoverage = (
  board: BoardDefinition,
  warnings: TableAnalysisWarning[],
): void => {
  const genericScoreHandling = hasGenericScoreHandling(board.rulesScript);
  const ruleChecks = [
    {
      kind: 'bumper',
      count: board.bumpers.length,
      eventType: 'bumper-hit',
      label: 'bumper hits',
    },
    {
      kind: 'standup-target',
      count: board.standupTargets.length,
      eventType: 'standup-target-hit',
      label: 'standup target hits',
    },
    {
      kind: 'drop-target',
      count: board.dropTargets.length,
      eventType: 'drop-target-hit',
      label: 'drop target hits',
    },
    {
      kind: 'saucer',
      count: board.saucers.length,
      eventType: 'saucer-captured',
      label: 'saucer captures',
    },
    {
      kind: 'spinner',
      count: board.spinners.length,
      eventType: 'spinner-spin',
      label: 'spinner spins',
    },
    {
      kind: 'slingshot',
      count: board.slingshots.length,
      eventType: 'slingshot-hit',
      label: 'slingshot hits',
    },
    {
      kind: 'rollover',
      count: board.rollovers.length,
      eventType: 'rollover-hit',
      label: 'rollover hits',
    },
  ];

  for (const check of ruleChecks) {
    if (check.count === 0) {
      continue;
    }

    if (
      rulesScriptMentionsEvent(board.rulesScript, check.eventType) ||
      genericScoreHandling
    ) {
      continue;
    }

    warnings.push({
      severity: 'warning',
      code: 'rules-event-unhandled',
      title: 'Rules coverage issue',
      message: `The rules script does not appear to handle ${check.label} even though the table has ${check.count}.`,
    });
  }
};

const collectAnalyzableElements = (
  board: BoardDefinition,
  includeRaisedGuides: boolean,
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
      ref: createRef('flipper', index, `${formatFlipperLabel(flipper)} Flipper`),
      samples: createFlipperSamples(flipper),
    });
  });

  board.guides.forEach((guide, index) => {
    if (!includeRaisedGuides && (guide.plane ?? 'playfield') === 'raised') {
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

const shouldIgnoreOverlapPair = (
  left: TableAnalysisElementRef,
  right: TableAnalysisElementRef,
): boolean => {
  const kinds = new Set([left.kind, right.kind]);

  if (kinds.size === 1 && kinds.has('guide')) {
    return true;
  }

  return kinds.has('guide') && kinds.has('saucer');
};

const formatFlipperLabel = (flipper: FlipperDefinition): string =>
  flipper.side === 'left' ? 'Left' : 'Right';

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
      const penetration = leftCircle.radius + rightCircle.radius - distance;

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
    Math.ceil(
      flipper.length /
        Math.max(flipper.thickness * 0.7, MIN_SAMPLE_SPACING),
    ),
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

const findPathBlocker = (
  start: Point,
  end: Point,
  clearance: number,
  elements: AnalyzableElement[],
): TableAnalysisElementRef | null => {
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  const sampleCount = Math.max(1, Math.ceil(length / PATH_SAMPLE_STEP));

  for (let pathIndex = 0; pathIndex <= sampleCount; pathIndex += 1) {
    const ratio = pathIndex / sampleCount;
    const point = {
      x: start.x + (end.x - start.x) * ratio,
      y: start.y + (end.y - start.y) * ratio,
    };

    for (const element of elements) {
      const blocked = element.samples.some(
        (sample) =>
          Math.hypot(point.x - sample.x, point.y - sample.y) <
          sample.radius + clearance,
      );

      if (blocked) {
        return element.ref;
      }
    }
  }

  return null;
};

const getMinFlipperSweepDistance = (
  sample: SampleCircle,
  flipper: FlipperDefinition,
): number => {
  const sampleCount = 6;
  let minDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index <= sampleCount; index += 1) {
    const ratio = index / sampleCount;
    const angle =
      flipper.restingAngle + (flipper.activeAngle - flipper.restingAngle) * ratio;
    minDistance = Math.min(
      minDistance,
      getDistanceToFlipperSurface(sample, flipper, angle),
    );
  }

  return minDistance;
};

const rulesScriptMentionsEvent = (
  source: string,
  eventType: string,
): boolean => {
  const escaped = eventType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`['"\`]${escaped}['"\`]`);
  return pattern.test(source);
};

const hasGenericScoreHandling = (source: string): boolean =>
  source.includes("'score' in event") ||
  source.includes('"score" in event') ||
  source.includes('`score` in event');
