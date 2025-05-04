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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Plus, Users, ArrowLeft, UserPlus, UserMinus, Trash } from 'lucide-react';
import axios from 'axios';

interface Team {
  id: string;
  name: string;
  description: string;
  membersCount: number;
  meetingsCount: number;
  createdAt: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

const TeamsPage: React.FC = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading, isTeamLeader } = useAuth();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<TeamMember[]>([]);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch teams led by the current user
  const fetchTeams = async () => {
    try {
      const response = await axios.get('/api/teams');
      setTeams(response.data);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch teams.',
        variant: 'destructive',
      });
    }
  };
  
  // Fetch team members for a selected team
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
  
  // Fetch available users to add to the team
  const fetchAvailableUsers = async (search?: string, silent: boolean = false) => {
    if (!selectedTeam) return;
    
    try {
      let url = `/api/users?role=TEAM_MEMBER&excludeTeamId=${selectedTeam.id}`;
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      const response = await axios.get(url);
      setAvailableUsers(response.data);
    } catch (error) {
      console.error('Error fetching available users:', error);
      // Only show error toast if not silent mode and not a search operation
      if (!silent && !search) {
        toast({
          title: 'Error',
          description: 'Failed to fetch available users.',
          variant: 'destructive',
        });
      }
      // For errors, just set empty results
      setAvailableUsers([]);
    }
  };
  
  // Create a new team
  const handleCreateTeam = async () => {
    try {
      if (!newTeam.name.trim()) {
        toast({
          title: 'Error',
          description: 'Team name is required.',
          variant: 'destructive',
        });
        return;
      }
      
      const response = await axios.post('/api/teams', newTeam);
      
      toast({
        title: 'Success',
        description: 'Team created successfully.',
      });
      
      setNewTeam({ name: '', description: '' });
      setIsCreatingTeam(false);
      fetchTeams();
    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: 'Error',
        description: 'Failed to create team.',
        variant: 'destructive',
      });
    }
  };
  
  // Delete a team
  const handleDeleteTeam = async (teamId: string) => {
    if (confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      try {
        await axios.delete(`/api/teams/${teamId}`);
        toast({
          title: 'Success',
          description: 'Team deleted successfully.',
        });
        fetchTeams();
        if (selectedTeam?.id === teamId) {
          setSelectedTeam(null);
          setTeamMembers([]);
        }
      } catch (error) {
        console.error('Error deleting team:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete team.',
          variant: 'destructive',
        });
      }
    }
  };
  
  // Handle selecting a team
  const handleSelectTeam = (team: Team) => {
    setSelectedTeam(team);
    fetchTeamMembers(team.id);
    fetchAvailableUsers(undefined, true);
  };
  
  // Handle going back to teams list
  const handleBackToTeams = () => {
    setSelectedTeam(null);
    setTeamMembers([]);
  };
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // Don't fetch on every keystroke
  };
  
  // Add debounced search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (selectedTeam && searchTerm) {
        fetchAvailableUsers(searchTerm);
      }
    }, 300); // Wait 300ms after typing stops before searching

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, selectedTeam]);
  
  // Handle adding a member by email directly
  const handleAddMemberByEmail = async () => {
    if (!selectedTeam || !searchTerm.trim()) return;
    
    try {
      await axios.post(`/api/teams/${selectedTeam.id}/members`, { email: searchTerm });
      toast({
        title: 'Success',
        description: 'Member added to team successfully.',
      });
      setSearchTerm('');
      fetchTeamMembers(selectedTeam.id);
      fetchAvailableUsers(undefined, true);
    } catch (error: any) {
      console.error('Error adding team member by email:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to add member to team.',
        variant: 'destructive',
      });
    }
  };
  
  // Add a member to the team
  const handleAddMember = async (userId: string) => {
    if (!selectedTeam) return;
    
    // Find the user's email from availableUsers
    const user = availableUsers.find(u => u.id === userId);
    if (!user) {
      toast({
        title: 'Error',
        description: 'Selected user not found.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await axios.post(`/api/teams/${selectedTeam.id}/members`, { email: user.email });
      toast({
        title: 'Success',
        description: 'Member added to team successfully.',
      });
      fetchTeamMembers(selectedTeam.id);
      fetchAvailableUsers(undefined, true);
    } catch (error) {
      console.error('Error adding team member:', error);
      toast({
        title: 'Error',
        description: 'Failed to add member to team.',
        variant: 'destructive',
      });
    }
  };
  
  // Open confirmation dialog for removing a member
  const confirmRemoveMember = (member: TeamMember) => {
    setMemberToRemove(member);
    setIsRemoveDialogOpen(true);
  };
  
  // Remove a member from the team
  const handleRemoveMember = async () => {
    if (!selectedTeam || !memberToRemove) return;
    
    try {
      await axios.delete(`/api/teams/${selectedTeam.id}/members?memberId=${memberToRemove.id}`);
      toast({
        title: 'Success',
        description: 'Member removed from team successfully.',
      });
      fetchTeamMembers(selectedTeam.id);
      // Pass true to make this a silent fetch that won't show errors
      fetchAvailableUsers(undefined, true);
      // Reset the member to remove and close the dialog
      setMemberToRemove(null);
      setIsRemoveDialogOpen(false);
    } catch (error) {
      console.error('Error removing team member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove member from team.',
        variant: 'destructive',
      });
    }
  };
  
  // Effect to fetch teams on component mount
  useEffect(() => {
    if (!isLoading && user) {
      fetchTeams();
    }
  }, [isLoading, user]);
  
  // Redirect if user is not authenticated or not a team leader
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
  
  if (!user || !isTeamLeader()) {
    router.push('/dashboard');
    return null;
  }
  
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard')}
          className="mr-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-semibold">Team Management</h1>
      </header>
      
      <main className="container mx-auto p-6 space-y-6">
        {!selectedTeam ? (
          <>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-medium">Your Teams</h2>
              <Button onClick={() => setIsCreatingTeam(true)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Team
              </Button>
            </div>
            
            {/* New Team Dialog */}
            <Dialog open={isCreatingTeam} onOpenChange={setIsCreatingTeam}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Team</DialogTitle>
                  <DialogDescription>
                    Add a new team to collaborate with your members.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="team-name">Team Name *</Label>
                    <Input
                      id="team-name"
                      placeholder="Enter team name"
                      value={newTeam.name}
                      onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="team-description">Description</Label>
                    <Input
                      id="team-description"
                      placeholder="Enter team description (optional)"
                      value={newTeam.description}
                      onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreatingTeam(false)}>Cancel</Button>
                  <Button onClick={handleCreateTeam}>Create Team</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* Teams List */}
            {teams.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teams.map((team) => (
                  <Card key={team.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle>{team.name}</CardTitle>
                      <CardDescription>
                        {team.description || 'No description'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="w-4 h-4 mr-1" />
                        <span>{team.membersCount || 0} members</span>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t bg-muted/50 px-6 py-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleSelectTeam(team)}
                      >
                        Manage
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteTeam(team.id)}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <Users className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">You haven't created any teams yet.</p>
                  <Button onClick={() => setIsCreatingTeam(true)} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create Your First Team
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <div>
                <Button 
                  variant="secondary" 
                  onClick={handleBackToTeams}
                  className="mb-4 flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Teams
                </Button>
                <h2 className="text-xl font-medium">{selectedTeam.name}</h2>
                {selectedTeam.description && (
                  <p className="text-muted-foreground">{selectedTeam.description}</p>
                )}
              </div>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Members
                  </Button>
                </DialogTrigger>
                <DialogContent onInteractOutside={() => setSearchTerm('')} onEscapeKeyDown={() => setSearchTerm('')}>
                  <DialogHeader>
                    <DialogTitle>Add Team Members</DialogTitle>
                    <DialogDescription>
                      Add team members to collaborate with.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="mb-4">
                    <Label htmlFor="search-email">Search by Email or Name</Label>
                    <Input
                      id="search-email"
                      placeholder="Enter email or name"
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className="mt-1"
                    />
                  </div>
                  
                  {availableUsers.length > 0 ? (
                    <div className="max-h-80 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {availableUsers
                            .filter(user => !teamMembers.some(member => member.id === user.id))
                            .map(user => (
                              <TableRow key={user.id}>
                                <TableCell>{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleAddMember(user.id)}
                                  >
                                    Add
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="mb-4">No available users found.</p>
                      {searchTerm.includes('@') && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Add user directly with this email?
                          </p>
                          <Button onClick={handleAddMemberByEmail}>
                            Add {searchTerm}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" onClick={() => setSearchTerm('')}>Close</Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Team Members List */}
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Manage the members of your team</CardDescription>
              </CardHeader>
              <CardContent>
                {teamMembers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamMembers.map(member => (
                        <TableRow key={member.id}>
                          <TableCell>{member.name}</TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>{member.role === 'TEAM_MEMBER' ? 'Team Member' : 'Team Leader'}</TableCell>
                          <TableCell>
                            {member.role === 'TEAM_MEMBER' && (
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => confirmRemoveMember(member)}
                              >
                                <UserMinus className="w-4 h-4 mr-2" />
                                Remove
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-4">No members in this team yet.</p>
                )}
              </CardContent>
            </Card>
            
            {/* Remove Member Confirmation Dialog */}
            <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Remove Team Member</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to remove this member from the team?
                  </DialogDescription>
                </DialogHeader>
                
                {memberToRemove && (
                  <div className="py-4">
                    <p><strong>Name:</strong> {memberToRemove.name}</p>
                    <p><strong>Email:</strong> {memberToRemove.email}</p>
                  </div>
                )}
                
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsRemoveDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleRemoveMember}
                  >
                    Remove
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </main>
    </div>
  );
};

export default TeamsPage; 