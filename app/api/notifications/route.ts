import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// Helper function to check if a model exists
const modelExists = (modelName) => {
  return typeof prisma[modelName]?.findMany === 'function';
};

// GET: Fetch current user's notifications
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if Notification model exists
    if (!modelExists('notification')) {
      console.warn('Notification model not found in Prisma client - it may not be properly generated');
      return NextResponse.json({ 
        notifications: [], 
        unreadCount: 0,
        message: 'Notification functionality not available'
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 10;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    
    // Construct where clause based on params
    const whereClause: any = {
      userId: user.id,
    };
    
    // Add unread filter if specified
    if (unreadOnly) {
      whereClause.isRead = false;
    }

    // Fetch notifications
    let notifications = [];
    try {
      // Try with includes first
      notifications = await prisma.notification.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc' // Most recent first
        },
        take: limit,
        include: {
          // Include task and meeting details for navigation
          task: {
            select: {
              id: true,
              task: true // Task title
            }
          },
          meeting: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
    } catch (error) {
      console.warn('Error fetching notifications with includes, falling back to basic query:', error);
      // Fallback to basic query without includes
      notifications = await prisma.notification.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc' // Most recent first
        },
        take: limit
      });
    }

    // Also get unread count for the badge
    let unreadCount = 0;
    try {
      unreadCount = await prisma.notification.count({
        where: {
          userId: user.id,
          isRead: false
        }
      });
    } catch (error) {
      console.warn('Error fetching unread count:', error);
      // Just use 0 as fallback
    }

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch notifications',
        notifications: [],
        unreadCount: 0
      },
      { status: 500 }
    );
  }
}

// PATCH: Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if Notification model exists
    if (!modelExists('notification')) {
      console.warn('Notification model not found in Prisma client - it may not be properly generated');
      return NextResponse.json({ 
        message: 'Notification functionality not available'
      });
    }

    const { notificationIds, markAll } = await request.json();

    if (markAll) {
      // Mark all notifications as read
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          isRead: false
        },
        data: {
          isRead: true
        }
      });

      return NextResponse.json({ message: 'All notifications marked as read' });
    } else if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      // Mark specific notifications as read
      await prisma.notification.updateMany({
        where: {
          id: {
            in: notificationIds
          },
          userId: user.id // Ensure user can only mark their own notifications
        },
        data: {
          isRead: true
        }
      });

      return NextResponse.json({ message: 'Notifications marked as read' });
    } else {
      return NextResponse.json(
        { error: 'Invalid request - provide notificationIds or markAll' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
} 