// TaskDetail.tsx — Logged-in task page (poster vs helper): task info, chat entry, bids, completion, payments.
// Bidding flow: OPEN → BidForm (helper) / BidList + accept (owner); after assignment, helper sees outcome banner; owner may still see BidList read-only.

import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  Stack,
  CircularProgress,
  Alert,
  Divider,
  ImageList,
  ImageListItem,
  Card,
  CardContent
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { taskAPI, bidAPI } from '@/services/api.service';
import { chatAPI } from '@/services/api.service';
import { Task, TaskStatus, Contract, Bid, BidStatus } from '@/types/task.types';
import { ChatThread } from '@/types/chat.types';
import { useAuth } from '@/contexts/AuthContext';
import { TaskDetailCard, TaskDetails, TaskDescription, TaskLocation, TaskPoster } from '../components/tasks/TaskDetailCard';
import BidForm from '../components/tasks/BidForm';
import BidList from '../components/tasks/BidList';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VerifiedIcon from '@mui/icons-material/Verified';
import TaskCompletionDialog from './TaskCompletionDialog';
import ChatWindow from '../components/chat/ChatWindow';
import PaymentStatus from '../components/payments/PaymentStatus';
import ReportForm from '../components/reports/ReportForm';
import { ReportType } from '@/types/report.types';
import FlagIcon from '@mui/icons-material/Flag';
import CancelIcon from '@mui/icons-material/Cancel';

const statusColors: Record<TaskStatus, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  [TaskStatus.OPEN]: 'primary',
  [TaskStatus.IN_BIDDING]: 'warning',
  [TaskStatus.ASSIGNED]: 'warning',
  [TaskStatus.IN_PROGRESS]: 'warning',
  [TaskStatus.AWAITING_CONFIRMATION]: 'warning',
  [TaskStatus.DISPUTED]: 'error',
  [TaskStatus.COMPLETED]: 'success',
  [TaskStatus.CANCELLED]: 'default',
};

