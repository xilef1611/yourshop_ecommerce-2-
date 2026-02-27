import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, ShoppingCart, Users, TrendingUp, BarChart3, Repeat, Loader2, PieChart as PieChartIcon
} from "lucide-react";
import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, Legend
} from "recharts";

const COLORS = [
  "#7c3aed", "#a78bfa", "#c4b5fd", "#6d28d9", "#8b5cf6",
  "#4c1d95", "#ddd6fe", "#5b21b6", "#ede9fe", "#9333ea"
];

const STATUS_COLORS: Record<string, string> = {
  new: "#6366f1",
  paid_not_shipped: "#f59e0b",
  shipped: "#3b82f6",
  delivered: "#10b981",
  cancelled: "#ef4444",
  pending: "#f59e0b",
  paid: "#10b981",
  failed: "#ef4444",
  expired: "#6b7280",
  refunded: "#8b5cf6",
};

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// Custom tooltip for charts
function CustomTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {formatter ? formatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
}

export default function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState("30");
  const days = parseInt(timeRange);

  const { data: summary, isLoading: summaryLoading } = trpc.analytics.summary.useQuery();
  const { data: revenueData, isLoading: revenueLoading } = trpc.analytics.revenueTimeSeries.useQuery({ days });
  const { data: orderStatusData } = trpc.analytics.orderStatusDistribution.useQuery();
  const { data: paymentStatusData } = trpc.analytics.paymentStatusDistribution.useQuery();
  const { data: topProducts } = trpc.analytics.topProducts.useQuery({ limit: 10 });
  const { data: newCustomers } = trpc.analytics.newCustomersTrend.useQuery({ days });
  const { data: repeatStats } = trpc.analytics.repeatCustomers.useQuery();
  const { data: categoryRevenue } = trpc.analytics.revenueByCategory.useQuery();

  // Stabilize pie chart data
  const orderStatusPieData = useMemo(() =>
    (orderStatusData || []).map(d => ({ name: formatStatus(d.status), value: d.count, status: d.status })),
    [orderStatusData]
  );

  const paymentStatusPieData = useMemo(() =>
    (paymentStatusData || []).map(d => ({ name: formatStatus(d.status), value: d.count, status: d.status })),
    [paymentStatusData]
  );

  if (summaryLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground mt-2">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Analytics Overview
        </h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-44 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last 365 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Revenue"
          value={formatCurrency(summary?.totalRevenue || 0)}
          subtitle={`${summary?.paidOrders || 0} paid orders`}
          icon={<DollarSign className="h-5 w-5" />}
          color="text-green-400"
          bgColor="bg-green-500/10"
        />
        <KpiCard
          title="Total Orders"
          value={String(summary?.totalOrders || 0)}
          subtitle={`${summary?.paidOrders || 0} paid`}
          icon={<ShoppingCart className="h-5 w-5" />}
          color="text-blue-400"
          bgColor="bg-blue-500/10"
        />
        <KpiCard
          title="Customers"
          value={String(summary?.totalCustomers || 0)}
          subtitle={repeatStats ? `${repeatStats.repeatCustomers} repeat (${repeatStats.repeatRate.toFixed(1)}%)` : "Loading..."}
          icon={<Users className="h-5 w-5" />}
          color="text-purple-400"
          bgColor="bg-purple-500/10"
        />
        <KpiCard
          title="Avg. Order Value"
          value={formatCurrency(summary?.avgOrderValue || 0)}
          subtitle="Per paid order"
          icon={<TrendingUp className="h-5 w-5" />}
          color="text-amber-400"
          bgColor="bg-amber-500/10"
        />
      </div>

      {/* Revenue Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Revenue Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {revenueLoading ? (
            <div className="h-72 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : revenueData && revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#7c3aed" strokeWidth={2} fill="url(#revenueGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-72 flex items-center justify-center text-muted-foreground">
              <p>No revenue data available for this period</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders per Day + New Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-400" />
              Orders per Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData && revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" tickFormatter={formatDate} stroke="#888" fontSize={11} />
                  <YAxis stroke="#888" fontSize={11} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="orderCount" name="Orders" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                No order data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-400" />
              New Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {newCustomers && newCustomers.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={newCustomers}>
                  <defs>
                    <linearGradient id="customerGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" tickFormatter={formatDate} stroke="#888" fontSize={11} />
                  <YAxis stroke="#888" fontSize={11} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" name="New Customers" stroke="#a78bfa" strokeWidth={2} fill="url(#customerGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                No customer data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-indigo-400" />
              Order Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orderStatusPieData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={220}>
                  <PieChart>
                    <Pie
                      data={orderStatusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {orderStatusPieData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.status] || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {orderStatusPieData.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[entry.status] || COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground">{entry.name}</span>
                      <span className="font-semibold ml-auto">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No order data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-400" />
              Payment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentStatusPieData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={220}>
                  <PieChart>
                    <Pie
                      data={paymentStatusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {paymentStatusPieData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.status] || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {paymentStatusPieData.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[entry.status] || COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground">{entry.name}</span>
                      <span className="font-semibold ml-auto">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No payment data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products + Revenue by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-400" />
              Top Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts && topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis type="number" stroke="#888" fontSize={11} />
                  <YAxis
                    type="category"
                    dataKey="productName"
                    stroke="#888"
                    fontSize={11}
                    width={120}
                    tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + "…" : v}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="totalQuantity" name="Qty Sold" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                No product sales data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-cyan-400" />
              Revenue by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryRevenue && categoryRevenue.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={280}>
                  <PieChart>
                    <Pie
                      data={categoryRevenue.map(d => ({ name: d.category, value: d.revenue }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryRevenue.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {categoryRevenue.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground truncate">{entry.category}</span>
                      <span className="font-semibold ml-auto">{formatCurrency(entry.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                No category data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Repeat Customer Card */}
      {repeatStats && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Repeat className="h-4 w-4 text-emerald-400" />
              Customer Loyalty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">{repeatStats.totalCustomers}</p>
                <p className="text-sm text-muted-foreground mt-1">Total Customers</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-400">{repeatStats.repeatCustomers}</p>
                <p className="text-sm text-muted-foreground mt-1">Repeat Customers</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{repeatStats.repeatRate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground mt-1">Repeat Rate</p>
              </div>
            </div>
            {/* Visual bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>One-time buyers</span>
                <span>Repeat buyers</span>
              </div>
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(repeatStats.repeatRate, 2)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== KPI CARD ====================
function KpiCard({ title, value, subtitle, icon, color, bgColor }: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className={`p-2.5 rounded-lg ${bgColor} ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
