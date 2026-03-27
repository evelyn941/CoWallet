import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Users, 
  Trash2, 
  Edit2, 
  LogOut, 
  ChevronRight, 
  ArrowLeft, 
  DollarSign, 
  UserPlus, 
  UserMinus, 
  AlertCircle,
  X,
  Search,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  getDocFromServer
} from './firebase';
import { UserProfile, Group, Expense, Debt } from './types';
import { CURRENCIES, getCurrencySymbol } from './constants';

// --- Connection Test ---
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true);
      try {
        const parsed = JSON.parse(event.message);
        setErrorMessage(parsed.error || 'An unexpected error occurred.');
      } catch {
        setErrorMessage(event.message || 'An unexpected error occurred.');
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-black text-white rounded-xl font-medium"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName });
        const userRef = doc(db, 'users', result.user.uid);
        await setDoc(userRef, {
          uid: result.user.uid,
          displayName: displayName || 'Anonymous',
          email: email,
          photoURL: '',
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName || 'Anonymous',
        email: user.email || '',
        photoURL: user.photoURL || '',
      }, { merge: true });
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'An error occurred during Google login.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 rounded-[32px] shadow-sm border border-gray-100 max-w-md w-full text-center"
      >
        <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
          <DollarSign className="text-white w-8 h-8" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">CoWallet</h1>
        <p className="text-gray-500 mb-8">
          Split expenses with friends, hassle-free.
        </p>

        <form onSubmit={handleAuth} className="space-y-4 mb-6">
          {isSignUp && (
            <input 
              type="text" 
              placeholder="Your Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all"
              required
            />
          )}
          <input 
            type="email" 
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all"
            required
          />
          <input 
            type="password" 
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-black text-white rounded-2xl font-medium hover:bg-gray-900 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Log In')}
          </button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">Or continue with</span></div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="w-full py-4 bg-white border border-gray-100 text-gray-700 rounded-2xl font-medium flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors mb-6"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Google
        </button>

        <p className="text-sm text-gray-500">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-black font-semibold hover:underline"
          >
            {isSignUp ? 'Log In' : 'Sign Up'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl"
      >
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-8">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  isDestructive = false
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: () => void, 
  title: string, 
  message: string,
  confirmText?: string,
  cancelText?: string,
  isDestructive?: boolean
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl"
      >
        <div className="p-8 text-center">
          <div className={`w-16 h-16 ${isDestructive ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'} rounded-full flex items-center justify-center mx-auto mb-6`}>
            {isDestructive ? <Trash2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
          </div>
          <h3 className="text-xl font-semibold mb-2">{title}</h3>
          <p className="text-gray-500 mb-8">{message}</p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`w-full py-4 ${isDestructive ? 'bg-red-500 hover:bg-red-600' : 'bg-black hover:bg-gray-900'} text-white rounded-2xl font-medium transition-colors`}
            >
              {confirmText}
            </button>
            <button 
              onClick={onClose}
              className="w-full py-4 bg-gray-50 text-gray-700 rounded-2xl font-medium hover:bg-gray-100 transition-colors"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const NotificationModal = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'info'
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  title: string, 
  message: string,
  type?: 'info' | 'success' | 'error'
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl"
      >
        <div className="p-8 text-center">
          <div className={`w-16 h-16 ${type === 'error' ? 'bg-red-50 text-red-500' : type === 'success' ? 'bg-green-50 text-green-500' : 'bg-blue-50 text-blue-500'} rounded-full flex items-center justify-center mx-auto mb-6`}>
            {type === 'error' ? <AlertCircle className="w-8 h-8" /> : type === 'success' ? <Users className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
          </div>
          <h3 className="text-xl font-semibold mb-2">{title}</h3>
          <p className="text-gray-500 mb-8">{message}</p>
          <button 
            onClick={onClose}
            className="w-full py-4 bg-black text-white rounded-2xl font-medium hover:bg-gray-900 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const UserAvatar = ({ name, className = "w-10 h-10" }: { name: string, className?: string }) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className={`${className} bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-400 uppercase`}>
      {initials || 'U'}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCurrency, setNewGroupCurrency] = useState('USD');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || 'Anonymous',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || '',
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'groups'), where('memberIds', 'array-contains', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
      setGroups(groupsData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'groups'));
    return () => unsubscribe();
  }, [user]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGroupName.trim()) return;
    try {
      const groupRef = doc(collection(db, 'groups'));
      const newGroup: Group = {
        id: groupRef.id,
        name: newGroupName.trim(),
        creatorId: user.uid,
        memberIds: [user.uid],
        memberNames: { [user.uid]: user.displayName },
        currency: newGroupCurrency,
        createdAt: serverTimestamp(),
      };
      await setDoc(groupRef, newGroup);
      setNewGroupName('');
      setNewGroupCurrency('USD');
      setIsCreateGroupModalOpen(false);
      setSelectedGroupId(groupRef.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'groups');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user) return <Login />;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedGroupId(null)}>
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                <DollarSign className="text-white w-6 h-6" />
              </div>
              <span className="text-xl font-semibold tracking-tight">CoWallet</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-[11px] sm:text-sm font-medium leading-none mb-1">{user.displayName}</span>
                <span className="text-[9px] sm:text-xs text-gray-500 leading-none">{user.email}</span>
              </div>
              <button 
                onClick={() => signOut(auth)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-10">
          <AnimatePresence mode="wait">
            {!selectedGroupId ? (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-semibold tracking-tight">My Groups</h2>
                  <button 
                    onClick={() => setIsCreateGroupModalOpen(true)}
                    className="px-6 py-3 bg-black text-white rounded-2xl font-medium flex items-center gap-2 hover:bg-gray-900 transition-colors shadow-sm"
                  >
                    <Plus className="w-5 h-5" />
                    New Group
                  </button>
                </div>

                {groups.length === 0 ? (
                  <div className="bg-white rounded-[32px] p-12 text-center border border-gray-100 shadow-sm">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Users className="text-gray-300 w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-medium mb-2 text-gray-400">No groups yet</h3>
                    <p className="text-gray-400 mb-6">Create a group to start splitting expenses.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map(group => (
                      <motion.div 
                        key={group.id}
                        whileHover={{ y: -4 }}
                        onClick={() => setSelectedGroupId(group.id)}
                        className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-black transition-colors">
                            <Users className="text-gray-400 group-hover:text-white w-6 h-6" />
                          </div>
                          <ChevronRight className="text-gray-300 group-hover:text-black transition-colors" />
                        </div>
                        <h3 className="text-xl font-semibold mb-1">{group.name}</h3>
                        <p className="text-sm text-gray-500">{group.memberIds.length} members</p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <GroupDetail 
                groupId={selectedGroupId} 
                user={user} 
                onBack={() => setSelectedGroupId(null)} 
              />
            )}
          </AnimatePresence>
        </main>

        <Modal 
          isOpen={isCreateGroupModalOpen} 
          onClose={() => setIsCreateGroupModalOpen(false)}
          title="Create New Group"
        >
          <form onSubmit={handleCreateGroup}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
              <input 
                type="text" 
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Europe Trip 2024"
                className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all"
                required
              />
            </div>
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
              <select 
                value={newGroupCurrency}
                onChange={(e) => setNewGroupCurrency(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all appearance-none"
              >
                {CURRENCIES.map(curr => (
                  <option key={curr.code} value={curr.code}>
                    {curr.code} ({curr.symbol}) - {curr.name}
                  </option>
                ))}
              </select>
            </div>
            <button 
              type="submit"
              className="w-full py-4 bg-black text-white rounded-2xl font-medium hover:bg-gray-900 transition-colors"
            >
              Create Group
            </button>
          </form>
        </Modal>
      </div>
    </ErrorBoundary>
  );
}

const GroupDetail = ({ groupId, user, onBack }: { groupId: string, user: UserProfile, onBack: () => void }) => {
  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: false,
  });

  const [notificationState, setNotificationState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'success' | 'error';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payerId: user.uid,
    splitWithIds: [] as string[]
  });

  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [renameMember, setRenameMember] = useState({ uid: '', name: '' });

  useEffect(() => {
    const groupRef = doc(db, 'groups', groupId);
    const unsubscribe = onSnapshot(groupRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Group;
        setGroup(data);
        setExpenseForm(prev => ({ ...prev, splitWithIds: data.memberIds }));
      } else {
        onBack();
      }
    }, (error) => {
      if (error.code === 'permission-denied') {
        onBack();
      } else {
        handleFirestoreError(error, OperationType.GET, `groups/${groupId}`);
      }
    });
    return () => unsubscribe();
  }, [groupId]);

  useEffect(() => {
    const q = query(collection(db, 'groups', groupId, 'expenses'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      setExpenses(expensesData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `groups/${groupId}/expenses`));
    return () => unsubscribe();
  }, [groupId]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || !expenseForm.description || !expenseForm.amount || expenseForm.splitWithIds.length === 0) return;
    const isEditing = !!editingExpenseId;
    try {
      const expenseRef = isEditing 
        ? doc(db, 'groups', groupId, 'expenses', editingExpenseId)
        : doc(collection(db, 'groups', groupId, 'expenses'));
      
      const expenseData: any = {
        id: expenseRef.id,
        groupId,
        amount: parseFloat(expenseForm.amount),
        description: expenseForm.description,
        date: Timestamp.fromDate(new Date(expenseForm.date)),
        payerId: expenseForm.payerId,
        splitWithIds: expenseForm.splitWithIds,
      };

      if (!isEditing) {
        expenseData.createdAt = serverTimestamp();
        await setDoc(expenseRef, expenseData);
      } else {
        await updateDoc(expenseRef, expenseData);
      }

      setIsExpenseModalOpen(false);
      setEditingExpenseId(null);
      setExpenseForm({
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        payerId: user.uid,
        splitWithIds: group.memberIds
      });
    } catch (error) {
      handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, `groups/${groupId}/expenses`);
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setExpenseForm({
      description: expense.description,
      amount: expense.amount.toString(),
      date: expense.date.toDate().toISOString().split('T')[0],
      payerId: expense.payerId,
      splitWithIds: expense.splitWithIds
    });
    setIsExpenseModalOpen(true);
  };

  const handleDeleteExpense = (expenseId: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Expense',
      message: 'Are you sure you want to delete this expense?',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'groups', groupId, 'expenses', expenseId));
          if (editingExpenseId === expenseId) {
            setEditingExpenseId(null);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `groups/${groupId}/expenses/${expenseId}`);
        }
      }
    });
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || !newMemberEmail.trim()) return;
    try {
      const q = query(collection(db, 'users'), where('email', '==', newMemberEmail.trim()));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setNotificationState({
          isOpen: true,
          title: 'User Not Found',
          message: 'User not found. They must log in to the app first.',
          type: 'error'
        });
        return;
      }
      const newUser = snapshot.docs[0].data() as UserProfile;
      if (group.memberIds.includes(newUser.uid)) {
        setNotificationState({
          isOpen: true,
          title: 'Already a Member',
          message: 'User is already a member of this group.',
          type: 'info'
        });
        return;
      }
      await updateDoc(doc(db, 'groups', groupId), {
        memberIds: [...group.memberIds, newUser.uid],
        [`memberNames.${newUser.uid}`]: newUser.displayName
      });
      setNewMemberEmail('');
      setIsMemberModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${groupId}`);
    }
  };

  const handleRemoveMember = (memberId: string) => {
    if (!group) return;
    if (memberId === group.creatorId) {
      setNotificationState({
        isOpen: true,
        title: 'Cannot Remove Creator',
        message: 'The group creator cannot be removed from the group.',
        type: 'error'
      });
      return;
    }
    setConfirmState({
      isOpen: true,
      title: 'Remove Member',
      message: 'Are you sure you want to remove this member?',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const newMemberIds = group.memberIds.filter(id => id !== memberId);
          const newMemberNames = { ...group.memberNames };
          delete newMemberNames[memberId];
          await updateDoc(doc(db, 'groups', groupId), {
            memberIds: newMemberIds,
            memberNames: newMemberNames
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `groups/${groupId}`);
        }
      }
    });
  };

  const handleRenameMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || !renameMember.uid) return;
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        [`memberNames.${renameMember.uid}`]: renameMember.name
      });
      setIsRenameModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${groupId}`);
    }
  };

  const handleDismissGroup = () => {
    if (!group || group.creatorId !== user.uid) return;
    setConfirmState({
      isOpen: true,
      title: 'Dismiss Group',
      message: 'Dismissing the group will delete all expenses and the group itself. This action cannot be undone. Continue?',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const expensesSnapshot = await getDocs(collection(db, 'groups', groupId, 'expenses'));
          const deletePromises = expensesSnapshot.docs.map(d => deleteDoc(d.ref));
          await Promise.all(deletePromises);
          await deleteDoc(doc(db, 'groups', groupId));
          onBack();
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `groups/${groupId}`);
        }
      }
    });
  };

  const debts = useMemo(() => {
    if (!group) return [];
    const balances: Record<string, number> = {};
    group.memberIds.forEach(id => balances[id] = 0);

    expenses.forEach(exp => {
      const perPerson = exp.amount / exp.splitWithIds.length;
      balances[exp.payerId] += exp.amount;
      exp.splitWithIds.forEach(id => {
        balances[id] -= perPerson;
      });
    });

    const creditors = group.memberIds
      .filter(id => balances[id] > 0.01)
      .sort((a, b) => balances[b] - balances[a]);
    const debtors = group.memberIds
      .filter(id => balances[id] < -0.01)
      .sort((a, b) => balances[a] - balances[b]);

    const result: Debt[] = [];
    let i = 0, j = 0;
    const tempBalances = { ...balances };

    while (i < creditors.length && j < debtors.length) {
      const creditor = creditors[i];
      const debtor = debtors[j];
      const amount = Math.min(tempBalances[creditor], -tempBalances[debtor]);
      
      result.push({ from: debtor, to: creditor, amount });
      
      tempBalances[creditor] -= amount;
      tempBalances[debtor] += amount;

      if (tempBalances[creditor] < 0.01) i++;
      if (tempBalances[debtor] > -0.01) j++;
    }
    return result;
  }, [group, expenses]);

  const filteredAndSortedExpenses = useMemo(() => {
    let result = expenses.filter(exp => 
      exp.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    result.sort((a, b) => {
      let valA = sortField === 'date' ? a.date.toMillis() : a.amount;
      let valB = sortField === 'date' ? b.date.toMillis() : b.amount;

      if (sortOrder === 'asc') return valA - valB;
      return valB - valA;
    });

    return result;
  }, [expenses, searchQuery, sortField, sortOrder]);

  if (!group) return null;
  const currencySymbol = getCurrencySymbol(group.currency);

  return (
    <motion.div 
      key="group-detail"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white rounded-xl transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <div className="flex items-center gap-2 group/title">
              <h2 className="text-3xl font-semibold tracking-tight">{group.name}</h2>
              <button 
                onClick={() => {
                  const name = prompt('Rename group:', group.name);
                  if (name && name.trim()) {
                    updateDoc(doc(db, 'groups', groupId), { name: name.trim() });
                  }
                }}
                className="p-1 lg:opacity-0 lg:group-hover/title:opacity-100 transition-opacity"
              >
                <Edit2 className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-500">Created by {group.memberNames?.[group.creatorId] || 'Unknown'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setEditingExpenseId(null);
              setExpenseForm({
                description: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                payerId: user.uid,
                splitWithIds: group.memberIds
              });
              setIsExpenseModalOpen(true);
            }}
            className="px-6 py-3 bg-black text-white rounded-2xl font-medium flex items-center gap-2 hover:bg-gray-900 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add Expense
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="text-xl font-semibold">Expenses</h3>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Search expenses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-black transition-all w-full"
                  />
                </div>
                <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select 
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as 'date' | 'amount')}
                    className="bg-transparent text-sm border-none focus:ring-0 p-0 pr-6 appearance-none cursor-pointer"
                  >
                    <option value="date">Date</option>
                    <option value="amount">Amount</option>
                  </select>
                  <button 
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="p-1 hover:bg-gray-50 rounded transition-colors"
                  >
                    <ArrowUpDown className={`w-4 h-4 ${sortOrder === 'asc' ? 'text-black' : 'text-gray-400'}`} />
                  </button>
                </div>
              </div>
            </div>
            {filteredAndSortedExpenses.length === 0 ? (
              <div className="bg-white rounded-[32px] p-12 text-center border border-gray-100">
                <p className="text-gray-400">{searchQuery ? 'No matching expenses found.' : 'No expenses yet.'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAndSortedExpenses.map(exp => (
                  <div key={exp.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group/item">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{exp.description}</h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>Paid by {group.memberNames?.[exp.payerId] || 'Unknown'}</span>
                          <span>•</span>
                          <span>{exp.date.toDate().toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-lg font-bold">{currencySymbol}{exp.amount.toFixed(2)}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">Total</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleEditExpense(exp)}
                          className="p-2 text-gray-300 hover:text-black lg:opacity-0 lg:group-hover/item:opacity-100 transition-all"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-2 text-gray-300 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-10">
          <section className="sticky top-32 space-y-10">
            <div>
              <h3 className="text-xl font-semibold mb-6">Summary</h3>
              {debts.length === 0 ? (
                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm mb-6 text-center">
                  <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="text-green-500 w-6 h-6" />
                  </div>
                  <p className="text-gray-400 font-medium">All settled up!</p>
                </div>
              ) : (
                <div className="space-y-8 mb-6">
                  {(() => {
                    const myDebts = debts.filter(d => d.from === user.uid || d.to === user.uid);
                    const otherDebts = debts.filter(d => d.from !== user.uid && d.to !== user.uid);
                    
                    return (
                      <>
                        {myDebts.length > 0 && (
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Your Transactions</h4>
                            {myDebts.map((debt, idx) => {
                              const isToMe = debt.to === user.uid;
                              const otherPartyId = isToMe ? debt.from : debt.to;
                              const otherPartyName = group.memberNames?.[otherPartyId] || 'Unknown';
                              
                              return (
                                <motion.div 
                                  key={`my-${idx}`}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                  className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between"
                                >
                                  <div className="flex flex-col gap-3">
                                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                                      {isToMe ? 'You get paid from' : 'You pay'}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <UserAvatar name={otherPartyName} className="w-8 h-8" />
                                      <div className="font-bold text-gray-900">{otherPartyName}</div>
                                    </div>
                                  </div>
                                  <div className={`text-2xl font-bold ${isToMe ? 'text-green-500' : 'text-red-500'}`}>
                                    {isToMe ? '+' : '-'}{currencySymbol}{debt.amount.toFixed(2)}
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}

                        {otherDebts.length > 0 && (
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Other Group Transactions</h4>
                            {otherDebts.map((debt, idx) => (
                              <div key={`other-${idx}`} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between text-sm">
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold text-gray-700">{group.memberNames?.[debt.from]}</span>
                                  <span className="text-gray-300">→</span>
                                  <span className="font-semibold text-gray-700">{group.memberNames?.[debt.to]}</span>
                                </div>
                                <div className="font-bold text-gray-900">{currencySymbol}{debt.amount.toFixed(2)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <section>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Members</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsMemberModalOpen(true)}
                    className="p-2 hover:bg-white rounded-xl transition-colors text-gray-500"
                    title="Add Member"
                  >
                    <UserPlus className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {group.memberIds.map(id => (
                  <div key={id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between group/member">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={group.memberNames?.[id] || 'Unknown'} />
                      <div>
                        <div className="font-medium">{group.memberNames?.[id] || 'Unknown'}</div>
                        {id === group.creatorId && <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded uppercase font-bold text-gray-500">Creator</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 lg:opacity-0 lg:group-hover/member:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setRenameMember({ uid: id, name: group.memberNames?.[id] || '' });
                          setIsRenameModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {id !== group.creatorId && (
                        <button 
                          onClick={() => handleRemoveMember(id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {group.creatorId === user.uid && (
              <button 
                onClick={handleDismissGroup}
                className="w-full py-4 text-red-500 hover:bg-red-50 rounded-2xl transition-colors text-sm font-medium border border-transparent hover:border-red-100"
              >
                Dismiss Group
              </button>
            )}
          </section>
        </div>
      </div>

      <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title={editingExpenseId ? "Edit Expense" : "Add Expense"}>
        <form onSubmit={handleAddExpense} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <input 
              type="text" 
              value={expenseForm.description}
              onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What was it for?"
              className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount ({currencySymbol})</label>
              <input 
                type="number" 
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input 
                type="date" 
                value={expenseForm.date}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Paid By</label>
            <select 
              value={expenseForm.payerId}
              onChange={(e) => setExpenseForm(prev => ({ ...prev, payerId: e.target.value }))}
              className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all appearance-none"
            >
              {group.memberIds.map(id => (
                <option key={id} value={id}>{group.memberNames?.[id] || 'Unknown'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Split With</label>
            <div className="grid grid-cols-2 gap-2">
              {group.memberIds.map(id => (
                <label key={id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={expenseForm.splitWithIds.includes(id)}
                    onChange={(e) => {
                      const newIds = e.target.checked 
                        ? [...expenseForm.splitWithIds, id]
                        : expenseForm.splitWithIds.filter(x => x !== id);
                      setExpenseForm(prev => ({ ...prev, splitWithIds: newIds }));
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                  />
                  <span className="text-sm truncate">{group.memberNames?.[id] || 'Unknown'}</span>
                </label>
              ))}
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-black text-white rounded-2xl font-medium hover:bg-gray-900 transition-colors"
          >
            {editingExpenseId ? "Update Expense" : "Add Expense"}
          </button>
        </form>
      </Modal>

      <ConfirmModal 
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        isDestructive={confirmState.isDestructive}
      />

      <NotificationModal 
        isOpen={notificationState.isOpen}
        onClose={() => setNotificationState(prev => ({ ...prev, isOpen: false }))}
        title={notificationState.title}
        message={notificationState.message}
        type={notificationState.type}
      />

      <Modal isOpen={isMemberModalOpen} onClose={() => setIsMemberModalOpen(false)} title="Add Member">
        <form onSubmit={handleAddMember} className="space-y-6">
          <p className="text-sm text-gray-500">Enter the email address of the person you want to add. They must have logged into the app at least once.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input 
              type="email" 
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder="friend@example.com"
              className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all"
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-black text-white rounded-2xl font-medium hover:bg-gray-900 transition-colors"
          >
            Add to Group
          </button>
        </form>
      </Modal>

      <Modal isOpen={isRenameModalOpen} onClose={() => setIsRenameModalOpen(false)} title="Rename Member">
        <form onSubmit={handleRenameMember} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
            <input 
              type="text" 
              value={renameMember.name}
              onChange={(e) => setRenameMember(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all"
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-black text-white rounded-2xl font-medium hover:bg-gray-900 transition-colors"
          >
            Save Changes
          </button>
        </form>
      </Modal>
    </motion.div>
  );
};
