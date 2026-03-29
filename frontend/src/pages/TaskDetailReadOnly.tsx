// TaskDetailReadOnly.tsx — Public (or low-friction) task view by id from the URL; uses taskAPI.getTaskByIdPublic.
// Lets someone open a shared link before signing in; discovery flows link here.

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ArrowBack,
  Phone,
  Email,
  Star,
  CheckCircle,
  Warning,
  AccessTime
} from '@mui/icons-material';
import { taskAPI } from '../services/api.service';
import { Task } from '../types/task.types';
import { TaskDetailCard, TaskDetails, TaskDescription, TaskLocation, TaskPoster } from '../components/tasks/TaskDetailCard';

const TaskDetailReadOnly: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (taskId) {
      fetchTask();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const fetchTask = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await taskAPI.getTaskByIdPublic(taskId!);
      setTask(response.task);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string } } };
      setError(apiError.response?.data?.error || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return '#4caf50';
      case 'IN_PROGRESS':
        return '#ff9800';
      case 'COMPLETED':
        return '#2196f3';
      case 'CANCELLED':
        return '#f44336';
      default:
        return '#607d8b';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <CheckCircle />;
      case 'IN_PROGRESS':
        return <AccessTime />;
      case 'COMPLETED':
        return <Star />;
      case 'CANCELLED':
        return <Warning />;
      default:
        return <CheckCircle />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => navigate('/discover')}>
          Back to Discover Tasks
        </Button>
      </Box>
    );
  }

  if (!task) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Task not found
        </Alert>
        <Button variant="outlined" onClick={() => navigate('/discover')}>
          Back to Discover Tasks
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Tooltip title="Back to Discover Tasks">
          <IconButton onClick={() => navigate('/discover')} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
        </Tooltip>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          {task.title}
        </Typography>
        <Chip
          icon={getStatusIcon(task.status)}
          label={task.status.replace('_', ' ')}
          sx={{
            backgroundColor: getStatusColor(task.status),
            color: 'white',
            fontWeight: 'bold'
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        {/* Main Content */}
        <Box sx={{ flex: { xs: '1', md: '2' } }}>
          <Stack spacing={3}>
            {/* Task Description */}
            <TaskDescription task={task} />

            {/* Task Details with Skill Match */}
            <TaskDetails task={task} showSkillMatch={true} />

            {/* Location Information */}
            <TaskLocation task={task} />

            {/* Task Photos */}
            {task.photos && task.photos.length > 0 && (
              <TaskDetailCard title="Task Photos" icon={<Star />}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {task.photos.map((photo, index) => (
                    <Box key={index} sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                      <Paper
                        component="img"
                        src={photo.photoUrl}
                        alt={`Task photo ${index + 1}`}
                        sx={{
                          width: '100%',
                          height: '200px',
                          objectFit: 'cover',
                          borderRadius: 1,
                          cursor: 'pointer'
                        }}
                        onClick={() => window.open(photo.photoUrl, '_blank')}
                      />
                    </Box>
                  ))}
                </Box>
              </TaskDetailCard>
            )}
          </Stack>
        </Box>

        {/* Sidebar */}
        <Box sx={{ flex: { xs: '1', md: '1' }, minWidth: '300px' }}>
          <Stack spacing={3}>
            {/* Poster Information */}
            <TaskPoster task={task} />

            {/* Action Buttons */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Interested in this task?
                </Typography>
                <Stack spacing={2}>
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    startIcon={<CheckCircle />}
                    sx={{ py: 1.5 }}
                  >
                    Apply for Task
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    fullWidth
                    startIcon={<Phone />}
                    sx={{ py: 1.5 }}
                  >
                    Contact Poster
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    fullWidth
                    startIcon={<Email />}
                    sx={{ py: 1.5 }}
                  >
                    Send Message
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {/* Task Status Info */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Task Status
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {getStatusIcon(task.status)}
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    {task.status.replace('_', ' ')}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {task.status === 'OPEN' && 'This task is available for helpers to apply.'}
                  {task.status === 'IN_PROGRESS' && 'This task is currently being worked on.'}
                  {task.status === 'COMPLETED' && 'This task has been completed.'}
                  {task.status === 'CANCELLED' && 'This task has been cancelled.'}
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export default TaskDetailReadOnly;
