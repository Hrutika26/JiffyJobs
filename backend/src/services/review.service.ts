// src/services/review.service.ts

import prisma from '../config/database';
import { ReviewTag, ReportStatus } from '@prisma/client';

const EDIT_WINDOW_HOURS = 1; // 1 hour edit window
const MAX_COMMENT_LENGTH = 300;
const MAX_TAGS = 3;

export interface CreateReviewParams {
  contractId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number; // 1-5
  comment?: string;
  tags?: ReviewTag[];
}

export interface UpdateReviewParams {
  reviewId: string;
  reviewerId: string;
  rating?: number;
  comment?: string;
  tags?: ReviewTag[];
}

/**
 * Create a review for a completed contract
 * Validates: one review per contract per reviewer, rating 1-5, comment max 300 chars, max 3 tags
 */
export const createReview = async (params: CreateReviewParams) => {
  const { contractId, reviewerId, revieweeId, rating, comment, tags } = params;

  // Validate rating
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  // Validate comment length
  if (comment && comment.length > MAX_COMMENT_LENGTH) {
    throw new Error(`Comment must be ${MAX_COMMENT_LENGTH} characters or less`);
  }

  // Validate tags
  if (tags && tags.length > MAX_TAGS) {
    throw new Error(`Maximum ${MAX_TAGS} tags allowed`);
  }

  // Verify contract exists and is completed
  const contract = await prisma.contract.findUnique({
    where: { contractId },
    include: {
      task: {
        select: {
          status: true,
          posterId: true,
          assignedHelperId: true,
        },
      },
    },
  });

  if (!contract) {
    throw new Error('Contract not found');
  }

  // Verify task is completed
  if (contract.task.status !== 'COMPLETED') {
    throw new Error('Can only review completed tasks');
  }

  // Verify reviewer and reviewee are part of the contract
  const isPoster = contract.posterId === reviewerId;
  const isHelper = contract.helperId === reviewerId;

  if (!isPoster && !isHelper) {
    throw new Error('You are not part of this contract');
  }

  // Verify reviewee is the other party
  const expectedRevieweeId = isPoster ? contract.helperId : contract.posterId;
  if (revieweeId !== expectedRevieweeId) {
    throw new Error('Invalid reviewee for this contract');
  }

  // Check if review already exists
  const existingReview = await prisma.review.findUnique({
    where: {
      contractId_reviewerId: {
        contractId,
        reviewerId,
      },
    },
  });

  if (existingReview) {
    throw new Error('You have already reviewed this contract');
  }

  // Create review
  const review = await prisma.review.create({
    data: {
      contractId,
      reviewerId,
      revieweeId,
      rating,
      comment: comment || undefined,
      tags: tags || [],
      isEdited: false,
    },
    include: {
      reviewer: {
        select: {
          userId: true,
          name: true,
          email: true,
        },
      },
      reviewee: {
        select: {
          userId: true,
          name: true,
          email: true,
        },
      },
      contract: {
        include: {
          task: {
            select: {
              taskId: true,
              title: true,
            },
          },
        },
      },
    },
  });

  return review;
};

/**
 * Update a review (within 1 hour window)
 */
