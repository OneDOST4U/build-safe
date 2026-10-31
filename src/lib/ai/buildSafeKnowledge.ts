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
  text: `👋 **Hello! I am BUILD-SAFE AI**, your intelligent decision support assistant for the **Municipality of Lasam, Cagayan**.

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
    'What is the 7-step building permit process in Lasam?',
    'What documents are required for a building permit?',
    'Can I build a house on agricultural land in Lasam?',
    'What are the mandatory river easement setbacks?',
    'How close can I build to an active fault line?',
  ],
}

export function generateAiResponse(userInput: string, context?: ChatContext): {
  text: string
  suggestions?: string[]
} {
  const q = userInput.toLowerCase().trim()

  // 0a. Explain BUILD-SAFE site assessment process
  if (
    q.includes('explain the build-safe site assessment process') ||
    q.includes('site assessment process') ||
    q.includes('assessment process') ||
    q.includes('how does build-safe work')
  ) {
    return {
      text: `🏛️ **How BUILD-SAFE Site Assessment Works:**

1. **Pick a Location:** Click your parcel on the map or enter coordinates in Lasam.
2. **Hazard Screening:** Instant check for flood depths, river easements, and active fault line buffers.
3. **Zoning Check:** Verifies if your building or farm is allowed under Lasam's CLUP (2020–2029).
4. **Actionable Summary:** Tells you if the site is clear, what permits are needed, and recommended safety steps.`,
      suggestions: [
        'Can I build on agricultural land in Lasam?',
        'What are the mandatory river easement setbacks?',
        'What permits are required in Lasam?',
      ],
    }
  }

  // 0b. Discuss a topic with me
  if (
    q.includes('discuss a topic with me') ||
    q.includes('discuss a topic') ||
    q.includes('topics to discuss')
  ) {
    return {
      text: `💬 **Topics we can explore for Lasam:**

• **Flood Protection:** Stilt construction and elevated foundations along river floodplains
• **Agricultural Land Rules:** How Lasam protects prime rice lands and DAR conversion rules
• **Earthquake Safety:** Building standards for Seismic Zone 4 and liquefaction
• **Permits & Approvals:** Step-by-step clearance from the MPDO and Building Official`,
      suggestions: [
        'Can I build on agricultural land in Lasam?',
        'What are the mandatory river easement setbacks?',
        'What permits are required in Lasam?',
      ],
    }
  }

  // 0c. Help me with my writing
  if (
    q.includes('help me with my writing') ||
    q.includes('help me with writing') ||
    q.includes('help write') ||
    q.includes('draft a letter')
  ) {
    return {
      text: `✍️ **I can help draft municipal letters for Lasam:**

