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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string
          currency: Database["public"]["Enums"]["currency_type"]
          id: string
          initial_balance: number
          is_active: boolean
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          id?: string
          initial_balance?: number
          is_active?: boolean
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          id?: string
          initial_balance?: number
          is_active?: boolean
          name?: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      annual_goal_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          goal_id: string
          id: string
          sort_order: number
          status: Database["public"]["Enums"]["milestone_status"]
          target_date: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          goal_id: string
          id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["milestone_status"]
          target_date?: string | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          goal_id?: string
          id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["milestone_status"]
          target_date?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "annual_goal_milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "annual_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_goal_milestones_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      annual_goals: {
        Row: {
          carry_over_from_goal_id: string | null
          category: Database["public"]["Enums"]["annual_goal_category"]
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          financial_goal_id: string | null
          id: string
          is_focus: boolean
          notes: string | null
          priority: Database["public"]["Enums"]["annual_goal_priority"]
          progress: number
          progress_mode: Database["public"]["Enums"]["annual_goal_progress_mode"]
          progress_updated_at: string | null
          purchase_item_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["annual_goal_status"]
          target_date: string | null
          title: string
          updated_at: string
          workspace_id: string
          year: number
        }
        Insert: {
          carry_over_from_goal_id?: string | null
          category?: Database["public"]["Enums"]["annual_goal_category"]
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          financial_goal_id?: string | null
          id?: string
          is_focus?: boolean
          notes?: string | null
          priority?: Database["public"]["Enums"]["annual_goal_priority"]
          progress?: number
          progress_mode?: Database["public"]["Enums"]["annual_goal_progress_mode"]
          progress_updated_at?: string | null
          purchase_item_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["annual_goal_status"]
          target_date?: string | null
          title: string
          updated_at?: string
          workspace_id: string
          year?: number
        }
        Update: {
          carry_over_from_goal_id?: string | null
          category?: Database["public"]["Enums"]["annual_goal_category"]
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          financial_goal_id?: string | null
          id?: string
          is_focus?: boolean
          notes?: string | null
          priority?: Database["public"]["Enums"]["annual_goal_priority"]
          progress?: number
          progress_mode?: Database["public"]["Enums"]["annual_goal_progress_mode"]
          progress_updated_at?: string | null
          purchase_item_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["annual_goal_status"]
          target_date?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "annual_goals_carry_over_from_goal_id_fkey"
            columns: ["carry_over_from_goal_id"]
            isOneToOne: false
            referencedRelation: "annual_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_goals_financial_goal_id_fkey"
            columns: ["financial_goal_id"]
            isOneToOne: false
            referencedRelation: "financial_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_goals_purchase_item_id_fkey"
            columns: ["purchase_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_goals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      budgets: {
        Row: {
          alert_threshold: number
          amount: number
          category_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          end_date: string
          id: string
          is_active: boolean
          name: string
          period_type: string
          start_date: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          alert_threshold?: number
          amount: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          period_type?: string
          start_date: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          alert_threshold?: number
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          period_type?: string
          start_date?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          type: Database["public"]["Enums"]["category_type"]
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          type: Database["public"]["Enums"]["category_type"]
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          type?: Database["public"]["Enums"]["category_type"]
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_payments: {
        Row: {
          account_id: string
          amount: number
          cancelled: boolean
          client_id: string
          created_at: string
          created_by: string | null
          currency: string
          id: string
          idempotency_key: string | null
          notes: string | null
          payment_date: string
          receivable_id: string
          reference: string | null
          transaction_id: string | null
          workspace_id: string
        }
        Insert: {
          account_id: string
          amount: number
          cancelled?: boolean
          client_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          payment_date: string
          receivable_id: string
          reference?: string | null
          transaction_id?: string | null
          workspace_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          cancelled?: boolean
          client_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          payment_date?: string
          receivable_id?: string
          reference?: string | null
          transaction_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_payments_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "receivables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_payments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_services: {
        Row: {
          billing_day: number | null
          billing_frequency: string
          client_id: string
          created_at: string
          currency: string
          end_date: string | null
          id: string
          notes: string | null
          price: number
          service_id: string
          start_date: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          billing_day?: number | null
          billing_frequency?: string
          client_id: string
          created_at?: string
          currency?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          price: number
          service_id: string
          start_date: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          billing_day?: number | null
          billing_frequency?: string
          client_id?: string
          created_at?: string
          currency?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          price?: number
          service_id?: string
          start_date?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_services_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company_name: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_installments: {
        Row: {
          amount: number
          amount_paid: number
          created_at: string
          debt_id: string
          due_date: string
          id: string
          installment_number: number
          notes: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount: number
          amount_paid?: number
          created_at?: string
          debt_id: string
          due_date: string
          id?: string
          installment_number: number
          notes?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          amount_paid?: number
          created_at?: string
          debt_id?: string
          due_date?: string
          id?: string
          installment_number?: number
          notes?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_installments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_installments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_payments: {
        Row: {
          account_id: string
          amount: number
          cancelled: boolean
          created_at: string
          created_by: string | null
          currency: string
          debt_id: string
          id: string
          idempotency_key: string | null
          installment_id: string
          notes: string | null
          payment_date: string
          reference: string | null
          transaction_id: string | null
          workspace_id: string
        }
        Insert: {
          account_id: string
          amount: number
          cancelled?: boolean
          created_at?: string
          created_by?: string | null
          currency?: string
          debt_id: string
          id?: string
          idempotency_key?: string | null
          installment_id: string
          notes?: string | null
          payment_date: string
          reference?: string | null
          transaction_id?: string | null
          workspace_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          cancelled?: boolean
          created_at?: string
          created_by?: string | null
          currency?: string
          debt_id?: string
          id?: string
          idempotency_key?: string | null
          installment_id?: string
          notes?: string | null
          payment_date?: string
          reference?: string | null
          transaction_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_payments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_payments_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "debt_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_payments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      debts: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          down_payment: number
          end_date: string | null
          financed_amount: number
          id: string
          installments: number
          monthly_amount: number
          name: string
          notes: string | null
          original_amount: number
          provider: string | null
          san_direction: string | null
          start_date: string
          status: string
          type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          down_payment?: number
          end_date?: string | null
          financed_amount: number
          id?: string
          installments: number
          monthly_amount: number
          name: string
          notes?: string | null
          original_amount: number
          provider?: string | null
          san_direction?: string | null
          start_date: string
          status?: string
          type: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          down_payment?: number
          end_date?: string | null
          financed_amount?: number
          id?: string
          installments?: number
          monthly_amount?: number
          name?: string
          notes?: string | null
          original_amount?: number
          provider?: string | null
          san_direction?: string | null
          start_date?: string
          status?: string
          type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          role_name: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          role_name?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          role_name?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_goals: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          id: string
          linked_account_id: string | null
          name: string
          priority: string
          status: string
          target_amount: number
          target_date: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          linked_account_id?: string | null
          name: string
          priority?: string
          status?: string
          target_amount: number
          target_date?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          linked_account_id?: string | null
          name?: string
          priority?: string
          status?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_goals_linked_account_id_fkey"
            columns: ["linked_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_goals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_contributions: {
        Row: {
          account_id: string | null
          amount: number
          contribution_date: string
          created_at: string
          created_by: string | null
          goal_id: string
          id: string
          notes: string | null
          workspace_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          contribution_date?: string
          created_at?: string
          created_by?: string | null
          goal_id: string
          id?: string
          notes?: string | null
          workspace_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          contribution_date?: string
          created_at?: string
          created_by?: string | null
          goal_id?: string
          id?: string
          notes?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "financial_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_contributions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_closures: {
        Row: {
          available_cash: number
          balance: number
          billed: number
          closed_at: string
          closed_by: string | null
          collected: number
          committed_amount: number
          expenses: number
          id: string
          income: number
          is_reopened: boolean
          month: number
          payables_pending: number
          planned_purchases: number
          receivables_pending: number
          reopened_at: string | null
          snapshot: Json
          total_debt: number
          workspace_id: string
          year: number
        }
        Insert: {
          available_cash?: number
          balance?: number
          billed?: number
          closed_at?: string
          closed_by?: string | null
          collected?: number
          committed_amount?: number
          expenses?: number
          id?: string
          income?: number
          is_reopened?: boolean
          month: number
          payables_pending?: number
          planned_purchases?: number
          receivables_pending?: number
          reopened_at?: string | null
          snapshot?: Json
          total_debt?: number
          workspace_id: string
          year: number
        }
        Update: {
          available_cash?: number
          balance?: number
          billed?: number
          closed_at?: string
          closed_by?: string | null
          collected?: number
          committed_amount?: number
          expenses?: number
          id?: string
          income?: number
          is_reopened?: boolean
          month?: number
          payables_pending?: number
          planned_purchases?: number
          receivables_pending?: number
          reopened_at?: string | null
          snapshot?: Json
          total_debt?: number
          workspace_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_closures_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_obligations: {
        Row: {
          amount: number
          amount_paid: number
          created_at: string
          currency: string
          description: string
          due_date: string
          employee_id: string
          id: string
          notes: string | null
          payroll_rule_id: string
          period_month: number
          period_year: number
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount: number
          amount_paid?: number
          created_at?: string
          currency?: string
          description: string
          due_date: string
          employee_id: string
          id?: string
          notes?: string | null
          payroll_rule_id: string
          period_month: number
          period_year: number
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          amount_paid?: number
          created_at?: string
          currency?: string
          description?: string
          due_date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          payroll_rule_id?: string
          period_month?: number
          period_year?: number
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_obligations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_obligations_payroll_rule_id_fkey"
            columns: ["payroll_rule_id"]
            isOneToOne: false
            referencedRelation: "payroll_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_obligations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_payments: {
        Row: {
          account_id: string
          amount: number
          cancelled: boolean
          created_at: string
          created_by: string | null
          currency: string
          employee_id: string
          id: string
          idempotency_key: string | null
          notes: string | null
          payment_date: string
          payroll_obligation_id: string
          reference: string | null
          transaction_id: string | null
          workspace_id: string
        }
        Insert: {
          account_id: string
          amount: number
          cancelled?: boolean
          created_at?: string
          created_by?: string | null
          currency?: string
          employee_id: string
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          payment_date: string
          payroll_obligation_id: string
          reference?: string | null
          transaction_id?: string | null
          workspace_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          cancelled?: boolean
          created_at?: string
          created_by?: string | null
          currency?: string
          employee_id?: string
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          payment_date?: string
          payroll_obligation_id?: string
          reference?: string | null
          transaction_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_payments_payroll_obligation_id_fkey"
            columns: ["payroll_obligation_id"]
            isOneToOne: false
            referencedRelation: "payroll_obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_payments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_rules: {
        Row: {
          amount: number
          created_at: string
          currency: string
          employee_id: string
          end_date: string | null
          frequency: string
          id: string
          notes: string | null
          payment_day: number
          second_payment_day: number | null
          start_date: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          employee_id: string
          end_date?: string | null
          frequency?: string
          id?: string
          notes?: string | null
          payment_day: number
          second_payment_day?: number | null
          start_date: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          employee_id?: string
          end_date?: string | null
          frequency?: string
          id?: string
          notes?: string | null
          payment_day?: number
          second_payment_day?: number | null
          start_date?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_rules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_currency: Database["public"]["Enums"]["currency_type"]
          first_name: string
          id: string
          last_name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_currency?: Database["public"]["Enums"]["currency_type"]
          first_name: string
          id: string
          last_name: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_currency?: Database["public"]["Enums"]["currency_type"]
          first_name?: string
          id?: string
          last_name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          due_date: string | null
          estimated_amount: number | null
          id: string
          is_recurring: boolean
          notes: string | null
          planned_month: string | null
          priority: string
          recurrence: string | null
          reminder_date: string | null
          status: string
          title: string
          transaction_id: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          category?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          due_date?: string | null
          estimated_amount?: number | null
          id?: string
          is_recurring?: boolean
          notes?: string | null
          planned_month?: string | null
          priority?: string
          recurrence?: string | null
          reminder_date?: string | null
          status?: string
          title: string
          transaction_id?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          due_date?: string | null
          estimated_amount?: number | null
          id?: string
          is_recurring?: boolean
          notes?: string | null
          planned_month?: string | null
          priority?: string
          recurrence?: string | null
          reminder_date?: string | null
          status?: string
          title?: string
          transaction_id?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables: {
        Row: {
          amount: number
          amount_paid: number
          client_id: string
          client_service_id: string | null
          created_at: string
          currency: string
          description: string
          due_date: string
          id: string
          notes: string | null
          period_month: number | null
          period_year: number | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount: number
          amount_paid?: number
          client_id: string
          client_service_id?: string | null
          created_at?: string
          currency?: string
          description: string
          due_date: string
          id?: string
          notes?: string | null
          period_month?: number | null
          period_year?: number | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          amount_paid?: number
          client_id?: string
          client_service_id?: string | null
          created_at?: string
          currency?: string
          description?: string
          due_date?: string
          id?: string
          notes?: string | null
          period_month?: number | null
          period_year?: number | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivables_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_client_service_id_fkey"
            columns: ["client_service_id"]
            isOneToOne: false
            referencedRelation: "client_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_expense_obligations: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          period_month: number
          period_year: number
          recurring_expense_id: string
          status: string
          transaction_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          period_month: number
          period_year: number
          recurring_expense_id: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          period_month?: number
          period_year?: number
          recurring_expense_id?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expense_obligations_recurring_expense_id_fkey"
            columns: ["recurring_expense_id"]
            isOneToOne: false
            referencedRelation: "recurring_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_expense_obligations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_expense_obligations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_expenses: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          currency: string
          default_account_id: string | null
          end_date: string | null
          frequency: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          payment_day: number
          start_date: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          currency?: string
          default_account_id?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          payment_day: number
          start_date: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          currency?: string
          default_account_id?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          payment_day?: number
          start_date?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_expenses_default_account_id_fkey"
            columns: ["default_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_expenses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          priority: string
          reminder_at: string
          snoozed_until: string | null
          source_id: string | null
          source_type: string
          status: string
          title: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          priority?: string
          reminder_at: string
          snoozed_until?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          title: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          priority?: string
          reminder_at?: string
          snoozed_until?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          base_price: number
          billing_mode: string
          category: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          base_price?: number
          billing_mode?: string
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          base_price?: number
          billing_mode?: string
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string
          client_id: string | null
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency_type"]
          description: string
          id: string
          notes: string | null
          reference: string | null
          source_id: string | null
          source_type: Database["public"]["Enums"]["transaction_source_type"]
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_date: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category_id: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          description: string
          id?: string
          notes?: string | null
          reference?: string | null
          source_id?: string | null
          source_type?: Database["public"]["Enums"]["transaction_source_type"]
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_date: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          description?: string
          id?: string
          notes?: string | null
          reference?: string | null
          source_id?: string | null
          source_type?: Database["public"]["Enums"]["transaction_source_type"]
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_date?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          amount: number
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency_type"]
          from_account_id: string
          id: string
          notes: string | null
          reference: string | null
          to_account_id: string
          transfer_date: string
          workspace_id: string
        }
        Insert: {
          amount: number
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          from_account_id: string
          id?: string
          notes?: string | null
          reference?: string | null
          to_account_id: string
          transfer_date?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          from_account_id?: string
          id?: string
          notes?: string | null
          reference?: string | null
          to_account_id?: string
          transfer_date?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_member_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_member_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_member_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          emoji: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          type: Database["public"]["Enums"]["workspace_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          type: Database["public"]["Enums"]["workspace_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          emoji?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          type?: Database["public"]["Enums"]["workspace_type"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_client_payment: {
        Args: { p_payment_id: string; p_workspace_id: string }
        Returns: Json
      }
      cancel_debt_payment: {
        Args: { p_payment_id: string; p_workspace_id: string }
        Returns: Json
      }
      cancel_payroll_payment: {
        Args: { p_payment_id: string; p_workspace_id: string }
        Returns: Json
      }
      cancel_transfer: {
        Args: { p_transfer_id: string; p_workspace_id: string }
        Returns: Json
      }
      close_financial_month: {
        Args: { p_month: number; p_workspace_id: string; p_year: number }
        Returns: Json
      }
      complete_annual_goal: {
        Args: { p_goal_id: string }
        Returns: {
          carry_over_from_goal_id: string | null
          category: Database["public"]["Enums"]["annual_goal_category"]
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          financial_goal_id: string | null
          id: string
          is_focus: boolean
          notes: string | null
          priority: Database["public"]["Enums"]["annual_goal_priority"]
          progress: number
          progress_mode: Database["public"]["Enums"]["annual_goal_progress_mode"]
          progress_updated_at: string | null
          purchase_item_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["annual_goal_status"]
          target_date: string | null
          title: string
          updated_at: string
          workspace_id: string
          year: number
        }
        SetofOptions: {
          from: "*"
          to: "annual_goals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_purchase_as_expense: {
        Args: {
          p_account_id: string
          p_amount: number
          p_category_id: string
          p_date?: string
          p_description: string
          p_purchase_id: string
          p_workspace_id: string
        }
        Returns: Json
      }
      create_debt_with_installments: {
        Args: {
          p_currency?: string
          p_description?: string
          p_down_payment: number
          p_financed_amount: number
          p_installments: number
          p_monthly_amount: number
          p_name: string
          p_notes?: string
          p_original_amount: number
          p_provider?: string
          p_san_direction?: string
          p_start_date: string
          p_type: string
          p_workspace_id: string
        }
        Returns: string
      }
      create_workspace_with_owner: {
        Args: {
          p_emoji?: string
          p_name: string
          p_slug: string
          p_type: Database["public"]["Enums"]["workspace_type"]
        }
        Returns: string
      }
      generate_monthly_receivables: {
        Args: { p_month: number; p_workspace_id: string; p_year: number }
        Returns: Json
      }
      generate_payroll_obligations: {
        Args: { p_month: number; p_workspace_id: string; p_year: number }
        Returns: Json
      }
      generate_recurring_obligations: {
        Args: { p_month: number; p_workspace_id: string; p_year: number }
        Returns: Json
      }
      get_account_balances: {
        Args: { p_workspace_id: string }
        Returns: {
          account_id: string
          account_name: string
          account_type: string
          currency: string
          current_balance: number
          initial_balance: number
        }[]
      }
      get_annual_goals_summary: {
        Args: { p_workspace_id: string; p_year: number }
        Returns: Json
      }
      get_budget_status: {
        Args: { p_from?: string; p_to?: string; p_workspace_id: string }
        Returns: {
          alert_threshold: number
          budget_amount: number
          budget_id: string
          budget_name: string
          category_name: string
          period_from: string
          period_to: string
          remaining: number
          spent: number
          spent_pct: number
          status: string
        }[]
      }
      get_business_dashboard: {
        Args: { p_from: string; p_to: string; p_workspace_id: string }
        Returns: Json
      }
      get_calendar_events: {
        Args: {
          p_month: number
          p_user_id?: string
          p_workspace_id: string
          p_year: number
        }
        Returns: {
          amount: number
          day: number
          description: string
          event_type: string
          id: string
          month: number
          status: string
          title: string
          year: number
        }[]
      }
      get_cashflow_series:
        | {
            Args: { p_workspace_id: string; p_year: number }
            Returns: {
              balance: number
              expenses: number
              income: number
              month_name: string
              month_num: number
            }[]
          }
        | {
            Args: {
              p_currency?: Database["public"]["Enums"]["currency_type"]
              p_workspace_id: string
              p_year: number
            }
            Returns: {
              balance: number
              expenses: number
              income: number
              month_name: string
              month_num: number
            }[]
          }
      get_client_profitability: {
        Args: {
          p_client_id: string
          p_from?: string
          p_to?: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_commitment_summary: {
        Args: { p_workspace_id: string }
        Returns: Json
      }
      get_expense_breakdown:
        | {
            Args: { p_from: string; p_to: string; p_workspace_id: string }
            Returns: {
              amount: number
              category_id: string
              category_name: string
              percentage: number
            }[]
          }
        | {
            Args: {
              p_currency?: Database["public"]["Enums"]["currency_type"]
              p_from: string
              p_to: string
              p_workspace_id: string
            }
            Returns: {
              amount: number
              category_id: string
              category_name: string
              percentage: number
            }[]
          }
      get_financial_summary:
        | {
            Args: { p_from: string; p_to: string; p_workspace_id: string }
            Returns: Json
          }
        | {
            Args: {
              p_currency?: Database["public"]["Enums"]["currency_type"]
              p_from: string
              p_to: string
              p_workspace_id: string
            }
            Returns: Json
          }
      get_goal_progress: {
        Args: { p_workspace_id: string }
        Returns: {
          days_remaining: number
          goal_id: string
          goal_name: string
          priority: string
          progress_pct: number
          remaining: number
          saved: number
          status: string
          target_amount: number
          target_date: string
        }[]
      }
      get_month_close_preview: {
        Args: { p_month: number; p_workspace_id: string; p_year: number }
        Returns: Json
      }
      get_pending_items: {
        Args: { p_limit?: number; p_types?: string[]; p_workspace_id: string }
        Returns: {
          amount: number
          amount_paid: number
          description: string
          direction: string
          due_date: string
          entity_id: string
          id: string
          pending_amount: number
          source_type: string
          status: string
          title: string
          workspace_id: string
        }[]
      }
      get_period_comparison: {
        Args: { p_from: string; p_to: string; p_workspace_id: string }
        Returns: Json
      }
      get_projections: {
        Args: { p_months?: number; p_workspace_id: string }
        Returns: {
          balance: number
          expenses: number
          income: number
          is_projected: boolean
          period_label: string
        }[]
      }
      get_workspace_balance: {
        Args: { p_from: string; p_to: string; p_workspace_id: string }
        Returns: {
          balance: number
          total_expenses: number
          total_income: number
        }[]
      }
      get_workspace_currencies: {
        Args: { p_workspace_id: string }
        Returns: {
          currency: string
        }[]
      }
      is_workspace_admin: { Args: { p_workspace_id: string }; Returns: boolean }
      is_workspace_member: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      log_audit: {
        Args: {
          p_action: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
          p_workspace_id: string
        }
        Returns: undefined
      }
      pay_recurring_expense: {
        Args: {
          p_account_id: string
          p_month: number
          p_payment_date?: string
          p_recurring_expense_id: string
          p_reference?: string
          p_workspace_id: string
          p_year: number
        }
        Returns: Json
      }
      register_client_payment:
        | {
            Args: {
              p_account_id: string
              p_amount: number
              p_client_id: string
              p_currency?: string
              p_notes?: string
              p_payment_date?: string
              p_receivable_id: string
              p_reference?: string
              p_workspace_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_account_id: string
              p_amount: number
              p_client_id: string
              p_currency?: string
              p_idempotency_key?: string
              p_notes?: string
              p_payment_date?: string
              p_receivable_id: string
              p_reference?: string
              p_workspace_id: string
            }
            Returns: Json
          }
      register_debt_payment:
        | {
            Args: {
              p_account_id: string
              p_amount: number
              p_currency?: string
              p_debt_id: string
              p_installment_id: string
              p_notes?: string
              p_payment_date?: string
              p_reference?: string
              p_workspace_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_account_id: string
              p_amount: number
              p_currency?: string
              p_debt_id: string
              p_idempotency_key?: string
              p_installment_id: string
              p_notes?: string
              p_payment_date?: string
              p_reference?: string
              p_workspace_id: string
            }
            Returns: Json
          }
      register_payroll_payment:
        | {
            Args: {
              p_account_id: string
              p_amount: number
              p_currency?: string
              p_employee_id: string
              p_notes?: string
              p_obligation_id: string
              p_payment_date?: string
              p_reference?: string
              p_workspace_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_account_id: string
              p_amount: number
              p_currency?: string
              p_employee_id: string
              p_idempotency_key?: string
              p_notes?: string
              p_obligation_id: string
              p_payment_date?: string
              p_reference?: string
              p_workspace_id: string
            }
            Returns: Json
          }
      register_transfer: {
        Args: {
          p_amount: number
          p_currency?: string
          p_from_account_id: string
          p_notes?: string
          p_reference?: string
          p_to_account_id: string
          p_transfer_date?: string
          p_workspace_id: string
        }
        Returns: Json
      }
      toggle_milestone: {
        Args: { p_milestone_id: string }
        Returns: {
          completed_at: string | null
          created_at: string
          description: string | null
          goal_id: string
          id: string
          sort_order: number
          status: Database["public"]["Enums"]["milestone_status"]
          target_date: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "annual_goal_milestones"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_annual_goal_progress: {
        Args: {
          p_goal_id: string
          p_progress: number
          p_status?: Database["public"]["Enums"]["annual_goal_status"]
        }
        Returns: {
          carry_over_from_goal_id: string | null
          category: Database["public"]["Enums"]["annual_goal_category"]
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          financial_goal_id: string | null
          id: string
          is_focus: boolean
          notes: string | null
          priority: Database["public"]["Enums"]["annual_goal_priority"]
          progress: number
          progress_mode: Database["public"]["Enums"]["annual_goal_progress_mode"]
          progress_updated_at: string | null
          purchase_item_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["annual_goal_status"]
          target_date: string | null
          title: string
          updated_at: string
          workspace_id: string
          year: number
        }
        SetofOptions: {
          from: "*"
          to: "annual_goals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      account_type:
        | "BANK"
        | "CASH"
        | "ZELLE"
        | "CRYPTO"
        | "CREDIT_CARD"
        | "OTHER"
      annual_goal_category:
        | "PERSONAL"
        | "FAMILY"
        | "FINANCIAL"
        | "BUSINESS"
        | "HEALTH"
        | "EDUCATION"
        | "PURCHASE"
        | "TRAVEL"
        | "PROJECT"
        | "OTHER"
      annual_goal_priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
      annual_goal_progress_mode: "MANUAL" | "MILESTONES"
      annual_goal_status:
        | "NOT_STARTED"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "PAUSED"
        | "CANCELLED"
      category_type: "INCOME" | "EXPENSE"
      currency_type: "USD" | "VES" | "EUR"
      milestone_status: "PENDING" | "COMPLETED"
      transaction_source_type:
        | "MANUAL"
        | "CLIENT_PAYMENT"
        | "PAYROLL_PAYMENT"
        | "RECURRING_EXPENSE"
        | "DEBT_PAYMENT"
        | "PURCHASE"
        | "TRANSFER"
      transaction_status: "PENDING" | "COMPLETED" | "CANCELLED"
      transaction_type: "INCOME" | "EXPENSE" | "TRANSFER"
      workspace_member_role: "OWNER" | "ADMIN" | "MANAGER" | "VIEWER"
      workspace_type: "PERSONAL" | "BUSINESS"
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
    Enums: {
      account_type: ["BANK", "CASH", "ZELLE", "CRYPTO", "CREDIT_CARD", "OTHER"],
      annual_goal_category: [
        "PERSONAL",
        "FAMILY",
        "FINANCIAL",
        "BUSINESS",
        "HEALTH",
        "EDUCATION",
        "PURCHASE",
        "TRAVEL",
        "PROJECT",
        "OTHER",
      ],
      annual_goal_priority: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      annual_goal_progress_mode: ["MANUAL", "MILESTONES"],
      annual_goal_status: [
        "NOT_STARTED",
        "IN_PROGRESS",
        "COMPLETED",
        "PAUSED",
        "CANCELLED",
      ],
      category_type: ["INCOME", "EXPENSE"],
      currency_type: ["USD", "VES", "EUR"],
      milestone_status: ["PENDING", "COMPLETED"],
      transaction_source_type: [
        "MANUAL",
        "CLIENT_PAYMENT",
        "PAYROLL_PAYMENT",
        "RECURRING_EXPENSE",
        "DEBT_PAYMENT",
        "PURCHASE",
        "TRANSFER",
      ],
      transaction_status: ["PENDING", "COMPLETED", "CANCELLED"],
      transaction_type: ["INCOME", "EXPENSE", "TRANSFER"],
      workspace_member_role: ["OWNER", "ADMIN", "MANAGER", "VIEWER"],
      workspace_type: ["PERSONAL", "BUSINESS"],
    },
  },
} as const

// ─── Convenience aliases ──────────────────────────────────────────────────────
export type ProfileRow             = Database['public']['Tables']['profiles']['Row']
export type WorkspaceRow           = Database['public']['Tables']['workspaces']['Row']
export type AccountRow             = Database['public']['Tables']['accounts']['Row']
export type CategoryRow            = Database['public']['Tables']['categories']['Row']
export type WorkspaceMemberRole    = Database['public']['Enums']['workspace_member_role']
