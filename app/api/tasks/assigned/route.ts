import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET: Fetch tasks assigned to the current user
export async function GET(request: NextRequest) {
  try {
    console.log('Starting /api/tasks/assigned endpoint');
    
    const user = await getCurrentUser();
    console.log('Current user:', { id: user?.id, name: user?.name, role: user?.role });
    
    if (!user || !user.id) {
      console.log('No authenticated user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching tasks for user:', user.id);
    
    // Get tasks assigned to this user
    const tasks = await prisma.task.findMany({
      where: {
        assigneeId: user.id,
      },
      select: {
        id: true,
        task: true,
        owner: true,
        dueDate: true,
        status: true,
        comments: true,
        meetingId: true,
        createdAt: true,
        updatedAt: true,
        assigneeId: true,
        assignee: {
          select: {
            id: true,
            name: true,
          },
        },
        meeting: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        {
          dueDate: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });

    console.log('Found tasks:', tasks);
    
    // Transform the tasks to match the expected interface
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      task: task.task,
      owner: task.owner,
      dueDate: task.dueDate?.toISOString() || null,
      status: task.status,
      comments: task.comments,
      meetingId: task.meetingId,
      meetingName: task.meeting?.name || '',
      assigneeId: task.assigneeId,
      assigneeName: task.assignee?.name || null
    }));

    console.log('Formatted tasks:', formattedTasks);

    // Always return an array, even if empty
    return NextResponse.json(formattedTasks);
  } catch (error) {
    // Log detailed error information
    console.error('Detailed error in /api/tasks/assigned:', {
      error,
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Database constraint violation' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: `Failed to fetch assigned tasks: ${error.message}` },
      { status: 500 }
    );
  }
} 