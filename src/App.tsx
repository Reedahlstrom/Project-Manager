import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { NotFound } from '@/routes/NotFound'
import { Paul } from '@/routes/Paul'
import { People } from '@/routes/People'
import { Projects } from '@/routes/Projects'
import { Scorecard } from '@/routes/Scorecard'
import { Today } from '@/routes/Today'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<Today />} />
        <Route path="/paul" element={<Paul />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/people" element={<People />} />
        <Route path="/scorecard" element={<Scorecard />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
