import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Building2,
  Users,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Store,
  ArrowRight,
  CreditCard,
  Calendar,
} from "lucide-react";
import { formatCurrency, useCurrencyStore, formatFloor, getLeaseStatusColor } from "@/lib/currency";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import type { LeaseWithDetails, TenantWithDues } from "@shared/schema";

interface DashboardStats {
  totalDues: number;
  monthlyCollection: number;
  totalShops: number;
  occupiedShops: number;
  vacantShops: number;
  occupancyRate: number;
  expiringLeases: LeaseWithDetails[];
  topDebtors: TenantWithDues[];
  recentPayments: { id: number; tenantName: string; amount: string; date: string }[];
  monthlyTrend: { month: string; collected: number; expected: number }[];
  floorOccupancy: { floor: string; occupied: number; vacant: number }[];
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendUp,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <Card className="overflow-visible">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold tabular-nums mt-1 truncate" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {trendUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span>{trend}</span>
              </div>
            )}
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32 mt-2" />
            <Skeleton className="h-4 w-20 mt-2" />
          </div>
          <Skeleton className="h-12 w-12 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { currency, exchangeRate } = useCurrencyStore();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your property management</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const formatValue = (val: number) => formatCurrency(val, currency, exchangeRate);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your property management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tenant Outstanding Dues"
          value={formatValue(stats?.totalDues ?? 0)}
          icon={CreditCard}
          subtitle="Total owed by tenants"
        />
        <StatCard
          title="Monthly Collection"
          value={formatValue(stats?.monthlyCollection ?? 0)}
          icon={TrendingUp}
          subtitle="This month"
          trend="+12% vs last month"
          trendUp
        />
        <StatCard
          title="Occupancy Rate"
          value={`${stats?.occupancyRate?.toFixed(1) ?? 0}%`}
          icon={Building2}
          subtitle={`${stats?.occupiedShops ?? 0} of ${stats?.totalShops ?? 0} shops`}
        />
        <StatCard
          title="Vacant Shops"
          value={stats?.vacantShops ?? 0}
          icon={Store}
          subtitle="Available for lease"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold">Collection Trend</CardTitle>
            <Badge variant="secondary" className="text-xs">Last 6 months</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.monthlyTrend ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                    formatter={(value: number) => [formatValue(value), '']}
                  />
                  <Area
                    type="monotone"
                    dataKey="collected"
                    stackId="1"
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.3}
                    name="Collected"
                  />
                  <Area
                    type="monotone"
                    dataKey="expected"
                    stackId="2"
                    stroke="hsl(var(--chart-2))"
                    fill="hsl(var(--chart-2))"
                    fillOpacity={0.1}
                    name="Expected"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold">Occupancy by Floor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.floorOccupancy ?? []} layout="vertical" margin={{ top: 10, right: 10, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis dataKey="floor" type="category" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Bar dataKey="occupied" fill="hsl(var(--chart-1))" name="Occupied" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="vacant" fill="hsl(var(--chart-3))" name="Vacant" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-base font-semibold">Expiring Leases</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">Next 30 days</Badge>
          </CardHeader>
          <CardContent>
            {stats?.expiringLeases && stats.expiringLeases.length > 0 ? (
              <div className="space-y-3">
                {stats.expiringLeases.slice(0, 5).map((lease) => (
                  <Link key={lease.id} href={`/leases/${lease.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-md hover-elevate cursor-pointer bg-muted/50" data-testid={`expiring-lease-${lease.id}`}>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{lease.tenant?.name}</p>
                        <p className="text-sm text-muted-foreground">Shop {lease.shop?.shopNumber}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                          {new Date(lease.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No leases expiring soon</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold">Top Outstanding Dues</CardTitle>
            <Link href="/tenants">
              <Button variant="ghost" size="sm" className="h-7 text-xs" data-testid="link-view-all-tenants">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.topDebtors && stats.topDebtors.length > 0 ? (
              <div className="space-y-3">
                {stats.topDebtors.slice(0, 5).map((tenant, index) => (
                  <Link key={tenant.id} href={`/tenants/${tenant.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-md hover-elevate cursor-pointer bg-muted/50" data-testid={`top-debtor-${tenant.id}`}>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{tenant.name}</p>
                          <p className="text-sm text-muted-foreground">{tenant.phone}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-destructive tabular-nums">
                        {formatValue(tenant.currentDue)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No outstanding dues</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold">Recent Payments</CardTitle>
            <Link href="/payments">
              <Button variant="ghost" size="sm" className="h-7 text-xs" data-testid="link-view-all-payments">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.recentPayments && stats.recentPayments.length > 0 ? (
              <div className="space-y-3">
                {stats.recentPayments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50" data-testid={`recent-payment-${payment.id}`}>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{payment.tenantName}</p>
                      <p className="text-sm text-muted-foreground">{payment.date}</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      +{formatValue(parseFloat(payment.amount))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CreditCard className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No recent payments</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
