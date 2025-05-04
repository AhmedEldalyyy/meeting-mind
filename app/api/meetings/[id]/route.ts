import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCurrentUser } from '@/lib/auth';
import { analyzeTranscript } from '@/lib/analyze-transcript';

// GET: Fetch a specific meeting by ID
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
    
    // Get the meeting with all its details
    const meeting = await prisma.meeting.findUnique({
      where: {
        id: meetingId,
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
              },
            },
          },
        },
        attendees: true,
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        decisions: true,
        questions: true,
        insights: true,
        agenda: true,
        deadlines: true,
        followUps: true,
        risks: true,
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Check if the user is the creator, an attendee, the team leader, or a team member
    const isCreator = meeting.creator.id === user.id;
    const isAttendee = meeting.attendees.some(attendee => attendee.name === user.name);
    const isTeamLeader = meeting.team?.leader?.id === user.id;
    const isTeamMember = meeting.team?.members?.some(member => member.id === user.id) || false;

    console.log('Permission check for meeting:', {
      meetingId,
      userId: user.id,
      isCreator,
      isAttendee,
      isTeamLeader,
      isTeamMember,
      hasTeam: !!meeting.team
    });

    if (!isCreator && !isAttendee && !isTeamLeader && !isTeamMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Format the data for the frontend
    const formattedMeeting = {
      id: meeting.id,
      name: meeting.name,
      description: meeting.description,
      rawTranscript: meeting.rawTranscript,
      summary: meeting.summary || 'No summary available. This meeting may still be processing or was created without a transcript.',
      status: meeting.status,
      scheduledAt: meeting.scheduledAt,
      createdAt: meeting.createdAt,
      updatedAt: meeting.updatedAt,
      creator: meeting.creator,
      team: meeting.team,
      tasks: meeting.tasks,
      breakdown: {
        Tasks: meeting.tasks.map(task => ({
          id: task.id,
          task: task.task || '',
          owner: task.owner || 'Unassigned',
          dueDate: task.dueDate ? task.dueDate.toISOString() : '',
          status: task.status,
          assigneeId: task.assigneeId,
          assignee: task.assignee,
          approvalStatus: task.approvalStatus,
          comments: task.comments,
        })),
        Decisions: meeting.decisions.map(decision => ({
          decision: decision.decision || '',
          date: decision.date ? decision.date.toISOString() : new Date().toISOString()
        })),
        Questions: meeting.questions.map(question => ({
          question: question.question || '',
          status: question.status || 'PENDING',
          answer: question.answer || ''
        })),
        Insights: meeting.insights.map(insight => ({
          insight: insight.insight || '',
          reference: insight.reference || ''
        })),
        Deadlines: meeting.deadlines.map(deadline => ({
          description: deadline.description || '',
          dueDate: deadline.dueDate ? deadline.dueDate.toISOString() : ''
        })),
        Attendees: meeting.attendees.map(attendee => ({
          name: attendee.name, 
          role: attendee.role 
        })),
        "Follow-ups": meeting.followUps.map(followUp => ({
          description: followUp.description || '',
          owner: followUp.owner || 'Unassigned'
        })),
        Risks: meeting.risks.map(risk => ({
          risk: risk.risk || '',
          impact: risk.impact || 'Unknown'
        }))
      },
      topicSegmentation: meeting.topicSegmentation
    };

    console.log('Team data being sent to frontend:', JSON.stringify(formattedMeeting.team, null, 2));

    console.log('Returning formatted meeting:', {
      id: formattedMeeting.id,
      name: formattedMeeting.name,
      has_summary: !!formattedMeeting.summary,
      has_transcript: !!formattedMeeting.rawTranscript,
      breakdown_entries: Object.keys(formattedMeeting.breakdown).map(key => 
        `${key}: ${formattedMeeting.breakdown[key].length} items`
      )
    });

    return NextResponse.json(formattedMeeting);
  } catch (error) {
    console.error('Error fetching meeting:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meeting' },
      { status: 500 }
    );
  }
}

