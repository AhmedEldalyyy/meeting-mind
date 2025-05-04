'use client';

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { useRouter } from 'next/navigation';
import { ArrowLeft, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import CategoryCard from "@/components/CategoryCard";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  CheckSquare,
  GanttChartSquare,
  HelpCircle,
  LightbulbIcon,
  CalendarClock,
  Users2,
  ListTodo,
  AlertOctagon,
  ClipboardCheck,
  Megaphone,
  BrainCircuit,
  Clock,
  UserRound,
  ClipboardList,
  ShieldAlert
} from "lucide-react";

interface MeetingData {
  id: string;
  name: string;
  description: string;
  transcript?: string;
  rawTranscript?: string;
  summary: string;
  breakdown?: {
    Tasks: { task: string; owner: string; dueDate: string }[];
    Decisions: { decision: string; date: string }[];
    Questions: { question: string; status: string; answer?: string }[];
    Insights: { insight: string; reference: string }[];
    Deadlines: { description: string; dueDate: string }[];
    Attendees: { name: string; role: string }[];
    "Follow-ups": { description: string; owner: string }[];
    Risks: { risk: string; impact: string }[];
  };
}

export default function MeetingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id as string;
  const [data, setData] = useState<MeetingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { isTeamLeader } = useAuth();
  const [localBreakdown, setLocalBreakdown] = useState<any>(null);
  const [focusedCategory, setFocusedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (meetingId) {
      axios
        .get(`/api/meetings/${meetingId}`)
        .then((response) => {
          setData({ 
            ...response.data,
            id: meetingId,
            summary: response.data.summary || "No summary available."
          });
          
          setLocalBreakdown(response.data.breakdown || {
            Tasks: [],
            Decisions: [],
            Questions: [],
            Insights: [],
            Deadlines: [],
            Attendees: [],
            "Follow-ups": [],
            Risks: []
          });
        })
        .catch((error) => {
          console.error("Error fetching meeting details:", error);
          if (error.response && error.response.status === 404) {
            setError("Meeting not found.");
          } else {
            setError(`Failed to fetch meeting details: ${error.message || 'Unknown error'}`);
          }
        });
    }
  }, [meetingId]);

  const handleGoBack = () => {
    router.push(`/dashboard/meeting/${meetingId}`);
  };

  // Function to handle clicking on a category
  const handleCategoryClick = (categoryTitle: string) => {
    setFocusedCategory(categoryTitle);
  };

  // Function to close the focused view
  const closeFocusedView = () => {
    setFocusedCategory(null);
  };

  // Define categories for rendering
  const categories = localBreakdown ? [
    { 
      title: "Tasks", 
      icon: ClipboardCheck, 
      items: localBreakdown.Tasks, 
      gridSpan: "col-span-1 lg:col-span-2" 
    },
    { 
      title: "Decisions", 
      icon: GanttChartSquare, 
      items: localBreakdown.Decisions, 
      gridSpan: "col-span-1 lg:col-span-2" 
    },
    { 
      title: "Questions", 
      icon: HelpCircle, 
      items: localBreakdown.Questions, 
      gridSpan: "col-span-1 lg:col-span-2" 
    },
    { 
      title: "Insights", 
      icon: BrainCircuit, 
      items: localBreakdown.Insights, 
      gridSpan: "col-span-1 lg:col-span-2" 
    },
    { 
      title: "Deadlines", 
      icon: CalendarClock, 
      items: localBreakdown.Deadlines?.map(item => ({
        description: item.description,
        dueDate: item.dueDate
      })) || [], 
      gridSpan: "col-span-1" 
    },
    { 
      title: "Attendees", 
      icon: UserRound, 
      items: localBreakdown.Attendees, 
      gridSpan: "col-span-1"
    },
    { 
      title: "Follow-ups", 
      icon: ClipboardList, 
      items: localBreakdown["Follow-ups"]?.map(item => ({
        description: item.description,
        owner: item.owner
      })) || [], 
      gridSpan: "col-span-1" 
    },
    { 
      title: "Risks", 
      icon: ShieldAlert, 
      items: localBreakdown.Risks, 
      gridSpan: "col-span-1" 
    },
  ] : [];

  // Find the focused category data
  const focusedCategoryData = categories.find(cat => cat.title === focusedCategory);

  if (error) {
    return (
      <div className="min-h-screen bg-background dark:bg-gradient-black noise-bg">
        <div className="fixed w-40 h-40 -top-20 -left-20 bg-primary/5 rounded-full blur-3xl z-0"></div>
        <div className="fixed w-60 h-60 top-1/3 -right-32 bg-primary/5 rounded-full blur-3xl z-0"></div>
        <div className="container mx-auto p-6 relative z-10">
          <Button
            onClick={() => router.push('/dashboard')}
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

  if (!data || !localBreakdown) {
    return (
      <div className="min-h-screen bg-background dark:bg-gradient-black noise-bg">
        <div className="fixed w-40 h-40 -top-20 -left-20 bg-primary/5 rounded-full blur-3xl z-0"></div>
        <div className="fixed w-60 h-60 top-1/3 -right-32 bg-primary/5 rounded-full blur-3xl z-0"></div>
        <div className="container mx-auto p-6 relative z-10">
          <Button
            onClick={() => router.push('/dashboard')}
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

  return (
    <div className="min-h-screen bg-background dark:bg-gradient-black noise-bg">
      <div className="fixed w-40 h-40 -top-20 -left-20 bg-indigo-500/5 rounded-full blur-3xl z-0"></div>
      <div className="fixed w-60 h-60 top-1/3 -right-32 bg-violet-500/5 rounded-full blur-3xl z-0"></div>
      <div className="fixed w-80 h-80 bottom-20 left-40 bg-purple-500/5 rounded-full blur-3xl z-0"></div>
      
      <div className="container mx-auto p-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <Button
            onClick={handleGoBack}
            variant="secondary"
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Meeting Summary
          </Button>
          
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
            {data.name} - Details
          </h1>
        </div>
        
        <div className="mb-6 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            View and manage all categorized information extracted from your meeting. Click on any section to focus on it.
          </p>
        </div>
        
        <AnimatePresence mode="wait">
          {focusedCategory ? (
            // Focused view for a single category
            <motion.div 
              key="focused-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="animate-in fade-in"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {focusedCategoryData?.title} Details
                </h2>
                <Button 
                  variant="outline" 
                  onClick={closeFocusedView}
                  className="flex items-center"
                >
                  <X className="w-4 h-4 mr-2" />
                  Close View
                </Button>
              </div>
              
              <Card className="shadow-contrast-dark border-border/50 group hover:shadow-lg transition-all duration-300 overflow-hidden relative">
                <div className={`absolute inset-0 bg-gradient-to-r opacity-5 from-indigo-600/5 via-violet-600/5 to-purple-600/5 group-hover:opacity-10 transition-opacity duration-500`}></div>
                <div className="absolute -right-12 -top-12 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
                <div className="absolute -left-12 -bottom-12 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl"></div>
                
                <CardHeader className="border-b border-border/50 relative z-10 pb-3">
                  <div className="flex items-center gap-3">
                    {focusedCategoryData?.icon && (
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br shadow-md flex items-center justify-center from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 transition-all duration-300`}>
                        <focusedCategoryData.icon className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <CardTitle className="text-lg font-bold bg-gradient-to-r bg-clip-text text-transparent from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">
                      {focusedCategoryData?.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 relative z-10">
                  <ScrollArea className="h-[500px] pr-4">
                    {focusedCategoryData?.items.length === 0 ? (
                      <p className="text-muted-foreground p-4 text-center">No items available in this category.</p>
                    ) : (
                      <div className="space-y-4">
                        {focusedCategoryData?.items.map((item, index) => (
                          <div key={index} className="bg-card/50 dark:bg-black/20 p-6 rounded-lg border border-border/30 hover:border-primary/20 transition-all duration-300 hover:shadow-md">
                            <div className="flex items-center gap-1.5 opacity-70 mb-3 pb-2 border-b border-border/20">
                              <span className="text-xs uppercase tracking-wider font-medium">Item {index + 1}</span>
                              <div className="ml-auto h-5 w-5 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 flex items-center justify-center">
                                <CheckSquare className="w-3 h-3 text-white" />
                              </div>
                            </div>
                            {Object.entries(item).map(([key, value]) => {
                              const formattedKey = key
                                .split(/(?=[A-Z])/)
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ');
                              
                              return (
                                <div key={key} className="mb-3 last:mb-0 pb-2 last:pb-0 border-b last:border-0 border-border/10">
                                  <span className="block mb-1 text-base font-semibold text-indigo-600 dark:text-indigo-400">{formattedKey}:</span> 
                                  <span className="text-foreground/90 text-lg pl-2">{value}</span>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            // Grid view showing all categories
            <motion.div 
              key="grid-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="animate-in fade-in duration-700"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {categories.map((category, index) => (
                  <motion.div
                    key={category.title}
                    className={category.gridSpan}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    onClick={() => handleCategoryClick(category.title)}
                  >
                    <div className="cursor-pointer transform transition-transform hover:scale-[1.02] active:scale-[0.98]">
                      <CategoryCard
                        title={category.title}
                        items={category.items}
                        gridSpan={category.gridSpan}
                        icon={category.icon}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 