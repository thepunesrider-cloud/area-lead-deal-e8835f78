import React, { useState } from 'react';
import Header from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateLeadWhatsAppMessage, openWhatsApp } from '@/lib/whatsapp';
import { supabase } from '@/integrations/supabase/client';

const WhatsAppTest: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [leadId, setLeadId] = useState('TEST-1234');
  const [userName, setUserName] = useState('Test User');
  const [leadType, setLeadType] = useState('rent_agreement');
  const [customMessage, setCustomMessage] = useState('');
  const [sendingKatraj, setSendingKatraj] = useState(false);

  const toTitle = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const handleOpen = () => {
    const msg = customMessage.trim()
      ? customMessage.trim()
      : generateLeadWhatsAppMessage(leadId, userName, leadType);
    openWhatsApp(phone, msg);
  };

  const sendKatrajLeads = async () => {
    setSendingKatraj(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, lead_code, service_type, location_address, status, created_at')
        .eq('status', 'open')
        .ilike('location_address', '%katraj%')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Fetch Katraj leads error:', error);
        return;
      }

      const leads = data || [];
      if (leads.length === 0) {
        openWhatsApp('8766759346', 'No open leads found in Katraj right now.');
        return;
      }

      const lines = leads.map((l, idx) => {
        const code = l.lead_code || l.id.slice(0, 8);
        const type = toTitle(l.service_type || 'other');
        const addr = (l.location_address || '').split(',')[0];
        return `${idx + 1}) ${code} - ${type} - ${addr}`;
      });

      const message = `Katraj Leads (top ${leads.length}):\n` + lines.join('\n');
      openWhatsApp('8766759346', message);
    } finally {
      setSendingKatraj(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="WhatsApp Test" showBack />
      <main className="px-4 py-6 max-w-md mx-auto space-y-4">
        <p className="text-sm text-muted-foreground">
          Dev-only tool to quickly open a WhatsApp chat with a prefilled message. This does not send automatically; it opens WhatsApp/Web with your message.
        </p>

        <div className="space-y-2">
          <Label>Phone Number</Label>
          <Input
            placeholder="e.g. 8766759346 or +918766759346"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Lead ID</Label>
          <Input
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>User Name</Label>
          <Input
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Lead Type</Label>
          <Select value={leadType} onValueChange={setLeadType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rent_agreement">Rent Agreement</SelectItem>
              <SelectItem value="domicile">Domicile</SelectItem>
              <SelectItem value="income_certificate">Income Certificate</SelectItem>
              <SelectItem value="birth_certificate">Birth Certificate</SelectItem>
              <SelectItem value="death_certificate">Death Certificate</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Custom Message (optional)</Label>
          <Input
            placeholder="Overrides auto-generated message if provided"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
          />
        </div>

        <Button className="w-full" onClick={handleOpen} disabled={!phone.trim()}>
          Open WhatsApp
        </Button>

        <div className="h-px bg-border my-2" />

        <div className="space-y-2">
          <Label>Quick Test: Send Katraj Leads to 8766759346</Label>
          <Button className="w-full" onClick={sendKatrajLeads} disabled={sendingKatraj}>
            {sendingKatraj ? 'Preparing…' : 'Open WhatsApp with Katraj Leads'}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default WhatsAppTest;
