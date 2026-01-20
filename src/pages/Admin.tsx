import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, MapPin, Phone, Check, X, Loader2, Shield, MessageSquare, Copy, RefreshCw, AlertTriangle, CheckCircle, Clock, Hash, Star, Eye, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import LeadTimeline from '@/components/LeadTimeline';
import AdminRatingManagement from '@/components/AdminRatingManagement';
import SubscriptionTimer from '@/components/SubscriptionTimer';
import WhatsAppMessagePreview from '@/components/WhatsAppMessagePreview';

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

interface WhatsAppLead {
  id: string;
  customer_name: string | null;
  customer_phone: string;
  location_address: string | null;
  service_type: string;
  import_confidence: number | null;
  raw_message: string | null;
  created_at: string;
  status: string;
  source: string | null;
  lead_generator_name: string | null;
}

interface WhatsAppMessage {
  id: string;
  sender_name: string | null;
  sender_phone: string | null;
  raw_message: string | null;
  group_name: string | null;
  group_id: string | null;
  message_timestamp: string | null;
  status: string | null;
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
  const [activeTab, setActiveTab] = useState<'users' | 'leads' | 'lead-tracking' | 'ratings' | 'whatsapp'>('users');
  const [adminLeads, setAdminLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [whatsappLeads, setWhatsappLeads] = useState<WhatsAppLead[]>([]);
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(false);
  const [autoApproveEnabled, setAutoApproveEnabled] = useState(false);
  const [updatingAutoApprove, setUpdatingAutoApprove] = useState(false);
  const [approvingLead, setApprovingLead] = useState<string | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [searchedLead, setSearchedLead] = useState<any | null>(null);
  const [searchingLead, setSearchingLead] = useState(false);
  const [leadSearchError, setLeadSearchError] = useState('');
  
  // WhatsApp Messages state
  const [whatsappMessages, setWhatsappMessages] = useState<WhatsAppMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [previewMessage, setPreviewMessage] = useState<WhatsAppMessage | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);


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

  // Fetch auto-approve setting
  useEffect(() => {
    const fetchAutoApproveSetting = async () => {
      if (!isAdmin) return;
      
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'whatsapp_auto_approve')
          .single();
        
        if (error) throw error;
        setAutoApproveEnabled((data?.value as any)?.enabled === true);
      } catch (error) {
        console.error('Error fetching auto-approve setting:', error);
      }
    };

