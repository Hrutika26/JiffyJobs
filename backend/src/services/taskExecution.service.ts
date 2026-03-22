// src/services/taskExecution.service.ts

import { PrismaClient, TaskStatus, TimelineEventType, NotificationType } from '@prisma/client';
import { createNotification } from './notification.service';

const prisma = new PrismaClient();

// Valid status transitions
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  OPEN: ['IN_BIDDING', 'CANCELLED'],
  IN_BIDDING: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['AWAITING_CONFIRMATION'],
  AWAITING_CONFIRMATION: ['COMPLETED', 'DISPUTED'],
  DISPUTED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

/**
 * Helper: Log timeline event
 */
async function logTimelineEvent(
  taskId: string,
  eventType: TimelineEventType,
  userId: string | null,
  oldStatus: TaskStatus | null,
  newStatus: TaskStatus | null,
  notes?: string
) {
  await prisma.taskTimeline.create({
    data: {
      taskId,
      eventType,
      userId: userId || undefined,
      oldStatus: oldStatus || undefined,
      newStatus: newStatus || undefined,
      notes,
    },
  });
}

/**
 * Helper: Validate status transition
 */
function validateTransition(currentStatus: TaskStatus, newStatus: TaskStatus): boolean {
  const validNextStates = VALID_TRANSITIONS[currentStatus];
  return validNextStates.includes(newStatus);
}

/**
 * Start work on task (ASSIGNED → IN_PROGRESS)
 * Only helper can call this
 */
export async function startTask(taskId: string, helperId: string) {
  const task = await prisma.task.findUnique({
    where: { taskId },
    include: { contract: true },
  });

  if (!task) {
    throw new Error('Task not found');
  }

  // Validate helper is assigned
  if (task.assignedHelperId !== helperId) {
    throw new Error('You are not assigned to this task');
  }

  // Validate current status
  if (task.status !== TaskStatus.ASSIGNED) {
    throw new Error(`Cannot start task from ${task.status} status`);
  }

  // Validate transition
  if (!validateTransition(task.status, TaskStatus.IN_PROGRESS)) {
    throw new Error('Invalid status transition');
  }

  // Update task status
  const updatedTask = await prisma.task.update({
    where: { taskId },
    data: {
      status: TaskStatus.IN_PROGRESS,
      updatedAt: new Date(),
    },
    include: {
      poster: true,
      assignedHelper: true,
      location: true,
    },
  });

  // Log timeline event
  await logTimelineEvent(
    taskId,
    TimelineEventType.WORK_STARTED,
    helperId,
    TaskStatus.ASSIGNED,
    TaskStatus.IN_PROGRESS,
    'Helper started working on the task'
  );

  return updatedTask;
}

/**
 * Mark task as complete (IN_PROGRESS → AWAITING_CONFIRMATION)
 * Only helper can call this
 */
export async function completeTask(taskId: string, helperId: string, notes?: string) {
  const task = await prisma.task.findUnique({
    where: { taskId },
  });

  if (!task) {
    throw new Error('Task not found');
  }

  // Validate helper is assigned
  if (task.assignedHelperId !== helperId) {
    throw new Error('You are not assigned to this task');
  }

  // Validate current status
  if (task.status !== TaskStatus.IN_PROGRESS) {
    throw new Error(`Cannot complete task from ${task.status} status`);
  }

  // Update task status
  const updatedTask = await prisma.task.update({
    where: { taskId },
    data: {
      status: TaskStatus.AWAITING_CONFIRMATION,
      updatedAt: new Date(),
    },
    include: {
      poster: true,
      assignedHelper: true,
      location: true,
    },
  });

  // Log timeline event
  await logTimelineEvent(
    taskId,
    TimelineEventType.WORK_COMPLETED,
    helperId,
    TaskStatus.IN_PROGRESS,
    TaskStatus.AWAITING_CONFIRMATION,
    notes || 'Task marked as complete by helper'
  );

  return updatedTask;
}

/**
 * Confirm task completion (AWAITING_CONFIRMATION → COMPLETED)
 * Only poster can call this
 */
export async function confirmCompletion(taskId: string, posterId: string, notes?: string) {
  const task = await prisma.task.findUnique({
    where: { taskId },
  });

  if (!task) {
    throw new Error('Task not found');
  }

  // Validate poster owns this task
  if (task.posterId !== posterId) {
    throw new Error('You are not the poster of this task');
  }

  // Validate current status
  if (task.status !== TaskStatus.AWAITING_CONFIRMATION) {
    throw new Error(`Cannot confirm task from ${task.status} status`);
  }

  // Update task status
  const updatedTask = await prisma.task.update({
    where: { taskId },
    data: {
      status: TaskStatus.COMPLETED,
      updatedAt: new Date(),
    },
    include: {
      poster: true,
      assignedHelper: true,
      location: true,
    },
  });

  // Log timeline event
  await logTimelineEvent(
    taskId,
    TimelineEventType.COMPLETION_CONFIRMED,
    posterId,
    TaskStatus.AWAITING_CONFIRMATION,
    TaskStatus.COMPLETED,
    notes || 'Task completion confirmed by poster'
  );

  // Trigger review prompts for both parties
  await triggerReviewPrompts(taskId);

  // TODO: Trigger payment release here (when payments epic is done)

  return updatedTask;
}

/**
 * Auto-confirm task if poster doesn't respond
 * Called by background job
 */
