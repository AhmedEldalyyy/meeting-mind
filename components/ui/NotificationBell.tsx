'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Calendar, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  taskId: string | null;
  meetingId: string | null;
  task?: {
    id: string;
    task: string;
  } | null;
  user?: {
    id: string;
    name: string;
  } | null;
}

export default function NotificationBell() {
  const { toast } = useToast();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/notifications?limit=10');
      
      // Handle response data safely with fallbacks
      const notificationsData = response.data?.notifications || [];
      const unreadCountData = response.data?.unreadCount || 0;
      
      setNotifications(notificationsData);
      setUnreadCount(unreadCountData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Handle missing notification model gracefully
      setNotifications([]);
      setUnreadCount(0);
      
      // Don't show error toast for expected errors or for potential schema/model issues
      const errorMessage = error.toString();
      const isExpectedError = 
        (axios.isAxiosError(error) && error.response?.status === 404) || 
        errorMessage.includes("Cannot read properties of undefined") ||
        errorMessage.includes("Unknown field") ||
        errorMessage.includes("PrismaClientValidationError");
        
      if (!isExpectedError) {
        toast({
          title: 'Error',
          description: 'Failed to load notifications',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch notifications when component mounts
  useEffect(() => {
    fetchNotifications();
    
    // Set up a polling interval to check for new notifications
    const intervalId = setInterval(fetchNotifications, 60000); // every minute
    
    return () => clearInterval(intervalId);
  }, []);

  // Refresh when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkAsRead = async (notificationId?: string) => {
    try {
      if (notificationId) {
        // Mark single notification as read
        await axios.patch('/api/notifications', {
          notificationIds: [notificationId],
        });
        
        // Update local state
        setNotifications(prev => 
          prev.map(note => 
            note.id === notificationId ? { ...note, isRead: true } : note
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        // Mark all as read
        await axios.patch('/api/notifications', {
          markAll: true,
        });
        
        // Update local state
        setNotifications(prev => 
          prev.map(note => ({ ...note, isRead: true }))
        );
        setUnreadCount(0);
      }
      
      toast({
        title: 'Success',
        description: notificationId ? 'Notification marked as read' : 'All notifications marked as read',
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive',
      });
    }
  };

  const handleNavigate = (notification: Notification) => {
    // Mark it as read
    handleMarkAsRead(notification.id);
    
    // Navigate to the relevant page
    if (notification.taskId) {
      router.push('/dashboard/tasks');
    } else if (notification.meetingId) {
      router.push(`/dashboard/meeting/${notification.meetingId}`);
    }
    
    // Close the dropdown
    setIsOpen(false);
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => handleMarkAsRead()}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start px-4 py-3 ${
                  !notification.isRead ? 'bg-primary/5' : ''
                }`}
                onClick={() => handleNavigate(notification)}
              >
                <div className="flex w-full justify-between items-start">
                  <span className="flex-1 text-sm font-medium">{notification.message}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 -mr-2 -mt-1 text-muted-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(notification.id);
                    }}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex w-full justify-between items-center mt-1">
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(notification.createdAt)}
                  </span>
                  {notification.taskId && (
                    <span className="text-xs flex items-center text-blue-400">
                      <Calendar className="h-3 w-3 mr-1" />
                      Task
                    </span>
                  )}
                </div>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          )}
        </ScrollArea>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="justify-center text-xs text-muted-foreground"
          onClick={() => router.push('/dashboard/tasks')}
        >
          View all tasks <ExternalLink className="ml-1 h-3 w-3" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 