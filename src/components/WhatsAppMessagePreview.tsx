import React, { useState, useEffect } from 'react';
import { Loader2, MapPin, Phone, User, FileText, Clock, Edit2, Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MapPreview from '@/components/MapPreview';
import { supabase } from '@/integrations/supabase/client';

interface WhatsAppMessage {
  id: string;
  sender_name: string | null;
  sender_phone: string | null;
  raw_message: string | null;
  group_name: string | null;
  group_id: string | null;
  message_timestamp: string | null;
  created_at: string | null;
}

interface ParsedData {
  customer_name: string | null;
  customer_phone: string | null;
  location_address: string | null;
  service_type: string | null;
  special_instructions: string | null;
}

interface GeocodedLocation {
  lat: number;
  lng: number;
}

interface WhatsAppMessagePreviewProps {
  message: WhatsAppMessage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (message: WhatsAppMessage, editedData: ParsedData, location: GeocodedLocation | null) => Promise<void>;
  onReject: (messageId: string) => void;
}

const SERVICE_TYPES = [
  { value: 'rent_agreement', label: 'Rent Agreement' },
  { value: 'domicile', label: 'Domicile' },
  { value: 'income_certificate', label: 'Income Certificate' },
  { value: 'birth_certificate', label: 'Birth Certificate' },
  { value: 'death_certificate', label: 'Death Certificate' },
  { value: 'other', label: 'Other' },
];

const WhatsAppMessagePreview: React.FC<WhatsAppMessagePreviewProps> = ({
  message,
  open,
  onOpenChange,
  onApprove,
  onReject,
}) => {
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [editedData, setEditedData] = useState<ParsedData | null>(null);
  const [location, setLocation] = useState<GeocodedLocation | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [confidence, setConfidence] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  const [approving, setApproving] = useState(false);

  // Parse message with AI when dialog opens
  useEffect(() => {
    if (!open || !message?.raw_message) {
      setParsedData(null);
      setEditedData(null);
      setLocation(null);
      setConfidence(0);
      setIsEditing(false);
      return;
    }

    const parseMessage = async () => {
      setParsing(true);
      try {
        // Call the parse function for preview (without creating lead)
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-whatsapp-message`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              preview_only: true,
              raw_message: message.raw_message,
              sender_phone: message.sender_phone,
              sender_name: message.sender_name,
            }),
          }
        );

        const data = await response.json();
        
        if (data.parsed) {
          setParsedData(data.parsed);
          setEditedData(data.parsed);
          setConfidence(data.confidence || 0);
          
          // Geocode the address if available
          if (data.parsed.location_address) {
            geocodeAddress(data.parsed.location_address);
          }
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      } finally {
        setParsing(false);
      }
    };

    parseMessage();
  }, [open, message]);

  const geocodeAddress = async (address: string) => {
    setGeocoding(true);
    try {
      // Use MapTiler for geocoding
      const apiKey = 'dU5leHVSHfxYYJ6SSDX2'; // MapTiler public API key
      const encodedAddress = encodeURIComponent(address + ', India');
      const response = await fetch(
        `https://api.maptiler.com/geocoding/${encodedAddress}.json?key=${apiKey}&limit=1`
      );
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setLocation({ lat, lng });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setGeocoding(false);
    }
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setLocation({ lat, lng });
  };

  const handleInputChange = (field: keyof ParsedData, value: string) => {
    if (!editedData) return;
    setEditedData({ ...editedData, [field]: value || null });
    
    // Re-geocode if address changes
    if (field === 'location_address' && value) {
      geocodeAddress(value);
    }
  };

  const handleApprove = async () => {
    if (!message || !editedData) return;
    
    setApproving(true);
    try {
      await onApprove(message, editedData, location);
      onOpenChange(false);
    } catch (error) {
      console.error('Error approving:', error);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = () => {
    if (!message) return;
    onReject(message.id);
    onOpenChange(false);
  };

  if (!message) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Message Preview & AI Parsing
          </DialogTitle>
          <DialogDescription>
            Review the AI-parsed data before creating a lead
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Original Message */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Original Message</Label>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                {message.sender_name || 'Unknown'}
                <Phone className="h-3 w-3 ml-2" />
                {message.sender_phone}
              </div>
            </div>
            <div className="bg-muted/50 p-3 rounded-lg border">
              <p className="text-sm whitespace-pre-wrap">{message.raw_message}</p>
            </div>
          </div>

          {/* Parsing Status */}
          {parsing ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Parsing with AI...</span>
            </div>
          ) : parsedData ? (
            <>
              {/* Confidence Score */}
              <div className="flex items-center gap-2">
                <Badge 
                  variant={confidence >= 70 ? 'default' : confidence >= 40 ? 'secondary' : 'outline'}
                  className={confidence >= 70 ? 'bg-primary' : confidence >= 40 ? 'bg-warning' : ''}
                >
                  {confidence}% Confidence
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs"
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  {isEditing ? 'Done Editing' : 'Edit Fields'}
                </Button>
              </div>

              {/* Parsed Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Name */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Customer Name</Label>
                  {isEditing ? (
                    <Input
                      value={editedData?.customer_name || ''}
                      onChange={(e) => handleInputChange('customer_name', e.target.value)}
                      placeholder="Enter customer name"
                    />
                  ) : (
                    <div className="bg-background border rounded-lg p-2">
                      <p className="text-sm">{editedData?.customer_name || <span className="text-muted-foreground">Not found</span>}</p>
                    </div>
                  )}
                </div>

                {/* Customer Phone */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Customer Phone</Label>
                  {isEditing ? (
                    <Input
                      value={editedData?.customer_phone || ''}
                      onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                      placeholder="10-digit phone"
                    />
                  ) : (
                    <div className="bg-background border rounded-lg p-2">
                      <p className="text-sm">{editedData?.customer_phone || <span className="text-muted-foreground">Will use sender: {message.sender_phone?.slice(-10)}</span>}</p>
                    </div>
                  )}
                </div>

                {/* Service Type */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Service Type</Label>
                  {isEditing ? (
                    <Select
                      value={editedData?.service_type || 'rent_agreement'}
                      onValueChange={(value) => handleInputChange('service_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="bg-background border rounded-lg p-2">
                      <Badge variant="secondary">
                        {SERVICE_TYPES.find((t) => t.value === editedData?.service_type)?.label || 'Rent Agreement'}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Location Address */}
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    Location Address
                  </Label>
                  {isEditing ? (
                    <Textarea
                      value={editedData?.location_address || ''}
                      onChange={(e) => handleInputChange('location_address', e.target.value)}
                      placeholder="Enter full address"
                      rows={2}
                    />
                  ) : (
                    <div className="bg-background border rounded-lg p-2">
                      <p className="text-sm">{editedData?.location_address || <span className="text-muted-foreground">No address found</span>}</p>
                    </div>
                  )}
                </div>

                {/* Special Instructions */}
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Special Instructions (Time, Notes)
                  </Label>
                  {isEditing ? (
                    <Textarea
                      value={editedData?.special_instructions || ''}
                      onChange={(e) => handleInputChange('special_instructions', e.target.value)}
                      placeholder="Time slots, availability, urgency notes..."
                      rows={2}
                    />
                  ) : (
                    <div className="bg-background border rounded-lg p-2">
                      <p className="text-sm">{editedData?.special_instructions || <span className="text-muted-foreground">No special instructions</span>}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Map Preview */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Location Preview</Label>
                {geocoding ? (
                  <div className="h-48 bg-muted rounded-lg flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm text-muted-foreground">Geocoding address...</span>
                  </div>
                ) : location ? (
                  <div className="h-48 rounded-lg overflow-hidden border">
                    <MapPreview
                      latitude={location.lat}
                      longitude={location.lng}
                      draggable={isEditing}
                      onLocationChange={handleLocationChange}
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Unable to geocode address</p>
                  </div>
                )}
                {location && (
                  <p className="text-xs text-muted-foreground">
                    Coordinates: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                    {isEditing && ' (drag marker to adjust)'}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Unable to parse message. Please try manually approving.</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleReject}
            className="text-destructive border-destructive hover:bg-destructive/10"
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>
          <Button
            onClick={handleApprove}
            disabled={approving || !editedData?.location_address}
          >
            {approving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-1" />
            )}
            Create Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppMessagePreview;
