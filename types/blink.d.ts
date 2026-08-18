import type { BlinkTable } from '@blinkdotnew/sdk';

declare module '@blinkdotnew/sdk' {
  interface BlinkDatabase {
    [key: string]: any;
    orders: BlinkTable<any>;
    users: BlinkTable<any>;
    driverVerifications: BlinkTable<any>;
    backgroundChecks: BlinkTable<any>;
    payoutRequests: BlinkTable<any>;
    chatMessages: BlinkTable<any>;
    notifications: BlinkTable<any>;
  }
}
