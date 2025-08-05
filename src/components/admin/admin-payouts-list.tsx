// src/components/admin/admin-payouts-list.tsx
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
import { Badge } from '@/components/ui/badge';
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
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Search,
  Download,
  Eye,
  Check,
  X,
  Clock,
  DollarSign,
  Filter,
  RefreshCw,
  CheckSquare,
  Square,
} from 'lucide-react';
import Link from 'next/link';
import {
  getAllPayoutRequests,
  processPayout,
  bulkProcessPayouts,
} from '@/actions/payout.actions';

export function AdminPayoutsList() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [filteredPayouts, setFilteredPayouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPayouts, setSelectedPayouts] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch payouts
  const fetchPayouts = async () => {
    setIsLoading(true);
    try {
      const response = await getAllPayoutRequests();
      if (response.success && response.data) {
        setPayouts(response.data);
        setFilteredPayouts(response.data);
      }
    } catch (error) {
      console.error('Error fetching payouts:', error);
      toast.error('Failed to fetch payout requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  // Filter payouts
  useEffect(() => {
    let filtered = payouts;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(payout => payout.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(payout =>
        payout.organizer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payout.organizer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payout.organizer.organizerProfile?.organizationName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPayouts(filtered);
  }, [payouts, statusFilter, searchTerm]);

  // Handle single payout approval/rejection
  const handleProcessPayout = async (payoutId: string, approve: boolean) => {
    setIsProcessing(true);
    try {
      const response = await processPayout(payoutId, approve);
      if (response.success) {
        toast.success(response.message);
        fetchPayouts();
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.error('Error processing payout:', error);
      toast.error('Failed to process payout');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle bulk processing
  const handleBulkProcess = async (approve: boolean) => {
    if (selectedPayouts.length === 0) {
      toast.error('Please select payouts to process');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await bulkProcessPayouts(selectedPayouts, approve);
      if (response.success) {
        toast.success(response.message);
        setSelectedPayouts([]);
        fetchPayouts();
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.error('Error bulk processing payouts:', error);
      toast.error('Failed to process payouts');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    const pendingPayouts = filteredPayouts
      .filter(p => p.status === 'PENDING')
      .map(p => p.id);
    
    if (selectedPayouts.length === pendingPayouts.length) {
      setSelectedPayouts([]);
    } else {
      setSelectedPayouts(pendingPayouts);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const variants = {
      PENDING: { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800' },
      PROCESSING: { variant: 'default' as const, color: 'bg-blue-100 text-blue-800' },
      COMPLETED: { variant: 'default' as const, color: 'bg-green-100 text-green-800' },
      FAILED: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
    };

    const config = variants[status as keyof typeof variants] || variants.PENDING;

    return (
      <Badge className={config.color}>
        {status}
      </Badge>
    );
  };

  // Calculate totals
  const totalPending = payouts.filter(p => p.status === 'PENDING').length;
  const totalAmount = payouts
    .filter(p => p.status === 'PENDING')
    .reduce((sum, p) => sum + p.netAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payout Requests</h1>
          <p className="text-muted-foreground">
            Manage organizer payout requests and transfers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchPayouts} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-full">
                <X className="w-4 h-4 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Failed This Week
                </p>
                <p className="text-2xl font-bold">
                  {payouts.filter(p => 
                    p.status === 'FAILED' && 
                    new Date(p.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Bulk Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by organizer name, email, or organization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>

            {/* Bulk Actions */}
            {selectedPayouts.length > 0 && (
              <div className="flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="default" disabled={isProcessing}>
                      <Check className="w-4 h-4 mr-1" />
                      Approve Selected ({selectedPayouts.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Approve Selected Payouts</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to approve {selectedPayouts.length} selected payout requests? 
                        This action will initiate the transfer process.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleBulkProcess(true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isProcessing}>
                      <X className="w-4 h-4 mr-1" />
                      Reject Selected
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reject Selected Payouts</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to reject {selectedPayouts.length} selected payout requests? 
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleBulkProcess(false)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Reject All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payout Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Requests</CardTitle>
          <CardDescription>
            {filteredPayouts.length} of {payouts.length} requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredPayouts.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No payout requests found</p>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Payout requests will appear here when organizers submit them'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedPayouts.length === filteredPayouts.filter(p => p.status === 'PENDING').length && filteredPayouts.filter(p => p.status === 'PENDING').length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all pending payouts"
                      />
                    </TableHead>
                    <TableHead>Organizer</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Net Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>
                        {payout.status === 'PENDING' && (
                          <Checkbox
                            checked={selectedPayouts.includes(payout.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedPayouts([...selectedPayouts, payout.id]);
                              } else {
                                setSelectedPayouts(selectedPayouts.filter(id => id !== payout.id));
                              }
                            }}
                            aria-label={`Select payout for ${payout.organizer.name}`}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payout.organizer.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {payout.organizer.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {payout.organizer.organizerProfile?.organizationName || 'N/A'}
                      </TableCell>
                      <TableCell>
                        ₦{payout.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">₦{payout.netAmount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            Fee: ₦{payout.platformFee.toLocaleString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payout.status)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">
                            {format(new Date(payout.createdAt), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(payout.createdAt), 'h:mm a')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <Link href={`/admin/dashboard/payouts/${payout.id}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                          
                          {payout.status === 'PENDING' && (
                            <>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-600 hover:text-green-700"
                                    disabled={isProcessing}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Approve Payout</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Approve payout of ₦{payout.netAmount.toLocaleString()} to {payout.organizer.name}?
                                      This will initiate the transfer process.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleProcessPayout(payout.id, true)}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      Approve
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                    disabled={isProcessing}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Reject Payout</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Reject payout request from {payout.organizer.name}?
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleProcessPayout(payout.id, false)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Reject
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}