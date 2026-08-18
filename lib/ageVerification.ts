/**
 * Age verification helpers.
 * Uses blink.ai.generateObject with a vision-capable model to extract
 * the date-of-birth from a driver's license photo, then checks age ≥ 21.
 */
import { blink } from './blink';

export interface IDScanResult {
  success: boolean;
  dob?: string;          // ISO date string e.g. "1990-05-14"
  age?: number;
  isOver21?: boolean;
  firstName?: string;
  lastName?: string;
  state?: string;
  expirationDate?: string;
  isExpired?: boolean;
  errorMessage?: string;
}

/** Calculate age in years from an ISO date string */
function calcAge(dobIso: string): number {
  const dob = new Date(dobIso);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

/**
 * Analyse a driver's license image URL with AI and return structured data.
 * imageUrl must be an HTTPS URL with a valid image extension.
 */
export async function scanDriversLicense(imageUrl: string): Promise<IDScanResult> {
  try {
    const { object } = await blink.ai.generateObject({
      prompt: `You are examining a driver's license or state ID photo.

Extract the following fields exactly as they appear on the document.

Image URL: ${imageUrl}

Return the data as a JSON object with these fields:
- firstName: string (first name on the ID)
- lastName: string (last name on the ID)
- dateOfBirth: string (ISO format YYYY-MM-DD — convert from whatever format is on the ID)
- expirationDate: string (ISO format YYYY-MM-DD of the license expiration)
- state: string (2-letter US state abbreviation, e.g. "AZ")
- documentType: string ("DRIVER LICENSE" or "ID CARD")
- isLegible: boolean (true if you could read the required fields clearly)
- notes: string (any reason you could not read the document, or empty string)`,
      schema: {
        type: 'object',
        properties: {
          firstName:      { type: 'string' },
          lastName:       { type: 'string' },
          dateOfBirth:    { type: 'string' },
          expirationDate: { type: 'string' },
          state:          { type: 'string' },
          documentType:   { type: 'string' },
          isLegible:      { type: 'boolean' },
          notes:          { type: 'string' },
        },
        required: ['dateOfBirth', 'isLegible'],
      },
    });

    if (!object.isLegible || !object.dateOfBirth) {
      return {
        success: false,
        errorMessage: object.notes || 'Could not read the ID clearly. Please try again with better lighting.',
      };
    }

    const age = calcAge(object.dateOfBirth);
    const today = new Date();
    const expDate = object.expirationDate ? new Date(object.expirationDate) : null;
    const isExpired = expDate ? expDate < today : false;

    return {
      success: true,
      dob: object.dateOfBirth,
      age,
      isOver21: age >= 21,
      firstName: object.firstName,
      lastName: object.lastName,
      state: object.state,
      expirationDate: object.expirationDate,
      isExpired,
    };
  } catch (err: any) {
    return {
      success: false,
      errorMessage: err?.message ?? 'Scan failed. Please try again.',
    };
  }
}
