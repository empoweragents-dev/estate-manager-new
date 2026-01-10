import { useQuery } from "@tanstack/react-query";
import type { User, Owner } from "@shared/schema";

export type AuthUser = User & { ownerDetails?: Owner | null };

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isSuperAdmin: user?.role === 'super_admin',
    isOwner: user?.role === 'owner',
    error,
  };
}
