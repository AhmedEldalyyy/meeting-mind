import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET: Fetch all tasks for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const meetingId = searchParams.get('meetingId');
    const teamId = searchParams.get('teamId');
    
    // Build filter conditions - Simplified for Leader View
    // Fetches tasks from meetings of teams led by the current user.
    // Assumes /api/tasks/assigned is used for fetching tasks assigned TO the user.
    const whereConditions: any = {
          meeting: { 
            team: { 
              leaderId: user.id 
            } 
          } 
    };
    
    // Add optional filters back if provided
    if (status) {
      whereConditions.status = status;
    }
    if (meetingId) {
      whereConditions.meetingId = meetingId;
    }
    if (teamId) { // If specific teamId is given, override the base condition
      whereConditions.meeting = {
        teamId: teamId,
          // Optionally ensure leader still leads this specific team? 
          // team: { leaderId: user.id } // This might be redundant depending on UI flow
      };
    }

    // Get tasks based on filters
    const tasks = await prisma.task.findMany({
      where: whereConditions,
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
        assignee: { // Include assignee details
          select: {
            id: true,
            name: true
          }
        },
        meeting: {
          select: {
            id: true,
            name: true,
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        proofs: { // Include proofs associated with the task
          orderBy: { createdAt: 'desc' }, // Get latest first
          select: {
            id: true,
            fileUrl: true,
            description: true,
            createdAt: true
          }
        }
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

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST: Create a new task
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { task, description, ownerId, meetingId, dueDate, status } = body;

    if (!task) {
      return NextResponse.json(
        { error: 'Task description is required' },
        { status: 400 }
      );
    }

    // If meetingId is provided, check if the user has access to the meeting
    if (meetingId) {
      const meeting = await prisma.meeting.findUnique({
        where: {
          id: meetingId,
        },
        select: {
          creatorId: true,
          teamId: true,
          attendees: {
            select: {
              id: true,
            },
          },
          team: {
            select: {
              leaderId: true,
            },
          },
        },
      });

      if (!meeting) {
        return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
      }

      // Check if the user is the creator, an attendee, or the team leader
      const isCreator = meeting.creatorId === user.id;
      const isAttendee = meeting.attendees.some(attendee => attendee.id === user.id);
      const isTeamLeader = meeting.teamId && meeting.team?.leaderId === user.id;

      if (!isCreator && !isAttendee && !isTeamLeader) {
        return NextResponse.json({ error: 'Access denied to this meeting' }, { status: 403 });
      }
    }

    // If ownerId is provided, verify it's a valid user
    if (ownerId && ownerId !== user.id) {
      const taskOwner = await prisma.user.findUnique({
        where: {
          id: ownerId,
        },
      });

      if (!taskOwner) {
        return NextResponse.json({ error: 'Task owner not found' }, { status: 404 });
      }
    }

    // Create the task
    const newTask = await prisma.task.create({
      data: {
        task,
        description: description || '',
        status: status || 'PENDING',
        dueDate: dueDate ? new Date(dueDate) : null,
        owner: {
          connect: { id: ownerId || user.id },
        },
        ...(meetingId ? {
          meeting: {
            connect: { id: meetingId },
          },
        } : {}),
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        meeting: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
} 