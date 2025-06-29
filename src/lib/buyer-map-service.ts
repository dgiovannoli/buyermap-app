import { supabase } from './supabase-client';
import { BuyerMapData } from '../types/buyermap';

export interface BuyerMapSession {
  id: string;
  session_name: string;
  description?: string;
  deck_filename?: string;
  deck_blob_url?: string;
  overall_alignment_score?: number;
  validated_count: number;
  partially_validated_count: number;
  pending_count: number;
  total_assumptions: number;
  score_breakdown?: any;
  outcome_weights?: any;
  summary_stats?: any;
  current_step: number;
  is_complete: boolean;
  last_activity: string;
  created_at: string;
  updated_at: string;
}

export interface BuyerMapAssumption {
  id: string;
  session_id: string;
  user_id: string;
  icp_attribute: string;
  icp_theme: string;
  v1_assumption: string;
  why_assumption?: string;
  evidence_from_deck?: string;
  reality_from_interviews?: string;
  reality?: string;
  comparison_outcome: string;
  ways_to_adjust_messaging?: string;
  confidence_score: number;
  confidence_explanation: string;
  confidence_breakdown?: any;
  validation_status: string;
  display_outcome?: string;
  display_reality?: string;
  display_confidence?: number;
  quotes_count: number;
  has_interview_data: boolean;
  created_at: string;
  updated_at: string;
  buyer_map_quotes?: any[];
}

class BuyerMapService {
  private currentSessionId: string | null = null;