• **Locational Clearance Letter:** Justification letter for the Lasam MPDO
• **DAR Reclassification Petition:** For agricultural lot conversion
• **Hazard Mitigation Summary:** For your architect, engineer, or contractor
• **Barangay Consultation Letter:** Request for local council clearance`,
      suggestions: [
        'What permits are required in Lasam?',
        'Can I build on agricultural land in Lasam?',
        'What are the mandatory river easement setbacks?',
      ],
    }
  }

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

• **Protected Land:** Agricultural land in Lasam is reserved for farming. Building a house or commercial structure is **non-conforming**.
• **Requirements to Build:** You must secure a **DAR Conversion Clearance** and a **reclassification ordinance** from the Sangguniang Bayan before a building permit is issued.
• **Farm Structures:** Sheds, crop dryers, and storage buildings directly supporting farming are allowed without conversion.`,
      suggestions: [
        'What permits are required in Lasam?',
        'What are the mandatory river easement setbacks?',
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
      text: `🌊 **River Easement Setbacks (PD 1067):**

By law, no permanent structures can be built within:
• **3 meters** in urban areas
• **20 meters** along agricultural / rural riverbanks (Lasam & Zinundungan rivers)
• **40 meters** in forest areas

These buffer zones are strictly protected for flood safety and river maintenance.`,
      suggestions: [
        'How does MGB rate flood susceptibility?',
        'What are active fault line buffers?',
        'Can I build on agricultural land in Lasam?',
      ],
    }
  }

  // 4. Flood Hazards & Elevation (MGB / LGU)
  if (q.includes('flood') || q.includes('baha') || q.includes('water level') || q.includes('drain')) {
    return {
      text: `🌊 **Flood Risk & Safety Guidelines (DENR-MGB):**

• **Low Flood (<0.5m):** Standard foundations are generally safe.
• **Moderate Flood (0.5m–1.0m):** Raise your finished floor elevation at least **+0.50m** above the road or highest flood line.
• **High / Very High (>1.0m):** Build on concrete stilts or elevated posts. Ground levels should not be used for sleeping quarters.`,
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
      text: `🏚️ **Active Fault Line Buffers (PHIVOLCS):**

• **5-Meter Buffer:** A strictly non-buildable buffer of **5 meters** on both sides of an active fault line (10m total) is required.
• **Seismic Safety:** Lasam is in Seismic Zone 4, requiring reinforced concrete framing and ductile detailing.`,
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

  // 8b. Evacuation Centers & Disaster Facilities
  if (
    q.includes('evacuation') ||
    q.includes('evac') ||
    q.includes('shelter') ||
    q.includes('natalged') ||
    q.includes('arena') ||
    q.includes('multi-purpose')
  ) {
    return {
      text: `🏛️ **Official Evacuation Centers in Lasam:**

• **Municipal Evacuation Center 1:** Located in Centro 3 near Natalged Arena (18°03'57.3"N 121°35'35.1"E). Primary center for community events, caravans, and disaster evacuation.
• **Municipal Evacuation Center 2:** Located in Centro 1 (18°04'01.1"N 121°36'07.0"E).
• **Lasam Multi-Purpose Building:** Located in Centro 1 (18°04'00.3"N 121°36'09.2"E).

*Tip:* Under **Critical Facilities** in the assessment panel, you can click any of these facilities to view their live road route on the 3D map!`,
      suggestions: [
        'What is the 7-step building permit process in Lasam?',
        'What are the mandatory river easement setbacks?',
        'What documents are required for a building permit?',
      ],
    }
  }

  // 8c. Health Facilities & RHU
  if (
    q.includes('rhu') ||
    q.includes('health') ||
    q.includes('hospital') ||
    q.includes('clinic') ||
    q.includes('doctor')
  ) {
    return {
      text: `🏥 **Government Health Facilities in Lasam:**

• **Lasam Rural Health Unit (RHU) & Municipal Health Office:** Located in Centro 1 (18.06741° N, 121.60279° E) for primary medical care and municipal health clearances.
• **Lasam District Hospital:** DOH Level 1 public hospital located along the main road for emergency operations and inpatient care.

You can click **Nearest Government Health Facility** in the assessment panel to trace the live road route on the 3D map!`,
      suggestions: [
        'Where are the evacuation centers in Lasam?',
        'What is the 7-step building permit process in Lasam?',
        'What are the mandatory river easement setbacks?',
      ],
    }
  }

  // 9a. Building Permit 7-Step Procedure & Processing Time
  if (
    q.includes('step') ||
    q.includes('procedure') ||
    q.includes('process of building') ||
    q.includes('permit process') ||
    q.includes('how long') ||
    q.includes('duration') ||
    q.includes('application process')
  ) {
    return {
      text: `🏛️ **Official 7-Step Building Permit Procedure in Lasam:**
*Total Processing Time: 6 Days, 1 hour, and 9 minutes*

1. **Step 1:** Sign Client Logbook & receive initial requirements.
2. **Step 2:** Submit documents for plan evaluation & hazard checks (takes 3 days; BUILD-SAFE automates this step).
3. **Step 3:** Acknowledge notice of evaluation at the Office of the Building Official (OBO).
4. **Step 4:** Receive official Order of Payment from OBO.
5. **Step 5:** Pay fees at Municipal Treasury Office & receive Official Receipt (OR).
6. **Step 6:** Submit OR back to OBO for permit preparation & final approval.
7. **Step 7:** Sign logbook and receive your approved Building Permit.`,
      suggestions: [
        'What documents are required for a building permit?',
        'What offices review my building permit application?',
        'Can I build on agricultural land in Lasam?',
      ],
    }
  }

  // 9b. Offices Involved in Building Permit
  if (
    q.includes('office') ||
    q.includes('department') ||
    q.includes('who review') ||
    q.includes('who approve')
  ) {
    return {
      text: `🏢 **6 Municipal Offices Reviewing Building Permits in Lasam:**

1. **Municipal Engineering Office / OBO:** Primary reviewing & issuing authority for structural, architectural, electrical, and sanitary evaluation.
2. **BFP Lasam Station (Fire Protection):** Inspects fire safety & issues Fire Safety Evaluation Certificate (FSEC).
3. **MPDO / Zoning Division:** Verifies land use against CLUP & issues Locational Clearance.
4. **Municipal Treasury Office:** Fee calculation, collection, and Official Receipt (OR) issuance.
5. **Municipal Assessor’s Office:** Property ownership verification & Updated Tax Declaration.
6. **Concerned Barangay Hall:** Verifies site jurisdiction & issues Barangay Construction Clearance.`,
      suggestions: [
        'What is the 7-step building permit process in Lasam?',
        'What documents are required for a building permit?',
        'What are the common reasons for disapproving a permit?',
      ],
    }
  }

  // 9c. Disapproval / Rejection Reasons
  if (
    q.includes('disapprov') ||
    q.includes('reject') ||
    q.includes('denied') ||
    q.includes('returned') ||
    q.includes('fail')
  ) {
    return {
      text: `⚠️ **Common Reasons Building Permits are Returned or Disapproved:**

• **Technical Non-Compliance:** Plans fail standards under PD 1096 (National Building Code), NSCP Structural Code, Electrical, or Plumbing Codes.
• **Zoning Violations:** Proposed structure is non-conforming under the Lasam CLUP without approved conversion.
• **Incomplete Documents:** Missing required clearances, expired tax receipts, or lack of sealed professional plans.
• **Ownership Discrepancies:** Conflicts or lack of clear title (TCT/OCT) or notarized deeds.
• **Expired Licenses:** Invalid PTR or PRC IDs of designing engineers and architects.`,
      suggestions: [
        'What documents are required for a building permit?',
        'What is the 7-step building permit process in Lasam?',
        'Can I build on agricultural land in Lasam?',
      ],
    }
  }

  // 9d. Official Required Documents Checklist
  if (
    q.includes('permit') ||
    q.includes('clearance') ||
    q.includes('requirement') ||
    q.includes('checklist') ||
    q.includes('document') ||
    q.includes('process') ||
    q.includes('how to build')
  ) {
    return {
      text: `📜 **Official 10-Document Checklist for Building Permit in Lasam:**

1. **Application Form** (5 accomplished originals)
2. **Proof of Ownership** (Title OCT/TCT, Deed of Sale, or Lease Contract — 1 original, 2 copies)
3. **Signed & Sealed Plans** (Architectural, Structural, Electrical, Sanitary — 5 originals)
4. **Professional Licenses** (PRC ID & PTR with 3 specimen signatures — 2 copies)
5. **Bill of Materials & Cost Estimate** signed and sealed (5 originals)
6. **Updated Tax Declaration** (1 original, 1 copy)
7. **Current Tax Receipt** (1 original, 1 copy)
8. **Locational Clearance** from Lasam MPDO (1 original)
9. **Barangay Construction Clearance** (1 original, 2 copies)
10. **Fire Safety Certificate (FSEC)** from BFP Lasam (1 original)`,
      suggestions: [
        'What is the 7-step building permit process in Lasam?',
        'What offices review my building permit application?',
        'Can I build on agricultural land in Lasam?',
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
      text: `👋 Hello! I am **BUILD-SAFE AI**, your planning assistant for Lasam, Cagayan.

I can help you check:
• **Zoning:** Is your lot residential, commercial, or agricultural?
• **Hazards:** Flood depth, active fault distance, and river setbacks
• **Permits:** Clearances needed from the Lasam MPDO and Engineering Office
• **Farm Lots:** Suitable crops and agribusiness locations`,
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
    text: `I can help you evaluate properties and safety in Lasam!

• **Zoning & Land Use:** Agricultural, residential, or commercial compliance (CLUP 2020)
• **Hazards & Setbacks:** Flood risks, river easements (PD 1067), and fault lines
• **Permits:** Locational clearances and building permits
• **Farm Lots:** Crop recommendations and farming regulations`,
    suggestions: [
      'Can I build on agricultural land in Lasam?',
      'What are the mandatory river easement setbacks?',
      'How close can I build to an active fault line?',
      'What building permits are required in Lasam?',
    ],
  }
}
