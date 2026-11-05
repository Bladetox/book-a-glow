import { useReducedMotion, type Transition, type Variants } from "framer-motion";

export const ADMIN_MOTION = {
  duration: { fast: 0.14, standard: 0.2, slow: 0.28 },
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
} as const;

export function useAdminReducedMotion(): boolean {
  return useReducedMotion() ?? false;
}

export function adminTransition(
  reduceMotion: boolean,
  duration: number = ADMIN_MOTION.duration.standard,
): Transition {
  return reduceMotion ? { duration: 0 } : { duration, ease: ADMIN_MOTION.ease };
}

export function adminFadeVariants(reduceMotion: boolean): Variants {
  return {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 },
    visible: reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 },
    exit: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 },
  };
}

export function adminSheetVariants(reduceMotion: boolean): Variants {
  return {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 },
    visible: reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 },
    exit: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 },
  };
}
