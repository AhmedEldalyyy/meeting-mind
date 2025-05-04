import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET: Fetch a single task (Optional - if needed for edit prefill later)
export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  // ... (Implementation if needed) ...
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}

// PATCH: Assign a task to a user
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
    const { assigneeId, dueDate } = body; // Expecting assigneeId and optionally dueDate

    if (assigneeId === null || assigneeId === 'unassigned') {
        // Verify user is leader (same logic as before)
        const taskToUnassign = await prisma.task.findUnique({
            where: { id: taskId },
            select: { meeting: { select: { team: { select: { leaderId: true } } } } } 
        });
        if (!taskToUnassign?.meeting?.team?.leaderId) {
            return NextResponse.json({ error: 'Task or associated team not found' }, { status: 404 });
        }
        if (taskToUnassign.meeting.team.leaderId !== user.id) {
             return NextResponse.json({ error: 'Only the team leader can modify tasks' }, { status: 403 });
        }
        
        // Prepare update data for unassignment
        const updateData: { assigneeId: null; dueDate?: Date } = { assigneeId: null };
        if (dueDate !== undefined) { // Allow updating due date even when unassigning
          try {
            updateData.dueDate = new Date(dueDate);
          } catch (e) {
            return NextResponse.json({ error: 'Invalid date format for dueDate' }, { status: 400 });
          }
        }
        
        // Perform the update (unassign + potentially due date)
        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: updateData,
            include: { assignee: { select: { id: true, name: true } } }
        });
        return NextResponse.json(updatedTask);
    } else {
        // Find the task and verify leader permissions
        const taskToUpdate = await prisma.task.findUnique({
            where: { id: taskId },
            select: { 
                id: true, 
                meeting: { 
                    select: { 
                        team: { 
                            select: { 
                                leaderId: true,
                                members: { // Check if the assigneeId is actually a member of this team (only if assigning)
                                    where: assigneeId ? { id: assigneeId } : undefined,
                                    select: { id: true }
                                }
                            } 
                        } 
                    } 
                } 
            } 
        });

        if (!taskToUpdate?.meeting?.team?.leaderId) {
            return NextResponse.json({ error: 'Task or associated team not found' }, { status: 404 });
        }
        // Authorization: Check if current user is the leader
        if (taskToUpdate.meeting.team.leaderId !== user.id) {
            return NextResponse.json({ error: 'Only the team leader can modify tasks' }, { status: 403 });
        }
        
        // Prepare update data
        const updateData: { assigneeId?: string; dueDate?: Date } = {};
        
        // Validate and add assigneeId if provided
        if (assigneeId !== undefined) {
            if (taskToUpdate.meeting.team.members.length === 0) {
                 return NextResponse.json({ error: 'Assignee is not a member of this team' }, { status: 400 });
            }
            updateData.assigneeId = assigneeId;
        }
        
        // Validate and add dueDate if provided
        if (dueDate !== undefined) {
          try {
            updateData.dueDate = new Date(dueDate);
          } catch (e) {
            return NextResponse.json({ error: 'Invalid date format for dueDate' }, { status: 400 });
          }
        }

        // Check if there's anything to update
        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ message: 'No changes provided' }, { status: 400 });
        }

        // Perform the update
        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: updateData,
            include: { // Return the updated task with assignee details
                assignee: {
                    select: { id: true, name: true }
                },
                meeting: { // Include meeting ID for notification context
                    select: { id: true }
                }
            }
        });

        // --- Create Notification --- 
        // Only create a notification if a specific user was assigned (not unassigned)
        if (updatedTask.assigneeId) {
          try {
            await prisma.notification.create({
              data: {
                userId: updatedTask.assigneeId, // Notify the assigned user
                message: `You have been assigned a new task: "${updatedTask.task.substring(0, 50)}${updatedTask.task.length > 50 ? '...' : ''}"`, // Create a message
                taskId: updatedTask.id, // Link to the task
                meetingId: updatedTask.meeting.id // Link to the meeting
              }
            });
            console.log(`Notification created for user ${updatedTask.assigneeId} for task ${updatedTask.id}`);
          } catch (notificationError) {
            // Log the error but don't fail the whole request if notification creation fails
            console.error(`Failed to create notification for user ${updatedTask.assigneeId}:`, notificationError);
          }
        }

        return NextResponse.json(updatedTask);
    }

  } catch (error) {
    console.error('Error assigning task:', error);
    // Check for specific Prisma errors if needed
    return NextResponse.json(
      { error: 'Failed to assign task' },
      { status: 500 }
    );
  }
}

