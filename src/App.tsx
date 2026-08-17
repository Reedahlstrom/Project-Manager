import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { useAuth } from '@/contexts/auth-context'
import { NotFound } from '@/routes/NotFound'
import { Paul } from '@/routes/Paul'
import { People } from '@/routes/People'
import { Playbook } from '@/routes/Playbook'
import { ProjectDetail } from '@/routes/ProjectDetail'
import { Projects } from '@/routes/Projects'
import { Scorecard } from '@/routes/Scorecard'
import { Settings } from '@/routes/Settings'
import { SignIn } from '@/routes/SignIn'
import { Today } from '@/routes/Today'

export default function App() {
  const { session, loading, profileMissing } = useAuth()

  if (loading) {
    return <div className="min-h-dvh bg-bg" />
  }

  if (!session) {
    return <SignIn />
  }

  // Signing in is not the same as having access. Every RLS policy runs through
  // is_member(), which looks for a profiles row — without one you would see a
  // working app containing nothing, which reads as a broken database rather
  // than a missing account.
  if (profileMissing) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg px-6 text-center">
        <div className="max-w-sm">
          <p className="t-page">No profile</p>
          <p className="mt-2 t-body">
            You&rsquo;re signed in, but there&rsquo;s no matching row in{' '}
            <code className="text-text-2">profiles</code>, so the database will show you
            nothing. Add one with the right role and reload.
          </p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<Today />} />
        <Route path="/paul" element={<Paul />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:slug" element={<ProjectDetail />} />
        <Route path="/people" element={<People />} />
        <Route path="/playbook" element={<Playbook />} />
        <Route path="/scorecard" element={<Scorecard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
