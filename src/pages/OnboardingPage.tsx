import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Divider } from '../components/ui/Divider'
import {
  getLanguageSelectionForProfile,
  getRuntimeLanguageLabel,
  getUserProfile,
  setUserProfile,
  userBackgrounds,
  userGoals,
  userLanguageOptions,
  userSkillLevels,
  type UserBackground,
  type UserGoal,
  type UserLanguageSelection,
  type UserSkillLevel,
} from '../utils/userProfile'

function segmentClass(isActive: boolean) {
  return `rounded-lg border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45 ${
    isActive
      ? 'border-pebble-accent/35 bg-pebble-accent/14 text-pebble-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
      : 'border-pebble-border/30 bg-pebble-overlay/[0.04] text-pebble-text-secondary hover:bg-pebble-overlay/[0.1] hover:text-pebble-text-primary'
  }`
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const existingProfile = useMemo(() => getUserProfile(), [])

  const [skillLevel, setSkillLevel] = useState<UserSkillLevel>(
    existingProfile?.skillLevel ?? 'Beginner',
  )
  const [goal, setGoal] = useState<UserGoal>(
    existingProfile?.goal ?? 'Learn programming fundamentals',
  )
  const [background, setBackground] = useState<UserBackground>(
    existingProfile?.background ?? 'Student',
  )
  const [primaryLanguage, setPrimaryLanguage] = useState<UserLanguageSelection>(
    getLanguageSelectionForProfile(existingProfile),
  )
  const selectedLanguage = useMemo(
    () => userLanguageOptions.find((option) => option.id === primaryLanguage) ?? userLanguageOptions[0],
    [primaryLanguage],
  )
  const isComingSoonSelection = !selectedLanguage.isActiveRuntime

  function handleStartSession() {
    setUserProfile({
      skillLevel,
      goal,
      background,
      primaryLanguage,
    })
    navigate('/session/1')
  }

  return (
    <section className="page-enter mx-auto w-full max-w-4xl space-y-5">
      <Card padding="lg" className="space-y-5" interactive>
        <div className="space-y-2">
          <Badge>{existingProfile ? 'Edit profile' : 'First-run onboarding'}</Badge>
          <h1 className="text-balance text-3xl font-semibold tracking-[-0.015em] text-pebble-text-primary sm:text-4xl">
            Personalize Pebble
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-pebble-text-secondary sm:text-base">
            Share your context so Pebble can tune nudge timing and guidance tone for your workflow.
          </p>
        </div>

        <Divider />

        <div className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-pebble-text-primary">Skill level</legend>
            <div className="inline-flex flex-wrap gap-2 rounded-xl border border-pebble-border/32 bg-pebble-overlay/[0.06] p-1">
              {userSkillLevels.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={skillLevel === option}
                  onClick={() => setSkillLevel(option)}
                  className={segmentClass(skillLevel === option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-pebble-text-primary">Primary goal</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {userGoals.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={goal === option}
                  onClick={() => setGoal(option)}
                  className={segmentClass(goal === option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-pebble-text-primary">Background</legend>
              <div className="grid gap-2">
                {userBackgrounds.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={background === option}
                    onClick={() => setBackground(option)}
                    className={segmentClass(background === option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-pebble-text-primary">
                Primary language focus
              </legend>
              <div className="grid gap-2">
                {userLanguageOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={primaryLanguage === option.id}
                    onClick={() => setPrimaryLanguage(option.id)}
                    className={segmentClass(primaryLanguage === option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-pebble-text-muted">
                Runtime is currently a lightweight simulated JavaScript editor. More languages
                coming soon.
              </p>
              {isComingSoonSelection && (
                <p className="text-xs text-pebble-text-secondary">
                  {selectedLanguage.label} is not active yet. Sessions run on{' '}
                  <span className="font-medium text-pebble-text-primary">
                    {getRuntimeLanguageLabel()}
                  </span>
                  .
                </p>
              )}
            </fieldset>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button onClick={handleStartSession}>Start session</Button>
        </div>
      </Card>
    </section>
  )
}
