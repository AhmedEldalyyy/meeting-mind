import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Function to extract data from transcript
async function analyzeTranscript(transcript: string) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }

    // Initialize the Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use gemini-2.0-flash model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-exp-03-25" });
    
    // Limit transcript length to avoid token limits
    const limitedTranscript = transcript.length > 30000 
      ? transcript.substring(0, 30000) + "..." 
      : transcript;
    // Generate content with Gemini
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are an AI assistant that analyzes meeting transcripts.
              
Analyze this transcription and produce a Breakdown of Categories in VALID JSON FORMAT:

Tasks: Tasks with varying priorities, owners, and due dates.
Example task assignments include preparing reports, setting up meetings, and submitting proposals.

Decisions: Important decisions made during the meeting
Decisions include vendor choice, marketing strategy, and budget approval.

Questions: Questions raised during the meeting, with their status (answered/unanswered).
Answered questions include additional context in the form of answers.

Insights: Insights based on the conversation, ranging from sales performance to concerns about deadlines.
Each insight refer back to the exact part of the conversation.

Deadlines: Upcoming deadlines related to the budget, product launch, and client presentation.
This helps track time-sensitive matters.

Attendees: Attendees who attended the meeting
This tracks attendance and their respective roles.

Follow-ups: Follow-up tasks assigned to individuals after the meeting, each with a due date.
Follow-up items focus on clarifying budget, design, and scheduling next actions.

Risks: Risks identified during the meeting, each with potential impacts on the project.
These include risks like budget overruns, delays, and potential staff turnover.

Agenda: A list of the agenda items covered in the meeting.
The agenda provides a structured overview of the topics discussed. You need to extract as many items as you can, some might have 1-2 items, and some might 10, so make sure to capture every point.

Meeting Name: The title of the meeting, reflecting its official designation. This gives a clear identifier for the meeting, often including a specific date or purpose, such as "October 2024 Municipal Council Meeting."

Description: A high-level overview of the meeting's purpose and key areas of focus. The description captures the essential topics discussed, decisions made, and the overall scope of the meeting, such as infrastructure updates, budget approvals, and key community concerns.

Summary: A brief consolidation of the main points and outcomes from the meeting. The summary encapsulates the flow of the meeting, including major tasks, decisions, and action points, along with any significant challenges or risks highlighted, offering a concise review of the meeting's results.

