import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Shield, Users, BarChart3 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">Bhuiyan & Subedari</h1>
              <p className="text-xs text-muted-foreground">Estate Manager</p>
            </div>
          </div>
          <Button asChild>
            <a href="/api/login">Sign In</a>
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight mb-4">
            Commercial Property Management System
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Manage "Haji Ahsan Ullah Bhuiyan Market & Subedari" with ease. 
            Track shops, tenants, leases, payments, and financial reports all in one place.
          </p>
          <Button size="lg" asChild>
            <a href="/api/login">Get Started</a>
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          <Card>
            <CardHeader className="pb-2">
              <Building2 className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Shop Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track all shop units across Ground Floor, 1st Floor, 2nd Floor, and Subedari locations.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Tenant Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Manage tenant profiles, lease agreements, and payment history with comprehensive records.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <BarChart3 className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Financial Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Generate detailed reports on rent collection, outstanding dues, and owner finances.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <Shield className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Role-Based Access</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Super Admin and Owner roles with appropriate access controls and permissions.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>Haji Ahsan Ullah Bhuiyan Market & Subedari - Estate Management System</p>
      </footer>
    </div>
  );
}
