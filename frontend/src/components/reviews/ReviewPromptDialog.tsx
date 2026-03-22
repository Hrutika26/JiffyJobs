// src/components/reviews/ReviewPromptDialog.tsx
//
// Reviews can only be edited from the dashboard (ReviewList). This dialog is create-only;
// notification clicks run a pre-check in NotificationCenter before this opens.

import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import ReviewForm from './ReviewForm';
import { Notification } from '@/types/notification.types';

interface ReviewPromptDialogProps {
  open: boolean;
  notification: Notification | null;
  onClose: () => void;
  onReviewSubmitted: () => void;
}

const ReviewPromptDialog: React.FC<ReviewPromptDialogProps> = ({
  open,
  notification,
  onClose,
  onReviewSubmitted,
}) => {
  const handleReviewSubmitted = () => {
    onReviewSubmitted();
    onClose();
  };

  if (!notification || !notification.metadata) {
    return null;
  }

  const contractId = notification.metadata.contractId as string;
  const revieweeId = notification.metadata.revieweeId as string;
  const taskTitle = notification.metadata.taskTitle as string;
  const revieweeName = (notification.metadata.revieweeName as string) || undefined;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Leave a Review</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            To change a review later, use <strong>Dashboard → Reviews you&apos;ve written</strong>.
          </Typography>
          <ReviewForm
            contractId={contractId}
            revieweeId={revieweeId}
            revieweeName={revieweeName}
            taskTitle={taskTitle}
            onSuccess={handleReviewSubmitted}
            onCancel={onClose}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReviewPromptDialog;
