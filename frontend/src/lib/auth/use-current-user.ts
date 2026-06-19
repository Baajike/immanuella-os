"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError, getCurrentUser } from "@/lib/api";
import { clearTokens, getAccessToken } from "@/lib/auth/tokens";
import type { User } from "@/types";

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      setUser(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const currentUser = await getCurrentUser(accessToken);
      setUser(currentUser);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        clearTokens();
        setUser(null);
        setError(null);
        return;
      }
      setUser(null);
      setError(caught instanceof Error ? caught.message : "Could not load user.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  return {
    user,
    isLoading,
    error,
    reload: loadUser,
  };
}