const TaskDetail: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatThread, setChatThread] = useState<ChatThread | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const navigate = useNavigate();
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [contract, setContract] = useState<Contract | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [bidSectionKey, setBidSectionKey] = useState(0);
  const [myBidOnTask, setMyBidOnTask] = useState<Bid | null>(null);
  /** Shown to poster after accepting a bid (persists after task leaves OPEN). */
  const [posterBidAcceptNotice, setPosterBidAcceptNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchTask();
  }, [taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPosterBidAcceptNotice(null);
  }, [taskId]);

  useEffect(() => {
    if (task && user) {
      loadChatThread();
    }
  }, [task, user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!taskId || !user || !task || task.posterId === user.userId) {
      setMyBidOnTask(null);
      return;
    }
    if (task.status === TaskStatus.CANCELLED) {
      setMyBidOnTask(null);
      return;
    }
    let cancelled = false;
    bidAPI
      .getTaskBids(taskId)
      .then((res) => {
        if (cancelled) return;
        const mine = res.bids.find((b) => b.helperId === user.userId);
        setMyBidOnTask(mine ?? null);
      })
      .catch(() => {
        if (!cancelled) setMyBidOnTask(null);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId, user, task, bidSectionKey]);

  const fetchTask = async () => {
    if (!taskId) return;

    try {
      const response = await taskAPI.getTaskById(taskId);
      setTask(response.task);
      
      // Fetch contract if task has one
      if (response.task.status !== TaskStatus.OPEN && response.task.status !== TaskStatus.CANCELLED) {
        try {
          const contractResponse = await bidAPI.getTaskContract(taskId);
          setContract(contractResponse.contract);
        } catch {
          setContract(null);
        }
      }
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string } } };
      setError(apiError.response?.data?.error || 'Failed to fetch task');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTask = async () => {
    if (!taskId || !window.confirm('Are you sure you want to cancel this task?')) return;

    try {
      await taskAPI.cancelTask(taskId);
      fetchTask();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string } } };
      alert(apiError.response?.data?.error || 'Failed to cancel task');
    }
  };

  const handleDeleteTask = async () => {
    if (!taskId || !window.confirm('Are you sure you want to delete this task? This cannot be undone.')) return;

    try {
      await taskAPI.deleteTask(taskId);
      navigate('/my-tasks');
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string } } };
      alert(apiError.response?.data?.error || 'Failed to delete task');
    }
  };

  // Task execution handlers
  const handleStartTask = async () => {
    if (!taskId) return;

    try {
      await taskAPI.startTask(taskId);
      alert('Task started successfully!');
      fetchTask();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string } } };
      alert(apiError.response?.data?.error || 'Failed to start task');
    }
  };

  const handleCompleteTask = async (notes: string) => {
    if (!taskId) return;
    await taskAPI.completeTask(taskId, notes);
    fetchTask();
  };

  const handleConfirmCompletion = async (notes: string) => {
    if (!taskId) return;
    await taskAPI.confirmTaskCompletion(taskId, notes);
    fetchTask();
  };

  // Chat handlers
  const loadChatThread = async () => {
    if (!task || !user || !taskId) return;

    try {
      setChatLoading(true);
      // Try to find existing thread
      const threads = await chatAPI.getThreads();
      
      // Ensure threads is an array
      if (!Array.isArray(threads)) {
        console.warn('getThreads did not return an array:', threads);
        return;
      }
      
      const existingThread = threads.find(
        (t) => t.taskId === taskId && (t.posterId === user.userId || t.helperId === user.userId)
      );

      if (existingThread) {
        setChatThread(existingThread);
      }
    } catch (err: unknown) {
      console.error('Failed to load chat thread:', err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!task || !user || !taskId) return;

    try {
      setChatLoading(true);
      // Determine counterpart
      const isOwner = user.userId === task.posterId;
      let counterpartId: string | undefined;

      if (isOwner) {
        // For owner: use assigned helper, or get helper from first bid
        if (task.assignedHelperId) {
          counterpartId = task.assignedHelperId;
        } else {
          // Fetch bids to get helper ID
          try {
            const bidsResponse = await bidAPI.getTaskBids(taskId);
            if (bidsResponse.bids && bidsResponse.bids.length > 0) {
              // Use the first bid's helper
              counterpartId = bidsResponse.bids[0].helperId;
            }
          } catch (bidError) {
            console.error('Failed to fetch bids:', bidError);
          }
        }
      } else {
        // For helper: use poster ID
        counterpartId = task.posterId;
      }

      if (!counterpartId) {
        alert('Cannot start chat: No counterpart found. Make sure there is a bid on this task or a helper is assigned.');
        return;
      }

      const response = await chatAPI.getOrCreateThread({
        taskId,
        helperId: counterpartId,
      });
      setChatThread(response.thread);
      setShowChat(true);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string } } };
      alert(apiError.response?.data?.error || 'Failed to start chat');
    } finally {
      setChatLoading(false);
    }
  };

  const getCounterpartName = (): string => {
    if (!chatThread || !user) return '';
    const isOwner = user.userId === chatThread.posterId;
    const counterpart = isOwner ? chatThread.helper : chatThread.poster;
    return counterpart?.name || counterpart?.email || 'User';
  };
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !task) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Task not found'}</Alert>
        <Button 
          sx={{ mt: 2 }} 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/my-tasks')}
        >
          Back to My Tasks
        </Button>
      </Container>
    );
  }

  const isOwner = user?.userId === task?.posterId;


  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/my-tasks')}
        sx={{ mb: 2 }}
      >
        Back to My Tasks
      </Button>

      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 3, gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
              {task.title}
            </Typography>
            <Chip label={task.status} color={statusColors[task.status]} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {isOwner && task.status === TaskStatus.OPEN && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => navigate(`/tasks/${taskId}/edit`)}
                >
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteTask}
                >
                  Delete
                </Button>
              </>
            )}
            {!isOwner && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<FlagIcon />}
                onClick={() => setShowReportDialog(true)}
              >
                Report Task
              </Button>
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          {/* Main Content */}
          <Box sx={{ flex: { xs: '1', md: '2' } }}>
            <Stack spacing={3}>
              {/* Task Description */}
              <TaskDescription task={task} />

              {/* Task Details (no skill match for owner view) */}
              <TaskDetails task={task} showSkillMatch={false} />

              {/* Location Information */}
              <TaskLocation task={task} />

              {/* Task Photos */}
              {task.photos && task.photos.length > 0 && (
                <TaskDetailCard title={`Photos (${task.photos.length})`} icon={<EditIcon />}>
                  <ImageList cols={3} gap={8} sx={{ mt: 1 }}>
                    {task.photos.map((photo) => (
                      <ImageListItem key={photo.photoId}>
                        <img
                          src={photo.photoUrl}
                          alt="Task photo"
                          loading="lazy"
                          style={{ 
                            height: 200, 
                            objectFit: 'cover', 
                            borderRadius: 8,
                            cursor: 'pointer',
                            border: '1px solid #e0e0e0',
                          }}
                          onClick={() => window.open(photo.photoUrl, '_blank')}
                        />
                      </ImageListItem>
                    ))}
                  </ImageList>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Click on any photo to view full size
                  </Typography>
                </TaskDetailCard>
              )}
            </Stack>
          </Box>

          {/* Sidebar */}
          <Box sx={{ flex: { xs: '1', md: '1.5' }, minWidth: '400px' }}>
            <Stack spacing={3}>
              {isOwner && posterBidAcceptNotice && (
                <Alert
                  severity="success"
                  onClose={() => setPosterBidAcceptNotice(null)}
                >
                  {posterBidAcceptNotice}
                </Alert>
              )}

              {/* Poster Information */}
              <TaskPoster task={task} />


               {/* Task Status Info */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Task Status
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Chip label={task.status} color={statusColors[task.status]} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {task.status === 'OPEN' && 'This task is available for helpers to apply.'}
                    {task.status === 'ASSIGNED' &&
                      !isOwner &&
                      task.assignedHelperId === user?.userId &&
                      'You are assigned! Start working when ready.'}
                    {task.status === 'ASSIGNED' &&
                      !isOwner &&
                      task.assignedHelperId !== user?.userId &&
                      'Another helper was selected for this task.'}
                    {task.status === 'ASSIGNED' && isOwner && 'A helper has been assigned. Waiting for them to start.'}
                    {task.status === 'IN_PROGRESS' && !isOwner && 'Currently working on this task.'}
                    {task.status === 'IN_PROGRESS' && isOwner && 'Helper is working on your task.'}
                    {task.status === 'AWAITING_CONFIRMATION' && !isOwner && 'Waiting for poster to confirm completion.'}
                    {task.status === 'AWAITING_CONFIRMATION' && isOwner && 'Please confirm task completion.'}
                    {task.status === 'COMPLETED' && 'This task has been completed.'}
                    {task.status === 'CANCELLED' && 'This task has been cancelled.'}
                  </Typography>

                  {!isOwner && task.assignedHelperId === user?.userId && (
                    <Stack spacing={2}>
                      {task.status === 'ASSIGNED' && (
                        <Button
                          variant="contained"
                          color="success"
                          fullWidth
                          startIcon={<PlayArrowIcon />}
                          onClick={handleStartTask}
                        >
                          Start Task
                        </Button>
                      )}
                      
                      {task.status === 'IN_PROGRESS' && (
                        <Button
                          variant="contained"
                          color="primary"
                          fullWidth
                          startIcon={<CheckCircleIcon />}
                          onClick={() => setShowCompleteDialog(true)}
                        >
                          Mark as Complete
                        </Button>
                      )}
                    </Stack>
                  )}

                  {isOwner && (
                    <Stack spacing={2}>
                      {task.status === 'AWAITING_CONFIRMATION' && (
                        <Button
                          variant="contained"
                          color="success"
                          fullWidth
                          startIcon={<VerifiedIcon />}
                          onClick={() => setShowConfirmDialog(true)}
                        >
                          Confirm Completion
                        </Button>
                      )}
                    </Stack>
                  )}
                </CardContent>
              </Card>

              {/* Payment Status - Show when contract exists */}
              {contract && (contract.paymentStatus || contract.paymentIntentId) && (
                <Card>
                  <CardContent>
                    <PaymentStatus
                      contract={contract}
                      onRefresh={() => {
                        fetchTask();
                      }}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Chat Section */}
              {user && task && chatThread && (
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">Chat</Typography>
                      {chatThread.unreadCount && chatThread.unreadCount > 0 && (
                        <Chip
                          label={`${chatThread.unreadCount} unread`}
                          color="primary"
                          size="small"
                        />
                      )}
                    </Box>
                    {showChat ? (
                      <ChatWindow
                        threadId={chatThread.threadId}
                        taskTitle={task.title}
                        counterpartName={getCounterpartName()}
                        onClose={() => setShowChat(false)}
                      />
                    ) : (
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={() => setShowChat(true)}
                      >
                        Open Chat
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Start Chat Button - Show if thread doesn't exist but user can chat */}
              {user && task && !chatThread && !chatLoading && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Chat
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {isOwner
                        ? 'Start chatting with helpers who placed bids'
                        : 'Start chatting with the task poster'}
                    </Typography>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={handleStartChat}
                      disabled={chatLoading}
                    >
                      Start Chat
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Helper: bid outcome after poster chose someone (task no longer OPEN) */}
              {user && task && !isOwner && task.status !== TaskStatus.OPEN && myBidOnTask && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Your bid
                    </Typography>
                    {myBidOnTask.status === BidStatus.REJECTED && (
                      <Box sx={{ mt: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                          <Chip
                            icon={<CancelIcon />}
                            label="Not selected"
                            color="warning"
                            size="small"
                          />
                        </Box>
                        <Alert severity="warning">
                          The poster accepted another helper&apos;s bid for this task. Your bid was not selected.
                        </Alert>
                      </Box>
                    )}
                    {myBidOnTask.status === BidStatus.ACCEPTED && (
                      <Alert severity="success" sx={{ mt: 1 }}>
                        Your bid was accepted — you&apos;re assigned to this task.
                      </Alert>
                    )}
                    {myBidOnTask.status === BidStatus.PENDING && (
                      <Alert severity="info" sx={{ mt: 1 }}>
                        This task is no longer open for bidding; your bid may still show as pending — refresh if
                        needed.
                      </Alert>
                    )}
                    {myBidOnTask.status === BidStatus.WITHDRAWN && (
                      <Alert severity="info" sx={{ mt: 1 }}>
                        You withdrew your bid on this task.
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Bidding while task is OPEN: bidSectionKey increments after place/accept so BidList refetches without losing context */}
              {user && task && task.status === TaskStatus.OPEN && (
                <>
                  {!isOwner && (
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Place a Bid
                        </Typography>
                        {myBidOnTask &&
                        (myBidOnTask.status === BidStatus.PENDING ||
                          myBidOnTask.status === BidStatus.ACCEPTED) ? (
                          <Alert severity="info" sx={{ mt: 1 }}>
                            You have already placed a bid on this task.
                            {myBidOnTask.status === BidStatus.PENDING &&
                              ' Waiting for the poster to respond.'}
                          </Alert>
                        ) : (
                          <BidForm
                            task={task}
                            onBidPlaced={() => {
                              fetchTask();
                              setBidSectionKey((k) => k + 1);
                            }}
                          />
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {isOwner && (
                    <BidList
                      taskId={task.taskId}
                      refreshTrigger={bidSectionKey}
                      onBidAccepted={() => {
                        setPosterBidAcceptNotice(
                          'Bid accepted. Other bidders were not selected.'
                        );
                        setBidSectionKey((k) => k + 1);
                        fetchTask();
                      }}
                    />
                  )}
                </>
              )}

              {/* Owner: keep bids visible after assignment (read-only; accept only when OPEN above) */}
              {user &&
                task &&
                isOwner &&
                task.status !== TaskStatus.OPEN &&
                [
                  TaskStatus.ASSIGNED,
                  TaskStatus.IN_PROGRESS,
                  TaskStatus.AWAITING_CONFIRMATION,
                ].includes(task.status) && (
                  <BidList taskId={task.taskId} refreshTrigger={bidSectionKey} />
                )}


            </Stack>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button 
            variant="outlined" 
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/my-tasks')}
          >
            Back to My Tasks
          </Button>
          {isOwner && task.status === TaskStatus.OPEN && (
            <Button
              variant="outlined"
              color="error"
              onClick={handleCancelTask}
            >
              Cancel Task
            </Button>
          )}
        </Box>
      </Paper>

      <TaskCompletionDialog
        open={showCompleteDialog}
        onClose={() => setShowCompleteDialog(false)}
        onConfirm={handleCompleteTask}
        title="Mark Task as Complete"
        description="You're about to mark this task as complete. The poster will be notified to review and confirm your work."
        type="complete"
      />

      <TaskCompletionDialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmCompletion}
        title="Confirm Task Completion"
        description="Confirm that the task has been completed satisfactorily. Payment will be released to the helper."
        type="confirm"
      />

      {/* Report Dialog */}
      {taskId && (
        <ReportForm
          open={showReportDialog}
          onClose={() => setShowReportDialog(false)}
          onSuccess={() => {
            setShowReportDialog(false);
          }}
          type={ReportType.TASK}
          targetId={taskId}
          targetTitle={task.title}
        />
      )}
    </Container>
  );
};

export default TaskDetail;