  // Session Management
  async createSession(sessionName: string, description?: string): Promise<BuyerMapSession> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: session, error } = await supabase
        .from('buyer_map_sessions')
        .insert({
          user_id: user.id,
          session_name: sessionName,
          description,
          current_step: 1,
          is_complete: false,
          validated_count: 0,
          partially_validated_count: 0,
          pending_count: 0,
          total_assumptions: 0
        })
        .select()
        .single();

      if (error) throw error;

      this.currentSessionId = session.id;
      return session;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  async getSessions(): Promise<BuyerMapSession[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: sessions, error } = await supabase
        .from('buyer_map_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return sessions || [];
    } catch (error) {
      console.error('Error fetching sessions:', error);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<BuyerMapSession | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: session, error } = await supabase
        .from('buyer_map_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return session;
    } catch (error) {
      console.error('Error fetching session:', error);
      throw error;
    }
  }

  async updateSession(sessionId: string, updates: Partial<BuyerMapSession>): Promise<BuyerMapSession> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: session, error } = await supabase
        .from('buyer_map_sessions')
        .update({
          ...updates,
          last_activity: new Date().toISOString()
        })
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return session;
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('buyer_map_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }

  // Assumption Management
  async saveAssumptions(sessionId: string, assumptions: BuyerMapData[]): Promise<BuyerMapAssumption[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Transform BuyerMapData to database format
      const assumptionsData = assumptions.map(assumption => ({
        session_id: sessionId,
        user_id: user.id,
        icp_attribute: assumption.icpAttribute || '',
        icp_theme: assumption.icpTheme || '',
        v1_assumption: assumption.v1Assumption || '',
        why_assumption: assumption.whyAssumption,
        evidence_from_deck: assumption.evidenceFromDeck,
        reality_from_interviews: assumption.realityFromInterviews,
        reality: assumption.reality,
        comparison_outcome: assumption.comparisonOutcome || 'pending',
        ways_to_adjust_messaging: assumption.waysToAdjustMessaging,
        confidence_score: assumption.confidenceScore || 0,
        confidence_explanation: assumption.confidenceExplanation || '',
        confidence_breakdown: assumption.confidenceBreakdown,
        validation_status: assumption.validationStatus || 'pending',
        display_outcome: assumption.displayOutcome,
        display_reality: assumption.displayReality,
        display_confidence: assumption.displayConfidence,
        quotes_count: assumption.quotes?.length || 0,
        has_interview_data: !!(assumption.quotes && assumption.quotes.length > 0)
      }));

      const { data: insertedAssumptions, error } = await supabase
        .from('buyer_map_assumptions')
        .insert(assumptionsData)
        .select();

      if (error) throw error;

      // Update session with assumption count
      await this.updateSession(sessionId, {
        total_assumptions: assumptions.length
      });

      return insertedAssumptions || [];
    } catch (error) {
      console.error('Error saving assumptions:', error);
      throw error;
    }
  }

  async getAssumptions(sessionId: string): Promise<BuyerMapAssumption[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: assumptions, error } = await supabase
        .from('buyer_map_assumptions')
        .select(`
          *,
          buyer_map_quotes(*)
        `)
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return assumptions || [];
    } catch (error) {
      console.error('Error fetching assumptions:', error);
      throw error;
    }
  }

  async updateAssumptions(sessionId: string, assumptions: BuyerMapData[]): Promise<BuyerMapAssumption[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const updatedAssumptions = [];
      for (const assumption of assumptions) {
        if (!assumption.id) continue;

        const { data: updatedAssumption, error } = await supabase
          .from('buyer_map_assumptions')
          .update({
            icp_attribute: assumption.icpAttribute,
            icp_theme: assumption.icpTheme,
            v1_assumption: assumption.v1Assumption,
            why_assumption: assumption.whyAssumption,
            evidence_from_deck: assumption.evidenceFromDeck,
            reality_from_interviews: assumption.realityFromInterviews,
            reality: assumption.reality,
            comparison_outcome: assumption.comparisonOutcome,
            ways_to_adjust_messaging: assumption.waysToAdjustMessaging,
            confidence_score: assumption.confidenceScore,
            confidence_explanation: assumption.confidenceExplanation,
            confidence_breakdown: assumption.confidenceBreakdown,
            validation_status: assumption.validationStatus,
            display_outcome: assumption.displayOutcome,
            display_reality: assumption.displayReality,
            display_confidence: assumption.displayConfidence,
            quotes_count: assumption.quotes?.length || 0,
            has_interview_data: !!(assumption.quotes && assumption.quotes.length > 0)
          })
          .eq('id', assumption.id)
          .eq('user_id', user.id)
          .eq('session_id', sessionId)
          .select()
          .single();

        if (error) {
          console.error('Error updating assumption:', error);
          continue;
        }

        updatedAssumptions.push(updatedAssumption);
      }

      // Update session last activity
      await this.updateSession(sessionId, {});

      return updatedAssumptions;
    } catch (error) {
      console.error('Error updating assumptions:', error);
      throw error;
    }
  }

  // Hybrid localStorage + Supabase persistence
  async saveToSupabase(sessionId: string, data: {
    buyerMapData: BuyerMapData[];
    score: number;
    scoreBreakdown?: any;
    outcomeWeights?: any;
    summary?: any;
    currentStep: number;
  }): Promise<void> {
    try {
      // Save assumptions
      await this.saveAssumptions(sessionId, data.buyerMapData);

      // Update session with metadata
      await this.updateSession(sessionId, {
        overall_alignment_score: data.score,
        score_breakdown: data.scoreBreakdown,
        outcome_weights: data.outcomeWeights,
        summary_stats: data.summary,
        current_step: data.currentStep,
        is_complete: data.currentStep >= 3
      });

      console.log('✅ Data saved to Supabase successfully');
    } catch (error) {
      console.error('❌ Error saving to Supabase:', error);
      throw error;
    }
  }

  async loadFromSupabase(sessionId: string): Promise<{
    buyerMapData: BuyerMapData[];
    score: number;
    scoreBreakdown?: any;
    outcomeWeights?: any;
    summary?: any;
    currentStep: number;
  } | null> {
    try {
      // Get session
      const session = await this.getSession(sessionId);
      if (!session) return null;

      // Get assumptions
      const assumptions = await this.getAssumptions(sessionId);

      // Transform back to BuyerMapData format
      const buyerMapData: BuyerMapData[] = assumptions.map(assumption => ({
        id: parseInt(assumption.id) || 0,
        icpAttribute: assumption.icp_attribute,
        icpTheme: assumption.icp_theme,
        v1Assumption: assumption.v1_assumption,
        whyAssumption: assumption.why_assumption || '',
        evidenceFromDeck: assumption.evidence_from_deck || '',
        realityFromInterviews: assumption.reality_from_interviews,
        reality: assumption.reality || '',
        comparisonOutcome: assumption.comparison_outcome as any,
        waysToAdjustMessaging: assumption.ways_to_adjust_messaging || '',
        confidenceScore: assumption.confidence_score,
        confidenceExplanation: assumption.confidence_explanation,
        confidenceBreakdown: assumption.confidence_breakdown,
        validationStatus: assumption.validation_status as any,
        displayOutcome: assumption.display_outcome,
        displayReality: assumption.display_reality,
        displayConfidence: assumption.display_confidence,
        quotes: assumption.buyer_map_quotes?.map(quote => ({
          id: quote.id,
          text: quote.text,
          speaker: quote.speaker,
          role: quote.role,
          source: quote.source,
          classification: quote.classification as any,
          companySnapshot: quote.company_snapshot,
          rejected: quote.rejected,
          relevanceScore: quote.relevance_score
        })) || []
      }));

      return {
        buyerMapData,
        score: session.overall_alignment_score || 0,
        scoreBreakdown: session.score_breakdown,
        outcomeWeights: session.outcome_weights,
        summary: session.summary_stats,
        currentStep: session.current_step
      };
    } catch (error) {
      console.error('❌ Error loading from Supabase:', error);
      throw error;
    }
  }

  // Utility methods
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  setCurrentSessionId(sessionId: string | null): void {
    this.currentSessionId = sessionId;
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return !!user;
    } catch (error) {
      return false;
    }
  }
}

export const buyerMapService = new BuyerMapService(); 