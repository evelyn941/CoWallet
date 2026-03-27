export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

export interface Group {
  id: string;
  name: string;
  creatorId: string;
  memberIds: string[];
  memberNames: Record<string, string>; // UID -> Custom Name
  currency?: string; // Currency code (e.g., 'USD')
  exchangeRates?: Record<string, number>; // Currency Code -> Rate relative to default currency
  createdAt: any; // Firestore Timestamp
}

export interface Expense {
  id: string;
  groupId: string;
  amount: number;
  currency?: string; // Individual expense currency
  description: string;
  date: any; // Firestore Timestamp
  payerId: string;
  splitWithIds: string[];
  createdAt: any; // Firestore Timestamp
}

export interface Debt {
  from: string;
  to: string;
  amount: number;
}
