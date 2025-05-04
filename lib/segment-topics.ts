import { GoogleGenerativeAI } from '@google/generative-ai';

// Function to segment transcript into topics using Gemini
export async function segmentTopics(transcript: string) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }

    console.log('Starting transcript topic segmentation with Gemini API');
    
    // Initialize the Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use gemini-1.5-pro model to avoid hallucination issues
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
              text: `I have a meeting transcript that I need to segment into distinct topics.

For each topic segment, I need:
1. A descriptive title (e.g., 'Q4 Budget Review')
2. The starting sentence or phrase where the topic begins, including the speaker (e.g., 'Alice: Let's discuss the budget.')
3. The ending sentence or phrase where the topic ends, including the speaker (e.g., 'Bob: Okay, moving on.')
4. A brief summary of what was discussed
5. The key speakers involved in that topic
6. Estimated time spent on the topic in minutes. If timestamps are available in the transcript, use them; otherwise, provide a rough estimate.

Guidelines:
- Each segment should represent a coherent discussion topic
- Identify natural transition points in the conversation, such as changes in subject or explicit statements like 'Let's move to the next item'
- Look for cue phrases that indicate a change in topic, such as 'Let's move on to,' 'Now, regarding,' or 'Next, we have'
- If the transcript mentions an agenda or lists specific items, use those as guides for segmentation
- Some topics might have subtopics; include them within the main topic's summary
- Focus on meaningful content, ignoring small talk or administrative comments
- Be specific with segment titles
- Aim for 3-10 major topic segments, adjusting based on the meeting's complexity
- Ensure all information is directly derived from the transcript; do not make up details

Format your response as JSON with the following structure:
{
  "totalTopics": number,
  "estimatedDuration": "total duration in minutes",
  "topics": [
    {
      "id": 1,
      "title": "Topic title",
      "startPoint": "First few words of where topic begins...",
      "endPoint": "Last few words of where topic ends...", 
      "summary": "Brief summary of the topic discussion",
      "keySpeakers": ["Speaker 1", "Speaker 2"],
      "estimatedMinutes": number
    },
    // Additional topics...
  ]
}`
            },
            {
              text: `Transcript: ${limitedTranscript}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2, // Lower temperature for more factual responses
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8000,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
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
      
      // Ensure the response has the expected structure
      const formattedResult = {
        totalTopics: parsedResponse.totalTopics || 0,
        estimatedDuration: parsedResponse.estimatedDuration || "Unknown",
        topics: Array.isArray(parsedResponse.topics) ? parsedResponse.topics.map((topic, index) => ({
          id: topic.id || index + 1,
          title: topic.title || "Untitled Topic",
          startPoint: topic.startPoint || "",
          endPoint: topic.endPoint || "",
          summary: topic.summary || "No summary available",
          keySpeakers: Array.isArray(topic.keySpeakers) ? topic.keySpeakers : [],
          estimatedMinutes: topic.estimatedMinutes || 0
        })) : []
      };
      
      console.log('Successfully parsed Gemini response');
      console.log(`Found ${formattedResult.totalTopics} topics`);
      
      return formattedResult;
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      console.log("Raw response:", responseText.substring(0, 500) + '...');
      
      // Return a default structure if parsing fails
      return {
        totalTopics: 0,
        estimatedDuration: "Unknown",
        topics: [
          {
            id: 1,
            title: "Error processing transcript",
            startPoint: "",
            endPoint: "",
            summary: "Failed to segment transcript into topics. Please review manually.",
            keySpeakers: [],
            estimatedMinutes: 0
          }
        ]
      };
    }
  } catch (error) {
    console.error("Error with Gemini API:", error);
    
    // Return a fallback structure if API call fails
    return {
      totalTopics: 0,
      estimatedDuration: "Unknown",
      topics: [
        {
          id: 1,
          title: "API Error",
          startPoint: "",
          endPoint: "",
          summary: "Failed to process transcript with the Gemini API. Please try again later.",
          keySpeakers: [],
          estimatedMinutes: 0
        }
      ]
    };
  }
} 