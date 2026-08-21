import AsyncStorage from '@react-native-async-storage/async-storage';

export const MOCK_USER = {
  id: 'usr_static_driver_101',
  email: 'driver@pickuprunner.com',
  displayName: 'Alex Driver',
  role: 'driver',
};

const createMockTable = () => ({
  list: async (_opts?: any) => [],
  create: async (data: any) => ({ id: `id_${Date.now()}`, ...data }),
  update: async (id: string, data: any) => ({ id, ...data }),
  delete: async (_id?: any, _opts?: any) => {},
  get: async (id: string) => ({ id }),
});

export const blink: any = {
  auth: {
    me: async () => MOCK_USER,
    signOut: async () => {},
    onAuthStateChanged: (callback: (state: { user: typeof MOCK_USER | null; isLoading: boolean; isAuthenticated: boolean }) => void) => {
      callback({
        user: MOCK_USER,
        isLoading: false,
        isAuthenticated: true,
      });
      return () => {};
    },
    signInWithEmail: async (_e: string, _p: string) => MOCK_USER,
    signUp: async (_opts: any) => MOCK_USER,
  },
  db: {
    table: (_tableName: string) => createMockTable(),
    orders: createMockTable(),
    driverVerifications: createMockTable(),
    backgroundChecks: createMockTable(),
    users: createMockTable(),
    payoutRequests: createMockTable(),
  },
  realtime: {
    channel: (_name: string) => ({
      subscribe: async (_opts?: any) => ({ unsubscribe: () => {} }),
      unsubscribe: async () => {},
      onMessage: (_fn: any) => {},
      publish: async (_event: any, _payload?: any, _opts?: any) => {},
      getMessages: async (_opts?: any) => [],
    }),
  },
  notifications: {
    email: async (opts: any) => {
      console.log('[Mock Notification] Email sent:', opts);
      return { success: true };
    },
  },
  storage: {
    upload: async (_path: string, _file: any, _opts?: any) => {
      return {
        publicUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500',
        url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500',
      };
    },
  },
  ai: {
    extractStructuredData: async (_opts: any) => {
      return {
        isOver21: true,
        confidence: 0.99,
        dateOfBirth: '1995-05-15',
        expirationDate: '2028-10-10',
        nameMatch: true,
      };
    },
    generateObject: async (_opts: any) => {
      return {
        object: {
          isOver21: true,
          confidence: 0.99,
          dateOfBirth: '1995-05-15',
          expirationDate: '2028-10-10',
          nameMatch: true,
        },
      };
    },
  },
};
