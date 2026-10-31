import type { ChatContext, ChatMessage } from './buildSafeKnowledge'
import { generateAiResponse } from './buildSafeKnowledge'

const GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim() || ''

// Tested and verified working models on Google AI Studio
const PREFERRED_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
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

  return `You are BUILD-SAFE AI, the urban planning and multi-hazard assistant for the Municipality of Lasam, Cagayan, Philippines.

### CRITICAL INSTRUCTION: KEEP ANSWERS SHORT, SIMPLE, AND EASY TO UNDERSTAND
- **Explain Simply**: Explain concepts in plain, practical language. Do NOT write long essays, complex multi-step legal treatises, or dense outlines.
- **Maximum Length**: Keep answers brief—usually 2 to 4 concise bullet points or 2-3 short sentences (under 100-120 words total).
- **No Trailing Question Lists**: Do NOT add "How would you like to proceed? 1. ... 2. ... 3. ..." or lists of suggested questions at the end. The chatbot UI already displays clickable suggestion buttons.
- **Language Default**: Always respond in clean, natural English by default. Never use random foreign words like "Dagiti" or "Mabuhay" when writing in English. Only switch to Filipino or Ilocano if the user explicitly writes in that language.
- **Gemini Attribution**: If asked if you are connected to Gemini, briefly confirm in one cheerful sentence that you are powered by Google Gemini AI for Lasam decision support.

### Key Lasam Rules Summary:
1. **Zoning (CLUP 2020-2029)**:
   - Residential & Commercial: Permitted for building structures.
   - Agricultural Land: Protected for farming. Building a house or commercial structure is non-conforming and requires DAR Conversion Clearance and Sangguniang Bayan reclassification. Regular farm structures (crop dryers, storage) are permitted.
   - Water bodies, parks, cemeteries: Strictly no building.
2. **Hazard Setbacks & Easements**:
   - River Easements (PD 1067): Mandatory no-build zone—3m in urban areas, 20m in agricultural areas (Lasam & Zinundungan rivers), and 40m in forest areas.
   - Active Fault Lines (PHIVOLCS): Mandatory 5-meter buffer setback from active fault lines.
   - Flood Risk: Low-lying river areas require elevated floor levels (+0.5m) or stilt foundations.
   - Mt. Cagua Volcano: Active volcano ~53 km east; potential light-to-moderate regional ashfall.
3. **Official Lasam Building Permit Process (Municipal LGU Official Answers)**:
   - **Total Processing Time**: 6 Days, 1 hour, and 9 minutes.
   - **Official 7-Step Procedure**:
     1. *Step 1*: Sign Client Logbook; agency checks initial completeness & provides permit requirements.
     2. *Step 2*: Submit documents; agency evaluates technical plans, structural/zoning specs, and spatial hazards (takes 3 days; BUILD-SAFE accelerates this step).
     3. *Step 3*: Return to Office of the Building Official (OBO) to acknowledge receipt of notification.
     4. *Step 4*: OBO issues Order of Payment.
     5. *Step 5*: Pay required fees at Municipal Treasury Office and receive Official Receipt (OR).
     6. *Step 6*: Submit OR back to OBO; agency prepares and approves the Building Permit.
     7. *Step 7*: Sign the logbook and receive the approved Building Permit.
   - **6 Participating Municipal Offices**:
     1. Municipal Engineering Office / Office of the Building Official (OBO) - primary reviewing & issuing authority.
     2. Bureau of Fire Protection (BFP) Lasam Station - evaluates fire/life safety & issues Fire Safety Evaluation Certificate (FSEC).
     3. Municipal Planning and Development Office (MPDO) / Zoning - evaluates land use against CLUP & issues Locational Clearance.
     4. Municipal Treasury Office - computes/collects fees & issues Official Receipt (OR).
     5. Municipal Assessor's Office - property ownership verification & Updated Tax Declaration.
     6. Concerned Barangay Hall - site jurisdiction & Barangay Clearance for Construction.
   - **10 Official Required Documents**:
     1. Duly accomplished application form (5 originals)
     2. Certified True Copy of Title (OCT/TCT) or Notarized Deed of Sale / Lease (1 orig, 2 copies)
     3. Survey & design plans signed/sealed by registered professionals (5 originals)
     4. Valid PRC licenses and PTR of all professionals with 3-specimen signatures (2 copies)
     5. Bill of Materials and Cost Estimate signed/sealed (5 originals)
     6. Updated Tax Declaration (1 orig, 1 copy)
     7. Current Tax Receipt (1 orig, 1 copy)
     8. Locational Clearance from MPDO (1 original)
     9. Barangay Clearance for Building Construction (1 orig, 2 copies)
     10. Fire Safety Evaluation Certificate (FSEC) from BFP Lasam (1 original)
   - **Common Disapproval Reasons**: Non-compliance with PD 1096 (National Building Code), zoning violations, incomplete/expired documents, ownership discrepancies, or expired professional licenses.
   - **Role of BUILD-SAFE**: Directly accelerates Step 2 (Plan Evaluation & Document Verification) from days to seconds by checking hazards (flood, fault, setbacks) and generating an automated site hazard report.
4. **Verified Civic, Health & Agricultural Facilities in Lasam**:
   - **Municipal Evacuation Center 1**: Centro 3 near Natalged Arena (18°03'57.3"N 121°35'35.1"E / 121.59308° E, 18.06592° N).
   - **Municipal Evacuation Center 2**: Centro 1 (18°04'01.1"N 121°36'07.0"E / 121.60194° E, 18.06697° N).
   - **Lasam Multi-Purpose Building**: Centro 1 (18°04'00.3"N 121°36'09.2"E / 121.60255° E, 18.06675° N).
   - **Lasam Rural Health Unit (RHU) & Municipal Health Office**: Centro 1 (18.06741° N, 121.60279° E).
   - **Lasam District Hospital**: Centro / Ignacio B. Jurado (18.06366° N, 121.60942° E).
   - **GCare Pharmacy & Hospital Site Pharmacy**: Near District Hospital (18.06403° N, 121.60923° E).
   - **Lasam Public Market**: Centro 1 (18.06876° N, 121.60595° E).
   - **Natalged A Lasam Park**: Centro 2 (18.06327° N, 121.59975° E).
   - **AJSEAN RICE MILL**: Nabannagan West (18.07285° N, 121.53596° E).
   - **Diosa Palay Trading**: Centro / Nicolas Agatep (18.07737° N, 121.59734° E).
   - **Battalan Agricultural Cooperative**: Battalan (18.07280° N, 121.55380° E).
   - **Double E Agricultural & Poultry Supply**: Centro 1 (18.06623° N, 121.60271° E).

### Parcel Context:
${contextInfo}`
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
            temperature: 0.3,
            topP: 0.85,
            maxOutputTokens: 450,
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
        console.log(`✨ [BUILD-SAFE AI] Response successfully received from live Google Gemini API (${model}). Tokens used:`, data?.usageMetadata?.totalTokenCount)
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
