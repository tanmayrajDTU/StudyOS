'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProfile,
  updateProfile,
  exportUserData,
  importUserData,
  wipeUserData,
  getActivityLogs
} from '@/actions/db'
import {
  Loader2,
  Settings,
  User,
  Clock,
  Check,
  AlertCircle,
  Download,
  Upload,
  Trash2,
  Activity,
  ShieldAlert
} from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'

interface ActivityLog {
  id: string
  action_type: string
  description: string
  created_at: string
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'profile' | 'portability' | 'logs'>('profile')

  // Profile Form States
  const [name, setName] = useState('')
  const [targetHours, setTargetHours] = useState('4.0')
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Danger Zone States
  const [confirmWipeText, setConfirmWipeText] = useState('')
  const [isWiping, setIsWiping] = useState(false)

  // 1. Queries
  const { data: profile = null, isLoading: loadingProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => getProfile(),
  })

  const { data: logsData = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: () => getActivityLogs(),
    enabled: activeTab === 'logs'
  })

  const logs = logsData as unknown as ActivityLog[]

  // Sync state on load
  useEffect(() => {
    if (profile) {
      setName(profile.full_name || '')
      setTargetHours(profile.daily_target_hours?.toString() || '4.0')
    }
  }, [profile])

  // 2. Mutations
  const updateMutation = useMutation({
    mutationFn: (updates: { full_name: string; daily_target_hours: number }) =>
      updateProfile(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['app-stats'] })
      setSuccessMsg('Settings saved successfully!')
      setTimeout(() => setSuccessMsg(''), 3000)
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Failed to update settings.'
      setErrorMsg(message)
      setTimeout(() => setErrorMsg(''), 4000)
    },
  })

  const importMutation = useMutation({
    mutationFn: (importData: unknown) => importUserData(importData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['app-stats'] })
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      queryClient.invalidateQueries({ queryKey: ['roadmap'] })
      queryClient.invalidateQueries({ queryKey: ['today-roadmap'] })
      setSuccessMsg('Database restored successfully from backup file!')
      setTimeout(() => setSuccessMsg(''), 6000)
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Failed to import backup data.'
      setErrorMsg(message)
      setTimeout(() => setErrorMsg(''), 5000)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMsg('')
    setErrorMsg('')

    const parsedHours = parseFloat(targetHours)
    if (isNaN(parsedHours) || parsedHours <= 0 || parsedHours > 24) {
      setErrorMsg('Daily target hours must be between 0.1 and 24.0.')
      return
    }

    updateMutation.mutate({
      full_name: name.trim() || 'Tanmay Raj',
      daily_target_hours: parsedHours,
    })
  }

  // 3. Export File Handler
  const handleExport = async () => {
    try {
      setSuccessMsg('')
      setErrorMsg('')
      const data = await exportUserData()
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2)
      )}`
      
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute('href', jsonString)
      downloadAnchor.setAttribute(
        'download',
        `studyos-backup-${new Date().toISOString().split('T')[0]}.json`
      )
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      
      setSuccessMsg('Backup exported successfully!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch {
      setErrorMsg('Export failed. Please try again.')
    }
  }

  // 4. Import File Handler
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader()
    const files = e.target.files
    if (!files || files.length === 0) return

    setSuccessMsg('')
    setErrorMsg('')

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string)
        importMutation.mutate(parsed)
      } catch {
        setErrorMsg('Invalid JSON backup file.')
      }
    }
    fileReader.readAsText(files[0])
  }

  // 5. Danger Zone Wipe Handler
  const handleWipe = async () => {
    if (confirmWipeText !== 'RESET') return
    setIsWiping(true)
    setSuccessMsg('')
    setErrorMsg('')

    try {
      await wipeUserData()
      queryClient.invalidateQueries()
      setSuccessMsg('All study planner database records have been wiped.')
      setConfirmWipeText('')
      setTimeout(() => setSuccessMsg(''), 5000)
    } catch {
      setErrorMsg('Wipe action failed. Please try again.')
    } finally {
      setIsWiping(false)
    }
  }

  if (loadingProfile) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-12">
      {/* Header and Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="h-5.5 w-5.5 text-primary" />
            Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your study configurations, data backups, and logs.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 bg-secondary/35 p-1 rounded-xl border border-border/40 text-xs font-semibold self-start md:self-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'profile' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('portability')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'portability' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Backup &amp; Reset
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'logs' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Activity Logs
          </button>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {successMsg && (
        <div className="rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 p-4 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <Check className="h-4 w-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg bg-destructive/10 text-destructive border border-destructive/20 p-4 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tab 1: Profile & Target */}
      {activeTab === 'profile' && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Tanmay Raj"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            {/* Daily Target Hours field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Daily Study Target (Hours)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="24.0"
                placeholder="e.g. 4.0"
                value={targetHours}
                onChange={(e) => setTargetHours(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono"
              />
              <p className="text-3xs text-muted-foreground leading-normal">
                This daily study hour target is dynamically evaluated to schedule syllabus milestones in the study calendar.
              </p>
            </div>

            {/* Submit button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="rounded-lg bg-foreground text-background font-medium px-5 py-2 hover:opacity-90 active:scale-95 transition-all text-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Settings</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Backup & Reset */}
      {activeTab === 'portability' && (
        <div className="space-y-6">
          {/* Backup controls card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-sm font-bold text-foreground">Data Backups</h2>
              <p className="text-xs text-muted-foreground">
                Export your current study progress database structure or restore it from a backup file.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Export */}
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/35 p-4 hover:bg-secondary/60 hover:border-border/80 transition-all text-xs font-semibold text-foreground cursor-pointer"
              >
                <Download className="h-4.5 w-4.5 text-primary" />
                <div className="text-left">
                  <p className="text-foreground">Export Data Backup</p>
                  <p className="text-4xs text-muted-foreground font-normal mt-0.5">Download workspace as JSON</p>
                </div>
              </button>

              {/* Import */}
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  disabled={importMutation.isPending}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <button
                  disabled={importMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/35 p-4 hover:bg-secondary/60 hover:border-border/80 transition-all text-xs font-semibold text-foreground disabled:opacity-50"
                >
                  {importMutation.isPending ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin text-primary" />
                  ) : (
                    <Upload className="h-4.5 w-4.5 text-primary" />
                  )}
                  <div className="text-left">
                    <p className="text-foreground">Restore Data Backup</p>
                    <p className="text-4xs text-muted-foreground font-normal mt-0.5">Upload exported JSON file</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-6 shadow-sm space-y-6">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5.5 w-5.5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h2 className="text-sm font-bold text-red-500">Danger Zone</h2>
                <p className="text-xs text-red-500/80 leading-normal">
                  Resetting the database wipes all subjects, modules, lectures, links, revisions, and roadmap schedule history. This action is irreversible.
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-red-500/10">
              <div className="space-y-2">
                <label className="text-3xs font-extrabold uppercase text-red-500 tracking-widest font-mono">
                  To confirm, type <span className="underline font-black">RESET</span> below:
                </label>
                <input
                  type="text"
                  placeholder="RESET"
                  value={confirmWipeText}
                  onChange={(e) => setConfirmWipeText(e.target.value)}
                  className="w-full bg-secondary border border-red-500/20 focus:border-red-500 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none font-mono"
                />
              </div>

              <button
                onClick={handleWipe}
                disabled={confirmWipeText !== 'RESET' || isWiping}
                className="w-full bg-red-500 text-white font-bold text-xs py-2 px-4 rounded-lg hover:bg-red-600 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:hover:bg-red-500 disabled:cursor-not-allowed"
              >
                {isWiping ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Wiping Database...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Reset Workspace Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Activity Logs */}
      {activeTab === 'logs' && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-primary" />
              Recent Activity Logs
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Auditing of recent planner actions, database exports, imports, and wipes.
            </p>
          </div>

          {loadingLogs ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-6">No recent actions logged.</p>
          ) : (
            <div className="relative border-l border-border/50 ml-2 space-y-6 py-2 text-xs">
              {logs.map((log: ActivityLog) => (
                <div key={log.id} className="relative pl-6">
                  {/* Timeline point */}
                  <div className="absolute -left-1.5 top-1 h-3.5 w-3.5 rounded-full border border-border bg-card flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-bold text-foreground font-mono text-3xs bg-secondary/50 border border-border/30 px-1.5 py-0.5 rounded">
                        {log.action_type}
                      </span>
                      <span className="text-4xs text-muted-foreground font-mono">
                        {formatDistanceToNow(parseISO(log.created_at))} ago
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-normal pl-0.5">{log.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
