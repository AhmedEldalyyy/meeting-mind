'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Clock, Users, ArrowRightCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TopicSegmentationProps {
  meetingId: string;
  transcript?: string;
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
}

export default function TopicSegmentation({ 
  meetingId, 
  transcript,
  topicSegmentation 
}: TopicSegmentationProps) {
  const [loading, setLoading] = useState(false);
  const [segmentation, setSegmentation] = useState(topicSegmentation);
  const { toast } = useToast();

  // Remove the auto-generation effect
  // We only want to generate when user explicitly clicks the button
  
  // Update local state when prop changes
  useEffect(() => {
    setSegmentation(topicSegmentation);
  }, [topicSegmentation]);

  const segmentTopics = async () => {
    if (!transcript) {
      toast({
        title: "No transcript available",
        description: "A transcript is required to segment topics.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/meetings/${meetingId}/segment-topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to segment topics');
      }

      const data = await response.json();
      setSegmentation(data);
      toast({
        title: "Topics segmented successfully",
        description: `Found ${data.totalTopics} topics in the meeting.`,
      });
    } catch (error) {
      console.error('Error segmenting topics:', error);
      toast({
        title: "Error",
        description: "Failed to segment topics. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Topic Segmentation</span>
          {!segmentation && (
            <Button 
              onClick={segmentTopics} 
              disabled={loading || !transcript}
              variant="outline"
              size="sm"
            >
              {loading ? "Processing..." : "Generate Topics"}
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Break down the meeting into distinct topic segments
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="text-center py-6">
            <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Analyzing topics, please wait...</p>
          </div>
        )}
        {!loading && segmentation ? (
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <div>
                <span className="font-medium">Total Topics:</span> {segmentation.totalTopics}
              </div>
              <div>
                <span className="font-medium">Estimated Duration:</span> {segmentation.estimatedDuration}
              </div>
            </div>
            
            <Accordion type="single" collapsible className="w-full">
              {segmentation.topics.map((topic) => (
                <AccordionItem key={topic.id} value={`topic-${topic.id}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="font-medium text-left">{topic.title}</div>
                      <Badge variant="outline" className="ml-2">
                        <Clock className="h-3 w-3 mr-1" /> {topic.estimatedMinutes} min
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      <p className="text-sm">{topic.summary}</p>
                      
                      {topic.keySpeakers.length > 0 && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Users className="h-3 w-3 mr-1" />
                          <span>Key speakers: {topic.keySpeakers.join(", ")}</span>
                        </div>
                      )}
                      
                      <div className="border-t pt-2 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-start">
                          <span className="font-medium mr-1">Start:</span> 
                          <span className="italic">"{topic.startPoint}"</span>
                        </div>
                        <div className="flex items-start mt-1">
                          <span className="font-medium mr-1">End:</span> 
                          <span className="italic">"{topic.endPoint}"</span>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ) : !loading && (
          <div className="text-center py-6 text-muted-foreground">
            {transcript ? (
              <p>Click "Generate Topics" to segment this meeting into topics</p>
            ) : (
              <p>A transcript is required to segment topics</p>
            )}
          </div>
        )}
      </CardContent>
      {segmentation && (
        <CardFooter className="flex justify-end">
          <Button 
            variant="outline" 
            size="sm"
            onClick={segmentTopics}
            disabled={loading || !transcript}
          >
            Regenerate Topics
          </Button>
        </CardFooter>
      )}
    </Card>
  );
} 