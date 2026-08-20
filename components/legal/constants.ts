export interface LegalBulletItem {
  boldPrefix?: string;
  text: string;
}

export interface LegalSection {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: (string | LegalBulletItem)[];
}

export const TERMS_METADATA = {
  effectiveDate: 'May 8, 2025',
  contactName: 'Pickup Runner',
  contactEmail: 'PickupRunner@gmail.com',
  governingState: 'Arizona',
  governingCounty: 'Pima County',
} as const;

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: 'who-may-use',
    title: '1. Who May Use This App',
    paragraphs: [
      'You must be at least 18 years old to use this App. By using the App you represent that you meet this requirement and that the information you provide is accurate and complete.',
      "Drivers must additionally: (a) hold a valid driver's license and maintain appropriate vehicle insurance; (b) comply with all applicable federal, state, and local laws while making deliveries; and (c) have received express authorization from Pickup Runner to deliver on its behalf.",
    ],
  },
  {
    id: 'customer-terms',
    title: '2. Customer Terms',
    paragraphs: ['By placing an order through the App, you agree to the following:'],
    bullets: [
      'You are ordering a delivery service through Pickup Runner in your service area. Pickup Runner is a delivery service only and is not affiliated with, endorsed by, or responsible for any store, restaurant, or business from which items are picked up.',
      'Pickup Runner does not sell, manufacture, or guarantee any products. Product availability, pricing, quality, and substitutions are determined solely by the store or business fulfilling your order.',
      'A delivery fee and applicable mileage surcharge will be charged at checkout. These fees are non-refundable once a driver has accepted your order.',
      'Any tip you add goes entirely to the driver assigned to your order. Tips are also non-refundable once the driver begins the pickup.',
      "Payment is processed securely through Stripe. We do not store your card details. By paying, you also agree to Stripe's Terms of Service (stripe.com/legal).",
      'You must be present at the delivery address (or designate a responsible adult) to receive the order. Pickup Runner and its drivers are not liable for orders left unattended at your request.',
      'Alcohol and tobacco deliveries are subject to applicable state and local law. You must present a valid government-issued photo ID confirming you are 21+ upon delivery. The driver may refuse delivery if valid ID is not presented.',
      'Refunds for damaged, incorrect, or missing items must be requested within 24 hours of delivery. Pickup Runner will assist in communicating with the store but all refund decisions are at the sole discretion of the store or business fulfilling the order.',
    ],
  },
  {
    id: 'driver-terms',
    title: '3. Driver Terms',
    paragraphs: ['By creating a driver account and accepting deliveries through the App, you agree to the following:'],
    bullets: [
      'You are an independent contractor, not an employee of Pickup Runner or the App operator. You are solely responsible for your taxes, insurance, vehicle maintenance, and compliance with applicable law.',
      'You must handle all items with care and deliver them to the correct address in the condition received. You are liable for items damaged due to your negligence.',
      "You must not open, tamper with, or consume any part of a customer's order.",
      'You must verify customer ID for age-restricted items (alcohol, tobacco) and refuse delivery if valid ID is not presented.',
      'Earnings displayed in the App are estimates based on completed and paid orders. Actual payout amounts are confirmed at time of payout request approval.',
      'Payout requests are reviewed and processed manually by the App administrator. Processing time may vary. We are not responsible for delays caused by third-party payment services (Venmo, Zelle, etc.).',
      'Pickup Runner and the App operator reserve the right to deactivate your driver account at any time for violation of these Terms, fraudulent activity, customer complaints, or at our sole discretion.',
    ],
  },
  {
    id: 'prohibited-conduct',
    title: '4. Prohibited Conduct',
    paragraphs: ['You agree not to:'],
    bullets: [
      'Use the App for any unlawful purpose or in violation of any applicable law or regulation.',
      'Submit false, misleading, or fraudulent orders or payout requests.',
      "Attempt to circumvent the App's payment or authentication systems.",
      'Harass, threaten, or abuse other users, drivers, or store employees.',
      'Reverse-engineer, copy, or redistribute any part of the App without written permission.',
    ],
  },
  {
    id: 'disclaimer-warranties',
    title: '5. Disclaimer of Warranties',
    paragraphs: [
      'THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES. YOUR USE OF THE APP IS AT YOUR SOLE RISK.',
      'Pickup Runner does not guarantee the availability of any particular product. Product availability, pricing, and store hours are subject to change without notice.',
    ],
  },
  {
    id: 'limitation-liability',
    title: '6. Limitation of Liability',
    paragraphs: [
      'TO THE FULLEST EXTENT PERMITTED BY LAW, PICKUP RUNNER AND THE APP OPERATOR SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF OR INABILITY TO USE THE APP, INCLUDING BUT NOT LIMITED TO LOST PROFITS, LOST DATA, OR PERSONAL INJURY.',
      'OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING FROM USE OF THE APP SHALL NOT EXCEED THE DELIVERY FEES PAID BY YOU IN THE TRANSACTION GIVING RISE TO THE CLAIM.',
    ],
  },
  {
    id: 'privacy',
    title: '7. Privacy',
    paragraphs: [
      'We collect the information you provide (name, phone, email, delivery address, payment data) solely to fulfill orders and process payouts. We do not sell your personal information to third parties. Payment data is handled exclusively by Stripe and is never stored on our servers.',
      'By using the App, you consent to the collection and use of your information as described above and in our Privacy Policy, available upon request.',
    ],
  },
  {
    id: 'governing-law',
    title: '8. Governing Law',
    paragraphs: [
      'These Terms are governed by the laws of the State of Arizona, without regard to its conflict-of-law principles. Any dispute arising from these Terms shall be resolved exclusively in the state or federal courts located in Pima County, Arizona.',
    ],
  },
  {
    id: 'changes-to-terms',
    title: '9. Changes to These Terms',
    paragraphs: [
      'We may update these Terms from time to time. We will notify users of material changes by updating the effective date above and, where feasible, by posting a notice in the App. Continued use of the App after changes constitutes acceptance of the updated Terms.',
    ],
  },
  {
    id: 'contact',
    title: '10. Contact',
    paragraphs: ['Questions about these Terms? Contact us at:'],
  },
];

