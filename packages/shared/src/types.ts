import type { ProfileKey } from './profileKeys.js';

export type FieldMapping = Record<string, ProfileKey>;

export type GeneratedDocKind = 'cover_letter' | 'tailored_cv';

export interface AtsAdapter {
  readonly id:
    | 'greenhouse'
    | 'lever'
    | 'workday'
    | 'ashby'
    | 'linkedin'
    | 'indeed'
    | 'workable'
    | 'smartrecruiters'
    | 'icims';
  matches(url: string, doc: Document): boolean;
  detectFields(doc: Document): Array<{ selector: string; key: ProfileKey }>;
}

export interface ExtensionMessage<T = unknown> {
  type: string;
  payload?: T;
}

export type FillRequest = ExtensionMessage<{ url: string }>;
export type FillResponse = ExtensionMessage<{
  filled: number;
  skipped: number;
  unmapped: string[];
}>;
