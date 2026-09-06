export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          city: string | null
          postal_code: string | null
          contact_person: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          postal_code?: string | null
          contact_person?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          postal_code?: string | null
          contact_person?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivables_customer_id_fkey"
            columns: ["id"]
            isOneToOne: false
            referencedRelation: "receivables"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      suppliers: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          city: string | null
          postal_code: string | null
          contact_person: string | null
          payment_terms: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          postal_code?: string | null
          contact_person?: string | null
          payment_terms?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          postal_code?: string | null
          contact_person?: string | null
          payment_terms?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      daily_reconciliations: {
        Row: {
          actual_cash: number | null
          created_at: string
          date: string
          expected_balance: number
          id: string
          opening_balance: number
          status: string | null
          total_cash_in: number
          total_cash_out: number
          updated_at: string
          variance: number | null
        }
        Insert: {
          actual_cash?: number | null
          created_at?: string
          date?: string
          expected_balance?: number
          id?: string
          opening_balance?: number
          status?: string | null
          total_cash_in?: number
          total_cash_out?: number
          updated_at?: string
          variance?: number | null
        }
        Update: {
          actual_cash?: number | null
          created_at?: string
          date?: string
          expected_balance?: number
          id?: string
          opening_balance?: number
          status?: string | null
          total_cash_in?: number
          total_cash_out?: number
          updated_at?: string
          variance?: number | null
        }
        Relationships: []
      }
      denomination_counts: {
        Row: {
          count: number
          denomination: number
          id: string
          reconciliation_id: string | null
          subtotal: number
        }
        Insert: {
          count?: number
          denomination: number
          id?: string
          reconciliation_id?: string | null
          subtotal?: number
        }
        Update: {
          count?: number
          denomination?: number
          id?: string
          reconciliation_id?: string | null
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "denomination_counts_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "daily_reconciliations"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          reconciliation_id: string | null
          type: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description?: string | null
          id?: string
          reconciliation_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          reconciliation_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "daily_reconciliations"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables: {
        Row: {
          id: string
          customer_id: string | null
          customer_name: string
          description: string | null
          amount: number
          date_issued: string
          due_date: string | null
          status: string
          amount_paid: number
          balance: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id?: string | null
          customer_name: string
          description?: string | null
          amount: number
          date_issued?: string
          due_date?: string | null
          status?: string
          amount_paid?: number
          balance: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string | null
          customer_name?: string
          description?: string | null
          amount?: number
          date_issued?: string
          due_date?: string | null
          status?: string
          amount_paid?: number
          balance?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivables_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      receivable_payments: {
        Row: {
          id: string
          receivable_id: string
          amount: number
          payment_date: string
          payment_method: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          receivable_id: string
          amount: number
          payment_date?: string
          payment_method?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          receivable_id?: string
          amount?: number
          payment_date?: string
          payment_method?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivable_payments_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "receivables"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_deposits: {
        Row: {
          id: string
          deposit_date: string
          bank_name: string
          account_number: string | null
          total_amount: number
          deposit_slip_number: string | null
          notes: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          deposit_date?: string
          bank_name: string
          account_number?: string | null
          total_amount: number
          deposit_slip_number?: string | null
          notes?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          deposit_date?: string
          bank_name?: string
          account_number?: string | null
          total_amount?: number
          deposit_slip_number?: string | null
          notes?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bank_deposit_items: {
        Row: {
          id: string
          bank_deposit_id: string
          source: string
          reference_date: string | null
          amount: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          bank_deposit_id: string
          source: string
          reference_date?: string | null
          amount: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          bank_deposit_id?: string
          source?: string
          reference_date?: string | null
          amount?: number
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_deposit_items_bank_deposit_id_fkey"
            columns: ["bank_deposit_id"]
            isOneToOne: false
            referencedRelation: "bank_deposits"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          id: string
          date: string
          voucher_no: string
          supplier_id: string | null
          supplier_name: string
          or_no: string | null
          total_amount: number
          partial_payment_notes: string | null
          payment_status: "unpaid" | "partial" | "paid"
          status: "pending" | "approved" | "cancelled"
          delivered_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          date?: string
          voucher_no: string
          supplier_id?: string | null
          supplier_name: string
          or_no?: string | null
          total_amount: number
          partial_payment_notes?: string | null
          payment_status?: "unpaid" | "partial" | "paid"
          status?: "pending" | "approved" | "cancelled"
          delivered_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          date?: string
          voucher_no?: string
          supplier_id?: string | null
          supplier_name?: string
          or_no?: string | null
          total_amount?: number
          partial_payment_notes?: string | null
          payment_status?: "unpaid" | "partial" | "paid"
          status?: "pending" | "approved" | "cancelled"
          delivered_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          sku: string
          name: string | null
          category: string | null
          desc: string | null
          price: number | null
          qty: number | null
          image: string | null
        }
        Insert: {
          sku: string
          name?: string | null
          category?: string | null
          desc?: string | null
          price?: number | null
          qty?: number | null
          image?: string | null
        }
        Update: {
          sku?: string
          name?: string | null
          category?: string | null
          desc?: string | null
          price?: number | null
          qty?: number | null
          image?: string | null
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          id: string
          purchase_order_id: string
          product_sku: string | null
          name: string
          unit: string | null
          po_in_pcs: number
          unit_cost: number
          line_total: number
          inventory_note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          purchase_order_id: string
          product_sku?: string | null
          name: string
          unit?: string | null
          po_in_pcs?: number
          unit_cost?: number
          line_total?: number
          inventory_note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          purchase_order_id?: string
          product_sku?: string | null
          name?: string
          unit?: string | null
          po_in_pcs?: number
          unit_cost?: number
          line_total?: number
          inventory_note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_sku_fkey"
            columns: ["product_sku"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["sku"]
          },
        ]
      }
      employees: {
        Row: {
          id: string
          name: string
          role: string | null
          hourly_rate: number | null
          pin: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          role?: string | null
          hourly_rate?: number | null
          pin?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          role?: string | null
          hourly_rate?: number | null
          pin?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          id: string
          employee_id: string
          clock_in: string
          clock_out: string | null
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          clock_in?: string
          clock_out?: string | null
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          clock_in?: string
          clock_out?: string | null
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
