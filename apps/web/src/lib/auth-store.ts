import { create } from 'zustand';
import { UserDto } from '@openreach/types';

interface AuthState {
  user: UserDto | null;
  accessToken: string | null;
  organizationId: string | null;
  setAuth: (user: UserDto, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null,
  organizationId: typeof window !== 'undefined' ? localStorage.getItem('organizationId') : null,

  setAuth: (user, accessToken, _refreshToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('organizationId', user.organizationId);
    }
    set({ user, accessToken, organizationId: user.organizationId });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('organizationId');
    }
    set({ user: null, accessToken: null, organizationId: null });
  },
}));
