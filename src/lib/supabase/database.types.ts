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
      categories: {
        Row: {
          archived_at: string | null
          created_at: string
          description: string
          id: string
          image_path: string | null
          is_visible: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          description?: string
          id?: string
          image_path?: string | null
          is_visible?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          description?: string
          id?: string
          image_path?: string | null
          is_visible?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_slug_history: {
        Row: {
          category_id: string
          created_at: string
          slug: string
        }
        Insert: {
          category_id: string
          created_at?: string
          slug: string
        }
        Update: {
          category_id?: string
          created_at?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_slug_history_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_banners: {
        Row: {
          alt_text: string
          button_label: string | null
          created_at: string
          ends_at: string | null
          id: string
          image_path: string
          is_visible: boolean
          link_path: string | null
          sort_order: number
          starts_at: string | null
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          alt_text?: string
          button_label?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_path: string
          is_visible?: boolean
          link_path?: string | null
          sort_order?: number
          starts_at?: string | null
          subtitle?: string
          title: string
          updated_at?: string
        }
        Update: {
          alt_text?: string
          button_label?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_path?: string
          is_visible?: boolean
          link_path?: string | null
          sort_order?: number
          starts_at?: string | null
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          color: string
          id: string
          line_total_kopecks: number
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          size: string
          sku: string
          unit_price_kopecks: number
          variant_id: string | null
        }
        Insert: {
          color: string
          id?: string
          line_total_kopecks: number
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          size: string
          sku: string
          unit_price_kopecks: number
          variant_id?: string | null
        }
        Update: {
          color?: string
          id?: string
          line_total_kopecks?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          size?: string
          sku?: string
          unit_price_kopecks?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_product_id_fkey"
            columns: ["variant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "product_id"]
          },
        ]
      }
      orders: {
        Row: {
          checkout_session_hash: string | null
          city: string
          comment: string
          created_at: string
          currency: string
          customer_name: string
          customer_phone: string
          delivery_address: string
          delivery_method: string
          id: string
          idempotency_key: string
          inventory_released_at: string | null
          order_number: number
          request_fingerprint: string
          status: string
          total_kopecks: number
          updated_at: string
        }
        Insert: {
          checkout_session_hash?: string | null
          city: string
          comment?: string
          created_at?: string
          currency?: string
          customer_name: string
          customer_phone: string
          delivery_address: string
          delivery_method: string
          id?: string
          idempotency_key: string
          inventory_released_at?: string | null
          order_number?: never
          request_fingerprint: string
          status?: string
          total_kopecks: number
          updated_at?: string
        }
        Update: {
          checkout_session_hash?: string | null
          city?: string
          comment?: string
          created_at?: string
          currency?: string
          customer_name?: string
          customer_phone?: string
          delivery_address?: string
          delivery_method?: string
          id?: string
          idempotency_key?: string
          inventory_released_at?: string | null
          order_number?: never
          request_fingerprint?: string
          status?: string
          total_kopecks?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          category_id: string
          product_id: string
        }
        Insert: {
          category_id: string
          product_id: string
        }
        Update: {
          category_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string
          created_at: string
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          alt_text?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          alt_text?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color: string
          created_at: string
          id: string
          is_active: boolean
          product_id: string
          size: string
          sku: string
          stock: number
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          is_active?: boolean
          product_id: string
          size: string
          sku: string
          stock?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          product_id?: string
          size?: string
          sku?: string
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          characteristics: Json
          created_at: string
          currency: string
          description: string
          id: string
          is_featured: boolean
          is_new: boolean
          material: string
          name: string
          old_price_kopecks: number | null
          price_kopecks: number
          published_at: string | null
          sku: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          characteristics?: Json
          created_at?: string
          currency?: string
          description?: string
          id?: string
          is_featured?: boolean
          is_new?: boolean
          material?: string
          name: string
          old_price_kopecks?: number | null
          price_kopecks: number
          published_at?: string | null
          sku: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          characteristics?: Json
          created_at?: string
          currency?: string
          description?: string
          id?: string
          is_featured?: boolean
          is_new?: boolean
          material?: string
          name?: string
          old_price_kopecks?: number | null
          price_kopecks?: number
          published_at?: string | null
          sku?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          is_public: boolean
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          is_public?: boolean
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_category_write: {
        Args: {
          p_category_id: string
          p_command?: string
          p_expected_version?: string
          p_request_id: string
          p_values: Json
        }
        Returns: string
      }
      admin_product_cleanup: { Args: { p_done?: string }; Returns: string[] }
      admin_product_search: {
        Args: {
          p_category?: string
          p_page?: number
          p_query?: string
          p_sort?: string
          p_status?: string
        }
        Returns: Json
      }
      admin_product_upload: {
        Args: {
          p_digest: string
          p_extension: string
          p_image_id: string
          p_product_id: string
          p_ready?: boolean
        }
        Returns: string
      }
      admin_product_write: {
        Args: {
          p_command?: string
          p_expected_version?: string
          p_product_id: string
          p_request_id: string
          p_values: Json
        }
        Returns: string
      }
      catalog_search: {
        Args: {
          category_id?: string
          colors?: string[]
          in_stock?: boolean
          max_price?: number
          min_price?: number
          only_new?: boolean
          only_sale?: boolean
          page_number?: number
          page_size?: number
          query_text?: string
          sizes?: string[]
          sort_order?: string
        }
        Returns: Json
      }
      checkout_status: {
        Args: { p_key: string; p_session: string }
        Returns: Json
      }
      checkout_submit: {
        Args: { p_key: string; p_session: string; p_values: Json }
        Returns: Json
      }
      checkout_throttle: { Args: { p_keys: string[] }; Returns: boolean }
      is_store_admin: { Args: never; Returns: boolean }
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
