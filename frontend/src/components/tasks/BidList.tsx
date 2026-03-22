import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Stack,
  Card,
  CardContent,
  Chip,
  Button,
  Menu,
  MenuItem,
  Alert,
  CircularProgress,
  Avatar,
  Paper,
} from '@mui/material';
import {
  Sort,
  CheckCircle,
  Cancel,
  Pending,
  AccessTime,
} from '@mui/icons-material';
import { bidAPI } from '@/services/api.service';
import { Bid, BidStatus, BidSortOptions, Contract } from '@/types/task.types';
import PaymentConfirmation from '@/components/payments/PaymentConfirmation';

interface BidListProps {
  taskId: string;
  onBidAccepted?: (bid: Bid) => void;
  refreshTrigger?: number;
}

const BidList: React.FC<BidListProps> = ({ 
  taskId, 
  onBidAccepted,
  refreshTrigger 
}) => {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const [sortBy, setSortBy] = useState<BidSortOptions>({
    field: 'amount',
    order: 'asc'
  });
  const [paymentContract, setPaymentContract] = useState<Contract | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  /** Only full-page loading on first load — refetch keeps list visible (e.g. success message from parent). */
  const isFirstFetch = useRef(true);

  const sortOptions = [
    { value: { field: 'amount' as const, order: 'asc' as const }, label: 'Amount (Low to High)' },
    { value: { field: 'amount' as const, order: 'desc' as const }, label: 'Amount (High to Low)' },
    { value: { field: 'createdAt' as const, order: 'desc' as const }, label: 'Newest First' },
    { value: { field: 'createdAt' as const, order: 'asc' as const }, label: 'Oldest First' },
    { value: { field: 'helperName' as const, order: 'asc' as const }, label: 'Helper Name (A-Z)' },
    { value: { field: 'helperName' as const, order: 'desc' as const }, label: 'Helper Name (Z-A)' },
  ];

  const fetchBids = async () => {
    try {
      if (isFirstFetch.current) {
        setLoading(true);
      }
      setError(null);
      const response = await bidAPI.getTaskBids(taskId, undefined, sortBy);
      setBids(response.bids);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string; message?: string } } };
      setError(
        apiError.response?.data?.error ||
          apiError.response?.data?.message ||
          'Failed to load bids'
      );
    } finally {
      if (isFirstFetch.current) {
        setLoading(false);
        isFirstFetch.current = false;
      }
    }
  };

  useEffect(() => {
    fetchBids();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, sortBy, refreshTrigger]);

  const handleSortChange = (newSort: BidSortOptions) => {
    setSortBy(newSort);
    setSortAnchorEl(null);
  };

  const handleAcceptBid = async (bid: Bid) => {
    try {
      const response = await bidAPI.acceptBid(bid.bidId);
      const contract = response.contract;
      
      // If payment info is present, show payment dialog
      if (contract?.paymentInfo?.clientSecret) {
        setPaymentContract(contract);
        setShowPaymentDialog(true);
      }
      
      if (onBidAccepted) {
        onBidAccepted(bid);
      }
      // Refresh the bids list (does not toggle full-page loading)
      fetchBids();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string; message?: string } } };
      setError(
        apiError.response?.data?.error ||
          apiError.response?.data?.message ||
          'Failed to accept bid'
      );
    }
  };

  const getStatusColor = (status: BidStatus) => {
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
        <Typography variant="body2" color="text.secondary">
          No helpers have placed bids on this task yet. Check back later!
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      {/* Header with Sort Options */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          Bids ({bids.length})
        </Typography>
        <Button
          startIcon={<Sort />}
          onClick={(e) => setSortAnchorEl(e.currentTarget)}
          variant="outlined"
          size="small"
        >
          Sort
        </Button>
        <Menu
          anchorEl={sortAnchorEl}
          open={Boolean(sortAnchorEl)}
          onClose={() => setSortAnchorEl(null)}
        >
          {sortOptions.map((option) => (
            <MenuItem
              key={`${option.value.field}-${option.value.order}`}
              onClick={() => handleSortChange(option.value)}
              selected={
                sortBy.field === option.value.field && 
                sortBy.order === option.value.order
              }
            >
              {option.label}
            </MenuItem>
          ))}
        </Menu>
      </Box>

      {/* Bids List */}
      <Stack spacing={2}>
        {bids.map((bid) => (
          <Card key={bid.bidId} elevation={2} sx={{ width: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 3 }}>
                {/* Helper Info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {getInitials(bid.helper?.name || 'Helper')}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {bid.helper?.name || 'Anonymous Helper'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {bid.helper?.email || 'No email provided'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <AccessTime fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(bid.createdAt)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Bid Amount and Status */}
                <Box sx={{ textAlign: 'right', minWidth: 150, flexShrink: 0 }}>
                  <Typography variant="h6" color="primary" fontWeight="bold">
                    {formatCurrency(bid.amount)}
                  </Typography>
                  <Chip
                    icon={getStatusIcon(bid.status)}
                    label={getStatusLabel(bid.status)}
                    color={getStatusColor(bid.status) as 'default' | 'primary' | 'success' | 'warning' | 'error'}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Box>

              {/* Bid Note */}
              {bid.note && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    "{bid.note}"
                  </Typography>
                </Box>
              )}

              {/* Action Buttons */}
              {bid.status === BidStatus.PENDING && (
                <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircle />}
                    onClick={() => handleAcceptBid(bid)}
                    size="small"
                  >
                    Accept Bid
                  </Button>
                </Box>
              )}

              {/* Accepted Bid Info */}
              {bid.status === BidStatus.ACCEPTED && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography variant="body2" color="success.dark" fontWeight="medium">
                    ✓ This bid has been accepted
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Payment Confirmation Dialog */}
      {paymentContract && paymentContract.paymentInfo && (
        <PaymentConfirmation
          open={showPaymentDialog}
          onClose={() => {
            setShowPaymentDialog(false);
            setPaymentContract(null);
          }}
          contract={paymentContract}
          onSuccess={() => {
            setShowPaymentDialog(false);
            setPaymentContract(null);
            if (onBidAccepted) {
              // Trigger refresh
              fetchBids();
            }
          }}
        />
      )}
    </Box>
  );
};

export default BidList;
