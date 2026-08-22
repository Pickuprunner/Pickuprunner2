import { useDriverStore, DocStatus } from '@/store/useDriverStore';

export function useDriverVerification() {
  const {
    verification,
    backgroundCheck,
    earnings,
    submitLicense,
    submitInsurance,
    submitBackgroundCheck,
    setDocStatus,
    addDeliveryEarnings,
  } = useDriverStore();

  const isFullyCleared =
    verification.licenseStatus === 'approved' &&
    verification.insuranceStatus === 'approved' &&
    backgroundCheck.status === 'approved';

  return {
    verification,
    backgroundCheck,
    earnings,
    isFullyCleared,
    submitLicense,
    submitInsurance,
    submitBackgroundCheck,
    setDocStatus,
    addDeliveryEarnings,
  };
}
