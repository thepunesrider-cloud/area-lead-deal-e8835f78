import React, { useState } from 'react';
import { Loader2, Plus, MessageCircle } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface CreateLeadForm {
  serviceType: string;
  customerName: string;
  customerPhone: string;
  location: string;
  locationLat: string;
  locationLong: string;
  notes: string;
  leadGeneratorPhone: string;
  screenshotData?: string; // base64 for storage/preview
  screenshotName?: string;
}

const serviceTypes = [
  { value: 'rent_agreement', label: 'Rent Agreement' },
  { value: 'domicile', label: 'Domicile Certificate' },
  { value: 'income_certificate', label: 'Income Certificate' },
  { value: 'birth_certificate', label: 'Birth Certificate' },
  { value: 'death_certificate', label: 'Death Certificate' },
  { value: 'other', label: 'Other' },
];

// Gemini key (set in .env as VITE_GEMINI_API_KEY). If absent, we fall back to local parsing only.
const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
// MapTiler key used for geocoding (same as LocationPicker)
const MAPTILER_KEY = 'vUJcqBljtTjPDAM96UaW';

async function parseWhatsAppMessage(text: string): Promise<Partial<CreateLeadForm> | null> {
  try {
    // Find all 10-digit numbers (allow spaces/dashes: 87673 93079 or 87673-93079)
    const phoneRegex = /(\d{5})\s*[\s\-]?(\d{5})/g;
    const tenDigitMatches: string[] = [];
    let match;
    while ((match = phoneRegex.exec(text)) !== null) {
      tenDigitMatches.push(match[1] + match[2]);
    }

    // Extract lead generator name and phone from first line
    // Pattern: "~ Vitthal Enterprises +91 87673 93079"
    const leadGenRegex = /^[~\-\s]*([A-Za-z\s]+?)\s+(?:\+91)?\s*(\d{5})\s*[\s\-]?(\d{5})/m;
    const leadGenMatch = text.match(leadGenRegex);
    
    let leadGeneratorName = '';
    let leadGeneratorPhone = '';
    let customerPhone = '';

    if (leadGenMatch) {
      leadGeneratorName = leadGenMatch[1].trim();
      leadGeneratorPhone = (leadGenMatch[2] + leadGenMatch[3]);
      // Customer phone is any other phone number found
      customerPhone = tenDigitMatches.find(p => p !== leadGeneratorPhone) || '';
    } else {
      // Fallback: first phone is lead gen, second is customer
      leadGeneratorPhone = tenDigitMatches[0] || '';
      customerPhone = tenDigitMatches[1] || '';
    }

    // Try postal-code based location extraction (e.g., Viman Nagar, Pune 411014)
    const locationRegex = /([A-Za-z\s,.\-]+),?\s*([A-Za-z\s]+)\s+(\d{6})/;
    const locationMatch = text.match(locationRegex);
    
    let location = '';
    let locationLat = '';
    let locationLong = '';

    if (locationMatch) {
      location = `${locationMatch[1].trim()}, ${locationMatch[2].trim()} ${locationMatch[3]}`;
      const coords = await geocodeLocation(location);
      if (coords) {
        locationLat = coords.lat.toString();
        locationLong = coords.long.toString();
      }
    }

    // If no postal code, fall back to simple locality names
    if (!location) {
      const simpleLocationRegex = /([A-Za-z\s]+(?:nagar|road|street|colony|society|lane|path))/i;
      const simpleMatch = text.match(simpleLocationRegex);
      if (simpleMatch) {
        location = simpleMatch[1].trim();
        const coords = await geocodeLocation(location);
        if (coords) {
          locationLat = coords.lat.toString();
          locationLong = coords.long.toString();
        }
      }
    }

    return { 
      customerName: leadGeneratorName || '', 
      customerPhone, 
      leadGeneratorPhone,
      location, 
      locationLat, 
      locationLong, 
      notes: text 
    };
  } catch (error) {
    console.error('Error parsing:', error);
    return null;
  }
}

async function extractWithGemini(text: string): Promise<Partial<CreateLeadForm> | null> {
  if (!geminiKey) return null;
  try {
    const prompt = `You are a data extractor. Given a noisy message (possibly OCR text), return strict JSON with keys: {
      "customer_name", "customer_phone", "lead_generator_phone", "location_address", "latitude", "longitude", "notes" }.
      Phone numbers should be 10-digit Indian numbers (no country code). If you cannot determine a field, return an empty string. Do not include any extra keys. Do not include code fences. Input:\n${text}`;

    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 },
      }),
    });

    const data = await res.json();
    const textOut = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOut) return null;

    const jsonStart = textOut.indexOf('{');
    const jsonEnd = textOut.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) return null;
    const parsed = JSON.parse(textOut.slice(jsonStart, jsonEnd + 1));

    return {
      customerName: parsed.customer_name || '',
      customerPhone: parsed.customer_phone || '',
      leadGeneratorPhone: parsed.lead_generator_phone || '',
      location: parsed.location_address || '',
      locationLat: parsed.latitude || '',
      locationLong: parsed.longitude || '',
      notes: parsed.notes || '',
    };
  } catch (error) {
    console.error('Gemini extraction error:', error);
    return null;
  }
}

