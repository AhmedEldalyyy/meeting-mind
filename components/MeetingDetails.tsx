"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CheckCircle,
  Flag,
  AlertCircle,
  Lightbulb,
  Calendar,
  Users,
  List,
  AlertTriangle,
  FileText,
  Download,
  RefreshCw,
  Edit,
  Trash,
  Plus,
  X,
  Save,
  ChevronRight,
  User,
  Pencil,
  Trash2,
} from "lucide-react"
import CategoryCard from "@/components/CategoryCard"
import axios from "axios"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/contexts/AuthContext"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from 'next/navigation'
import TopicSegmentation from "@/app/components/TopicSegmentation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

interface CategoryItem {
  [key: string]: string
}

interface MeetingDetailsProps {
  data: {
    id: string
    name: string
    description: string
    transcript?: string
    rawTranscript?: string
    summary: string
    team?: { // Add team details including members
      id: string
      name: string
      members: SimpleUser[]; // Add members array
    }
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
    breakdown?: {
      Tasks: MeetingTask[]; // Use the new MeetingTask interface
      Decisions: { decision: string; date: string }[] // Use existing structure for others
      Questions: { question: string; status: string; answer?: string }[]
      Insights: { insight: string; reference: string }[]
      Deadlines: { description: string; dueDate: string }[]
      Attendees: { name: string; role: string }[]
      "Follow-ups": { description: string; owner: string }[]
      Risks: { risk: string; impact: string }[]
    }
    tasks: MeetingTask[]; // Add raw tasks from the backend query
  }
}

