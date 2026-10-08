import { GoogleGenAI, Type } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("GEMINI_API_KEY is missing from environment variables.");
}
const ai = new GoogleGenAI({ apiKey });

export async function extractBillData(mimeType: string, base64Data: string) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  
  const prompt = `You are reading a photo of a purchase bill/invoice. Extract the data exactly as printed. Do not guess: use null for anything not visible. Bills may be handwritten, rotated, or in Hindi/Marathi/English.
IMPORTANT RULES:
1. The top name on the bill is the merchant_name.
2. The name below the merchant is the buyer_name.
3. If there is a specified box named 'Broker', extract that name into broker_name.
4. Only extract ACTUAL products/goods sold in the "items" array.
5. Extract the number of bags ONLY from the explicit 'Bags' column into the 'bags' field. Do NOT confuse this with the weight/kgs mentioned in the product name or Net Wt column (e.g., if it says 30 KGS, the bags is usually a separate small number like 1, not 30).
6. DO NOT include additional charges (e.g., Cont Chg, APMC, GST, Freight, Labour) as items.
7. A single product might span multiple lines (e.g., "NEW-PARAS/LACHKARI" on line 1, "RICE 30 KGS" on line 2). Combine them into a single item. Do not create duplicate items for the same product.
Return JSON only.`;

  const response = await ai.models.generateContent({
    model: model,
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: base64Data } }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          merchant_name: { type: Type.STRING, nullable: true },
          buyer_name: { type: Type.STRING, nullable: true },
          broker_name: { type: Type.STRING, nullable: true },
          bill_number: { type: Type.STRING, nullable: true },
          bill_date: { type: Type.STRING, nullable: true },
          items: {
            type: Type.ARRAY,
            nullable: true,
            items: {
              type: Type.OBJECT,
              properties: {
                product_name: { type: Type.STRING, nullable: true },
                bags: { type: Type.STRING, nullable: true },
                weight: { type: Type.STRING, nullable: true },
                unit_price: { type: Type.NUMBER, nullable: true },
                line_price: { type: Type.NUMBER, nullable: true },
                location: { type: Type.STRING, nullable: true }
              }
            }
          },
          total_size: { type: Type.STRING, nullable: true },
          total_weight: { type: Type.STRING, nullable: true },
          total_amount: { type: Type.NUMBER, nullable: true },
          confidence_notes: { type: Type.STRING, nullable: true }
        }
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error('Model returned no output.');
  }
  
  return JSON.parse(text);
}
