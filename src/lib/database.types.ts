// Generated from the Supabase schema (supabase gen types). Regenerate after migrations.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff: Json | null
          entity: string
          entity_id: string | null
          id: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff?: Json | null
          entity: string
          entity_id?: string | null
          id?: never
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json | null
          entity?: string
          entity_id?: string | null
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: 'audit_log_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      card_instances: {
        Row: {
          acquired_at: string
          acquired_from: string
          card_id: string
          foil: boolean
          id: string
          owner_id: string
          serial_number: number | null
        }
        Insert: {
          acquired_at?: string
          acquired_from?: string
          card_id: string
          foil?: boolean
          id?: string
          owner_id: string
          serial_number?: number | null
        }
        Update: {
          acquired_at?: string
          acquired_from?: string
          card_id?: string
          foil?: boolean
          id?: string
          owner_id?: string
          serial_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'card_instances_card_id_fkey'
            columns: ['card_id']
            isOneToOne: false
            referencedRelation: 'cards'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'card_instances_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      cards: {
        Row: {
          abilities: Json
          art_url: string | null
          attack: number
          created_at: string
          defense: number
          element: string
          flavor_text: string | null
          hp: number
          id: string
          is_active: boolean
          is_limited_edition: boolean
          max_print_run: number | null
          name: string
          number_in_set: number | null
          printed_count: number
          rarity_id: string
          set_id: string | null
          updated_at: string
        }
        Insert: {
          abilities?: Json
          art_url?: string | null
          attack?: number
          created_at?: string
          defense?: number
          element?: string
          flavor_text?: string | null
          hp?: number
          id?: string
          is_active?: boolean
          is_limited_edition?: boolean
          max_print_run?: number | null
          name: string
          number_in_set?: number | null
          printed_count?: number
          rarity_id: string
          set_id?: string | null
          updated_at?: string
        }
        Update: {
          abilities?: Json
          art_url?: string | null
          attack?: number
          created_at?: string
          defense?: number
          element?: string
          flavor_text?: string | null
          hp?: number
          id?: string
          is_active?: boolean
          is_limited_edition?: boolean
          max_print_run?: number | null
          name?: string
          number_in_set?: number | null
          printed_count?: number
          rarity_id?: string
          set_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cards_rarity_id_fkey'
            columns: ['rarity_id']
            isOneToOne: false
            referencedRelation: 'rarities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cards_set_id_fkey'
            columns: ['set_id']
            isOneToOne: false
            referencedRelation: 'sets'
            referencedColumns: ['id']
          },
        ]
      }
      drop_items: {
        Row: {
          card_id: string | null
          created_at: string
          drop_id: string
          id: string
          pack_id: string | null
          special_price_coins: number | null
        }
        Insert: {
          card_id?: string | null
          created_at?: string
          drop_id: string
          id?: string
          pack_id?: string | null
          special_price_coins?: number | null
        }
        Update: {
          card_id?: string | null
          created_at?: string
          drop_id?: string
          id?: string
          pack_id?: string | null
          special_price_coins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'drop_items_card_id_fkey'
            columns: ['card_id']
            isOneToOne: false
            referencedRelation: 'cards'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'drop_items_drop_id_fkey'
            columns: ['drop_id']
            isOneToOne: false
            referencedRelation: 'drops'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'drop_items_pack_id_fkey'
            columns: ['pack_id']
            isOneToOne: false
            referencedRelation: 'packs'
            referencedColumns: ['id']
          },
        ]
      }
      drops: {
        Row: {
          banner_url: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          is_published: boolean
          name: string
          season_id: string | null
          starts_at: string
          theme_color: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_published?: boolean
          name: string
          season_id?: string | null
          starts_at: string
          theme_color?: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_published?: boolean
          name?: string
          season_id?: string | null
          starts_at?: string
          theme_color?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'drops_season_id_fkey'
            columns: ['season_id']
            isOneToOne: false
            referencedRelation: 'seasons'
            referencedColumns: ['id']
          },
        ]
      }
      game_settings: {
        Row: {
          daily_reward_coins: number
          daily_reward_gems: number
          id: number
          market_fee_pct: number
          starting_coins: number
          starting_gems: number
          updated_at: string
        }
        Insert: {
          daily_reward_coins?: number
          daily_reward_gems?: number
          id?: number
          market_fee_pct?: number
          starting_coins?: number
          starting_gems?: number
          updated_at?: string
        }
        Update: {
          daily_reward_coins?: number
          daily_reward_gems?: number
          id?: number
          market_fee_pct?: number
          starting_coins?: number
          starting_gems?: number
          updated_at?: string
        }
        Relationships: []
      }
      market_listings: {
        Row: {
          buyer_id: string | null
          card_instance_id: string
          created_at: string
          id: string
          price_coins: number
          seller_id: string
          sold_at: string | null
          status: string
        }
        Insert: {
          buyer_id?: string | null
          card_instance_id: string
          created_at?: string
          id?: string
          price_coins: number
          seller_id: string
          sold_at?: string | null
          status?: string
        }
        Update: {
          buyer_id?: string | null
          card_instance_id?: string
          created_at?: string
          id?: string
          price_coins?: number
          seller_id?: string
          sold_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'market_listings_buyer_id_fkey'
            columns: ['buyer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'market_listings_card_instance_id_fkey'
            columns: ['card_instance_id']
            isOneToOne: false
            referencedRelation: 'card_instances'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'market_listings_seller_id_fkey'
            columns: ['seller_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      pack_card_pool: {
        Row: {
          card_id: string
          pack_id: string
          weight: number
        }
        Insert: {
          card_id: string
          pack_id: string
          weight?: number
        }
        Update: {
          card_id?: string
          pack_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: 'pack_card_pool_card_id_fkey'
            columns: ['card_id']
            isOneToOne: false
            referencedRelation: 'cards'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pack_card_pool_pack_id_fkey'
            columns: ['pack_id']
            isOneToOne: false
            referencedRelation: 'packs'
            referencedColumns: ['id']
          },
        ]
      }
      pack_openings: {
        Row: {
          id: string
          opened_at: string
          pack_id: string | null
          price_coins: number
          price_gems: number
          results: Json
          user_id: string
        }
        Insert: {
          id?: string
          opened_at?: string
          pack_id?: string | null
          price_coins?: number
          price_gems?: number
          results?: Json
          user_id: string
        }
        Update: {
          id?: string
          opened_at?: string
          pack_id?: string | null
          price_coins?: number
          price_gems?: number
          results?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pack_openings_pack_id_fkey'
            columns: ['pack_id']
            isOneToOne: false
            referencedRelation: 'packs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pack_openings_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      packs: {
        Row: {
          art_url: string | null
          available_from: string | null
          available_until: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_limited_edition: boolean
          name: string
          per_user_limit: number | null
          price_coins: number | null
          price_gems: number | null
          season_id: string | null
          slots: Json
          sold_count: number
          sort_order: number
          theme_color: string
          total_supply: number | null
          updated_at: string
        }
        Insert: {
          art_url?: string | null
          available_from?: string | null
          available_until?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_limited_edition?: boolean
          name: string
          per_user_limit?: number | null
          price_coins?: number | null
          price_gems?: number | null
          season_id?: string | null
          slots?: Json
          sold_count?: number
          sort_order?: number
          theme_color?: string
          total_supply?: number | null
          updated_at?: string
        }
        Update: {
          art_url?: string | null
          available_from?: string | null
          available_until?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_limited_edition?: boolean
          name?: string
          per_user_limit?: number | null
          price_coins?: number | null
          price_gems?: number | null
          season_id?: string | null
          slots?: Json
          sold_count?: number
          sort_order?: number
          theme_color?: string
          total_supply?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'packs_season_id_fkey'
            columns: ['season_id']
            isOneToOne: false
            referencedRelation: 'seasons'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          coins: number
          created_at: string
          gems: number
          id: string
          is_banned: boolean
          last_daily_claim: string | null
          role: Database['public']['Enums']['app_role']
          updated_at: string
          username: string
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          coins?: number
          created_at?: string
          gems?: number
          id: string
          is_banned?: boolean
          last_daily_claim?: string | null
          role?: Database['public']['Enums']['app_role']
          updated_at?: string
          username: string
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          coins?: number
          created_at?: string
          gems?: number
          id?: string
          is_banned?: boolean
          last_daily_claim?: string | null
          role?: Database['public']['Enums']['app_role']
          updated_at?: string
          username?: string
          xp?: number
        }
        Relationships: []
      }
      rarities: {
        Row: {
          color: string
          created_at: string
          glow: string
          id: string
          name: string
          points: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          glow?: string
          id?: string
          name: string
          points?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          glow?: string
          id?: string
          name?: string
          points?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          banner_url: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          name: string
          slug: string
          starts_at: string | null
          status: string
          theme_color: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          name: string
          slug: string
          starts_at?: string | null
          status?: string
          theme_color?: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          name?: string
          slug?: string
          starts_at?: string | null
          status?: string
          theme_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      sets: {
        Row: {
          code: string
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          name: string
          season_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
          season_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          season_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sets_season_id_fkey'
            columns: ['season_id']
            isOneToOne: false
            referencedRelation: 'seasons'
            referencedColumns: ['id']
          },
        ]
      }
      trades: {
        Row: {
          created_at: string
          from_user: string
          id: string
          message: string | null
          offered_coins: number
          offered_instance_ids: string[]
          requested_instance_ids: string[]
          resolved_at: string | null
          status: string
          to_user: string
        }
        Insert: {
          created_at?: string
          from_user: string
          id?: string
          message?: string | null
          offered_coins?: number
          offered_instance_ids?: string[]
          requested_instance_ids?: string[]
          resolved_at?: string | null
          status?: string
          to_user: string
        }
        Update: {
          created_at?: string
          from_user?: string
          id?: string
          message?: string | null
          offered_coins?: number
          offered_instance_ids?: string[]
          requested_instance_ids?: string[]
          resolved_at?: string | null
          status?: string
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: 'trades_from_user_fkey'
            columns: ['from_user']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'trades_to_user_fkey'
            columns: ['to_user']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      transactions: {
        Row: {
          coins_delta: number
          created_at: string
          gems_delta: number
          id: string
          note: string | null
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          coins_delta?: number
          created_at?: string
          gems_delta?: number
          id?: string
          note?: string | null
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          coins_delta?: number
          created_at?: string
          gems_delta?: number
          id?: string
          note?: string | null
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'transactions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      buy_and_open_pack: {
        Args: { p_currency?: string; p_pack_id: string }
        Returns: Json
      }
      buy_listing: { Args: { p_listing_id: string }; Returns: string }
      cancel_listing: { Args: { p_listing_id: string }; Returns: undefined }
      claim_daily_reward: { Args: never; Returns: Json }
      create_trade: {
        Args: {
          p_message?: string
          p_offered: string[]
          p_offered_coins?: number
          p_requested: string[]
          p_to_user: string
        }
        Returns: string
      }
      get_leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          avatar_url: string
          cards_owned: number
          collection_score: number
          unique_cards: number
          user_id: string
          username: string
          xp: number
        }[]
      }
      get_owner_stats: { Args: never; Returns: Json }
      is_owner: { Args: never; Returns: boolean }
      list_on_market: {
        Args: { p_instance_id: string; p_price: number }
        Returns: string
      }
      owner_grant_card: {
        Args: { p_card_id: string; p_user_id: string }
        Returns: string
      }
      owner_grant_currency: {
        Args: { p_coins: number; p_gems: number; p_note?: string; p_user_id: string }
        Returns: undefined
      }
      owner_set_ban: {
        Args: { p_banned: boolean; p_user_id: string }
        Returns: undefined
      }
      respond_trade: {
        Args: { p_action: string; p_trade_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role: 'player' | 'owner'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']
