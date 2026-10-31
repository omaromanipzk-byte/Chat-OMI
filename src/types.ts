export type UserRole = 'user' | 'admin';

export type PromoCodeType = 'single_use' | 'multi_use';

export interface User {
  username: string;
  role: UserRole;
  points: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  isStreaming?: boolean;
  error?: boolean;
  imageUrl?: string; // For images generated via Nano Banana
  videoUrl?: string;
  mediaType?: 'image' | 'video' | 'browser';
  mediaData?: {
    prompt?: string;
    style?: string;
    aspectRatio?: string;
    storyboard?: string;
    thumbnailUrl?: string;
  };
  responseTime?: number; // Response latency in seconds
}

export interface UserAccount {
  username: string; // Exactly 5 chars English, at least 4 letters e.g. "omar1", "alexa"
  role: UserRole;
  points: number;
  createdAt: number;
  lastActive: number;
  messages: ChatMessage[];
  redeemedCodes: string[];
}

export interface PromoCode {
  id: string;
  code: string;
  points: number;
  createdAt: number;
  type: PromoCodeType; // 'single_use' (لأول شخص) or 'multi_use' (صالح للجميع)
  isRedeemed: boolean;
  redeemedByUsers: string[]; // List of usernames who claimed this code
  createdBy: string;
}

export interface PointsTransaction {
  id: string;
  amount: number;
  type: 'initial' | 'code_redeem' | 'admin_grant' | 'admin_deduct' | 'reset';
  description: string;
  timestamp: number;
}

/**
 * Validates the username rule:
 * - Exactly 5 characters long
 * - English letters and numbers only [a-z0-9]
 * - At least 4 English letters
 */
export function validateUsername(name: string): { isValid: boolean; cleanName: string; error?: string } {
  const clean = (name || '').trim().toLowerCase();
  if (!clean) {
    return {
      isValid: false,
      cleanName: '',
      error: 'يرجى إدخال اسم المستخدم.',
    };
  }

  if (clean.length !== 5) {
    return {
      isValid: false,
      cleanName: clean,
      error: `يجب أن يتكون اسم المستخدم من 5 خانات بالضبط (طول الاسم حالياً: ${clean.length}).`,
    };
  }

  if (!/^[a-z0-9]{5}$/.test(clean)) {
    return {
      isValid: false,
      cleanName: clean,
      error: 'يجب أن يحتوي الاسم على أحرف إنجليزية وأرقام فقط (a-z, 0-9) بدون رموز أو أحرف عربية.',
    };
  }

  const letterCount = (clean.match(/[a-z]/g) || []).length;
  if (letterCount < 4) {
    return {
      isValid: false,
      cleanName: clean,
      error: `يجب أن يحتوي الاسم على 4 أحرف إنجليزية على الأقل (حالياً ${letterCount} أحرف فقط). مثال: omar1 أو alexa`,
    };
  }

  return { isValid: true, cleanName: clean };
}
