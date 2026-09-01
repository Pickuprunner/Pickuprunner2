import { DriverWizardData } from './mockData';

export interface ValidationResult {
  isValid: boolean;
  title?: string;
  message?: string;
}

/**
 * Normalizes input date strings (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD) into standard ISO YYYY-MM-DD.
 */
export function normalizeDateToISO(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const mdy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const num1 = parseInt(mdy[1], 10);
    const num2 = parseInt(mdy[2], 10);
    const y = mdy[3];
    if (num1 > 12 && num2 <= 12) {
      return `${y}-${String(num2).padStart(2, '0')}-${String(num1).padStart(2, '0')}`;
    }
    return `${y}-${String(num1).padStart(2, '0')}-${String(num2).padStart(2, '0')}`;
  }

  const ymd = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymd) {
    const y = ymd[1];
    const m = parseInt(ymd[2], 10);
    const d = parseInt(ymd[3], 10);
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  return trimmed;
}

/**
 * Validates that a date string is a real calendar date.
 */
export function isValidCalendarDate(dateStr?: string): boolean {
  if (!dateStr || !dateStr.trim()) return false;
  const iso = normalizeDateToISO(dateStr);
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;

  const [y, m, d] = iso.split('-').map(Number);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;

  const parsed = new Date(y, m - 1, d);
  return (
    parsed.getFullYear() === y &&
    parsed.getMonth() === m - 1 &&
    parsed.getDate() === d
  );
}

/**
 * Validates Step 1: Vehicle & Residential Address
 */
export function validateVehicleStep(data: DriverWizardData): ValidationResult {
  if (!data.vehicleMake?.trim()) {
    return { isValid: false, title: 'Car Make Needed', message: "Please enter your vehicle make (e.g. Toyota)." };
  }
  if (!data.vehicleModel?.trim()) {
    return { isValid: false, title: 'Car Model Needed', message: "Please enter your vehicle model (e.g. Camry)." };
  }
  const year = parseInt(data.vehicleYear, 10);
  const currentYear = new Date().getFullYear();
  if (!year || year < 1990 || year > currentYear + 1) {
    return {
      isValid: false,
      title: 'Check Car Year',
      message: `Please enter a valid 4-digit year (e.g. 2022).`,
    };
  }
  if (!data.vehicleColor?.trim()) {
    return { isValid: false, title: 'Car Color Needed', message: "Please enter your vehicle color (e.g. Black)." };
  }
  if (!data.licensePlate?.trim() || data.licensePlate.trim().length > 16) {
    return { isValid: false, title: 'License Plate Needed', message: "Please enter your license plate number." };
  }
  if (!data.address?.trim()) {
    return { isValid: false, title: 'Home Address Needed', message: "Please enter your street address." };
  }
  if (!data.city?.trim()) {
    return { isValid: false, title: 'City Needed', message: "Please enter your city." };
  }
  if (!data.state?.trim() || !/^[A-Za-z]{2}$/.test(data.state.trim())) {
    return { isValid: false, title: 'State Needed', message: "Please select your state." };
  }
  if (!data.zip?.trim() || !/^\d{5}(-\d{4})?$/.test(data.zip.trim())) {
    return { isValid: false, title: 'ZIP Code Needed', message: "Please enter your 5-digit ZIP code." };
  }
  return { isValid: true };
}

/**
 * Checks if the birth date meets the minimum driver age of 18.
 */
export function isAtLeast18(dateStr?: string): boolean {
  if (!isValidCalendarDate(dateStr)) return false;
  const iso = normalizeDateToISO(dateStr);
  if (!iso) return false;
  const [y, m, d] = iso.split('-').map(Number);
  const birth = new Date(y, m - 1, d);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const mDiff = today.getMonth() - birth.getMonth();
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 18;
}

/**
 * Checks if an expiration date is in the future (unexpired).
 */
