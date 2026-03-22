import axios from 'axios';
import { 
  Task, 
  CreateTaskData, 
  UpdateTaskData,
  Bid,
  CreateBidData,
  Contract,
  CreateContractData,
  BidFilter,
  BidSortOptions
} from '@/types/task.types';
import { AuthResponse, SignupData, LoginData, ForgotPasswordData, ResetPasswordData } from '@/types';
import { 
  ChatThread, 
  ChatMessage, 
  CreateThreadRequest, 
  SendMessageRequest, 
  ThreadMessagesResponse 
} from '@/types/chat.types';
import { NotificationsResponse } from '@/types/notification.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors - token expired or invalid
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired - clear it and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if we're not already on login/signup page
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  signup: async (data: SignupData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/signup', data);
    return response.data;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  verifyEmail: async (token: string): Promise<{ message: string }> => {
    const response = await api.get(`/auth/verify-email?token=${token}`);
    return response.data;
  },

  forgotPassword: async (data: ForgotPasswordData): Promise<{ message: string }> => {
    const response = await api.post('/auth/forgot-password', data);
    return response.data;
  },

  resetPassword: async (data: ResetPasswordData): Promise<{ message: string }> => {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  },
};

// Task API
export const taskAPI = {
  createTask: async (data: CreateTaskData): Promise<{ message: string; task: Task }> => {
    const response = await api.post('/tasks', data);
    return response.data;
  },

  getMyTasks: async (filters?: { status?: string; category?: string }): Promise<{ tasks: Task[] }> => {
    const response = await api.get('/tasks/my-tasks', { params: filters });
    return response.data;
  },

  getTaskById: async (taskId: string): Promise<{ task: Task }> => {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data;
  },

  // Public method for discovery (no authentication required)
  getTaskByIdPublic: async (taskId: string): Promise<{ task: Task }> => {
    const response = await api.get(`/tasks/public/${taskId}`);
    return response.data;
  },

  updateTask: async (taskId: string, data: UpdateTaskData): Promise<{ message: string; task: Task }> => {
    const response = await api.put(`/tasks/${taskId}`, data);
    return response.data;
  },

  cancelTask: async (taskId: string): Promise<{ message: string; task: Task }> => {
    const response = await api.patch(`/tasks/${taskId}/cancel`);
    return response.data;
  },

  deleteTask: async (taskId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/tasks/${taskId}`);
    return response.data;
  },

  startTask: async (taskId: string): Promise<{ message: string; task: Task }> => {
    const response = await api.post(`/tasks/${taskId}/start`);
    return response.data;
  },

  completeTask: async (taskId: string, notes: string): Promise<{ message: string; task: Task }> => {
    const response = await api.post(`/tasks/${taskId}/complete`, { notes });
    return response.data;
  },

  confirmTaskCompletion: async (taskId: string, notes: string): Promise<{ message: string; task: Task }> => {
    const response = await api.post(`/tasks/${taskId}/confirm`, { notes });
    return response.data;
  },
  
};

// Discovery API
export const discoveryAPI = {
  discoverTasks: async (filters: {
    latitude: number;
    longitude: number;
    radius?: number;
    category?: string;
    minBudget?: number;
    maxBudget?: number;
    startDate?: string;
    endDate?: string;
    minHours?: number;
    maxHours?: number;
    searchText?: string;
    page?: number;
    limit?: number;
    sortBy?: 'proximity' | 'soonest' | 'budget' | 'newest' | 'oldest' | 'title';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    message: string;
    tasks: Task[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> => {
    const response = await api.get('/discover/tasks', { params: filters });
    return response.data;
  },

  getNearbyTasksCount: async (latitude: number, longitude: number, radius?: number): Promise<{ count: number }> => {
    const response = await api.get('/discover/tasks/count', { 
      params: { latitude, longitude, radius } 
    });
    return response.data;
  },
};

// Bid API
export const bidAPI = {
  // Place a bid on a task
  placeBid: async (data: CreateBidData): Promise<{ message: string; bid: Bid }> => {
    const response = await api.post('/bids', data);
    return response.data;
  },

  // Withdraw a bid
  withdrawBid: async (bidId: string): Promise<{ message: string }> => {
    const response = await api.patch(`/bids/${bidId}/withdraw`);
    return response.data;
  },

  // Accept a bid (poster only)
  acceptBid: async (bidId: string): Promise<{ message: string; contract: Contract }> => {
    const response = await api.post(`/bids/${bidId}/accept`);
    return response.data;
  },

  // Get helper's bids
  getMyBids: async (filters?: BidFilter, sort?: BidSortOptions): Promise<{ message: string; bids: Bid[] }> => {
    const params: Record<string, unknown> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.taskId) params.taskId = filters.taskId;
    if (sort?.field) params.sortBy = sort.field;
    if (sort?.order) params.sortOrder = sort.order;

    const response = await api.get('/bids/my-bids', { params });
    return response.data;
  },

  // Get bids for a specific task
  getTaskBids: async (taskId: string, filters?: BidFilter, sort?: BidSortOptions): Promise<{ message: string; bids: Bid[] }> => {
    const params: Record<string, unknown> = {};
    if (filters?.status) params.status = filters.status;
    if (sort?.field) params.sortBy = sort.field;
    if (sort?.order) params.sortOrder = sort.order;

    const response = await api.get(`/bids/tasks/${taskId}/bids`, { params });
    return response.data;
  },

  // Get contract for a task
  getTaskContract: async (taskId: string): Promise<{ message: string; contract: Contract }> => {
    const response = await api.get(`/bids/tasks/${taskId}/contract`);
    return response.data;
  },

  // Get contract by ID
  getContract: async (contractId: string): Promise<{ message: string; contract: Contract }> => {
    const response = await api.get(`/bids/contracts/${contractId}`);
    return response.data;
  },

  // Update contract
  updateContract: async (contractId: string, data: Partial<CreateContractData>): Promise<{ message: string; contract: Contract }> => {
    const response = await api.put(`/bids/contracts/${contractId}`, data);
    return response.data;
  },

  // Deactivate contract
  deactivateContract: async (contractId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/bids/contracts/${contractId}`);
    return response.data;
  },
};

