'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter, 
  CardDescription
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  ArrowLeft, Clock, CheckCircle2, XCircle, Upload, ExternalLink, 
  Eye, MessageCircleWarning, Pencil, Trash2, MoreHorizontal, 
  Hourglass, AlertTriangle, Check,
  ClipboardList
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import axios from 'axios';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import NotificationBell from '@/components/ui/NotificationBell';

interface TaskProof {
  id: string;
  fileUrl: string;
  description: string | null;
  createdAt: string;
}

interface Task {
  id: string;
  task: string;
  owner: string;
  dueDate: string | null;
  status: string;
  meetingId: string;
  meetingName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  comments?: string | null;
  proofs?: TaskProof[];
}

const TasksPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading, isTeamLeader, isTeamMember } = useAuth();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofDescription, setProofDescription] = useState('');
  const [isViewingProof, setIsViewingProof] = useState(false);
  const [proofToView, setProofToView] = useState<TaskProof | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionComments, setRejectionComments] = useState('');
  const [taskToReject, setTaskToReject] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [editedTaskTitle, setEditedTaskTitle] = useState('');
  const [editedDueDate, setEditedDueDate] = useState<string>('');
  const [editedAssigneeId, setEditedAssigneeId] = useState<string>('');
  const [editedStatus, setEditedStatus] = useState<string>('');
  const [teamMembers, setTeamMembers] = useState<{id: string, name: string}[]>([]);
  
  // Function to fetch tasks based on user role
  const fetchTasks = async () => {
    try {
      const endpoint = isTeamLeader() ? '/api/tasks' : '/api/tasks/assigned';
      // console.log('Fetching tasks from endpoint:', endpoint);
      const response = await axios.get(endpoint);
      // console.log('Tasks response data:', JSON.stringify(response.data, null, 2));
      const tasksWithAssigneeName = response.data?.map((task: any) => {
        // console.log(`Processing task: ${task.id}, Assignee object: ${JSON.stringify(task.assignee)}, Extracted name: ${task.assignee?.name}`);
        return {
          ...task,
          assigneeName: task.assignee?.name,
          // Ensure proofs array is included if available from API
          proofs: task.proofs || [] 
        };
      }) || [];
      // console.log('Tasks processed for state:', JSON.stringify(tasksWithAssigneeName, null, 2));
      setTasks(tasksWithAssigneeName);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Detailed error info:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
        
        // Don't show error toast for 404 (no tasks) or auth issues
        if (error.response?.status !== 404 && error.response?.status !== 401) {
          toast({
            title: 'Error',
            description: error.response?.data?.error || 'Failed to fetch tasks.',
            variant: 'destructive',
          });
        }
      } else {
        console.error('Non-axios error:', error);
      }
      setTasks([]);
    }
  };
  
  // Updated handler for approving tasks
  const handleApproveTask = async (taskId: string) => {
    try {
      // Send 'APPROVE' action, backend sets status to COMPLETED
      await axios.patch(`/api/tasks/${taskId}/status`, { status: 'APPROVE' }); 
      toast({
        title: 'Success',
        description: `Task marked as Completed successfully.`,
      });
      fetchTasks();
    } catch (error) {
      console.error('Error completing task:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark task as completed.',
        variant: 'destructive',
      });
    }
  };

  // Updated handler for rejecting tasks
  const handleRejectTask = async () => {
    if (!taskToReject || !rejectionComments.trim()) return;
    try {
      // Send 'REJECT' action, backend sets status to NEEDS_REWORK
      await axios.patch(`/api/tasks/${taskToReject.id}/status`, { 
        status: 'REJECT', 
        comments: rejectionComments 
      });
      toast({
        title: 'Success',
        description: 'Task rejected and status set to Needs Rework.',
      });
      setIsRejecting(false);
      setTaskToReject(null);
      fetchTasks();
    } catch (error: any) {
      console.error('Error rejecting task:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to reject task.',
        variant: 'destructive',
      });
       // Keep dialog open on error
    }
  };
  
  // Handle file input change for task proof
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setProofFile(event.target.files[0]);
    }
  };
  
  // Handle uploading proof for a task (team members only)
  const handleUploadProof = async () => {
    if (!selectedTask || !proofFile) return;
    
    try {
      const formData = new FormData();
      formData.append('file', proofFile);
      formData.append('description', proofDescription);
      
      await axios.post(`/api/tasks/${selectedTask.id}/proof`, formData);
      
      toast({
        title: 'Success',
        description: 'Proof uploaded successfully.',
      });
      
      setProofFile(null);
      setProofDescription('');
      setIsUploadingProof(false);
      setSelectedTask(null);
      fetchTasks();
    } catch (error) {
      console.error('Error uploading proof:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload proof.',
        variant: 'destructive',
      });
    }
  };
  
  // View task details in the meeting context
  const handleViewTaskInMeeting = (meetingId: string) => {
    router.push(`/dashboard/meeting/${meetingId}`);
  };
  
  // Handle opening the proof view dialog
  const handleViewProof = (task: Task) => {
    // Ensure proofs exist and the first proof has a fileUrl
    if (task.proofs && task.proofs.length > 0 && task.proofs[0].fileUrl) {
      // Show the latest proof (assuming proofs are ordered desc by API)
      setProofToView(task.proofs[0]); 
      setSelectedTask(task); // Keep track of the task context
      setIsViewingProof(true);
    } else {
      toast({ title: "No Proof Available", description: "Proof may not have been submitted or is unavailable.", variant: "default" });
    }
  };
  
  // --- Delete Handlers ---

  const openDeleteDialog = (task: Task) => {
    setTaskToDelete(task);
    setIsDeleting(true);
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await axios.delete(`/api/tasks/${taskToDelete.id}`);
      toast({ title: 'Success', description: 'Task deleted successfully.' });
      setIsDeleting(false);
      setTaskToDelete(null);
      fetchTasks(); // Refresh task list
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast({ title: 'Error', description: error.response?.data?.error || 'Failed to delete task.', variant: 'destructive' });
      setIsDeleting(false); 
      setTaskToDelete(null);
    }
  };
  
  // Add a function to fetch team members for the assignee dropdown
  const fetchTeamMembers = async (teamId: string) => {
    try {
      const response = await axios.get(`/api/teams/${teamId}/members`);
      setTeamMembers(response.data);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch team members.',
        variant: 'destructive',
      });
    }
  };

  // Update the openEditDialog function
  const openEditDialog = (task: Task) => {
    setTaskToEdit(task);
    setEditedTaskTitle(task.task);
    setEditedDueDate(task.dueDate || '');
    setEditedAssigneeId(task.assigneeId || 'unassigned');
    setEditedStatus(task.status || 'OPEN'); // Default to OPEN if status missing
    setIsEditing(true);
    
    // If we have a meeting ID, fetch the team members for the assignee dropdown
    if (task.meetingId) {
      // We first need to get the team ID from the meeting
      axios.get(`/api/meetings/${task.meetingId}`)
        .then(response => {
          if (response.data.team?.id) {
            fetchTeamMembers(response.data.team.id);
          }
        })
        .catch(error => {
          console.error('Error fetching meeting details:', error);
        });
    }
  };

  // Update the handleUpdateTask function to include all edited fields
  const handleUpdateTask = async () => {
    if (!taskToEdit) return;
    
    try {
      const payload: any = {
        task: editedTaskTitle,
        dueDate: editedDueDate || null,
        status: editedStatus
      };
      
      // Only include assignee if it's not 'unassigned'
      if (editedAssigneeId !== 'unassigned') {
        payload.assigneeId = editedAssigneeId;
      } else {
        payload.assigneeId = null; // Explicitly set to null for unassignment
      }
      
      await axios.put(`/api/tasks/${taskToEdit.id}`, payload);
      
      toast({
        title: 'Success',
        description: 'Task updated successfully.',
      });
      
      setIsEditing(false);
      setTaskToEdit(null);
      fetchTasks(); // Refresh task list
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task.',
        variant: 'destructive',
      });
    }
  };
  
  // Effect to fetch data on component mount
  useEffect(() => {
    if (!isLoading && user) {
      fetchTasks();
    }
  }, [isLoading, user]);
  
  // Calculate task counts for display (can be expanded later)
  const totalTasks = tasks.length;
  // const pendingApprovalCount = tasks.filter(t => t.status === 'PENDING_APPROVAL').length;
  // const needsReworkCount = tasks.filter(t => t.status === 'NEEDS_REWORK').length;
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  
  // Auth check
  if (!user) {
    router.push('/login');
    return null;
  }
  
  // Render appropriate UI based on user role
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur px-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard')}
          className="mr-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-xl font-semibold">
          {isTeamLeader() ? 'Team Tasks Management' : 'My Tasks'}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
        </div>
      </header>
      
      <main className="container mx-auto p-6">
        <Card className="shadow-contrast-dark border-border/50 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-border/50 pt-4 px-6">
            <div>
              <CardTitle className="text-lg font-semibold">
                {isTeamLeader() ? 'All Team Tasks' : 'My Assigned Tasks'}
              </CardTitle>
              <CardDescription className="mt-1 text-sm text-muted-foreground">
                {isTeamLeader() 
                  ? 'View and manage tasks for your team members.' 
                  : 'View and complete your assigned tasks.'
                }
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ClipboardList className="h-5 w-5" />
              <span>{totalTasks} Task{totalTasks !== 1 ? 's' : ''}</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {tasks.length > 0 ? (
              <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-muted/10">
                    <TableHead className="pl-6">Task</TableHead>
                    <TableHead>Meeting</TableHead>
                    <TableHead>Due Date</TableHead>
                    {isTeamLeader() && <TableHead>Assigned To</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.length === 0 && (
                     <TableRow><TableCell colSpan={isTeamLeader() ? 6 : 5} className="text-center h-24 text-muted-foreground">No tasks found.</TableCell></TableRow>
                  )}
                  {tasks.map((task) => {
                    // --- DEBUGGING --- 
                    if (task.status === 'NEEDS_REWORK') { 
                      // console.log(
                      //   `Task ${task.id} needs rework. Type: ${typeof task.comments}, Comments:`, 
                      //   task.comments 
                      // );
                    }
                    // --- END DEBUGGING ---

                    // Determine display status string and icon
                    let displayStatus = task.status;
                    let StatusIcon = Clock; // Default icon
                    if (task.status === 'OPEN') {
                      displayStatus = 'Open';
                      StatusIcon = Clock; // Or another suitable icon for open
                    } else if (task.status === 'PENDING_APPROVAL') {
                      displayStatus = 'Pending Approval';
                      StatusIcon = Hourglass;
                    } else if (task.status === 'NEEDS_REWORK') {
                      displayStatus = 'Needs Rework';
                      StatusIcon = AlertTriangle;
                    } else if (task.status === 'COMPLETED') {
                      displayStatus = 'Completed';
                      StatusIcon = CheckCircle2;
                    }
                    
                    // Determine badge color based on displayStatus
                    let statusColorClass = 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20'; // Default to OPEN color
                    if (displayStatus === 'Pending Approval') statusColorClass = 'bg-purple-500/10 text-purple-300 border border-purple-500/20';
                    else if (displayStatus === 'Needs Rework') statusColorClass = 'bg-red-500/10 text-red-300 border border-red-500/20'; // Use red for rework
                    else if (displayStatus === 'Completed') statusColorClass = 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20';

                    return (
                    <TableRow key={task.id} className="border-border/50 hover:bg-muted/30">
                      <TableCell className="py-3 pl-6 font-medium">
                        <span>{task.task}</span>
                        {/* Show comments icon only if status is NEEDS_REWORK */} 
                        {task.status === 'NEEDS_REWORK' && task.comments && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <MessageCircleWarning className="w-4 h-4 ml-2 text-red-400 inline-block cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm font-medium mb-1">Rejection Comments:</p>
                              <p className="text-xs">{task.comments}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-muted-foreground">
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-blue-400 hover:text-blue-300 text-xs"
                          onClick={() => handleViewTaskInMeeting(task.meetingId)}
                        >
                          {task.meetingName}
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </TableCell>
                      <TableCell className="py-3 text-muted-foreground">
                        {task.dueDate 
                          ? new Date(task.dueDate).toLocaleDateString() 
                          : <span className="italic">No due date</span>
                        }
                      </TableCell>
                      {isTeamLeader() && (
                        <TableCell className="py-3 text-muted-foreground">
                          <span>{task.assigneeName || <span className="italic">Unassigned</span>}</span>
                        </TableCell>
                      )}
                      <TableCell className="py-3">
                        {/* Status Badge with Icon */}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${statusColorClass}`}>
                          <StatusIcon className="w-3 h-3" /> 
                          {displayStatus}
                        </span>
                      </TableCell>
                      
                      <TableCell className="text-right py-2 pr-6">
                        <div className="flex justify-end items-center space-x-1">
                          
                          {/* Primary Actions (Member) */}
                          {isTeamMember() && (task.status === 'OPEN' || task.status === 'NEEDS_REWORK') && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => { setSelectedTask(task); setIsUploadingProof(true); }}
                                  className="h-8 px-2 text-xs"
                                >
                                  <Upload className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{task.status === 'NEEDS_REWORK' ? 'Re-upload Proof' : 'Upload Proof'}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}

                          {/* Primary Actions (Leader) */}
                          {isTeamLeader() && task.status === 'PENDING_APPROVAL' && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="icon" // Use icon size
                                    onClick={() => handleViewProof(task)}
                                    className="h-8 w-8"
                                    disabled={!task.proofs || task.proofs.length === 0} // Disable if no proof
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>View Proof</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="default" 
                                    size="icon" // Use icon size
                                    onClick={() => handleApproveTask(task.id)}
                                    className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Approve</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="destructive" 
                                    size="icon" // Use icon size
                                    onClick={() => { setTaskToReject(task); setIsRejecting(true); }}
                                    className="h-8 w-8"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Reject</p>
                                </TooltipContent>
                              </Tooltip>
                            </>
                          )}
                          
                          {/* Dropdown for Secondary Actions (Leader) */}
                          {isTeamLeader() && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleViewTaskInMeeting(task.meetingId)}>
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  <span>View in Meeting</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditDialog(task)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  <span>Edit Task</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => openDeleteDialog(task)}
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  <span>Delete Task</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}

                           {/* View in Meeting button for Member */} 
                          {isTeamMember() && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleViewTaskInMeeting(task.meetingId)}
                                  className="h-8 w-8 text-muted-foreground"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View in Meeting</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </TooltipProvider>
            ) : (
              <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-4">
                <Hourglass size={48} className="text-muted-foreground/50" />
                <p>
                  {isTeamLeader() 
                    ? 'No tasks available for your teams.' 
                    : 'You have no assigned tasks.'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Upload Proof Dialog */}
        {isTeamMember() && (
          <Dialog open={isUploadingProof} onOpenChange={setIsUploadingProof}>
            <DialogContent className="sm:max-w-md shadow-contrast-dark border-border/50">
              <DialogHeader>
                <DialogTitle>Submit Task Proof</DialogTitle>
                <DialogDescription>
                  Upload evidence of task completion
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="task-name">Task</Label>
                  <Input
                    id="task-name"
                    value={selectedTask?.task || ''}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proof-file">Proof File *</Label>
                  <Input
                    id="proof-file"
                    type="file"
                    onChange={handleFileChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proof-description">Description</Label>
                  <Input
                    id="proof-description"
                    placeholder="Briefly describe your proof"
                    value={proofDescription}
                    onChange={(e) => setProofDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setProofFile(null);
                    setProofDescription('');
                    setIsUploadingProof(false);
                    setSelectedTask(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUploadProof}
                  disabled={!proofFile}
                >
                  Submit Proof
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* View Proof Dialog */} 
        <Dialog open={isViewingProof} onOpenChange={setIsViewingProof}>
          <DialogContent className="sm:max-w-md shadow-contrast-dark border-border/50">
            <DialogHeader>
              <DialogTitle>View Task Proof</DialogTitle>
              <DialogDescription>
                Proof submitted for task: "{selectedTask?.task}"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
              {proofToView ? (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Submitted At</Label>
                    <p>{new Date(proofToView.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <p>{proofToView.description || <span className="italic text-muted-foreground">No description provided</span>}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Proof File</Label>
                    <a 
                      href={proofToView.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" /> 
                      <span>{proofToView.fileUrl.split('/').pop()}</span> 
                    </a>
                  </div>
                </> 
              ) : (
                <p className="text-muted-foreground">Could not load proof details.</p>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rejection Dialog */}
        <Dialog open={isRejecting} onOpenChange={setIsRejecting}>
          <DialogContent className="sm:max-w-md shadow-contrast-dark border-border/50">
            <DialogHeader>
              <DialogTitle>Reject Task Proof</DialogTitle>
              <DialogDescription>
                Provide comments for the rejection.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
               <div className="space-y-2">
                  <Label htmlFor="rejection-comments">Rejection Comments</Label>
                  <Textarea
                    id="rejection-comments"
                    value={rejectionComments}
                    onChange={(e) => setRejectionComments(e.target.value)}
                    placeholder="Explain why the proof is being rejected..."
                    rows={4}
                  />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsRejecting(false);
                  setTaskToReject(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleRejectTask} // Call the specific reject handler
                disabled={!rejectionComments.trim()}
              >
                Confirm Rejection
              </Button>
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

        {/* Edit Task Dialog */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="sm:max-w-md shadow-contrast-dark border-border/50">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>
                Update task details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="task-title">Task Title</Label>
                <Input
                  id="task-title"
                  value={editedTaskTitle}
                  onChange={(e) => setEditedTaskTitle(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="task-status">Status</Label>
                <Select 
                  value={editedStatus}
                  onValueChange={(value) => setEditedStatus(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Only allow leader to set Open via edit */} 
                    <SelectItem value="OPEN">Open</SelectItem>
                    {/* Maybe allow setting Needs Rework? Probably not via edit. */}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="task-assignee">Assignee</Label>
                <Select 
                  value={editedAssigneeId || 'unassigned'}
                  onValueChange={(value) => setEditedAssigneeId(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Assign to..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {teamMembers.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="due-date">Due Date</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={editedDueDate ? new Date(editedDueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditedDueDate(e.target.value ? new Date(e.target.value).toISOString() : '')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditing(false);
                  setTaskToEdit(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateTask}
                disabled={!editedTaskTitle.trim()}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
};

export default TasksPage; 