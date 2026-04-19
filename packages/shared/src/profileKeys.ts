export const ProfileKey = {
  FirstName: 'firstName',
  LastName: 'lastName',
  FullName: 'fullName',
  Email: 'email',
  Phone: 'phone',
  AddressLine1: 'addressLine1',
  AddressLine2: 'addressLine2',
  City: 'city',
  State: 'state',
  PostalCode: 'postalCode',
  Country: 'country',
  LinkedinUrl: 'linkedinUrl',
  GithubUrl: 'githubUrl',
  PortfolioUrl: 'portfolioUrl',
  WorkAuthorization: 'workAuthorization',
  RequiresSponsorship: 'requiresSponsorship',
  YearsExperience: 'yearsExperience',
  CurrentTitle: 'currentTitle',
  CurrentCompany: 'currentCompany',
  DesiredSalary: 'desiredSalary',
  EeoGender: 'eeoGender',
  EeoEthnicity: 'eeoEthnicity',
  EeoVeteranStatus: 'eeoVeteranStatus',
  EeoDisabilityStatus: 'eeoDisabilityStatus',
} as const;

export type ProfileKey = (typeof ProfileKey)[keyof typeof ProfileKey];

export const ALL_PROFILE_KEYS: ProfileKey[] = Object.values(ProfileKey);
