// src/components/reviews/ReviewForm.tsx
//
// Create or edit a review for a completed contract. Used by:
// - ReviewPromptDialog (create only, from notification metadata)
// - EditReviewDialog (edit with existingReview pre-filled)
// Client-side checks mirror backend limits (rating 1–5, comment ≤300, ≤3 tags).
// Server is authoritative for "already reviewed" / permissions.

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Rating,
  FormLabel,
  Chip,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { ReviewTag, REVIEW_TAG_LABELS, CreateReviewData, UpdateReviewData, Review } from '@/types/review.types';
import { reviewAPI } from '@/services/api.service';

interface ReviewFormProps {
  /** Completed job (contract) this review belongs to */
  contractId: string;
  /** User being reviewed (the other party on the contract) */
  revieweeId: string;
  revieweeName?: string;
  taskTitle?: string;
  existingReview?: Review | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ALL_TAGS = Object.values(ReviewTag);

const ReviewForm: React.FC<ReviewFormProps> = ({
  contractId,
  revieweeId,
  revieweeName,
  taskTitle,
  existingReview,
  onSuccess,
  onCancel,
}) => {
  const [rating, setRating] = useState<number>(existingReview?.rating || 0);
  const [comment, setComment] = useState<string>(existingReview?.comment || '');
  const [selectedTags, setSelectedTags] = useState<ReviewTag[]>(existingReview?.tags || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset or hydrate fields when switching reviews (edit) or toggling create ↔ edit (reviewId changes)
  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment || '');
      setSelectedTags(existingReview.tags || []);
    } else {
      setRating(0);
      setComment('');
      setSelectedTags([]);
    }
  }, [existingReview?.reviewId]);

  const handleTagToggle = (tag: ReviewTag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      if (selectedTags.length < 3) {
        setSelectedTags([...selectedTags, tag]);
      } else {
        setError('Maximum 3 tags allowed');
        setTimeout(() => setError(null), 3000);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating < 1 || rating > 5) {
      setError('Please select a rating');
      return;
    }

    if (comment && comment.length > 300) {
      setError('Comment must be 300 characters or less');
      return;
    }

    setLoading(true);

    try {
      if (existingReview) {
        // PATCH-style update; server enforces owner + time window
        const updateData: UpdateReviewData = {
          rating,
          comment: comment || undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
        };
        await reviewAPI.updateReview(existingReview.reviewId, updateData);
      } else {
        // First review for this contract from this reviewer (server rejects duplicates)
        const createData: CreateReviewData = {
          contractId,
          revieweeId,
          rating,
          comment: comment || undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
        };
        await reviewAPI.createReview(createData);
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || (existingReview ? 'Failed to update review' : 'Failed to submit review'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {existingReview ? 'Edit Review' : 'Leave a Review'}
        </Typography>
        {revieweeName && (
          <Typography variant="body2" color="text.secondary">
            Review for {revieweeName}
            {taskTitle && ` - ${taskTitle}`}
          </Typography>
        )}
      </Box>

      {/* Rating */}
      <Box sx={{ mb: 3 }}>
        <FormLabel component="legend" required>
          Rating
        </FormLabel>
        <Rating
          value={rating}
          onChange={(_, newValue) => {
            if (newValue !== null) {
              setRating(newValue);
            }
          }}
          size="large"
          sx={{ mt: 1 }}
        />
      </Box>

      {/* Tags */}
      <Box sx={{ mb: 3 }}>
        <FormLabel component="legend" sx={{ mb: 1 }}>
          Tags (select up to 3)
        </FormLabel>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {ALL_TAGS.map((tag) => (
            <Chip
              key={tag}
              label={REVIEW_TAG_LABELS[tag]}
              onClick={() => handleTagToggle(tag)}
              color={selectedTags.includes(tag) ? 'primary' : 'default'}
              variant={selectedTags.includes(tag) ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {selectedTags.length}/3 tags selected
        </Typography>
      </Box>

      {/* Comment */}
      <TextField
        fullWidth
        multiline
        rows={4}
        label="Comment (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        helperText={`${comment.length}/300 characters`}
        inputProps={{ maxLength: 300 }}
        sx={{ mb: 3 }}
      />

      {/* Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        {onCancel && (
          <Button onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          disabled={loading || rating < 1}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {existingReview ? 'Update Review' : 'Submit Review'}
        </Button>
      </Box>
    </Box>
  );
};

export default ReviewForm;

