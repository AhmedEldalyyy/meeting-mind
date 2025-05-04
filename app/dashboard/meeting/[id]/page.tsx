'use client';

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import MeetingDetails from "@/components/MeetingDetails";
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import NotificationBell from '@/components/ui/NotificationBell';

// Define User structure for team members and assignees
interface SimpleUser {
  id: string;
  name: string;
}

interface MeetingTask {
  id: string; // Add id to task
  task: string;
  owner: string; // Original owner from transcript
  dueDate: string;
  status: string;
  assigneeId?: string | null; // Add assigneeId
  assignee?: SimpleUser | null; // Add assignee details
  approvalStatus?: string | null; // Add approvalStatus
  comments?: string | null; // Add comments
}

interface MeetingData {
  id: string;
  name: string;
  description: string;
  transcript?: string;
  rawTranscript?: string;
  summary: string;
  topicSegmentation?: {
    totalTopics: number;
    estimatedDuration: string;
    topics: {
      id: number;
      title: string;
      startPoint: string;
      endPoint: string;
      summary: string;
      keySpeakers: string[];
      estimatedMinutes: number;
    }[];
  };
  team?: { // Add team details including members
    id: string;
    name: string;
    members: SimpleUser[];
  };
  breakdown?: {
    Tasks: MeetingTask[]; // Use the new MeetingTask interface
    Decisions: { decision: string; details: string }[];
    Questions: { question: string; status: string; answer?: string }[];
    Insights: { insight: string; reference: string }[];
    Deadlines: { deadline: string; related_to: string }[];
    Attendees: { name: string; role: string }[];
    "Follow-ups": { follow_up: string; owner: string; due_date: string }[];
    Risks: { risk: string; impact: string }[];
  };
  // Add raw tasks from the backend query
  tasks: MeetingTask[]; 
}

export default function MeetingPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id as string;
  const [data, setData] = useState<MeetingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("Fetching meeting details for ID:", meetingId);
    if (meetingId) {
      axios
        .get(`/api/meetings/${meetingId}`)
        .then((response) => {
          console.log("Received meeting data:", response.data);
          console.log("Meeting name:", response.data.name);
          console.log("Meeting description:", response.data.description);
          console.log("Summary:", response.data.summary);
          console.log("Transcript:", response.data.transcript ? response.data.transcript.substring(0, 100) + "..." : 
                     (response.data.rawTranscript ? response.data.rawTranscript.substring(0, 100) + "..." : "No transcript"));
          
          if (response.data.breakdown) {
            console.log("Breakdown data available:", Object.keys(response.data.breakdown).join(", "));
            Object.keys(response.data.breakdown).forEach(key => {
              console.log(`${key}: ${response.data.breakdown[key].length} items`);
            });
          } else {
            console.log("No breakdown data available");
          }
          
          setData({ 
            ...response.data,
            id: meetingId,
            // Ensure summary has a value
            summary: response.data.summary || "No summary available.",
            // Parse topicSegmentation if it exists
            topicSegmentation: response.data.topicSegmentation 
              ? (() => {
                  try {
                    return JSON.parse(response.data.topicSegmentation);
                  } catch (e) {
                    console.error('Error parsing topicSegmentation:', e);
                    return undefined;
                  }
                })()
              : undefined,
            // Ensure transcript field exists (use rawTranscript if transcript is missing)
            transcript: response.data.transcript || response.data.rawTranscript || ""
          });
        })
        .catch((error) => {
          console.error("Error fetching meeting details:", error);
          if (error.response) {
            console.error("Error response:", error.response.data);
            console.error("Status code:", error.response.status);
          }
          if (error.response && error.response.status === 404) {
            setError("Meeting not found.");
          } else {
            setError(`Failed to fetch meeting details: ${error.message || 'Unknown error'}`);
          }
        });
    }
  }, [meetingId]);

  const handleGoBack = () => {
    router.push('/dashboard');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background dark:bg-gradient-black noise-bg">
        <div className="fixed w-40 h-40 -top-20 -left-20 bg-primary/5 rounded-full blur-3xl z-0"></div>
        <div className="fixed w-60 h-60 top-1/3 -right-32 bg-primary/5 rounded-full blur-3xl z-0"></div>
        <div className="container mx-auto p-6 relative z-10">
          <Button
            onClick={handleGoBack}
            variant="outline"
            className="mb-6 flex items-center"
          >
            <ArrowLeft className="mr-2" size={16} />
            Back to Dashboard
          </Button>
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/30">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background dark:bg-gradient-black noise-bg">
        <div className="fixed w-40 h-40 -top-20 -left-20 bg-primary/5 rounded-full blur-3xl z-0"></div>
        <div className="fixed w-60 h-60 top-1/3 -right-32 bg-primary/5 rounded-full blur-3xl z-0"></div>
        <div className="container mx-auto p-6 relative z-10">
          <Button
            onClick={handleGoBack}
            variant="outline"
            className="mb-6 flex items-center"
          >
            <ArrowLeft className="mr-2" size={16} />
            Back to Dashboard
          </Button>
          <div className="flex justify-center items-center h-[60vh]">
            <div className="text-center">
              <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading meeting details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log("Rendering MeetingDetails with data:", data);
  return (
    <div className="min-h-screen bg-background dark:bg-gradient-black noise-bg">
      <div className="fixed w-40 h-40 -top-20 -left-20 bg-indigo-500/5 rounded-full blur-3xl z-0"></div>
      <div className="fixed w-60 h-60 top-1/3 -right-32 bg-violet-500/5 rounded-full blur-3xl z-0"></div>
      <div className="fixed w-80 h-80 bottom-20 left-40 bg-purple-500/5 rounded-full blur-3xl z-0"></div>
      
      <div className="container mx-auto p-6 relative z-10">
        <div className="flex justify-between items-center mb-6">
        <Button
          onClick={handleGoBack}
          variant="secondary"
            className="flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
          <NotificationBell />
        </div>
        <MeetingDetails data={data} />
      </div>
    </div>
  );
}
