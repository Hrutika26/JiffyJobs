// TaskDetailCard.tsx — Presentational cards for task browse/detail: reusable TaskDetailCard shell + TaskDetails/TaskDescription/TaskLocation/TaskPoster sections.

import React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { Task, TaskWithDistance } from '@/types/task.types';
import {
  Description,
  Category,
  AttachMoney,
  CalendarToday,
  AccessTime,
  LocationOn,
  Person,
  CheckCircle
} from '@mui/icons-material';

interface TaskDetailCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

export const TaskDetailCard: React.FC<TaskDetailCardProps> = ({ title, icon, children }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon}
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
};

interface TaskDetailsProps {
  task: Task;
  showSkillMatch?: boolean;
}

export const TaskDetails: React.FC<TaskDetailsProps> = ({ task, showSkillMatch = false }) => {
  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'HOME_REPAIR': '#f44336',
      'CLEANING': '#2196f3',
      'MOVING': '#ff9800',
      'DELIVERY': '#4caf50',
      'ASSEMBLY': '#9c27b0',
      'YARD_WORK': '#8bc34a',
      'PET_CARE': '#ffeb3b',
      'TECH_SUPPORT': '#00bcd4',
      'TUTORING': '#e91e63',
      'OTHER': '#607d8b',
    };
    return colors[category] || '#607d8b';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date set';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <TaskDetailCard title="Task Details" icon={<Category />}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Category color="primary" />
              <Typography variant="body2" color="text.secondary">
                Category:
              </Typography>
            </Box>
            <Chip
              label={task.category.replace('_', ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
              sx={{
                backgroundColor: getCategoryColor(task.category),
                color: 'white',
                fontWeight: 'bold'
              }}
            />
          </Box>
          <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AttachMoney color="primary" />
              <Typography variant="body2" color="text.secondary">
                Budget:
              </Typography>
            </Box>
            <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
              {formatCurrency(task.budget)}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CalendarToday color="primary" />
              <Typography variant="body2" color="text.secondary">
                Task Date:
              </Typography>
            </Box>
            <Typography variant="body1">
              {formatDate(task.taskDate)}
            </Typography>
          </Box>
          <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AccessTime color="primary" />
              <Typography variant="body2" color="text.secondary">
                Estimated Hours:
              </Typography>
            </Box>
            <Typography variant="body1">
              {task.estimatedHours ? `${task.estimatedHours} hours` : 'Not specified'}
            </Typography>
          </Box>
        </Box>
        {showSkillMatch && 'skillMatch' in task && (task as TaskWithDistance).skillMatch?.isGoodMatch && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CheckCircle color="success" />
              <Typography variant="body2" color="text.secondary">
                Skill Match:
              </Typography>
            </Box>
            <Chip
              label="Good Match"
              size="small"
              color="success"
              variant="filled"
              sx={{
                fontSize: '0.7rem',
                height: '24px',
                backgroundColor: '#4caf50',
                color: 'white',
                fontWeight: 'bold'
              }}
            />
          </Box>
        )}
      </Box>
    </TaskDetailCard>
  );
};

interface TaskDescriptionProps {
  task: Task;
}

export const TaskDescription: React.FC<TaskDescriptionProps> = ({ task }) => {
  return (
    <TaskDetailCard title="Description" icon={<Description />}>
      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
        {task.description}
      </Typography>
    </TaskDetailCard>
  );
};

interface TaskLocationProps {
  task: Task;
}

export const TaskLocation: React.FC<TaskLocationProps> = ({ task }) => {
  if (!task.location) return null;

  return (
    <TaskDetailCard title="Location" icon={<LocationOn />}>
      <Typography variant="body1" sx={{ mb: 1 }}>
        {task.location.address}
      </Typography>
      {task.location.city && task.location.state && (
        <Typography variant="body2" color="text.secondary">
          {task.location.city}, {task.location.state} {task.location.zipCode}
        </Typography>
      )}
    </TaskDetailCard>
  );
};

interface TaskPosterProps {
  task: Task;
}

export const TaskPoster: React.FC<TaskPosterProps> = ({ task }) => {
  return (
    <TaskDetailCard title="Posted By" icon={<Person />}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box
          sx={{
            width: 50,
            height: 50,
            borderRadius: '50%',
            backgroundColor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1.2rem'
          }}
        >
          {task.poster?.name?.charAt(0) || 'U'}
        </Box>
        <Box>
          <Typography variant="h6">
            {task.poster?.name || 'Unknown User'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {task.poster?.email}
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary">
        Posted on {new Date(task.createdAt).toLocaleDateString()}
      </Typography>
    </TaskDetailCard>
  );
};
