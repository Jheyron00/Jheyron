import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "wouter";
import { UserRole } from "@/lib/api-client";

export function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, token, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!token || !user) {
    setLocation("/login");
    return null;
  }

  if (adminOnly && user.role !== UserRole.admin) {
    setLocation("/dashboard");
    return null;
  }

  return <>{children}</>;
}
