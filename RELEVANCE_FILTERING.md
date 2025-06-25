# Relevance Filtering System

## Overview

The relevance filtering system automatically scores and filters quotes based on their relevance to specific BuyerMap attributes, ensuring that only the most relevant evidence is used for validation.

## Recent Updates (Latest)

### Stricter Quote Filtering
- **Enhanced quality scoring** to remove more obvious junk and generic statements
- **Increased penalties** for buzzwords, filler words, and vague responses
- **Bonus scoring** for role/title insights (e.g., "paralegals manage Rev")
- **Better detection** of organizational structure and delegation patterns

### Looser Relevance Thresholds
- **Reduced minimum scores** to capture more nuanced insights
- **Special focus** on buyer-titles attribute (0.5 threshold)
- **Enhanced role detection** for paralegals, coordinators, and management patterns

## How It Works

### 1. Quote Scoring
Each quote is scored on a 0-1 scale based on:
- Content relevance to the specific attribute
- Specificity and detail level
- Presence of relevant keywords
- Quote length and quality
- **NEW**: Role/title insights and organizational patterns

### 2. Attribute-Specific Scoring
Different attributes have different relevance criteria:
- **buyer-titles**: Job titles, roles, decision-making, **role management insights**
- company-size: Company size indicators
- pain-points: Challenges and problems
- desired-outcomes: Goals and improvements
- triggers: Timing and urgency
- barriers: Objections and concerns
- messaging-emphasis: Priorities and value props

### 3. Enhanced Role Detection
The system now specifically looks for:
- Paralegal management responsibilities
- Attorney delegation patterns
- Coordinator oversight roles
- Organizational structure mentions
- Delegation and assignment language

### 4. Filtering Process
1. Score all quotes for relevance
2. Filter out quotes below threshold
3. Sort by relevance score
4. Use top quotes for synthesis

## Configuration

```typescript
export const RELEVANCE_FILTERING_CONFIG = {
  MIN_RELEVANCE_SCORE: 0.8, // Loosened to capture more insights
  MAX_QUOTES_PER_ASSUMPTION: 5,
  SHOW_RELEVANCE_SCORES: true,
  SORT_BY_RELEVANCE: true,
  ATTRIBUTE_THRESHOLDS: {
    'buyer-titles': 0.5, // Very loose to capture role insights
    'company-size': 1.0,
    'pain-points': 1.5,
    'desired-outcomes': 1.5,
    'triggers': 1.0,
    'barriers': 1.0,
    'messaging-emphasis': 1.0
  }
};
```

## Benefits

- Removes irrelevant quotes more aggressively
- Captures nuanced role/title insights
- Improves synthesis accuracy
- Better user experience
- Configurable quality thresholds
- **NEW**: Focus on organizational structure insights 