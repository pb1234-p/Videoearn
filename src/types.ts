export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  balance: number;
  totalEarned: number;
  upiId?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  rewardAmount: number;
  duration: number;
  createdAt: string;
  active: boolean;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  upiId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface WatchedVideo {
  userId: string;
  videoId: string;
  watchedAt: string;
  rewardEarned: number;
}