export default function MeetingDetails({ data }: MeetingDetailsProps) {
  const { toast } = useToast()
  const { user, isTeamLeader } = useAuth()

  console.log('MeetingDetails - User Role Check:', { userId: user?.id, isTeamLeader: isTeamLeader() });

  // Add a log to inspect the received team data
  console.log("MeetingDetails received team data in props:", JSON.stringify(data.team, null, 2));

  const [isEditing, setIsEditing] = useState<{[key: string]: boolean}>({})
  const [editingItem, setEditingItem] = useState<any>(null)
  const [newItem, setNewItem] = useState<any>(null)
  const [showAddDialog, setShowAddDialog] = useState<string | null>(null)
  const router = useRouter()
  
  // State to track selected assignee and edited due date for each task before saving
  const [assignmentState, setAssignmentState] = useState<{ [taskId: string]: string }>({});
  const [dueDateState, setDueDateState] = useState<{ [taskId: string]: string }>({}); // Added state for due dates
  const [isDeleting, setIsDeleting] = useState(false); // State for delete dialog
  const [taskToDelete, setTaskToDelete] = useState<MeetingTask | null>(null); // State for task to delete
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false); // State for create task dialog
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState<string | null>(null);
  const [showEditTaskDialog, setShowEditTaskDialog] = useState(false); // State for edit task dialog
  const [taskToEdit, setTaskToEdit] = useState<MeetingTask | null>(null); // State for task being edited
  const [editedTaskTitle, setEditedTaskTitle] = useState(""); // State for edited task title
  
  // Add form state for editing
  const [formState, setFormState] = useState<any>({})
  
  // Use raw tasks data passed in props
  const [localTasks, setLocalTasks] = useState(data.tasks || [])

  // Use localBreakdown instead of breakdown
  const [localBreakdown, setLocalBreakdown] = useState(data.breakdown || {
    Tasks: [],
    Decisions: [],
    Questions: [],
    Insights: [],
    Deadlines: [],
    Attendees: [],
    "Follow-ups": [],
    Risks: []
  })

  // Get transcript from either transcript or rawTranscript property
  const transcript = data.transcript || data.rawTranscript || '';

  // Use localBreakdown instead of breakdown
  const breakdown = localBreakdown;

  // Add debug logging to verify data structure
  console.log("MeetingDetails received data:", {
    name: data.name,
    description: data.description,
    transcript: transcript ? transcript.substring(0, 100) + "..." : "No transcript",
    summary: data.summary || "No summary",
    breakdownStructure: data.breakdown ? JSON.stringify(data.breakdown, null, 2) : "No breakdown"
  });

  // Define categories for rendering
  const categories = [
    { 
      title: "Tasks", 
      icon: CheckCircle, 
      items: breakdown.Tasks, 
      gridSpan: "col-span-2" 
    },
    { 
      title: "Decisions", 
      icon: Flag, 
      items: breakdown.Decisions, 
      gridSpan: "col-span-2" 
    },
    { 
      title: "Questions", 
      icon: AlertCircle, 
      items: breakdown.Questions, 
      gridSpan: "col-span-2" 
    },
    { 
      title: "Insights", 
      icon: Lightbulb, 
      items: breakdown.Insights, 
      gridSpan: "col-span-2" 
    },
    { 
      title: "Deadlines", 
      icon: Calendar, 
      items: breakdown.Deadlines.map(item => ({
        description: item.description,
        dueDate: item.dueDate
      })), 
      gridSpan: "col-span-1" 
    },
    { 
      title: "Attendees", 
      icon: Users, 
      items: breakdown.Attendees, 
      gridSpan: "col-span-1"
    },
    { 
      title: "Follow-ups", 
      icon: List, 
      items: breakdown["Follow-ups"].map(item => ({
        description: item.description,
        owner: item.owner
      })), 
      gridSpan: "col-span-1" 
    },
    { 
      title: "Risks", 
      icon: AlertTriangle, 
      items: breakdown.Risks, 
      gridSpan: "col-span-1" 
    },
  ]

  const handleExport = async () => {
    try {
      const response = await axios.get(`/api/meetings/${data.id}/export`, {
        responseType: 'blob',
      })

      if (response.status === 200) {
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `${data.name.replace(/\s+/g, '_')}_Details.docx`)
        document.body.appendChild(link)
        link.click()
        link.parentNode?.removeChild(link)
        toast({
          title: "Success",
          description: "Meeting details exported successfully!",
        })
      }
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to export meeting details.",
        variant: "destructive",
      })
    }
  }

  // Helper function to handle editing
  const handleEdit = (category: string, item: any, index: number) => {
    const newEditingItem = {...item, category, index};
    setEditingItem(newEditingItem);
    // Initialize form state with current item values
    setFormState(newEditingItem);
  };
  
  // Helper function to update form fields
  const updateFormField = (field: string, value: string) => {
    setFormState(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Helper function to handle item delete
  const handleDelete = async (category: string, index: number) => {
    try {
      // Create a copy of the breakdown
      const updatedBreakdown = {...localBreakdown};
      // Remove the item at the specified index
      updatedBreakdown[category] = [
        ...updatedBreakdown[category].slice(0, index),
        ...updatedBreakdown[category].slice(index + 1)
      ];
      
      // Update the meeting in the database
      await axios.put(`/api/meetings/${data.id}`, {
        breakdown: updatedBreakdown
      });
      
      // Update the local state
      setLocalBreakdown(updatedBreakdown);
      
      toast({
        title: "Success",
        description: `${category} item deleted successfully.`
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error",
        description: error.response?.data?.error || `Failed to delete ${category} item.`,
        variant: "destructive"
      });
    }
  };

  // Handler for Due Date change
  const handleDueDateChange = (taskId: string, dateValue: string) => {
    setDueDateState(prev => ({
      ...prev,
      [taskId]: dateValue
    }));
  };

  // Combined handler to save Task changes (Assignee and/or Due Date)
  const handleSaveTask = async (taskId: string) => {
    const selectedAssigneeId = assignmentState[taskId];
    const editedDueDate = dueDateState[taskId];

    const task = localTasks.find(t => t.id === taskId);
    if (!task) return; // Should not happen

    const currentAssigneeId = task.assigneeId;
    // Format existing dueDate for comparison (YYYY-MM-DD)
    const currentDueDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : undefined;

    const hasAssigneeChanged = selectedAssigneeId !== undefined && selectedAssigneeId !== (currentAssigneeId ?? 'unassigned');
    const hasDueDateChanged = editedDueDate !== undefined && editedDueDate !== currentDueDate;

    if (!hasAssigneeChanged && !hasDueDateChanged) {
      toast({ title: "No Changes", description: "Assignee and Due Date are unchanged.", variant: "default" });
      return;
    }

    const updateData: { assigneeId?: string | null; dueDate?: string | null } = {};

    if (hasAssigneeChanged) {
      updateData.assigneeId = selectedAssigneeId === 'unassigned' ? null : selectedAssigneeId;
    }
    if (hasDueDateChanged) {
      updateData.dueDate = editedDueDate; // Send date string directly
    }

    console.log(`Saving task ${taskId} with data:`, updateData);
    
    try {
      const response = await axios.patch(`/api/tasks/${taskId}`, updateData);

      if (response.status === 200) {
        // Update local state to reflect the change immediately
        setLocalTasks(prevTasks => 
          prevTasks.map(t => 
            t.id === taskId ? { 
              ...t, 
              assigneeId: response.data.assigneeId,
              assignee: response.data.assignee,
              dueDate: response.data.dueDate // Update dueDate from response
            } : t
          )
        );
        // Clear the pending states for this task
        setAssignmentState(prev => {
          const newState = { ...prev };
          delete newState[taskId];
          return newState;
        });
        setDueDateState(prev => {
          const newState = { ...prev };
          delete newState[taskId];
          return newState;
        });
        toast({ title: "Success", description: "Task updated successfully." });
      } else {
        throw new Error('Failed to update task - Status: ' + response.status);
      }
    } catch (error: any) {
      console.error("Failed to update task:", error);
      const errorMsg = error.response?.data?.error || "Failed to update task.";
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    }
  };

  // Helper function to add new item
  const handleAdd = async (category: string) => {
    try {
      if (!newItem) return;
      
      // Create a copy of the breakdown
      const updatedBreakdown = {...localBreakdown};
      
      // Add the new item
      updatedBreakdown[category] = [
        ...updatedBreakdown[category],
        newItem
      ];
      
      // Update the meeting in the database
      await axios.put(`/api/meetings/${data.id}`, {
        breakdown: updatedBreakdown
      });
      
      // Update the local state
      setLocalBreakdown(updatedBreakdown);
      setNewItem(null);
      setShowAddDialog(null);
      
      toast({
        title: "Success",
        description: `${category} item added successfully.`
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error",
        description: error.response?.data?.error || `Failed to add ${category} item.`,
        variant: "destructive"
      });
    }
  };

  // Helper function to navigate to details page
  const handleViewDetails = () => {
    router.push(`/dashboard/meeting/${data.id}/details`);
  };

  // Enhanced version of CategoryCard that includes editing functionality
  const EnhancedCategoryCard = ({ title, items, gridSpan }: any) => {
    const icon = categories.find(c => c.title === title)?.icon;
    
    return (
      <div className="h-full">
        <CategoryCard 
          title={title} 
          items={items} 
          gridSpan={gridSpan}
          icon={icon}
        />
      </div>
    );
  };

  // Handler for Select change
  const handleAssignmentChange = (taskId: string, assigneeId: string) => {
    setAssignmentState(prev => ({
      ...prev,
      [taskId]: assigneeId
    }));
  };

  // --- Edit Task Title Handlers ---
  const openEditDialog = (task: MeetingTask) => {
    setTaskToEdit(task);
    setEditedTaskTitle(task.task); // Pre-fill with current title
    setShowEditTaskDialog(true);
  };
  
  const handleUpdateTaskTitle = async () => {
    if (!taskToEdit || !editedTaskTitle) return;

    if (taskToEdit.task === editedTaskTitle) {
      setShowEditTaskDialog(false);
      return; // No change
    }

    try {
      const response = await axios.patch(`/api/tasks/${taskToEdit.id}`, { title: editedTaskTitle });

      if (response.status === 200) {
        const updatedTask = response.data; // API should return the updated task

        // Update local state
        setLocalTasks(prevTasks => prevTasks.map(task =>
          task.id === updatedTask.id ? updatedTask : task
        ));
        setLocalBreakdown(prevBreakdown => ({
          ...prevBreakdown,
          Tasks: prevBreakdown.Tasks.map(task =>
            task.id === updatedTask.id ? updatedTask : task
          )
        }));
        
        setShowEditTaskDialog(false);
        toast({ title: "Success", description: "Task title updated successfully." });
      } else {
        throw new Error('Failed to update task title - Status: ' + response.status);
      }
    } catch (error: any) {
      console.error("Failed to update task title:", error);
      const errorMsg = error.response?.data?.error || "Failed to update task title.";
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
      // Keep dialog open on error
    }
  };

  // --- Delete Handlers ---
  const openDeleteDialog = (task: MeetingTask) => {
    setTaskToDelete(task);
    setIsDeleting(true);
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await axios.delete(`/api/tasks/${taskToDelete.id}`);
      toast({ title: 'Success', description: 'Task deleted successfully.' });
      // Update local state to remove the task
      setLocalTasks(prevTasks => prevTasks.filter(task => task.id !== taskToDelete.id));
      // Update the breakdown state as well
      setLocalBreakdown(prevBreakdown => ({
        ...prevBreakdown,
        Tasks: prevBreakdown.Tasks.filter(task => task.id !== taskToDelete.id)
      }));
      setIsDeleting(false);
      setTaskToDelete(null);
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast({ title: 'Error', description: error.response?.data?.error || 'Failed to delete task.', variant: 'destructive' });
      setIsDeleting(false); 
      setTaskToDelete(null);
    }
  };

  // --- Create Task Handler ---
  const handleCreateTask = async () => {
    if (!newTaskTitle) {
      toast({ title: "Error", description: "Task title is required.", variant: "destructive" });
      return;
    }

    const payload = {
      title: newTaskTitle,
      dueDate: newTaskDueDate || null, // Send null if empty
      assigneeId: newTaskAssigneeId === 'unassigned' || !newTaskAssigneeId ? null : newTaskAssigneeId,
      meetingId: data.id, // Associate with the current meeting
      status: 'pending' // Default status for a new task
    };

    console.log("Creating task with payload:", payload);

    try {
      const response = await axios.post('/api/tasks', payload);
      if (response.status === 201) {
        toast({ title: "Success", description: "Task created successfully." });
        const createdTask = response.data; // Assuming API returns the created task

        // Update local state
        setLocalTasks(prevTasks => [...prevTasks, createdTask]);
        setLocalBreakdown(prevBreakdown => ({
          ...prevBreakdown,
          Tasks: [...prevBreakdown.Tasks, createdTask]
        }));

        // Close dialog and reset form
        setShowCreateTaskDialog(false);
        setNewTaskTitle("");
        setNewTaskDueDate("");
        setNewTaskAssigneeId(null);
      } else {
        throw new Error('Failed to create task - Status: ' + response.status);
      }
    } catch (error: any) {
      console.error("Failed to create task:", error);
      const errorMsg = error.response?.data?.error || "Failed to create task.";
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
      // Keep dialog open on error
    }
  };

  return (
    <div className="animate-in fade-in duration-700">
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{data.name}</h1>
              {/* Team indicator */}
              {data.team ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 shadow-sm">
                  <Users className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-xs font-medium bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
                    Team: {data.team.name}
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-500/10 border border-slate-500/20 shadow-sm">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-400">
                    Personal Meeting
                  </span>
                </div>
              )}
            </div>
            <p className="text-muted-foreground">{data.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleExport} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export as Document
            </Button>
          </div>
        </div>

        <Tabs defaultValue="summary">
          <TabsList className="mb-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            {/* Temporarily hidden for presentation
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="topics">Topic Segments</TabsTrigger>
            */}
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Meeting Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line">{data.summary}</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Temporarily hidden for presentation but functionality preserved */}
          <TabsContent value="breakdown" className="mt-0 hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map((category) => (
                <EnhancedCategoryCard
                  key={category.title}
                  title={category.title}
                  icon={category.icon}
                  items={category.items}
                  gridSpan={category.gridSpan}
                />
              ))}
            </div>
          </TabsContent>

          {/* Temporarily hidden for presentation but functionality preserved */}
          <TabsContent value="topics" className="mt-0 hidden">
            <TopicSegmentation 
              meetingId={data.id} 
              transcript={data.transcript || data.rawTranscript || ""}
              topicSegmentation={data.topicSegmentation}
            />
          </TabsContent>
          
          <TabsContent value="transcript" className="mt-0">
            <Card className="overflow-hidden">
              <CardHeader className="pb-0">
                <CardTitle>Meeting Transcript</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[50vh] overflow-auto border rounded-md p-4 my-2">
                  <div className="whitespace-pre-line font-mono text-sm">
                    {transcript || "No transcript available."}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* New visible Details tab content - Showing only Tasks directly in a table */}
          <TabsContent value="details" className="mt-0">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold tracking-tight">Tasks</h3>
                {isTeamLeader() && (
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // Reset form state when opening dialog
                      setNewTaskTitle("");
                      setNewTaskDueDate("");
                      setNewTaskAssigneeId(null);
                      setShowCreateTaskDialog(true);
                    }}
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4"/>
                    Add Task
                  </Button>
                )}
              </div>
              {localTasks.length === 0 ? (
                <p className="text-muted-foreground p-2">No tasks found for this meeting.</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground w-2/5">Task</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground w-1/5">Owner (Transcript)</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground w-1/5">Due Date</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground w-1/5">Assigned To</th>
                        {isTeamLeader() && (
                          <th className="px-4 py-3 text-center font-medium text-muted-foreground w-[150px]">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {localTasks.map((item) => {
                        // Format dates if needed
                        let formattedDueDate = item.dueDate;
                        let dateInputFormat = ''; // For date input value
                        if (item.dueDate && typeof item.dueDate === 'string') {
                          try {
                             // Format for display
                            const dateObj = new Date(item.dueDate);
                            formattedDueDate = dateObj.toLocaleDateString(); 
                            // Format for date input (YYYY-MM-DD)
                            dateInputFormat = dateObj.toISOString().split('T')[0];
                          } catch (e) {
                            formattedDueDate = item.dueDate; 
                            dateInputFormat = ''; // Clear if invalid
                          }
                        } else if (!item.dueDate) {
                           formattedDueDate = 'N/A'; 
                           dateInputFormat = '';
                        }

                        const currentAssigneeId = item.assigneeId;
                        const currentDueDate = item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : undefined;

                        const selectedAssigneeId = assignmentState[item.id];
                        const editedDueDate = dueDateState[item.id];

                        // Determine if changes are pending
                        const isAssigneeChanged = selectedAssigneeId !== undefined && selectedAssigneeId !== (currentAssigneeId ?? 'unassigned');
                        const isDueDateChanged = editedDueDate !== undefined && editedDueDate !== currentDueDate;
                        const hasPendingChanges = isAssigneeChanged || isDueDateChanged;

                        return (
                          <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                            <td className="px-4 py-3 align-top">{item.task || 'N/A'}</td>
                            <td className="px-4 py-3 align-top text-muted-foreground">{item.owner || 'N/A'}</td>
                            <td className="px-4 py-3 align-top"> { /* Due Date Column */}
                              {isTeamLeader() && (
                                <Input 
                                  type="date"
                                  className="w-full h-8 text-xs px-2"
                                  value={dueDateState[item.id] ?? dateInputFormat}
                                  onChange={(e) => handleDueDateChange(item.id, e.target.value)}
                                />
                              )}
                              {!isTeamLeader() && (
                                /* Styled display for members */
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-500/10 border border-slate-500/20 text-slate-300">
                                  <Calendar className="w-3 h-3 mr-1.5" /> 
                                  {formattedDueDate}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 align-top"> { /* Assignee Column */}
                              {isTeamLeader() && (
                                <Select 
                                  value={selectedAssigneeId ?? currentAssigneeId ?? "unassigned"}
                                  onValueChange={(value) => handleAssignmentChange(item.id, value)}
                                >
                                  <SelectTrigger className="w-full h-8 text-xs px-2">
                                    <SelectValue placeholder="Assign member..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {(membersToRender => {
                                        // console.log('Rendering SelectItems for members:', JSON.stringify(membersToRender, null, 2)); // Keep or remove outer log
                                        return membersToRender?.map(member => {
                                          // Log the specific ID being used as value just before rendering
                                          console.log(`Attempting to render SelectItem for member: ${member.name}, ID: ${member.id}, Type: ${typeof member.id}`); 
                                          return (
                                            <SelectItem key={member.id} value={member.id}> 
                                              {member.name}
                                            </SelectItem>
                                          );
                                        });
                                    })(
                                      data.team?.members
                                        ?.filter(member => !isTeamLeader || member.id !== user?.id) // Exclude leader
                                        ?.filter(member => member && typeof member.id === 'string' && member.id.trim() !== '') // Ensure valid ID
                                    )}
                                  </SelectContent>
                                </Select>
                              )}
                              {!isTeamLeader() && (
                                /* Styled display for members */
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                                   <User className="w-3 h-3 mr-1.5" /> {/* Assuming User icon is available */}
                                  {item.assignee?.name || <span className="italic">Unassigned</span>}
                                </span>
                              )}
                            </td>
                            {/* Actions Column - Apply conditional render to the entire cell */}
                            {isTeamLeader() && (
                              <td className="px-4 py-3 align-top text-center"> { /* Combined Actions Cell */} 
                                <div className="flex justify-center items-center space-x-1">
                                  {/* Save Assignee/Date Changes */} 
                                  <Button 
                                    size="sm" 
                                    variant="secondary" 
                                    className="h-7 text-xs px-2" 
                                    onClick={() => handleSaveTask(item.id)}
                                    disabled={!hasPendingChanges}
                                    title={hasPendingChanges ? "Save Assignee/Due Date" : "No changes to save"}
                                  >
                                    <Save className="h-3.5 w-3.5"/>
                                  </Button>
                                  {/* Edit Task Title Button */}
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    title="Edit Task"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                    onClick={() => openEditDialog(item)} // Open edit dialog
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  {/* Delete Task Button */} 
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    title="Delete Task"
                                    className="h-7 w-7 p-0 text-destructive/70 hover:text-destructive"
                                    onClick={() => openDeleteDialog(item)} // Open delete confirmation
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog for adding new Tasks */}
      <Dialog open={showAddDialog === "Tasks"} onOpenChange={(open) => !open && setShowAddDialog(null)}>
        <DialogContent className="sm:max-w-md shadow-contrast-dark border-border/50">
          <DialogHeader>
            <DialogTitle className="font-display">Add New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-2">
              <Label htmlFor="newTask">Task</Label>
              <Input
                id="newTask"
                defaultValue=""
                onChange={(e) => {
                  const newItemCopy = newItem || { task: "", owner: "", dueDate: "" };
                  setNewItem({...newItemCopy, task: e.target.value});
                }}
                placeholder="Enter task description"
                className="transition-soft shadow-soft dark:shadow-soft-dark"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newOwner">Owner</Label>
              <Input
                id="newOwner"
                defaultValue=""
                onChange={(e) => {
                  const newItemCopy = newItem || { task: "", owner: "", dueDate: "" };
                  setNewItem({...newItemCopy, owner: e.target.value});
                }}
                placeholder="Enter task owner"
                className="transition-soft shadow-soft dark:shadow-soft-dark"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newDueDate">Due Date</Label>
              <Input
                id="newDueDate"
                defaultValue=""
                onChange={(e) => {
                  const newItemCopy = newItem || { task: "", owner: "", dueDate: "" };
                  setNewItem({...newItemCopy, dueDate: e.target.value});
                }}
                placeholder="Enter due date"
                className="transition-soft shadow-soft dark:shadow-soft-dark"
              />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowAddDialog(null)} className="flex-1 sm:flex-initial transition-soft shadow-soft dark:shadow-soft-dark">Cancel</Button>
            <Button onClick={() => handleAdd("Tasks")} className="flex-1 sm:flex-initial transition-soft shadow-contrast-dark">Add Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for adding new Deadlines */}
      <Dialog open={showAddDialog === "Deadlines"} onOpenChange={(open) => !open && setShowAddDialog(null)}>
        <DialogContent className="sm:max-w-md shadow-contrast-dark border-border/50">
          <DialogHeader>
            <DialogTitle className="font-display">Add New Deadline</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-2">
              <Label htmlFor="newDescription">Description</Label>
              <Input
                id="newDescription"
                defaultValue=""
                onChange={(e) => {
                  const newItemCopy = newItem || { description: "", dueDate: "" };
                  setNewItem({...newItemCopy, description: e.target.value});
                }}
                placeholder="Enter deadline description"
                className="transition-soft shadow-soft dark:shadow-soft-dark"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newDeadlineDueDate">Due Date</Label>
              <Input
                id="newDeadlineDueDate"
                defaultValue=""
                onChange={(e) => {
                  const newItemCopy = newItem || { description: "", dueDate: "" };
                  setNewItem({...newItemCopy, dueDate: e.target.value});
                }}
                placeholder="Enter due date"
                className="transition-soft shadow-soft dark:shadow-soft-dark"
              />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowAddDialog(null)} className="flex-1 sm:flex-initial transition-soft shadow-soft dark:shadow-soft-dark">Cancel</Button>
            <Button onClick={() => handleAdd("Deadlines")} className="flex-1 sm:flex-initial transition-soft shadow-contrast-dark">Add Deadline</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent className="sm:max-w-md shadow-contrast-dark border-border/50">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete task "{taskToDelete?.task}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleting(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteTask}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={showCreateTaskDialog} onOpenChange={setShowCreateTaskDialog}>
        <DialogContent className="sm:max-w-lg shadow-contrast-dark border-border/50">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a new task related to this meeting.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newTaskTitle" className="text-right">
                Title
              </Label>
              <Input
                id="newTaskTitle"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="col-span-3"
                placeholder="Describe the task..."
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newTaskDueDate" className="text-right">
                Due Date
              </Label>
              <Input
                id="newTaskDueDate"
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newTaskAssignee" className="text-right">
                Assign To
              </Label>
              <Select 
                value={newTaskAssigneeId ?? "unassigned"}
                onValueChange={(value) => setNewTaskAssigneeId(value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Assign member..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {data.team?.members
                    ?.filter(member => member && typeof member.id === 'string' && member.id.trim() !== '') // Ensure valid ID
                    .map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTaskDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateTask}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={showEditTaskDialog} onOpenChange={setShowEditTaskDialog}>
        <DialogContent className="sm:max-w-lg shadow-contrast-dark border-border/50">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Edit the task title.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editedTaskTitle" className="text-right">
                Title
              </Label>
              <Input
                id="editedTaskTitle"
                value={editedTaskTitle}
                onChange={(e) => setEditedTaskTitle(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditTaskDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateTaskTitle}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