export const updateReview = async (params: UpdateReviewParams) => {
  const { reviewId, reviewerId, rating, comment, tags } = params;

  // Get existing review
  const existingReview = await prisma.review.findUnique({
    where: { reviewId },
  });

  if (!existingReview) {
    throw new Error('Review not found');
  }

  // Verify ownership
  if (existingReview.reviewerId !== reviewerId) {
    throw new Error('You can only edit your own reviews');
  }

  // Check edit window (1 hour)
  const now = new Date();
  const createdAt = new Date(existingReview.createdAt);
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceCreation > EDIT_WINDOW_HOURS) {
    throw new Error('Edit window has expired. Reviews can only be edited within 1 hour of creation.');
  }

  // Validate rating if provided
  if (rating !== undefined && (rating < 1 || rating > 5)) {
    throw new Error('Rating must be between 1 and 5');
  }

  // Validate comment length if provided
  if (comment !== undefined && comment.length > MAX_COMMENT_LENGTH) {
    throw new Error(`Comment must be ${MAX_COMMENT_LENGTH} characters or less`);
  }

  // Validate tags if provided
  if (tags !== undefined && tags.length > MAX_TAGS) {
    throw new Error(`Maximum ${MAX_TAGS} tags allowed`);
  }

  // Update review
  const updatedReview = await prisma.review.update({
    where: { reviewId },
    data: {
      rating: rating !== undefined ? rating : existingReview.rating,
      comment: comment !== undefined ? comment : existingReview.comment,
      tags: tags !== undefined ? tags : existingReview.tags,
      isEdited: true,
      editedAt: now,
    },
    include: {
      reviewer: {
        select: {
          userId: true,
          name: true,
          email: true,
        },
      },
      reviewee: {
        select: {
          userId: true,
          name: true,
          email: true,
        },
      },
      contract: {
        include: {
          task: {
            select: {
              taskId: true,
              title: true,
            },
          },
        },
      },
    },
  });

  return updatedReview;
};

/**
 * Delete a review (within 1 hour window)
 */
export const deleteReview = async (reviewId: string, userId: string) => {
  // Get existing review
  const existingReview = await prisma.review.findUnique({
    where: { reviewId },
  });

  if (!existingReview) {
    throw new Error('Review not found');
  }

  // Verify ownership
  if (existingReview.reviewerId !== userId) {
    throw new Error('You can only delete your own reviews');
  }

  // Check edit window (1 hour)
  const now = new Date();
  const createdAt = new Date(existingReview.createdAt);
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceCreation > EDIT_WINDOW_HOURS) {
    throw new Error('Delete window has expired. Reviews can only be deleted within 1 hour of creation.');
  }

  // Delete review
  await prisma.review.delete({
    where: { reviewId },
  });

  return { message: 'Review deleted successfully' };
};

/**
 * Get reviews for a user (paginated)
 */
