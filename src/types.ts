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
  createdAt: any; // Firestore Timestamp
}

export interface Expense {
  id: string;
  groupId: string;
  amount: number;
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
