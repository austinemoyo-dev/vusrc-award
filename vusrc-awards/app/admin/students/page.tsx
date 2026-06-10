import { createServiceClient } from '@/lib/supabase/server'
import { StudentsClient } from '@/components/admin/StudentsClient'

export default async function StudentsPage() {
  const supabase = createServiceClient()

  const [studentsRes, votesRes] = await Promise.all([
    supabase
      .from('students')
      .select('id, matric_number, full_name, department, level, pin_set, initializer_device, last_login_at, failed_attempts, locked_until')
      .order('full_name'),
    supabase.from('votes').select('student_id'),
  ])

  const voteCountMap: Record<string, number> = {}
  for (const v of votesRes.data ?? []) {
    const sid = v.student_id as string
    voteCountMap[sid] = (voteCountMap[sid] ?? 0) + 1
  }

  const students = (studentsRes.data ?? []).map((s) => ({
    id: s.id as string,
    matric_number: s.matric_number as string,
    full_name: s.full_name as string,
    department: s.department as string | null,
    level: s.level as string | null,
    pin_set: s.pin_set as boolean,
    device_bound: (s.initializer_device as string | null) !== null,
    last_login_at: s.last_login_at as string | null,
    failed_attempts: s.failed_attempts as number,
    locked_until: s.locked_until as string | null,
    vote_count: voteCountMap[s.id as string] ?? 0,
  }))

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <StudentsClient initialStudents={students} />
    </div>
  )
}
