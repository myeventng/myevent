// components/voting/paid-vote-interface.tsx
'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  Vote,
  CreditCard,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trophy,
  Users,
  ShoppingCart,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  castPaidVoteFromOrder,
  getUserVoteOrdersForContest,
} from '@/actions/voting-contest.actions';

interface VoteOrder {
  id: string;
  voteCount: number;
  votesRemaining: number;
  totalAmount: number;
  votePackage?: {
    name: string;
    voteCount: number;
  };
}

interface PaidVoteInterfaceProps {
  contestId: string;
  contestantId: string;
  contestantName: string;
  onVoteSuccess?: () => void;
}

export function PaidVoteInterface({
  contestId,
  contestantId,
  contestantName,
  onVoteSuccess,
}: PaidVoteInterfaceProps) {
  const [voteOrders, setVoteOrders] = useState<VoteOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [totalVotesRemaining, setTotalVotesRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadVoteOrders();
  }, [contestId]);

  const loadVoteOrders = async () => {
    try {
      setIsLoading(true);
      const response = await getUserVoteOrdersForContest(contestId);

      if (response.success && response.data) {
        setVoteOrders(response.data.voteOrders || []);
        setTotalVotesRemaining(response.data.totalVotesRemaining || 0);

        // Auto-select the first available order
        if (response.data.voteOrders && response.data.voteOrders.length > 0) {
          setSelectedOrderId(response.data.voteOrders[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading vote orders:', error);
      toast.error('Failed to load your vote packages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCastVote = async () => {
    if (!selectedOrderId) {
      toast.error('Please select a vote package');
      return;
    }

    startTransition(async () => {
      try {
        const result = await castPaidVoteFromOrder({
          contestantId,
          voteOrderId: selectedOrderId,
        });

        if (result.success) {
          toast.success(result.message || 'Vote cast successfully!');

          // Refresh vote orders to update remaining votes
          await loadVoteOrders();

          // Call success callback
          onVoteSuccess?.();
        } else {
          toast.error(result.message || 'Failed to cast vote');
        }
      } catch (error) {
        console.error('Error casting paid vote:', error);
        toast.error('An unexpected error occurred');
      }
    });
  };

  const selectedOrder = voteOrders.find(
    (order) => order.id === selectedOrderId
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading your vote packages...</span>
        </CardContent>
      </Card>
    );
  }

  if (voteOrders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            No Vote Packages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              You don&apos;t have any vote packages with remaining votes.
            </p>
            <p className="text-sm text-muted-foreground">
              Purchase a vote package to start voting for {contestantName}.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Vote className="h-5 w-5 text-blue-600" />
          Cast Vote for {contestantName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-blue-800">Available Votes</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {totalVotesRemaining} votes remaining
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Select Vote Package:</label>
          <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a vote package" />
            </SelectTrigger>
            <SelectContent>
              {voteOrders.map((order) => (
                <SelectItem key={order.id} value={order.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>
                      {order.votePackage?.name || `${order.voteCount} votes`}
                    </span>
                    <Badge variant="secondary" className="ml-2">
                      {order.votesRemaining} remaining
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedOrder && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Using 1 vote from &quot;
              {selectedOrder.votePackage?.name || 'Vote Package'}&quot; (
              {selectedOrder.votesRemaining} votes remaining)
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleCastVote}
          disabled={!selectedOrderId || isPending || totalVotesRemaining === 0}
          className="w-full"
          size="lg"
        >
          {isPending ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Casting Vote...
            </>
          ) : (
            <>
              <Vote className="h-5 w-5 mr-2" />
              Cast Vote for {contestantName}
            </>
          )}
        </Button>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            This will use 1 vote from your selected package
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
