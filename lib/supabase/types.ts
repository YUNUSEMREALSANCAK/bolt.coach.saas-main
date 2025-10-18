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
          user_type: 'coach' | 'client'
          full_name: string
          email: string
          avatar_url: string | null
          coach_details: Json | null
          client_details: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_type: 'coach' | 'client'
          full_name: string
          email: string
          avatar_url?: string | null
          coach_details?: Json | null
          client_details?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_type?: 'coach' | 'client'
          full_name?: string
          email?: string
          avatar_url?: string | null
          coach_details?: Json | null
          client_details?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      client_coach_relations: {
        Row: {
          id: number
          coach_id: string
          client_id: string
          status: 'pending' | 'active' | 'inactive'
          created_at: string
        }
        Insert: {
          id?: number
          coach_id: string
          client_id: string
          status?: 'pending' | 'active' | 'inactive'
          created_at?: string
        }
        Update: {
          id?: number
          coach_id?: string
          client_id?: string
          status?: 'pending' | 'active' | 'inactive'
          created_at?: string
        }
      }
      training_programs: {
        Row: {
          id: number
          coach_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          coach_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          coach_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      training_days: {
        Row: {
          id: number
          program_id: number
          day_name: string
          order_index: number
          created_at: string
        }
        Insert: {
          id?: number
          program_id: number
          day_name: string
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: number
          program_id?: number
          day_name?: string
          order_index?: number
          created_at?: string
        }
      }
      exercises: {
        Row: {
          id: number
          training_day_id: number
          name: string
          sets: number
          reps: string
          notes: string | null
          order_index: number
          created_at: string
        }
        Insert: {
          id?: number
          training_day_id: number
          name: string
          sets?: number
          reps?: string
          notes?: string | null
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: number
          training_day_id?: number
          name?: string
          sets?: number
          reps?: string
          notes?: string | null
          order_index?: number
          created_at?: string
        }
      }
      diet_plans: {
        Row: {
          id: number
          coach_id: string
          name: string
          target_calories: number | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          coach_id: string
          name: string
          target_calories?: number | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          coach_id?: string
          name?: string
          target_calories?: number | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      meals: {
        Row: {
          id: number
          plan_id: number
          meal_name: string
          description: string | null
          calories: number | null
          order_index: number
          created_at: string
        }
        Insert: {
          id?: number
          plan_id: number
          meal_name: string
          description?: string | null
          calories?: number | null
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: number
          plan_id?: number
          meal_name?: string
          description?: string | null
          calories?: number | null
          order_index?: number
          created_at?: string
        }
      }
      client_assignments: {
        Row: {
          id: number
          client_id: string
          training_program_id: number | null
          diet_plan_id: number | null
          assigned_at: string
          assigned_by: string
        }
        Insert: {
          id?: number
          client_id: string
          training_program_id?: number | null
          diet_plan_id?: number | null
          assigned_at?: string
          assigned_by: string
        }
        Update: {
          id?: number
          client_id?: string
          training_program_id?: number | null
          diet_plan_id?: number | null
          assigned_at?: string
          assigned_by?: string
        }
      }
      progress_logs: {
        Row: {
          id: number
          client_id: string
          log_type: 'training' | 'diet_meal'
          related_id: number
          completed_at: string
          is_cheat_meal: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: number
          client_id: string
          log_type: 'training' | 'diet_meal'
          related_id: number
          completed_at?: string
          is_cheat_meal?: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          client_id?: string
          log_type?: 'training' | 'diet_meal'
          related_id?: number
          completed_at?: string
          is_cheat_meal?: boolean
          notes?: string | null
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: number
          sender_id: string
          receiver_id: string
          content: string | null
          attachment_url: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: number
          sender_id: string
          receiver_id: string
          content?: string | null
          attachment_url?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          sender_id?: string
          receiver_id?: string
          content?: string | null
          attachment_url?: string | null
          read_at?: string | null
          created_at?: string
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
