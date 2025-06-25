import { scoreQuoteRelevanceEnhanced, RELEVANCE_FILTERING_CONFIG, calculateQuoteQuality } from './rag';

// Demo script to test relevance filtering
export async function demoRelevanceFiltering() {
  console.log('🧪 Testing Enhanced Relevance Filtering System');
  console.log('==============================================');
  console.log('🎯 Focus: Stricter quote filtering + Looser relevance thresholds');
  console.log('🎯 Goal: Capture role/title insights (e.g., "paralegals manage Rev")');
  
  // Sample quotes for testing - including role insights
  const sampleQuotes = [
    {
      id: '1',
      text: "We're a mid-sized law firm with about 50 attorneys, and we handle mostly criminal defense cases.",
      speaker: "John Smith",
      role: "Managing Partner",
      source: "interview-1.txt",
      classification: 'RELEVANT' as const,
      companySnapshot: "Mid-sized criminal defense firm",
      rejected: false
    },
    {
      id: '2',
      text: "The biggest challenge we face is the time it takes to manually review discovery documents.",
      speaker: "Sarah Johnson",
      role: "Senior Attorney",
      source: "interview-1.txt",
      classification: 'RELEVANT' as const,
      companySnapshot: "Mid-sized criminal defense firm",
      rejected: false
    },
    {
      id: '3',
      text: "I love the coffee in the break room, it's really good quality.",
      speaker: "Mike Wilson",
      role: "Paralegal",
      source: "interview-1.txt",
      classification: 'RELEVANT' as const,
      companySnapshot: "Mid-sized criminal defense firm",
      rejected: false
    },
    {
      id: '4',
      text: "When we get new cases, we need to process evidence quickly to prepare for trial.",
      speaker: "Lisa Brown",
      role: "Trial Attorney",
      source: "interview-1.txt",
      classification: 'RELEVANT' as const,
      companySnapshot: "Mid-sized criminal defense firm",
      rejected: false
    },
    {
      id: '5',
      text: "Our paralegals manage the Rev product for us - they handle all the transcription uploads and quality checks.",
      speaker: "David Chen",
      role: "Managing Partner",
      source: "interview-2.txt",
      classification: 'RELEVANT' as const,
      companySnapshot: "Mid-sized criminal defense firm",
      rejected: false
    },
    {
      id: '6',
      text: "The attorneys delegate the transcription work to our coordinators, who then assign it to paralegals.",
      speaker: "Maria Garcia",
      role: "Office Manager",
      source: "interview-2.txt",
      classification: 'RELEVANT' as const,
      companySnapshot: "Mid-sized criminal defense firm",
      rejected: false
    },
    {
      id: '7',
      text: "Thank you for your time, this has been very helpful.",
      speaker: "Tom Davis",
      role: "Associate Attorney",
      source: "interview-3.txt",
      classification: 'RELEVANT' as const,
      companySnapshot: "Mid-sized criminal defense firm",
      rejected: false
    },
    {
      id: '8',
      text: "I don't know much about that, maybe you should ask someone else.",
      speaker: "Jane Wilson",
      role: "Legal Assistant",
      source: "interview-3.txt",
      classification: 'RELEVANT' as const,
      companySnapshot: "Mid-sized criminal defense firm",
      rejected: false
    }
  ];
  
  // Test different attribute types
  const attributeTypes = ['buyer-titles', 'company-size', 'pain-points', 'triggers'];
  
  for (const attributeType of attributeTypes) {
    console.log(`\n📊 Testing ${attributeType}:`);
    console.log('-'.repeat(60));
    
    const scoredQuotes = sampleQuotes.map(quote => ({
      ...quote,
      relevanceScore: scoreQuoteRelevanceEnhanced(quote, attributeType),
      qualityScore: calculateQuoteQuality(quote)
    }));
    
    const filteredQuotes = scoredQuotes
      .filter(quote => quote.relevanceScore >= RELEVANCE_FILTERING_CONFIG.MIN_RELEVANCE_SCORE)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    console.log(`Threshold: ${RELEVANCE_FILTERING_CONFIG.MIN_RELEVANCE_SCORE}`);
    console.log(`Original quotes: ${sampleQuotes.length}`);
    console.log(`Filtered quotes: ${filteredQuotes.length}`);
    
    scoredQuotes.forEach((quote, index) => {
      const status = quote.relevanceScore >= RELEVANCE_FILTERING_CONFIG.MIN_RELEVANCE_SCORE ? '✅' : '❌';
      const roleBonus = quote.text.toLowerCase().includes('paralegal') && quote.text.toLowerCase().includes('manag') ? '🎯' : '';
      console.log(`${status}${roleBonus} Quote ${index + 1}: ${quote.relevanceScore.toFixed(2)} (quality: ${quote.qualityScore.toFixed(2)}) - "${quote.text.substring(0, 60)}..."`);
    });
  }
  
  // Special test for role insights
  console.log('\n🎯 Testing Role/Title Insights Detection:');
  console.log('-'.repeat(60));
  
  const roleInsightQuotes = sampleQuotes.filter(quote => 
    quote.text.toLowerCase().includes('paralegal') || 
    quote.text.toLowerCase().includes('delegat') ||
    quote.text.toLowerCase().includes('manag')
  );
  
  roleInsightQuotes.forEach((quote, index) => {
    const relevanceScore = scoreQuoteRelevanceEnhanced(quote, 'buyer-titles');
    const qualityScore = calculateQuoteQuality(quote);
    console.log(`🎯 Role Insight ${index + 1}: ${relevanceScore.toFixed(2)} (quality: ${qualityScore.toFixed(2)}) - "${quote.text}"`);
  });
  
  console.log('\n🎯 Enhanced Relevance Filtering Demo Complete!');
  console.log('Key Improvements:');
  console.log('• Stricter quote filtering removes obvious junk (coffee, thank yous)');
  console.log('• Looser relevance thresholds capture nuanced insights');
  console.log('• Enhanced role detection for organizational structure');
  console.log('• Bonus scoring for role management patterns');
  console.log('• Better quality scoring with filler word penalties');
}

// Run demo if called directly
if (typeof window === 'undefined') {
  demoRelevanceFiltering().catch(console.error);
} 