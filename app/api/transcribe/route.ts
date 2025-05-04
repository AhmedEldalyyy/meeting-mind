import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import FormData from 'form-data'
import fetch from 'node-fetch'
import type { Response } from 'node-fetch'
import { getCurrentUser } from '@/lib/auth'
import { analyzeTranscript } from '@/lib/analyze-transcript'

// Constants
const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const WHISPER_MODEL = 'distil-whisper-large-v3-en'

export const POST = async (request: NextRequest) => {
  try {
    console.log('Received POST request to /api/transcribe')
    
    // Get the current user
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const formData = await request.formData()
    const file = formData.get('audio') as File
    const fullPath = formData.get('fullPath') as string
    const teamId = formData.get('teamId') as string

    console.log('Received file:', file?.name)
    console.log('Full path:', fullPath)
    console.log('Team ID:', teamId)

    if (!file) {
      console.error('No audio file provided')
      return NextResponse.json({ error: 'No audio file provided.' }, { status: 400 })
    }

    // If teamId is provided, verify that the user has access to the team
    if (teamId) {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { 
          leaderId: true,
          members: {
            select: { id: true }
          }
        }
      });

      if (!team) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }

      // Check if user is the team leader or a member
      const isLeader = team.leaderId === user.id;
      const isMember = team.members.some(member => member.id === user.id);

      if (!isLeader && !isMember) {
        return NextResponse.json({ error: 'You do not have access to this team' }, { status: 403 });
      }

      // Only team leaders can upload meetings
      if (!isLeader) {
        return NextResponse.json({ error: 'Only team leaders can upload meetings' }, { status: 403 });
      }
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Define directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')

    // Ensure directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    // Save the file
    const fileName = `${Date.now()}-${file.name}`
    const filePath = path.join(uploadsDir, fileName)
    fs.writeFileSync(filePath, buffer)

    console.log('File saved at:', filePath)

    // Create form data for Groq API
    const groqFormData = new FormData()
    groqFormData.append('file', fs.createReadStream(filePath))
    groqFormData.append('model', WHISPER_MODEL)
    groqFormData.append('response_format', 'json')
    groqFormData.append('language', 'en')
    groqFormData.append('temperature', '0')

    // Get API key from environment
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not defined in environment variables')
    }

    // Send request to Groq API
    console.log('Sending request to Groq API')
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...groqFormData.getHeaders()
      },
      body: groqFormData
    })

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`)
    }

    const transcriptionResult = await response.json()
    const rawTranscript = transcriptionResult.text

    console.log('Received transcription from Groq API')
    console.log('Raw transcript:', rawTranscript.substring(0, 100) + '...')

    // Process the transcript 
    console.log('Analyzing transcript')
    const analyzedData = await analyzeTranscript(rawTranscript)
    console.log('Transcript analysis complete')
    
    // Generate topic segmentation
    console.log('Generating topic segmentation')
    let topicSegmentationData = null
    try {
      const segmentTopicsModule = await import('@/lib/segment-topics')
      topicSegmentationData = await segmentTopicsModule.segmentTopics(rawTranscript)
      console.log('Topic segmentation complete')
    } catch (error) {
      console.error('Error generating topic segmentation:', error)
      // Continue with the process even if topic segmentation fails
    }
    
    // Debug logging to see the structure of analyzed data
    console.log('Analyzed data structure:');
    console.log('- name:', analyzedData.name);
    console.log('- description:', analyzedData.description?.substring(0, 100) + '...');
    console.log('- summary:', analyzedData.summary?.substring(0, 100) + '...');
    console.log('- breakdown keys:', Object.keys(analyzedData.breakdown || {}));
    
    if (topicSegmentationData) {
      console.log('- topic segmentation:', `${topicSegmentationData.totalTopics} topics found`);
    }

    // Extract and create all the relevant entities from the analysis
    console.log('Creating breakdown entities...');
    
    // Create tasks
    const taskCreate = analyzedData.breakdown.Tasks?.map((task) => {
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
        task: task.task || task.description || '',
        owner: task.owner || task.assignee || '',
        dueDate: parsedDate,
      };
    }) || [];

    // Create decisions
    const decisionCreate = analyzedData.breakdown.Decisions?.map((decision) => {
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
        decision: decision.decision || decision.content || '',
        date: parsedDate,
      };
    }) || [];

    // Create questions
    const questionCreate = analyzedData.breakdown.Questions?.map((question) => ({
      question: question.question || question.content || '',
      status: question.status || 'PENDING',
      answer: question.answer || '',
    })) || [];

    // Create insights
    const insightCreate = analyzedData.breakdown.Insights?.map((insight) => ({
      insight: insight.insight || insight.content || '',
      reference: insight.reference || insight.context || '',
    })) || [];

    // Create deadlines
    const deadlineCreate = analyzedData.breakdown.Deadlines?.map((deadline) => {
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
        description: deadline.description || deadline.content || '',
        dueDate: parsedDate,
      };
    }) || [];

    // Create attendees
    const attendeeCreate = analyzedData.breakdown.Attendees?.map((attendee) => ({
      name: attendee.name || '',
      role: attendee.role || 'PARTICIPANT',
    })) || [];

    // Create follow-ups
    const followUpsCreate = analyzedData.breakdown["Follow-ups"]?.map((followUp) => ({
      description: followUp.description || followUp.content || '',
      owner: followUp.owner || followUp.assignee || '',
    })) || [];

    // Create risks
    const riskCreate = analyzedData.breakdown.Risks?.map((risk) => ({
      risk: risk.risk || risk.content || '',
      impact: risk.impact || 'MEDIUM',
    })) || [];

    // Make sure the current user is included as an attendee
    if (!attendeeCreate.some(a => a.name === user.name)) {
      attendeeCreate.push({
        name: user.name || "Unknown User",
        role: "ORGANIZER"
      });
    }

    // Prepare meeting data
    const meetingData: any = {
      name: analyzedData.name,
      description: analyzedData.description,
      rawTranscript: rawTranscript,
      summary: analyzedData.summary,
      // Add topic segmentation if available
      ...(topicSegmentationData && {
        topicSegmentation: JSON.stringify(topicSegmentationData)
      }),
      creator: {
        connect: { id: user.id }
      },
      attendees: {
        create: attendeeCreate
      },
      tasks: {
        create: taskCreate
      },
      decisions: {
        create: decisionCreate
      },
      questions: {
        create: questionCreate
      },
      insights: {
        create: insightCreate
      },
      deadlines: {
        create: deadlineCreate
      },
      followUps: {
        create: followUpsCreate
      },
      risks: {
        create: riskCreate
      },
      agenda: {
        create: analyzedData.breakdown["Agenda Items"]?.map((item) => ({
          topic: item.topic || item.content || '',
          duration: item.duration ? parseInt(item.duration) : 0,
        })) || []
      }
    };

    // If teamId is provided, connect the meeting to the team
    if (teamId) {
      meetingData.team = {
        connect: { id: teamId }
      };
    }

    // Save to database
    const meeting = await prisma.meeting.create({
      data: meetingData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        team: {
          select: {
            id: true,
            name: true,
          }
        },
        attendees: true,
      }
    });

    return NextResponse.json({
      status: 'success',
      meetingId: meeting.id
    });
    
  } catch (error) {
    console.error('Error during transcription:', error)
    return NextResponse.json(
      { error: 'Transcription failed' },
      { status: 500 }
    )
  }
}