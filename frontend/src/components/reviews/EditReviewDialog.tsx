// Reusable edit flow: same ReviewForm as notification prompt, with pre-filled data.

import React from 'react';
import { Dialog, DialogTitle, DialogContent } from '@mui/material';
import ReviewForm from './ReviewForm';
import { Review } from '@/types/review.types';

interface EditReviewDialogProps {
  open: boolean;
  review: Review | null;
  onClose: () => void;
  /** Called after successful update (show snackbar + refetch here) */
  onSaved: () => void;
}

const EditReviewDialog: React.FC<EditReviewDialogProps> = ({
  open,
  review,
  onClose,
  onSaved,
}) => {
  if (!review) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit review</DialogTitle>
      <DialogContent>
        <ReviewForm
          key={review.reviewId}
          contractId={review.contractId}
          revieweeId={review.revieweeId}
          revieweeName={review.reviewee.name || review.reviewee.email || undefined}
          taskTitle={review.contract.task.title}
          existingReview={review}
          onSuccess={onSaved}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};

export default EditReviewDialog;