async function geocodeLocation(location: string): Promise<{ lat: number; long: number } | null> {
  const locations: { [key: string]: { lat: number; long: number } } = {
    'katraj pune': { lat: 18.4536, long: 73.8563 },
    'shanti nagar bhusawal': { lat: 20.8154, long: 75.7763 },
    'omkareshwar madhya pradesh': { lat: 22.2736, long: 75.6425 },
    'vijaykunj mumbai': { lat: 19.0728, long: 72.8826 },
    'viman nagar pune': { lat: 18.5679, long: 73.9143 },
  };
  const normalized = location.toLowerCase();
  for (const [key, coords] of Object.entries(locations)) {
    if (normalized.includes(key) || key.includes(normalized)) return coords;
  }

  // Clean and try multiple fallbacks (handle long/noisy OCR strings)
  const variants = (() => {
    const trimmed = location.replace(/\s+/g, ' ').trim();
    const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
    const joinedShort = parts.slice(-3).join(', '); // keep the tail (area, city, pincode)
    const joinedShort2 = parts.slice(-2).join(', ');
    return [trimmed, joinedShort, joinedShort2].filter(Boolean);
  })();

  for (const query of variants) {
    try {
      const response = await fetch(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${MAPTILER_KEY}&country=in&limit=1`
      );
      const data = await response.json();
      const feature = data?.features?.[0];
      if (feature?.center) {
        const [lon, lat] = feature.center;
        return { lat, long: lon };
      }
    } catch (error) {
      console.error('MapTiler geocoding error:', error);
    }
  }

  // Fallback: OpenStreetMap Nominatim
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`);
    const data = await response.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), long: parseFloat(data[0].lon) };
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }

  return null;
}

interface AdminCreateLeadProps { onLeadCreated?: () => void; }

