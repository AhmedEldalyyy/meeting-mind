import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET: Fetch all members of a specific team
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

    // Get all members with more details
    const members = await prisma.user.findMany({
      where: {
        memberTeams: {
          some: {
            id: teamId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

// POST: Add a new member to the team
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
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Member email is required' },
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
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (team.leaderId !== user.id) {
      return NextResponse.json(
        { error: 'Only the team leader can add members' },
        { status: 403 }
      );
    }

    // Find the user to add as a member
    const memberToAdd = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!memberToAdd) {
      return NextResponse.json(
        { error: 'User not found with the provided email' },
        { status: 404 }
      );
    }

    // Check if the user is already a member
    const existingMember = await prisma.team.findFirst({
      where: {
        id: teamId,
        members: {
          some: {
            id: memberToAdd.id,
          },
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this team' },
        { status: 400 }
      );
    }

    // Add the user to the team
    await prisma.team.update({
      where: {
        id: teamId,
      },
      data: {
        members: {
          connect: {
            id: memberToAdd.id,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Member added successfully',
      member: {
        id: memberToAdd.id,
        name: memberToAdd.name,
        email: memberToAdd.email,
        role: memberToAdd.role,
      },
    });
  } catch (error) {
    console.error('Error adding team member:', error);
    return NextResponse.json(
      { error: 'Failed to add team member' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a member from the team
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = params.id;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
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
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (team.leaderId !== user.id) {
      return NextResponse.json(
        { error: 'Only the team leader can remove members' },
        { status: 403 }
      );
    }

    // Prevent removing the leader from their own team
    if (memberId === user.id) {
      return NextResponse.json(
        { error: 'Team leader cannot be removed from their own team' },
        { status: 400 }
      );
    }

    // Check if the user is a member
    const memberExists = await prisma.team.findFirst({
      where: {
        id: teamId,
        members: {
          some: {
            id: memberId,
          },
        },
      },
    });

    if (!memberExists) {
      return NextResponse.json(
        { error: 'User is not a member of this team' },
        { status: 404 }
      );
    }

    // Remove the user from the team
    await prisma.team.update({
      where: {
        id: teamId,
      },
      data: {
        members: {
          disconnect: {
            id: memberId,
          },
        },
      },
    });

    return NextResponse.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json(
      { error: 'Failed to remove team member' },
      { status: 500 }
    );
  }
} 