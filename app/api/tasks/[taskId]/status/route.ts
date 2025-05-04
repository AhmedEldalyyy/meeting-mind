import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// POST: Handle proof uploads for a task (already exists)

// PATCH: Update task approval status (Approve/Reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const taskId = params.taskId;
    const body = await request.json();
    const { status: action, comments } = body; // action should be 'APPROVE' or 'REJECT' conceptually

    // Determine target status based on action
    let newStatus = '';
    if (action === 'APPROVE') {
      newStatus = 'COMPLETED';
    } else if (action === 'REJECT') {
      newStatus = 'NEEDS_REWORK'; // Reject sets status to NEEDS_REWORK
    } else {
      return NextResponse.json({ error: 'Invalid action provided. Expected APPROVE or REJECT.' }, { status: 400 });
    }

    // Validate comments if rejecting (setting to NEEDS_REWORK)
    if (newStatus === 'NEEDS_REWORK' && (!comments || comments.trim() === '')) {
      return NextResponse.json({ error: 'Comments are required when rejecting a task' }, { status: 400 });
    }

    // --- Verify Task, Current Status, and Leader Permissions --- 
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { 
        id: true, 
        assigneeId: true, 
        task: true, // For notification message
        status: true, // Get current status
        meeting: { 
          select: { 
            id: true, 
            team: { 
              select: { leaderId: true } 
            } 
          } 
        }
      }
    });

    if (!task?.meeting?.team?.leaderId) {
      return NextResponse.json({ error: 'Task or associated team not found' }, { status: 404 });
    }
    if (task.meeting.team.leaderId !== user.id) {
      return NextResponse.json({ error: 'Only the team leader can approve or reject tasks' }, { status: 403 });
    }
    if (!task.assigneeId) {
      return NextResponse.json({ error: 'Cannot approve/reject an unassigned task' }, { status: 400 });
    }
    // Check if the task is actually pending approval
    if (task.status !== 'PENDING_APPROVAL') {
      return NextResponse.json({ error: `Task is not pending approval (current status: ${task.status})` }, { status: 400 });
    }

    // --- Update Task Status --- 
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: newStatus, // Set to COMPLETED or NEEDS_REWORK
        comments: newStatus === 'NEEDS_REWORK' ? comments : null, // Add comments only on rejection (NEEDS_REWORK)
      },
      include: { 
        assignee: { select: { id: true } } // Include assignee for notification
      }
    });

    // --- Create Notification for Assignee --- 
    try {
      const notificationMessage = newStatus === 'COMPLETED'
        ? `Your proof for task "${task.task.substring(0, 50)}..." has been approved.`
        : `Your task "${task.task.substring(0, 50)}..." needs rework. Comments: ${comments}`;
        
      await prisma.notification.create({
        data: {
          userId: task.assigneeId, // Notify the original assignee
          message: notificationMessage,
          taskId: task.id,
          meetingId: task.meeting.id
        }
      });
      console.log(`Approval/Rejection notification created for user ${task.assigneeId} for task ${task.id}`);
    } catch (notificationError) {
      console.error(`Failed to create approval/rejection notification for user ${task.assigneeId}:`, notificationError);
    }

    return NextResponse.json(updatedTask);

  } catch (error) {
    console.error('Error updating task approval status:', error);
    return NextResponse.json(
      { error: 'Failed to update task status' },
      { status: 500 }
    );
  }
} 