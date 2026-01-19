import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, MapPin, Phone, Check, X, Loader2, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AdminCreateLead from '@/components/AdminCreateLead';

interface UserProfile {
  id: string;
  name: string;
  phone: string | null;
  location_lat: number | null;
  location_long: number | null;
  service_type: string | null;
  is_subscribed: boolean | null;
  subscription_expires_at: string | null;
  created_at: string | null;
}

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'leads' | 'lead-tracking'>('users');
  const [adminLeads, setAdminLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);


  // Check if current user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setCheckingAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin',
        });

        if (error) throw error;
        setIsAdmin(data === true);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Fetch all users if admin
  useEffect(() => {
    const fetchUsers = async () => {
      if (!isAdmin) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setUsers(data || []);
        setFilteredUsers(data || []);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load users',
        });
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  // Fetch admin-generated leads
  useEffect(() => {
    const fetchAdminLeads = async () => {
      if (!isAdmin || !user) return;

      setLoadingLeads(true);
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .eq('created_by_user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAdminLeads(data || []);
      } catch (error) {
        console.error('Error fetching admin leads:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load leads',
        });
      } finally {
        setLoadingLeads(false);
      }
    };

    if (isAdmin && activeTab === 'lead-tracking') {
      fetchAdminLeads();
    }
  }, [isAdmin, user, activeTab]);


  // Filter users based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(
      (user) =>
        user.name?.toLowerCase().includes(query) ||
        user.phone?.toLowerCase().includes(query) ||
        user.service_type?.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const toggleSubscription = async (userId: string, currentStatus: boolean) => {
    setUpdatingUser(userId);
    try {
      const newStatus = !currentStatus;
      const expiresAt = newStatus
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        : null;

      const { error } = await supabase
        .from('profiles')
        .update({
          is_subscribed: newStatus,
          subscription_expires_at: expiresAt,
        })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, is_subscribed: newStatus, subscription_expires_at: expiresAt }
            : u
        )
      );

      toast({
        title: 'Success',
        description: `Subscription ${newStatus ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update subscription',
      });
    } finally {
      setUpdatingUser(null);
    }
  };

  const formatServiceType = (type: string | null) => {
    if (!type) return 'N/A';
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <Shield className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Authentication Required</h1>
        <p className="text-muted-foreground text-center">
          Please log in to access the admin dashboard
        </p>
        <Button onClick={() => navigate('/auth')}>Go to Login</Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <Shield className="h-16 w-16 text-destructive" />
        <h1 className="text-xl font-semibold">Access Denied</h1>
        <p className="text-muted-foreground text-center">
          You do not have permission to access the admin dashboard
        </p>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6" />
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            Exit Admin
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Tab Navigation */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            User Management
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'leads'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Create Leads
          </button>
          <button
            onClick={() => setActiveTab('lead-tracking')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'lead-tracking'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Lead Tracking
          </button>
        </div>

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Users
              </CardTitle>
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
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Subscribers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">
                  {users.filter((u) => u.is_subscribed).length}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Free Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <X className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">
                  {users.filter((u) => !u.is_subscribed).length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or service type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No users found matching your search' : 'No users found'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Service Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Subscription</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((userProfile) => (
                      <TableRow key={userProfile.id}>
                        <TableCell className="font-medium">
                          {userProfile.name || 'Unnamed'}
                        </TableCell>
                        <TableCell>
                          {userProfile.phone ? (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {userProfile.phone}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {userProfile.location_lat && userProfile.location_long ? (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs">
                                {userProfile.location_lat.toFixed(4)},{' '}
                                {userProfile.location_long.toFixed(4)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {formatServiceType(userProfile.service_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {userProfile.is_subscribed ? (
                            <Badge className="bg-primary/10 text-primary border-primary/20">
                              Subscribed
                            </Badge>
                          ) : (
                            <Badge variant="outline">Free</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {updatingUser === userProfile.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Switch
                                checked={userProfile.is_subscribed || false}
                                onCheckedChange={() =>
                                  toggleSubscription(
                                    userProfile.id,
                                    userProfile.is_subscribed || false
                                  )
                                }
                              />
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
        )}

        {/* Create Leads Tab */}
        {activeTab === 'leads' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    Create New Lead
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <AdminCreateLead onLeadCreated={() => setActiveTab('lead-tracking')} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Use this form to create new leads that service providers can claim and complete.
                  Fill in the customer details, location, and service type to get started.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Lead Tracking Tab */}
        {activeTab === 'lead-tracking' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Created Leads</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingLeads ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : adminLeads.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No leads created yet. Create your first lead to see it here.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {adminLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{lead.customer_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {lead.service_type ? formatServiceType(lead.service_type) : 'Unknown Service'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge
                              variant={
                                lead.status === 'completed'
                                  ? 'default'
                                  : lead.status === 'rejected'
                                  ? 'destructive'
                                  : lead.claimed_by_user_id
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {lead.status === 'completed' ? (
                                <>
                                  <Check size={14} className="mr-1" /> Completed
                                </>
                              ) : lead.status === 'rejected' ? (
                                <>
                                  <X size={14} className="mr-1" /> Rejected
                                </>
                              ) : lead.claimed_by_user_id ? (
                                'In Progress'
                              ) : (
                                'Open'
                              )}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Phone</p>
                            <p className="font-medium flex items-center gap-2">
                              <Phone size={16} />
                              {lead.customer_phone}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Lead Generator</p>
                            <p className="font-medium">{lead.lead_generator_phone || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="text-sm">
                          <p className="text-muted-foreground">Location</p>
                          <p className="font-medium flex items-center gap-2">
                            <MapPin size={16} />
                            {lead.location_address || 'No location'}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm border-t pt-3">
                          <div>
                            <p className="text-muted-foreground">Created</p>
                            <p className="text-xs">
                              {new Date(lead.created_at).toLocaleDateString()} at{' '}
                              {new Date(lead.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          {lead.completed_at && (
                            <div>
                              <p className="text-muted-foreground">Completed</p>
                              <p className="text-xs text-green-600">
                                {new Date(lead.completed_at).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                          {lead.rejected_at && (
                            <div>
                              <p className="text-muted-foreground">Rejected</p>
                              <p className="text-xs text-red-600">
                                {new Date(lead.rejected_at).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
