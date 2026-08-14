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
    PostgrestVersion: "14.15"
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
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          at: string
          id: number
          ip: unknown
          row_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          at?: string
          id?: number
          ip?: unknown
          row_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          at?: string
          id?: number
          ip?: unknown
          row_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      checklist_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          offset_days: number
          owner_type: Database["public"]["Enums"]["owner_type"]
          sort_order: number
          template_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          offset_days?: number
          owner_type?: Database["public"]["Enums"]["owner_type"]
          sort_order?: number
          template_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          offset_days?: number
          owner_type?: Database["public"]["Enums"]["owner_type"]
          sort_order?: number
          template_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          created_at: string
          description: string | null
          event_type: Database["public"]["Enums"]["event_type"] | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          parent_id: string
          parent_type: Database["public"]["Enums"]["comment_parent"]
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          parent_id: string
          parent_type: Database["public"]["Enums"]["comment_parent"]
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          parent_id?: string
          parent_type?: Database["public"]["Enums"]["comment_parent"]
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commitments: {
        Row: {
          blocked_reason: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          detail: string | null
          due_date: string | null
          event_id: string | null
          follow_up_date: string | null
          id: string
          last_nudged_at: string | null
          owner_person_id: string | null
          owner_type: Database["public"]["Enums"]["owner_type"]
          project_id: string
          report_note: string | null
          reported_back_at: string | null
          requested_by: Database["public"]["Enums"]["owner_type"] | null
          requested_by_person_id: string | null
          source: Database["public"]["Enums"]["commitment_source"]
          source_note_id: string | null
          status: Database["public"]["Enums"]["commitment_status"]
          title: string
          updated_at: string
        }
        Insert: {
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          detail?: string | null
          due_date?: string | null
          event_id?: string | null
          follow_up_date?: string | null
          id?: string
          last_nudged_at?: string | null
          owner_person_id?: string | null
          owner_type?: Database["public"]["Enums"]["owner_type"]
          project_id: string
          report_note?: string | null
          reported_back_at?: string | null
          requested_by?: Database["public"]["Enums"]["owner_type"] | null
          requested_by_person_id?: string | null
          source?: Database["public"]["Enums"]["commitment_source"]
          source_note_id?: string | null
          status?: Database["public"]["Enums"]["commitment_status"]
          title: string
          updated_at?: string
        }
        Update: {
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          detail?: string | null
          due_date?: string | null
          event_id?: string | null
          follow_up_date?: string | null
          id?: string
          last_nudged_at?: string | null
          owner_person_id?: string | null
          owner_type?: Database["public"]["Enums"]["owner_type"]
          project_id?: string
          report_note?: string | null
          reported_back_at?: string | null
          requested_by?: Database["public"]["Enums"]["owner_type"] | null
          requested_by_person_id?: string | null
          source?: Database["public"]["Enums"]["commitment_source"]
          source_note_id?: string | null
          status?: Database["public"]["Enums"]["commitment_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_owner_person_id_fkey"
            columns: ["owner_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_requested_by_person_id_fkey"
            columns: ["requested_by_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_source_note_id_fkey"
            columns: ["source_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          created_at: string
          decided_at: string
          decided_by: string | null
          deleted_at: string | null
          event_id: string | null
          id: string
          project_id: string
          rationale: string | null
          reversible: boolean
          statement: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decided_at?: string
          decided_by?: string | null
          deleted_at?: string | null
          event_id?: string | null
          id?: string
          project_id: string
          rationale?: string | null
          reversible?: boolean
          statement: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decided_at?: string
          decided_by?: string | null
          deleted_at?: string | null
          event_id?: string | null
          id?: string
          project_id?: string
          rationale?: string | null
          reversible?: boolean
          statement?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      digests: {
        Row: {
          body: string
          created_at: string
          id: string
          period_end: string
          period_start: string
          recipients: string[]
          sent_at: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          recipients?: string[]
          sent_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          recipients?: string[]
          sent_at?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          deleted_at: string | null
          event_id: string | null
          id: string
          mime: string | null
          name: string
          project_id: string | null
          sensitivity: Database["public"]["Enums"]["sensitivity"]
          size_bytes: number | null
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          event_id?: string | null
          id?: string
          mime?: string | null
          name: string
          project_id?: string | null
          sensitivity?: Database["public"]["Enums"]["sensitivity"]
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          event_id?: string | null
          id?: string
          mime?: string | null
          name?: string
          project_id?: string | null
          sensitivity?: Database["public"]["Enums"]["sensitivity"]
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          event_id: string
          person_id: string
          role: Database["public"]["Enums"]["attendee_role"]
          rsvp: Database["public"]["Enums"]["rsvp_status"]
        }
        Insert: {
          event_id: string
          person_id: string
          role?: Database["public"]["Enums"]["attendee_role"]
          rsvp?: Database["public"]["Enums"]["rsvp_status"]
        }
        Update: {
          event_id?: string
          person_id?: string
          role?: Database["public"]["Enums"]["attendee_role"]
          rsvp?: Database["public"]["Enums"]["rsvp_status"]
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          agenda: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          ends_at: string | null
          external_id: string | null
          external_source: string | null
          external_updated_at: string | null
          id: string
          location: string | null
          project_id: string
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          template_id: string | null
          timezone: string
          title: string
          type: Database["public"]["Enums"]["event_type"]
          updated_at: string
          virtual_link: string | null
        }
        Insert: {
          agenda?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          ends_at?: string | null
          external_id?: string | null
          external_source?: string | null
          external_updated_at?: string | null
          id?: string
          location?: string | null
          project_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          template_id?: string | null
          timezone?: string
          title: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
          virtual_link?: string | null
        }
        Update: {
          agenda?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          ends_at?: string | null
          external_id?: string | null
          external_source?: string | null
          external_updated_at?: string | null
          id?: string
          location?: string | null
          project_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          template_id?: string | null
          timezone?: string
          title?: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
          virtual_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_items: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          processed: boolean
          project_id: string | null
          raw_text: string
          source: Database["public"]["Enums"]["inbox_source"]
          source_ref: string | null
          source_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          processed?: boolean
          project_id?: string | null
          raw_text: string
          source?: Database["public"]["Enums"]["inbox_source"]
          source_ref?: string | null
          source_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          processed?: boolean
          project_id?: string | null
          raw_text?: string
          source?: Database["public"]["Enums"]["inbox_source"]
          source_ref?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbox_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_credentials: {
        Row: {
          account_email: string | null
          connected_at: string
          provider: string
          refresh_token: string
          scopes: string | null
          updated_at: string
        }
        Insert: {
          account_email?: string | null
          connected_at?: string
          provider: string
          refresh_token: string
          scopes?: string | null
          updated_at?: string
        }
        Update: {
          account_email?: string | null
          connected_at?: string
          provider?: string
          refresh_token?: string
          scopes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      integration_state: {
        Row: {
          last_error: string | null
          last_run_at: string | null
          provider: string
          sync_token: string | null
          updated_at: string
        }
        Insert: {
          last_error?: string | null
          last_run_at?: string | null
          provider: string
          sync_token?: string | null
          updated_at?: string
        }
        Update: {
          last_error?: string | null
          last_run_at?: string | null
          provider?: string
          sync_token?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      milestones: {
        Row: {
          created_at: string
          id: string
          project_id: string
          status: Database["public"]["Enums"]["milestone_status"]
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["milestone_status"]
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["milestone_status"]
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      note_versions: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          note_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          note_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_versions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_versions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          deleted_at: string | null
          event_id: string | null
          extracted_at: string | null
          id: string
          person_id: string | null
          project_id: string | null
          sensitivity: Database["public"]["Enums"]["sensitivity"]
          title: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body?: string
          created_at?: string
          deleted_at?: string | null
          event_id?: string | null
          extracted_at?: string | null
          id?: string
          person_id?: string | null
          project_id?: string | null
          sensitivity?: Database["public"]["Enums"]["sensitivity"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          deleted_at?: string | null
          event_id?: string | null
          extracted_at?: string | null
          id?: string
          person_id?: string | null
          project_id?: string | null
          sensitivity?: Database["public"]["Enums"]["sensitivity"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string | null
          how_we_know_them: string | null
          id: string
          last_contact_at: string | null
          name: string
          next_touch_at: string | null
          notes: string | null
          org: string | null
          phone: string | null
          relationship: Database["public"]["Enums"]["relationship"]
          sensitivity: Database["public"]["Enums"]["sensitivity"]
          tags: string[]
          title: string | null
          updated_at: string
          what_matters_to_them: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          how_we_know_them?: string | null
          id?: string
          last_contact_at?: string | null
          name: string
          next_touch_at?: string | null
          notes?: string | null
          org?: string | null
          phone?: string | null
          relationship?: Database["public"]["Enums"]["relationship"]
          sensitivity?: Database["public"]["Enums"]["sensitivity"]
          tags?: string[]
          title?: string | null
          updated_at?: string
          what_matters_to_them?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          how_we_know_them?: string | null
          id?: string
          last_contact_at?: string | null
          name?: string
          next_touch_at?: string | null
          notes?: string | null
          org?: string | null
          phone?: string | null
          relationship?: Database["public"]["Enums"]["relationship"]
          sensitivity?: Database["public"]["Enums"]["sensitivity"]
          tags?: string[]
          title?: string | null
          updated_at?: string
          what_matters_to_them?: string | null
        }
        Relationships: []
      }
      processed_messages: {
        Row: {
          decision: string | null
          external_id: string
          id: number
          processed_at: string
          reason: string | null
          source: string
        }
        Insert: {
          decision?: string | null
          external_id: string
          id?: number
          processed_at?: string
          reason?: string | null
          source: string
        }
        Update: {
          decision?: string | null
          external_id?: string
          id?: number
          processed_at?: string
          reason?: string | null
          source?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          deleted_at: string | null
          health: Database["public"]["Enums"]["health"]
          health_note: string | null
          id: string
          name: string
          purpose: string | null
          sensitivity: Database["public"]["Enums"]["sensitivity"]
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          health?: Database["public"]["Enums"]["health"]
          health_note?: string | null
          id?: string
          name: string
          purpose?: string | null
          sensitivity?: Database["public"]["Enums"]["sensitivity"]
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          health?: Database["public"]["Enums"]["health"]
          health_note?: string | null
          id?: string
          name?: string
          purpose?: string | null
          sensitivity?: Database["public"]["Enums"]["sensitivity"]
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: []
      }
      routing_rules: {
        Row: {
          always: boolean
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["rule_kind"]
          project_id: string
          value: string
        }
        Insert: {
          always?: boolean
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["rule_kind"]
          project_id: string
          value: string
        }
        Update: {
          always?: boolean
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["rule_kind"]
          project_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "routing_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_project: { Args: { p_project_id: string }; Returns: boolean }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_member: { Args: never; Returns: boolean }
      is_privileged: { Args: never; Returns: boolean }
      project_is_restricted: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      storage_project_id: { Args: { object_name: string }; Returns: string }
    }
    Enums: {
      attendee_role: "host" | "attendee" | "speaker" | "optional"
      comment_parent: "commitment" | "event" | "note"
      commitment_source: "manual" | "meeting" | "import" | "email" | "checklist"
      commitment_status: "open" | "waiting" | "blocked" | "done" | "dropped"
      event_status: "planned" | "confirmed" | "done" | "cancelled"
      event_type: "meeting" | "convening" | "launch" | "deadline"
      health: "green" | "amber" | "red"
      inbox_source: "quick" | "email" | "share"
      milestone_status: "upcoming" | "hit" | "missed" | "moved"
      owner_type: "me" | "paul" | "heather" | "external"
      project_status: "active" | "paused" | "closed"
      relationship: "principal" | "advisor" | "partner" | "staff" | "external"
      rsvp_status: "unknown" | "yes" | "no" | "tentative"
      rule_kind: "sender" | "domain" | "keyword" | "attendee"
      sensitivity: "standard" | "sensitive" | "restricted"
      user_role: "reed" | "paul" | "heather"
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
      attendee_role: ["host", "attendee", "speaker", "optional"],
      comment_parent: ["commitment", "event", "note"],
      commitment_source: ["manual", "meeting", "import", "email", "checklist"],
      commitment_status: ["open", "waiting", "blocked", "done", "dropped"],
      event_status: ["planned", "confirmed", "done", "cancelled"],
      event_type: ["meeting", "convening", "launch", "deadline"],
      health: ["green", "amber", "red"],
      inbox_source: ["quick", "email", "share"],
      milestone_status: ["upcoming", "hit", "missed", "moved"],
      owner_type: ["me", "paul", "heather", "external"],
      project_status: ["active", "paused", "closed"],
      relationship: ["principal", "advisor", "partner", "staff", "external"],
      rsvp_status: ["unknown", "yes", "no", "tentative"],
      rule_kind: ["sender", "domain", "keyword", "attendee"],
      sensitivity: ["standard", "sensitive", "restricted"],
      user_role: ["reed", "paul", "heather"],
    },
  },
} as const
