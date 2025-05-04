import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET: Fetch all meetings for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // First, get the teams that the user is a member of
    const userTeams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            id: user.id
          }
        }
      },
      select: {
        id: true
      }
    });
    
    const teamIds = userTeams.map(team => team.id);
    console.log('User is a member of these teams:', teamIds);

    // Get all meetings where the user is an attendee, creator, or a member of the team
    const meetings = await prisma.meeting.findMany({
      where: {
        OR: [
          { creatorId: user.id },
          {
            attendees: {
              some: {
                name: user.name
              },
            },
          },
          {
            teamId: {
              in: teamIds
            }
          }
        ],
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        attendees: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    
    console.log(`Found ${meetings.length} meetings for user ${user.id}`);

    return NextResponse.json(meetings)
  } catch (error) {
    console.error('Error fetching meetings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    )
  }
}

// POST: Create a new meeting (without team association)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, location, scheduledAt, duration, attendeeIds, teamId } = body

    if (!name || !scheduledAt) {
      return NextResponse.json(
        { error: 'Meeting name and scheduled time are required' },
        { status: 400 }
      )
    }

    // Prepare meeting data
    const meetingData: any = {
      name,
      description: description || '',
      location: location || '',
      scheduledAt: new Date(scheduledAt),
      duration: duration || 60, // Default to 1 hour if not specified
      creator: {
        connect: { id: user.id },
      },
    }

    // If teamId is provided, connect the meeting to the team
    if (teamId) {
      // Verify the team exists and the user is a member
      const team = await prisma.team.findUnique({
        where: {
          id: teamId,
        },
        select: {
          members: {
            select: {
              id: true,
            },
          },
        },
      })

      if (!team) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 })
      }

      const isMember = team.members.some(member => member.id === user.id)
      
      if (!isMember) {
        return NextResponse.json(
          { error: 'You must be a team member to create a meeting for this team' },
          { status: 403 }
        )
      }

      meetingData.team = {
        connect: { id: teamId },
      }
    }

    // Handle attendees
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
    
    // Add attendees to meeting data
    meetingData.attendees = {
      create: attendeesToCreate
    };

    // Create the meeting
    const meeting = await prisma.meeting.create({
      data: meetingData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        attendees: true,
      },
    })

    return NextResponse.json(meeting, { status: 201 })
  } catch (error) {
    console.error('Error creating meeting:', error)
    return NextResponse.json(
      { error: 'Failed to create meeting' },
      { status: 500 }
    )
  }
}
