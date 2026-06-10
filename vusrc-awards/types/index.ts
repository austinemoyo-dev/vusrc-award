export interface Student {
  id: string
  matric_number: string
  full_name: string
  department: string | null
  level: string | null
  phone_number: string | null
  pin_hash: string | null
  pin_set: boolean
  initializer_device: string | null
  initializer_locked: boolean
  failed_attempts: number
  locked_until: string | null
  session_token: string | null
  session_expires: string | null
  last_login_at: string | null
  created_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string
  banner_url: string | null
  day_number: number | null
  opens_at: string | null
  closes_at: string | null
  is_visible: boolean
  is_open: boolean
  is_revealed: boolean
  display_order: number
  created_at: string
}

export interface Nominee {
  id: string
  category_id: string
  full_name: string
  photo_url: string
  bio: string | null
  department: string | null
  level: string | null
  override_votes: number
  created_at: string
}

export interface Vote {
  id: string
  student_id: string
  nominee_id: string
  category_id: string
  voted_at: string
}

export interface Admin {
  id: string
  email: string
  password_hash: string
  role: 'admin' | 'superadmin'
  created_at: string
}

export interface VoteOverride {
  id: string
  superadmin_id: string
  nominee_id: string
  category_id: string
  transfer_to_nominee_id: string | null
  action: 'add' | 'remove' | 'transfer'
  votes_delta: number
  reason: string
  performed_at: string
}

export interface PinResetLog {
  id: string
  student_id: string
  reset_by: string
  reset_at: string
}

export interface DeviceRegistry {
  id: string
  device_fingerprint: string
  initialized_for: string | null
  initialized_at: string
}

export interface DisplayState {
  id: string
  current_category_id: string | null
  current_screen: 'intro' | 'parade' | 'drumroll' | 'reveal' | 'leaderboard'
  updated_at: string
}

// API response shapes
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
}

// JWT payload shapes (decoded from token)
export interface StudentPayload {
  studentId: string
  matricNumber: string
}

export interface AdminPayload {
  adminId: string
  role: 'admin' | 'superadmin'
}

// Vote count aggregation (used in results views)
export interface NomineeVoteCount {
  nominee_id: string
  full_name: string
  photo_url: string
  department: string | null
  level: string | null
  vote_count: number
  override_votes: number
  total_votes: number
}
