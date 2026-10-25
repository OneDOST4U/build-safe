/**
 * BUILD-SAFE AI Knowledge Engine
 * Context-aware decision support system for the Municipality of Lasam, Cagayan.
 * Covers CLUP 2020-2029 zoning, MGB flood data, PHIVOLCS seismic faults, PD 1096,
 * PD 1067 (Water Code), RA 8435 (AFMA), and DA agricultural guidelines.
 */

import type { SiteAssessmentResult } from '@/types'

export interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  text: string
  timestamp: string
  suggestions?: string[]
}

export interface ChatContext {
  siteCoords?: [number, number] | null
  assessmentResult?: SiteAssessmentResult | null
  category?: 'building' | 'farm_lot'
  buildingType?: string
  cropType?: string
}

export const INITIAL_GREETING_MESSAGE: ChatMessage = {
  id: 'welcome-1',
  sender: 'assistant',
  text: `👋 **Mabuhay! I am BUILD-SAFE AI**, your intelligent decision support assistant for the **Municipality of Lasam, Cagayan**.

I can assist you with:
• **CLUP (2020–2029) Zoning & Land Use Compliance**
• **DENR-MGB Flood & Waterway Easements (PD 1067)**
• **PHIVOLCS Fault Line Setbacks & Earthquake Risks**
• **DAR Agricultural Conversion & AFMA (RA 8435) Rules**
• **Farm Lot Crop Suitability & Agri-business Logistics**
• **Building Permit Requirements in Lasam**

How can I help you plan or evaluate your property today?`,
  timestamp: 'Just now',
  suggestions: [
    'Can I build a house on agricultural land in Lasam?',
    'What are the mandatory river easement setbacks?',
    'How close can I build to an active fault line?',
    'What permits are required for a building in Lasam?',
    'What crops are most suitable for Lasam farm lots?',
  ],
}

