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
  responseTime?: number; // Response latency in seconds
}

export interface PromoCode {
  id: string;
  code: string;
  points: number;
  createdAt: number;
  type: PromoCodeType; // 'single_use' (لأول شخص) or 'multi_use' (صالح للجميع)
  isRedeemed: boolean;
  redeemedByUsers: string[]; // List of users who claimed this code
  createdBy: string;
}

export interface PointsTransaction {
  id: string;
  amount: number;
  type: 'initial' | 'code_redeem' | 'admin_grant' | 'admin_deduct';
  description: string;
  timestamp: number;
}
