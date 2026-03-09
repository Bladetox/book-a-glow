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
      booking_items: {
        Row: {
          booking_id: string
          created_at: string | null
          duration_minutes: number
          id: string
          price: number
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
          booking_date: string
          call_out_address: string | null
          call_out_distance_km: number | null
          call_out_fee: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          client_id: string
          client_notes: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string | null
          deposit_amount: number
          deposit_paid: boolean | null
          end_time: string
          full_payment_received: boolean | null
          id: string
          is_call_out: boolean | null
          last_webhook_id: string | null
          notes: string | null
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
          yoco_link: string | null
        }
        Insert: {
          booking_date: string
          call_out_address?: string | null
          call_out_distance_km?: number | null
          call_out_fee?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_id: string
          client_notes?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deposit_amount: number
          deposit_paid?: boolean | null
          end_time: string
          full_payment_received?: boolean | null
          id?: string
          is_call_out?: boolean | null
          last_webhook_id?: string | null
          notes?: string | null
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
          yoco_link?: string | null
        }
        Update: {
          booking_date?: string
          call_out_address?: string | null
          call_out_distance_km?: number | null
          call_out_fee?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_id?: string
          client_notes?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deposit_amount?: number
          deposit_paid?: boolean | null
          end_time?: string
          full_payment_received?: boolean | null
          id?: string
          is_call_out?: boolean | null
          last_webhook_id?: string | null
          notes?: string | null
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
          yoco_link?: string | null
        }
        Relationships: [
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
        ]
      }
      loyalty_tracker: {
        Row: {
          bought_3pack: boolean | null
          client_id: string | null
          client_name: string
          created_at: string | null
          email: string | null
          id: string
          invite_sent: boolean | null
          last_wax_date: string | null
          location: string | null
          next_due_date: string | null
          notes: string | null
          overdue: boolean | null
          pack_progress: string | null
          phone: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
          whatsapp_link: string | null
        }
        Insert: {
          bought_3pack?: boolean | null
          client_id?: string | null
          client_name: string
          created_at?: string | null
          email?: string | null
          id?: string
          invite_sent?: boolean | null
          last_wax_date?: string | null
          location?: string | null
          next_due_date?: string | null
          notes?: string | null
          overdue?: boolean | null
          pack_progress?: string | null
          phone?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          whatsapp_link?: string | null
        }
        Update: {
          bought_3pack?: boolean | null
          client_id?: string | null
          client_name?: string
          created_at?: string | null
          email?: string | null
          id?: string
          invite_sent?: boolean | null
          last_wax_date?: string | null
          location?: string | null
          next_due_date?: string | null
          notes?: string | null
          overdue?: boolean | null
          pack_progress?: string | null
          phone?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          whatsapp_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_tracker_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          client_id: string
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
          client_id: string
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
          client_id?: string
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
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      reviews_cache: {
        Row: {
          author_name: string | null
          author_photo_url: string | null
          fetched_at: string | null
          google_place_id: string | null
          id: string
          publish_time: string | null
          rating: number | null
          relative_time: string | null
          review_text: string | null
          tenant_id: string
        }
        Insert: {
          author_name?: string | null
          author_photo_url?: string | null
          fetched_at?: string | null
          google_place_id?: string | null
          id?: string
          publish_time?: string | null
          rating?: number | null
          relative_time?: string | null
          review_text?: string | null
          tenant_id: string
        }
        Update: {
          author_name?: string | null
          author_photo_url?: string | null
          fetched_at?: string | null
          google_place_id?: string | null
          id?: string
          publish_time?: string | null
          rating?: number | null
          relative_time?: string | null
          review_text?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          category: string
          created_at: string | null
          deposit_percent: number | null
          description: string | null
          duration_minutes: number
          id: string
          image_url: string | null
          is_active: boolean | null
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
          duration_minutes: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
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
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_call_out_available?: boolean | null
          name?: string
          price?: number
          tags?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
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
          staff_id: string
          tenant_id: string
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
          stock_on_hand?: number
          tenant_id?: string
          total_cost?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tenants: {
        Row: {
          address: string | null
          created_at: string | null
          currency: string | null
          custom_domain: string | null
          email: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          owner_id: string | null
          phone: string | null
          theme_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          currency?: string | null
          custom_domain?: string | null
          email?: string | null
          id: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          owner_id?: string | null
          phone?: string | null
          theme_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          currency?: string | null
          custom_domain?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          theme_id?: string | null
          updated_at?: string | null
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_service_to_booking: {
        Args: { p_booking_id: string; p_service_id: string }
        Returns: {
          message: string
          new_balance: number
          new_total: number
          success: boolean
        }[]
      }
      calculate_booking_price: {
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
          p_additional_notes?: string
          p_allergies?: string
          p_booking_date: string
          p_callout_address?: string
          p_callout_distance_km?: number
          p_client_id: string
          p_client_notes?: string
          p_client_type?: string
          p_environmental_exposure?: string
          p_hair_length_ok?: string
          p_health_conditions?: string
          p_is_callout?: boolean
          p_lead_source?: string
          p_medications?: string
          p_physical_factors?: string
          p_pregnancy?: string
          p_service_ids: string[]
          p_skin_conditions?: string
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
      current_tenant_id: { Args: never; Returns: string }
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
      get_available_slots: {
        Args: { p_date: string; p_staff_id: string }
        Returns: {
          is_available: boolean
          slot_end: string
          slot_start: string
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
        Args: { p_month: number; p_staff_id: string; p_year: number }
        Returns: {
          available_slots: string[]
          date_str: string
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
      get_returning_clients_count: { Args: { month: string }; Returns: number }
      get_revenue_history: {
        Args: { days: number }
        Returns: {
          amount: number
          date: string
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
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_tenant_admin: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      mark_webhook_processed: {
        Args: {
          p_error_message?: string
          p_success: boolean
          p_webhook_id: string
        }
        Returns: boolean
      }
      reschedule_booking: {
        Args: {
          p_booking_id: string
          p_new_date: string
          p_new_start_time: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      set_tenant_context: { Args: { tenant: string }; Returns: undefined }
      update_booking_status: {
        Args: { p_booking_id: string; p_new_status: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "staff" | "client"
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
      app_role: ["owner", "admin", "staff", "client"],
    },
  },
} as const
