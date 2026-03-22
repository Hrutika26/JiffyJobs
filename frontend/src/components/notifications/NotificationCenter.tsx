import React, { useState, useEffect, useCallback } from 'react';
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Button,
  CircularProgress,
  Chip,
  Snackbar,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import { Notification, NotificationType } from '@/types/notification.types';
import { notificationAPI, reviewAPI } from '@/services/api.service';
import { useSocket } from '@/contexts/SocketContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useNavigate } from 'react-router-dom';
import ReviewPromptDialog from '@/components/reviews/ReviewPromptDialog';

dayjs.extend(relativeTime);

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
  onNotificationClick?: (notification: Notification) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  open,
  onClose,
  onNotificationClick,
}) => {
  const navigate = useNavigate();
  const { socket, onNewNotification, onNotificationRead } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [reviewPromptOpen, setReviewPromptOpen] = useState(false);
  const [selectedReviewNotification, setSelectedReviewNotification] = useState<Notification | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'info' | 'error' }>({
    open: false,
    message: '',
    severity: 'info',
  });

  /** Message when user already reviewed — edits only from Dashboard → Reviews you've written */
  const REVIEW_ALREADY_DASHBOARD_MSG =
    'Review already submitted. You can edit it from your dashboard.';

  // Load notifications
  const loadNotifications = useCallback(async (pageNum: number = 1) => {
    try {
      setIsLoading(true);
      const response = await notificationAPI.getNotifications(pageNum, 20, false);
      if (pageNum === 1) {
        setNotifications(response.notifications);
      } else {
        setNotifications((prev) => [...prev, ...response.notifications]);
      }
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load notifications when drawer opens
  useEffect(() => {
    if (open) {
      loadNotifications(1);
    }
  }, [open, loadNotifications]);

  // Listen for new notifications
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data: { notification: Notification }) => {
      setNotifications((prev) => [data.notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    const handleNotificationRead = (data: { notificationId: string }) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.notificationId === data.notificationId
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    onNewNotification(handleNewNotification);
    onNotificationRead(handleNotificationRead);
  }, [socket, onNewNotification, onNotificationRead]);

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      try {
        await notificationAPI.markAsRead(notification.notificationId);
        setNotifications((prev) =>
          prev.map((n) =>
            n.notificationId === notification.notificationId
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // Review prompts: create-only modal — check eligibility before opening (edits are dashboard-only)
    if (notification.type === NotificationType.REVIEW_REQUESTED) {
      const contractId = notification.metadata?.contractId as string | undefined;
      if (!contractId) {
        setSnackbar({
          open: true,
          message: 'Missing task information for this review.',
          severity: 'error',
        });
        return;
      }
      try {
        const { canReview, reason } = await reviewAPI.canUserReviewContract(contractId);
        if (!canReview) {
          const already =
            reason?.toLowerCase().includes('already') || reason?.toLowerCase().includes('reviewed');
          setSnackbar({
            open: true,
            message: already ? REVIEW_ALREADY_DASHBOARD_MSG : reason || 'You cannot leave a review for this task right now.',
            severity: 'info',
          });
          return;
        }
        setSelectedReviewNotification(notification);
        setReviewPromptOpen(true);
      } catch (error: any) {
        console.error('Failed to check review eligibility:', error);
        setSnackbar({
          open: true,
          message: error.response?.data?.error || 'Could not open review. Try again from your dashboard.',
          severity: 'error',
        });
      }
      return;
    }

    // Navigate based on notification type
    if (notification.relatedTaskId) {
      navigate(`/task/${notification.relatedTaskId}`);
      onClose();
    }

    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  const handleReviewSubmitted = () => {
    if (selectedReviewNotification) {
      // Refresh notifications to update the list
      loadNotifications(1);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 400 } }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h6">Notifications</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {unreadCount > 0 && (
              <Button
                size="small"
                startIcon={<MarkEmailReadIcon />}
                onClick={handleMarkAllAsRead}
              >
                Mark all read
              </Button>
            )}
            <IconButton size="small" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Notifications List */}
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {isLoading && notifications.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No notifications
              </Typography>
            </Box>
          ) : (
            <List>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.notificationId}>
                  <ListItem
                    onClick={() => handleNotificationClick(notification)}
                    sx={{
                      bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.selected',
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2">{notification.title}</Typography>
                          {!notification.isRead && (
                            <Chip
                              label="New"
                              size="small"
                              color="primary"
                              sx={{ height: 18, fontSize: '0.65rem' }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {dayjs(notification.createdAt).fromNow()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </Box>

      {/* Review Prompt Dialog */}
      <ReviewPromptDialog
        open={reviewPromptOpen}
        notification={selectedReviewNotification}
        onClose={() => {
          setReviewPromptOpen(false);
          setSelectedReviewNotification(null);
        }}
        onReviewSubmitted={handleReviewSubmitted}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Drawer>
  );
};

export default NotificationCenter;

