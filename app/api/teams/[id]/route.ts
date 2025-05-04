import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET: Fetch a specific team by ID
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
    
    // Check if the team exists and the user is the leader or a member
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        meetings: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if the user is the leader or a member of this team
    const isLeader = team.leader.id === user.id;
    const isMember = team.members.some(member => member.id === user.id);

    if (!isLeader && !isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team' },
      { status: 500 }
    );
  }
}

// PUT: Update a team's details
export async function PUT(
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
    const { name, description } = body;

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
        { error: 'Only the team leader can update the team' },
        { status: 403 }
      );
    }

    // Update the team
    const updatedTeam = await prisma.team.update({
      where: {
        id: teamId,
      },
      data: {
        name: name,
        description: description,
      },
    });

    return NextResponse.json(updatedTeam);
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json(
      { error: 'Failed to update team' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a team
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
        { error: 'Only the team leader can delete the team' },
        { status: 403 }
      );
    }

    // Delete the team
    await prisma.team.delete({
      where: {
        id: teamId,
      },
    });

    return NextResponse.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 }
    );
  }
} 