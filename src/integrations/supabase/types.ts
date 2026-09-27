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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_setting_definitions: {
        Row: {
          category: string
          default_value: string | null
          description: string
          is_sensitive: boolean
          key: string
        }
        Insert: {
          category?: string
          default_value?: string | null
          description: string
          is_sensitive?: boolean
          key: string
        }
        Update: {
          category?: string
          default_value?: string | null
          description?: string
          is_sensitive?: boolean
          key?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          tenant_id: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          tenant_id: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          tenant_id?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      billing_queue: {
        Row: {
          amount_cents: number
          billing_month: string | null
          created_at: string
          external_transaction_id: string | null
          failed_at: string | null
          id: string
          notes: string | null
          paid_at: string | null
          paylink_id: string | null
          paylink_url: string | null
          plan: string
          status: string
          tenant_id: string
        }
        Insert: {
          amount_cents: number
          billing_month?: string | null
          created_at?: string
          external_transaction_id?: string | null
          failed_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          paylink_id?: string | null
          paylink_url?: string | null
          plan: string
          status?: string
          tenant_id: string
        }
        Update: {
          amount_cents?: number
          billing_month?: string | null
          created_at?: string
          external_transaction_id?: string | null
          failed_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          paylink_id?: string | null
          paylink_url?: string | null
          plan?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "sa_platform_billing_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "billing_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_clients: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string | null
          phone: string | null
          reason: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          phone?: string | null
          reason?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          phone?: string | null
          reason?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "sa_platform_billing_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "blocked_clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_email_domains: {
        Row: {
          created_at: string | null
          domain: string
          id: string
          reason: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          id?: string
          reason?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          id?: string
          reason?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      booking_items: {
        Row: {
          booking_id: string
          created_at: string | null
          duration_minutes: number
          id: string
          price: number
          quantity: number
          service_id: string
          service_name: string
          sort_order: number | null
          tenant_id: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          duration_minutes: number
          id?: string
          price: number
          quantity?: number
          service_id: string
          service_name: string
          sort_order?: number | null
          tenant_id?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          duration_minutes?: number
          id?: string
          price?: number
          quantity?: number
          service_id?: string
          service_name?: string
          sort_order?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          balance_due: number
          booking_date: string
          call_out_address: string | null
          call_out_distance_km: number | null
          call_out_fee: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          canonical_client_id: string | null
          client_email: string | null
          client_id: string | null
          client_name: string | null
          client_notes: string | null
          client_phone: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string | null
          deposit_amount: number
          deposit_paid: boolean | null
          end_time: string
          final_payment_paid: boolean
          full_payment_received: boolean | null
          gcal_event_id: string | null
          guest_address: string | null
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          ikhokha_checkout_id: string | null
          ikhokha_final_checkout_id: string | null
          ikhokha_final_link: string | null
          ikhokha_final_paylink_id: string | null
          ikhokha_final_paylink_url: string | null
          ikhokha_link: string | null
          ikhokha_paylink_id: string | null
          ikhokha_paylink_url: string | null
          ikhokha_request_id: string | null
          is_call_out: boolean | null
          last_webhook_id: string | null
          lead_source: string | null
          notes: string | null
          payfast_final_m_payment_id: string | null
          payfast_m_payment_id: string | null
          payment_provider: string | null
          payshap_claimed_at: string | null
          payshap_payment_intent: string | null
          payshap_proof_url: string | null
          payshap_reference: string | null
          service_duration_minutes: number | null
          service_ids: string | null
          staff_id: string | null
          staff_notes: string | null
          start_time: string
          status: string
          tenant_id: string | null
          total_amount: number
          updated_at: string | null
          yoco_checkout_id: string | null
          yoco_final_checkout_id: string | null
          yoco_final_link: string | null
          yoco_link: string | null
        }
        Insert: {
          balance_due?: number
          booking_date: string
          call_out_address?: string | null
          call_out_distance_km?: number | null
          call_out_fee?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          canonical_client_id?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_notes?: string | null
          client_phone?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deposit_amount: number
          deposit_paid?: boolean | null
          end_time: string
          final_payment_paid?: boolean
          full_payment_received?: boolean | null
          gcal_event_id?: string | null
          guest_address?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          ikhokha_checkout_id?: string | null
          ikhokha_final_checkout_id?: string | null
          ikhokha_final_link?: string | null
          ikhokha_final_paylink_id?: string | null
          ikhokha_final_paylink_url?: string | null
          ikhokha_link?: string | null
          ikhokha_paylink_id?: string | null
          ikhokha_paylink_url?: string | null
          ikhokha_request_id?: string | null
          is_call_out?: boolean | null
          last_webhook_id?: string | null
          lead_source?: string | null
          notes?: string | null
          payfast_final_m_payment_id?: string | null
          payfast_m_payment_id?: string | null
          payment_provider?: string | null
          payshap_claimed_at?: string | null
          payshap_payment_intent?: string | null
          payshap_proof_url?: string | null
          payshap_reference?: string | null
          service_duration_minutes?: number | null
          service_ids?: string | null
          staff_id?: string | null
          staff_notes?: string | null
          start_time: string
          status?: string
          tenant_id?: string | null
          total_amount: number
          updated_at?: string | null
          yoco_checkout_id?: string | null
          yoco_final_checkout_id?: string | null
          yoco_final_link?: string | null
          yoco_link?: string | null
        }
        Update: {
          balance_due?: number
          booking_date?: string
          call_out_address?: string | null
          call_out_distance_km?: number | null
          call_out_fee?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          canonical_client_id?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_notes?: string | null
          client_phone?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deposit_amount?: number
          deposit_paid?: boolean | null
          end_time?: string
          final_payment_paid?: boolean
          full_payment_received?: boolean | null
          gcal_event_id?: string | null
          guest_address?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          ikhokha_checkout_id?: string | null
          ikhokha_final_checkout_id?: string | null
          ikhokha_final_link?: string | null
          ikhokha_final_paylink_id?: string | null
          ikhokha_final_paylink_url?: string | null
          ikhokha_link?: string | null
          ikhokha_paylink_id?: string | null
          ikhokha_paylink_url?: string | null
          ikhokha_request_id?: string | null
          is_call_out?: boolean | null
          last_webhook_id?: string | null
          lead_source?: string | null
          notes?: string | null
          payfast_final_m_payment_id?: string | null
          payfast_m_payment_id?: string | null
          payment_provider?: string | null
          payshap_claimed_at?: string | null
          payshap_payment_intent?: string | null
          payshap_proof_url?: string | null
          payshap_reference?: string | null
          service_duration_minutes?: number | null
          service_ids?: string | null
          staff_id?: string | null
          staff_notes?: string | null
          start_time?: string
          status?: string
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string | null
          yoco_checkout_id?: string | null
          yoco_final_checkout_id?: string | null
          yoco_final_link?: string | null
          yoco_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_canonical_client_id_fkey"
            columns: ["canonical_client_id"]
            isOneToOne: false
            referencedRelation: "loyalty_tracker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_occasions: {
        Row: {
          client_name: string
          created_at: string | null
          id: string
          label: string | null
          occasion_date: string
          phone: string | null
          tenant_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          client_name: string
          created_at?: string | null
          id?: string
          label?: string | null
          occasion_date: string
          phone?: string | null
          tenant_id: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          client_name?: string
          created_at?: string | null
          id?: string
          label?: string | null
          occasion_date?: string
          phone?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      consistency_guest_status: {
        Row: {
          canonical_client_id: string
          consecutive_count: number
          id: string
          is_active: boolean
          program_id: string
          streak_last_booking: string | null
          streak_start: string | null
          updated_at: string | null
        }
        Insert: {
          canonical_client_id: string
          consecutive_count?: number
          id?: string
          is_active?: boolean
          program_id: string
          streak_last_booking?: string | null
          streak_start?: string | null
          updated_at?: string | null
        }
        Update: {
          canonical_client_id?: string
          consecutive_count?: number
          id?: string
          is_active?: boolean
          program_id?: string
          streak_last_booking?: string | null
          streak_start?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consistency_guest_status_canonical_client_id_fkey"
            columns: ["canonical_client_id"]
            isOneToOne: false
            referencedRelation: "loyalty_tracker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consistency_guest_status_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "consistency_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      consistency_program_services: {
        Row: {
          consistency_price: number
          id: string
          program_id: string
          service_id: string
        }
        Insert: {
          consistency_price: number
          id?: string
          program_id: string
          service_id: string
        }
        Update: {
          consistency_price?: number
          id?: string
          program_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consistency_program_services_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "consistency_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consistency_program_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      consistency_programs: {
        Row: {
          created_at: string | null
          cycle_days: number
          grace_days: number
          id: string
          is_active: boolean
          name: string
          required_bookings: number
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          cycle_days?: number
          grace_days?: number
          id?: string
          is_active?: boolean
          name?: string
          required_bookings?: number
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          cycle_days?: number
          grace_days?: number
          id?: string
          is_active?: boolean
          name?: string
          required_bookings?: number
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consistency_programs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "public_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consistency_programs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "sa_platform_billing_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "consistency_programs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_questions: {
        Row: {
          created_at: string
          detail: string | null
          enabled: boolean
          id: string
          is_active: boolean
          label: string
          options: Json
          question: string
          required: boolean
          sort_order: number
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          enabled?: boolean
          id?: string
          label: string
          options: Json
          question: string
          required?: boolean
          sort_order?: number
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          enabled?: boolean
          id?: string
          label?: string
          options?: Json
          question?: string
          required?: boolean
          sort_order?: number
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_questions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_questions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "sa_platform_billing_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "consultation_questions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          additional_notes: string | null
          allergies: string | null
          booking_id: string
          client_type: string | null
          created_at: string | null
          environmental_exposure: string | null
          hair_length_ok: string | null
          health_conditions: string | null
          id: string
          lead_source: string | null
          medications: string | null
          physical_factors: string | null
          pregnancy: string | null
          skin_conditions: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          additional_notes?: string | null
          allergies?: string | null
          booking_id: string
          client_type?: string | null
          created_at?: string | null
          environmental_exposure?: string | null
          hair_length_ok?: string | null
          health_conditions?: string | null
          id?: string
          lead_source?: string | null
          medications?: string | null
          physical_factors?: string | null
          pregnancy?: string | null
          skin_conditions?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          additional_notes?: string | null
          allergies?: string | null
          booking_id?: string
          client_type?: string | null
          created_at?: string | null
          environmental_exposure?: string | null
          hair_length_ok?: string | null
          health_conditions?: string | null
          id?: string
          lead_source?: string | null
          medications?: string | null
          physical_factors?: string | null
          pregnancy?: string | null
          skin_conditions?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_client"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_usage: {
        Row: {
          action: string
          feature: string
          id: string
          recorded_at: string
          session_id: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          feature: string
          id?: string
          recorded_at?: string
          session_id?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          feature?: string
          id?: string
          recorded_at?: string
          session_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "sa_platform_billing_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "feature_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_tracker: {
        Row: {
          birthday: string | null
          bought_3pack: boolean | null
          client_id: string | null
          client_name: string
          created_at: string | null
          email: string | null
          id: string
          invite_sent: boolean | null
          last_contacted_at: string | null
          last_wax_date: string | null
          location: string | null
          merge_reason: string | null
          merged_at: string | null
          merged_into_id: string | null
          next_due_date: string | null
          notes: string | null
          overdue: boolean | null
          pack_progress: string | null
          phone: string | null
          source: string
          status: string | null
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
          whatsapp_link: string | null
        }
        Insert: {
          birthday?: string | null
          bought_3pack?: boolean | null
          client_id?: string | null
          client_name: string
          created_at?: string | null
          email?: string | null
          id?: string
          invite_sent?: boolean | null
          last_contacted_at?: string | null
          last_wax_date?: string | null
          location?: string | null
          merge_reason?: string | null
          merged_at?: string | null
          merged_into_id?: string | null
          next_due_date?: string | null
          notes?: string | null
          overdue?: boolean | null
          pack_progress?: string | null
          phone?: string | null
          source?: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
          whatsapp_link?: string | null
        }
        Update: {
          birthday?: string | null
          bought_3pack?: boolean | null
          client_id?: string | null
          client_name?: string
          created_at?: string | null
          email?: string | null
          id?: string
          invite_sent?: boolean | null
          last_contacted_at?: string | null
          last_wax_date?: string | null
          location?: string | null
          merge_reason?: string | null
          merged_at?: string | null
          merged_into_id?: string | null
          next_due_date?: string | null
          notes?: string | null
          overdue?: boolean | null
          pack_progress?: string | null
          phone?: string | null
          source?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
          whatsapp_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_tracker_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "loyalty_tracker"
            referencedColumns: ["id"]
          },
        ]
      }
      mrr_snapshots: {
        Row: {
          id: string
          mrr_amount: number
          plan_label: string | null
          recorded_at: string
          snapshot_month: string
          tenant_id: string
        }
        Insert: {
          id?: string
          mrr_amount?: number
          plan_label?: string | null
          recorded_at?: string
          snapshot_month: string
          tenant_id: string
        }
        Update: {
          id?: string
          mrr_amount?: number
          plan_label?: string | null
          recorded_at?: string
          snapshot_month?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mrr_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mrr_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "sa_platform_billing_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "mrr_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nexty_insight_actions: {
        Row: {
          acted_at: string
          action_type: string
          expires_at: string | null
          insight_id: string
          tenant_id: string
        }
        Insert: {
          acted_at?: string
          action_type: string
          expires_at?: string | null
          insight_id: string
          tenant_id: string
        }
        Update: {
          acted_at?: string
          action_type?: string
          expires_at?: string | null
          insight_id?: string
          tenant_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          booking_id: string | null
          created_at: string
          id: string
          read: boolean
          tenant_id: string
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          booking_id?: string | null
          created_at?: string
          id?: string
          read?: boolean
          tenant_id: string
          title: string
          type: string
        }
        Update: {
          body?: string | null
          booking_id?: string | null
          created_at?: string
          id?: string
          read?: boolean
          tenant_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "sa_platform_billing_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          client_id: string | null
          completed_at: string | null
          created_at: string | null
          gateway: string
          id: string
          notes: string | null
          payment_method: string
          payment_type: string
          status: string
          tenant_id: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          gateway?: string
          id?: string
          notes?: string | null
          payment_method: string
          payment_type: string
          status?: string
          tenant_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          gateway?: string
          id?: string
          notes?: string | null
          payment_method?: string
          payment_type?: string
          status?: string
          tenant_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_onboarding: {
        Row: {
          created_at: string | null
          payload: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          payload: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          payload?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_billing_config: {
        Row: {
          cron_secret: string | null
          enabled: boolean
          id: boolean
          owner_tenant_id: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          cron_secret?: string | null
          enabled?: boolean
          id?: boolean
          owner_tenant_id?: string | null
          provider?: string
          updated_at?: string
        }
        Update: {
          cron_secret?: string | null
          enabled?: boolean
          id?: boolean
          owner_tenant_id?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_billing_config_owner_tenant_id_fkey"
            columns: ["owner_tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_billing_config_owner_tenant_id_fkey"
            columns: ["owner_tenant_id"]
            isOneToOne: false
            referencedRelation: "sa_platform_billing_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "platform_billing_config_owner_tenant_id_fkey"
            columns: ["owner_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_events: {
        Row: {
          actor_id: string | null
          event: string
          id: string
          meta: Json | null
          recorded_at: string
          tenant_id: string
        }
        Insert: {
          actor_id?: string | null
          event: string
          id?: string
          meta?: Json | null
          recorded_at?: string
          tenant_id: string
        }
        Update: {
          actor_id?: string | null
          event?: string
          id?: string
          meta?: Json | null
          recorded_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "sa_platform_billing_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "platform_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_invoices: {
        Row: {
          activity_snapshot: Json
          activity_snapshot_generated_at: string | null
          amount_rands: number
          auto_paid: boolean | null
          billing_month: string | null
          checkout_provider: string
          checkout_url: string | null
          created_at: string
          due_date: string
          email_delivery_status: string
          email_sent_at: string | null
          external_transaction_id: string | null
          id: string
          invoice_issued_at: string | null
          invoice_number: string
          notes: string | null
          paid_at: string | null
          period_end: string
          period_start: string
          plan: string
          status: string
          tenant_id: string
          updated_at: string
          yoco_checkout_id: string | null
          yoco_payment_link: string | null
        }
        Insert: {
          activity_snapshot?: Json
          activity_snapshot_generated_at?: string | null
          amount_rands: number
          auto_paid?: boolean | null
          billing_month?: string | null
          checkout_provider?: string
          checkout_url?: string | null
          created_at?: string
          due_date: string
          email_delivery_status?: string
          email_sent_at?: string | null
          external_transaction_id?: string | null
          id?: string
          invoice_issued_at?: string | null
          invoice_number: string
          notes?: string | null
          paid_at?: string | null
          period_end: string
          period_start: string
          plan: string
          status?: string
          tenant_id: string
          updated_at?: string
          yoco_checkout_id?: string | null
          yoco_payment_link?: string | null
        }
        Update: {
          activity_snapshot?: Json
          activity_snapshot_generated_at?: string | null
          amount_rands?: number
          auto_paid?: boolean | null
          billing_month?: string | null
          checkout_provider?: string
          checkout_url?: string | null
          created_at?: string
          due_date?: string
          email_delivery_status?: string
          email_sent_at?: string | null
          external_transaction_id?: string | null
          id?: string
          invoice_issued_at?: string | null
          invoice_number?: string
          notes?: string | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          plan?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          yoco_checkout_id?: string | null
          yoco_payment_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "sa_platform_billing_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "platform_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_payments: {
        Row: {
          amount_rands: number
          created_at: string
          eft_reference: string | null
          id: string
          invoice_id: string
          notes: string | null
          paid_at: string
          payment_method: string
          recorded_by: string | null
          tenant_id: string
          yoco_charge_id: string | null
        }
        Insert: {
          amount_rands: number
          created_at?: string
          eft_reference?: string | null
          id?: string
          invoice_id: string
          notes?: string | null
          paid_at?: string
          payment_method?: string
          recorded_by?: string | null
          tenant_id: string
          yoco_charge_id?: string | null
        }
        Update: {
          amount_rands?: number
          created_at?: string
          eft_reference?: string | null
          id?: string
          invoice_id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: string
          recorded_by?: string | null
          tenant_id?: string
          yoco_charge_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "platform_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sa_platform_billing_overview"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "platform_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "sa_platform_billing_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "platform_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          description: string
          is_sensitive: boolean
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          description: string
          is_sensitive?: boolean
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          description?: string
          is_sensitive?: boolean
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          postal_code: string | null
          role: string
          specialties: string[] | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          phone?: string | null
          postal_code?: string | null
          role?: string
          specialties?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          postal_code?: string | null
          role?: string
          specialties?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles_cleanup_backup: {
        Row: {
          address: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          postal_code: string | null
          role: string
          specialties: string[] | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          postal_code?: string | null
          role?: string
          specialties?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          postal_code?: string | null
          role?: string
          specialties?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sa_audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string
          id: string
          label: string | null
          meta: Json | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id: string
          id?: string
          label?: string | null
          meta?: Json | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string
          id?: string
          label?: string | null
          meta?: Json | null
        }
        Relationships: []
      }
      service_addon_assignments: {
        Row: {
          addon_id: string
          created_at: string
          display_order: number
          id: string
          service_id: string
          tenant_id: string
        }
        Insert: {
          addon_id: string
          created_at?: string
          display_order?: number
          id?: string
          service_id: string
          tenant_id: string
        }
        Update: {
          addon_id?: string
          created_at?: string
          display_order?: number
          id?: string
          service_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_addon_assignments_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_addon_assignments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_addon_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_addon_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "sa_platform_billing_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "service_addon_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string
          created_at: string | null
          deposit_percent: number | null
          description: string | null
          display_order: number | null
          duration_minutes: number
          id: string
          image_url: string | null
          is_active: boolean | null
          is_addon: boolean
          is_archived: boolean
          is_call_out_available: boolean | null
          name: string
          price: number
          tags: string[] | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          deposit_percent?: number | null
          description?: string | null
          display_order?: number | null
          duration_minutes: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_addon?: boolean
          is_archived?: boolean
          is_call_out_available?: boolean | null
          name: string
          price: number
          tags?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          deposit_percent?: number | null
          description?: string | null
          display_order?: number | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_addon?: boolean
          is_archived?: boolean
          is_call_out_available?: boolean | null
          name?: string
          price?: number
          tags?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      slot_holds: {
        Row: {
          booking_date: string
          created_at: string
          duration_mins: number
          end_time: string
          expires_at: string
          id: string
          session_token: string
          staff_id: string
          start_time: string
          tenant_id: string
        }
        Insert: {
          booking_date: string
          created_at?: string
          duration_mins?: number
          end_time: string
          expires_at?: string
          id?: string
          session_token: string
          staff_id: string
          start_time: string
          tenant_id: string
        }
        Update: {
          booking_date?: string
          created_at?: string
          duration_mins?: number
          end_time?: string
          expires_at?: string
          id?: string
          session_token?: string
          staff_id?: string
          start_time?: string
          tenant_id?: string
        }
        Relationships: []
      }
      staff_availability: {
        Row: {
          buffer_minutes: number | null
          created_at: string | null
          day_enabled: boolean | null
          day_of_week: number
          id: string
          is_available: boolean | null
          override_reason: string | null
          requires_travel_buffer: boolean | null
          slot_end_time: string
          slot_start_time: string
          specific_date: string | null
          staff_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          buffer_minutes?: number | null
          created_at?: string | null
          day_enabled?: boolean | null
          day_of_week: number
          id?: string
          is_available?: boolean | null
          override_reason?: string | null
          requires_travel_buffer?: boolean | null
          slot_end_time: string
          slot_start_time: string
          specific_date?: string | null
          staff_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          buffer_minutes?: number | null
          created_at?: string | null
          day_enabled?: boolean | null
          day_of_week?: number
          id?: string
          is_available?: boolean | null
          override_reason?: string | null
          requires_travel_buffer?: boolean | null
          slot_end_time?: string
          slot_start_time?: string
          specific_date?: string | null
          staff_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_availability_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_inventory: {
        Row: {
          cost: number
          created_at: string | null
          id: string
          item_name: string
          notes: string | null
          opening_stock: number
          reorder_level: number
          stock_on_hand: number
          tenant_id: string
          total_cost: number | null
          updated_at: string | null
        }
        Insert: {
          cost?: number
          created_at?: string | null
          id?: string
          item_name: string
          notes?: string | null
          opening_stock?: number
          reorder_level?: number
          stock_on_hand?: number
          tenant_id: string
          total_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          cost?: number
          created_at?: string | null
          id?: string
          item_name?: string
          notes?: string | null
          opening_stock?: number
          reorder_level?: number
          stock_on_hand?: number
          tenant_id?: string
          total_cost?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tenant_secrets: {
        Row: {
          created_at: string
          id: string
          key: string
          tenant_id: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          tenant_id: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          tenant_id?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_secrets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_secrets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "sa_platform_billing_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_secrets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          allow_overrun: boolean
          billing_cycle_anchor: string | null
          billing_provider_customer_id: string | null
          business_type: string | null
          created_at: string | null
          currency: string | null
          custom_domain: string | null
          email: string | null
          google_review_url: string | null
          grace_period_days: number
          grace_period_ends_at: string | null
          id: string
          ikhokha_app_id: string | null
          ikhokha_app_key: string | null
          ikhokha_merchant_id: string | null
          ikhokha_mode: string
          is_active: boolean | null
          is_lifetime_free: boolean | null
          is_setup_complete: boolean | null
          logo_url: string | null
          max_advance_days: number
          min_notice_hours: number
          name: string
          next_billing_date: string | null
          notification_preferences: Json
          owner_id: string | null
          payfast_enabled: boolean
          payfast_merchant_id: string | null
          payfast_merchant_key: string | null
          payfast_mode: string
          payfast_passphrase: string | null
          paynow_enabled: boolean | null
          paynow_number: string | null
          payshap_account_number: string | null
          payshap_enabled: boolean
          phone: string | null
          plan: string
          subdomain: string | null
          subscription_paid_at: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          theme_id: string | null
          travel_buffer_minutes: number
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string | null
          yoco_mode: string
          yoco_secret_key: string | null
          yoco_secret_key_live: string | null
          yoco_secret_key_test: string | null
          yoco_webhook_id: string | null
          yoco_webhook_secret: string | null
        }
        Insert: {
          address?: string | null
          allow_overrun?: boolean
          billing_cycle_anchor?: string | null
          billing_provider_customer_id?: string | null
          business_type?: string | null
          created_at?: string | null
          currency?: string | null
          custom_domain?: string | null
          email?: string | null
          google_review_url?: string | null
          grace_period_days?: number
          grace_period_ends_at?: string | null
          id: string
          ikhokha_app_id?: string | null
          ikhokha_app_key?: string | null
          ikhokha_merchant_id?: string | null
          ikhokha_mode?: string
          is_active?: boolean | null
          is_lifetime_free?: boolean | null
          is_setup_complete?: boolean | null
          logo_url?: string | null
          max_advance_days?: number
          min_notice_hours?: number
          name: string
          next_billing_date?: string | null
          notification_preferences?: Json
          owner_id?: string | null
          payfast_enabled?: boolean
          payfast_merchant_id?: string | null
          payfast_merchant_key?: string | null
          payfast_mode?: string
          payfast_passphrase?: string | null
          paynow_enabled?: boolean | null
          paynow_number?: string | null
          payshap_account_number?: string | null
          payshap_enabled?: boolean
          phone?: string | null
          plan?: string
          subdomain?: string | null
          subscription_paid_at?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          theme_id?: string | null
          travel_buffer_minutes?: number
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
          yoco_mode?: string
          yoco_secret_key?: string | null
          yoco_secret_key_live?: string | null
          yoco_secret_key_test?: string | null
          yoco_webhook_id?: string | null
          yoco_webhook_secret?: string | null
        }
        Update: {
          address?: string | null
          allow_overrun?: boolean
          billing_cycle_anchor?: string | null
          billing_provider_customer_id?: string | null
          business_type?: string | null
          created_at?: string | null
          currency?: string | null
          custom_domain?: string | null
          email?: string | null
          google_review_url?: string | null
          grace_period_days?: number
          grace_period_ends_at?: string | null
          id?: string
          ikhokha_app_id?: string | null
          ikhokha_app_key?: string | null
          ikhokha_merchant_id?: string | null
          ikhokha_mode?: string
          is_active?: boolean | null
          is_lifetime_free?: boolean | null
          is_setup_complete?: boolean | null
          logo_url?: string | null
          max_advance_days?: number
          min_notice_hours?: number
          name?: string
          next_billing_date?: string | null
          notification_preferences?: Json
          owner_id?: string | null
          payfast_enabled?: boolean
          payfast_merchant_id?: string | null
          payfast_merchant_key?: string | null
          payfast_mode?: string
          payfast_passphrase?: string | null
          paynow_enabled?: boolean | null
          paynow_number?: string | null
          payshap_account_number?: string | null
          payshap_enabled?: boolean
          phone?: string | null
          plan?: string
          subdomain?: string | null
          subscription_paid_at?: string | null
          subscription_start_date?: string | null
          updated_at?: string | null
          yoco_mode?: string
          yoco_secret_key?: string | null
          yoco_secret_key_live?: string | null
          yoco_secret_key_test?: string | null
          yoco_webhook_id?: string | null
          yoco_webhook_secret?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_tenant_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "sa_platform_billing_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_queue: {
        Row: {
          booking_id: string | null
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean | null
          processed_at: string | null
          processing_started_at: string | null
          retry_count: number | null
          tenant_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          processing_started_at?: string | null
          retry_count?: number | null
          tenant_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          processing_started_at?: string | null
          retry_count?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_queue_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_queue_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_client"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      bookings_with_client: {
        Row: {
          balance_due: number | null
          booking_date: string | null
          call_out_address: string | null
          call_out_distance_km: number | null
          call_out_fee: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          canonical_client_id: string | null
          canonical_email: string | null
          canonical_name: string | null
          canonical_phone: string | null
          client_email: string | null
          client_id: string | null
          client_name: string | null
          client_notes: string | null
          client_phone: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string | null
          deposit_amount: number | null
          deposit_paid: boolean | null
          end_time: string | null
          final_payment_paid: boolean | null
          full_payment_received: boolean | null
          gcal_event_id: string | null
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string | null
          is_call_out: boolean | null
          last_webhook_id: string | null
          lead_source: string | null
          loyalty_birthday: string | null
          loyalty_notes: string | null
          loyalty_status: string | null
          notes: string | null
          service_duration_minutes: number | null
          service_ids: string | null
          staff_id: string | null
          staff_notes: string | null
          start_time: string | null
          status: string | null
          tenant_id: string | null
          total_amount: number | null
          updated_at: string | null
          yoco_checkout_id: string | null
          yoco_final_checkout_id: string | null
          yoco_final_link: string | null
          yoco_link: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_canonical_client_id_fkey"
            columns: ["canonical_client_id"]
            isOneToOne: false
            referencedRelation: "loyalty_tracker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_tenant_view: {
        Row: {
          address: string | null
          allow_overrun: boolean | null
          created_at: string | null
          currency: string | null
          custom_domain: string | null
          email: string | null
          id: string | null
          is_active: boolean | null
          logo_url: string | null
          max_advance_days: number | null
          min_notice_hours: number | null
          name: string | null
          phone: string | null
          theme_id: string | null
          travel_buffer_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          allow_overrun?: boolean | null
          created_at?: string | null
          currency?: string | null
          custom_domain?: string | null
          email?: string | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          max_advance_days?: number | null
          min_notice_hours?: number | null
          name?: string | null
          phone?: string | null
          theme_id?: string | null
          travel_buffer_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          allow_overrun?: boolean | null
          created_at?: string | null
          currency?: string | null
          custom_domain?: string | null
          email?: string | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          max_advance_days?: number | null
          min_notice_hours?: number | null
          name?: string | null
          phone?: string | null
          theme_id?: string | null
          travel_buffer_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sa_platform_billing_overview: {
        Row: {
          amount_rands: number | null
          due_date: string | null
          grace_period_ends_at: string | null
          invoice_created_at: string | null
          invoice_id: string | null
          invoice_number: string | null
          invoice_status: string | null
          next_billing_date: string | null
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          plan: string | null
          subscription_status: string | null
          tenant_id: string | null
          tenant_name: string | null
          trial_ends_at: string | null
          yoco_payment_link: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      acquire_slot_hold: {
        Args: {
          p_booking_date: string
          p_duration_mins: number
          p_session_token: string
          p_staff_id: string
          p_start_time: string
          p_tenant_id: string
        }
        Returns: {
          expires_at: string
          hold_id: string
          message: string
          success: boolean
        }[]
      }
      add_service_to_booking: {
        Args: { p_booking_id: string; p_service_id: string }
        Returns: {
          message: string
          new_balance: number
          new_total: number
          success: boolean
        }[]
      }
      apply_platform_billing_lifecycle: { Args: never; Returns: undefined }
      calculate_booking_price:
        | {
            Args: {
              p_distance_km?: number
              p_is_callout?: boolean
              p_service_ids: string[]
            }
            Returns: {
              callout_fee: number
              deposit_amount: number
              service_total: number
              total_amount: number
            }[]
          }
        | {
            Args: {
              p_canonical_client_id?: string
              p_distance_km?: number
              p_is_callout?: boolean
              p_service_ids: string[]
            }
            Returns: {
              callout_fee: number
              deposit_amount: number
              service_total: number
              total_amount: number
            }[]
          }
      cancel_expired_pending_bookings: { Args: never; Returns: number }
      check_availability: {
        Args: {
          p_date: string
          p_duration_minutes: number
          p_staff_id: string
          p_start_time: string
        }
        Returns: {
          is_available: boolean
          message: string
          required_slots: number
        }[]
      }
      create_booking: {
        Args: {
          p_booking_date: string
          p_callout_address?: string
          p_callout_distance_km?: number
          p_client_id: string
          p_client_notes?: string
          p_is_callout?: boolean
          p_service_ids: string[]
          p_staff_id: string
          p_start_time: string
        }
        Returns: {
          booking_id: string
          deposit_amount: number
          message: string
          success: boolean
          total_amount: number
        }[]
      }
      create_booking_with_consultation: {
        Args: {
          p_additional_notes: string
          p_allergies: string
          p_booking_date: string
          p_callout_address: string
          p_callout_distance_km: number
          p_client_id: string
          p_client_notes: string
          p_client_type: string
          p_deposit_amount?: number
          p_environmental_exposure: string
          p_guest_email: string
          p_guest_name: string
          p_guest_phone: string
          p_hair_length_ok: string
          p_health_conditions: string
          p_is_callout: boolean
          p_lead_source: string
          p_medications: string
          p_physical_factors: string
          p_pregnancy: string
          p_service_ids: string[]
          p_skin_conditions: string
          p_staff_id: string
          p_start_time: string
          p_tenant_id?: string
          p_total_amount?: number
        }
        Returns: {
          booking_id: string
          deposit: number
          message: string
          success: boolean
          total: number
        }[]
      }
      create_platform_invoice: {
        Args: {
          p_amount: number
          p_due_date: string
          p_notes?: string
          p_period_end: string
          p_period_start: string
          p_plan: string
          p_tenant_id: string
          p_yoco_link?: string
        }
        Returns: {
          activity_snapshot: Json
          activity_snapshot_generated_at: string | null
          amount_rands: number
          auto_paid: boolean | null
          billing_month: string | null
          checkout_provider: string
          checkout_url: string | null
          created_at: string
          due_date: string
          email_delivery_status: string
          email_sent_at: string | null
          external_transaction_id: string | null
          id: string
          invoice_issued_at: string | null
          invoice_number: string
          notes: string | null
          paid_at: string | null
          period_end: string
          period_start: string
          plan: string
          status: string
          tenant_id: string
          updated_at: string
          yoco_checkout_id: string | null
          yoco_payment_link: string | null
        }
        SetofOptions: {
          from: "*"
          to: "platform_invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_tenant_id: { Args: never; Returns: string }
      delete_service_guarded: {
        Args: { p_service_id: string; p_tenant_id: string }
        Returns: Json
      }
      get_all_bookings: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          balance_due: number
          booking_date: string
          booking_id: string
          call_out_fee: number
          client_address: string
          client_email: string
          client_name: string
          client_phone: string
          created_at: string
          deposit_amount: number
          deposit_paid: boolean
          full_payment_received: boolean
          is_call_out: boolean
          services: string
          status: string
          time_slot: string
          total_amount: number
          yoco_link: string
        }[]
      }
      get_app_setting: { Args: { p_key: string }; Returns: string }
      get_attach_rate: {
        Args: { p_tenant_id: string }
        Returns: {
          attach_rate_pct: number
          avg_services_per_booking: number
          multi_service_bookings: number
          total_bookings: number
        }[]
      }
      get_available_slots: {
        Args: {
          p_date: string
          p_duration_minutes?: number
          p_session_token?: string
          p_staff_id: string
        }
        Returns: {
          is_available: boolean
          slot_end: string
          slot_start: string
        }[]
      }
      get_basket_trend: {
        Args: { p_tenant_id: string }
        Returns: {
          avg_basket: number
          booking_count: number
          week_start: string
        }[]
      }
      get_booking_consistency_quote: {
        Args: {
          p_distance_km?: number
          p_guest_email?: string
          p_guest_phone?: string
          p_is_callout?: boolean
          p_service_ids: string[]
          p_tenant_id: string
        }
        Returns: {
          bookings_remaining: number
          callout_fee: number
          completed_count: number
          consistency_price: number
          deposit_amount: number
          is_qualifying_booking: boolean
          service_name: string
          service_total: number
          state: string
          total_amount: number
        }[]
      }
      get_booking_for_webhook: {
        Args: { p_booking_id: string }
        Returns: {
          balance_due: number
          booking_date: string
          booking_id: string
          call_out_address: string
          call_out_fee: number
          client_address: string
          client_email: string
          client_name: string
          client_phone: string
          deposit_amount: number
          end_time: string
          notes: string
          services: string
          start_time: string
          status: string
          total_amount: number
          yoco_link: string
        }[]
      }
      get_channel_roi: {
        Args: { p_tenant_id: string }
        Returns: {
          avg_basket: number
          booking_count: number
          channel: string
          total_revenue: number
        }[]
      }
      get_client_history: {
        Args: { p_email?: string; p_phone?: string }
        Returns: {
          booking_date: string
          booking_id: string
          services: string
          status: string
          time_slot: string
          total_amount: number
        }[]
      }
      get_loyalty_gap_analysis: {
        Args: { p_tenant_id: string }
        Returns: {
          avg_spend_per_visit: number
          ghost_regular_count: number
          potential_annual_revenue: number
          sample_client_names: string
        }[]
      }
      get_loyalty_tracker: {
        Args: never
        Returns: {
          client_name: string
          email: string
          last_wax_date: string
          location: string
          next_due_date: string
          notes: string
          overdue: boolean
          pack_progress: string
          phone: string
          status: string
          whatsapp_link: string
        }[]
      }
      get_month_availability: {
        Args: {
          p_duration_minutes?: number
          p_month: number
          p_staff_id: string
          p_year: number
        }
        Returns: {
          available_slots: string[]
          date_str: string
        }[]
      }
      get_new_client_conversion: {
        Args: { p_tenant_id: string }
        Returns: {
          avg_days_to_return: number
          conversion_rate_pct: number
          converted_to_repeat: number
          new_clients_90d: number
        }[]
      }
      get_new_vs_returning_clients:
        | {
            Args: { p_tenant_id: string }
            Returns: {
              new_clients: number
              returning_clients: number
            }[]
          }
        | {
            Args: {
              p_month_end: string
              p_month_start: string
              p_tenant_id: string
            }
            Returns: {
              new_clients: number
              returning_clients: number
              total_clients: number
            }[]
          }
      get_next_webhook: {
        Args: never
        Returns: {
          booking_id: string
          event_type: string
          id: string
          payload: Json
          retry_count: number
        }[]
      }
      get_nexty_business_context: {
        Args: { p_tenant_id: string }
        Returns: {
          deposit_percent: number
          is_mobile_business: boolean
        }[]
      }
      get_nexty_outside_candidates: {
        Args: { p_tenant_id: string }
        Returns: {
          avg_spend: number
          booking_count: number
          client_name: string
          days_since_last: number
          last_booking_date: string
          phone: string
          total_spend: number
        }[]
      }
      get_no_show_leakage: {
        Args: { p_tenant_id: string }
        Returns: {
          deposit_percent: number
          no_show_count: number
          no_show_rate: number
          total_bookings: number
          total_lost_revenue: number
        }[]
      }
      get_peak_time_analysis: {
        Args: { p_tenant_id: string }
        Returns: {
          peak_day: string
          peak_hour: number
          peak_hour_booking_count: number
          quietest_day: string
          quietest_day_booking_count: number
          total_analysed: number
        }[]
      }
      get_quiet_day_analysis: {
        Args: { p_tenant_id: string }
        Returns: {
          avg_daily_bookings: number
          booking_count: number
          capacity_percentage: number
          day_name: string
          day_of_week: number
        }[]
      }
      get_rebooking_rate_analysis: {
        Args: { p_rebook_window_days?: number; p_tenant_id: string }
        Returns: {
          avg_days_to_rebook: number
          rebooked_within_window: number
          rebooking_rate_pct: number
          total_first_time_clients: number
          window_days: number
        }[]
      }
      get_repeat_cancellers: {
        Args: { p_tenant_id: string }
        Returns: {
          cancel_count: number
          client_name: string
          days_since_cancel: number
          had_prior_completion: boolean
          last_cancel_date: string
          phone: string
        }[]
      }
      get_returning_clients_count: { Args: { month: string }; Returns: number }
      get_revenue_history: {
        Args: { days: number }
        Returns: {
          amount: number
          date: string
        }[]
      }
      get_revenue_per_minute: {
        Args: { p_tenant_id: string }
        Returns: {
          booking_count: number
          revenue_per_minute: number
          service_name: string
          total_minutes: number
          total_revenue: number
        }[]
      }
      get_revenue_split_analysis: {
        Args: { p_tenant_id: string }
        Returns: {
          avg_basket: number
          top_service_booking_count: number
          top_service_name: string
          top_service_pct: number
          top_service_revenue: number
          total_revenue: number
        }[]
      }
      get_salary_cycle_analysis: {
        Args: { p_tenant_id: string }
        Returns: {
          booking_count: number
          pct_of_total: number
          window_name: string
          window_revenue: number
        }[]
      }
      get_tenant_secret: {
        Args: { p_key: string; p_tenant_id: string }
        Returns: string
      }
      get_top_client_concentration: {
        Args: { p_tenant_id: string }
        Returns: {
          booking_count: number
          client_name: string
          days_since: number
          last_booking_date: string
          pct_of_revenue: number
          phone: string
          total_spend: number
        }[]
      }
      get_top_services: {
        Args: { month: string }
        Returns: {
          count: number
          name: string
          revenue: number
        }[]
      }
      get_travel_efficiency: {
        Args: { p_tenant_id: string }
        Returns: {
          avg_callout_revenue: number
          low_margin_avg_km: number
          low_margin_count: number
          low_margin_revenue: number
          rate_per_km: number
          total_callout_bookings: number
        }[]
      }
      get_unattributed_revenue: {
        Args: { p_tenant_id: string }
        Returns: {
          booking_count: number
          oldest_date: string
          total_revenue: number
        }[]
      }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      get_vault_secret: { Args: { secret_name: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      increment_webhook_retry: { Args: { row_id: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_platform_owner: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_tenant_admin: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      mark_platform_invoice_paid: {
        Args: {
          p_invoice_id: string
          p_notes?: string
          p_paid_at?: string
          p_payment_method?: string
          p_reference?: string
        }
        Returns: {
          activity_snapshot: Json
          activity_snapshot_generated_at: string | null
          amount_rands: number
          auto_paid: boolean | null
          billing_month: string | null
          checkout_provider: string
          checkout_url: string | null
          created_at: string
          due_date: string
          email_delivery_status: string
          email_sent_at: string | null
          external_transaction_id: string | null
          id: string
          invoice_issued_at: string | null
          invoice_number: string
          notes: string | null
          paid_at: string | null
          period_end: string
          period_start: string
          plan: string
          status: string
          tenant_id: string
          updated_at: string
          yoco_checkout_id: string | null
          yoco_payment_link: string | null
        }
        SetofOptions: {
          from: "*"
          to: "platform_invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_webhook_processed: {
        Args: {
          p_error_message?: string
          p_success: boolean
          p_webhook_id: string
        }
        Returns: boolean
      }
      next_invoice_number: { Args: never; Returns: string }
      normalise_phone: { Args: { p: string }; Returns: string }
      normalise_phone_za: { Args: { p: string }; Returns: string }
      recalculate_consistency_status: {
        Args: { p_canonical_client_id: string }
        Returns: undefined
      }
      record_mrr_snapshot: { Args: never; Returns: Json }
      release_slot_hold: {
        Args: { p_hold_id: string; p_session_token: string }
        Returns: undefined
      }
      replace_consistency_program_services: {
        Args: { p_program_id: string; p_rows: Json }
        Returns: undefined
      }
      replace_staff_availability: {
        Args: {
          p_day_of_week: number
          p_rows: Json
          p_specific_date: string
          p_staff_id: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      reschedule_booking: {
        Args: {
          p_booking_id: string
          p_new_date: string
          p_new_start_time: string
        }
        Returns: {
          booking_id: string
          message: string
          success: boolean
        }[]
      }
      save_staff_availability: {
        Args: {
          p_all_slots: string[]
          p_day_enabled: boolean
          p_day_of_week: number
          p_slots: string[]
          p_staff_id: string
          p_tenant_id: string
        }
        Returns: {
          buffer_minutes: number | null
          created_at: string | null
          day_enabled: boolean | null
          day_of_week: number
          id: string
          is_available: boolean | null
          override_reason: string | null
          requires_travel_buffer: boolean | null
          slot_end_time: string
          slot_start_time: string
          specific_date: string | null
          staff_id: string
          tenant_id: string
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "staff_availability"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      save_staff_daily_override: {
        Args: {
          p_all_slots: string[]
          p_day_enabled: boolean
          p_day_of_week: number
          p_delete_only?: boolean
          p_slots: string[]
          p_specific_date: string
          p_staff_id: string
          p_tenant_id: string
        }
        Returns: {
          buffer_minutes: number | null
          created_at: string | null
          day_enabled: boolean | null
          day_of_week: number
          id: string
          is_available: boolean | null
          override_reason: string | null
          requires_travel_buffer: boolean | null
          slot_end_time: string
          slot_start_time: string
          specific_date: string | null
          staff_id: string
          tenant_id: string
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "staff_availability"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_tenant_context: { Args: { tenant: string }; Returns: undefined }
      tenant_secret_exists: {
        Args: { p_key: string; p_tenant_id: string }
        Returns: boolean
      }
      track_feature_usage: {
        Args: {
          p_action?: string
          p_feature: string
          p_session_id?: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      update_booking_status: {
        Args: { p_booking_id: string; p_new_status: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      upsert_tenant_secret: {
        Args: { p_key: string; p_tenant_id: string; p_value: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "owner"
        | "admin"
        | "staff"
        | "client"
        | "platform_owner"
        | "super_admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "owner",
        "admin",
        "staff",
        "client",
        "platform_owner",
        "super_admin",
      ],
    },
  },
} as const