    fetchAutoApproveSetting();
  }, [isAdmin]);

  // Fetch WhatsApp imported leads with real-time updates
  useEffect(() => {
    if (!isAdmin) return;

    const fetchWhatsappLeads = async () => {
      setLoadingWhatsapp(true);
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('id, customer_name, customer_phone, location_address, service_type, import_confidence, raw_message, created_at, status, source, lead_generator_name')
          .in('source', ['whatsapp', 'whatsapp_group', 'whatsapp_forwarded', 'msg91'])
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setWhatsappLeads((data as WhatsAppLead[]) || []);
      } catch (error) {
        console.error('Error fetching WhatsApp leads:', error);
      } finally {
        setLoadingWhatsapp(false);
      }
    };

    // Initial fetch
    fetchWhatsappLeads();

    // Set up real-time subscription for new WhatsApp/MSG91 leads
    const channel = supabase
      .channel('whatsapp-leads-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          const newLead = payload.new as WhatsAppLead;
          // Only process leads from WhatsApp sources
          if (['whatsapp', 'whatsapp_group', 'whatsapp_forwarded', 'msg91'].includes(newLead.source || '')) {
            console.log('New WhatsApp/MSG91 lead received:', payload);
            setWhatsappLeads((prev) => [newLead, ...prev.slice(0, 49)]);
            const sourceLabel = newLead.source === 'msg91' ? 'MSG91' : 'WhatsApp';
            toast({
              title: `🆕 New ${sourceLabel} Lead`,
              description: `${newLead.customer_name || 'Unknown'} - ${newLead.customer_phone}`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          const updatedLead = payload.new as WhatsAppLead;
          if (['whatsapp', 'whatsapp_group', 'whatsapp_forwarded', 'msg91'].includes(updatedLead.source || '')) {
            setWhatsappLeads((prev) =>
              prev.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, toast]);

  // Fetch WhatsApp messages from whatsapp_messages table
  useEffect(() => {
    if (!isAdmin || activeTab !== 'whatsapp') return;

    const fetchWhatsappMessages = async () => {
      setLoadingMessages(true);
      try {
        const { data, error } = await supabase
          .from('whatsapp_messages')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        setWhatsappMessages(data || []);
      } catch (error) {
        console.error('Error fetching WhatsApp messages:', error);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchWhatsappMessages();
  }, [isAdmin, activeTab]);

  // Auto-process pending messages when auto-approve is enabled
  const processAutoApproval = async (message: WhatsAppMessage) => {
    toast({
      title: '🔄 Auto-processing message...',
      description: `From: ${message.sender_name || message.sender_phone}`,
    });
    
    try {
      const { data, error } = await supabase.functions.invoke('parse-whatsapp-message', {
        body: {
          message_id: message.id,
          raw_message: message.raw_message,
          sender_phone: message.sender_phone,
          sender_name: message.sender_name,
        },
      });

      if (!error && !data.error) {
        setWhatsappMessages((prev) =>
          prev.map((msg) => (msg.id === message.id ? { ...msg, status: 'approved' } : msg))
        );
        toast({
          title: '✅ Auto-approved',
          description: `Lead created with ${data.confidence}% confidence`,
        });
        return true;
      } else {
        toast({
          variant: 'destructive',
          title: 'Auto-approval failed',
          description: data?.error || 'Failed to parse message',
        });
        return false;
      }
    } catch (err) {
      console.error('Auto-approve error:', err);
      return false;
    }
  };

  // Ref to track which messages we've already tried to auto-process
  const processedMessagesRef = useRef<Set<string>>(new Set());

  // Process existing pending messages when auto-approve is turned ON
  useEffect(() => {
    if (!isAdmin || !autoApproveEnabled) return;

    const processPendingMessages = async () => {
      // Get all pending messages that haven't been processed yet
      const pendingMessages = whatsappMessages.filter(
        msg => msg.status === 'new' && !processedMessagesRef.current.has(msg.id)
      );
      
      if (pendingMessages.length === 0) return;

      toast({
        title: '🔄 Processing pending messages...',
        description: `Found ${pendingMessages.length} pending message(s)`,
      });

      // Process sequentially to avoid overwhelming the API
      for (const message of pendingMessages) {
        // Mark as processed before attempting
        processedMessagesRef.current.add(message.id);
        await processAutoApproval(message);
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    };

    processPendingMessages();
  }, [isAdmin, autoApproveEnabled, whatsappMessages]);

  // Separate realtime subscription for auto-approval - runs regardless of active tab
  useEffect(() => {
    if (!isAdmin) return;

    // Real-time subscription for whatsapp_messages with auto-approval
    const channel = supabase
      .channel('whatsapp-messages-auto-approve')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
        },
        async (payload) => {
          const newMessage = payload.new as WhatsAppMessage;
          setWhatsappMessages((prev) => {
            // Only add if not already in list
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [newMessage, ...prev.slice(0, 99)];
          });
          
          // Auto-approve if enabled
          if (autoApproveEnabled && newMessage.status === 'new') {
            await processAutoApproval(newMessage);
          } else {
            toast({
              title: '📩 New WhatsApp Message',
              description: `From: ${newMessage.sender_name || newMessage.sender_phone}`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_messages',
        },
        (payload) => {
          const updatedMessage = payload.new as WhatsAppMessage;
          setWhatsappMessages((prev) =>
            prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, toast, autoApproveEnabled]);

  // Search lead by lead code
  const searchLeadByCode = async () => {
    if (!leadSearchQuery.trim()) {
      setLeadSearchError('Please enter a lead code');
      return;
    }

    setSearchingLead(true);
    setLeadSearchError('');
    setSearchedLead(null);

    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          claimed_by_user:profiles!leads_claimed_by_user_id_fkey(id, name, phone),
          created_by_user:profiles!leads_created_by_user_id_fkey(id, name, phone)
        `)
        .ilike('lead_code', `%${leadSearchQuery.trim()}%`)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setLeadSearchError('No lead found with this code');
      } else {
        setSearchedLead(data);
      }
    } catch (error) {
      console.error('Error searching lead:', error);
      setLeadSearchError('Failed to search lead');
    } finally {
      setSearchingLead(false);
    }
  };

  // Toggle auto-approve setting
  const toggleAutoApprove = async () => {
    setUpdatingAutoApprove(true);
    try {
      const newValue = !autoApproveEnabled;
      const { error } = await supabase
        .from('app_settings')
        .update({ value: { enabled: newValue } })
        .eq('key', 'whatsapp_auto_approve');

      if (error) throw error;
      
      setAutoApproveEnabled(newValue);
      toast({
        title: 'Setting Updated',
        description: `Auto-approve is now ${newValue ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Error updating auto-approve:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update setting',
      });
    } finally {
      setUpdatingAutoApprove(false);
    }
  };

  // Approve a pending lead
  const approveLead = async (leadId: string) => {
    setApprovingLead(leadId);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: 'open' })
        .eq('id', leadId);

      if (error) throw error;

      setWhatsappLeads((prev) =>
        prev.map((lead) => (lead.id === leadId ? { ...lead, status: 'open' } : lead))
      );

      toast({
        title: 'Lead Approved',
        description: 'Lead is now visible to service providers',
      });
    } catch (error) {
      console.error('Error approving lead:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to approve lead',
      });
    } finally {
      setApprovingLead(null);
    }
  };

  // Reject a pending lead
  const rejectPendingLead = async (leadId: string) => {
    setApprovingLead(leadId);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: 'rejected', rejected_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;

      setWhatsappLeads((prev) =>
        prev.map((lead) => (lead.id === leadId ? { ...lead, status: 'rejected' } : lead))
      );

      toast({
        title: 'Lead Rejected',
        description: 'Lead has been rejected',
      });
    } catch (error) {
      console.error('Error rejecting lead:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reject lead',
      });
    } finally {
      setApprovingLead(null);
    }
  };

  // Toggle individual lead selection
  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  // Select/deselect all pending leads
  const toggleSelectAll = () => {
    const pendingLeads = whatsappLeads.filter((l) => l.status === 'pending');
    if (selectedLeads.size === pendingLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(pendingLeads.map((l) => l.id)));
    }
  };

  // Bulk approve selected leads
  const bulkApprove = async () => {
    if (selectedLeads.size === 0) return;
    
    setBulkProcessing(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: 'open' })
        .in('id', Array.from(selectedLeads));

      if (error) throw error;

      setWhatsappLeads((prev) =>
        prev.map((lead) =>
          selectedLeads.has(lead.id) ? { ...lead, status: 'open' } : lead
        )
      );

      toast({
        title: 'Bulk Approved',
        description: `${selectedLeads.size} leads approved successfully`,
      });
      setSelectedLeads(new Set());
    } catch (error) {
      console.error('Error bulk approving leads:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to approve leads',
      });
    } finally {
      setBulkProcessing(false);
    }
  };

  // Bulk reject selected leads
  const bulkReject = async () => {
    if (selectedLeads.size === 0) return;
    
    setBulkProcessing(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: 'rejected', rejected_at: new Date().toISOString() })
        .in('id', Array.from(selectedLeads));

      if (error) throw error;

      setWhatsappLeads((prev) =>
        prev.map((lead) =>
          selectedLeads.has(lead.id) ? { ...lead, status: 'rejected' } : lead
        )
      );

      toast({
        title: 'Bulk Rejected',
        description: `${selectedLeads.size} leads rejected`,
      });
      setSelectedLeads(new Set());
    } catch (error) {
      console.error('Error bulk rejecting leads:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reject leads',
      });
    } finally {
      setBulkProcessing(false);
    }
  };

  // Open preview modal for a message
  const openMessagePreview = (message: WhatsAppMessage) => {
    setPreviewMessage(message);
    setPreviewOpen(true);
  };

  // Approve WhatsApp message with edited data from preview
  const approveWithEditedData = async (
    message: WhatsAppMessage,
    editedData: { customer_name: string | null; customer_phone: string | null; location_address: string | null; service_type: string | null; special_instructions: string | null },
    location: { lat: number; lng: number } | null
  ) => {
    setProcessingMessage(message.id);
    try {
      // Use service client to create lead directly with edited data
      const { data, error } = await supabase.functions.invoke('parse-whatsapp-message', {
        body: {
          message_id: message.id,
          raw_message: message.raw_message,
          sender_phone: message.sender_phone,
          sender_name: message.sender_name,
          // Pass edited data to override AI parsing
          override_data: {
            customer_name: editedData.customer_name,
            customer_phone: editedData.customer_phone,
            location_address: editedData.location_address,
            service_type: editedData.service_type,
            special_instructions: editedData.special_instructions,
            location_lat: location?.lat,
            location_lng: location?.lng,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error,
        });
        return;
      }

      // Update local state
      setWhatsappMessages((prev) =>
        prev.map((msg) => (msg.id === message.id ? { ...msg, status: 'approved' } : msg))
      );

      toast({
        title: '✅ Lead Created',
        description: `Lead created successfully`,
      });
    } catch (error) {
      console.error('Error approving message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to process message',
      });
    } finally {
      setProcessingMessage(null);
    }
  };

  // Quick approve WhatsApp message - parse with AI and create lead directly
  const approveWhatsAppMessage = async (message: WhatsAppMessage) => {
    setProcessingMessage(message.id);
    try {
      const { data, error } = await supabase.functions.invoke('parse-whatsapp-message', {
        body: {
          message_id: message.id,
          raw_message: message.raw_message,
          sender_phone: message.sender_phone,
          sender_name: message.sender_name,
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        toast({
          variant: 'destructive',
          title: 'Parsing Error',
          description: data.error,
        });
        return;
      }

      // Update local state
      setWhatsappMessages((prev) =>
        prev.map((msg) => (msg.id === message.id ? { ...msg, status: 'approved' } : msg))
      );

      toast({
        title: '✅ Lead Created',
        description: `Lead created with ${data.confidence}% confidence`,
      });
    } catch (error) {
      console.error('Error approving message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to process message',
      });
    } finally {
      setProcessingMessage(null);
    }
  };

  // Reject WhatsApp message
  const rejectWhatsAppMessage = async (messageId: string) => {
    setProcessingMessage(messageId);
    try {
      const { error } = await supabase
        .from('whatsapp_messages')
        .update({ status: 'rejected' })
        .eq('id', messageId);

      if (error) throw error;

      setWhatsappMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, status: 'rejected' } : msg))
      );

      toast({
        title: 'Message Rejected',
        description: 'Message has been marked as rejected',
      });
    } catch (error) {
      console.error('Error rejecting message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reject message',
      });
    } finally {
      setProcessingMessage(null);
    }
  };

  // Toggle message selection
  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  // Select/deselect all new messages
  const toggleSelectAllMessages = () => {
    const newMessages = whatsappMessages.filter((m) => m.status === 'new');
    if (selectedMessages.size === newMessages.length) {
      setSelectedMessages(new Set());
    } else {
      setSelectedMessages(new Set(newMessages.map((m) => m.id)));
    }
  };

  // Bulk reject messages
  const bulkRejectMessages = async () => {
    if (selectedMessages.size === 0) return;
    
    setBulkProcessing(true);
    try {
      const { error } = await supabase
        .from('whatsapp_messages')
        .update({ status: 'rejected' })
        .in('id', Array.from(selectedMessages));

      if (error) throw error;

      setWhatsappMessages((prev) =>
        prev.map((msg) =>
          selectedMessages.has(msg.id) ? { ...msg, status: 'rejected' } : msg
        )
      );

      toast({
        title: 'Bulk Rejected',
        description: `${selectedMessages.size} messages rejected`,
      });
      setSelectedMessages(new Set());
    } catch (error) {
      console.error('Error bulk rejecting messages:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reject messages',
      });
    } finally {
      setBulkProcessing(false);
    }
  };

  // State for deleting leads
  const [deletingLead, setDeletingLead] = useState<string | null>(null);

  // Delete a lead (admin only)
  const deleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to permanently delete this lead? This action cannot be undone.')) {
      return;
    }
    
    setDeletingLead(leadId);
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;

      // Remove from local state
      setWhatsappLeads((prev) => prev.filter((lead) => lead.id !== leadId));
      setAdminLeads((prev) => prev.filter((lead) => lead.id !== leadId));

      toast({
        title: 'Lead Deleted',
        description: 'Lead has been permanently deleted',
      });
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete lead',
      });
    } finally {
      setDeletingLead(null);
    }
  };


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
          <button
            onClick={() => setActiveTab('ratings')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'ratings'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Star className="inline h-4 w-4 mr-1" />
            Ratings
          </button>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'whatsapp'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare className="inline h-4 w-4 mr-1" />
            WhatsApp
          </button>
        </div>

        {/* Ratings Tab */}
        {activeTab === 'ratings' && <AdminRatingManagement />}

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
            {/* Lead Search Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search size={20} />
                  Search Lead by Code
                </CardTitle>
                <CardDescription>
                  Enter a lead code (e.g., RA-MUM-0001) to find and view complete details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Enter lead code..."
                      value={leadSearchQuery}
                      onChange={(e) => {
                        setLeadSearchQuery(e.target.value.toUpperCase());
                        setLeadSearchError('');
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && searchLeadByCode()}
                      className="pl-9 font-mono"
                    />
                  </div>
                  <Button onClick={searchLeadByCode} disabled={searchingLead}>
                    {searchingLead ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Search size={16} className="mr-1" />
                        Search
                      </>
                    )}
                  </Button>
                </div>

                {leadSearchError && (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertTriangle size={16} />
                    {leadSearchError}
                  </div>
                )}

                {/* Searched Lead Result */}
                {searchedLead && (
                  <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="font-mono text-sm">
                            <Hash size={12} className="mr-1" />
                            {searchedLead.lead_code}
                          </Badge>
                          <Badge
                            variant={
                              searchedLead.status === 'completed'
                                ? 'default'
                                : searchedLead.status === 'rejected'
                                ? 'destructive'
                                : searchedLead.claimed_by_user_id
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {searchedLead.status === 'completed' ? (
                              <><Check size={14} className="mr-1" /> Completed</>
                            ) : searchedLead.status === 'rejected' ? (
                              <><X size={14} className="mr-1" /> Rejected</>
                            ) : searchedLead.claimed_by_user_id ? (
                              'Claimed'
                            ) : (
                              'Open'
                            )}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-xl">{searchedLead.customer_name || 'Unknown Customer'}</h3>
                        <p className="text-muted-foreground">
                          {searchedLead.service_type ? formatServiceType(searchedLead.service_type) : 'Unknown Service'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearchedLead(null);
                          setLeadSearchQuery('');
                        }}
                      >
                        <X size={16} />
                      </Button>
                    </div>

                    {/* Timeline */}
                    <div className="bg-background rounded-lg p-4 border">
                      <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Lead Timeline</h4>
                      <LeadTimeline lead={searchedLead} showDetails />
                    </div>

                    {/* Complete Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Customer Details</h4>
                        <div className="bg-background rounded-lg p-3 border space-y-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Name</p>
                            <p className="font-medium">{searchedLead.customer_name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Phone</p>
                            <p className="font-medium flex items-center gap-2">
                              <Phone size={14} />
                              {searchedLead.customer_phone}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Location</p>
                            <p className="font-medium flex items-center gap-2">
                              <MapPin size={14} />
                              {searchedLead.location_address || 'No address'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Lead Info</h4>
                        <div className="bg-background rounded-lg p-3 border space-y-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Created</p>
                            <p className="font-medium">
                              {searchedLead.created_at ? new Date(searchedLead.created_at).toLocaleString() : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Source</p>
                            <p className="font-medium capitalize">{searchedLead.source || 'Manual'}</p>
                          </div>
                          {searchedLead.lead_generator_phone && (
                            <div>
                              <p className="text-xs text-muted-foreground">Lead Generator Phone</p>
                              <p className="font-medium">{searchedLead.lead_generator_phone}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Created By */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Created By</h4>
                        <div className="bg-background rounded-lg p-3 border space-y-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Name</p>
                            <p className="font-medium">{searchedLead.created_by_user?.name || 'Unknown'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Phone</p>
                            <p className="font-medium">{searchedLead.created_by_user?.phone || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Claimed By */}
                      {searchedLead.claimed_by_user_id && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Claimed By (Service Provider)</h4>
                          <div className="bg-background rounded-lg p-3 border space-y-2">
                            <div>
                              <p className="text-xs text-muted-foreground">Name</p>
                              <p className="font-medium">{searchedLead.claimed_by_user?.name || 'Unknown'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Phone</p>
                              <p className="font-medium">{searchedLead.claimed_by_user?.phone || 'N/A'}</p>
                            </div>
                            {searchedLead.claimed_at && (
                              <div>
                                <p className="text-xs text-muted-foreground">Claimed At</p>
                                <p className="font-medium">{new Date(searchedLead.claimed_at).toLocaleString()}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Notes & Special Instructions */}
                    {(searchedLead.notes || searchedLead.special_instructions) && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Notes & Instructions</h4>
                        <div className="bg-background rounded-lg p-3 border space-y-2">
                          {searchedLead.notes && (
                            <div>
                              <p className="text-xs text-muted-foreground">Notes</p>
                              <p className="font-medium">{searchedLead.notes}</p>
                            </div>
                          )}
                          {searchedLead.special_instructions && (
                            <div>
                              <p className="text-xs text-muted-foreground">Special Instructions</p>
                              <p className="font-medium">{searchedLead.special_instructions}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Proof URL if completed */}
                    {searchedLead.proof_url && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Completion Proof</h4>
                        <div className="bg-background rounded-lg p-3 border">
                          <a 
                            href={searchedLead.proof_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-2"
                          >
                            <CheckCircle size={16} />
                            View Proof Document
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Your Created Leads Section */}
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
                            <div className="flex items-center gap-2 mb-1">
                              {lead.lead_code && (
                                <Badge variant="outline" className="font-mono text-xs">
                                  <Hash size={10} className="mr-1" />
                                  {lead.lead_code}
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-lg">{lead.customer_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {lead.service_type ? formatServiceType(lead.service_type) : 'Unknown Service'}
                            </p>
                          </div>
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

                        {/* Timeline View */}
                        <div className="bg-muted/30 rounded-lg p-3">
                          <LeadTimeline lead={lead} showDetails />
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
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* WhatsApp Import Tab */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6">
            {/* Auto-Approve Toggle */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      WhatsApp Import Settings
                    </CardTitle>
                    <CardDescription>
                      Control how incoming WhatsApp leads are processed
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {autoApproveEnabled ? 'Auto-approve ON' : 'Manual approval required'}
                    </span>
                    {updatingAutoApprove ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Switch
                        checked={autoApproveEnabled}
                        onCheckedChange={toggleAutoApprove}
                      />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Meta WhatsApp Webhook */}
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">Meta</Badge>
                      Webhook URL
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`
                        );
                        toast({ title: 'Copied!', description: 'Meta webhook URL copied to clipboard' });
                      }}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <code className="text-xs break-all text-muted-foreground">
                    {import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook
                  </code>
                </div>

                {/* MSG91 Webhook */}
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Badge variant="outline" className="text-xs border-primary/50 text-primary">MSG91</Badge>
                      Webhook URL
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/msg91-webhook`
                        );
                        toast({ title: 'Copied!', description: 'MSG91 webhook URL copied to clipboard' });
                      }}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <code className="text-xs break-all text-muted-foreground">
                    {import.meta.env.VITE_SUPABASE_URL}/functions/v1/msg91-webhook
                  </code>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Meta Setup Instructions */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">Meta</Badge>
                      Setup Instructions
                    </h4>
                    <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                      <li>Go to <strong>Meta Business Manager</strong> → WhatsApp → Configuration</li>
                      <li>Click <strong>Webhooks</strong> → Configure</li>
                      <li>Paste the Meta webhook URL as the <strong>Callback URL</strong></li>
                      <li>Enter your <strong>Verify Token</strong> (from your secrets)</li>
                      <li>Subscribe to the <strong>messages</strong> webhook field</li>
                    </ol>
                  </div>

                  {/* MSG91 Setup Instructions */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs border-primary/50 text-primary">MSG91</Badge>
                      Setup Instructions
                    </h4>
                    <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                      <li>Go to <strong>MSG91 Dashboard</strong> → WhatsApp → Settings</li>
                      <li>Click <strong>Inbound Webhook</strong></li>
                      <li>Paste the MSG91 webhook URL above</li>
                      <li>Set event type to <strong>On Inbound Request Received</strong></li>
                      <li>Save and test with a message</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Import Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    New Messages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-warning" />
                    <span className="text-2xl font-bold">
                      {whatsappMessages.filter((m) => m.status === 'new').length}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Approved
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">
                      {whatsappMessages.filter((m) => m.status === 'approved').length}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Rejected
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <X className="h-5 w-5 text-destructive" />
                    <span className="text-2xl font-bold">
                      {whatsappMessages.filter((m) => m.status === 'rejected').length}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Messages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <span className="text-2xl font-bold">{whatsappMessages.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* New Messages - Pending Approval */}
            <Card className="border-warning">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-warning">
                      <Clock className="h-5 w-5" />
                      New Messages ({whatsappMessages.filter((m) => m.status === 'new').length})
                    </CardTitle>
                    <CardDescription>
                      Review and approve messages to create leads using AI parsing
                    </CardDescription>
                  </div>
                  {selectedMessages.size > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {selectedMessages.size} selected
                      </span>
                      {bulkProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={bulkRejectMessages}
                          className="text-destructive border-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject Selected
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : whatsappMessages.filter((m) => m.status === 'new').length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No new messages pending approval</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                      <Checkbox
                        id="select-all-messages"
                        checked={
                          selectedMessages.size > 0 &&
                          selectedMessages.size === whatsappMessages.filter((m) => m.status === 'new').length
                        }
                        onCheckedChange={toggleSelectAllMessages}
                      />
                      <label htmlFor="select-all-messages" className="text-sm font-medium cursor-pointer">
                        Select All New Messages
                      </label>
                    </div>

                    <div className="space-y-3">
                      {whatsappMessages
                        .filter((m) => m.status === 'new')
                        .map((message) => (
                          <div
                            key={message.id}
                            className={`p-4 border rounded-lg transition-colors ${
                              selectedMessages.has(message.id) ? 'bg-primary/10 border-primary' : 'bg-muted/50'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selectedMessages.has(message.id)}
                                onCheckedChange={() => toggleMessageSelection(message.id)}
                                className="mt-1"
                              />
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{message.sender_name || 'Unknown'}</span>
                                    <Badge variant="outline">
                                      <Phone className="h-3 w-3 mr-1" />
                                      {message.sender_phone}
                                    </Badge>
                                    {message.group_name && (
                                      <Badge variant="secondary">{message.group_name}</Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {message.message_timestamp
                                      ? new Date(message.message_timestamp).toLocaleString()
                                      : message.created_at
                                      ? new Date(message.created_at).toLocaleString()
                                      : 'Unknown time'}
                                  </span>
                                </div>
                                <div className="bg-background p-3 rounded border">
                                  <p className="text-sm whitespace-pre-wrap">{message.raw_message}</p>
                                </div>
                                <div className="flex items-center gap-2 justify-end">
                                  {processingMessage === message.id ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Processing with AI...
                                    </div>
                                  ) : (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => rejectWhatsAppMessage(message.id)}
                                        className="text-destructive border-destructive hover:bg-destructive/10"
                                      >
                                        <X className="h-4 w-4 mr-1" />
                                        Reject
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openMessagePreview(message)}
                                      >
                                        <Eye className="h-4 w-4 mr-1" />
                                        Preview & Edit
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => approveWhatsAppMessage(message)}
                                      >
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Quick Approve
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Approved Messages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Approved Messages ({whatsappMessages.filter((m) => m.status === 'approved').length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {whatsappMessages.filter((m) => m.status === 'approved').length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No approved messages yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sender</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Group</TableHead>
                          <TableHead>Message</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {whatsappMessages
                          .filter((m) => m.status === 'approved')
                          .slice(0, 20)
                          .map((message) => (
                            <TableRow key={message.id}>
                              <TableCell className="font-medium">{message.sender_name || 'Unknown'}</TableCell>
                              <TableCell>{message.sender_phone}</TableCell>
                              <TableCell>{message.group_name || '-'}</TableCell>
                              <TableCell className="max-w-xs truncate">{message.raw_message}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {message.created_at ? new Date(message.created_at).toLocaleDateString() : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Legacy Pending Approval Section (from leads table) */}
            {whatsappLeads.filter((l) => l.status === 'pending').length > 0 && (
              <Card className="border-warning">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-warning">
                        <Clock className="h-5 w-5" />
                        Pending Approval ({whatsappLeads.filter((l) => l.status === 'pending').length})
                      </CardTitle>
                      <CardDescription>
                        These leads require your approval before they become visible to service providers
                      </CardDescription>
                    </div>
                    {/* Bulk Action Buttons */}
                    {selectedLeads.size > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {selectedLeads.size} selected
                        </span>
                        {bulkProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={bulkReject}
                              className="text-destructive border-destructive hover:bg-destructive/10"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject All
                            </Button>
                            <Button size="sm" onClick={bulkApprove}>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve All
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Select All Checkbox */}
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                    <Checkbox
                      id="select-all"
                      checked={
                        selectedLeads.size > 0 &&
                        selectedLeads.size === whatsappLeads.filter((l) => l.status === 'pending').length
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                    <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                      Select All Pending Leads
                    </label>
                  </div>

                  <div className="space-y-3">
                    {whatsappLeads
                      .filter((l) => l.status === 'pending')
                      .map((lead) => (
                        <div
                          key={lead.id}
                          className={`flex items-center gap-3 p-4 border rounded-lg transition-colors ${
                            selectedLeads.has(lead.id) ? 'bg-primary/10 border-primary' : 'bg-muted/50'
                          }`}
                        >
                          {/* Checkbox */}
                          <Checkbox
                            checked={selectedLeads.has(lead.id)}
                            onCheckedChange={() => toggleLeadSelection(lead.id)}
                          />
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{lead.customer_name || 'Unknown'}</span>
                              <Badge variant="secondary">{formatServiceType(lead.service_type)}</Badge>
                              <Badge variant={(lead.import_confidence || 0) >= 70 ? 'default' : 'destructive'}>
                                {lead.import_confidence || 0}%
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {lead.customer_phone}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {lead.location_address?.substring(0, 30) || 'No address'}...
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {approvingLead === lead.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => rejectPendingLead(lead.id)}
                                  className="text-destructive border-destructive hover:bg-destructive/10"
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => approveLead(lead.id)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Import Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total WhatsApp Leads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">{whatsappLeads.length}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pending Approval
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-warning" />
                    <span className="text-2xl font-bold">
                      {whatsappLeads.filter((l) => l.status === 'pending').length}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Approved
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">
                      {whatsappLeads.filter((l) => l.status === 'open' || l.status === 'claimed' || l.status === 'completed').length}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Low Confidence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <span className="text-2xl font-bold">
                      {whatsappLeads.filter((l) => (l.import_confidence || 0) < 70).length}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Imports */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent WhatsApp Imports</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('whatsapp')}
                    disabled={loadingWhatsapp}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${loadingWhatsapp ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingWhatsapp ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : whatsappLeads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No WhatsApp leads imported yet.</p>
                    <p className="text-sm">Configure your webhook and send a test message to get started.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Source</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Confidence</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Imported</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {whatsappLeads.map((lead) => (
                          <TableRow key={lead.id}>
                            <TableCell>
                              <Badge 
                                variant={lead.source === 'msg91' ? 'outline' : 'secondary'}
                                className={lead.source === 'msg91' ? 'border-primary/50 text-primary' : ''}
                              >
                                {lead.source === 'msg91' ? 'MSG91' : 
                                 lead.source === 'whatsapp_group' ? 'Group' :
                                 lead.source === 'whatsapp_forwarded' ? 'Fwd' : 'Meta'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div>
                                {lead.customer_name || 'Unknown'}
                                {lead.lead_generator_name && (
                                  <p className="text-xs text-muted-foreground">by {lead.lead_generator_name}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                {lead.customer_phone}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {formatServiceType(lead.service_type)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={(lead.import_confidence || 0) >= 70 ? 'default' : 'destructive'}
                              >
                                {lead.import_confidence || 0}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  lead.status === 'completed'
                                    ? 'default'
                                    : lead.status === 'rejected'
                                    ? 'destructive'
                                    : 'outline'
                                }
                              >
                                {lead.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(lead.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {deletingLead === lead.id ? (
                                <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteLead(lead.id)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
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
      </div>

      {/* WhatsApp Message Preview Modal */}
      <WhatsAppMessagePreview
        message={previewMessage}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onApprove={approveWithEditedData}
        onReject={rejectWhatsAppMessage}
      />
    </div>
  );
};

export default Admin;
