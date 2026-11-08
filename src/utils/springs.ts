/**
 * Shared spring settings. `visualDuration` plays the role of Apple's "response"
 * and `bounce` is 1 - dampingRatio. Bounce is reserved for motion the user's
 * own gesture started; everything else settles without overshoot.
 */
export const spring = {
  ui: { type: 'spring', bounce: 0, visualDuration: 0.35 },
  quick: { type: 'spring', bounce: 0, visualDuration: 0.25 },
  momentum: { type: 'spring', bounce: 0.2, visualDuration: 0.3 },
} as const;

/** Distance a release at `velocity` (px/s) would travel under scroll-like deceleration. */
export function projectMomentum(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** How far an element follows a drag that is `overshoot` px past its boundary. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
