import { physicsDefaults } from './physics-defaults';
import type { SurfaceMaterial, SurfaceMaterialName } from '../types/board-definition';

export const surfaceMaterials = physicsDefaults.surfaceMaterials;

export const getSurfaceMaterial = (
  materialName: SurfaceMaterialName,
  materials: Record<SurfaceMaterialName, SurfaceMaterial> = surfaceMaterials,
): SurfaceMaterial => materials[materialName];
