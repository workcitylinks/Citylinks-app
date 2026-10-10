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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ads: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          priority: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          priority?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          priority?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bill_items: {
        Row: {
          bill_id: string
          created_at: string
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          bill_id: string
          created_at?: string
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Update: {
          bill_id?: string
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "merchant_products"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          bill_number: string
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          discount_amount: number
          id: string
          merchant_id: string
          notes: string | null
          payment_method: string
          payment_status: string
          subtotal: number
          tax_amount: number
          total_amount: number
        }
        Insert: {
          bill_number: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number
          id?: string
          merchant_id: string
          notes?: string | null
          payment_method?: string
          payment_status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
        }
        Update: {
          bill_number?: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number
          id?: string
          merchant_id?: string
          notes?: string | null
          payment_method?: string
          payment_status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "bills_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          location_id: string | null
          tier: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          tier: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          tier?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          message_type: string
          recipient_id: string
          reference_id: string | null
          reference_type: string | null
          sender_id: string
          subject: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          recipient_id: string
          reference_id?: string | null
          reference_type?: string | null
          sender_id: string
          subject: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          recipient_id?: string
          reference_id?: string | null
          reference_type?: string | null
          sender_id?: string
          subject?: string
        }
        Relationships: []
      }
      labor_availability: {
        Row: {
          created_at: string
          date: string
          end_time: string | null
          id: string
          is_available: boolean
          labor_id: string
          reason: string | null
          start_time: string | null
        }
        Insert: {
          created_at?: string
          date: string
          end_time?: string | null
          id?: string
          is_available?: boolean
          labor_id: string
          reason?: string | null
          start_time?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          is_available?: boolean
          labor_id?: string
          reason?: string | null
          start_time?: string | null
        }
        Relationships: []
      }
      labor_profiles: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          bank_account_number: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          labor_id_number: string | null
          pan_number: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          bank_account_number?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          labor_id_number?: string | null
          pan_number?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          bank_account_number?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          labor_id_number?: string | null
          pan_number?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      labor_services: {
        Row: {
          category: string
          created_at: string
          description: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean
          labor_id: string
          service_name: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          labor_id: string
          service_name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          labor_id?: string
          service_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      merchant_change_requests: {
        Row: {
          changes: Json
          created_at: string
          id: string
          merchant_id: string
          rejection_reason: string | null
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          changes?: Json
          created_at?: string
          id?: string
          merchant_id: string
          rejection_reason?: string | null
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          changes?: Json
          created_at?: string
          id?: string
          merchant_id?: string
          rejection_reason?: string | null
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_change_requests_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_products: {
        Row: {
          category_id: string | null
          cost_price: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_online: boolean
          merchant_id: string
          name: string
          price: number
          sku: string | null
          stock_quantity: number
          unit: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_online?: boolean
          merchant_id: string
          name: string
          price?: number
          sku?: string | null
          stock_quantity?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_online?: boolean
          merchant_id?: string
          name?: string
          price?: number
          sku?: string | null
          stock_quantity?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "merchant_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_products_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          address: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          bank_name: string | null
          business_name: string
          business_type: string
          city: string | null
          created_at: string
          district: string | null
          email: string | null
          gst_number: string | null
          hobli_id: string | null
          id: string
          logo_url: string | null
          onboarding_complete: boolean
          onboarding_step: number
          pan_number: string | null
          phone: string | null
          pincode: string | null
          state: string | null
          taluq: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          business_name: string
          business_type?: string
          city?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          gst_number?: string | null
          hobli_id?: string | null
          id?: string
          logo_url?: string | null
          onboarding_complete?: boolean
          onboarding_step?: number
          pan_number?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          taluq?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          business_name?: string
          business_type?: string
          city?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          gst_number?: string | null
          hobli_id?: string | null
          id?: string
          logo_url?: string | null
          onboarding_complete?: boolean
          onboarding_step?: number
          pan_number?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          taluq?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchants_hobli_id_fkey"
            columns: ["hobli_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          merchant_id: string | null
          merchant_name: string
          merchant_status: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id?: string | null
          merchant_name?: string
          merchant_status?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string | null
          merchant_name?: string
          merchant_status?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "merchant_products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_id: string
          delivery_address: string
          id: string
          need_labor: boolean
          notes: string | null
          order_number: string
          status: string
          subtotal: number
          total_amount: number
          transport_price: number
          transport_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          delivery_address: string
          id?: string
          need_labor?: boolean
          notes?: string | null
          order_number: string
          status?: string
          subtotal?: number
          total_amount?: number
          transport_price?: number
          transport_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          delivery_address?: string
          id?: string
          need_labor?: boolean
          notes?: string | null
          order_number?: string
          status?: string
          subtotal?: number
          total_amount?: number
          transport_price?: number
          transport_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          aadhaar_number: string | null
          account_status: string
          address: string | null
          avatar_url: string | null
          created_at: string
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          pan_number: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          aadhaar_number?: string | null
          account_status?: string
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          pan_number?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          aadhaar_number?: string | null
          account_status?: string
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          pan_number?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      service_bookings: {
        Row: {
          address: string | null
          created_at: string
          customer_id: string
          id: string
          labor_id: string
          notes: string | null
          rating: number | null
          review: string | null
          scheduled_date: string
          scheduled_time: string | null
          service_id: string | null
          status: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          customer_id: string
          id?: string
          labor_id: string
          notes?: string | null
          rating?: number | null
          review?: string | null
          scheduled_date: string
          scheduled_time?: string | null
          service_id?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          labor_id?: string
          notes?: string | null
          rating?: number | null
          review?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          service_id?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "labor_services"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_id: string
          description: string
          id: string
          location_id: string | null
          priority: string
          status: string
          subject: string
          ticket_number: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_id: string
          description: string
          id?: string
          location_id?: string | null
          priority?: string
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string
          description?: string
          id?: string
          location_id?: string | null
          priority?: string
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_bookings: {
        Row: {
          booking_type: string
          created_at: string
          customer_id: string
          distance_km: number | null
          dropoff_address: string
          fare_amount: number | null
          id: string
          notes: string | null
          pickup_address: string
          rating: number | null
          review: string | null
          scheduled_date: string
          scheduled_time: string | null
          status: string
          transporter_id: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          booking_type?: string
          created_at?: string
          customer_id: string
          distance_km?: number | null
          dropoff_address: string
          fare_amount?: number | null
          id?: string
          notes?: string | null
          pickup_address: string
          rating?: number | null
          review?: string | null
          scheduled_date: string
          scheduled_time?: string | null
          status?: string
          transporter_id: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          booking_type?: string
          created_at?: string
          customer_id?: string
          distance_km?: number | null
          dropoff_address?: string
          fare_amount?: number | null
          id?: string
          notes?: string | null
          pickup_address?: string
          rating?: number | null
          review?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          status?: string
          transporter_id?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_bookings_transporter_id_fkey"
            columns: ["transporter_id"]
            isOneToOne: false
            referencedRelation: "transporters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "transporter_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      transporter_vehicles: {
        Row: {
          capacity: string | null
          created_at: string
          id: string
          is_active: boolean
          registration_number: string | null
          transporter_id: string
          vehicle_name: string
          vehicle_type: string
        }
        Insert: {
          capacity?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          registration_number?: string | null
          transporter_id: string
          vehicle_name: string
          vehicle_type: string
        }
        Update: {
          capacity?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          registration_number?: string | null
          transporter_id?: string
          vehicle_name?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transporter_vehicles_transporter_id_fkey"
            columns: ["transporter_id"]
            isOneToOne: false
            referencedRelation: "transporters"
            referencedColumns: ["id"]
          },
        ]
      }
      transporters: {
        Row: {
          address: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          bank_account_number: string | null
          business_permit_number: string | null
          city: string | null
          created_at: string
          district: string | null
          dl_number: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          pan_number: string | null
          phone: string | null
          state: string | null
          updated_at: string
          user_id: string
          vehicle_number: string | null
        }
        Insert: {
          address?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          bank_account_number?: string | null
          business_permit_number?: string | null
          city?: string | null
          created_at?: string
          district?: string | null
          dl_number?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          pan_number?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          vehicle_number?: string | null
        }
        Update: {
          address?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          bank_account_number?: string | null
          business_permit_number?: string | null
          city?: string | null
          created_at?: string
          district?: string | null
          dl_number?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          pan_number?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          vehicle_number?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_order_item: {
        Args: { _merchant_id: string; _order_id: string }
        Returns: boolean
      }
      current_user_merchant_ids: { Args: never; Returns: string[] }
      customer_owns_order: { Args: { _order_id: string }; Returns: boolean }
      get_featured_ads: {
        Args: { _limit?: number }
        Returns: {
          category: string
          description: string
          id: string
          image_url: string
          link_url: string
          priority: number
          title: string
        }[]
      }
      get_marketplace_popular_items: {
        Args: { _limit?: number }
        Returns: {
          badge: string
          entity_id: string
          entity_type: string
          link_url: string
          popularity: number
          price_label: string
          subtitle: string
          title: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      merchant_can_view_order: { Args: { _order_id: string }; Returns: boolean }
      merchant_customer_ids_for_current_user: { Args: never; Returns: string[] }
      user_can_view_order: { Args: { _order_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "customer"
        | "merchant"
        | "employee"
        | "labor"
        | "transportation"
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
      app_role: ["customer", "merchant", "employee", "labor", "transportation"],
    },
  },
} as const
