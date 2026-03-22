// src/controllers/review.controller.ts

import { Response } from 'express';
import { AuthRequest } from '../types';
import * as reviewService from '../services/review.service';
import { ReviewTag } from '@prisma/client';

/**
 * Create a review for a completed contract
 */
export const createReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { contractId, revieweeId, rating, comment, tags } = req.body;

    if (!contractId || !revieweeId || !rating) {
      res.status(400).json({ error: 'contractId, revieweeId, and rating are required' });
      return;
    }

    // Validate tags are valid ReviewTag enum values
    if (tags && Array.isArray(tags)) {
      const validTags = Object.values(ReviewTag);
      const invalidTags = tags.filter((tag: string) => !validTags.includes(tag as ReviewTag));
      if (invalidTags.length > 0) {
        res.status(400).json({ error: `Invalid tags: ${invalidTags.join(', ')}` });
        return;
      }
    }

    const review = await reviewService.createReview({
      contractId,
      reviewerId: req.user.userId,
      revieweeId,
      rating,
      comment,
      tags: tags as ReviewTag[],
    });

    res.status(201).json(review);
  } catch (error: any) {
    console.error('Error creating review:', error);
    res.status(400).json({ error: error.message || 'Failed to create review' });
  }
};

/**
 * Update a review (within 1 hour window)
 */
export const updateReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { reviewId } = req.params;
    const { rating, comment, tags } = req.body;

    if (!reviewId) {
      res.status(400).json({ error: 'reviewId is required' });
      return;
    }

    // Validate tags if provided
    if (tags && Array.isArray(tags)) {
      const validTags = Object.values(ReviewTag);
      const invalidTags = tags.filter((tag: string) => !validTags.includes(tag as ReviewTag));
      if (invalidTags.length > 0) {
        res.status(400).json({ error: `Invalid tags: ${invalidTags.join(', ')}` });
        return;
      }
    }

    const review = await reviewService.updateReview({
      reviewId,
      reviewerId: req.user.userId,
      rating,
      comment,
      tags: tags as ReviewTag[],
    });

    res.status(200).json(review);
  } catch (error: any) {
    console.error('Error updating review:', error);
    res.status(400).json({ error: error.message || 'Failed to update review' });
  }
};

/**
 * Delete a review (within 1 hour window)
 */
export const deleteReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { reviewId } = req.params;

    if (!reviewId) {
      res.status(400).json({ error: 'reviewId is required' });
      return;
    }

    const result = await reviewService.deleteReview(reviewId, req.user.userId);

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error deleting review:', error);
    res.status(400).json({ error: error.message || 'Failed to delete review' });
  }
};

/**
 * Get reviews for a user (paginated)
 */
export const getUserReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const result = await reviewService.getUserReviews(userId, page, limit);

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error getting user reviews:', error);
    res.status(500).json({ error: error.message || 'Failed to get reviews' });
  }
};

/**
 * Get reviews written by the authenticated user (paginated)
 */
export const getMyReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await reviewService.getMyReviews(req.user.userId, page, limit);

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error getting my reviews:', error);
    res.status(500).json({ error: error.message || 'Failed to get reviews' });
  }
};

/**
 * Get review statistics for a user
 */
export const getUserReviewStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const stats = await reviewService.getUserReviewStats(userId);

    res.status(200).json(stats);
  } catch (error: any) {
    console.error('Error getting review stats:', error);
    res.status(500).json({ error: error.message || 'Failed to get review stats' });
  }
};

/**
 * Get review for a specific contract
 */
export const getContractReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { contractId } = req.params;

    if (!contractId) {
      res.status(400).json({ error: 'contractId is required' });
      return;
    }

    const review = await reviewService.getContractReview(contractId, req.user.userId);

    res.status(200).json(review);
  } catch (error: any) {
    console.error('Error getting contract review:', error);
    res.status(400).json({ error: error.message || 'Failed to get review' });
  }
};

/**
 * Check if user can review a contract
 */
export const canUserReviewContract = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { contractId } = req.params;

    if (!contractId) {
      res.status(400).json({ error: 'contractId is required' });
      return;
    }

    const result = await reviewService.canUserReviewContract(contractId, req.user.userId);

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error checking review eligibility:', error);
    res.status(500).json({ error: error.message || 'Failed to check review eligibility' });
  }
};

/**
 * Report/flag a review
 */
export const reportReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { reviewId } = req.params;
    const { reason } = req.body;

    if (!reviewId) {
      res.status(400).json({ error: 'reviewId is required' });
      return;
    }

    const report = await reviewService.reportReview(reviewId, req.user.userId, reason);

    res.status(201).json(report);
  } catch (error: any) {
    console.error('Error reporting review:', error);
    res.status(400).json({ error: error.message || 'Failed to report review' });
  }
};