const AdminCreateLead: React.FC<AdminCreateLeadProps> = ({ onLeadCreated }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parsingMessage, setParsingMessage] = useState(false);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [geminiRunning, setGeminiRunning] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [showPasteOption, setShowPasteOption] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [form, setForm] = useState<CreateLeadForm>({
    serviceType: 'rent_agreement',
    customerName: '',
    customerPhone: '',
    location: '',
    locationLat: '',
    locationLong: '',
    notes: '',
    leadGeneratorPhone: '',
    screenshotData: '',
    screenshotName: '',
  });

  const { toast } = useToast();
  const { user } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setForm((prev) => ({ ...prev, serviceType: value }));
  };

  const handleLocationBlur = async () => {
    if (!form.location.trim()) return;
    try {
      const coords = await geocodeLocation(form.location);
      if (coords) {
        setForm((prev) => ({
          ...prev,
          locationLat: coords.lat.toString(),
          locationLong: coords.long.toString(),
        }));
      } else {
        toast({ variant: 'destructive', title: 'Location not found', description: 'Could not fetch coordinates for this location' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch coordinates' });
    }
  };

  const parseAndFill = async (inputText: string): Promise<boolean> => {
    const combinedText = inputText.trim();
    if (!combinedText) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please paste a message or attach a screenshot' });
      return false;
    }

    setParsingMessage(true);
    try {
      // First local parse
      const parsedLocal = await parseWhatsAppMessage(combinedText);
      if (parsedLocal) {
        setForm((prev) => ({ ...prev, ...parsedLocal }));
      }

      // Then Gemini (if key present)
      if (geminiKey) {
        setGeminiRunning(true);
        const parsedGemini = await extractWithGemini(combinedText);
        if (parsedGemini) {
          setForm((prev) => ({ ...prev, ...parsedGemini }));
        }
      }

      toast({ title: 'Parsed', description: 'Parsed data filled. Please review before saving.' });
      return true;
    } finally {
      setParsingMessage(false);
      setGeminiRunning(false);
    }
  };

  const handleParseWhatsApp = async () => {
    const combinedText = [pastedText.trim(), ocrText.trim()].filter(Boolean).join('\n\n');
    const success = await parseAndFill(combinedText);
    if (success) {
      setPastedText('');
      setShowPasteOption(false);
    }
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setForm((prev) => ({
        ...prev,
        screenshotData: dataUrl,
        screenshotName: file.name,
        notes: prev.notes || 'Screenshot attached',
      }));
    };
    reader.readAsDataURL(file);

    setOcrRunning(true);
    Tesseract.recognize(file, 'eng')
      .then(({ data }) => {
        const text = data.text?.trim() || '';
        setOcrText(text);
        if (text) {
          toast({ title: 'OCR extracted', description: 'Text pulled from screenshot. Auto-parsing now.' });
          parseAndFill(text);
        } else {
          toast({ variant: 'destructive', title: 'OCR', description: 'Could not read text from screenshot.' });
        }
      })
      .catch(() => {
        toast({ variant: 'destructive', title: 'OCR', description: 'Failed to read screenshot.' });
      })
      .finally(() => setOcrRunning(false));
  };

  const validateForm = (): boolean => {
    if (!form.customerName.trim() || !form.locationLat.trim() || !form.locationLong.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill required fields' });
      return false;
    }
    return true;
  };

  const handleCreateLead = async () => {
    if (!validateForm() || !user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('leads').insert({
        service_type: form.serviceType as any,
        customer_name: form.customerName,
        customer_phone: form.customerPhone,
        location_address: form.location,
        location_lat: parseFloat(form.locationLat),
        location_long: parseFloat(form.locationLong),
        notes: `${form.notes || ''}${form.screenshotData ? `\n[Screenshot: ${form.screenshotName}]` : ''}`.trim(),
        lead_generator_phone: form.leadGeneratorPhone,
        created_by_user_id: user.id,
        status: 'open' as const,
      });
      if (error) throw error;
      toast({ title: 'Success', description: 'Lead created' });
      setForm({
        serviceType: 'rent_agreement',
        customerName: '',
        customerPhone: '',
        location: '',
        locationLat: '',
        locationLong: '',
        notes: '',
        leadGeneratorPhone: '',
        screenshotData: '',
        screenshotName: '',
      });
      setOcrText('');
      setOpen(false);
      if (onLeadCreated) onLeadCreated();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create lead' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <><Button onClick={() => setOpen(true)} className="gap-2"><Plus size={20} />Create Lead</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create New Lead</DialogTitle><DialogDescription>Create a new lead for service providers</DialogDescription></DialogHeader>
          {!showPasteOption && <Button variant="outline" onClick={() => setShowPasteOption(true)} className="gap-2 w-full mb-4"><MessageCircle size={20} />Paste WhatsApp Message</Button>}
          {showPasteOption && (
            <Card className="mb-4 border-primary/50 bg-primary/5">
              <CardContent className="pt-4 space-y-3">
                <div><label className="text-sm font-medium">Paste WhatsApp Message</label><Textarea placeholder="Paste message..." value={pastedText} onChange={(e) => setPastedText(e.target.value)} className="min-h-32" /></div>
                <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => { setShowPasteOption(false); setPastedText(''); }} disabled={parsingMessage} className="flex-1">Cancel</Button><Button size="sm" onClick={handleParseWhatsApp} disabled={parsingMessage} className="flex-1">{parsingMessage ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Parsing...</> : 'Parse & Fill'}</Button></div>
                {ocrRunning && <p className="text-xs text-muted-foreground">OCR running on screenshot…</p>}
                {geminiRunning && geminiKey && <p className="text-xs text-muted-foreground">Gemini structuring…</p>}
              </CardContent>
            </Card>
          )}
          <Card className="mb-4">
            <CardContent className="pt-4 space-y-2">
              <label className="text-sm font-medium">Attach Screenshot (optional)</label>
              <Input type="file" accept="image/*" onChange={handleScreenshotUpload} />
              {form.screenshotName && (
                <p className="text-xs text-muted-foreground">Attached: {form.screenshotName}</p>
              )}
              {ocrText && (
                <p className="text-xs text-muted-foreground">OCR text detected ({ocrText.slice(0, 80)}{ocrText.length > 80 ? '…' : ''})</p>
              )}
            </CardContent>
          </Card>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">Service Type *</label><Select value={form.serviceType} onValueChange={handleSelectChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{serviceTypes.map((type) => (<SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>))}</SelectContent></Select></div>
            <div><label className="text-sm font-medium">Customer Name</label><Input name="customerName" placeholder="Name" value={form.customerName} onChange={handleInputChange} /></div>
            <div><label className="text-sm font-medium">Customer Phone</label><Input name="customerPhone" placeholder="Phone" value={form.customerPhone} onChange={handleInputChange} /></div>
            <div><label className="text-sm font-medium">Location</label><Input name="location" placeholder="Location" value={form.location} onChange={handleInputChange} onBlur={handleLocationBlur} /></div>
            <div><label className="text-sm font-medium">Latitude *</label><Input name="locationLat" type="number" placeholder="18.3850" step="0.0001" value={form.locationLat} onChange={handleInputChange} /></div>
            <div><label className="text-sm font-medium">Longitude *</label><Input name="locationLong" type="number" placeholder="73.8830" step="0.0001" value={form.locationLong} onChange={handleInputChange} /></div>
            <div><label className="text-sm font-medium">Lead Generator Phone</label><Input name="leadGeneratorPhone" placeholder="Phone" value={form.leadGeneratorPhone} onChange={handleInputChange} /></div>
            <div><label className="text-sm font-medium">Notes</label><Textarea name="notes" placeholder="Notes..." value={form.notes} onChange={handleInputChange} className="min-h-24" /></div>
            <div className="flex gap-2 pt-4"><Button variant="outline" onClick={() => setOpen(false)} disabled={loading} className="flex-1">Cancel</Button><Button onClick={handleCreateLead} disabled={loading} className="flex-1">{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create Lead'}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminCreateLead;
