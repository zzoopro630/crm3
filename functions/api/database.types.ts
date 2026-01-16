// Supabase Database Types
// Generated from Drizzle schema for type-safe Supabase client

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      customers: {
        Row: {
          id: number;
          manager_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          address_detail: string | null;
          gender: "남성" | "여성" | "법인" | null;
          birthdate: string | null;
          company: string | null;
          job_title: string | null;
          source: string | null;
          status:
            | "new"
            | "contacted"
            | "consulting"
            | "closed"
            | "called"
            | "texted"
            | "no_answer"
            | "rejected"
            | "wrong_number"
            | "ineligible"
            | "upsell";
          type: "personal" | "db";
          interest_product: string | null;
          memo: string | null;
          admin_comment: string | null;
          nationality: string | null;
          existing_insurance: string | null;
          insurance_type: string | null;
          annual_income: string | null;
          marital_status: string | null;
          notes: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: never;
          manager_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          address_detail?: string | null;
          gender?: "남성" | "여성" | "법인" | null;
          birthdate?: string | null;
          company?: string | null;
          job_title?: string | null;
          source?: string | null;
          status?:
            | "new"
            | "contacted"
            | "consulting"
            | "closed"
            | "called"
            | "texted"
            | "no_answer"
            | "rejected"
            | "wrong_number"
            | "ineligible"
            | "upsell";
          type?: "personal" | "db";
          interest_product?: string | null;
          memo?: string | null;
          admin_comment?: string | null;
          nationality?: string | null;
          existing_insurance?: string | null;
          insurance_type?: string | null;
          annual_income?: string | null;
          marital_status?: string | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: never;
          manager_id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          address_detail?: string | null;
          gender?: "남성" | "여성" | "법인" | null;
          birthdate?: string | null;
          company?: string | null;
          job_title?: string | null;
          source?: string | null;
          status?:
            | "new"
            | "contacted"
            | "consulting"
            | "closed"
            | "called"
            | "texted"
            | "no_answer"
            | "rejected"
            | "wrong_number"
            | "ineligible"
            | "upsell";
          type?: "personal" | "db";
          interest_product?: string | null;
          memo?: string | null;
          admin_comment?: string | null;
          nationality?: string | null;
          existing_insurance?: string | null;
          insurance_type?: string | null;
          annual_income?: string | null;
          marital_status?: string | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      employees: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          security_level: "F1" | "F2" | "F3" | "F4" | "F5";
          parent_id: string | null;
          organization_id: number | null;
          position_name: string | null;
          department: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          security_level?: "F1" | "F2" | "F3" | "F4" | "F5";
          parent_id?: string | null;
          organization_id?: number | null;
          position_name?: string | null;
          department?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          security_level?: "F1" | "F2" | "F3" | "F4" | "F5";
          parent_id?: string | null;
          organization_id?: number | null;
          position_name?: string | null;
          department?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: number;
          name: string;
          parent_id: number | null;
          manager_id: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: never;
          name: string;
          parent_id?: number | null;
          manager_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: never;
          name?: string;
          parent_id?: number | null;
          manager_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      pending_approvals: {
        Row: {
          id: string;
          email: string;
          requested_at: string | null;
          status: "pending" | "approved" | "rejected" | null;
          processed_by: string | null;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          requested_at?: string | null;
          status?: "pending" | "approved" | "rejected" | null;
          processed_by?: string | null;
          processed_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          requested_at?: string | null;
          status?: "pending" | "approved" | "rejected" | null;
          processed_by?: string | null;
          processed_at?: string | null;
        };
        Relationships: [];
      };
      sources: {
        Row: {
          id: number;
          name: string;
          created_at: string | null;
        };
        Insert: {
          id?: never;
          name: string;
          created_at?: string | null;
        };
        Update: {
          id?: never;
          name?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };
      customer_notes: {
        Row: {
          id: number;
          customer_id: number;
          content: string;
          created_by: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: never;
          customer_id: number;
          content: string;
          created_by: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: never;
          customer_id?: number;
          content?: string;
          created_by?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      contracts: {
        Row: {
          id: number;
          customer_id: number;
          insurance_company: string;
          product_name: string;
          premium: number | null;
          payment_period: string | null;
          memo: string | null;
          created_by: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: never;
          customer_id: number;
          insurance_company: string;
          product_name: string;
          premium?: number | null;
          payment_period?: string | null;
          memo?: string | null;
          created_by: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: never;
          customer_id?: number;
          insurance_company?: string;
          product_name?: string;
          premium?: number | null;
          payment_period?: string | null;
          memo?: string | null;
          created_by?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      labels: {
        Row: {
          id: string;
          name: string;
          color: string;
          description: string | null;
          created_by: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          color?: string;
          description?: string | null;
          created_by: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          color?: string;
          description?: string | null;
          created_by?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      customer_labels: {
        Row: {
          id: string;
          customer_id: number;
          label_id: string;
          created_by: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          customer_id: number;
          label_id: string;
          created_by: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          customer_id?: number;
          label_id?: string;
          created_by?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      security_level_enum: "F1" | "F2" | "F3" | "F4" | "F5";
      customer_status_enum:
        | "new"
        | "contacted"
        | "consulting"
        | "closed"
        | "called"
        | "texted"
        | "no_answer"
        | "rejected"
        | "wrong_number"
        | "ineligible"
        | "upsell";
      gender_enum: "남성" | "여성" | "법인";
      approval_status_enum: "pending" | "approved" | "rejected";
      customer_type_enum: "personal" | "db";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Helper types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Insertable<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type Updatable<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
