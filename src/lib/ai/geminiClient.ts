import type { ChatContext, ChatMessage } from './buildSafeKnowledge'
import { generateAiResponse } from './buildSafeKnowledge'

const GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim() || ''

// Tested and verified models on Google AI Studio
const PREFERRED_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-flash-latest',
]

/**
 * Builds the comprehensive system instruction for BUILD-SAFE Lasam
 */
function buildSystemInstruction(context?: ChatContext): string {
  let contextInfo = 'No specific parcel selected on the map.'
  if (context?.siteCoords) {
    const lat = context.siteCoords[1].toFixed(5)
    const lng = context.siteCoords[0].toFixed(5)
    contextInfo = `Selected Parcel Location: ${lat}° N, ${lng}° E in Lasam, Cagayan.`
    if (context.category === 'farm_lot') {
      contextInfo += `\nLand-use Intent: Farm Lot & Crop Cultivation (Selected crop: ${context.cropType || 'Palay / Corn'}).`
    } else {
      contextInfo += `\nLand-use Intent: Building Structure (Proposed type: ${context.buildingType || 'Single-family house'}).`
    }
  }

  if (context?.assessmentResult) {
    const res = context.assessmentResult
    contextInfo += `\n\nLive Hazard & Zoning Assessment Summary for this parcel:`
    if (res.lgu?.length) {
      contextInfo += `\n- LGU / CLUP 2020 Zoning: ${res.lgu.map((r) => `${r.label}: ${r.value}`).join('; ')}`
    }
    if (res.seismic?.length) {
      contextInfo += `\n- Seismic Hazards: ${res.seismic.map((r) => `${r.label}: ${r.value}`).join('; ')}`
    }
    if (res.volcanic?.length) {
      contextInfo += `\n- Volcanic Hazards: ${res.volcanic.map((r) => `${r.label}: ${r.value}`).join('; ')}`
    }
    if (res.facilities?.length) {
      contextInfo += `\n- Nearest Critical Facilities: ${res.facilities.map((r) => `${r.label}: ${r.value}`).join('; ')}`
    }
  }

  return `You are BUILD-SAFE AI, the official intelligent urban planning and multi-hazard decision support assistant for the Municipality of Lasam, Cagayan, Philippines.

### Core Domain Rules & Policies in Lasam:
1. **CLUP (2020-2029) Comprehensive Land Use Plan & Zoning Ordinance**:
   - **Residential & Commercial Zones**: Fully conforming for building structures.
   - **Agricultural Land (agriculture, crops)**: NON-CONFORMING for residential or commercial buildings. Constructing a building on agricultural land requires mandatory DAR Land Use Conversion Clearance (under RA 8435 AFMA & DAR A.O. 1) and Sangguniang Bayan reclassification ordinance (RA 7160 Sec. 20) before a building permit may be lawfully granted.
   - **Farm Lots & Crops**: Strictly conforming ONLY in designated Agricultural areas. Establishing farm lots in residential, commercial, parks, cemeteries, institutional zones, or water bodies is strictly prohibited.
   - **Prohibited Zones**: Building and farm establishment are strictly prohibited inside Water Bodies (PD 1067), Parks & Recreation zones, Cemetery grounds, and Institutional zones.

2. **Geospatial Hazards & Statutory Setbacks**:
   - **PD 1067 (Philippine Water Code)**: Strict river easements where no permanent structure may be erected:
     - 3 meters in urban areas.
     - 20 meters in agricultural areas.
     - 40 meters in forest areas.
   - **PHIVOLCS Active Faults**: Mandatory 5-meter buffer setback from active ground rupture traces.
   - **DENR-MGB Flood Inundation**: 100-year flood hazard maps classify low, moderate, high, and very high flood depth along the Lasam and Zinundungan rivers. High-risk areas require elevated stilt construction or minimum 0.6m freeboard above base flood elevation.
   - **Mount Cagua Volcano**: Active volcano located ~53 km east of Lasam; within regional ashfall zone.

3. **Current User Property Context**:
${contextInfo}

### Instructions for Responses:
- **Language Default**: Always respond in **standard professional English** by default. Use natural English greetings (such as "Hello!", "Welcome to BUILD-SAFE AI!"). Never use random Ilocano or Filipino words (like "Dagiti", "Mabuhay", or particles) when communicating in English.
- **Language Matching**: Only switch to Tagalog/Filipino or Ilocano if the user explicitly addresses you in that language or asks for a response in it.
- **Tone & Style**: Respond directly, knowledgeably, warmly, and helpfully in GitHub-flavored markdown.
- **Gemini AI Attribution**: If the user asks whether you are connected to Gemini, confirm cheerfully in English that you are powered by Google Gemini AI and actively integrated into the BUILD-SAFE Lasam decision support engine.
- **Conciseness**: Keep answers concise, structured, and actionable. When appropriate, offer 2-3 relevant follow-up questions or suggestions.`
}

export async function askGemini(
  userInput: string,
  context?: ChatContext,
  history: ChatMessage[] = [],
): Promise<{ text: string; suggestions?: string[] }> {
  if (!GEMINI_API_KEY) {
    return generateAiResponse(userInput, context)
  }

  // Format conversation history for Gemini (last 8 messages)
  const recentHistory = history.slice(-8)
  const contents = [
    ...recentHistory.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    })),
    {
      role: 'user',
      parts: [{ text: userInput }],
    },
  ]

  const systemInstructionText = buildSystemInstruction(context)

  // Try each model in sequence
  for (const model of PREFERRED_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstructionText }],
          },
          contents,
          generationConfig: {
            temperature: 0.35,
            topP: 0.9,
            maxOutputTokens: 1024,
          },
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        console.warn(`Gemini model ${model} returned ${res.status}:`, errText)
        continue
      }

      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (text && typeof text === 'string' && text.trim()) {
        return {
          text: text.trim(),
          suggestions: extractSuggestions(text, context),
        }
      }
    } catch (err) {
      console.warn(`Gemini model ${model} fetch failed:`, err)
    }
  }

  // Fallback to local offline rule engine if API fails
  console.info('Falling back to local knowledge engine for response')
  return generateAiResponse(userInput, context)
}

function extractSuggestions(_aiText: string, context?: ChatContext): string[] {
  // If property context is present, offer contextual suggestions
  if (context?.siteCoords) {
    if (context.category === 'farm_lot') {
      return [
        'What crops are best suited for this soil?',
        'What is the distance to nearest farm trading center?',
        'Can I construct a farm storage shed here?',
      ]
    }
    return [
      'What building permits are required for this site?',
      'How far is the nearest evacuation center and hospital?',
      'What are the mandatory river easement setbacks?',
    ]
  }

  return [
    'Can I build on agricultural land in Lasam?',
    'What are the mandatory river easement setbacks?',
    'How close can I build to an active fault line?',
    'What permits are required in Lasam?',
  ]
}