// Chat API
export const chatAPI = {
  // Get or create a chat thread
  getOrCreateThread: async (data: CreateThreadRequest): Promise<{ message: string; thread: ChatThread }> => {
    const response = await api.post('/chat/threads', data);
    return response.data;
  },

  // Get all threads for the authenticated user
  getThreads: async (): Promise<ChatThread[]> => {
    const response = await api.get('/chat/threads');
    return response.data.threads || response.data || [];
  },

  // Get a specific thread
  getThread: async (threadId: string): Promise<ChatThread> => {
    const response = await api.get(`/chat/threads/${threadId}`);
    return response.data;
  },

  // Send a message
  sendMessage: async (data: SendMessageRequest): Promise<ChatMessage> => {
    const response = await api.post('/chat/messages', data);
    return response.data;
  },

  // Get messages for a thread
  getThreadMessages: async (threadId: string, page: number = 1, limit: number = 50): Promise<ThreadMessagesResponse> => {
    const response = await api.get(`/chat/threads/${threadId}/messages`, {
      params: { page, limit },
    });
    return response.data;
  },

  // Mark messages as read
  markMessagesAsRead: async (threadId: string): Promise<{ count: number }> => {
    const response = await api.patch(`/chat/threads/${threadId}/read`);
    return response.data;
  },

  // Report a message
  reportMessage: async (messageId: string, reason?: string): Promise<{ message: string }> => {
    const response = await api.post(`/chat/messages/${messageId}/report`, { reason });
    return response.data;
  },
};

