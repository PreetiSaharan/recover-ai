import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import UploadPage from './pages/UploadPage'
import ReportsPage from './pages/ReportsPage'
import BorrowerDetailPage from './pages/BorrowerDetailPage'
import MyCallsPage from './pages/MyCallsPage'
import MyCasesPage from './pages/MyCasesPage'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { ProtectedRoute } from '@/components/protected-route'
import { AppLayout } from '@/components/app-layout'

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Toaster />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/borrowers/:id" element={<BorrowerDetailPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/my-calls" element={<MyCallsPage />} />
              <Route path="/my-cases" element={<MyCasesPage />} />
              <Route path="/reports" element={<ReportsPage />} />
            </Route>
          </Route>
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
