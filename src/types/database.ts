export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      availability: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          start_time: string
          walker_id: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
          walker_id: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
          walker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_walker_id_fkey"
            columns: ["walker_id"]
            isOneToOne: false
            referencedRelation: "walker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_dates: {
        Row: {
          created_at: string | null
          date: string
          id: string
          reason: string | null
          walker_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          reason?: string | null
          walker_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          reason?: string | null
          walker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_dates_walker_id_fkey"
            columns: ["walker_id"]
            isOneToOne: false
            referencedRelation: "walker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          blocks_slot: boolean
          booking_date: string
          capacity: number
          client_id: string
          created_at: string | null
          end_date: string | null
          end_time: string | null
          id: string
          is_holiday: boolean
          payment_id: string | null
          pet_id: string | null
          pet_ids: string[] | null
          reopened_slots: Json | null
          service_id: string
          start_time: string
          status: string
          walker_id: string
        }
        Insert: {
          blocks_slot?: boolean
          booking_date: string
          capacity?: number
          client_id: string
          created_at?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_holiday?: boolean
          payment_id?: string | null
          pet_id?: string | null
          pet_ids?: string[] | null
          reopened_slots?: Json | null
          service_id: string
          start_time: string
          status?: string
          walker_id: string
        }
        Update: {
          blocks_slot?: boolean
          booking_date?: string
          capacity?: number
          client_id?: string
          created_at?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_holiday?: boolean
          payment_id?: string | null
          pet_id?: string | null
          pet_ids?: string[] | null
          reopened_slots?: Json | null
          service_id?: string
          start_time?: string
          status?: string
          walker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_walker_id_fkey"
            columns: ["walker_id"]
            isOneToOne: false
            referencedRelation: "walker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_reads: {
        Row: {
          conversation_id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_reads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          client_id: string
          created_at: string
          id: string
          last_message_at: string
          last_message_preview: string
          walker_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string
          walker_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string
          walker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_walker_id_fkey"
            columns: ["walker_id"]
            isOneToOne: false
            referencedRelation: "walker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_user_id: string | null
          name: string | null
          result: string
          walker_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_user_id?: string | null
          name?: string | null
          result: string
          walker_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_user_id?: string | null
          name?: string | null
          result?: string
          walker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_invites_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invites_walker_id_fkey"
            columns: ["walker_id"]
            isOneToOne: false
            referencedRelation: "walker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ical_cache: {
        Row: {
          events_json: Json
          fetched_at: string
          import_id: string
          last_modified: string | null
        }
        Insert: {
          events_json?: Json
          fetched_at?: string
          import_id: string
          last_modified?: string | null
        }
        Update: {
          events_json?: Json
          fetched_at?: string
          import_id?: string
          last_modified?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ical_cache_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: true
            referencedRelation: "ical_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      ical_imports: {
        Row: {
          created_at: string | null
          id: string
          label: string
          url: string
          walker_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          url: string
          walker_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          url?: string
          walker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ical_imports_walker_id_fkey"
            columns: ["walker_id"]
            isOneToOne: false
            referencedRelation: "walker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          event_type: string | null
          id: string
          kind: string
          link: string | null
          sender_user_id: string | null
        }
        Insert: {
          body?: string
          conversation_id: string
          created_at?: string
          event_type?: string | null
          id?: string
          kind?: string
          link?: string | null
          sender_user_id?: string | null
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          event_type?: string | null
          id?: string
          kind?: string
          link?: string | null
          sender_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reads: {
        Row: {
          last_seen_at: string
          payment_id: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          payment_id: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          payment_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reads_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          platform_fee_cents: number
          receipt_url: string | null
          refunded_amount_cents: number
          source: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          tip_cents: number
          total_cents: number
          updated_at: string
          walker_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          platform_fee_cents?: number
          receipt_url?: string | null
          refunded_amount_cents?: number
          source?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tip_cents?: number
          total_cents?: number
          updated_at?: string
          walker_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          platform_fee_cents?: number
          receipt_url?: string | null
          refunded_amount_cents?: number
          source?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tip_cents?: number
          total_cents?: number
          updated_at?: string
          walker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_walker_id_fkey"
            columns: ["walker_id"]
            isOneToOne: false
            referencedRelation: "walker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          age: number | null
          allergies: string | null
          avatar_url: string | null
          birthday: string | null
          breed: string | null
          created_at: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          friendly_with_cats: string | null
          friendly_with_dogs: string | null
          friendly_with_kids: string | null
          house_trained: boolean | null
          id: string
          left_alone_hours: number | null
          medication: string | null
          name: string
          notes: string | null
          pet_type: string
          sex: string | null
          spayed_neutered: boolean | null
          triggers: string | null
          user_id: string
          vet_contact: string | null
          weight: number | null
        }
        Insert: {
          age?: number | null
          allergies?: string | null
          avatar_url?: string | null
          birthday?: string | null
          breed?: string | null
          created_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          friendly_with_cats?: string | null
          friendly_with_dogs?: string | null
          friendly_with_kids?: string | null
          house_trained?: boolean | null
          id?: string
          left_alone_hours?: number | null
          medication?: string | null
          name: string
          notes?: string | null
          pet_type?: string
          sex?: string | null
          spayed_neutered?: boolean | null
          triggers?: string | null
          user_id: string
          vet_contact?: string | null
          weight?: number | null
        }
        Update: {
          age?: number | null
          allergies?: string | null
          avatar_url?: string | null
          birthday?: string | null
          breed?: string | null
          created_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          friendly_with_cats?: string | null
          friendly_with_dogs?: string | null
          friendly_with_kids?: string | null
          house_trained?: boolean | null
          id?: string
          left_alone_hours?: number | null
          medication?: string | null
          name?: string
          notes?: string | null
          pet_type?: string
          sex?: string | null
          spayed_neutered?: boolean | null
          triggers?: string | null
          user_id?: string
          vet_contact?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          device_type: string | null
          endpoint: string
          id: string
          keys: Json
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_type?: string | null
          endpoint: string
          id?: string
          keys: Json
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_type?: string | null
          endpoint?: string
          id?: string
          keys?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount_cents: number
          booking_ids: string[] | null
          created_at: string
          id: string
          payment_id: string
          reason: string | null
          status: string
          stripe_refund_id: string
        }
        Insert: {
          amount_cents: number
          booking_ids?: string[] | null
          created_at?: string
          id?: string
          payment_id: string
          reason?: string | null
          status: string
          stripe_refund_id: string
        }
        Update: {
          amount_cents?: number
          booking_ids?: string[] | null
          created_at?: string
          id?: string
          payment_id?: string
          reason?: string | null
          status?: string
          stripe_refund_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string
          client_id: string
          comment: string | null
          created_at: string | null
          id: string
          rating: number
          walker_id: string
        }
        Insert: {
          booking_id: string
          client_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating: number
          walker_id: string
        }
        Update: {
          booking_id?: string
          client_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number
          walker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_walker_id_fkey"
            columns: ["walker_id"]
            isOneToOne: false
            referencedRelation: "walker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean | null
          blocks_slot: boolean
          buffer_after_minutes: number
          created_at: string | null
          description: string | null
          duration_minutes: number
          extra_pet_rate_cents: number
          holiday_rate_cents: number | null
          id: string
          name: string
          price_cents: number
          service_type: string
          walker_id: string
        }
        Insert: {
          active?: boolean | null
          blocks_slot?: boolean
          buffer_after_minutes?: number
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          extra_pet_rate_cents?: number
          holiday_rate_cents?: number | null
          id?: string
          name: string
          price_cents?: number
          service_type?: string
          walker_id: string
        }
        Update: {
          active?: boolean | null
          blocks_slot?: boolean
          buffer_after_minutes?: number
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          extra_pet_rate_cents?: number
          holiday_rate_cents?: number | null
          id?: string
          name?: string
          price_cents?: number
          service_type?: string
          walker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_walker_id_fkey"
            columns: ["walker_id"]
            isOneToOne: false
            referencedRelation: "walker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          favourite_walkers: string[] | null
          id: string
          lat: number | null
          lng: number | null
          name: string
          notification_preferences: Json
          phone: string | null
          postcode: string | null
          setup_completed_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          favourite_walkers?: string[] | null
          id: string
          lat?: number | null
          lng?: number | null
          name?: string
          notification_preferences?: Json
          phone?: string | null
          postcode?: string | null
          setup_completed_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          favourite_walkers?: string[] | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          notification_preferences?: Json
          phone?: string | null
          postcode?: string | null
          setup_completed_at?: string | null
        }
        Relationships: []
      }
      walker_profiles: {
        Row: {
          bio: string | null
          business_name: string
          calendar_feed_token: string | null
          cover_url: string | null
          created_at: string | null
          customer_invite_consent_at: string | null
          id: string
          is_default: boolean | null
          lat: number | null
          lng: number | null
          postcode: string | null
          setup_completed_at: string | null
          slug: string
          stripe_account_id: string | null
          stripe_charges_enabled: boolean
          theme_color: string | null
          user_id: string
        }
        Insert: {
          bio?: string | null
          business_name?: string
          calendar_feed_token?: string | null
          cover_url?: string | null
          created_at?: string | null
          customer_invite_consent_at?: string | null
          id?: string
          is_default?: boolean | null
          lat?: number | null
          lng?: number | null
          postcode?: string | null
          setup_completed_at?: string | null
          slug: string
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          theme_color?: string | null
          user_id: string
        }
        Update: {
          bio?: string | null
          business_name?: string
          calendar_feed_token?: string | null
          cover_url?: string | null
          created_at?: string | null
          customer_invite_consent_at?: string | null
          id?: string
          is_default?: boolean | null
          lat?: number | null
          lng?: number | null
          postcode?: string | null
          setup_completed_at?: string | null
          slug?: string
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          theme_color?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "walker_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_conversation_unread_counts: {
        Args: never
        Returns: {
          conversation_id: string
          unread_count: number
        }[]
      }
      get_unread_payment_ids: {
        Args: never
        Returns: {
          payment_id: string
        }[]
      }
      user_in_conversation: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

