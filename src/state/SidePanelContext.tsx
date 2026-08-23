import React, { createContext, useContext, useState } from 'react';

type SidePanelContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const SidePanelContext = createContext<SidePanelContextValue | null>(null);

export function SidePanelProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SidePanelContext.Provider
      value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}
    >
      {children}
    </SidePanelContext.Provider>
  );
}

export function useSidePanel() {
  const context = useContext(SidePanelContext);
  if (!context) throw new Error('useSidePanel must be used within a SidePanelProvider');
  return context;
}
