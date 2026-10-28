import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)
export { gsap, useGSAP }
export const motionQuery = '(prefers-reduced-motion: no-preference)'
