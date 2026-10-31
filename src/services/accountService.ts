import { UserAccount, ChatMessage, UserRole, validateUsername } from '../types';

const ACCOUNTS_STORAGE_KEY = 'chat_omi_user_accounts';
const CURRENT_USER_KEY = 'chat_omi_active_username';

export const INITIAL_ACCOUNT_POINTS = 100;

export const INITIAL_WELCOME_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_welcome',
    role: 'assistant',
    text: `أهلاً بك! أنا **المساعد OMI** من منصة **Chat OMI**، من تطوير **عمر الذهلي**.\n\n✨ **هذا حسابك الخاص والمستقل:**\n• رصيدك من النقاط وتاريخ محادثاتك محفوظ لك أنت وحدك!\n• عند تسجيل الدخول باسم مستخدم آخر، يدخل لحسابه الخاص برصيده الخاص المستقل.\n\n🚀 **يمكنك الاستفادة من الخدمات التالية:**\n• 🎨 **إنشاء صورة** بنانو بنانو (يتم توليدها وعرضها فوراً هنا في المحادثة)\n• 🎬 **إنشاء فيديو** بالذكاء الاصطناعي\n• 🌐 **متصفح الويب الذكي** للبحث المباشر\n• 🎟️ **أدخل كود** لشحن رصيد نقاط حسابك`,
    timestamp: Date.now(),
  },
];

/**
 * Returns all saved accounts mapped by lowercase username
 */
export function getAllAccounts(): Record<string, UserAccount> {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (e) {
    console.error('Failed to read accounts from localStorage:', e);
    return {};
  }
}

/**
 * Retrieves a specific user account by username
 */
export function getAccount(username: string): UserAccount | null {
  const clean = username.trim().toLowerCase();
  const all = getAllAccounts();
  return all[clean] || null;
}

/**
 * Saves or updates a user account in the accounts registry
 */
export function saveAccount(account: UserAccount): void {
  try {
    const clean = account.username.trim().toLowerCase();
    const all = getAllAccounts();
    all[clean] = {
      ...account,
      username: clean,
      lastActive: Date.now(),
    };
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to save account:', e);
  }
}

/**
 * Creates a new account or logs into an existing isolated account.
 * Each account has its own isolated points, messages, and redeemed codes.
 */
export function loginOrCreateAccount(
  rawUsername: string,
  role: UserRole = 'user'
): { success: boolean; account?: UserAccount; error?: string } {
  const validation = validateUsername(rawUsername);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  const username = validation.cleanName;
  const existing = getAccount(username);

  if (existing) {
    // Existing user account
    const updated: UserAccount = {
      ...existing,
      role: role === 'admin' ? 'admin' : existing.role,
      lastActive: Date.now(),
    };
    saveAccount(updated);
    setCurrentUsername(username);
    return { success: true, account: updated };
  }

  // Create brand new isolated account with fresh points baseline
  const newAccount: UserAccount = {
    username,
    role,
    points: role === 'admin' ? 99999 : INITIAL_ACCOUNT_POINTS,
    createdAt: Date.now(),
    lastActive: Date.now(),
    messages: [...INITIAL_WELCOME_MESSAGES],
    redeemedCodes: [],
  };

  saveAccount(newAccount);
  setCurrentUsername(username);
  return { success: true, account: newAccount };
}

/**
 * Gets currently active logged-in username
 */
export function getCurrentUsername(): string | null {
  try {
    return localStorage.getItem(CURRENT_USER_KEY);
  } catch {
    return null;
  }
}

/**
 * Sets or clears currently active username
 */
export function setCurrentUsername(username: string | null): void {
  try {
    if (username) {
      localStorage.setItem(CURRENT_USER_KEY, username.trim().toLowerCase());
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch {}
}

/**
 * Resets points for a user account ("تصفير النقاط")
 */
export function resetAccountPoints(username: string, newPoints: number = 0): UserAccount | null {
  const account = getAccount(username);
  if (!account) return null;

  const updated: UserAccount = {
    ...account,
    points: newPoints,
    lastActive: Date.now(),
  };

  saveAccount(updated);
  return updated;
}

/**
 * Deletes an account
 */
export function deleteAccount(username: string): void {
  const clean = username.trim().toLowerCase();
  const all = getAllAccounts();
  if (all[clean]) {
    delete all[clean];
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(all));
  }
  if (getCurrentUsername() === clean) {
    setCurrentUsername(null);
  }
}
