export interface DriverWizardData {
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleColor: string;
  licensePlate: string;
  address: string;
  apt: string;
  city: string;
  state: string;
  zip: string;
  licenseState: string;
  licenseNumber: string;
  licenseFullName: string;
  licenseDob: string;
  licenseExpDate: string;
  licenseFrontUrl: string;
  licenseFrontName: string;
  licenseBackUrl: string;
  licenseBackName: string;
  ssnLast4: string;
  fcraAgreed: boolean;
  insuranceCompany: string;
  naicNumber: string;
  policyNumber: string;
  effectiveDate: string;
  expirationDate: string;
  vinNumber: string;
  insuranceDocUrl: string;
  insuranceDocName: string;
}

export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL',
  'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
  'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
  'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
  'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export const POPULAR_INSURERS = [
  { name: 'State Farm', naic: '25178' },
  { name: 'GEICO', naic: '35882' },
  { name: 'Progressive', naic: '24260' },
  { name: 'Allstate', naic: '19232' },
  { name: 'USAA', naic: '25941' },
  { name: 'Liberty Mutual', naic: '23043' },
  { name: 'Farmers Insurance', naic: '21482' },
  { name: 'Travelers', naic: '25658' },
  { name: 'American Family', naic: '19275' },
  { name: 'Nationwide', naic: '23787' },
];
