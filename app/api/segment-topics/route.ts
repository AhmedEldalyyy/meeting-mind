import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { segmentTopics } from '@/lib/segment-topics';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await req.json();
    const { transcript, meetingId } = body;

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    // Process the transcript to segment topics
    console.log('Segmenting topics from transcript...');
    const result = await segmentTopics(transcript);

    // If meeting ID is provided, store the results in the database
    if (meetingId) {
      try {
        await prisma.meeting.update({
          where: { id: meetingId },
          data: {
            topicSegmentation: JSON.stringify(result)
          }
        });
        console.log(`Topic segmentation saved for meeting ${meetingId}`);
      } catch (dbError) {
        console.error('Error saving topic segmentation to database:', dbError);
        // Continue with the response even if DB update fails
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in segment-topics API:', error);
    return NextResponse.json(
      { error: 'Failed to segment topics from transcript' },
      { status: 500 }
    );
  }
} 