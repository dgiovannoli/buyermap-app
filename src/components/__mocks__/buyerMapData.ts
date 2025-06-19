import { BuyerMapData } from '../../types/buyermap';

export const MOCK_BUYER_MAP_DATA: BuyerMapData[] = [
  {
    id: 1,
    icpAttribute: "Buyer Titles",
    icpTheme: "WHO",
    v1Assumption: "Our ideal customer is a VP of Engineering or CTO at a mid-size tech company",
    whyAssumption: "These decision makers have budget authority and technical understanding",
    evidenceFromDeck: "Slide 3 shows our target as 'VP Engineering/CTO at 100-500 person companies'",
    realityFromInterviews: "Most successful customers are actually Engineering Directors or Senior Engineering Managers, not VPs or CTOs",
    comparisonOutcome: "Misaligned" as const,
    waysToAdjustMessaging: "Focus messaging on Engineering Directors and Senior Managers, emphasize team-level decision making rather than executive-level",
    confidenceScore: 85,
    confidenceExplanation: "Strong evidence from 8 customer interviews showing consistent patterns in actual buyer titles",
    quotes: [
      {
        id: "q1",
        text: "I'm an Engineering Director, not a VP. I make the final call on tools for my team.",
        speaker: "Sarah Chen",
        role: "Engineering Director",
        source: "Interview 3"
      },
      {
        id: "q2",
        text: "The VP is involved in budget approval, but I'm the one who evaluates and recommends tools.",
        speaker: "Mike Rodriguez",
        role: "Senior Engineering Manager",
        source: "Interview 7"
      }
    ],
    validationStatus: "validated" as const
  },
  {
    id: 2,
    icpAttribute: "Company Size",
    icpTheme: "WHO",
    v1Assumption: "Target companies with 100-500 employees",
    whyAssumption: "Large enough to have budget but small enough to be agile",
    evidenceFromDeck: "Slide 4 mentions 'mid-market companies (100-500 employees)'",
    realityFromInterviews: "Our best customers are actually 50-200 employees, with some successful cases at 20-50 person startups",
    comparisonOutcome: "Refined" as const,
    waysToAdjustMessaging: "Adjust target to 50-200 employees, emphasize benefits for growing companies and early-stage startups",
    confidenceScore: 92,
    confidenceExplanation: "Clear pattern across 12 interviews showing optimal company size range",
    quotes: [
      {
        id: "q3",
        text: "We're 75 people and this is perfect for our scale. I don't think it would work as well at a 500-person company.",
        speaker: "Alex Thompson",
        role: "CTO",
        source: "Interview 1"
      }
    ],
    validationStatus: "validated" as const
  },
  {
    id: 3,
    icpAttribute: "Pain Points",
    icpTheme: "WHAT",
    v1Assumption: "Main challenges are slow development cycles and poor code quality",
    whyAssumption: "Common problems in growing engineering teams",
    evidenceFromDeck: "Slide 5 highlights development bottlenecks and quality issues",
    realityFromInterviews: "Pain points are more about coordination and communication than pure technical issues",
    comparisonOutcome: "Refined" as const,
    waysToAdjustMessaging: "Emphasize team coordination and communication benefits over just technical features",
    confidenceScore: 78,
    confidenceExplanation: "Consistent feedback across 6 interviews about coordination challenges",
    quotes: [
      {
        id: "q4",
        text: "The biggest issue isn't the code itself, it's making sure everyone is aligned on what we're building.",
        speaker: "Maria Garcia",
        role: "Engineering Manager",
        source: "Interview 4"
      }
    ],
    validationStatus: "validated" as const
  }
]; 