export async function autoConfirmTask(taskId: string, hoursThreshold: number = 24) {
  const task = await prisma.task.findUnique({
    where: { taskId },
  });

  if (!task) {
    throw new Error('Task not found');
  }

  // Validate current status
  if (task.status !== TaskStatus.AWAITING_CONFIRMATION) {
    throw new Error('Task is not awaiting confirmation');
  }

  // Check if enough time has passed
  const now = new Date();
  const updatedAt = new Date(task.updatedAt);
  const hoursPassed = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);

  if (hoursPassed < hoursThreshold) {
    throw new Error(`Only ${hoursPassed.toFixed(1)} hours passed. Need ${hoursThreshold} hours.`);
  }

  // Update task status
  const updatedTask = await prisma.task.update({
    where: { taskId },
    data: {
      status: TaskStatus.COMPLETED,
      updatedAt: new Date(),
    },
    include: {
      poster: true,
      assignedHelper: true,
      location: true,
    },
  });

  // Log timeline event
  await logTimelineEvent(
    taskId,
    TimelineEventType.AUTO_CONFIRMED,
    null,
    TaskStatus.AWAITING_CONFIRMATION,
    TaskStatus.COMPLETED,
    `Task auto-confirmed after ${hoursThreshold} hours of inactivity`
  );

  // Trigger review prompts for both parties
  await triggerReviewPrompts(taskId);

  // TODO: Trigger payment release here

  return updatedTask;
}

/**
 * Cancel task before work starts
 * Poster can cancel if status is OPEN, IN_BIDDING, or ASSIGNED
 */
export async function cancelTask(
  taskId: string,
  userId: string,
  reason: string,
  isHelper: boolean = false
) {
  const task = await prisma.task.findUnique({
    where: { taskId },
  });

  if (!task) {
    throw new Error('Task not found');
  }

  // Validate permissions
  if (!isHelper && task.posterId !== userId) {
    throw new Error('You are not the poster of this task');
  }

  if (isHelper && task.assignedHelperId !== userId) {
    throw new Error('You are not assigned to this task');
  }

  // Cannot cancel if already in progress
  if (task.status === TaskStatus.IN_PROGRESS) {
    throw new Error('Cannot cancel task once work has started. Please contact support.');
  }

  // Cannot cancel if already completed
  if (task.status === TaskStatus.COMPLETED) {
    throw new Error('Cannot cancel completed task');
  }

  // Update task status
  const updatedTask = await prisma.task.update({
    where: { taskId },
    data: {
      status: TaskStatus.CANCELLED,
      updatedAt: new Date(),
    },
    include: {
      poster: true,
      assignedHelper: true,
      location: true,
    },
  });

  // Log timeline event
  await logTimelineEvent(
    taskId,
    TimelineEventType.TASK_CANCELLED,
    userId,
    task.status,
    TaskStatus.CANCELLED,
    reason
  );

  return updatedTask;
}

/**
 * Get task timeline/history
 */
export async function getTaskTimeline(taskId: string) {
  const timeline = await prisma.taskTimeline.findMany({
    where: { taskId },
    include: {
      user: {
        select: {
          userId: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return timeline;
}

/**
 * Get tasks that need auto-confirmation
 * Called by background job
 */
export async function getTasksNeedingAutoConfirm(hoursThreshold: number = 24) {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - hoursThreshold);

  const tasks = await prisma.task.findMany({
    where: {
      status: TaskStatus.AWAITING_CONFIRMATION,
      updatedAt: {
        lte: cutoffTime,
      },
    },
    include: {
      poster: true,
      assignedHelper: true,
    },
  });

  return tasks;
}

/**
 * Trigger review prompts for both parties when a task is completed
 */
export async function triggerReviewPrompts(taskId: string) {
  try {
    const task = await prisma.task.findUnique({
      where: { taskId },
      include: {
        contract: {
          select: {
            contractId: true,
            posterId: true,
            helperId: true,
          },
        },
        poster: {
          select: {
            userId: true,
            name: true,
            email: true,
          },
        },
        assignedHelper: {
          select: {
            userId: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!task || !task.contract) {
      console.warn(`Cannot trigger review prompts: Task ${taskId} not found or has no contract`);
      return;
    }

    if (!task.assignedHelperId) {
      console.warn(`Cannot trigger review prompts: Task ${taskId} has no assigned helper`);
      return;
    }

    const { contract, poster, assignedHelper } = task;

    if (!assignedHelper) {
      console.warn(`Cannot trigger review prompts: Task ${taskId} has no assigned helper data`);
      return;
    }

    // Send review prompt to poster (to review helper)
    const helperLabel = assignedHelper.name || assignedHelper.email || 'your helper';
    await createNotification({
      userId: contract.posterId,
      type: NotificationType.REVIEW_REQUESTED,
      title: `You completed a task with ${helperLabel}. Leave a review.`,
      message: `Rate ${helperLabel} and share quick feedback — it helps the community.`,
      relatedTaskId: taskId,
      metadata: {
        contractId: contract.contractId,
        revieweeId: contract.helperId,
        revieweeName: assignedHelper.name || assignedHelper.email || 'Helper',
        taskTitle: task.title,
      },
      sendEmail: true,
    });

    // Send review prompt to helper (to review poster)
    const posterLabel = poster.name || poster.email || 'the poster';
    await createNotification({
      userId: contract.helperId,
      type: NotificationType.REVIEW_REQUESTED,
      title: `You completed a task with ${posterLabel}. Leave a review.`,
      message: `Rate ${posterLabel} and share quick feedback — it helps the community.`,
      relatedTaskId: taskId,
      metadata: {
        contractId: contract.contractId,
        revieweeId: contract.posterId,
        revieweeName: poster.name || poster.email || 'Poster',
        taskTitle: task.title,
      },
      sendEmail: true,
    });
  } catch (error) {
    console.error(`Error triggering review prompts for task ${taskId}:`, error);
    // Don't throw - review prompts are not critical for task completion
  }
}