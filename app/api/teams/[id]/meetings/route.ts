import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET: Fetch all meetings for a specific team
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = params.id;
    
    // Check if the team exists and if the user is the leader or a member
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
      select: {
        leaderId: true,
        members: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if the user is the leader or a member of this team
    const isLeader = team.leaderId === user.id;
    const isMember = team.members.some(member => member.id === user.id);

    if (!isLeader && !isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all meetings for this team
    const meetings = await prisma.meeting.findMany({
      where: {
        teamId: teamId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attendees: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(meetings);
  } catch (error) {
    console.error('Error fetching team meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team meetings' },
      { status: 500 }
    );
  }
}

// POST: Create a new meeting for a team
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = params.id;
    const body = await request.json();
    const { name, description, location, scheduledAt, duration, attendeeIds } = body;

    if (!name || !scheduledAt) {
      return NextResponse.json(
        { error: 'Meeting name and scheduled time are required' },
        { status: 400 }
      );
    }

    // Verify the team exists and the user is the leader
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
      select: {
        leaderId: true,
        members: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if the user is the leader or a member of this team
    const isLeader = team.leaderId === user.id;
    const isMember = team.members.some(member => member.id === user.id);

    if (!isLeader && !isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create the meeting with initial attendees (if provided)
    let attendeesToCreate = [];
    
    if (attendeeIds?.length > 0) {
      // Find users by their IDs to get their names
      const users = await prisma.user.findMany({
        where: {
          id: {
            in: attendeeIds
          }
        },
        select: {
          id: true,
          name: true
        }
      });
      
      // Create attendee objects with names
      attendeesToCreate = users.map(user => ({
        name: user.name,
        role: 'PARTICIPANT'
      }));
    }
    
    // Always add creator as an attendee if not already included
    if (!attendeeIds?.includes(user.id)) {
      attendeesToCreate.push({
        name: user.name,
        role: 'ORGANIZER'
      });
    }

    const meeting = await prisma.meeting.create({
      data: {
        name,
        description: description || '',
        location: location || '',
        scheduledAt: new Date(scheduledAt),
        duration: duration || 60, // Default to 1 hour if not specified
        creator: {
          connect: { id: user.id },
        },
        team: {
          connect: { id: teamId },
        },
        attendees: {
          create: attendeesToCreate
        },
      },
      include: {
        attendees: true,
      },
    });

    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    console.error('Error creating meeting:', error);
    return NextResponse.json(
      { error: 'Failed to create meeting' },
      { status: 500 }
    );
  }
} 