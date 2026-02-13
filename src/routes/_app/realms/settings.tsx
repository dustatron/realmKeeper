import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { useContainer } from '~/ui/hooks/useContainer'
import { PageHeader } from '~/components/shared/PageHeader'
import { EmptyState } from '~/components/shared/EmptyState'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Settings, Save } from 'lucide-react'

export const Route = createFileRoute('/_app/realms/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const realm = useActiveRealm()
  const container = useContainer()

  const [daysPerSeason, setDaysPerSeason] = useState(30)
  const [daysPerWeek, setDaysPerWeek] = useState(7)
  const [watchesPerDay, setWatchesPerDay] = useState(3)
  const [factionTurnTrigger, setFactionTurnTrigger] = useState<'day' | 'week' | 'manual'>('day')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (realm) {
      setDaysPerSeason(realm.daysPerSeason)
      setDaysPerWeek(realm.daysPerWeek)
      setWatchesPerDay(realm.watchesPerDay)
      setFactionTurnTrigger(realm.factionTurnTrigger)
    }
  }, [realm?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!realm) {
    return <EmptyState icon={Settings} title="No realm selected" />
  }

  const handleSave = async () => {
    await container.realmRepo.update({
      ...realm,
      daysPerSeason: clamp(daysPerSeason, 10, 90),
      daysPerWeek: clamp(daysPerWeek, 5, 10),
      watchesPerDay: clamp(watchesPerDay, 2, 6),
      factionTurnTrigger,
      updatedAt: Date.now(),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6 p-4">
      <PageHeader title="Settings" description="Configure calendar and world settings for this realm." />

      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
          <CardDescription>How time flows in your world.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="daysPerSeason">Days per season (month)</Label>
              <Input
                id="daysPerSeason"
                type="number"
                min={10}
                max={90}
                value={daysPerSeason}
                onChange={(e) => setDaysPerSeason(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">10 &ndash; 90</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="daysPerWeek">Days per week</Label>
              <Input
                id="daysPerWeek"
                type="number"
                min={5}
                max={10}
                value={daysPerWeek}
                onChange={(e) => setDaysPerWeek(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">5 &ndash; 10</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="watchesPerDay">Watches per day</Label>
              <Input
                id="watchesPerDay"
                type="number"
                min={2}
                max={6}
                value={watchesPerDay}
                onChange={(e) => setWatchesPerDay(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">2 &ndash; 6</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Faction Turns</CardTitle>
          <CardDescription>When faction turns auto-trigger on clock advance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-xs">
            <Label>Trigger frequency</Label>
            <Select value={factionTurnTrigger} onValueChange={(v) => setFactionTurnTrigger(v as 'day' | 'week' | 'manual')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Every day</SelectItem>
                <SelectItem value="week">Every week</SelectItem>
                <SelectItem value="manual">Manual only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave}>
          <Save className="size-4 mr-2" />
          Save Settings
        </Button>
        {saved && <span className="text-sm text-green-600">Saved!</span>}
      </div>
    </div>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
