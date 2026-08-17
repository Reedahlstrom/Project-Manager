import confetti from 'canvas-confetti'

/**
 * The reward for closing a loop.
 *
 * This is the one piece of pure delight in the app and it is deliberate: the
 * cadence only works if reporting back is a habit, and habits form around the
 * feeling at the end. Everything else here earns its place by being useful;
 * this earns its place by being fun.
 *
 * Fires from wherever you tapped, so it reads as a consequence of the thing you
 * did rather than a notification that happened at you.
 */
export function celebrate(origin?: { x: number; y: number }) {
  // The app's motion contract applies to celebration too. Someone who has asked
  // their system for less movement should not get a confetti cannon.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const x = origin ? origin.x / window.innerWidth : 0.5
  const y = origin ? origin.y / window.innerHeight : 0.6

  // Accent blue and the two status greens — celebration in the app's own
  // palette rather than generic party colours.
  const colors = ['#2563EB', '#4CA97A', '#6BA0F9', '#A7C7F7']

  void confetti({
    particleCount: 55,
    spread: 70,
    startVelocity: 32,
    gravity: 1.1,
    scalar: 0.9,
    ticks: 140,
    origin: { x, y },
    colors,
    disableForReducedMotion: true,
  })

  // A second, wider burst a beat later. One burst reads as a glitch; two reads
  // as intent.
  window.setTimeout(() => {
    void confetti({
      particleCount: 25,
      spread: 100,
      startVelocity: 22,
      gravity: 1.2,
      scalar: 0.7,
      ticks: 120,
      origin: { x, y },
      colors,
      disableForReducedMotion: true,
    })
  }, 120)
}
