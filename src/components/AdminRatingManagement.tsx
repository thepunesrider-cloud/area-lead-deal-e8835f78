import React, { useState, useEffect } from 'react';
import { Star, AlertTriangle, Trash2, Mail, Loader2, Filter, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import SubscriptionTimer from './SubscriptionTimer';

interface UserWithRating {
  id: string;
  name: string;
  phone: string | null;
  service_type: string | null;
  is_subscribed: boolean | null;
  subscription_expires_at: string | null;
  average_rating: number;
  total_ratings: number;
}

interface Rating {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  lead_id: string;
  rater_name: string;
}

const AdminRatingManagement: React.FC = () => {
  const [users, setUsers] = useState<UserWithRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRating | null>(null);
  const [userRatings, setUserRatings] = useState<Rating[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [sendingWarning, setSendingWarning] = useState(false);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch users with their ratings
  useEffect(() => {
    const fetchUsersWithRatings = async () => {
      setLoading(true);
      try {
        // Get all profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, phone, service_type, is_subscribed, subscription_expires_at')
          .order('name');

        if (profilesError) throw profilesError;

        // Get all ratings grouped by rated_user_id
        const { data: ratings, error: ratingsError } = await supabase
          .from('ratings')
          .select('rated_user_id, rating');

        if (ratingsError) throw ratingsError;

        // Calculate average rating for each user
        const ratingMap: Record<string, { total: number; count: number }> = {};
        ratings?.forEach((r) => {
          if (!ratingMap[r.rated_user_id]) {
            ratingMap[r.rated_user_id] = { total: 0, count: 0 };
          }
          ratingMap[r.rated_user_id].total += r.rating;
          ratingMap[r.rated_user_id].count += 1;
        });

        // Combine profiles with ratings
        const usersWithRatings: UserWithRating[] = (profiles || []).map((p) => ({
          ...p,
          average_rating: ratingMap[p.id]
            ? ratingMap[p.id].total / ratingMap[p.id].count
            : 0,
          total_ratings: ratingMap[p.id]?.count || 0,
        }));

        setUsers(usersWithRatings);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load users with ratings',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsersWithRatings();
  }, [toast]);

  // Fetch ratings for selected user
  const fetchUserRatings = async (userId: string) => {
    setLoadingRatings(true);
    try {
      const { data, error } = await supabase
        .from('ratings')
        .select(`
          id,
          rating,
          comment,
          created_at,
          lead_id,
          rater:profiles!ratings_rater_id_fkey(name)
        `)
        .eq('rated_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUserRatings(
        (data || []).map((r: any) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
          lead_id: r.lead_id,
          rater_name: r.rater?.name || 'Unknown',
        }))
      );
    } catch (error) {
      console.error('Error fetching ratings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load ratings',
      });
    } finally {
      setLoadingRatings(false);
    }
  };

  // Send warning to user
  const sendWarning = async () => {
    if (!selectedUser || !warningMessage.trim()) return;
    
    setSendingWarning(true);
    try {
      await supabase.from('notifications').insert({
        user_id: selectedUser.id,
        type: 'warning',
        title: '⚠️ Warning from Admin',
        body: warningMessage,
        data: { type: 'admin_warning', rating: selectedUser.average_rating },
      });

      toast({
        title: 'Warning Sent',
        description: `Warning notification sent to ${selectedUser.name}`,
      });
      setWarningModalOpen(false);
      setWarningMessage('');
    } catch (error) {
      console.error('Error sending warning:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send warning',
      });
    } finally {
      setSendingWarning(false);
    }
  };

  // Delete user account
  const deleteUser = async (userId: string) => {
    setDeletingUser(userId);
    try {
      // Delete user profile (cascade will handle related data)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      
      toast({
        title: 'User Deleted',
        description: 'User account has been removed',
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete user',
      });
    } finally {
      setDeletingUser(null);
    }
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    // Search filter
    const matchesSearch = 
      !searchQuery.trim() ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery);

    // Rating filter
    let matchesRating = true;
    if (ratingFilter === 'low') {
      matchesRating = user.average_rating > 0 && user.average_rating < 3;
    } else if (ratingFilter === 'medium') {
      matchesRating = user.average_rating >= 3 && user.average_rating < 4;
    } else if (ratingFilter === 'high') {
      matchesRating = user.average_rating >= 4;
    } else if (ratingFilter === 'no-rating') {
      matchesRating = user.total_ratings === 0;
    }

    return matchesSearch && matchesRating;
  });

  const formatServiceType = (type: string | null) => {
    if (!type) return 'N/A';
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={
              star <= rating
                ? 'fill-secondary text-secondary'
                : 'text-muted-foreground'
            }
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users with Ratings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">
                {users.filter((u) => u.total_ratings > 0).length}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Rated (&lt;3 stars)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold text-destructive">
                {users.filter((u) => u.average_rating > 0 && u.average_rating < 3).length}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Rating (≥3)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-secondary" />
              <span className="text-2xl font-bold">
                {users.filter((u) => u.average_rating >= 3 && u.average_rating < 4).length}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Rated (≥4 stars)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-primary text-primary" />
              <span className="text-2xl font-bold text-primary">
                {users.filter((u) => u.average_rating >= 4).length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter size={20} />
            Filter Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="low">Low (&lt;3 stars)</SelectItem>
                <SelectItem value="medium">Medium (3-4 stars)</SelectItem>
                <SelectItem value="high">High (≥4 stars)</SelectItem>
                <SelectItem value="no-rating">No Ratings</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Ratings Management</CardTitle>
          <CardDescription>
            View user ratings, send warnings, or delete accounts for low-rated users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found matching your criteria
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className={user.average_rating > 0 && user.average_rating < 3 ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-medium">
                        {user.name || 'Unnamed'}
                      </TableCell>
                      <TableCell>{user.phone || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {formatServiceType(user.service_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.total_ratings > 0 ? (
                          <div className="flex items-center gap-2">
                            {renderStars(Math.round(user.average_rating))}
                            <span className="text-sm font-medium">
                              {user.average_rating.toFixed(1)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({user.total_ratings})
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No ratings</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <SubscriptionTimer
                          expiresAt={user.subscription_expires_at}
                          isSubscribed={user.is_subscribed || false}
                          compact
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              fetchUserRatings(user.id);
                            }}
                          >
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-secondary border-secondary hover:bg-secondary/10"
                            onClick={() => {
                              setSelectedUser(user);
                              setWarningModalOpen(true);
                            }}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive border-destructive hover:bg-destructive/10"
                              >
                                {deletingUser === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User Account?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete {user.name}'s account and all associated data. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => deleteUser(user.id)}
                                >
                                  Delete Account
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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

      {/* User Ratings Detail Modal */}
      <Dialog open={!!selectedUser && !warningModalOpen} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="text-secondary" />
              Ratings for {selectedUser?.name}
            </DialogTitle>
            <DialogDescription>
              Average: {selectedUser?.average_rating.toFixed(1)} stars from {selectedUser?.total_ratings} reviews
            </DialogDescription>
          </DialogHeader>

          {loadingRatings ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : userRatings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No ratings found for this user
            </div>
          ) : (
            <div className="space-y-3">
              {userRatings.map((rating) => (
                <div key={rating.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {renderStars(rating.rating)}
                      <span className="font-medium">{rating.rating}/5</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(rating.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    By: {rating.rater_name}
                  </p>
                  {rating.comment && (
                    <p className="text-sm mt-2 p-2 bg-muted rounded">
                      "{rating.comment}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warning Modal */}
      <Dialog open={warningModalOpen} onOpenChange={setWarningModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-secondary" />
              Send Warning to {selectedUser?.name}
            </DialogTitle>
            <DialogDescription>
              This will send a notification to the user about their low rating or service issues.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Warning Message</label>
              <Textarea
                placeholder="Enter your warning message..."
                value={warningMessage}
                onChange={(e) => setWarningMessage(e.target.value)}
                rows={4}
              />
            </div>
            
            <div className="bg-muted rounded-lg p-3 text-sm">
              <p className="font-medium mb-1">Quick Templates:</p>
              <div className="space-y-1">
                <button
                  className="text-left w-full p-2 rounded hover:bg-background text-muted-foreground"
                  onClick={() => setWarningMessage('Your rating has dropped below acceptable levels. Please improve your service quality to continue using the platform.')}
                >
                  • Low rating warning
                </button>
                <button
                  className="text-left w-full p-2 rounded hover:bg-background text-muted-foreground"
                  onClick={() => setWarningMessage('We have received complaints about your service. Please ensure you complete leads on time and maintain professional communication.')}
                >
                  • Complaint received
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWarningModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={sendWarning}
              disabled={!warningMessage.trim() || sendingWarning}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              {sendingWarning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Send Warning'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRatingManagement;
