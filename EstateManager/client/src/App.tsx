import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { GlobalSearch } from "@/components/global-search";
import { CurrencyToggle } from "@/components/currency-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Shield, Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import OwnersPage from "@/pages/owners";
import ShopsPage from "@/pages/shops";
import TenantsPage from "@/pages/tenants";
import TenantDetailPage from "@/pages/tenant-detail";
import LeasesPage from "@/pages/leases";
import LeaseDetailPage from "@/pages/lease-detail";
import PaymentsPage from "@/pages/payments";
import ExpensesPage from "@/pages/expenses";
import BankDepositsPage from "@/pages/bank-deposits";
import ReportsPage from "@/pages/reports";
import OwnerTenantReportPage from "@/pages/owner-tenant-report";
import LandingPage from "@/pages/landing";
import UserManagementPage from "@/pages/admin/users";

function UserMenu() {
  const { user, isSuperAdmin } = useAuth();

  if (!user) return null;

  const initials = user.firstName && user.lastName 
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user.email?.[0]?.toUpperCase() || 'U';

  const displayName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.email || 'User';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.profileImageUrl || undefined} alt={displayName} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
            <div className="flex items-center gap-1 mt-1">
              {isSuperAdmin ? (
                <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  <Shield className="h-3 w-3" />
                  Super Admin
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full">
                  <User className="h-3 w-3" />
                  Owner
                </span>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/api/logout" className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/admin/users" component={UserManagementPage} />
      <Route path="/owners" component={OwnersPage} />
      <Route path="/shops" component={ShopsPage} />
      <Route path="/tenants" component={TenantsPage} />
      <Route path="/tenants/:id" component={TenantDetailPage} />
      <Route path="/leases" component={LeasesPage} />
      <Route path="/leases/:id" component={LeaseDetailPage} />
      <Route path="/payments" component={PaymentsPage} />
      <Route path="/expenses" component={ExpensesPage} />
      <Route path="/bank-deposits" component={BankDepositsPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/reports/owner-tenant" component={OwnerTenantReportPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4 bg-background sticky top-0 z-50">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="hidden md:block">
                <GlobalSearch />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CurrencyToggle />
              <ThemeToggle />
              <UserMenu />
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-muted/30">
            <Router />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="estate-manager-theme">
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
