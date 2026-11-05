import { nairaToKobo } from '@/lib/money';

/** Factory defaults for physical-ticket generation pricing (editable later by admins). */
export const DEFAULT_PRICING_TIERS: ReadonlyArray<{ label: string; minQuantity: number; maxQuantity: number | null; feeKobo: number }> = [
  { label: '1 – 999 codes', minQuantity: 1, maxQuantity: 999, feeKobo: 0 },
  { label: '1,000 – 1,999 codes', minQuantity: 1000, maxQuantity: 1999, feeKobo: nairaToKobo(5000) },
  { label: '2,000 – 4,999 codes', minQuantity: 2000, maxQuantity: 4999, feeKobo: nairaToKobo(10000) },
  { label: '5,000 – 9,999 codes', minQuantity: 5000, maxQuantity: 9999, feeKobo: nairaToKobo(20000) },
  { label: '10,000 – 19,999 codes', minQuantity: 10000, maxQuantity: 19999, feeKobo: nairaToKobo(35000) },
  { label: '20,000+ codes', minQuantity: 20000, maxQuantity: null, feeKobo: nairaToKobo(50000) },
];