// Notification API
export const notificationAPI = {
  // Get notifications
  getNotifications: async (page: number = 1, limit: number = 20, unreadOnly: boolean = false): Promise<NotificationsResponse> => {
    const response = await api.get('/notifications', {
      params: { page, limit, unreadOnly },
    });
    return response.data;
  },

  // Mark a notification as read
  markAsRead: async (notificationId: string): Promise<{ notificationId: string; isRead: boolean; readAt: string }> => {
    const response = await api.patch(`/notifications/${notificationId}/read`);
    return response.data;
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<{ count: number }> => {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  },
};

// Payment API
export const paymentAPI = {
  // Stripe Connect
  createConnectAccount: async (): Promise<{ accountId: string; onboardingUrl: string }> => {
    const response = await api.post('/payments/connect/create');
    return response.data;
  },

  getConnectAccountStatus: async (): Promise<{ status: { detailsSubmitted: boolean; chargesEnabled: boolean; payoutsEnabled: boolean } }> => {
    const response = await api.get('/payments/connect/status');
    return response.data;
  },

  // Payment operations
  confirmPayment: async (paymentIntentId: string): Promise<{ message: string }> => {
    const response = await api.post('/payments/confirm', { paymentIntentId });
    return response.data;
  },

  getPaymentHistory: async (contractId: string): Promise<{ payments: any[] }> => {
    const response = await api.get(`/payments/history/${contractId}`);
    return response.data;
  },

  getPublishableKey: async (): Promise<{ publishableKey: string }> => {
    const response = await api.get('/payments/publishable-key');
    return response.data;
  },

  syncPaymentStatus: async (contractId: string): Promise<{ message: string; status: string }> => {
    const response = await api.post(`/payments/sync/${contractId}`);
    return response.data;
  },
};

// Review API
export const reviewAPI = {
  // Create a review
  createReview: async (data: {
    contractId: string;
    revieweeId: string;
    rating: number;
    comment?: string;
    tags?: string[];
  }): Promise<any> => {
    const response = await api.post('/reviews', data);
    return response.data;
  },

  // Update a review
  updateReview: async (reviewId: string, data: {
    rating?: number;
    comment?: string;
    tags?: string[];
  }): Promise<any> => {
    const response = await api.put(`/reviews/${reviewId}`, data);
    return response.data;
  },

  // Delete a review
  deleteReview: async (reviewId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/reviews/${reviewId}`);
    return response.data;
  },

  // Reviews written by the authenticated user
  getMyReviews: async (page: number = 1, limit: number = 20): Promise<{
    reviews: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> => {
    const response = await api.get('/reviews/me', {
      params: { page, limit },
    });
    return response.data;
  },

  // Get reviews for a user (reviews received — about this user)
  getUserReviews: async (userId: string, page: number = 1, limit: number = 20): Promise<{
    reviews: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> => {
    const response = await api.get(`/reviews/user/${userId}`, {
      params: { page, limit },
    });
    return response.data;
  },

  // Get review statistics for a user
  getUserReviewStats: async (userId: string): Promise<{
    averageRating: number;
    totalCount: number;
    commonTags: string[];
  }> => {
    const response = await api.get(`/reviews/user/${userId}/stats`);
    return response.data;
  },

  // Get review for a specific contract
  getContractReview: async (contractId: string): Promise<any> => {
    const response = await api.get(`/reviews/contract/${contractId}`);
    return response.data;
  },

  // Check if user can review a contract
  canUserReviewContract: async (contractId: string): Promise<{
    canReview: boolean;
    reason?: string;
  }> => {
    const response = await api.get(`/reviews/contract/${contractId}/can-review`);
    return response.data;
  },

  // Report a review
  reportReview: async (reviewId: string, reason?: string): Promise<any> => {
    const response = await api.post(`/reviews/${reviewId}/report`, { reason });
    return response.data;
  },
};

// Report API
export const reportAPI = {
  createReport: async (data: {
    type: string;
    targetId: string;
    reason: string;
    evidence?: string[];
  }): Promise<{ message: string; report: any }> => {
    const response = await api.post('/reports', data);
    return response.data;
  },

  getReports: async (params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ reports: any[]; pagination: any }> => {
    const response = await api.get('/reports', { params });
    return response.data;
  },

  getReportById: async (type: string, reportId: string): Promise<{ message: string; report: any }> => {
    const response = await api.get(`/reports/${type}/${reportId}`);
    return response.data;
  },

  resolveReport: async (
    type: string,
    reportId: string,
    status: string,
    resolutionNotes?: string
  ): Promise<{ message: string; report: any }> => {
    const response = await api.patch(`/reports/${type}/${reportId}/resolve`, {
      status,
      resolutionNotes,
    });
    return response.data;
  },

  getReportMetrics: async (): Promise<{ message: string; metrics: any }> => {
    const response = await api.get('/reports/metrics');
    return response.data;
  },
};

// Moderation API (Admin only)
export const moderationAPI = {
  suspendUser: async (userId: string, reason?: string): Promise<{ message: string; user: any }> => {
    const response = await api.post(`/moderation/users/${userId}/suspend`, { reason });
    return response.data;
  },

  reactivateUser: async (userId: string): Promise<{ message: string; user: any }> => {
    const response = await api.post(`/moderation/users/${userId}/reactivate`);
    return response.data;
  },

  hideReview: async (reviewId: string, reason?: string): Promise<{ message: string; review: any }> => {
    const response = await api.post(`/moderation/reviews/${reviewId}/hide`, { reason });
    return response.data;
  },

  unhideReview: async (reviewId: string): Promise<{ message: string; review: any }> => {
    const response = await api.post(`/moderation/reviews/${reviewId}/unhide`);
    return response.data;
  },

  lockTask: async (taskId: string, reason: string, reportId?: string): Promise<{ message: string; task: any }> => {
    const response = await api.post(`/moderation/tasks/${taskId}/lock`, { reason, reportId });
    return response.data;
  },

  unlockTask: async (taskId: string): Promise<{ message: string; task: any }> => {
    const response = await api.post(`/moderation/tasks/${taskId}/unlock`);
    return response.data;
  },

  lockContract: async (
    contractId: string,
    reason: string,
    reportId?: string
  ): Promise<{ message: string; contract: any }> => {
    const response = await api.post(`/moderation/contracts/${contractId}/lock`, { reason, reportId });
    return response.data;
  },

  unlockContract: async (contractId: string): Promise<{ message: string; contract: any }> => {
    const response = await api.post(`/moderation/contracts/${contractId}/unlock`);
    return response.data;
  },

  triggerRefund: async (
    contractId: string,
    reason: string,
    amount?: number,
    reportId?: string
  ): Promise<{ message: string; contract: any }> => {
    const response = await api.post(`/moderation/contracts/${contractId}/refund`, {
      reason,
      amount,
      reportId,
    });
    return response.data;
  },

  getAuditLogs: async (params?: {
    page?: number;
    limit?: number;
    adminId?: string;
    entityType?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ logs: any[]; pagination: any }> => {
    const response = await api.get('/moderation/audit-logs', { params });
    return response.data;
  },
};

// Admin User API
export const adminUserAPI = {
  getAllUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    accountStatus?: string;
    role?: string;
  }): Promise<{ users: any[]; pagination: any }> => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  getUserById: async (userId: string): Promise<{ user: any }> => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },
};

// Profile API
export const profileAPI = {
  getMyProfile: async (): Promise<{ message: string; profile: any }> => {
    const response = await api.get('/profile/me');
    return response.data;
  },

  updateProfile: async (data: {
    name?: string;
    bio?: string;
    avatarUrl?: string;
    preferredHourlyRate?: number;
  }): Promise<{ message: string; profile: any }> => {
    const response = await api.patch('/profile/me', data);
    return response.data;
  },

  getPublicProfile: async (userId: string): Promise<{ message: string; profile: any }> => {
    const response = await api.get(`/profile/${userId}`);
    return response.data;
  },

  setNeighborhood: async (data: {
    latitude: number;
    longitude: number;
    address: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  }): Promise<{ message: string; neighborhood: any }> => {
    const response = await api.post('/profile/neighborhood', data);
    return response.data;
  },

  verifyNeighborhoodByGeo: async (latitude: number, longitude: number): Promise<{
    message: string;
    verified: boolean;
    distance: number;
  }> => {
    const response = await api.post('/profile/neighborhood/verify/geo', {
      latitude,
      longitude,
    });
    return response.data;
  },

  generateNeighborhoodOTP: async (): Promise<{
    message: string;
    token: string;
    expiresAt: string;
    otp?: string; // For testing only
  }> => {
    const response = await api.post('/profile/neighborhood/verify/otp/generate');
    return response.data;
  },

  verifyNeighborhoodByOTP: async (token: string, otp: string): Promise<{
    message: string;
    verified: boolean;
  }> => {
    const response = await api.post('/profile/neighborhood/verify/otp', {
      token,
      otp,
    });
    return response.data;
  },

  getAllSkills: async (): Promise<{ message: string; skills: Array<{ skillId: string; name: string; category: string; description: string | null }> }> => {
    const response = await api.get('/profile/skills');
    return response.data;
  },

  addSkill: async (data: {
    skillId: string;
    level?: string;
    experienceYears?: number;
  }): Promise<{ message: string; userSkill: any }> => {
    const response = await api.post('/profile/skills', data);
    return response.data;
  },

  removeSkill: async (skillId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/profile/skills/${skillId}`);
    return response.data;
  },
};

// Upload API
export const uploadAPI = {
  getPresignedUrl: async (data: {
    fileName: string;
    fileType: string;
    fileSize: number;
  }): Promise<{
    uploadUrl: string;
    fileUrl: string;
    key: string;
    isBase64Upload: boolean;
  }> => {
    const response = await api.post('/uploads/presigned-url', data);
    return response.data;
  },
};

export default api;
 