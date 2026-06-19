import { useContext } from "react";
import { AuthContext } from "@/providers/auth-provider";
import type { AuthContextType } from "@/providers/auth-provider";

export type { AuthContextType };

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
