export declare const EASE: [number, number, number, number];
export declare const fadeUp: { hidden: Record<string, unknown>; show: Record<string, unknown> };
export declare const fadeIn: { hidden: Record<string, unknown>; show: Record<string, unknown> };
export declare const scaleIn: { hidden: Record<string, unknown>; show: Record<string, unknown> };
export declare function stagger(
  staggerChildren?: number,
  delayChildren?: number
): { hidden: Record<string, unknown>; show: Record<string, unknown> };
export declare const viewportOnce: { once: boolean; amount: number; margin: string };
