import type { AtsAdapter } from '@emplorio/shared';
import { greenhouse } from './greenhouse.js';
import { lever } from './lever.js';
import { workday } from './workday.js';
import { ashby } from './ashby.js';

export const adapters: AtsAdapter[] = [greenhouse, lever, workday, ashby];

export function pickAdapter(url: string, doc: Document): AtsAdapter | undefined {
  return adapters.find((a) => a.matches(url, doc));
}
