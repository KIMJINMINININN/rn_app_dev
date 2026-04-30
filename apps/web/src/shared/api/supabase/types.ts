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
      ingredient_categories: {
        Row: {
          icon: string | null
          id: string
          name: string
          sort_order: number
          user_id: string | null
        }
        Insert: {
          icon?: string | null
          id?: string
          name: string
          sort_order?: number
          user_id?: string | null
        }
        Update: {
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number
          user_id?: string | null
        }
        Relationships: []
      }
      ingredient_master: {
        Row: {
          category_id: string | null
          default_shelf_life_days: number | null
          default_storage_kind:
            | Database["public"]["Enums"]["storage_kind"]
            | null
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          category_id?: string | null
          default_shelf_life_days?: number | null
          default_storage_kind?:
            | Database["public"]["Enums"]["storage_kind"]
            | null
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          category_id?: string | null
          default_shelf_life_days?: number | null
          default_storage_kind?:
            | Database["public"]["Enums"]["storage_kind"]
            | null
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_master_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ingredient_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_locations: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["storage_kind"]
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["storage_kind"]
          name: string
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["storage_kind"]
          name?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      user_ingredients: {
        Row: {
          consumed: boolean
          created_at: string
          expires_at: string | null
          id: string
          ingredient_master_id: string
          memo: string | null
          original_quantity: number | null
          purchased_at: string | null
          quantity: number
          storage_location_id: string
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          consumed?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          ingredient_master_id: string
          memo?: string | null
          original_quantity?: number | null
          purchased_at?: string | null
          quantity: number
          storage_location_id: string
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          consumed?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          ingredient_master_id?: string
          memo?: string | null
          original_quantity?: number | null
          purchased_at?: string | null
          quantity?: number
          storage_location_id?: string
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ingredients_ingredient_master_id_fkey"
            columns: ["ingredient_master_id"]
            isOneToOne: false
            referencedRelation: "ingredient_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_ingredients_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          display_name: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_ingredients_with_dday: {
        Row: {
          consumed: boolean | null
          created_at: string | null
          days_until_expiry: number | null
          expires_at: string | null
          id: string | null
          ingredient_master_id: string | null
          memo: string | null
          purchased_at: string | null
          quantity: number | null
          storage_location_id: string | null
          unit: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          consumed?: boolean | null
          created_at?: string | null
          days_until_expiry?: never
          expires_at?: string | null
          id?: string | null
          ingredient_master_id?: string | null
          memo?: string | null
          purchased_at?: string | null
          quantity?: number | null
          storage_location_id?: string | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          consumed?: boolean | null
          created_at?: string | null
          days_until_expiry?: never
          expires_at?: string | null
          id?: string | null
          ingredient_master_id?: string | null
          memo?: string | null
          purchased_at?: string | null
          quantity?: number | null
          storage_location_id?: string | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_ingredients_ingredient_master_id_fkey"
            columns: ["ingredient_master_id"]
            isOneToOne: false
            referencedRelation: "ingredient_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_ingredients_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_inventory_summary: {
        Args: { p_user: string }
        Returns: {
          expired: number
          expiring_soon: number
          total: number
        }[]
      }
      search_ingredient_masters: {
        Args: { p_limit?: number; p_query: string; p_user_id: string }
        Returns: {
          category_id: string
          default_shelf_life_days: number
          default_storage_kind: Database["public"]["Enums"]["storage_kind"]
          id: string
          name: string
          rank: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      storage_kind:
        | "fridge"
        | "freezer"
        | "room_temp"
        | "kimchi_fridge"
        | "custom"
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
    Enums: {
      storage_kind: [
        "fridge",
        "freezer",
        "room_temp",
        "kimchi_fridge",
        "custom",
      ],
    },
  },
} as const
