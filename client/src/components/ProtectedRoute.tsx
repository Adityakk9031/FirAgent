import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";

type ProtectedRouteProps = {
  path: string;
  requiredRoles?: string[];
  component: React.ComponentType<any>;
};

export function ProtectedRoute({ path, requiredRoles, component: Component }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [location] = useLocation();
  
  // This is a special wrapper to make wouter work
  return (
    <Route path={path}>
      {(params) => {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }
        
        // Not authenticated, redirect to login
        if (!isAuthenticated || !user) {
          return <Redirect to="/auth" />;
        }
        
        // Check role-based access if roles are required
        if (requiredRoles && requiredRoles.length > 0) {
          const hasRequiredRole = requiredRoles.includes(user.role);
          
          if (!hasRequiredRole) {
            return (
              <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
                <p className="mt-2 text-gray-600">
                  You don't have permission to access this page.
                </p>
              </div>
            );
          }
        }
        
        // User is authenticated and has required roles (if any)
        return <Component params={params} />;
      }}
    </Route>
  );
}