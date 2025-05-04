'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import UploadAudio from '@/components/UploadAudio';
import { useToast } from "@/hooks/use-toast"
import { RefreshCw, LogOut, UserPlus, Mic, Users, Calendar, Plus, ChevronRight, FileEdit } from "lucide-react";
import { useAuth } from '@/lib/contexts/AuthContext';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/design-elements';
import NotificationBell from '@/components/ui/NotificationBell';

interface Meeting {
  id: string;
  name: string;
  description: string;
  fileName: string;
  team?: {
    id: string;
    name: string;
  };
}

const Dashboard: React.FC = () => {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user, isLoading, logout, isTeamLeader, isTeamMember } = useAuth();

  // Fetch teams the user is a member of
  const fetchTeams = async () => {
    try {
      const response = await axios.get('/api/teams');
      setTeams(response.data || []);
    } catch (error) {
      console.error("Error fetching teams:", error);
      setTeams([]);
    }
  };

  const fetchMeetings = async () => {
    try {
      // For all users, get meetings they're part of
      const response = await axios.get('/api/meetings');
      
      // Ensure we always set an array, even if the response is null/undefined
      setMeetings(response.data || []);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      // Only show error toast for actual errors, not for empty results
      if (axios.isAxiosError(error) && error.response?.status !== 404 && error.response?.status !== 200) {
        toast({
          title: 'Error',
          description: 'Failed to fetch meetings.',
          variant: 'destructive',
        });
      }
      setMeetings([]);
    }
  };

  useEffect(() => {
    if (!isLoading && user) {
      fetchMeetings();
      fetchTeams();
    }
  }, [isLoading, user]);

  const handleViewDetails = (meetingId: string) => {
    router.push(`dashboard/meeting/${meetingId}`);
  };

  const handleDelete = async (meetingId: string) => {
    if (confirm("Are you sure you want to delete this meeting? This action cannot be undone.")) {
      try {
        await axios.delete(`/api/meetings/${meetingId}`);
        toast({
          title: 'Success',
          description: 'Meeting deleted successfully.',
        });
        fetchMeetings(); // Refresh the meetings list
      } catch (error) {
        console.error("Error deleting meeting:", error);
        toast({
          title: 'Error',
          description: 'Failed to delete meeting.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchMeetings();
    setIsRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        title: 'Error',
        description: 'Failed to log out.',
        variant: 'destructive',
      });
    }
  };

  const handleManageTeams = () => {
    router.push('/dashboard/teams');
  };

  const handleViewTasks = () => {
    router.push('/dashboard/tasks');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background dark:bg-gradient-black noise-bg">
      {/* Floating elements for visual interest */}
      <div className="fixed w-40 h-40 -top-20 -left-20 bg-primary/5 rounded-full blur-3xl z-0"></div>
      <div className="fixed w-60 h-60 top-1/3 -right-32 bg-primary/5 rounded-full blur-3xl z-0"></div>
      
      <header className="sticky top-0 z-30 backdrop-blur-sm border-b border-border/40 bg-background/50">
        <div className="container mx-auto flex h-16 items-center gap-4 px-6">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-xl font-semibold transition-soft hover:opacity-80"
          >
            <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight italic">
              Meeting <span className="text-primary">Mind</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-4">
            <NotificationBell />
            {isTeamLeader() && (
              <Button variant="secondary" onClick={handleManageTeams} className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Manage Teams
              </Button>
            )}
            <Button variant="secondary" onClick={handleViewTasks} className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              View Tasks
            </Button>
            <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-6 space-y-8 relative z-10">
        <GlassCard className="p-6 shadow-contrast-dark relative overflow-hidden backdrop-blur-md group animate-in fade-in duration-700">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 via-violet-600/5 to-purple-600/5 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute -right-12 -top-12 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
          <div className="absolute -left-12 -bottom-12 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl"></div>
          <div className="flex flex-col md:flex-row justify-between relative z-10">
            <div className="animate-in slide-in-from-left duration-500">
              <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">{user.name}</h2>
              <div className="flex items-center">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  user.role === 'TEAM_LEADER' 
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    : 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                } transition-all duration-300 hover:shadow-md`}>
                  {user.role === 'TEAM_LEADER' ? 'Team Leader' : 'Team Member'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 md:mt-0 animate-in slide-in-from-right duration-500">
              <div className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 px-4 py-2.5 rounded-xl border border-indigo-500/20 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                <p className="text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-medium mb-1">Teams</p>
                <p className="font-bold text-2xl bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">{teams.length}</p>
              </div>
              <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 px-4 py-2.5 rounded-xl border border-violet-500/20 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                <p className="text-xs uppercase tracking-wider text-violet-600 dark:text-violet-400 font-medium mb-1">Meetings</p>
                <p className="font-bold text-2xl bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">{meetings.length}</p>
              </div>
            </div>
          </div>
        </GlassCard>

        {isTeamLeader() && <UploadAudio onUploadSuccess={fetchMeetings} />}
        
        <Card className="shadow-contrast-dark border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">
                {isTeamLeader() ? 'Your Meetings' : 'Team Meetings'}
              </CardTitle>
              <CardDescription>
                {isTeamLeader() 
                  ? 'Meetings you have created' 
                  : 'Meetings from your team that you\'re part of'
                }
              </CardDescription>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="ml-auto"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </CardHeader>
          <CardContent>
            {meetings.length > 0 ? (
              <div className="border border-border/30 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary/5">
                      <TableHead className="font-medium">Name</TableHead>
                      <TableHead className="font-medium">Description</TableHead>
                      <TableHead className="font-medium">Team</TableHead>
                      <TableHead className="font-medium">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meetings.map((meeting) => (
                      <TableRow key={meeting.id} className="group hover:bg-primary/5 transition-soft">
                        <TableCell className="font-medium">{meeting.name}</TableCell>
                        <TableCell className="text-muted-foreground">{meeting.description}</TableCell>
                        <TableCell>
                          {meeting.team ? (
                            <div className="px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 inline-flex items-center gap-1.5 max-w-fit">
                              <Users className="h-3 w-3 text-indigo-400" />
                              <span className="text-xs font-medium text-indigo-500 dark:text-indigo-400">{meeting.team.name}</span>
                            </div>
                          ) : (
                            <div className="px-2 py-1 rounded-md bg-slate-500/10 border border-slate-500/20 inline-flex items-center gap-1.5 max-w-fit">
                              <Users className="h-3 w-3 text-slate-400" />
                              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Personal</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="secondary" 
                              onClick={() => handleViewDetails(meeting.id)}
                              className="px-4 py-2 text-sm flex items-center"
                            >
                              <FileEdit className="w-4 h-4 mr-2" />
                              Details
                            </Button>
                            {isTeamLeader() && (
                              <Button 
                                variant="destructive" 
                                onClick={() => handleDelete(meeting.id)}
                                className="px-4 py-2 text-sm"
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-border rounded-lg">
                <div className="w-12 h-12 mx-auto bg-primary/5 rounded-full flex items-center justify-center mb-4">
                  <Plus className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-2">
                  {isTeamLeader() 
                    ? 'You haven\'t created any meetings yet' 
                    : 'No meetings available'
                  }
                </p>
                {isTeamLeader() && (
                  <Button variant="default" className="mt-2 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Upload Meeting Recording
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default Dashboard;
