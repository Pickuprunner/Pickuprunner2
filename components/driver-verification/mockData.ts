export interface DriverWizardData {
  // Step 1: Vehicle & Address
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

  // Step 2: Driver's License
  licenseState: string;
  licenseNumber: string;
  licenseFullName: string;
  licenseDob: string;
  licenseExpDate: string;
  licenseFrontUrl: string;
  licenseFrontName: string;
  licenseBackUrl: string;
  licenseBackName: string;

  // Step 3: Background Check
  ssnLast4: string;
  fcraAgreed: boolean;

  // Step 4: Insurance
  insuranceCompany: string;
  naicNumber: string;
  policyNumber: string;
  effectiveDate: string;
  expirationDate: string;
  vinNumber: string;
  insuranceDocUrl: string;
  insuranceDocName: string;
}

export const MOCK_DRIVER_WIZARD_DATA: DriverWizardData = {
  // Step 1
  vehicleMake: 'Toyota',
  vehicleModel: 'Camry Hybrid',
  vehicleYear: '2023',
  vehicleColor: 'Midnight Black',
  licensePlate: '8ABC123',
  address: '2401 E Camelback Rd',
  apt: 'Suite 400',
  city: 'Phoenix',
  state: 'AZ',
  zip: '85016',

  // Step 2
  licenseState: 'AZ',
  licenseNumber: 'D12345678',
  licenseFullName: 'Alex Rivera',
  licenseDob: '1994-05-14',
  licenseExpDate: '2028-05-14',
  licenseFrontUrl: '',
  licenseFrontName: '',
  licenseBackUrl: '',
  licenseBackName: '',

  // Step 3
  ssnLast4: '8842',
  fcraAgreed: true,

  // Step 4
  insuranceCompany: 'State Farm Mutual',
  naicNumber: '25178',
  policyNumber: 'AZ-98421034-7B',
  effectiveDate: '2026-01-01',
  expirationDate: '2027-01-01',
  vinNumber: '4T1B11HK5JU123456',
  insuranceDocUrl: '',
  insuranceDocName: '',
};

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
