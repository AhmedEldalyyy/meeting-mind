import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET: Fetch all attendees of a specific meeting
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const meetingId = params.id;
    
    // Check if the meeting exists and if the user has access
    const meeting = await prisma.meeting.findUnique({
      where: {
        id: meetingId,
      },
      select: {
        creatorId: true,
        teamId: true,
        attendees: true,
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
    // Check if user's name is in the attendees list
    const isAttendee = meeting.attendees.some(attendee => 
      attendee.name === user.name
    );
    const isTeamLeader = meeting.teamId && meeting.team?.leaderId === user.id;

    if (!isCreator && !isAttendee && !isTeamLeader) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all attendees of this meeting
    const attendees = await prisma.attendee.findMany({
      where: {
        meetingId: meetingId,
      },
    });

    return NextResponse.json(attendees);
  } catch (error) {
    console.error('Error fetching meeting attendees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meeting attendees' },
      { status: 500 }
    );
  }
}

// POST: Add a new attendee to the meeting
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const meetingId = params.id;
    const body = await request.json();
    const { name, email, role } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Attendee name is required' },
        { status: 400 }
      );
    }

    // Check if the meeting exists and if the user has permission to add attendees
    const meeting = await prisma.meeting.findUnique({
      where: {
        id: meetingId,
      },
      select: {
        creatorId: true,
        teamId: true,
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

    // Only allow creator or team leader to add attendees
    const isCreator = meeting.creatorId === user.id;
    const isTeamLeader = meeting.teamId && meeting.team?.leaderId === user.id;

    if (!isCreator && !isTeamLeader) {
      return NextResponse.json(
        { error: 'Only the meeting creator or team leader can add attendees' },
        { status: 403 }
      );
    }

    // Check if the attendee already exists in this meeting
    const existingAttendee = await prisma.attendee.findFirst({
      where: {
        meetingId: meetingId,
        name: name,
      },
    });

    if (existingAttendee) {
      return NextResponse.json(
        { error: 'Attendee already exists in this meeting' },
        { status: 400 }
      );
    }

    // Add the attendee to the meeting
    const newAttendee = await prisma.attendee.create({
      data: {
        name,
        role: role || 'PARTICIPANT',
        meeting: {
          connect: { id: meetingId }
        }
      },
    });

    return NextResponse.json({
      message: 'Attendee added successfully',
      attendee: newAttendee
    });
  } catch (error) {
    console.error('Error adding meeting attendee:', error);
    return NextResponse.json(
      { error: 'Failed to add meeting attendee' },
      { status: 500 }
    );
  }
}

// DELETE: Remove an attendee from the meeting
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const meetingId = params.id;
    const { searchParams } = new URL(request.url);
    const attendeeId = searchParams.get('attendeeId');

    if (!attendeeId) {
      return NextResponse.json(
        { error: 'Attendee ID is required' },
        { status: 400 }
      );
    }

    // Check if the meeting exists and if the user has permission to remove attendees
    const meeting = await prisma.meeting.findUnique({
      where: {
        id: meetingId,
      },
      select: {
        creatorId: true,
        teamId: true,
        attendees: true,
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

    // Only allow creator or team leader to remove attendees
    const isCreator = meeting.creatorId === user.id;
    const isTeamLeader = meeting.teamId && meeting.team?.leaderId === user.id;

    if (!isCreator && !isTeamLeader) {
      return NextResponse.json(
        { error: 'Only the meeting creator or team leader can remove attendees' },
        { status: 403 }
      );
    }

    // Prevent removing the creator from their own meeting
    const creatorAttendee = meeting.attendees.find(a => a.name === user.name);
    if (attendeeId === creatorAttendee?.id) {
      return NextResponse.json(
        { error: 'Meeting creator cannot be removed from their own meeting' },
        { status: 400 }
      );
    }

    // Check if the attendee exists
    const attendee = await prisma.attendee.findUnique({
      where: {
        id: attendeeId,
      },
    });

    if (!attendee) {
      return NextResponse.json(
        { error: 'Attendee not found' },
        { status: 404 }
      );
    }

    // Delete the attendee
    await prisma.attendee.delete({
      where: {
        id: attendeeId,
      },
    });

    return NextResponse.json({ message: 'Attendee removed successfully' });
  } catch (error) {
    console.error('Error removing meeting attendee:', error);
    return NextResponse.json(
      { error: 'Failed to remove meeting attendee' },
      { status: 500 }
    );
  }
} 