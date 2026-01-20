// Shared AI parsing logic for WhatsApp lead extraction
// Used by both Meta WhatsApp webhook and MSG91 webhook

export const PARSING_PROMPT = `You are an expert at extracting lead information from WhatsApp messages.
The messages may be in English, Hindi, Marathi, or a mix of these languages.

IMPORTANT: Messages often contain both ADDRESS and SPECIAL INSTRUCTIONS mixed together.
- ADDRESS: Street name, building name, area, city, PIN code
- SPECIAL INSTRUCTIONS: Time slots (e.g., "Today 7:30", "any one", "urgent", "tomorrow morning"), emojis, notes about availability

Extract the following fields from the message:
1. customer_name - The name of the customer (if mentioned)
2. customer_phone - 10-digit Indian phone number (remove +91, spaces, dashes)
3. location_address - ONLY the address part: building/flat, street, area, city, PIN code. Do NOT include time or instructions.
4. service_type - One of: rent_agreement, maha_eseva, domicile, other
5. special_instructions - Everything that is NOT address: time slots, availability notes, urgency, any instructions like "Today 7:30", "any one", "call before coming", emojis with meaning

Examples:
Message: "5-A,Bunglow Aashish,Pali Hill, Road Nargis Dutt Road, Bandra West, Mumbai, Pin code - 400052. Today 7:30 any one👆"
Output:
{
  "customer_name": null,
  "customer_phone": null,
  "location_address": "5-A, Bunglow Aashish, Pali Hill Road, Nargis Dutt Road, Bandra West, Mumbai, 400052",
  "service_type": "rent_agreement",
  "special_instructions": "Today 7:30, any one available"
}

Message: "Ramesh Sharma 9876543210 flat 101 shanti nagar thane urgent need by evening"
Output:
{
  "customer_name": "Ramesh Sharma",
  "customer_phone": "9876543210",
  "location_address": "Flat 101, Shanti Nagar, Thane",
  "service_type": "rent_agreement",
  "special_instructions": "Urgent, need by evening"
}

Return ONLY a valid JSON object with these exact fields. If a field cannot be determined, use null.`;

export interface ParsedLead {
  customer_name: string | null;
  customer_phone: string | null;
  location_address: string | null;
  service_type: string | null;
  special_instructions: string | null;
}

export interface SenderInfo {
  phone: string;
  name: string | null;
  isGroup: boolean;
  groupId: string | null;
  groupName: string | null;
}

// Parse message using Lovable AI with enhanced instruction separation
export async function parseMessageWithAI(message: string): Promise<{ parsed: ParsedLead; confidence: number }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: PARSING_PROMPT },
        { role: "user", content: message },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_lead_data",
            description: "Extract structured lead data from the message, separating address from special instructions",
            parameters: {
              type: "object",
              properties: {
                customer_name: { type: "string", description: "Customer's name" },
                customer_phone: { type: "string", description: "10-digit phone number" },
                location_address: { 
                  type: "string", 
                  description: "ONLY address: building, street, area, city, PIN. NO time or instructions." 
                },
                service_type: { 
                  type: "string", 
                  enum: ["rent_agreement", "maha_eseva", "domicile", "other"],
                  description: "Type of service needed"
                },
                special_instructions: { 
                  type: "string", 
                  description: "Time slots, availability, urgency, any non-address info" 
                },
              },
              required: ["location_address"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_lead_data" } },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI Gateway error:", response.status, errorText);
    throw new Error(`AI parsing failed: ${response.status}`);
  }

  const data = await response.json();
  
  // Extract tool call result
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    throw new Error("No tool call in AI response");
  }

  const parsed: ParsedLead = JSON.parse(toolCall.function.arguments);
  
  // Calculate confidence based on fields extracted
  let fieldsFound = 0;
  if (parsed.customer_name) fieldsFound++;
  if (parsed.customer_phone) fieldsFound++;
  if (parsed.location_address && parsed.location_address.length > 10) fieldsFound += 1.5;
  if (parsed.service_type && parsed.service_type !== "other") fieldsFound++;
  if (parsed.special_instructions) fieldsFound += 0.5;
  
  const confidence = Math.min(100, Math.round((fieldsFound / 4) * 100));

  return { parsed, confidence };
}

// Geocode address using MapTiler
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const MAPTILER_API_KEY = Deno.env.get("MAPTILER_API_KEY");
  
  if (!MAPTILER_API_KEY || !address) {
    return null;
  }

  try {
    const encodedAddress = encodeURIComponent(address + ", India");
    const response = await fetch(
      `https://api.maptiler.com/geocoding/${encodedAddress}.json?key=${MAPTILER_API_KEY}&limit=1`
    );
    
    if (!response.ok) {
      console.error("Geocoding failed:", response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lat, lng };
    }
    
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

// Validate and extract 10-digit Indian phone number
export function extractValidPhone(phone: string | null | undefined, fallbackPhone?: string): string | null {
  let customerPhone = phone;
  
  if (!customerPhone || customerPhone === "null" || customerPhone.length !== 10) {
    if (fallbackPhone) {
      customerPhone = fallbackPhone.replace(/^91/, "").slice(-10);
    }
  }
  
  if (!customerPhone || customerPhone.length !== 10) {
    return null;
  }
  
  return customerPhone;
}
