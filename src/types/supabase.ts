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