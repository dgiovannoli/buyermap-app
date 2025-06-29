export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_interviews: {
        Row: {
          id: string
          user_id: string
          filename: string
          upload_date: string
          status: 'processing' | 'completed' | 'failed'
          company_size?: 'solo' | 'small' | 'medium' | 'large' | 'enterprise'
          role?: string
          industry?: string
          region?: string
          tags?: string[]
          notes?: string
          custom_fields?: Json
          quotes_extracted: number
          processing_time: number
          unique_speakers: string[]
          pinecone_namespace?: string
          vectors_stored: number
          // Content tracking fields for duplicate detection
          content_hash?: string
          file_size?: number
          blob_url?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          filename: string
          upload_date: string
          status: 'processing' | 'completed' | 'failed'
          company_size?: 'solo' | 'small' | 'medium' | 'large' | 'enterprise'
          role?: string
          industry?: string
          region?: string
          tags?: string[]
          notes?: string
          custom_fields?: Json
          quotes_extracted: number
          processing_time: number
          unique_speakers: string[]
          pinecone_namespace?: string
          vectors_stored: number
          // Content tracking fields for duplicate detection
          content_hash?: string
          file_size?: number
          blob_url?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          filename?: string
          upload_date?: string
          status?: 'processing' | 'completed' | 'failed'
          company_size?: 'solo' | 'small' | 'medium' | 'large' | 'enterprise'
          role?: string
          industry?: string
          region?: string
          tags?: string[]
          notes?: string
          custom_fields?: Json
          quotes_extracted?: number
          processing_time?: number
          unique_speakers?: string[]
          pinecone_namespace?: string
          vectors_stored?: number
          // Content tracking fields for duplicate detection
          content_hash?: string
          file_size?: number
          blob_url?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_quotes: {
        Row: {
          id: string
          user_id: string
          interview_id: string
          text: string
          speaker?: string
          role?: string
          source: string
          assumption_category?: string
          topic?: string
          specificity_score?: number
          rejected: boolean
          user_notes?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          interview_id: string
          text: string
          speaker?: string
          role?: string
          source: string
          assumption_category?: string
          topic?: string
          specificity_score?: number
          rejected?: boolean
          user_notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          interview_id?: string
          text?: string
          speaker?: string
          role?: string
          source?: string
          assumption_category?: string
          topic?: string
          specificity_score?: number
          rejected?: boolean
          user_notes?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_assumptions: {
        Row: {
          id: string
          user_id: string
          icp_attribute: string
          icp_theme: string
          v1_assumption: string
          why_assumption?: string
          evidence_from_deck?: string
          comparison_outcome?: 'Aligned' | 'New Data Added' | 'Contradicted' | 'pending'
          confidence_score?: number
          confidence_explanation?: string
          validation_status?: 'validated' | 'pending' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          icp_attribute: string
          icp_theme: string
          v1_assumption: string
          why_assumption?: string
          evidence_from_deck?: string
          comparison_outcome?: 'Aligned' | 'New Data Added' | 'Contradicted' | 'pending'
          confidence_score?: number
          confidence_explanation?: string
          validation_status?: 'validated' | 'pending' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          icp_attribute?: string
          icp_theme?: string
          v1_assumption?: string
          why_assumption?: string
          evidence_from_deck?: string
          comparison_outcome?: 'Aligned' | 'New Data Added' | 'Contradicted' | 'pending'
          confidence_score?: number
          confidence_explanation?: string
          validation_status?: 'validated' | 'pending' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      // New table for storing complete BuyerMap sessions
      buyer_map_sessions: {
        Row: {
          id: string
          user_id: string
          session_name: string
          description?: string
          deck_filename?: string
          deck_blob_url?: string
          overall_alignment_score?: number
          validated_count: number
          partially_validated_count: number
          pending_count: number
          total_assumptions: number
          score_breakdown?: Json
          outcome_weights?: Json
          summary_stats?: Json
          current_step: number
          is_complete: boolean
          last_activity: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_name: string
          description?: string
          deck_filename?: string
          deck_blob_url?: string
          overall_alignment_score?: number
          validated_count?: number
          partially_validated_count?: number
          pending_count?: number
          total_assumptions?: number
          score_breakdown?: Json
          outcome_weights?: Json
          summary_stats?: Json
          current_step?: number
          is_complete?: boolean
          last_activity?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_name?: string
          description?: string
          deck_filename?: string
          deck_blob_url?: string
          overall_alignment_score?: number
          validated_count?: number
          partially_validated_count?: number
          pending_count?: number
          total_assumptions?: number
          score_breakdown?: Json
          outcome_weights?: Json
          summary_stats?: Json
          current_step?: number
          is_complete?: boolean
          last_activity?: string
          created_at?: string
          updated_at?: string
        }
      }
      // New table for storing detailed assumption data with validation
      buyer_map_assumptions: {
        Row: {
          id: string
          session_id: string
          user_id: string
          icp_attribute: string
          icp_theme: string
          v1_assumption: string
          why_assumption?: string
          evidence_from_deck?: string
          reality_from_interviews?: string
          reality?: string
          comparison_outcome: 'Validated' | 'Contradicted' | 'Gap Identified' | 'Insufficient Data' | 'Aligned' | 'Misaligned' | 'New Data Added' | 'Refined'
          ways_to_adjust_messaging?: string
          confidence_score: number
          confidence_explanation: string
          confidence_breakdown?: Json
          validation_status: 'pending' | 'partial' | 'validated' | 'contradicted'
          display_outcome?: string
          display_reality?: string
          display_confidence?: number
          quotes_count: number
          has_interview_data: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          icp_attribute: string
          icp_theme: string
          v1_assumption: string
          why_assumption?: string
          evidence_from_deck?: string
          reality_from_interviews?: string
          reality?: string
          comparison_outcome?: 'Validated' | 'Contradicted' | 'Gap Identified' | 'Insufficient Data' | 'Aligned' | 'Misaligned' | 'New Data Added' | 'Refined'
          ways_to_adjust_messaging?: string
          confidence_score?: number
          confidence_explanation?: string
          confidence_breakdown?: Json
          validation_status?: 'pending' | 'partial' | 'validated' | 'contradicted'
          display_outcome?: string
          display_reality?: string
          display_confidence?: number
          quotes_count?: number
          has_interview_data?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          icp_attribute?: string
          icp_theme?: string
          v1_assumption?: string
          why_assumption?: string
          evidence_from_deck?: string
          reality_from_interviews?: string
          reality?: string
          comparison_outcome?: 'Validated' | 'Contradicted' | 'Gap Identified' | 'Insufficient Data' | 'Aligned' | 'Misaligned' | 'New Data Added' | 'Refined'
          ways_to_adjust_messaging?: string
          confidence_score?: number
          confidence_explanation?: string
          confidence_breakdown?: Json
          validation_status?: 'pending' | 'partial' | 'validated' | 'contradicted'
          display_outcome?: string
          display_reality?: string
          display_confidence?: number
          quotes_count?: number
          has_interview_data?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      // New table for storing quotes associated with assumptions
      buyer_map_quotes: {
        Row: {
          id: string
          assumption_id: string
          session_id: string
          user_id: string
          text: string
          speaker?: string
          role?: string
          source: string
          classification: 'RELEVANT' | 'IRRELEVANT' | 'ALIGNED' | 'MISALIGNED' | 'NEW_INSIGHT' | 'NEUTRAL'
          company_snapshot?: string
          rejected: boolean
          relevance_score?: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          assumption_id: string
          session_id: string
          user_id: string
          text: string
          speaker?: string
          role?: string
          source: string
          classification?: 'RELEVANT' | 'IRRELEVANT' | 'ALIGNED' | 'MISALIGNED' | 'NEW_INSIGHT' | 'NEUTRAL'
          company_snapshot?: string
          rejected?: boolean
          relevance_score?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          assumption_id?: string
          session_id?: string
          user_id?: string
          text?: string
          speaker?: string
          role?: string
          source?: string
          classification?: 'RELEVANT' | 'IRRELEVANT' | 'ALIGNED' | 'MISALIGNED' | 'NEW_INSIGHT' | 'NEUTRAL'
          company_snapshot?: string
          rejected?: boolean
          relevance_score?: number
          created_at?: string
          updated_at?: string
        }
      }
      // New table for storing session files (deck and interviews)
      buyer_map_files: {
        Row: {
          id: string
          session_id: string
          user_id: string
          filename: string
          file_type: 'deck' | 'interview'
          blob_url: string
          file_size: number
          content_hash?: string
          upload_date: string
          processing_status: 'pending' | 'processing' | 'completed' | 'failed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          filename: string
          file_type: 'deck' | 'interview'
          blob_url: string
          file_size: number
          content_hash?: string
          upload_date?: string
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          filename?: string
          file_type?: 'deck' | 'interview'
          blob_url?: string
          file_size?: number
          content_hash?: string
          upload_date?: string
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 