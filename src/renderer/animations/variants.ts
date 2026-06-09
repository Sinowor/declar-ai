import type { Variants } from 'framer-motion'

export const fadeSlideUp: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15, ease: 'easeIn' } },
}

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
}

export const staggerContainer: Variants = {
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
}

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
}

export const cardHover = {
  whileHover: { y: -2, transition: { duration: 0.2, ease: 'easeOut' } },
  whileTap: { y: 0, transition: { duration: 0.1 } },
}

export const buttonTap = {
  whileTap: { scale: 0.97 },
  whileHover: { scale: 1.02 },
}

export const breathingPulse = {
  animate: { opacity: [1, 0.6, 1], transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } },
}
