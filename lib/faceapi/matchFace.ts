import * as faceapi from "face-api.js";

/**
 * Compute match score between two face descriptors.
 * Uses euclideanDistance: distance < 0.1 = score > 0.90
 * Score is mapped as: 1 - distance (clamped 0-1)
 */
export function computeMatchScore(
  descriptor1: Float32Array,
  descriptor2: Float32Array
): number {
  const distance = faceapi.euclideanDistance(
    Array.from(descriptor1),
    Array.from(descriptor2)
  );
  return Math.max(0, Math.min(1, 1 - distance));
}

export function isMatch(score: number): boolean {
  return score > 0.9;
}
