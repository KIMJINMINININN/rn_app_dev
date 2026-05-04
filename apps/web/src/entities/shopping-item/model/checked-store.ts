'use client';

import { create } from 'zustand';

interface CheckedState {
  checked: Set<string>;
  toggle: (id: string) => void;
  clear: () => void;
}

export const useCheckedStore = create<CheckedState>((set) => ({
  checked: new Set<string>(),
  toggle: (id) =>
    set((state) => {
      const next = new Set(state.checked);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { checked: next };
    }),
  clear: () => set({ checked: new Set<string>() }),
}));
