import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET: Fetch all teams led by the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const memberOnly = searchParams.get('memberOnly') === 'true';
    
    // Build the where condition based on user role and query params
    let whereCondition = {};
    
    if (memberOnly) {
      // Only get teams where user is a member
      whereCondition = {
        members: {
          some: {
            id: user.id
          }
        }
      };
    } else {
      // Get all teams where user is either a leader or a member
      whereCondition = {
        OR: [
          { leaderId: user.id },
          {
            members: {
              some: {
                id: user.id
              }
            }
          }
        ]
      };
    }

    // Get teams based on the condition
    const teams = await prisma.team.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        description: true,
        leaderId: true,
        createdAt: true,
        _count: {
          select: {
            members: true,
            meetings: true,
          },
        },
      },
    });

    // Transform the data to include member and meeting counts
    const formattedTeams = teams.map(team => ({
      id: team.id,
      name: team.name,
      description: team.description || '',
      isLeader: team.leaderId === user.id,
      createdAt: team.createdAt,
      membersCount: team._count.members,
      meetingsCount: team._count.meetings,
    }));

    return NextResponse.json(formattedTeams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}

// POST: Create a new team
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a team leader
    if (user.role !== 'TEAM_LEADER') {
      return NextResponse.json(
        { error: 'Only team leaders can create teams' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Team name is required' },
        { status: 400 }
      );
    }

    // Create the team
    const team = await prisma.team.create({
      data: {
        name,
        description: description || '',
        leader: {
          connect: { id: user.id },
        },
        // Add the leader as a member as well
        members: {
          connect: { id: user.id },
        },
      },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    );
  }
} 