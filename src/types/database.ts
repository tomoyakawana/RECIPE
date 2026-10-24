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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      cook_logs: {
        Row: {
          cooked_by: string
          cooked_on: string
          created_at: string
          id: string
          memo: string | null
          recipe_id: string
        }
        Insert: {
          cooked_by?: string
          cooked_on?: string
          created_at?: string
          id?: string
          memo?: string | null
          recipe_id: string
        }
        Update: {
          cooked_by?: string
          cooked_on?: string
          created_at?: string
          id?: string
          memo?: string | null
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cook_logs_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          amount: string
          id: string
          name: string
          position: number
          recipe_id: string
        }
        Insert: {
          amount?: string
          id?: string
          name: string
          position: number
          recipe_id: string
        }
        Update: {
          amount?: string
          id?: string
          name?: string
          position?: number
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_steps: {
        Row: {
          body: string
          id: string
          position: number
          recipe_id: string
        }
        Insert: {
          body: string
          id?: string
          position: number
          recipe_id: string
        }
        Update: {
          body?: string
          id?: string
          position?: number
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_steps_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          cook_minutes: number | null
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          image_path: string | null
          is_favorite: boolean
          note: string | null
          servings: number | null
          source_url: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          cook_minutes?: number | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          image_path?: string | null
          is_favorite?: boolean
          note?: string | null
          servings?: number | null
          source_url?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          cook_minutes?: number | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          image_path?: string | null
          is_favorite?: boolean
          note?: string | null
          servings?: number | null
          source_url?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      shared_notes: {
        Row: {
          body: string
          id: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: string
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      shopping_items: {
        Row: {
          amount: string | null
          created_at: string
          created_by: string
          id: string
          is_checked: boolean
          name: string
          recipe_id: string | null
        }
        Insert: {
          amount?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_checked?: boolean
          name: string
          recipe_id?: string | null
        }
        Update: {
          amount?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_checked?: boolean
          name?: string
          recipe_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_items: {
        Row: {
          added_by: string
          created_at: string
          id: string
          planned_on: string | null
          recipe_id: string
          requested_by: string | null
        }
        Insert: {
          added_by?: string
          created_at?: string
          id?: string
          planned_on?: string | null
          recipe_id: string
          requested_by?: string | null
        }
        Update: {
          added_by?: string
          created_at?: string
          id?: string
          planned_on?: string | null
          recipe_id?: string
          requested_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "todo_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          secret_mode: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          secret_mode?: boolean
          updated_at?: string
          user_id?: string
        }
        Update: {
          secret_mode?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_todo_ingredients_to_shopping: { Args: never; Returns: number }
      mark_cooked: {
        Args: { p_todo_id: string }
        Returns: {
          cooked_by: string
          cooked_on: string
          created_at: string
          id: string
          memo: string | null
          recipe_id: string
        }
        SetofOptions: {
          from: "*"
          to: "cook_logs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_recipe: {
        Args: { p_recipe_id: string }
        Returns: {
          added_by: string
          created_at: string
          id: string
          planned_on: string | null
          recipe_id: string
          requested_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "todo_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_recipe: {
        Args: {
          p_cook_minutes: number
          p_ingredients: Json
          p_recipe_id: string
          p_servings: number
          p_source_url: string
          p_steps: string[]
          p_tags: string[]
          p_title: string
        }
        Returns: string
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
    Enums: {},
  },
} as const
