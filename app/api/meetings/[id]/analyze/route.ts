import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { analyzeTranscript } from '@/lib/analyze-transcript'
import { segmentTopics } from '@/lib/segment-topics'

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
    
    // Get the meeting with transcript
    const meeting = await prisma.meeting.findUnique({
      where: {
        id: meetingId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        rawTranscript: true,
        creatorId: true,
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

    // Check if the user is authorized
    const isCreator = meeting.creatorId === user.id;
    const isTeamLeader = meeting.team?.leaderId === user.id;

    if (!isCreator && !isTeamLeader) {
      return NextResponse.json(
        { error: 'Only the meeting creator or team leader can analyze the meeting' },
        { status: 403 }
      );
    }

    // Check if there is a transcript to analyze
    if (!meeting.rawTranscript) {
      return NextResponse.json(
        { error: 'No transcript available to analyze' },
        { status: 400 }
      );
    }

    console.log('Analyzing transcript for meeting:', meetingId);
    
    // Analyze the transcript
    const analyzedData = await analyzeTranscript(meeting.rawTranscript);
    
    // Also generate topic segmentation
    let topicSegmentationData = null;
    try {
      console.log('Generating topic segmentation for meeting:', meetingId);
      topicSegmentationData = await segmentTopics(meeting.rawTranscript);
    } catch (segmentError) {
      console.error('Error generating topic segmentation:', segmentError);
      // Continue with analysis even if topic segmentation fails
    }
    
    console.log('Analysis complete, updating meeting data');

    // Structure data for database
    const taskCreate = analyzedData.breakdown.Tasks?.map(task => {
      // Check if the dueDate is valid before attempting to create a Date object
      let parsedDate = null;
      if (task.dueDate) {
        try {
          const tempDate = new Date(task.dueDate);
          // Check if the date is valid (not Invalid Date)
          if (!isNaN(tempDate.getTime())) {
            parsedDate = tempDate;
          }
        } catch (e) {
          console.log(`Invalid date format for task: ${task.dueDate}`);
        }
      }
      
      return {
        task: task.task || '',
        owner: task.owner || '',
        dueDate: parsedDate,
        meetingId: meetingId
      };
    }) || [];

    const decisionCreate = analyzedData.breakdown.Decisions?.map(decision => {
      // Check if the date is valid before attempting to create a Date object
      let parsedDate = new Date();  // Default to current date
      if (decision.date) {
        try {
          const tempDate = new Date(decision.date);
          // Check if the date is valid (not Invalid Date)
          if (!isNaN(tempDate.getTime())) {
            parsedDate = tempDate;
          }
        } catch (e) {
          console.log(`Invalid date format for decision: ${decision.date}`);
        }
      }
      
      return {
        decision: decision.decision || '',
        date: parsedDate,
        meetingId: meetingId
      };
    }) || [];

    const questionCreate = analyzedData.breakdown.Questions?.map(question => ({
      question: question.question || '',
      status: question.status || 'PENDING',
      answer: question.answer || '',
      meetingId: meetingId
    })) || [];

    const insightCreate = analyzedData.breakdown.Insights?.map(insight => ({
      insight: insight.insight || '',
      reference: insight.reference || '',
      meetingId: meetingId
    })) || [];

    const deadlineCreate = analyzedData.breakdown.Deadlines?.map(deadline => {
      // Check if the dueDate is valid before attempting to create a Date object
      let parsedDate = null;
      if (deadline.dueDate) {
        try {
          const tempDate = new Date(deadline.dueDate);
          // Check if the date is valid (not Invalid Date)
          if (!isNaN(tempDate.getTime())) {
            parsedDate = tempDate;
          }
        } catch (e) {
          console.log(`Invalid date format for deadline: ${deadline.dueDate}`);
        }
      }
      
      return {
        description: deadline.description || '',
        dueDate: parsedDate,
        meetingId: meetingId
      };
    }) || [];

    const attendeeCreate = analyzedData.breakdown.Attendees?.map(attendee => ({
      name: attendee.name || '',
      role: attendee.role || 'PARTICIPANT',
      meetingId: meetingId
    })) || [];

    // Make sure the current user is included as an attendee
    if (!attendeeCreate.some(a => a.name === user.name)) {
      attendeeCreate.push({
        name: user.name || "Unknown User",
        role: "ORGANIZER",
        meetingId: meetingId
      });
    }

    const followUpsCreate = analyzedData.breakdown["Follow-ups"]?.map(followUp => ({
      description: followUp.description || '',
      owner: followUp.owner || '',
      meetingId: meetingId
    })) || [];

    const riskCreate = analyzedData.breakdown.Risks?.map(risk => ({
      risk: risk.risk || '',
      impact: risk.impact || '',
      meetingId: meetingId
    })) || [];

    // Begin transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update meeting name, description, and summary
      await tx.meeting.update({
        where: { id: meetingId },
        data: {
          name: analyzedData.name,
          description: analyzedData.description,
          summary: analyzedData.summary,
          // Add topic segmentation data if available
          ...(topicSegmentationData && {
            topicSegmentation: JSON.stringify(topicSegmentationData)
          })
        }
      });

      // Clear existing related data
      await tx.task.deleteMany({ where: { meetingId } });
      await tx.decision.deleteMany({ where: { meetingId } });
      await tx.question.deleteMany({ where: { meetingId } });
      await tx.insight.deleteMany({ where: { meetingId } });
      await tx.deadline.deleteMany({ where: { meetingId } });
      await tx.followUp.deleteMany({ where: { meetingId } });
      await tx.risk.deleteMany({ where: { meetingId } });

      // Create new data
      if (taskCreate.length > 0) await tx.task.createMany({ data: taskCreate });
      if (decisionCreate.length > 0) await tx.decision.createMany({ data: decisionCreate });
      if (questionCreate.length > 0) await tx.question.createMany({ data: questionCreate });
      if (insightCreate.length > 0) await tx.insight.createMany({ data: insightCreate });
      if (deadlineCreate.length > 0) await tx.deadline.createMany({ data: deadlineCreate });
      if (followUpsCreate.length > 0) await tx.followUp.createMany({ data: followUpsCreate });
      if (riskCreate.length > 0) await tx.risk.createMany({ data: riskCreate });

      // Get attendee names to avoid duplicates
      const existingAttendees = await tx.attendee.findMany({
        where: { meetingId },
        select: { name: true }
      });
      
      const existingNames = existingAttendees.map(a => a.name);
      const newAttendees = attendeeCreate.filter(a => !existingNames.includes(a.name));
      
      if (newAttendees.length > 0) await tx.attendee.createMany({ data: newAttendees });

      // Get updated meeting with all relations
      const updatedMeeting = await tx.meeting.findUnique({
        where: { id: meetingId },
        include: {
          tasks: true,
          decisions: true,
          questions: true,
          insights: true,
          deadlines: true,
          attendees: true,
          followUps: true,
          risks: true,
        }
      });

      return updatedMeeting;
    });

    console.log('Meeting updated with analysis results');
    
    // Format the response
    const formattedMeeting = {
      ...result,
      breakdown: {
        Tasks: result?.tasks.map(task => ({
          task: task.task || '',
          owner: task.owner || 'Unassigned',
          dueDate: task.dueDate ? task.dueDate.toISOString() : ''
        })) || [],
        Decisions: result?.decisions.map(decision => ({
          decision: decision.decision || '',
          date: decision.date ? decision.date.toISOString() : new Date().toISOString()
        })) || [],
        Questions: result?.questions.map(question => ({
          question: question.question || '',
          status: question.status || 'PENDING',
          answer: question.answer || ''
        })) || [],
        Insights: result?.insights.map(insight => ({
          insight: insight.insight || '',
          reference: insight.reference || ''
        })) || [],
        Deadlines: result?.deadlines.map(deadline => ({
          description: deadline.description || '',
          dueDate: deadline.dueDate ? deadline.dueDate.toISOString() : ''
        })) || [],
        Attendees: result?.attendees.map(attendee => ({
          name: attendee.name,
          role: attendee.role
        })) || [],
        "Follow-ups": result?.followUps.map(followUp => ({
          description: followUp.description || '',
          owner: followUp.owner || 'Unassigned'
        })) || [],
        Risks: result?.risks.map(risk => ({
          risk: risk.risk || '',
          impact: risk.impact || 'Unknown'
        })) || []
      }
    };

    return NextResponse.json(formattedMeeting);
  } catch (error) {
    console.error('Error analyzing meeting:', error);
    return NextResponse.json(
      { error: 'Failed to analyze meeting transcript' },
      { status: 500 }
    );
  }
} 