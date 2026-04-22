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
  [/dial.?code|country.?code|phone.?country/i, ProfileKey.PhoneCountryCode],
  [/phone|mobile/i, ProfileKey.Phone],
  [/address.?line.?1|street.?address|^street\b|^address$/i, ProfileKey.AddressLine1],
  [/address.?line.?2|apt\b|suite|unit\b/i, ProfileKey.AddressLine2],
  [/^city\b|city.?or.?town|town/i, ProfileKey.City],
  [/state|province|region|county/i, ProfileKey.State],
  [/postal.?code|zip\b|post.?code/i, ProfileKey.PostalCode],
  [/^country\b/i, ProfileKey.Country],
  [/current.?(job.?)?title|present.?title|job.?title|current.?role|present.?role/i, ProfileKey.CurrentTitle],
  [/current.?(employer|company)|present.?(employer|company)|employer\b/i, ProfileKey.CurrentCompany],
  [/linkedin/i, ProfileKey.LinkedinUrl],
  [/github/i, ProfileKey.GithubUrl],
  [/portfolio|website/i, ProfileKey.PortfolioUrl],
  [/work.?auth|authoriz/i, ProfileKey.WorkAuthorization],
  [/sponsor/i, ProfileKey.RequiresSponsorship],
  [/notice.?period|how.?much.?notice/i, ProfileKey.NoticePeriod],
  [/(earliest|available|when.*can.*you).*(start|join)|start.?date|date.*available/i, ProfileKey.AvailableStartDate],
  [/resume|^cv$|curriculum/i, ProfileKey.Resume],
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

    if (el.closest('.phone-input__country, [class*="phone"][class*="country" i]')) {
      out.push({ selector: cssPath(el, i), key: ProfileKey.PhoneCountryCode });
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
