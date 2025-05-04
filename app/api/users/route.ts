import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET: Fetch all users (for team member/attendee selection)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('search');
    const role = searchParams.get('role');
    const excludeTeamId = searchParams.get('excludeTeamId'); // To exclude existing team members
    
    // Build filter conditions
    const whereConditions: any = {
      AND: [
        // Base conditions
        {
          OR: searchTerm ? [
            {
              name: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          ] : undefined,
        },
        // Role filter
        role ? { role } : undefined,
        // Exclude current user
        { NOT: { id: user.id } },
      ].filter(Boolean),
    };

    // Exclude users who are already members of the specified team
    if (excludeTeamId) {
      whereConditions.AND.push({
        NOT: {
          memberTeams: {
            some: {
              id: excludeTeamId,
            },
          },
        },
      });
    }

    // Get users based on filters
    const users = await prisma.user.findMany({
      where: whereConditions,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        // Count relationships for additional info
        _count: {
          select: {
            memberTeams: true,
            leadingTeams: true,
            createdMeetings: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Format the response to include counts
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      teamsCount: user._count.memberTeams,
      ledTeamsCount: user._count.leadingTeams,
      createdMeetingsCount: user._count.createdMeetings,
    }));

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
} 