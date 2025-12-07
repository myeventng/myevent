// src/components/admin/admin-revenue-analytics.tsx
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  PieChart,
  BarChart3,
  Download,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { getRevenueAnalytics } from '@/actions/analytics.actions';
import { getPublicPlatformSettings } from '@/actions/platform-settings.actions';
import Link from 'next/link';

export function AdminRevenueAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days
  const [platformFeePercentage, setPlatformFeePercentage] = useState<number>(5); // Default 5%

  // Fetch platform fee percentage
  const fetchPlatformFee = async () => {
    try {
      const response = await getPublicPlatformSettings();
      if (response.success && response.data) {
        setPlatformFeePercentage(response.data.defaultPlatformFeePercentage);
      }
    } catch (error) {
      console.error('Error fetching platform fee:', error);
      // Keep default 5% if fetch fails
    }
  };

  // Fetch analytics data
  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await getRevenueAnalytics();
      if (response.success && response.data) {
        setAnalytics(response.data);
      }
    } catch (error) {
      console.error('Error fetching revenue analytics:', error);
      toast.error('Failed to fetch revenue analytics');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch both platform fee and analytics on mount
  useEffect(() => {
    const fetchData = async () => {
      await fetchPlatformFee();
      await fetchAnalytics();
    };
    fetchData();
  }, []);

  // Calculate platform fee from revenue
  const calculatePlatformFee = (revenue: number) => {
    return (revenue * platformFeePercentage) / 100;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revenue Analytics</h1>
          <p className="text-muted-foreground">
            Platform revenue, fees ({platformFeePercentage}%), and financial performance overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 3 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={fetchAnalytics}
            disabled={isLoading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Revenue Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-full">
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold">
                  ₦{analytics?.totalRevenue?.toLocaleString() || '0'}
                </p>
                <div className="flex items-center text-xs text-green-600">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +12.5% vs last month
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-full">
                <PieChart className="w-4 h-4 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Platform Fees
                </p>
                <p className="text-2xl font-bold">
                  ₦{analytics?.platformFees?.toLocaleString() || '0'}
                </p>
                <div className="flex items-center text-xs text-blue-600">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +8.2% vs last month
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-full">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Organizer Earnings
                </p>
                <p className="text-2xl font-bold">
                  ₦{analytics?.organizerEarnings?.toLocaleString() || '0'}
                </p>
                <div className="flex items-center text-xs text-purple-600">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +15.1% vs last month
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-full">
                <TrendingDown className="w-4 h-4 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Refunded Amount
                </p>
                <p className="text-2xl font-bold">
                  ₦{analytics?.refundedAmount?.toLocaleString() || '0'}
                </p>
                <div className="flex items-center text-xs text-red-600">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  -2.4% vs last month
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Monthly Revenue Trend
            </CardTitle>
            <CardDescription>
              Revenue and platform fees ({platformFeePercentage}%) over the last 12 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.monthlyRevenue?.map((item: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{item.month}</p>
                    <p className="text-sm text-muted-foreground">
                      Platform Fee: ₦{item.fees?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      ₦{item.revenue?.toLocaleString() || '0'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.revenue > 0
                        ? ((item.fees / item.revenue) * 100).toFixed(1)
                        : platformFeePercentage.toFixed(1)}% fee rate
                    </p>
                  </div>
                </div>
              )) || (
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium">No revenue data</p>
                    <p className="text-muted-foreground">
                      Revenue data will appear here as events are sold
                    </p>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top Revenue Events
            </CardTitle>
            <CardDescription>
              Highest earning events by total revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.topEvents
                ?.slice(0, 8)
                .map((event: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{event.title}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{event.tickets} tickets</span>
                        <span>
                          ₦{calculatePlatformFee(event.revenue || 0).toLocaleString()}{' '}
                          platform fee
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        ₦{event.revenue?.toLocaleString() || '0'}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium">No event data</p>
                    <p className="text-muted-foreground">
                      Top events will appear here based on revenue
                    </p>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Revenue Breakdown */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Revenue by Event Category</CardTitle>
          <CardDescription>
            Platform fee collection and organizer payouts by event type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-blue-800">Tech Events</p>
                <Badge className="bg-blue-100 text-blue-800">35%</Badge>
              </div>
              <p className="text-2xl font-bold text-blue-800">₦2,450,000</p>
              <p className="text-sm text-blue-600">Platform Fee: ₦122,500</p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-green-800">Entertainment</p>
                <Badge className="bg-green-100 text-green-800">28%</Badge>
              </div>
              <p className="text-2xl font-bold text-green-800">₦1,960,000</p>
              <p className="text-sm text-green-600">Platform Fee: ₦98,000</p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-purple-800">Business</p>
                <Badge className="bg-purple-100 text-purple-800">22%</Badge>
              </div>
              <p className="text-2xl font-bold text-purple-800">₦1,540,000</p>
              <p className="text-sm text-purple-600">Platform Fee: ₦77,000</p>
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Management</CardTitle>
          <CardDescription>
            Quick access to financial management tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" className="h-16 flex-col" asChild>
              <Link href="/admin/dashboard/payouts">
                <DollarSign className="w-6 h-6 mb-1" />
                <span>Manage Payouts</span>
              </Link>
            </Button>

            <Button variant="outline" className="h-16 flex-col">
              <BarChart3 className="w-6 h-6 mb-1" />
              <span>Financial Reports</span>
            </Button>

            <Button variant="outline" className="h-16 flex-col">
              <Users className="w-6 h-6 mb-1" />
              <span>Organizer Analytics</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}