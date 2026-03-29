// MyBids.tsx — Logged-in helper: all bids they placed, with withdraw while PENDING.
// Status subtitle under the chip explains REJECTED using task.status (assigned elsewhere vs generic not selected).

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Stack,
  Card,
  CardContent,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Pending,
  AccessTime,
  AttachMoney,
  Visibility,
} from '@mui/icons-material';
import { bidAPI } from '@/services/api.service';
import { Bid, BidStatus, TaskStatus } from '@/types/task.types';
import { useNavigate } from 'react-router-dom';

const MyBids: React.FC = () => {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyBids();
  }, []);

  const fetchMyBids = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await bidAPI.getMyBids();
      setBids(response.bids);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string; message?: string } } };
      setError(
        apiError.response?.data?.error ||
          apiError.response?.data?.message ||
          'Something went wrong'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawBid = async (bidId: string) => {
    try {
      await bidAPI.withdrawBid(bidId);
      // Refresh the bids list
      fetchMyBids();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string; message?: string } } };
      setError(
        apiError.response?.data?.error ||
          apiError.response?.data?.message ||
          'Something went wrong'
      );
    }
  };

  const getStatusColor = (bid: Bid) => {
    const status = bid.status;
    switch (status) {
      case BidStatus.PENDING:
        return 'warning';
      case BidStatus.ACCEPTED:
        return 'success';
      case BidStatus.REJECTED:
        return 'warning';
      case BidStatus.WITHDRAWN:
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: BidStatus) => {
    if (status === BidStatus.REJECTED) return 'Not selected';
    return status;
  };

  const getStatusIcon = (status: BidStatus) => {
    switch (status) {
      case BidStatus.PENDING:
        return <Pending />;
      case BidStatus.ACCEPTED:
        return <CheckCircle />;
      case BidStatus.REJECTED:
        return <Cancel />;
      case BidStatus.WITHDRAWN:
        return <Cancel />;
      default:
        return <Pending />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" onClose={() => setError(null)}>
        {error}
      </Alert>
    );
  }

  if (bids.length === 0) {
    return (
      <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Bids Yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          You haven't placed any bids yet. Start by discovering tasks and placing your first bid!
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/discover')}
        >
          Discover Tasks
        </Button>
      </Paper>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        My Bids ({bids.length})
      </Typography>
      
      <Stack spacing={2}>
        {bids.map((bid) => (
          <Card key={bid.bidId} elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" gutterBottom>
                  {bid.task?.title || 'Task'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Click "View Task" to see full details
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AttachMoney fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {formatCurrency(bid.amount)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AccessTime fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(bid.createdAt)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                
                <Box sx={{ textAlign: 'right', minWidth: 120 }}>
                  <Chip
                    icon={getStatusIcon(bid.status)}
                    label={getStatusLabel(bid.status)}
                    color={getStatusColor(bid) as 'default' | 'primary' | 'success' | 'warning' | 'error'}
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {bid.status === BidStatus.PENDING && 'Waiting for response'}
                    {bid.status === BidStatus.ACCEPTED && 'Bid accepted! 🎉'}
                    {bid.status === BidStatus.REJECTED &&
                      (bid.task?.status === TaskStatus.ASSIGNED ||
                      bid.task?.status === TaskStatus.IN_PROGRESS ||
                      bid.task?.status === TaskStatus.AWAITING_CONFIRMATION ||
                      bid.task?.status === TaskStatus.COMPLETED
                        ? 'Task assigned to another bidder'
                        : 'Not selected for this task')}
                    {bid.status === BidStatus.WITHDRAWN && 'Bid withdrawn'}
                  </Typography>
                </Box>
              </Box>

              {bid.note && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    "{bid.note}"
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button
                  size="small"
                  startIcon={<Visibility />}
                  onClick={() => navigate(`/task/${bid.taskId}`)}
                >
                  View Task
                </Button>
                
                {bid.status === BidStatus.PENDING && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => handleWithdrawBid(bid.bidId)}
                  >
                    Withdraw Bid
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
};

export default MyBids;
