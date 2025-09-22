// contexts/NotificationContext.tsx

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationContextType {
  unreadCount: number;
  fetchUnreadCount: () => void;
}

// 2. Create the context with a default value
const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  fetchUnreadCount: () => {},
});

// 3. Create a custom hook for easy access to the context
export const useNotifications = () => useContext(NotificationContext);

// 4. Create the Provider component that will wrap our app
export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error("Error fetching unread notification count:", error);
        setUnreadCount(0);
      } else {
        setUnreadCount(count || 0);
      }
    } catch (e) {
      console.error("Exception fetching unread count:", e);
      setUnreadCount(0);
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  const value = {
    unreadCount,
    fetchUnreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
