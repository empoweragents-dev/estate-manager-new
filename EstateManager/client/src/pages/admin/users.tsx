import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Shield, User, Users, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { User as UserType, Owner } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function UserManagementPage() {
  const { isSuperAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading: usersLoading } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    enabled: isSuperAdmin,
  });

  const { data: owners = [] } = useQuery<Owner[]>({
    queryKey: ["/api/owners"],
    enabled: isSuperAdmin,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role, ownerId }: { userId: string; role: string; ownerId?: number }) => {
      return apiRequest("PATCH", `/api/users/${userId}/role`, { role, ownerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Role updated",
        description: "User role has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  if (authLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You do not have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const handleOwnerAssign = (userId: string, ownerId: string) => {
    const user = users.find(u => u.id === userId);
    updateRoleMutation.mutate({ 
      userId, 
      role: user?.role || 'owner', 
      ownerId: ownerId ? parseInt(ownerId) : undefined 
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{users.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Super Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{users.filter(u => u.role === 'super_admin').length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Owners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{users.filter(u => u.role === 'owner').length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            View and manage all users. Assign roles and link owners to user accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Linked Owner</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const initials = user.firstName && user.lastName 
                  ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                  : user.email?.[0]?.toUpperCase() || 'U';
                const displayName = user.firstName && user.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : 'Unknown User';
                const linkedOwner = owners.find(o => o.id === user.ownerId);

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.profileImageUrl || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{displayName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email || '-'}
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={user.role} 
                        onValueChange={(value) => handleRoleChange(user.id, value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="super_admin">
                            <div className="flex items-center gap-2">
                              <Shield className="h-3 w-3" />
                              Super Admin
                            </div>
                          </SelectItem>
                          <SelectItem value="owner">
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              Owner
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {user.role === 'owner' ? (
                        <Select 
                          value={user.ownerId?.toString() || ""} 
                          onValueChange={(value) => handleOwnerAssign(user.id, value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select owner..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No owner linked</SelectItem>
                            {owners.map((owner) => (
                              <SelectItem key={owner.id} value={owner.id.toString()}>
                                {owner.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No users found. Users will appear here after they log in.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
