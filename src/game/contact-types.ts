import type { SurfaceMaterial } from '../types/board-definition';

export interface Vector2 {
  x: number;
  y: number;
}

export interface ContactData {
  point: Vector2;
  normal: Vector2;
  tangent: Vector2;
  overlap: number;
  surfaceVelocity: Vector2;
  material: SurfaceMaterial;
  surfaceEffectiveMass?: number;
  restitutionScale?: number;
}

export interface ContactImpulseResult {
  normalImpulse: number;
  tangentImpulse: number;
  relativeNormalSpeed: number;
  relativeTangentSpeed: number;
}
