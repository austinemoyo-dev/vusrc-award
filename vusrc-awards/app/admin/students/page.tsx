import { createServiceClient } from '@/lib/supabase/server'
import { StudentsClient } from '@/components/admin/StudentsClient'

const PAGE_SIZE = 1000

// Supabase/PostgREST caps each request at 1000 rows — page through until exhausted.
async function fetchAllRows<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null }>
): Promise<T[]> {
  const all: T[] = []
  let from = 0
  for (;;) {
    const { data } = await query(from, from + PAGE_SIZE - 1)
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return all
}

export default async function StudentsPage() {
  const supabase = createServiceClient()

  const [studentsData, votesData, displayState] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from('students')
        .select('id, matric_number, full_name, department, level, phone_number, pin_set, initializer_device, last_login_at, failed_attempts, locked_until')
        .order('full_name')
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase.from('votes').select('student_id').range(from, to)
    ),
    supabase.from('display_state').select('registration_open').limit(1).maybeSingle(),
  ])

  const registrationOpen = (displayState.data?.registration_open as boolean | null) ?? true

  const voteCountMap: Record<string, number> = {}
  for (const v of votesData) {
    const sid = v.student_id as string
    voteCountMap[sid] = (voteCountMap[sid] ?? 0) + 1
  }

  const students = studentsData.map((s) => ({
    id: s.id as string,
    matric_number: s.matric_number as string,
    full_name: s.full_name as string,
    department: s.department as string | null,
    level: s.level as string | null,
    phone_number: s.phone_number as string | null,
    pin_set: s.pin_set as boolean,
    device_bound: (s.initializer_device as string | null) !== null,
    last_login_at: s.last_login_at as string | null,
    failed_attempts: s.failed_attempts as number,
    locked_until: s.locked_until as string | null,
    vote_count: voteCountMap[s.id as string] ?? 0,
  }))

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <StudentsClient initialStudents={students} initialRegistrationOpen={registrationOpen} />
    </div>
  )
}
