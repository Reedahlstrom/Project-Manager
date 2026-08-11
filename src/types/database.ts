/**
 * Database types for Cadence.
 *
 * HAND-WRITTEN, TEMPORARILY. `supabase gen types` requires Docker, which isn't
 * available on this machine. These were written directly against
 * `supabase/migrations/20260811010000_schema_and_rls.sql` and verified by
 * applying that migration to a real Postgres 17.
 *
 * Replace this file with the real thing as soon as the CLI is linked:
 *
 *   npx supabase login
 *   npx supabase link --project-ref vgsfqcuhiliazgmjznje
 *   npm run db:types
 *
 * Known gap until then: `Relationships` is empty on every table, so nested
 * selects (`.select('*, project:projects(*)')`) will not be typed. The row
 * shapes themselves are correct.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// --- Enums ------------------------------------------------------------------

export type UserRole = 'reed' | 'paul' | 'heather'
export type Sensitivity = 'standard' | 'sensitive' | 'restricted'
export type ProjectStatus = 'active' | 'paused' | 'closed'
export type Health = 'green' | 'amber' | 'red'
export type Relationship = 'principal' | 'advisor' | 'partner' | 'staff' | 'external'
export type EventType = 'meeting' | 'convening' | 'launch' | 'deadline'
export type EventStatus = 'planned' | 'confirmed' | 'done' | 'cancelled'
export type AttendeeRole = 'host' | 'attendee' | 'speaker' | 'optional'
export type RsvpStatus = 'unknown' | 'yes' | 'no' | 'tentative'
export type OwnerType = 'me' | 'paul' | 'heather' | 'external'
export type CommitmentStatus = 'open' | 'waiting' | 'blocked' | 'done' | 'dropped'
export type CommitmentSource = 'manual' | 'meeting' | 'import' | 'email' | 'checklist'
export type MilestoneStatus = 'upcoming' | 'hit' | 'missed' | 'moved'
export type CommentParent = 'commitment' | 'event' | 'note'
export type InboxSource = 'quick' | 'email' | 'share'

// --- Row shapes -------------------------------------------------------------

type Timestamps = { created_at: string; updated_at: string }

export type ProfileRow = {
  id: string
  name: string
  role: UserRole
  email: string
  avatar_url: string | null
} & Timestamps

export type ProjectRow = {
  id: string
  name: string
  slug: string
  purpose: string | null
  status: ProjectStatus
  health: Health
  health_note: string | null
  sensitivity: Sensitivity
  sort_order: number
  deleted_at: string | null
} & Timestamps

export type PersonRow = {
  id: string
  name: string
  org: string | null
  title: string | null
  email: string | null
  phone: string | null
  relationship: Relationship
  how_we_know_them: string | null
  what_matters_to_them: string | null
  notes: string | null
  tags: string[]
  last_contact_at: string | null
  next_touch_at: string | null
  sensitivity: Sensitivity
  deleted_at: string | null
} & Timestamps

export type ChecklistTemplateRow = {
  id: string
  name: string
  event_type: EventType | null
  description: string | null
} & Timestamps

export type EventRow = {
  id: string
  project_id: string
  title: string
  type: EventType
  starts_at: string
  ends_at: string | null
  timezone: string
  location: string | null
  virtual_link: string | null
  status: EventStatus
  agenda: string | null
  template_id: string | null
  created_by: string | null
  deleted_at: string | null
} & Timestamps

export type EventAttendeeRow = {
  event_id: string
  person_id: string
  role: AttendeeRole
  rsvp: RsvpStatus
}

export type NoteRow = {
  id: string
  project_id: string | null
  event_id: string | null
  person_id: string | null
  title: string | null
  body: string
  author_id: string | null
  sensitivity: Sensitivity
  extracted_at: string | null
  deleted_at: string | null
} & Timestamps

export type NoteVersionRow = {
  id: string
  note_id: string
  body: string
  author_id: string | null
  created_at: string
}

export type CommitmentRow = {
  id: string
  project_id: string
  event_id: string | null
  title: string
  detail: string | null
  owner_type: OwnerType
  owner_person_id: string | null
  due_date: string | null
  follow_up_date: string | null
  status: CommitmentStatus
  blocked_reason: string | null
  source: CommitmentSource
  source_note_id: string | null
  last_nudged_at: string | null
  completed_at: string | null
  created_by: string | null
  deleted_at: string | null
} & Timestamps

export type DecisionRow = {
  id: string
  project_id: string
  event_id: string | null
  statement: string
  decided_by: string | null
  decided_at: string
  rationale: string | null
  reversible: boolean
  deleted_at: string | null
} & Timestamps

export type DocumentRow = {
  id: string
  project_id: string | null
  event_id: string | null
  name: string
  storage_path: string
  mime: string | null
  size_bytes: number | null
  uploaded_by: string | null
  sensitivity: Sensitivity
  deleted_at: string | null
} & Timestamps

export type ChecklistItemRow = {
  id: string
  template_id: string
  title: string
  offset_days: number
  owner_type: OwnerType
  category: string | null
  sort_order: number
} & Timestamps

export type MilestoneRow = {
  id: string
  project_id: string
  title: string
  target_date: string | null
  status: MilestoneStatus
} & Timestamps

export type CommentRow = {
  id: string
  parent_type: CommentParent
  parent_id: string
  author_id: string | null
  body: string
  created_at: string
}

export type InboxItemRow = {
  id: string
  raw_text: string
  source: InboxSource
  processed: boolean
  created_by: string | null
  created_at: string
}

export type DigestRow = {
  id: string
  period_start: string
  period_end: string
  body: string
  sent_at: string | null
  recipients: string[]
  created_at: string
}

export type AuditLogRow = {
  id: number
  actor_id: string | null
  action: string
  table_name: string
  row_id: string | null
  at: string
  ip: string | null
}

// --- Insert/Update derivation ------------------------------------------------
// Columns with a database default are optional on insert. `id`, `created_at`
// and `updated_at` always are.

type Generated = 'id' | 'created_at' | 'updated_at'

type InsertOf<T, Optional extends keyof T = never> = Omit<T, Extract<Generated, keyof T>> extends
  infer R
  ? Omit<R, Extract<Optional, keyof R>> & Partial<Pick<T, Extract<Optional | Generated, keyof T>>>
  : never

type UpdateOf<T> = Partial<T>

type Table<Row, Insert, Update> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, InsertOf<ProfileRow, 'avatar_url'>, UpdateOf<ProfileRow>>
      projects: Table<
        ProjectRow,
        InsertOf<
          ProjectRow,
          'purpose' | 'status' | 'health' | 'health_note' | 'sensitivity' | 'sort_order' | 'deleted_at'
        >,
        UpdateOf<ProjectRow>
      >
      people: Table<
        PersonRow,
        InsertOf<
          PersonRow,
          | 'org'
          | 'title'
          | 'email'
          | 'phone'
          | 'relationship'
          | 'how_we_know_them'
          | 'what_matters_to_them'
          | 'notes'
          | 'tags'
          | 'last_contact_at'
          | 'next_touch_at'
          | 'sensitivity'
          | 'deleted_at'
        >,
        UpdateOf<PersonRow>
      >
      checklist_templates: Table<
        ChecklistTemplateRow,
        InsertOf<ChecklistTemplateRow, 'event_type' | 'description'>,
        UpdateOf<ChecklistTemplateRow>
      >
      events: Table<
        EventRow,
        InsertOf<
          EventRow,
          | 'type'
          | 'ends_at'
          | 'timezone'
          | 'location'
          | 'virtual_link'
          | 'status'
          | 'agenda'
          | 'template_id'
          | 'created_by'
          | 'deleted_at'
        >,
        UpdateOf<EventRow>
      >
      event_attendees: Table<
        EventAttendeeRow,
        Omit<EventAttendeeRow, 'role' | 'rsvp'> & Partial<Pick<EventAttendeeRow, 'role' | 'rsvp'>>,
        UpdateOf<EventAttendeeRow>
      >
      notes: Table<
        NoteRow,
        InsertOf<
          NoteRow,
          | 'project_id'
          | 'event_id'
          | 'person_id'
          | 'title'
          | 'body'
          | 'author_id'
          | 'sensitivity'
          | 'extracted_at'
          | 'deleted_at'
        >,
        UpdateOf<NoteRow>
      >
      note_versions: Table<
        NoteVersionRow,
        InsertOf<NoteVersionRow, 'author_id'>,
        UpdateOf<NoteVersionRow>
      >
      commitments: Table<
        CommitmentRow,
        InsertOf<
          CommitmentRow,
          | 'event_id'
          | 'detail'
          | 'owner_type'
          | 'owner_person_id'
          | 'due_date'
          | 'follow_up_date'
          | 'status'
          | 'blocked_reason'
          | 'source'
          | 'source_note_id'
          | 'last_nudged_at'
          | 'completed_at'
          | 'created_by'
          | 'deleted_at'
        >,
        UpdateOf<CommitmentRow>
      >
      decisions: Table<
        DecisionRow,
        InsertOf<
          DecisionRow,
          'event_id' | 'decided_by' | 'decided_at' | 'rationale' | 'reversible' | 'deleted_at'
        >,
        UpdateOf<DecisionRow>
      >
      documents: Table<
        DocumentRow,
        InsertOf<
          DocumentRow,
          | 'project_id'
          | 'event_id'
          | 'mime'
          | 'size_bytes'
          | 'uploaded_by'
          | 'sensitivity'
          | 'deleted_at'
        >,
        UpdateOf<DocumentRow>
      >
      checklist_items: Table<
        ChecklistItemRow,
        InsertOf<ChecklistItemRow, 'offset_days' | 'owner_type' | 'category' | 'sort_order'>,
        UpdateOf<ChecklistItemRow>
      >
      milestones: Table<
        MilestoneRow,
        InsertOf<MilestoneRow, 'target_date' | 'status'>,
        UpdateOf<MilestoneRow>
      >
      comments: Table<CommentRow, InsertOf<CommentRow, 'author_id'>, UpdateOf<CommentRow>>
      inbox_items: Table<
        InboxItemRow,
        InsertOf<InboxItemRow, 'source' | 'processed' | 'created_by'>,
        UpdateOf<InboxItemRow>
      >
      digests: Table<
        DigestRow,
        InsertOf<DigestRow, 'sent_at' | 'recipients'>,
        UpdateOf<DigestRow>
      >
      audit_log: Table<
        AuditLogRow,
        Omit<AuditLogRow, 'id' | 'at'> & Partial<Pick<AuditLogRow, 'id' | 'at'>>,
        never
      >
    }
    Views: Record<never, never>
    Functions: {
      current_user_role: { Args: Record<PropertyKey, never>; Returns: UserRole }
      is_privileged: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_member: { Args: Record<PropertyKey, never>; Returns: boolean }
      project_is_restricted: { Args: { p_project_id: string }; Returns: boolean }
      can_access_project: { Args: { p_project_id: string }; Returns: boolean }
    }
    Enums: {
      user_role: UserRole
      sensitivity: Sensitivity
      project_status: ProjectStatus
      health: Health
      relationship: Relationship
      event_type: EventType
      event_status: EventStatus
      attendee_role: AttendeeRole
      rsvp_status: RsvpStatus
      owner_type: OwnerType
      commitment_status: CommitmentStatus
      commitment_source: CommitmentSource
      milestone_status: MilestoneStatus
      comment_parent: CommentParent
      inbox_source: InboxSource
    }
    CompositeTypes: Record<never, never>
  }
}

// --- Convenience -------------------------------------------------------------

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
