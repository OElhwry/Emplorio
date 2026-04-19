import { ProfileKey, type ProfileKey as PK } from '@emplorio/shared';

const AUTOCOMPLETE_MAP: Record<string, PK> = {
  'given-name': ProfileKey.FirstName,
  'family-name': ProfileKey.LastName,
  name: ProfileKey.FullName,
  email: ProfileKey.Email,
  tel: ProfileKey.Phone,
  'address-line1': ProfileKey.AddressLine1,
  'address-line2': ProfileKey.AddressLine2,
  'address-level2': ProfileKey.City,
  'address-level1': ProfileKey.State,
  'postal-code': ProfileKey.PostalCode,
  'country-name': ProfileKey.Country,
};

const LABEL_KEYWORDS: Array<[RegExp, PK]> = [
  [/first.?name/i, ProfileKey.FirstName],
  [/last.?name|surname/i, ProfileKey.LastName],
  [/full.?name/i, ProfileKey.FullName],
  [/email/i, ProfileKey.Email],
  [/phone|mobile/i, ProfileKey.Phone],
  [/linkedin/i, ProfileKey.LinkedinUrl],
  [/github/i, ProfileKey.GithubUrl],
  [/portfolio|website/i, ProfileKey.PortfolioUrl],
  [/work.?auth|authoriz/i, ProfileKey.WorkAuthorization],
  [/sponsor/i, ProfileKey.RequiresSponsorship],
];

export function detectByHeuristics(doc: Document) {
  const out: Array<{ selector: string; key: PK }> = [];
  const inputs = doc.querySelectorAll<HTMLInputElement>('input, textarea, select');

  inputs.forEach((el, i) => {
    const auto = el.getAttribute('autocomplete');
    if (auto && AUTOCOMPLETE_MAP[auto]) {
      out.push({ selector: cssPath(el, i), key: AUTOCOMPLETE_MAP[auto]! });
      return;
    }

    const label = findLabel(el);
    const haystack = [el.name, el.id, label].filter(Boolean).join(' ');
    for (const [re, key] of LABEL_KEYWORDS) {
      if (re.test(haystack)) {
        out.push({ selector: cssPath(el, i), key });
        return;
      }
    }
  });

  return out;
}

function findLabel(el: HTMLElement): string {
  if (el.id) {
    const lab = document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(el.id)}"]`);
    if (lab) return lab.textContent?.trim() ?? '';
  }
  const wrapping = el.closest('label');
  return wrapping?.textContent?.trim() ?? '';
}

function cssPath(el: Element, fallbackIdx: number): string {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const name = (el as HTMLInputElement).name;
  if (name) return `${el.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`;
  return `${el.tagName.toLowerCase()}:nth-of-type(${fallbackIdx + 1})`;
}
