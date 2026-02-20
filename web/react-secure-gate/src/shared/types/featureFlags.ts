export type FeatureFlags = {
  enableManualApprove: boolean;
  enablePIIReveal: boolean;
  requireRejectTypingConfirm: boolean;
  enableBulkTriage: boolean;
  enableSavedViews: boolean;
};

export const defaultFeatureFlags: FeatureFlags = {
  enableManualApprove: true,
  enablePIIReveal: true,
  requireRejectTypingConfirm: true,
  enableBulkTriage: true,
  enableSavedViews: true,
};
