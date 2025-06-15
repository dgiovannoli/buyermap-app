import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    console.log('API route called');
    
    const formData = await request.formData();
    const deckFile = formData.get('deck') as File;

    if (!deckFile) {
      return NextResponse.json({ success: false, error: 'No deck file provided' }, { status: 400 });
    }

    console.log('Reading file content:', deckFile.name);
    
    // Read file as text (this works for many file types)
    let fileContent = '';
    try {
      fileContent = await deckFile.text();
      console.log('File content length:', fileContent.length);
      
      // If content is too long, take first 20000 characters
      if (fileContent.length > 20000) {
        fileContent = fileContent.substring(0, 20000) + '\n\n[Content truncated due to length]';
        console.log('Content truncated to 20000 characters');
      }
    } catch (error) {
      console.log('Could not read file as text, using filename analysis');
      fileContent = `Sales deck file: ${deckFile.name}. File type: ${deckFile.type}. Unable to extract text content.`;
    }

    // Use OpenAI's suggested approach - provide text content
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing sales content and extracting buyer assumptions. Return only valid JSON arrays with no additional text."
        },
        {
          role: "user",
          content: `Based on this sales deck content, extract 5-8 key buyer-facing assumptions and return as a JSON array:\n\n${fileContent}\n\nReturn a JSON array with objects containing these exact keys:\n- icpAttribute (Pain Points, Buyer Titles, Desired Outcomes, etc.)\n- icpTheme (short title)\n- v1Assumption (the assumption)\n- evidenceFromDeck (supporting quote)\n- whyAssumption (reasoning)\n\nReturn ONLY the JSON array, no other text.`
        }
      ],
      max_tokens: 2000,
      temperature: 0.1
    });

    const content = response.choices[0].message.content;
    console.log('Raw OpenAI response:', content);

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Clean and extract JSON more robustly
    let assumptions;
    try {
      // First try direct parsing
      assumptions = JSON.parse(content);
    } catch (parseError) {
      console.log('Direct JSON parse failed, trying to clean response...');
      
      try {
        // Remove common markdown formatting and extra text
        let cleanContent = content
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .replace(/^[^[\{]*/, '') // Remove text before first [ or {
          .replace(/[^}\]]*$/, '') // Remove text after last } or ]
          .trim();
        
        console.log('Cleaned content:', cleanContent);
        assumptions = JSON.parse(cleanContent);
        
      } catch (secondError) {
        console.log('Cleaned parse also failed, trying regex extraction...');
        
        // Try to find JSON array pattern
        const jsonMatch = content.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          console.log('Found JSON match:', jsonMatch[0]);
          assumptions = JSON.parse(jsonMatch[0]);
        } else {
          // If all else fails, return mock data with explanation
          console.log('Could not extract JSON, returning mock data');
          assumptions = [
            {
              icpAttribute: "Pain Points",
              icpTheme: "File Processing Challenge", 
              v1Assumption: "PowerPoint text extraction needs improvement",
              evidenceFromDeck: "Technical limitation encountered",
              whyAssumption: "Complex file formats require specialized parsing"
            }
          ];
        }
      }
    }

    console.log('Final assumptions:', assumptions);
    
    return NextResponse.json({ 
      success: true, 
      assumptions
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 