export function isFutureDate(dateStr?: string): boolean {
  if (!isValidCalendarDate(dateStr)) return false;
  const iso = normalizeDateToISO(dateStr);
  if (!iso) return false;
  const [y, m, d] = iso.split('-').map(Number);
  const exp = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return exp >= today;
}

/**
 * Validates Step 2: Driver's License
 */
export function validateLicenseStep(data: DriverWizardData): ValidationResult {
  if (!data.licenseState?.trim() || !/^[A-Za-z]{2}$/.test(data.licenseState.trim())) {
    return { isValid: false, title: 'State Needed', message: "Please select the state that issued your license." };
  }
  const licenseNum = data.licenseNumber?.trim() || '';
  if (!licenseNum || licenseNum.length < 5 || licenseNum.length > 15) {
    return {
      isValid: false,
      title: 'Check License Number',
      message: "Please enter a valid driver's license number (5 to 15 characters).",
    };
  }
  const fullName = data.licenseFullName?.trim() || '';
  if (!fullName || fullName.length < 2) {
    return { isValid: false, title: 'Full Name Needed', message: "Please enter your full legal name as shown on your license." };
  }
  if (!isValidCalendarDate(data.licenseDob)) {
    return { isValid: false, title: 'Check Birth Date', message: "Please enter a valid birth date (e.g. 05/14/1995)." };
  }
  if (!isAtLeast18(data.licenseDob)) {
    return { isValid: false, title: 'Age Requirement', message: "Drivers must be at least 18 years of age." };
  }
  if (!isValidCalendarDate(data.licenseExpDate)) {
    return { isValid: false, title: 'Check Expiration Date', message: "Please enter a valid license expiration date (e.g. 05/14/2028)." };
  }
  if (!isFutureDate(data.licenseExpDate)) {
    return { isValid: false, title: 'License Expired', message: "Your driver's license must be valid and unexpired." };
  }
  if (!data.licenseFrontUrl?.trim()) {
    return { isValid: false, title: 'License Photo Needed', message: "Please upload a photo of the front of your license." };
  }
  return { isValid: true };
}

/**
 * Validates Step 3: Background Check Consent
 */
export function validateConsentStep(data: DriverWizardData): ValidationResult {
  if (!data.fcraAgreed) {
    return { isValid: false, title: 'Authorization Needed', message: "Please tap the checkbox to authorize the background check." };
  }
  return { isValid: true };
}

/**
 * Validates Step 4: Vehicle Insurance
 */
export function validateInsuranceStep(data: DriverWizardData): ValidationResult {
  if (!data.insuranceCompany?.trim()) {
    return { isValid: false, title: 'Insurance Company Needed', message: "Please select or type your insurance company." };
  }
  if (!data.naicNumber?.trim() || !/^\d{5}$/.test(data.naicNumber.trim())) {
    return { isValid: false, title: 'NAIC Code Needed', message: "Please enter the 5-digit NAIC number found on your insurance card." };
  }
  if (!data.policyNumber?.trim()) {
    return { isValid: false, title: 'Policy Number Needed', message: "Please enter your insurance policy number." };
  }
  if (!isValidCalendarDate(data.effectiveDate)) {
    return { isValid: false, title: 'Check Start Date', message: "Please enter a valid insurance start date (e.g. 01/01/2026)." };
  }
  if (!isValidCalendarDate(data.expirationDate)) {
    return { isValid: false, title: 'Check Expiration Date', message: "Please enter a valid insurance expiration date (e.g. 01/01/2027)." };
  }
  if (!data.vinNumber?.trim() || !/^[A-HJ-NPR-Z0-9]{17}$/i.test(data.vinNumber.trim())) {
    return { isValid: false, title: 'Check VIN Number', message: "VIN must be exactly 17 letters and numbers (letters I, O, Q are not used)." };
  }
  if (!data.insuranceDocUrl?.trim()) {
    return { isValid: false, title: 'Insurance Card Needed', message: "Please upload a photo of your auto insurance card." };
  }
  return { isValid: true };
}
