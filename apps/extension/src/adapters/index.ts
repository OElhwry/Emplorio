import type { AtsAdapter } from '@emplorio/shared';
import { greenhouse } from './greenhouse.js';
import { lever } from './lever.js';
import { workday } from './workday.js';
import { ashby } from './ashby.js';
import { linkedin } from './linkedin.js';
import { indeed } from './indeed.js';
import { workable } from './workable.js';
import { smartrecruiters } from './smartrecruiters.js';
import { icims } from './icims.js';

export const adapters: AtsAdapter[] = [
  greenhouse,
  lever,
  workday,
  ashby,
  linkedin,
  indeed,
  workable,
  smartrecruiters,
  icims,
];

export function pickAdapter(url: string, doc: Document): AtsAdapter | undefined {
  return adapters.find((a) => a.matches(url, doc));
}
