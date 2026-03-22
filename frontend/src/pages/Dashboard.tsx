import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Alert, Rating, Chip } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import { reviewAPI } from '@/services/api.service';
import { ReviewStats, REVIEW_TAG_LABELS, ReviewTag } from '@/types/review.types';
import ReviewList from '@/components/reviews/ReviewList';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (user?.userId) {
      loadReviewStats();
    }
  }, [user?.userId]);

  const loadReviewStats = async () => {
    if (!user?.userId) return;
    setLoadingStats(true);
    try {
      const stats = await reviewAPI.getUserReviewStats(user.userId);
      // Convert string[] to ReviewTag[] for type safety
      setReviewStats({
        ...stats,
        commonTags: stats.commonTags as ReviewTag[],
      });
    } catch (error) {
      console.error('Failed to load review stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
        Welcome to JiffyJobs!
      </Typography>

      {!user?.isVerified && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
          Please verify your email address. Check your inbox for the verification link.
        </Alert>
      )}

      <Paper sx={{ p: 4, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Account Information
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Name
            </Typography>
            <Typography variant="body1">{user?.name || 'Not provided'}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body1">{user?.email}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Email Verification Status
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {user?.isVerified ? (
                <>
                  <CheckCircleIcon color="success" fontSize="small" />
                  <Typography variant="body1" color="success.main">
                    Verified
                  </Typography>
                </>
              ) : (
                <>
                  <WarningIcon color="warning" fontSize="small" />
                  <Typography variant="body1" color="warning.main">
                    Not Verified
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Review Stats */}
      {user?.userId && (
        <Paper sx={{ p: 4, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Reviews
          </Typography>
          {loadingStats ? (
            <Typography variant="body2" color="text.secondary">Loading...</Typography>
          ) : (
            <Box sx={{ mt: 2 }}>
              {reviewStats && reviewStats.totalCount > 0 ? (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Rating value={reviewStats.averageRating} readOnly precision={0.1} />
                    <Typography variant="h6">
                      {reviewStats.averageRating.toFixed(1)} / 5.0
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ({reviewStats.totalCount} {reviewStats.totalCount === 1 ? 'review received' : 'reviews received'})
                    </Typography>
                  </Box>
                  {reviewStats.commonTags.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                        Common tags:
                      </Typography>
                      {reviewStats.commonTags.map((tag) => (
                        <Chip
                          key={tag}
                          label={REVIEW_TAG_LABELS[tag]}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  )}
                </>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  No reviews received yet. Complete tasks so others can rate you!
                </Typography>
              )}

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Reviews about you
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                You can report reviews about you. You can edit or delete reviews you&apos;ve written.
              </Typography>
              <ReviewList
                mode="received"
                userId={user.userId}
                currentUserId={user.userId}
                showActions
              />

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
                Reviews you&apos;ve written
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Edit or delete reviews you&apos;ve written here. Notifications only start a new review.
              </Typography>
              <ReviewList mode="given" currentUserId={user.userId} />
            </Box>
          )}
        </Paper>
      )}

      <Paper sx={{ p: 4 }}>
        <Typography variant="h6" gutterBottom>
          Getting Started
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          🎉 Your account has been created successfully!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Epic 1: User Authentication - Complete ✅
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Epic 2: Task Posting - In Progress 🚧
        </Typography>

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={() => navigate('/tasks/create')}
          >
            Post a Task
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/my-tasks')}
          >
            View My Tasks
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Dashboard;