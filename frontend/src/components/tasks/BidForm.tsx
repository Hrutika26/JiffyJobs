// BidForm.tsx — Helper submits a bid for one task. Validates amount/note before calling bidAPI.placeBid.
// Budget min/max come from the task object (poster's range); HTML min/max hints match validation.

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Alert,
  Paper,
  Divider,
  Chip,
} from '@mui/material';
import { AttachMoney, Description, Send } from '@mui/icons-material';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import { bidAPI } from '@/services/api.service';
import { CreateBidData, Task, Bid } from '@/types/task.types';

interface BidFormProps {
  task: Task;
  onBidPlaced?: (bid: Bid) => void;
  onCancel?: () => void;
}

const BidForm: React.FC<BidFormProps> = ({ task, onBidPlaced, onCancel }) => {
  const [formData, setFormData] = useState<CreateBidData>({
    taskId: task.taskId,
    amount: 0,
    note: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleInputChange = (field: keyof CreateBidData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'amount' ? parseFloat(event.target.value) || 0 : event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear errors when user starts typing
    if (error) setError(null);
  };

  // Immediate feedback; server still validates (race conditions, rule changes)
  const validateForm = (): string | null => {
    if (formData.amount <= 0) {
      return 'Amount must be greater than 0';
    }
    if (task.budgetMin && formData.amount < task.budgetMin) {
      return `Bid amount must be at least $${task.budgetMin}`;
    }
    if (task.budgetMax && formData.amount > task.budgetMax) {
      return `Bid amount cannot exceed $${task.budgetMax}`;
    }
    if (formData.note && formData.note.length > 500) {
      return 'Note cannot exceed 500 characters';
    }
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await bidAPI.placeBid(formData);
      setSuccess('Bid submitted successfully');
      if (onBidPlaced) {
        onBidPlaced(response.bid);
      }
      // Reset form
      setFormData({
        taskId: task.taskId,
        amount: 0,
        note: '',
      });
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Place a Bid
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Submit your bid for this task. Make sure your bid is competitive and reflects the work required.
        </Typography>
        
        {/* Task Budget Info */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Task Budget Range
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            {task.budgetMin && (
              <Chip 
                label={`Min: ${formatCurrency(task.budgetMin)}`} 
                color="primary" 
                variant="outlined" 
                size="small"
              />
            )}
            {task.budgetMax && (
              <Chip 
                label={`Max: ${formatCurrency(task.budgetMax)}`} 
                color="secondary" 
                variant="outlined" 
                size="small"
              />
            )}
          </Stack>
        </Box>
      </Box>

      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          {/* Bid Amount */}
          <Box>
            <Input
              label="Your Bid Amount"
              type="number"
              value={formData.amount || ''}
              onChange={handleInputChange('amount')}
              placeholder="Enter your bid amount"
              required
              inputProps={{
                min: task.budgetMin || 0,
                max: task.budgetMax || undefined,
                step: 0.01,
              }}
              InputProps={{
                startAdornment: <AttachMoney sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              helperText={
                formData.amount > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {formatCurrency(formData.amount)}
                  </Typography>
                )
              }
            />
          </Box>

          {/* Bid Note */}
          <Box>
            <Input
              label="Note (Optional)"
              multiline
              rows={3}
              value={formData.note}
              onChange={handleInputChange('note')}
              placeholder="Add a note to explain your bid or highlight your qualifications..."
              InputProps={{
                startAdornment: <Description sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              helperText={`${formData.note?.length || 0}/500 characters`}
              inputProps={{
                maxLength: 500,
              }}
            />
          </Box>

          {/* Error/Success Messages */}
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          <Divider />

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            {onCancel && (
              <Button
                variant="outlined"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="contained"
              loading={loading}
              startIcon={<Send />}
              disabled={loading || formData.amount <= 0}
            >
              Place Bid
            </Button>
          </Stack>
        </Stack>
      </form>

      {/* Bidding Guidelines */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Bidding Guidelines
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Your bid should reflect the time and effort required for this task<br/>
          • Consider the task complexity and your experience<br/>
          • You can withdraw your bid before it's accepted<br/>
          • The task poster will see all bids and choose the best one
        </Typography>
      </Box>
    </Paper>
  );
};

export default BidForm;
