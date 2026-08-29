import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Address, MOCK_ADDRESSES } from '../data/addresses';
import { deleteAddress, fetchAddresses, saveAddress, setDefaultAddress } from '../services/addresses';
import { useAuth } from './AuthContext';

const PLACEHOLDER_ADDRESS: Address = {
  id: '',
  label: 'Set delivery location',
  line1: 'Add an address to start ordering',
  city: '',
  pincode: '',
  lat: 0,
  lng: 0,
  isDefault: false,
};

type LocationContextValue = {
  addresses: Address[];
  address: Address;
  isLoading: boolean;
  selectAddress: (address: Address) => void;
  addAddress: (input: Omit<Address, 'id'>) => Promise<void>;
  removeAddress: (id: string) => Promise<void>;
  makeDefault: (id: string) => Promise<void>;
};

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selected, setSelected] = useState<Address | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session) {
      /* Sample addresses are for developing against, not for customers.
         Anonymous sign-in is disabled on the project, so signed-out customers
         land here for real and were being shown three saved addresses that
         belong to nobody -- including someone's "Parents' Place". */
      const seed = __DEV__ ? MOCK_ADDRESSES : [];
      setAddresses(seed);
      setSelected(prev => prev ?? seed.find(a => a.isDefault) ?? seed[0] ?? null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const list = await fetchAddresses();
      setAddresses(list);
      setSelected((current) => {
        const stillExists = current && list.find((a) => a.id === current.id);
        if (stillExists) return stillExists;
        return list.find((a) => a.isDefault) ?? list[0] ?? null;
      });
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addAddress = useCallback(
    async (input: Omit<Address, 'id'>) => {
      if (!session) {
        const newAddress: Address = { ...input, id: `local-${Date.now()}` };
        setAddresses((prev) => {
          const updated = input.isDefault
            ? prev.map((a) => ({ ...a, isDefault: false }))
            : prev;
          return [...updated, newAddress];
        });
        setSelected((prev) => (input.isDefault || !prev || prev.id === '') ? newAddress : prev);
        return;
      }
      await saveAddress(input);
      await refresh();
    },
    [session, refresh],
  );

  const removeAddress = useCallback(
    async (id: string) => {
      if (!session) {
        setAddresses((prev) => prev.filter((a) => a.id !== id));
        setSelected((prev) => (prev?.id === id ? null : prev));
        return;
      }
      await deleteAddress(id);
      await refresh();
    },
    [session, refresh],
  );

  const makeDefault = useCallback(
    async (id: string) => {
      if (!session) {
        setAddresses((prev) =>
          prev.map((a) => ({ ...a, isDefault: a.id === id })),
        );
        return;
      }
      await setDefaultAddress(id);
      await refresh();
    },
    [session, refresh],
  );

  return (
    <LocationContext.Provider
      value={{
        addresses,
        address: selected ?? PLACEHOLDER_ADDRESS,
        isLoading,
        selectAddress: setSelected,
        addAddress,
        removeAddress,
        makeDefault,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) throw new Error('useLocation must be used within a LocationProvider');
  return context;
}