// PUT: Update task details (e.g., description)
export async function PUT(
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
    const { task: newTaskDescription, dueDate, assigneeId, status } = body; // Add status here

    if (!newTaskDescription && !dueDate && !assigneeId && !status) { // Add status check here
        return NextResponse.json({ error: 'No update data provided' }, { status: 400 });
    }

    // --- Verify Task and Leader Permissions --- 
    const taskToUpdate = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        meeting: {
          select: {
            team: {
              select: { 
                  leaderId: true,
                  members: { // Check if the assigneeId is valid for this team
                    where: assigneeId ? { id: assigneeId } : undefined,
                    select: { id: true }
                  }
              }
            }
          }
        }
      }
    });

    if (!taskToUpdate?.meeting?.team?.leaderId) {
        return NextResponse.json({ error: 'Task not found or not associated with a team led by you' }, { status: 404 });
    }

    // Authorization: Check if current user is the leader
    if (taskToUpdate.meeting.team.leaderId !== user.id) {
      return NextResponse.json({ error: 'Only the team leader can modify tasks' }, { status: 403 });
    }

    // --- Prepare Update Data --- 
    const updateData: { task?: string; dueDate?: Date; assigneeId?: string | null, status?: string } = {}; // Add status type here

    if (newTaskDescription !== undefined) {
      if (typeof newTaskDescription !== 'string' || newTaskDescription.trim() === '') {
        return NextResponse.json({ error: 'Task description cannot be empty' }, { status: 400 });
      }
      updateData.task = newTaskDescription.trim();
    }

    if (dueDate !== undefined) {
      try {
        // Allow null to clear the date
        updateData.dueDate = dueDate === null ? null : new Date(dueDate);
      } catch (e) {
        return NextResponse.json({ error: 'Invalid date format for dueDate' }, { status: 400 });
      }
    }
    
    if (assigneeId !== undefined) {
        if (assigneeId === null || assigneeId === 'unassigned') {
            updateData.assigneeId = null; // Handle unassignment
        } else {
            // Verify the provided assigneeId is actually a member of the team
            if (taskToUpdate.meeting.team.members.length === 0) {
                 return NextResponse.json({ error: 'Assignee is not a member of this team' }, { status: 400 });
            }
            updateData.assigneeId = assigneeId;
        }
    }
    
    // Add status handling
    if (status !== undefined) {
        // --- Status Update Validation --- 
        // Allow leader to set only OPEN status via general edit (e.g., revert from COMPLETED)
        const allowedStatusesForEdit = ['OPEN'];
        if (!allowedStatusesForEdit.includes(status)) {
            return NextResponse.json({ 
                error: `Status can only be set to 'OPEN' via general edit.` 
            }, { status: 400 });
        }
        // Add further validation if needed (e.g., based on current status)

        updateData.status = status;
    }

    // --- Perform Update --- 
    const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: updateData,
        include: { 
            assignee: { select: { id: true, name: true } },
            meeting: { select: { id: true } } // for notification context
        }
    });

    // --- Handle Notification for Reassignment --- 
    // Notify only if the assignee changed and is not null
    if (assigneeId !== undefined && updatedTask.assigneeId && updatedTask.assigneeId !== taskToUpdate.assigneeId) { // Check if assignee *changed* to a specific user
        try {
            await prisma.notification.create({
              data: {
                userId: updatedTask.assigneeId, // Notify the NEWLY assigned user
                message: `Task updated: "${updatedTask.task.substring(0, 50)}${updatedTask.task.length > 50 ? '...' : ''}"`, // Generic update message
                taskId: updatedTask.id,
                meetingId: updatedTask.meeting.id
              }
            });
            console.log(`Notification created for user ${updatedTask.assigneeId} for updated task ${updatedTask.id}`);
          } catch (notificationError) {
            console.error(`Failed to create notification for user ${updatedTask.assigneeId}:`, notificationError);
          }
    }

    console.log(`Task ${taskId} updated by user ${user.id}`);
    return NextResponse.json(updatedTask);

  } catch (error) {
    console.error('Error updating task:', error);
    // Handle specific Prisma errors if needed (e.g., P2025 record not found)
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const taskId = params.taskId;

    // --- Delete Task and Related Proofs --- 
    // First, check if the task exists
    const taskExists = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true }
    });
    
    if (!taskExists) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    // Delete related notifications first (if any)
    try {
      // Check if Notification model is available and if there are any notifications to delete
      const notificationsCount = await prisma.notification.count({
        where: { taskId: taskId }
      });
      
      if (notificationsCount > 0) {
        console.log(`Deleting ${notificationsCount} notifications for task ${taskId}`);
        await prisma.notification.deleteMany({
          where: { taskId: taskId }
        });
      }
    } catch (notificationError) {
      // Log error but continue, as this shouldn't block task deletion
      console.error('Error deleting notifications:', notificationError);
    }
    
    // Delete task proofs (if any)
    try {
      const proofsCount = await prisma.taskProof.count({
        where: { taskId: taskId }
      });
      
      if (proofsCount > 0) {
        console.log(`Deleting ${proofsCount} proofs for task ${taskId}`);
        await prisma.taskProof.deleteMany({
          where: { taskId: taskId }
        });
      }
    } catch (proofError) {
      // If there's an error with deleting proofs, log and stop the process
      console.error('Error deleting task proofs:', proofError);
      return NextResponse.json(
        { error: 'Failed to delete task proofs' },
        { status: 500 }
      );
    }
    
    // Finally, delete the task itself
    try {
      await prisma.task.delete({
        where: { id: taskId }
      });
      
      console.log(`Task ${taskId} deleted successfully by user ${user.id}`);
      return NextResponse.json({ message: 'Task deleted successfully' }, { status: 200 });
    } catch (taskDeleteError) {
      console.error('Error deleting task:', taskDeleteError);
      return NextResponse.json(
        { error: 'Failed to delete task' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error deleting task:', error);
    // Handle potential Prisma errors (e.g., record not found if deleted concurrently)
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}

// Optional: Add GET handler if needed later to fetch a single task's details
// export async function GET(...) {}

// Optional: Add DELETE handler if needed later
// export async function DELETE(...) {} 