Format your response as JSON with the following structure:
{
  "name": "Meeting Title",
  "description": "Brief meeting description",
  "summary": "Detailed meeting summary",
  "breakdown": {
    "Tasks": [{"task": "task description", "owner": "person name", "due_date": "date"}],
    "Decisions": [{"decision": "decision made", "details": "additional context"}],
    "Questions": [{"question": "question asked", "status": "answered/unanswered", "answer": "answer if available"}],
    "Insights": [{"insight": "insight description", "reference": "context"}],
    "Deadlines": [{"deadline": "deadline description", "related_to": "related item"}],
    "Attendees": [{"name": "person name", "role": "their role"}],
    "Follow-ups": [{"follow_up": "follow-up item", "owner": "responsible person", "due_date": "date"}],
    "Risks": [{"risk": "risk description", "impact": "potential impact"}]
  }
}`
            },
            {
              text: `Transcript: ${limitedTranscript}`
            }
          ]
        }
      ]
    });
    
    const response = await result.response;
    const responseText = response.text();
    
    console.log("Raw Gemini response:", responseText.substring(0, 500) + "...");
    
    // Try to parse the JSON response
    try {
      // Extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                      responseText.match(/({[\s\S]*})/);
      
      const jsonText = jsonMatch ? jsonMatch[1] : responseText;
      const parsedResponse = JSON.parse(jsonText);
      
      console.log("Extracted name:", parsedResponse.name);
      console.log("Extracted description:", parsedResponse.description);
      
      return {
        name: parsedResponse.name || "Untitled Meeting",
        description: parsedResponse.description || "No description provided.",
        summary: parsedResponse.summary || "Summary not generated",
        breakdown: parsedResponse.breakdown || {
          Tasks: [],
          Decisions: [],
          Questions: [],
          Insights: [],
          Deadlines: [],
          Attendees: [],
          "Follow-ups": [],
          Risks: []
        }
      };
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      console.log("Raw response:", responseText);
      
      // Return a default structure if parsing fails
      return {
        name: "Untitled Meeting",
        description: "Could not generate description from transcript. Please review directly.",
        summary: "Could not generate summary from transcript. Please review the transcript directly.",
        breakdown: {
          Tasks: [{ task: "Review transcript manually", owner: "Team", due_date: "" }],
          Decisions: [{ decision: "See transcript for details", details: "Manual review needed" }],
          Questions: [{ question: "Review transcript for questions", status: "Pending", answer: "" }],
          Insights: [{ insight: "Manual analysis needed", reference: "Transcript" }],
          Deadlines: [{ deadline: "Review transcript promptly", related_to: "Meeting follow-up" }],
          Attendees: [{ name: "Meeting participants", role: "See transcript" }],
          "Follow-ups": [{ follow_up: "Process transcript manually", owner: "Team", due_date: "" }],
          Risks: [{ risk: "Missing important details", impact: "Information loss" }]
        }
      };
    }
  } catch (error) {
    console.error("Error with Gemini API:", error);
    
    // Return a fallback structure if API call fails
    return {
      name: "Untitled Meeting",
      description: "Failed to generate description. Please review the transcript directly.",
      summary: "Failed to generate summary. Please review the transcript directly.",
      breakdown: {
        Tasks: [], Decisions: [], Questions: [], Insights: [],
        Deadlines: [], Attendees: [], "Follow-ups": [], Risks: []
      }
    };
  }
}

// Add test function after analyzeTranscript function
async function testTranscript() {
  const transcript = `Okay, thank you. This is a meeting of the RM of Springfield for July to 16th of 2024 at exactly 6 p.m. calling the meeting to order. We will, I'll do introduction here. I'm Mayor Patrick Tarry for the RM of Springfield. We have Christy Grunheide at the Assistant CEOs at the Controls. Our CEO calling Draper is present. Deputy Mayor, to my right in the descending order, and Councilor Ward 1 is Glen Fuel. Counselor Ward 2 is Andy Kaczynski. Counselor Ward 3 is Mark Miller. Counselor Ward 4 is Melinda Warren. Melinda, if you want to do invocation. May we all enter into the meeting with open ears and open minds, sharing our knowledge and experience while working together for the betterment of our municipality. Thank you. very much. Then I'll do the land acknowledgement. The Army of Springfield acknowledges that we are gathered on essential lands. Treaty 1 territory, traditional territory, the Nishinavi, Kree, Oji, Kri, Dakota, Dene, people on the national homeland and on the national homeland of the Red River, Métis. That is item number three, and item number four is approval of the agenda. Can I get a mover in a second or for that, please? Melinda and Glenn. Any questions, additions? or modifications to the agenda? Mark? Anything else? Anything else? I see none. Then can I get to show hands of those in support of the approval of the agenda? Enanimous and is carried. A mover and a seconder for the adoption of the minutes. It's Patrick and Andy. Any questions, additions from Council on adoption of the minutes for July 2nd? I see none. Show of hands. Those in support. It is carried. We have a question period. Nobody's in front of us here. We have 15 minutes allocated. It's the only question pertaining to the current agenda online. I see nobody online as well So at this point here we carry on to consent agenda That item number 10 Oh, sorry. Tammy, did you have anything for a question period at all? I just saw you coming in. Okay. Then what we'll do, we'll get to consent agenda. That's item number 10. I have comments for 10.2 and 10.3, so I'm not sure we can actually do the consent agenda there. So if I can do the first one, 10.1, the AMM News bulletin. Can I move her in a second or for that, please? Mark and Glenn. So any questions with regards to that from council? I see none. If I can get a show of hands of those in support, unanimous and is carried. The next one is 10.2. That's Stars. Can I get a mover in a sector for that? Patrick and Glenn. I had a comment here there. I'm a big proponent for Stars. This is a vital component for our healthcare. I've had firsthand experience with Stars in Manitoba Air Ambulins is in the North. Many communities in the North rely on air amylins provided by the government either via airport, helicopter, and air ambulance, a propeller or a jet. When there's babies involved, an adult alike, this is an extremely good tool for the health department and has been utilized in the RM Springfield. And that's all I had to say with regards to that. Can I get a mover or I show hands of those in support of stars? That is unanimous and is carried. then if we can get to the thank you card of the SCI grad recipients, a mover in a seconder for 10.3, please. Melinda and Andy. At this point here, we have the card from Layla Plant there. We increased the amount to $750 from $500, and which I think was an exceptional idea from our deputy mayor to increase that because most of the honorary bursaries and so on are at that 750 level. And I not saying that we have to match costs there but it was really well received The SCI staff principal Kevin Dell extremely large crowd present as every year and their families at the Club Regent Casino, which is an impressive facility, but still not in our community. So it'll be nice to have the grad eventually be here at our new recreational facility, which requires our new water treatment plant to be able to operate and provide our community going forward. So appreciate the card from from Layla. That's very well done. Any other questions or comments from council at all? I see none. Can I get to show hands of those in support of 10.3? Thank you, card. It's unanimous and is carried. We'll get to a new business there, and that's the purchase of the asphalt pot box trailer, mover and a seconder for that, please. Linda and Andy. Any questions from council with regard to this. Do you have your hand up, honey? Yes, Mr. Mayor. I would like to ask if we purchasing ourselves or are we using that company that helping purchase equipment through AMM or canoe? Yeah. Do they can help us with purchasing equipment? We never use them like purchasing the trucks for our fire department. chassis and police car. I believe the director of public works is online, but I honestly don't think that the industrial machine ink is part of that canoe procurement. They have to be a listed supplier. So maybe Blaine, if you're able to confirm if that's an opportunity through canoe procurement or not. Yeah, yeah, we did look into seeing if that was a listed company, and I don't believe they were. So I'm not 100% sure if there was any advantages for the municipality for canoe in this equipment purchase. Thank you. Any other questions from council at all? I see none. then if I can read the resolution It resolved that counsel of the Arm of Springfield approves the purchase of one new asphalt hotbox trailer from Industrial Machine Inc not to exceed the budgeted amount of $155,000, including taxes with funds coming from the vehicle and equipment reserve. I got to show hands first in support of purchase of asphalt hotbox trailer. That's Melinda. That's unanimous and it is carried. Then we'll get to 11.2, the purchase of a rehab trailer, or specifically a rehabilitation trailer for the private department. Move on a second or for that place. Patrick and Glenn. Be it resolved that Council of the Armis Springfield approves the purchase of one new rehabilitation trailer from ProPAC for $59,630.27 U.S. plus applicable taxes, transport fees, and broker fees with funds to come from the vehicle and equipment reserve. Are we able to amend the resolution to show Canadian funds beside it there? I think it's $80,000. It's $59,000, $37.20. U.S. But when we write the check, we have to get the exact U.S. amount on that day of the check rating. Oh, so that will change. It could change from what's being proposed right now, Canadian. Okay. All right. I understand that. Can I get to show any questions from council with regards to that? I see none. Can I get to show hands those in support of the purchase of rehabilitation trailer? That is unanimous and it is carried. 11.3, that's financial statements. Move on a seconder, please. Melinda, Mark. I had one question with regards to financial statements. It says here basically regards to notes to financial statements of May 31, 24. The tax levy and grants in lieu have been collected, which accounts for our deficit. Can we have some clarification on this? So there's no misinformation with regards to that. So we're still waiting for the tax levy and the grants to come through. Are they delayed for any reasons?`;
  
  const result = await analyzeTranscript(transcript);
  console.log('Test Result:', JSON.stringify(result, null, 2));
}

// Export the test function
export { testTranscript };

// POST handler for processing a meeting transcript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    // Get the meeting
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        rawTranscript: true,
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    if (!meeting.rawTranscript || meeting.rawTranscript.trim() === '') {
      return NextResponse.json({ error: 'Meeting has no transcript to process' }, { status: 400 });
    }

    console.log("Processing transcript for meeting:", id);
    
    // Process the transcript
    const result = await analyzeTranscript(meeting.rawTranscript);
    
    // Generate topic segmentation
    console.log('Generating topic segmentation for meeting:', id);
    let topicSegmentationData = null;
    try {
      const segmentTopicsModule = await import('@/lib/segment-topics');
      topicSegmentationData = await segmentTopicsModule.segmentTopics(meeting.rawTranscript);
      console.log('Topic segmentation complete');
    } catch (error) {
      console.error('Error generating topic segmentation:', error);
      // Continue with the process even if topic segmentation fails
    }
    
    // Parse the result to create related records
    const taskCreate = result.breakdown?.Tasks.map(task => ({
      task: task.task || '',
      owner: task.owner || '',
      dueDate: task.due_date ? new Date(task.due_date) : null,
      meetingId: id
    })) || [];

    // Update the meeting with the processed data
    const updatedMeeting = await prisma.meeting.update({
      where: { id },
      data: {
        name: result.name || meeting.name,
        description: result.description || meeting.description,
        summary: result.summary,
        // Add topic segmentation if available
        ...(topicSegmentationData && {
          topicSegmentation: JSON.stringify(topicSegmentationData)
        }),
        tasks: {
          deleteMany: {},
          create: taskCreate
        },
        decisions: {
          deleteMany: {},
          create: result.breakdown?.Decisions.map(decision => ({
            meetingId: id,
            decision: decision.decision,
            date: new Date().toISOString(), // Default to current date
          })) || []
        },
        questions: {
          deleteMany: {},
          create: result.breakdown?.Questions.map(question => ({
            meetingId: id,
            question: question.question,
            status: question.status,
            answer: question.answer || '',
          })) || []
        },
        insights: {
          deleteMany: {},
          create: result.breakdown?.Insights.map(insight => ({
            meetingId: id,
            insight: insight.insight,
            reference: insight.reference,
          })) || []
        },
        deadlines: {
          deleteMany: {},
          create: result.breakdown?.Deadlines.map(deadline => ({
            meetingId: id,
            description: deadline.deadline,
            dueDate: null, // Parse date if available
          })) || []
        },
        attendees: {
          deleteMany: {},
          create: result.breakdown?.Attendees.map(attendee => ({
            meetingId: id,
            name: attendee.name,
            role: attendee.role,
          })) || []
        },
        followUps: {
          deleteMany: {},
          create: result.breakdown?.["Follow-ups"].map(followUp => ({
            meetingId: id,
            description: followUp.follow_up,
            owner: followUp.owner,
          })) || []
        },
        risks: {
          deleteMany: {},
          create: result.breakdown?.Risks.map(risk => ({
            meetingId: id,
            risk: risk.risk,
            impact: risk.impact,
          })) || []
        }
      },
    });
    
    console.log("Updated meeting record with name:", updatedMeeting.name);

    return NextResponse.json({ 
      message: 'Transcript processed successfully',
      name: updatedMeeting.name,
      description: updatedMeeting.description,
      summary: updatedMeeting.summary
    }, { status: 200 });
  } catch (error) {
    console.error('Error processing transcript:', error);
    return NextResponse.json({ error: 'Failed to process transcript' }, { status: 500 });
  }
} 