export const getUserReviews = async (
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  reviews: Array<{
    reviewId: string;
    rating: number;
    comment: string | null;
    tags: ReviewTag[];
    isEdited: boolean;
    editedAt: Date | null;
    createdAt: Date;
    reviewer: {
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
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}> => {
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: {
        revieweeId: userId,
        isHidden: false, // Only show non-hidden reviews
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
      include: {
        reviewer: {
          select: {
            userId: true,
            name: true,
            email: true,
          },
        },
        reviewee: {
          select: {
            userId: true,
            name: true,
            email: true,
          },
        },
        contract: {
          include: {
            task: {
              select: {
                taskId: true,
                title: true,
              },
            },
          },
        },
      },
    }),
    prisma.review.count({
      where: {
        revieweeId: userId,
        isHidden: false,
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    reviews: reviews.map((r: any) => ({
      reviewId: r.reviewId,
      contractId: r.contractId,
      reviewerId: r.reviewerId,
      revieweeId: r.revieweeId,
      rating: r.rating,
      comment: r.comment,
      tags: r.tags,
      isEdited: r.isEdited,
      editedAt: r.editedAt,
      createdAt: r.createdAt,
      reviewer: r.reviewer,
      reviewee: r.reviewee,
      contract: r.contract,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

/**
 * Get reviews written by the current user (paginated)
 */
export const getMyReviews = async (
  reviewerId: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  reviews: Array<{
    reviewId: string;
    contractId: string;
    reviewerId: string;
    revieweeId: string;
    rating: number;
    comment: string | null;
    tags: ReviewTag[];
    isEdited: boolean;
    editedAt: Date | null;
    createdAt: Date;
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
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}> => {
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: {
        reviewerId,
        isHidden: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
      include: {
        reviewer: {
          select: {
            userId: true,
            name: true,
            email: true,
          },
        },
        reviewee: {
          select: {
            userId: true,
            name: true,
            email: true,
          },
        },
        contract: {
          include: {
            task: {
              select: {
                taskId: true,
                title: true,
              },
            },
          },
        },
      },
    }),
    prisma.review.count({
      where: {
        reviewerId,
        isHidden: false,
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    reviews: reviews.map((r: any) => ({
      reviewId: r.reviewId,
      contractId: r.contractId,
      reviewerId: r.reviewerId,
      revieweeId: r.revieweeId,
      rating: r.rating,
      comment: r.comment,
      tags: r.tags,
      isEdited: r.isEdited,
      editedAt: r.editedAt,
      createdAt: r.createdAt,
      reviewer: r.reviewer,
      reviewee: r.reviewee,
      contract: r.contract,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

/**
 * Get review statistics for a user (aggregated ratings, count, common tags)
 */
export const getUserReviewStats = async (userId: string) => {
  const reviews = await prisma.review.findMany({
    where: {
      revieweeId: userId,
      isHidden: false,
    },
    select: {
      rating: true,
      tags: true,
    },
  });

  if (reviews.length === 0) {
    return {
      averageRating: 0,
      totalCount: 0,
      commonTags: [],
    };
  }

  // Calculate average rating
  const totalRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0);
  const averageRating = totalRating / reviews.length;

  // Count tag occurrences
  const tagCounts = new Map<ReviewTag, number>();
  reviews.forEach((review: any) => {
    review.tags.forEach((tag: any) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });

  // Get top 5 most common tags
  const commonTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  return {
    averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
    totalCount: reviews.length,
    commonTags,
  };
};

/**
 * Get review for a specific contract (if user is part of it)
 */
export const getContractReview = async (contractId: string, userId: string) => {
  // Verify user is part of the contract
  const contract = await prisma.contract.findUnique({
    where: { contractId },
    select: {
      posterId: true,
      helperId: true,
    },
  });

  if (!contract) {
    throw new Error('Contract not found');
  }

  if (contract.posterId !== userId && contract.helperId !== userId) {
    throw new Error('You are not part of this contract');
  }

  // Get review if it exists
  const review = await prisma.review.findUnique({
    where: {
      contractId_reviewerId: {
        contractId,
        reviewerId: userId,
      },
    },
    include: {
      reviewer: {
        select: {
          userId: true,
          name: true,
          email: true,
        },
      },
      reviewee: {
        select: {
          userId: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return review;
};

/**
 * Report/flag a review
 */
export const reportReview = async (
  reviewId: string,
  reporterId: string,
  reason?: string
) => {
  // Verify review exists
  const review = await prisma.review.findUnique({
    where: { reviewId },
  });

  if (!review) {
    throw new Error('Review not found');
  }

  // Check if already reported by this user
  const existingReport = await prisma.reviewReport.findFirst({
    where: {
      reviewId,
      reporterId,
      status: 'OPEN',
    },
  });

  if (existingReport) {
    throw new Error('You have already reported this review');
  }

  // Create report
  const report = await prisma.reviewReport.create({
    data: {
      reviewId,
      reporterId,
      reason: reason || 'No reason provided',
      status: 'OPEN',
    },
  });

  return report;
};

/**
 * Check if user can review a contract (hasn't reviewed yet and contract is completed)
 */
export const canUserReviewContract = async (contractId: string, userId: string) => {
  const contract = await prisma.contract.findUnique({
    where: { contractId },
    include: {
      task: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!contract) {
    return { canReview: false, reason: 'Contract not found' };
  }

  if (contract.task.status !== 'COMPLETED') {
    return { canReview: false, reason: 'Contract is not completed' };
  }

  // Check if user is part of contract
  if (contract.posterId !== userId && contract.helperId !== userId) {
    return { canReview: false, reason: 'You are not part of this contract' };
  }

  // Check if already reviewed
  const existingReview = await prisma.review.findUnique({
    where: {
      contractId_reviewerId: {
        contractId,
        reviewerId: userId,
      },
    },
  });

  if (existingReview) {
    return { canReview: false, reason: 'You have already reviewed this contract' };
  }

  return { canReview: true };
};