// PUT: Update a meeting
export async function PUT(
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
    const { 
      name, 
      description, 
      location, 
      scheduledAt, 
      duration, 
      attendeeIds,
      summary,
      rawTranscript,
      status,
      topicSegmentation,
      breakdown
    } = body;

    // Handle JSON serialization if topicSegmentation is provided as an object
    const formattedTopicSegmentation = 
      topicSegmentation && typeof topicSegmentation === 'object' 
        ? JSON.stringify(topicSegmentation) 
        : topicSegmentation;

    // Check if the meeting exists and if the user is authorized to update it
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
            members: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Check different levels of permissions
    const isCreator = meeting.creatorId === user.id;
    const isTeamLeader = meeting.teamId && meeting.team?.leaderId === user.id;
    const isTeamMember = meeting.teamId && meeting.team?.members?.some(member => member.id === user.id);

    // Only allow creator or team leader to fully update the meeting
    // Team members can view but not update core meeting details
    if (!isCreator && !isTeamLeader && !isTeamMember) {
      return NextResponse.json(
        { error: 'You do not have permission to access this meeting' },
        { status: 403 }
      );
    }
    
    // Team members can only update their own tasks, not meeting details
    if (!isCreator && !isTeamLeader && isTeamMember) {
      // If it's just a team member and they're trying to update core meeting details, deny
      if (name !== undefined || description !== undefined || location !== undefined || 
          scheduledAt !== undefined || duration !== undefined || summary !== undefined || 
          rawTranscript !== undefined || attendeeIds !== undefined) {
        
        return NextResponse.json(
          { error: 'Team members can only update their own tasks, not meeting details' },
          { status: 403 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};

    // Update basic meeting details if provided
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    if (scheduledAt !== undefined) updateData.scheduledAt = new Date(scheduledAt);
    if (duration !== undefined) updateData.duration = duration;
    if (summary !== undefined) updateData.summary = summary;
    if (rawTranscript !== undefined) updateData.rawTranscript = rawTranscript;
    if (status !== undefined) updateData.status = status;
    if (formattedTopicSegmentation !== undefined) updateData.topicSegmentation = formattedTopicSegmentation;
    
    if (body.breakdown !== undefined) updateData.breakdown = body.breakdown;

    // Handle attendees if provided
    if (attendeeIds && attendeeIds.length > 0) {
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
      
      // Delete all current attendees
      await prisma.attendee.deleteMany({
        where: {
          meetingId: meetingId
        }
      });
      
      // Create new attendees
      const attendeesToCreate = users.map(user => ({
        name: user.name,
        role: 'PARTICIPANT',
        meetingId: meetingId
      }));
      
      // Make sure the creator is always included
      const creator = await prisma.user.findUnique({
        where: { id: meeting.creatorId },
        select: { name: true }
      });
      
      if (creator && !attendeesToCreate.some(a => a.name === creator.name)) {
        attendeesToCreate.push({
          name: creator.name,
          role: 'ORGANIZER',
          meetingId: meetingId
        });
      }
      
      // Create all attendees at once
      await prisma.attendee.createMany({
        data: attendeesToCreate
      });
    }

    // Update the meeting
    const updatedMeeting = await prisma.meeting.update({
      where: {
        id: meetingId,
      },
      data: updateData,
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
    });

    return NextResponse.json(updatedMeeting);
  } catch (error) {
    console.error('Error updating meeting:', error);
    return NextResponse.json(
      { error: 'Failed to update meeting' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a meeting
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

    // Check if the meeting exists and if the user is authorized to delete it
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

    // Only allow creator or team leader to delete the meeting
    // Team members cannot delete meetings
    const isCreator = meeting.creatorId === user.id;
    const isTeamLeader = meeting.teamId && meeting.team?.leaderId === user.id;

    if (!isCreator && !isTeamLeader) {
      return NextResponse.json(
        { error: 'Only the meeting creator or team leader can delete the meeting' },
        { status: 403 }
      );
    }

    // Get all tasks associated with this meeting
    const tasks = await prisma.task.findMany({
      where: { meetingId },
      select: { id: true }
    });
    
    const taskIds = tasks.map(task => task.id);

    // Delete the meeting and all related records in the correct order
    await prisma.$transaction(async (tx) => {
      // First delete TaskProofs that reference Tasks
      if (taskIds.length > 0) {
        await tx.taskProof.deleteMany({
          where: { taskId: { in: taskIds } }
        });
      }
      
      // Delete all other related records
      await tx.attendee.deleteMany({ where: { meetingId } });
      await tx.task.deleteMany({ where: { meetingId } });
      await tx.decision.deleteMany({ where: { meetingId } });
      await tx.question.deleteMany({ where: { meetingId } });
      await tx.insight.deleteMany({ where: { meetingId } });
      await tx.deadline.deleteMany({ where: { meetingId } });
      await tx.followUp.deleteMany({ where: { meetingId } });
      await tx.risk.deleteMany({ where: { meetingId } });
      await tx.agendaItem.deleteMany({ where: { meetingId } });
      
      // Finally delete the meeting
      await tx.meeting.delete({ where: { id: meetingId } });
    });

    return NextResponse.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    return NextResponse.json(
      { error: 'Failed to delete meeting' },
      { status: 500 }
    );
  }
}
