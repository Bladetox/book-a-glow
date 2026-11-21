// The one take for "11 pm", framed for a vertical 1080×1920 frame: [t, target (Vector3 | subject), dist, az, el, fov, target offset?, {ease}?] and impact shakes [t, amp, decay].
// Film seconds. az 0 = camera on the +z side looking toward −z (screens and cards read upright); el in radians.
// The desk is laid out in depth (client's phone and diary in front, your phone behind), so the tall frame holds it.
import { DUR } from './vo.js';
import { V } from './anim.js';
const R = { ease: 1 };
export const KEYS = [
  // 1 the fall: from high over the desk down onto the client's phone and the hour, landing on the first beat
  [0.0, 'open', 1.5, .5, 1.15, 34],
  [0.5, 'open', .82, .3, .62, 34],
  [2.2, 'open', .74, .22, .58, 34, null, R],
  // 2 the client pops up: a slow orbit round her
  [2.7, 'cli', .62, .25, .62, 34],
  [3.9, 'cli', .6, .05, .7, 34, null, R],
  // 3 crane up to read the screen: service, time, held
  [4.6, 'screenC', .98, .04, .98, 34],
  [7.9, 'screenC', .96, .0, 1.02, 34, null, R],
  // 4 push in on the pay button; the stamp
  [8.9, 'payBtn', .8, .06, .9, 34],
  [10.45, 'payBtn', .74, .08, .86, 34, null, R],
  // 5 ride along with the payment, low behind the coins, to your phone
  [11.0, 'cube', .36, .45, .4, 34],
  [12.2, 'cube', .4, .25, .45, 34],
  // 6 your phone: the bell, the taps, the banner
  [12.9, 'bell', .62, .15, .6, 34],
  [13.6, 'screenO', .95, .05, .92, 34],
  [16.35, 'screenO', .92, .0, 1.0, 34, null, R],
  // 7 whip forward to the client as she hops across to the diary; settle over Saturday
  [16.9, 'cli', .7, -.2, .7, 34],
  [17.7, 'diary', 1.2, -.1, .9, 34],
  [19.4, 'diary', 1.16, -.05, 1.0, 34, null, R],
  // 8 pull back over the whole desk; curtain call; the title card drops; hold
  [21.2, 'final', 2.7, .12, 1.05, 34],
  [23.2, 'final', 3.0, .06, 1.12, 34],
  [DUR, 'final', 3.08, .04, 1.14, 34],
];
export const SHAKES = [[10.5, .005, 8], [13.3, .002, 10], [13.7, .003, 9], [23.0, .003, 9]];
