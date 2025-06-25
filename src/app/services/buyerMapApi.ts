import { BuyerMapData } from '../../types/buyermap';

export const buyerMapApi = {
  validateInterviews: async (
    files: File[], 
    assumptions: BuyerMapData[]
  ): Promise<{ assumptions: BuyerMapData[] }> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('assumptions', JSON.stringify(assumptions));
    
    const res = await fetch('/api/validate-interviews', {
      method: 'POST',
      body: formData,
    });
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error ${res.status}: ${text}`);
    }
    
    const data = await res.json();
    if (!data || !data.assumptions) {
      throw new Error('No assumptions returned from validation API');
    }
    
    return data;
  },

  uploadDeck: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch('/api/analyze-deck', {
      method: 'POST',
      body: formData,
    });
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error ${res.status}: ${text}`);
    }
    
    return await res.json();
  }
}; 