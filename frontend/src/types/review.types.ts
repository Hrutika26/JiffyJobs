// Shared TypeScript shapes for review API responses and forms (tags enum aligns with Prisma ReviewTag).

export enum ReviewTag {
  PUNCTUAL = 'PUNCTUAL',
  CAREFUL = 'CAREFUL',
  COMMUNICATIVE = 'COMMUNICATIVE',
  PROFESSIONAL = 'PROFESSIONAL',
  FRIENDLY = 'FRIENDLY',
  EFFICIENT = 'EFFICIENT',
  RELIABLE = 'RELIABLE',
  SKILLED = 'SKILLED',
  CLEAN = 'CLEAN',
  RESPONSIVE = 'RESPONSIVE',
}

export interface Review {
  reviewId: string;
  contractId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number; // 1-5
  comment?: string;
  tags: ReviewTag[];
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
  reviewer: {
    userId: string;
    name: string | null;
    email: string;
  };
  reviewee: {
    userId: string;
    name: string | null;
    email: string;
  };
  contract: {
    contractId: string;
    task: {
      taskId: string;
      title: string;
    };
  };
}

export interface ReviewStats {
  averageRating: number;
  totalCount: number;
  commonTags: ReviewTag[];
}

export interface ReviewsResponse {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CreateReviewData {
  contractId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
  tags?: ReviewTag[];
}

export interface UpdateReviewData {
  rating?: number;
  comment?: string;
  tags?: ReviewTag[];
}

export const REVIEW_TAG_LABELS: Record<ReviewTag, string> = {
  [ReviewTag.PUNCTUAL]: 'Punctual',
  [ReviewTag.CAREFUL]: 'Careful',
  [ReviewTag.COMMUNICATIVE]: 'Communicative',
  [ReviewTag.PROFESSIONAL]: 'Professional',
  [ReviewTag.FRIENDLY]: 'Friendly',
  [ReviewTag.EFFICIENT]: 'Efficient',
  [ReviewTag.RELIABLE]: 'Reliable',
  [ReviewTag.SKILLED]: 'Skilled',
  [ReviewTag.CLEAN]: 'Clean',
  [ReviewTag.RESPONSIVE]: 'Responsive',
};

