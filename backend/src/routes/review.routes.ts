// src/routes/review.routes.ts
// Mount path is prefixed elsewhere (e.g. /reviews). Order matters: static paths like GET /me before /:reviewId.

import { Router } from 'express';
import * as reviewController from '../controllers/review.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Create a review (authenticated)
router.post('/', authenticate, reviewController.createReview);

// Reviews written by current user (must be before /:reviewId)
router.get('/me', authenticate, reviewController.getMyReviews);

// Update a review (authenticated, owner only)
router.put('/:reviewId', authenticate, reviewController.updateReview);

// Delete a review (authenticated, owner only)
router.delete('/:reviewId', authenticate, reviewController.deleteReview);

// Get reviews for a user (public)
router.get('/user/:userId', reviewController.getUserReviews);

// Get review statistics for a user (public)
router.get('/user/:userId/stats', reviewController.getUserReviewStats);

// Get review for a specific contract (authenticated, must be part of contract)
router.get('/contract/:contractId', authenticate, reviewController.getContractReview);

// Check if user can review a contract (authenticated)
router.get('/contract/:contractId/can-review', authenticate, reviewController.canUserReviewContract);

// Report a review (authenticated)
router.post('/:reviewId/report', authenticate, reviewController.reportReview);

export default router;

