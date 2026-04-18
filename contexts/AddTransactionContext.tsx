'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';

interface AddTransactionContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  registerOnAdd: (cb: (tx: unknown) => void) => void;
}

const AddTransactionContext = createContext<AddTransactionContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
  registerOnAdd: () => {},
});

export function AddTransactionProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const onAddRef = useRef<(tx: unknown) => void>(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const registerOnAdd = useCallback((cb: (tx: unknown) => void) => {
    onAddRef.current = cb;
  }, []);

  return (
    <AddTransactionContext.Provider value={{ isOpen, open, close, registerOnAdd }}>
      {children}
    </AddTransactionContext.Provider>
  );
}

export function useAddTransaction() {
  return useContext(AddTransactionContext);
}

export function useOnAddCallback() {
  const { registerOnAdd } = useAddTransaction();
  return registerOnAdd;
}
