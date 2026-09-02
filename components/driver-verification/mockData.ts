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

export interface USState {
  code: string;
  name: string;
}

export const US_STATES_DATA: USState[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

export const US_STATES = US_STATES_DATA.map((s) => s.code);

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
