// TEMPORARY DUMMY PROVIDER FOR DIAGNOSTICS
import React, { createContext, useContext } from 'react';

// Create a context with a dummy value
const NotificationContext = createContext({ unreadCount: 0 });
export const useNotifications = () => useContext(NotificationContext);

// The provider now does NOTHING except render the children passed to it.
// No hooks, no state, no effects, no database calls.
export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <NotificationContext.Provider value={{ unreadCount: 0 }}>
      {children}
    </NotificationContext.Provider>
  );
};
