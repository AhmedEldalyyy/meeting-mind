import { GoogleGenerativeAI } from '@google/generative-ai';

// Function to analyze transcript and extract data using Gemini
export async function analyzeTranscript(transcript: string) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }

    console.log('Starting transcript analysis with Gemini API');
    
    // Initialize the Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use gemini-2.5-pro-exp-03-25 model
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
              text: `Tasks: Tasks with varying priorities, owners, and due dates. Example task assignments include preparing reports, setting up meetings, and submitting proposals.
Decisions: Important decisions made during the meeting Decisions include vendor choice, marketing strategy, and budget approval.
Questions: Questions raised during the meeting, with their status (answered/unanswered). Answered questions include additional context in the form of answers.
Insights: Insights based on the conversation, ranging from sales performance to concerns about deadlines.Each insight refer back to the exact part of the conversation.
Deadlines: Upcoming deadlines related to the budget, product launch, and client presentation. This helps track time-sensitive matters.
Attendees: Attendees who attended the meeting This tracks attendance and their respective roles.
Follow-ups: Follow-up tasks assigned to individuals after the meeting, each with a due date. Follow-up items focus on clarifying budget, design, and scheduling next actions.
Risks: Risks identified during the meeting, each with potential impacts on the project. These include risks like budget overruns, delays, and potential staff turnover.
Description: A high-level overview of the meeting's purpose and key areas of focus. The description captures the essential topics discussed, decisions made, and the overall scope of the meeting, such as infrastructure updates, budget approvals, and key community concerns.
Summary: A brief consolidation of the main points and outcomes from the meeting. The summary encapsulates the flow of the meeting, including major tasks, decisions, and action points, along with any significant challenges or risks highlighted, offering a concise review of the meeting's results.


Format your response as JSON with the following structure:
{
  "name": "Meeting Title",
  "description": "Brief meeting description",
  "summary": "Detailed meeting summary",
  "breakdown": {
    "Tasks": [{"task": "task description", "owner": "person name", "dueDate": "date"}],
    "Decisions": [{"decision": "decision made", "date": "date of decision"}],
    "Questions": [{"question": "question asked", "status": "PENDING/ANSWERED", "answer": "answer if available"}],
    "Insights": [{"insight": "insight description", "reference": "context"}],
    "Deadlines": [{"description": "deadline description", "dueDate": "date"}],
    "Attendees": [{"name": "person name", "role": "their role"}],
    "Follow-ups": [{"description": "follow-up item", "owner": "responsible person"}],
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
    
    console.log('Received response from Gemini API, parsing result');
    
    // Try to parse the JSON response
    try {
      // Extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                     responseText.match(/({[\s\S]*})/);
      
      const jsonText = jsonMatch ? jsonMatch[1] : responseText;
      const parsedResponse = JSON.parse(jsonText);
      
      const result = {
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
      
      console.log('Successfully parsed Gemini response');
      console.log('Meeting name:', result.name);
      console.log('Description:', result.description.substring(0, 100) + '...');
      console.log('Summary:', result.summary.substring(0, 100) + '...');
      
      return result;
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      console.log("Raw response:", responseText.substring(0, 500) + '...');
      
      // Return a default structure if parsing fails
      return {
        name: "Untitled Meeting",
        description: "Could not generate description from transcript. Please review directly.",
        summary: "Could not generate summary from transcript. Please review the transcript directly.",
        breakdown: {
          Tasks: [{ task: "Review transcript manually", owner: "Team", dueDate: "" }],
          Decisions: [{ decision: "See transcript for details", date: "" }],
          Questions: [{ question: "Review transcript for questions", status: "Pending", answer: "" }],
          Insights: [{ insight: "Manual analysis needed", reference: "Transcript" }],
          Deadlines: [{ description: "Review transcript promptly", dueDate: "" }],
          Attendees: [{ name: "Meeting participants", role: "See transcript" }],
          "Follow-ups": [{ description: "Process transcript manually", owner: "Team" }],
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