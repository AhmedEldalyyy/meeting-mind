import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'proofs');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// POST: Upload proof for a task
export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const taskId = params.taskId;

    // Verify the task exists, the user is assigned, and status is OPEN
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { assigneeId: true, status: true }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.assigneeId !== user.id) {
      return NextResponse.json({ error: 'You are not assigned to this task' }, { status: 403 });
    }

    // Check if task status allows proof submission (OPEN or NEEDS_REWORK)
    if (!['OPEN', 'NEEDS_REWORK'].includes(task.status)) {
      return NextResponse.json({ error: `Cannot submit proof for task with status '${task.status}'. Expected 'OPEN' or 'NEEDS_REWORK'.` }, { status: 400 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No proof file provided' }, { status: 400 });
    }

    // Generate a unique filename
    const fileExtension = path.extname(file.name);
    const fileName = `${user.id}-${taskId}-${Date.now()}${fileExtension}`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    const fileUrl = `/uploads/proofs/${fileName}`; // URL path to access the file

    // Save the file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);

    console.log(`Proof file saved for task ${taskId} at: ${filePath}`);

    // Get the task details including meeting and team leader info for notification
    const taskDetails = await prisma.task.findUnique({
      where: { id: taskId },
      select: { 
        id: true,
        task: true,
        meetingId: true,
        meeting: { 
          select: { 
            team: { 
              select: { 
                leaderId: true,
                name: true
              } 
            } 
          } 
        } 
      }
    });

    if (!taskDetails?.meeting?.team?.leaderId) {
      return NextResponse.json({ error: 'Task details could not be retrieved' }, { status: 500 });
    }

    // --- Create TaskProof record and Update Task Status --- 
    const proof = await prisma.$transaction(async (tx) => {
      // Create the proof record
      const newProof = await tx.taskProof.create({
        data: {
          fileUrl: fileUrl,
          description: description,
          taskId: taskId,
          userId: user.id,
        }
      });
      
      // Update task status to PENDING_APPROVAL
      await tx.task.update({
        where: { id: taskId },
        data: {
          status: 'PENDING_APPROVAL', // Use the new consolidated status
        }
      });

      return newProof;
    });

    // Create notification for Team Leader about submitted proof
    try {
      const teamLeaderId = taskDetails.meeting.team.leaderId;
      const taskTitle = taskDetails.task || 'task';
      
      await prisma.notification.create({
        data: {
          userId: teamLeaderId,
          message: `New proof submitted for task "${taskTitle.substring(0, 50)}${taskTitle.length > 50 ? '...' : ''}"`,
          taskId: taskId,
          meetingId: taskDetails.meetingId
        }
      });
      
      console.log(`Notification created for team leader ${teamLeaderId} about new proof for task ${taskId}`);
    } catch (notificationError) {
      console.error('Error creating notification for team leader:', notificationError);
      // Don't fail the whole request if notification creation fails
    }

    return NextResponse.json({ message: 'Proof uploaded successfully', fileUrl: fileUrl }, { status: 201 });

  } catch (error) {
    console.error('Error uploading task proof:', error);
    return NextResponse.json(
      { error: 'Failed to upload proof' },
      { status: 500 }
    );
  }
} 