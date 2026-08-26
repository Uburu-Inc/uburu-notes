export type PersonalDetails = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
};

export type InstitutionDetails = {
  legalName: string;
  type: string;
  website: string;
};

export type Profile = {
  personal: PersonalDetails;
  institution: InstitutionDetails;
};

// Static stand-in for the account the user signed in as. Swap this for whatever
// the sign-in call returns once there is an API behind the login form.
export const DEMO_PROFILE: Profile = {
  personal: {
    fullName: 'Frank Ani',
    email: 'colowi2357@momoshe.com',
    phone: '+234903690101',
    location: 'Suru-Lere, Nigeria',
  },
  institution: {
    legalName: 'Usman Danfodiyo University Teaching Hospital Sokoto',
    type: '',
    website: 'https://UDUTH.com',
  },
};

/** First letters of the first two words: "Frank Ani" reads as "FA". */
export function initialsFrom(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}
