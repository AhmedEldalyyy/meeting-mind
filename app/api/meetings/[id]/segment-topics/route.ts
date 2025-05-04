import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { segmentTopics } from '@/lib/segment-topics';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const meetingId = params.id;

    // Verify authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the meeting and ensure it exists
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    // Get the transcript from the meeting
    if (!meeting.transcript && !meeting.rawTranscript) {
      return NextResponse.json(
        { error: 'No transcript available for this meeting' },
        { status: 400 }
      );
    }

    // Use transcript or rawTranscript as available
    const transcript = meeting.transcript || meeting.rawTranscript;

    // Process the transcript to segment topics
    console.log(`Segmenting topics for meeting ${meetingId}...`);
    const result = await segmentTopics(transcript);

    // Update the meeting with the segmentation results
    await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        topicSegmentation: JSON.stringify(result)
      }
    });

    console.log(`Topic segmentation saved for meeting ${meetingId}`);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in meeting segment-topics API:', error);
    return NextResponse.json(
      { error: 'Failed to segment topics for the meeting' },
      { status: 500 }
    );
  }
} 