export function generateAiResponse(userInput: string, context?: ChatContext): {
  text: string
  suggestions?: string[]
} {
  const q = userInput.toLowerCase().trim()

  // 1. Current Site / Assessment inquiries
  if (
    (q.includes('my site') ||
      q.includes('this site') ||
      q.includes('selected site') ||
      q.includes('is it safe') ||
      q.includes('current lot') ||
      q.includes('my assessment')) &&
    context?.assessmentResult
  ) {
    const res = context.assessmentResult
    const isFarm = res.input.category === 'farm_lot'
    const targetLabel = isFarm
      ? `Farm Lot (${res.cropSuitability?.cropLabel ?? res.input.cropType ?? 'Crops'})`
      : (res.input.buildingType ?? 'Proposed Structure')

    const zoningRow = res.lgu.find((r) => r.label.toLowerCase().includes('zoning'))
    const floodRow = res.lgu.find((r) => r.label.toLowerCase().includes('flood'))
    const faultRow = res.seismic.find((r) => r.label.toLowerCase().includes('fault'))
    const liqRow = res.seismic.find((r) => r.label.toLowerCase().includes('liquefaction'))

    const allRows = [...res.lgu, ...res.seismic, ...res.volcanic, ...res.hydromet]
    const isProhibited = allRows.some((r) => r.value.includes('🚫') || r.value.includes('PROHIBITED'))
    const isRestricted = allRows.some((r) => r.value.includes('⚠️') || r.value.includes('RESTRICTED') || r.value.includes('Data Gap'))

    return {
      text: `📍 **Current Site Assessment Summary for ${targetLabel}:**
• **Coordinates:** ${res.input.lat.toFixed(5)}° N, ${res.input.lng.toFixed(5)}° E (${res.coverage?.municipality ?? 'Lasam'})
• **CLUP 2020 Zoning:** ${zoningRow?.value ?? 'Zoned Land'}
• **MGB Flood Hazard:** ${floodRow?.value ?? 'Evaluated'}
• **Active Fault Distance:** ${faultRow?.value ?? 'Evaluated'}
• **Liquefaction Susceptibility:** ${liqRow?.value ?? 'Low to Moderate'}

${
  isProhibited
    ? '🚫 **CRITICAL NOTICE:** Construction at this specific location is **STRICTLY PROHIBITED** under statutory guidelines (e.g., active water body / legal easement).'
    : isRestricted
    ? '⚠️ **CAUTION:** This site is **RESTRICTED**. Legal clearances (such as DAR conversion clearance or finished floor elevation compliance) are mandatory prior to permit issuance.'
    : '✅ **CLEAR:** This location meets baseline municipal safety buffers and hazard screening criteria.'
}

Would you like detailed engineering mitigation guidelines or permit steps for this location?`,
      suggestions: [
        'What permits are needed for this site?',
        'How can I mitigate flood risk here?',
        'Nearest agricultural business to this site',
      ],
    }
  }

  // 2. Agricultural Land & Conversion Rules (AFMA / DAR)
  if (
    q.includes('agri') ||
    q.includes('farm land') ||
    q.includes('conversion') ||
    q.includes('dar') ||
    q.includes('reclassify') ||
    q.includes('build on farm')
  ) {
    return {
      text: `🌾 **Building on Agricultural Land in Lasam:**

Under the **Lasam Comprehensive Land Use Plan (CLUP 2020–2029)** and **Republic Act No. 8435 (AFMA)**:
1. **Zoning Restriction:** Agricultural zones are preserved primarily for agricultural production, food security, and allied agribusinesses.
2. **Mandatory DAR Conversion Clearance:** If you intend to erect non-agricultural structures (such as commercial, industrial, or residential subdivisions), you must first secure formal **Land Use Conversion Clearance** from the **Department of Agrarian Reform (DAR)** under *DAR Administrative Order No. 1 (2019)*.
3. **Sangguniang Bayan Reclassification:** A formal municipal reclassification ordinance enacted by the **Sangguniang Bayan of Lasam** pursuant to *Section 20 of the Local Government Code (RA 7160)* is required before the Municipal Engineering Office can lawfully issue a Building Permit.
4. **Farm Lots:** If the property is developed as an active **Farm Lot** (crop production, solar dryers, farm machinery sheds), it conforms directly with the agricultural zoning!`,
      suggestions: [
        'What is NPAAAD and SAFDZ protection?',
        'What are the requirements for building permits?',
        'Which crops grow best in Lasam?',
      ],
    }
  }

  // 3. Waterway Easements & PD 1067 (Water Code)
  if (
    q.includes('river') ||
    q.includes('easement') ||
    q.includes('water') ||
    q.includes('stream') ||
    q.includes('drainage') ||
    q.includes('water body')
  ) {
    return {
      text: `🌊 **Waterway Easements & Legal Protection (PD 1067):**

Under **Presidential Decree No. 1067 (The Water Code of the Philippines, Article 51)** and the **National Building Code (PD 1096)**:
• **Urban Areas:** Minimum **3-meter** riparian easement along all riverbanks and creeks.
• **Agricultural Areas:** Minimum **20-meter** easement along rivers (such as the *Lasam River*, *Zinundungan River*, and tributary creeks).
• **Forest & Mountain Areas:** Minimum **40-meter** conservation easement.

⚠️ **Strict Legal Rule:** No permanent structure may be erected within these easements. They are reserved exclusively for public recreation, flood defense, and river maintenance. Building inside riverbeds or natural drainage corridors is illegal and will be summarily denied a building permit.`,
      suggestions: [
        'How does MGB rate flood susceptibility?',
        'How to mitigate flood hazards for structures?',
        'Can I build on agricultural land?',
      ],
    }
  }

  // 4. Flood Hazards & Elevation (MGB / LGU)
  if (q.includes('flood') || q.includes('baha') || q.includes('water level') || q.includes('drain')) {
    return {
      text: `🌊 **MGB Flood Susceptibility & Recommended Mitigations:**

DENR-Mines and Geosciences Bureau (MGB) classifies flood susceptibility into 4 tiers:
• **Low Susceptibility:** Historical flood depths < 0.5m; duration < 1 day. Standard foundation design is sufficient.
• **Moderate Susceptibility:** Flood depths 0.5m – 1.0m; flood duration 1–3 days. Minimum Finished Floor Elevation (**FFE**) must be raised **+0.50m** above the adjacent roadway or historical flood crest.
• **High Susceptibility:** Flood depths 1.0m – 2.0m. Requires stilt/column foundation or elevated ground floor. Ground levels should not be used for primary sleeping quarters.
• **Very High Susceptibility:** Flood depths > 2.0m. Highly hazardous; priority zone for floodway retention, agriculture, or elevated stilt structures.

💡 *Lasam Tip:* Check our live LGU and MGB flood layers to view exact flood extent along the Lasam and Zinundungan basins.`,
      suggestions: [
        'What are the river easement rules?',
        'What are active fault line buffers?',
        'What permits are required in Lasam?',
      ],
    }
  }

  // 5. Seismic & Fault Lines (PHIVOLCS)
  if (
    q.includes('fault') ||
    q.includes('earthquake') ||
    q.includes('lindol') ||
    q.includes('phivolcs') ||
    q.includes('seismic') ||
    q.includes('tremor')
  ) {
    return {
      text: `🏚️ **Active Fault Line Buffers & Seismic Guidelines (PHIVOLCS):**

According to **PHIVOLCS** and the **National Structural Code of the Philippines (NSCP, 7th Ed.)**:
1. **Mandatory 5-Meter Buffer:** A strictly non-buildable buffer zone of **at least 5 meters** on both sides of an active fault trace (total 10m strip) is required. No building permit may be approved directly over a known active ground rupture trace.
2. **Seismic Zone 4:** The entire Province of Cagayan and Municipality of Lasam falls under **Seismic Zone 4 (Zone Factor Z = 0.40)**, requiring reinforced concrete detailing, ductile beam-column joints, and lateral tie reinforcement.
3. **Soil Geotechnical Tests:** For structures 3 stories and above, a confirmatory geotechnical borehole investigation is strongly recommended to evaluate liquefaction potential in alluvial river deposits.`,
      suggestions: [
        'What is liquefaction and where does it occur?',
        'How to check distance to active faults?',
        'What building permits are needed?',
      ],
    }
  }

  // 6. Liquefaction
  if (q.includes('liquefaction') || q.includes('alluvial') || q.includes('soil')) {
    return {
      text: `💧 **Liquefaction Hazard in Lasam:**

• **What is it?** A phenomenon where water-saturated, loose granular soils (sands and silts) lose shear strength and behave like a dense fluid during earthquake shaking.
• **Where is it found in Lasam?** Moderate-to-high liquefaction susceptibility is concentrated along alluvial floodplains, sandbars, and low-lying river bends of the *Lasam River*.
• **Engineering Mitigation:**
  1. Soil replacement / densification.
  2. Mat/raft foundation or pile foundations anchored to stable underlying strata.
  3. Flexible utility connections (piping, drainage) to prevent shearing.`,
      suggestions: [
        'What are the active fault buffer rules?',
        'How to interpret MGB flood hazard?',
        'Can I build on agricultural land?',
      ],
    }
  }

  // 7. Volcanic Hazards (Cagua Volcano)
  if (q.includes('volcano') || q.includes('cagua') || q.includes('ashfall') || q.includes('bulkan')) {
    return {
      text: `🌋 **Volcanic Hazard Assessment (Mount Cagua):**

• **Proximity:** Mount Cagua (Active Volcano in Gonzaga, Cagayan) is situated approximately **60.8 km East** of Lasam.
• **Primary Hazard:** Because Lasam is outside the 20-km pyroclastic and lahar zone, the primary potential volcanic hazard is **light-to-moderate volcanic ashfall** during strong westerly or northeasterly wind shifts.
• **Recommended Architectural Measures:**
  - Roof pitch designed at **>= 30 degrees** with non-combustible corrugated metal or tile to prevent ash accumulation.
  - Inclusion of roof scuppers and cleanout traps in rain gutters.
  - Safe sealing of rainwater collection systems to avoid contamination.`,
      suggestions: [
        'What are the active fault line rules?',
        'What are the building permit requirements?',
        'What are the river easement rules?',
      ],
    }
  }

  // 8. Crops & Farm Lot Recommendations
  if (
    q.includes('crop') ||
    q.includes('palay') ||
    q.includes('rice') ||
    q.includes('corn') ||
    q.includes('mais') ||
    q.includes('vegetable') ||
    q.includes('farm lot')
  ) {
    return {
      text: `🌾 **Recommended Crops for Lasam Farm Lots (CLUP & DA Guidelines):**

Lasam's prime agricultural soils and alluvial terraces are highly fertile:
1. **Lowland Palay (Rice - Irrigated/Rainfed):** Ideal for level lowlands and clay-loam soils (e.g., Alannay, Nabannagan, Centro). Supported by the *Zinundungan River CIS* irrigation network.
2. **Yellow & White Corn:** Thrives on well-drained alluvial plains and gentle slopes (1–8%) during the dry and second-cropping seasons.
3. **Root Crops (Cassava, Sweet Potato / Kamote):** Highly drought-tolerant; excellent for upland terraces and sloping loam areas.
4. **High-Value Commercial Vegetables (Ampalaya, Eggplant, Squash):** Ideal along fertile riparian terraces with drip or furrow irrigation.

📍 *Agri Logistics:* Lasam features local cooperative grains centers (LFMPC in Centro 2), communal solar drying pavements (MPDP in Alannay/Centro), and DA-MAO technoguide demonstration centers.`,
      suggestions: [
        'Can I build a house on agricultural land?',
        'Where are the nearest farm businesses in Lasam?',
        'What are the river easement rules?',
      ],
    }
  }

  // 9. Building Permits & Process in Lasam
  if (
    q.includes('permit') ||
    q.includes('clearance') ||
    q.includes('requirement') ||
    q.includes('process') ||
    q.includes('how to build')
  ) {
    return {
      text: `📜 **Standard Building Permit Checklist for Lasam, Cagayan:**

To secure a legal Building Permit from the **Lasam Municipal Engineering Office (Office of the Building Official)**, prepare:
1. **Proof of Ownership:** Certified True Copy of TCT/OCT or Notarized Deed of Sale / Lease Agreement.
2. **Barangay Clearance:** Clearance from the respective Barangay Captain confirming local site consent.
3. **Locational / Zoning Clearance:** Issued by the **Lasam Municipal Planning & Development Office (MPDO)** verifying CLUP compliance.
4. **Complete Architecture & Engineering Plans (5 sets):**
   - Architectural, Structural, Electrical, Sanitary/Plumbing, and Mechanical plans signed & sealed by registered Philippine professionals.
5. **Fire Safety Evaluation Clearance (FSEC):** From the **Bureau of Fire Protection (BFP Lasam)**.
6. **DAR Conversion Clearance:** (Only if land is classified as Agricultural under the CLUP).

💡 *Pro-tip:* Generate a **BUILD-SAFE Site Assessment Report** and attach it to your MPDO pre-consultation package!`,
      suggestions: [
        'Can I build on agricultural land?',
        'What are the river easement rules?',
        'How to interpret MGB flood hazard?',
      ],
    }
  }

  // 10. Greetings & Identity
  if (
    q.includes('hi') ||
    q.includes('hello') ||
    q.includes('hey') ||
    q.includes('who are you') ||
    q.includes('help') ||
    q.includes('sino ka')
  ) {
    return {
      text: `👋 Hello! I am **BUILD-SAFE AI**, developed specifically for the **Municipality of Lasam, Cagayan**.

I combine local geospatial layers (CLUP 2020 zoning, DENR-MGB flood, PHIVOLCS fault lines, and DA farm registries) with Philippine building statutes (PD 1096, PD 1067, RA 8435) to give you instant, accurate property development answers.

You can ask me about:
• Zoning classification of any lot in Lasam
• Flood, earthquake, and liquefaction mitigations
• Minimum legal setbacks from rivers and fault lines
• Recommended crops and farm lot logistics
• Municipal permit procedures`,
      suggestions: [
        'Can I build on agricultural land in Lasam?',
        'What are the mandatory river easement setbacks?',
        'How close can I build to an active fault line?',
        'What permits are required in Lasam?',
      ],
    }
  }

  // 11. Fallback with helpful direction
  return {
    text: `I understand you're asking about **"${userInput}"**.

As the **BUILD-SAFE AI** decision support system for Lasam, I specialize in:
1. **Zoning & Land Use (CLUP 2020):** Checking agricultural, residential, commercial, or forest status.
2. **Hazard Screening:** DENR-MGB flood susceptibility, PHIVOLCS active fault distances, and river easements.
3. **Permit Compliance:** DAR clearances, MPDO locational clearances, and building codes (PD 1096).
4. **Farm Lot Logistics:** Recommended crops (palay, corn, root crops) and hauling routes.

Could you specify what aspect of property planning or hazard mitigation you would like to explore?`,
    suggestions: [
      'Can I build on agricultural land in Lasam?',
      'What are the mandatory river easement setbacks?',
      'How close can I build to an active fault line?',
      'What building permits are required in Lasam?',
    ],
  }
}
