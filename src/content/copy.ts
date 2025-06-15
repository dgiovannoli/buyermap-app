export const content = {
  // Main page content
  headline: "Validate Your ICP Assumptions",
  description: "Compare your sales messaging against real customer interviews",
  ctaButton: "Create Your BuyerMap Report",
  freeTrialNotice: "Free to try • Export or save with account",
  
  // Analysis results
  alignmentScore: {
    label: "Overall Alignment Score", 
    description: "Highly aligned with buyer reality",
    misalignmentsFound: "misalignments found"
  },
  
  // Navigation tabs
  tabs: {
    allResults: "All Results",
    misalignments: "Misalignments",
    newInsights: "New Insights", 
    validated: "Validated"
  },
  
  // Analysis sections
  competitive: {
    category: "COMPETITIVE POSITIONING",
    recommendationLabel: "Messaging Recommendation:",
    supportingEvidenceLabel: "Supporting Evidence:",
    insightsValidatedSuffix: "insights validated"
  },
  
  // Status labels
  status: {
    misaligned: "Misaligned",
    aligned: "Aligned",
    validated: "Validated"
  },
  
  // UI labels
  ui: {
    showDetails: "Show Details",
    hideDetails: "Hide Details",
    expandDetails: "▼",
    collapseDetails: "▲"
  }
} as const;

export type ContentKeys = typeof content; 