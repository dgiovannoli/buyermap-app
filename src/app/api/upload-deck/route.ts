import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    console.log('=== DECK UPLOAD TO BLOB ===');
    
    const formData = await request.formData();
    const file = formData.get('deck') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    console.log('Uploading file to Vercel Blob:', file.name, 'Size:', file.size, 'bytes');
    
    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
      // Add timestamp to avoid conflicts
      addRandomSuffix: true,
    });
    
    console.log('File uploaded successfully:', blob.url);
    
    return NextResponse.json({
      url: blob.url,
      filename: file.name,
      size: file.size
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 