export const PRIVACY_METADATA = {
  lastUpdated: 'May 9, 2025',
  appName: 'Pickup Runner',
  contactEmail: 'PickupRunner@gmail.com',
} as const;

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: 'info-we-collect',
    title: '1. Information We Collect',
    paragraphs: ['We collect information you provide directly to us, including:'],
    bullets: [
      { boldPrefix: 'Account Information:', text: 'Name, email address, password, and account role (driver or customer).' },
      { boldPrefix: 'Driver Verification Data:', text: "Driver's license images, vehicle insurance documents, and background check details (full legal name, date of birth, SSN last 4, address)." },
      { boldPrefix: 'Order Information:', text: 'Pickup and delivery addresses, customer phone numbers, item descriptions, and delivery notes.' },
      { boldPrefix: 'Payment Information:', text: 'Stripe Connect account identifiers, payout request records, and payment receipts. We do not store full credit card numbers.' },
      { boldPrefix: 'Location Data:', text: 'Precise or approximate geolocation when you use the app for delivery navigation or order tracking.' },
      { boldPrefix: 'Communications:', text: 'In-app chat messages between drivers and customers, customer support requests.' },
    ],
  },
  {
    id: 'how-we-use-info',
    title: '2. How We Use Your Information',
    paragraphs: ['We use the information we collect to:'],
    bullets: [
      'Provide, maintain, and improve our delivery services.',
      'Process driver verification and background checks.',
      'Facilitate communication between customers and drivers.',
      'Process payments and driver earnings payouts via Stripe.',
      'Detect, prevent, and address fraud, security breaches, and illegal activities.',
      'Comply with applicable legal requirements and industry standards.',
    ],
  },
  {
    id: 'info-sharing',
    title: '3. Information Sharing',
    paragraphs: ['We do not sell your personal information. We may share your information:'],
    bullets: [
      { boldPrefix: 'Between Users:', text: 'Basic driver info (name, vehicle, phone) is shared with customers for active deliveries. Customer name and address are shared with drivers.' },
      { boldPrefix: 'Service Providers:', text: 'With Stripe for payment processing and identity verification services.' },
      { boldPrefix: 'Legal Requirements:', text: 'When required by law, subpoena, or to protect the safety of any person.' },
    ],
  },
  {
    id: 'data-retention-security',
    title: '4. Data Retention and Security',
    paragraphs: [
      'We retain personal information for as long as necessary to provide services and comply with legal obligations. Sensitive verification documents are stored securely using industry-standard encryption and access controls.',
    ],
  },
  {
    id: 'your-rights-deletion',
    title: '5. Your Rights & Account Deletion',
    paragraphs: [
      'You may request deletion of your account and associated personal data at any time via the Delete Account option in your profile settings.',
      'Upon deletion, your verification records, background check submissions, payout history, and order associations will be permanently purged from our systems, subject to legal retention obligations.',
    ],
  },
  {
    id: 'childrens-privacy',
    title: "6. Children's Privacy",
    paragraphs: [
      'Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children under 18.',
    ],
  },
  {
    id: 'changes-to-policy',
    title: '7. Changes to This Policy',
    paragraphs: [
      'We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last updated" date at the top of this policy.',
    ],
  },
  {
    id: 'contact-us',
    title: '8. Contact Us',
    paragraphs: ['If you have questions about this Privacy Policy or our privacy practices, contact us at:'],
  },
];

type TermsListener = (agreed: boolean) => void;
let globalTermsAgreed = false;
const termsListeners = new Set<TermsListener>();

export function setGlobalTermsAgreed(agreed: boolean) {
  globalTermsAgreed = agreed;
  termsListeners.forEach((listener) => listener(agreed));
}

export function getGlobalTermsAgreed(): boolean {
  return globalTermsAgreed;
}

export function subscribeTermsAgreed(listener: TermsListener): () => void {
  termsListeners.add(listener);
  return () => {
    termsListeners.delete(listener);
  };
}
