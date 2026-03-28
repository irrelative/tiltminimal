import type { SurfaceMaterialName } from '../types/board-definition';

export interface SurfaceMaterial {
  name: SurfaceMaterialName;
  restitution: number;
  staticFriction: number;
  dynamicFriction: number;
  rollingResistance: number;
  spinDamping: number;
  compliance: number;
  grip: number;
}

export const surfaceMaterials: Record<SurfaceMaterialName, SurfaceMaterial> = {
  playfieldWood: {
    name: 'playfieldWood',
    restitution: 0.88,
    staticFriction: 0.42,
    dynamicFriction: 0.3,
    rollingResistance: 0.018,
    spinDamping: 0.08,
    compliance: 0.04,
    grip: 0.35,
  },
  metalGuide: {
    name: 'metalGuide',
    restitution: 0.9,
    staticFriction: 0.24,
    dynamicFriction: 0.16,
    rollingResistance: 0.01,
    spinDamping: 0.04,
    compliance: 0.02,
    grip: 0.12,
  },
  rubberPost: {
    name: 'rubberPost',
    restitution: 1.1,
    staticFriction: 0.74,
    dynamicFriction: 0.58,
    rollingResistance: 0.024,
    spinDamping: 0.12,
    compliance: 0.22,
    grip: 0.7,
  },
  flipperRubber: {
    name: 'flipperRubber',
    restitution: 0.92,
    staticFriction: 0.96,
    dynamicFriction: 0.82,
    rollingResistance: 0.03,
    spinDamping: 0.16,
    compliance: 0.18,
    grip: 0.9,
  },
};

export const getSurfaceMaterial = (
  materialName: SurfaceMaterialName,
): SurfaceMaterial => surfaceMaterials[materialName];

