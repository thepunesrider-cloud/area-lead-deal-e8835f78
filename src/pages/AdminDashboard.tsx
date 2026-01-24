import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, TrendingUp, Users, Zap, DollarSign, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateAdminDashboardData, exportReport } from '@/lib/export-reports';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { useToast } from '@/hooks/use-toast';

const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*, profiles!leads_created_by_user_id_fkey(name, phone)');

      if (leadsError) throw leadsError;

      setLeads(leadsData || []);

      // Fetch payments (for revenue metrics)
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*');

      // Generate dashboard data
      const data = generateAdminDashboardData(leadsData || [], paymentsData || []);
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load dashboard data',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = (format: 'csv' | 'json') => {
    if (!dashboardData) return;
    try {
      exportReport(dashboardData, format);
      toast({
        title: 'Success',
        description: `Report exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to export report',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!dashboardData) {
    return <div className="p-4">No data available</div>;
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Admin Dashboard" showBack />

      <main className="px-4 py-6 max-w-6xl mx-auto space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Leads"
            value={dashboardData.totalLeads}
            icon={<Zap className="w-5 h-5" />}
            color="bg-blue-50"
          />
          <MetricCard
            title="Completion Rate"
            value={`${dashboardData.completionRate.toFixed(1)}%`}
            icon={<TrendingUp className="w-5 h-5" />}
            color="bg-green-50"
          />
          <MetricCard
            title="Active Providers"
            value={dashboardData.topProviders.length}
            icon={<Users className="w-5 h-5" />}
            color="bg-purple-50"
          />
          <MetricCard
            title="Revenue"
            value={`₹${(dashboardData.revenueMetrics?.totalRevenue || 0).toLocaleString()}`}
            icon={<DollarSign className="w-5 h-5" />}
            color="bg-orange-50"
          />
        </div>

        {/* Lead Status Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Lead Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Open', value: dashboardData.openLeads },
                      { name: 'Claimed', value: dashboardData.claimedLeads },
                      { name: 'Completed', value: dashboardData.completedLeads },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Service Types */}
          <Card>
            <CardHeader>
              <CardTitle>Top Service Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.topServiceTypes.slice(0, 5).map((service: any) => (
                  <div key={service.serviceType} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium capitalize">{service.serviceType.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-muted-foreground">{service.count} leads</p>
                    </div>
                    <Badge variant="secondary">{service.completionRate.toFixed(0)}% completed</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Providers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Provider</th>
                    <th className="text-center py-2">Completed Leads</th>
                    <th className="text-center py-2">Average Rating</th>
                    <th className="text-right py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.topProviders.slice(0, 10).map((provider: any) => (
                    <tr key={provider.userId} className="border-b hover:bg-muted/50">
                      <td className="py-3">{provider.name}</td>
                      <td className="text-center">{provider.completedCount}</td>
                      <td className="text-center">★ {provider.averageRating.toFixed(1)}</td>
                      <td className="text-right">
                        <Badge variant="outline" className="bg-green-50">
                          Active
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Average Processing Times</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Claim Time</p>
                  <p className="text-2xl font-bold">{dashboardData.averageClaimTime.toFixed(1)} hrs</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Completion Time</p>
                  <p className="text-2xl font-bold">{dashboardData.averageCompletionTime.toFixed(1)} hrs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Metrics */}
          {dashboardData.revenueMetrics && (
            <Card>
              <CardHeader>
                <CardTitle>Revenue Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">₹{(dashboardData.revenueMetrics.totalRevenue || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Subscription Revenue</p>
                    <p className="text-2xl font-bold">₹{(dashboardData.revenueMetrics.subscriptionRevenue || 0).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle>Export Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={() => handleExportReport('csv')}
                variant="outline"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export as CSV
              </Button>
              <Button
                onClick={() => handleExportReport('json')}
                variant="outline"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export as JSON
              </Button>
              <Button
                onClick={fetchDashboardData}
                variant="outline"
                className="gap-2"
              >
                Refresh Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color }) => (
  <Card className={color}>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </div>
    </CardContent>
  </Card>
);

export default AdminDashboard;
