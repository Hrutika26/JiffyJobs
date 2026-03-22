// src/components/reviews/ReviewList.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Rating,
  Chip,
  Pagination,
  CircularProgress,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FlagIcon from '@mui/icons-material/Flag';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Review, REVIEW_TAG_LABELS } from '@/types/review.types';
import { reviewAPI } from '@/services/api.service';
import ReportForm from '../reports/ReportForm';
import { ReportType } from '@/types/report.types';
import EditReviewDialog from './EditReviewDialog';

export type ReviewListMode = 'received' | 'given';

interface ReviewListProps {
  /** Whose reviews are listed when mode is "received" (reviews about this user). Ignored when mode is "given". */
  userId?: string;
  /** "received" = reviews others left about userId. "given" = reviews written by the logged-in user (uses GET /reviews/me). */
  mode?: ReviewListMode;
  /** Required for owner-only actions: compare to review.reviewerId === currentUserId */
  currentUserId?: string;
  /** Show "Report" for reviews the viewer did not author (received list only). */
  showActions?: boolean;
}

function formatReviewDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

const ReviewList: React.FC<ReviewListProps> = ({
  userId,
  mode = 'received',
  currentUserId,
  showActions = false,
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const [editReview, setEditReview] = useState<Review | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const fetchReviews = useCallback(async () => {
    if (mode === 'received' && !userId) return;
    setLoading(true);
    setError(null);
    try {
      const response =
        mode === 'given'
          ? await reviewAPI.getMyReviews(page, 10)
          : await reviewAPI.getUserReviews(userId as string, page, 10);
      setReviews(response.reviews as Review[]);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [userId, page, mode]);

  useEffect(() => {
    if (mode === 'received' && !userId) {
      setError('userId is required for received reviews');
      setLoading(false);
      return;
    }
    setError(null);
    fetchReviews();
  }, [userId, page, mode, fetchReviews]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, review: Review) => {
    setAnchorEl(event.currentTarget);
    setSelectedReview(review);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedReview(null);
  };

  const handleReport = () => {
    if (!selectedReview) return;
    setShowReportDialog(true);
    handleMenuClose();
  };

  const isAuthor = (review: Review) =>
    Boolean(currentUserId && review.reviewerId === currentUserId);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await reviewAPI.deleteReview(deleteTarget.reviewId);
      setDeleteTarget(null);
      setSnackbar({ open: true, message: 'Review deleted successfully', severity: 'success' });
      await fetchReviews();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Failed to delete review',
        severity: 'error',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditSaved = async () => {
    setEditReview(null);
    setSnackbar({ open: true, message: 'Review updated successfully', severity: 'success' });
    await fetchReviews();
  };

  if (mode === 'received' && !userId) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        Missing userId for review list.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (reviews.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <Typography variant="body1" color="text.secondary">
          {mode === 'given' ? 'You have not written any reviews yet.' : 'No reviews yet'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {reviews.map((review) => {
        const author = isAuthor(review);
        const showReportMenu = showActions && !author && mode === 'received';

        return (
          <Card key={review.reviewId} sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box>
                  <Typography variant="h6" component="div">
                    {mode === 'given' ? (
                      <>
                        Review for{' '}
                        <strong>{review.reviewee?.name || review.reviewee?.email || 'User'}</strong>
                      </>
                    ) : (
                      <>{review.reviewer.name || review.reviewer.email}</>
                    )}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div">
                    {formatReviewDate(review.createdAt)}
                    {review.isEdited && (
                      <Chip
                        label={review.editedAt ? `Edited ${formatReviewDate(review.editedAt)}` : 'Edited'}
                        size="small"
                        sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                        variant="outlined"
                      />
                    )}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                  {author && (
                    <>
                      <Button
                        size="small"
                        startIcon={<EditIcon fontSize="small" />}
                        onClick={() => setEditReview(review)}
                        disabled={deleteLoading}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteOutlineIcon fontSize="small" />}
                        onClick={() => setDeleteTarget(review)}
                        disabled={deleteLoading}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                  {showReportMenu && (
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, review)}
                      aria-label="more options"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  )}
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Rating value={review.rating} readOnly size="small" />
                <Typography variant="body2" color="text.secondary">
                  {review.rating}/5
                </Typography>
              </Box>

              {review.tags.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                  {review.tags.map((tag) => (
                    <Chip key={tag} label={REVIEW_TAG_LABELS[tag]} size="small" variant="outlined" />
                  ))}
                </Box>
              )}

              {review.comment && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {review.comment}
                </Typography>
              )}

              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Task: {review.contract.task.title}
              </Typography>
            </CardContent>
          </Card>
        );
      })}

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
          />
        </Box>
      )}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleReport}>
          <FlagIcon sx={{ mr: 1 }} fontSize="small" />
          Report Review
        </MenuItem>
      </Menu>

      <EditReviewDialog
        open={Boolean(editReview)}
        review={editReview}
        onClose={() => setEditReview(null)}
        onSaved={handleEditSaved}
      />

      <Dialog open={Boolean(deleteTarget)} onClose={() => !deleteLoading && setDeleteTarget(null)}>
        <DialogTitle>Delete review?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This cannot be undone. Your review will be removed permanently (within the allowed delete window).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleteLoading}>
            {deleteLoading ? <CircularProgress size={22} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {selectedReview && (
        <ReportForm
          open={showReportDialog}
          onClose={() => {
            setShowReportDialog(false);
            setSelectedReview(null);
          }}
          onSuccess={() => {
            setShowReportDialog(false);
            setSelectedReview(null);
          }}
          type={ReportType.REVIEW}
          targetId={selectedReview.reviewId}
          targetTitle={`Review by ${selectedReview.reviewer.name || selectedReview.reviewer.email}`}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ReviewList;
