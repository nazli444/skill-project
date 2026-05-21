'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
    Loader2,
    Calendar as CalendarIcon,
    Video,
    MapPin,
    ArrowLeft,
    CheckCircle,
    BookOpen
} from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface User {
    id: number
    username: string
    fullName: string
    offeredSkills: Skill[]
    wantedSkills: Skill[]
}

interface Skill {
    id: number
    name: string
    description?: string
    category?: string
}

interface FormData {
    skillId: string
    learnerId: string
    duration: string
    sessionType: 'virtual' | 'in_person'
    location: string
    notes: string
}

const TIME_SLOTS = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
    '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
]

const DURATION_OPTIONS = [
    { value: '30', label: '30 minutes' },
    { value: '60', label: '1 hour' },
    { value: '90', label: '1.5 hours' },
    { value: '120', label: '2 hours' }
]

export default function NewSessionPage() {
    const router = useRouter()

    const [formData, setFormData] = useState<FormData>({
        skillId: '',
        learnerId: '',
        duration: '60',
        sessionType: 'virtual',
        location: '',
        notes: ''
    })

    const [selectedDate, setSelectedDate] = useState<Date>()
    const [datePopoverOpen, setDatePopoverOpen] = useState(false)
    const [selectedTime, setSelectedTime] = useState('')
    const [availableUsers, setAvailableUsers] = useState<User[]>([])
    const [wantedSkills, setWantedSkills] = useState<Skill[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const validWantedSkills = useMemo(() => {
            const valid = wantedSkills.filter(skill => skill?.id != null)
            console.log('DEBUG - Wanted skills loaded:', valid.map(s => ({ id: s.id, name: s.name })))
            return valid
        }, [wantedSkills]
    )

    const filteredUsers = useMemo(() => {
        if (!formData.skillId) return []

        console.log('DEBUG - Filtering for skillId:', formData.skillId, 'type:', typeof formData.skillId)
        console.log('DEBUG - Available users:', availableUsers.map(u => ({
            id: u.id,
            username: u.username,
            offeredSkills: u.offeredSkills?.map(s => ({ id: s.id, name: s.name }))
        })))

        // Find the selected skill from wantedSkills to get its name
        const selectedSkill = validWantedSkills.find(skill => skill.id.toString() === formData.skillId)

        console.log('DEBUG - Selected skill:', selectedSkill)

        const filtered = availableUsers.filter(user => {
            const hasSkill = user.offeredSkills?.some(skill => {
                // Match by skill name (case-insensitive) instead of ID
                const skillNameMatch = skill?.name?.toLowerCase() === selectedSkill?.name?.toLowerCase()
                console.log(`DEBUG - User ${user.username}: checking skill "${skill?.name}" vs selected "${selectedSkill?.name}" - match: ${skillNameMatch}`)
                return skillNameMatch
            })
            console.log(`DEBUG - User ${user.username} has matching skill: ${hasSkill}`)
            return hasSkill
        })

        console.log('DEBUG - Filtered result:', filtered.map(u => u.username))
        return filtered
    }, [formData.skillId, availableUsers, validWantedSkills])

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) {
            router.push('/auth/login')
            return
        }

        Promise.all([loadUserData(), loadAvailableUsers()])
            .finally(() => setLoading(false))
    }, [router])

    useEffect(() => {
        if (formData.learnerId && !filteredUsers.some(u => u.id.toString() === formData.learnerId)) {
            setFormData(prev => ({ ...prev, learnerId: '' }))
        }
    }, [filteredUsers, formData.learnerId])

    const loadUserData = async () => {
        try {
            const token = localStorage.getItem('token')
            const userId = localStorage.getItem('userId')

            if (!token || !userId) {
                router.push('/auth/login')
                return
            }

            const response = await fetch(`http://localhost:8080/api/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) throw new Error('Failed to load profile')

            const userData = await response.json()
            setWantedSkills(userData.wantedSkills || [])
        } catch (err) {
            console.error('Failed to load user data:', err)
            setError('Failed to load your profile. Please refresh the page.')
        }
    }

    const loadAvailableUsers = async () => {
        try {
            const token = localStorage.getItem('token')
            const currentUserId = localStorage.getItem('userId')

            const response = await fetch('http://localhost:8080/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) throw new Error('Failed to load users')

            const users = await response.json()

            const validUsers = users.filter((user: User) =>
                user?.id &&
                user.id.toString() !== currentUserId &&
                Array.isArray(user.offeredSkills) &&
                user.offeredSkills.length > 0
            )

            setAvailableUsers(validUsers)
        } catch (err) {
            console.error('Failed to load users:', err)
            setError('Failed to load available teachers. Please try again.')
        }
    }

    const validateScheduledTime = useCallback(() => {
        if (!selectedDate || !selectedTime) {
            throw new Error('Please select both date and time')
        }

        const now = new Date()
        const [hours, minutes] = selectedTime.split(':').map(Number)

        // Create date with explicit local time components
        const scheduledDateTime = new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate(),
            hours,
            minutes,
            0,
            0
        )

        if (scheduledDateTime <= now) {
            throw new Error('Please select a future date and time')
        }

        const timeDiff = scheduledDateTime.getTime() - now.getTime()
        if (timeDiff < 60 * 60 * 1000) {
            throw new Error('Sessions must be scheduled at least 1 hour in advance')
        }

        return scheduledDateTime
    }, [selectedDate, selectedTime])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setError('')

        try {
            if (!formData.skillId) throw new Error('Please select a skill')
            if (!formData.learnerId) throw new Error('Please select a teacher')

            const selectedSkill = validWantedSkills.find(s => s.id.toString() === formData.skillId)
            if (!selectedSkill) throw new Error('Selected skill is not valid')

            const scheduledDateTime = validateScheduledTime()

            // Send the time with explicit local timezone offset
            const year = scheduledDateTime.getFullYear()
            const month = String(scheduledDateTime.getMonth() + 1).padStart(2, '0')
            const day = String(scheduledDateTime.getDate()).padStart(2, '0')
            const hours = String(scheduledDateTime.getHours()).padStart(2, '0')
            const minutes = String(scheduledDateTime.getMinutes()).padStart(2, '0')
            const seconds = String(scheduledDateTime.getSeconds()).padStart(2, '0')

            // Get the local timezone offset in minutes and convert to +/-HH:MM format
            const timezoneOffset = scheduledDateTime.getTimezoneOffset()
            const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60)
            const offsetMinutes = Math.abs(timezoneOffset) % 60
            const offsetSign = timezoneOffset <= 0 ? '+' : '-'
            const timezoneString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`

            // Create ISO string with local time and timezone offset
            const localISOString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${timezoneString}`

            const sessionData = {
                skillId: parseInt(formData.skillId),
                learnerId: parseInt(localStorage.getItem('userId') || '0'), // Current user is the learner
                teacherId: parseInt(formData.learnerId), // Selected teacher is the teacher
                requestedTime: localISOString, // Send with explicit timezone offset
                duration: parseInt(formData.duration),
                sessionType: formData.sessionType,
                location: formData.sessionType === 'virtual' ? null : formData.location,
                notes: formData.notes || null
            }

      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:8080/api/session-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sessionData)
      })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(errorText || 'Failed to create session')
            }

            setSuccess(true)
            setTimeout(() => router.push('/dashboard'), 2000)

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create session')
        } finally {
            setSubmitting(false)
        }
    }

    const updateFormField = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-indigo-600" />
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Request Sent!</h2>
              <p className="text-gray-600 mb-4">
                Your session request has been sent to the teacher for approval.
                You'll be notified once they respond.
              </p>
                            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const isFormValid = formData.skillId && formData.learnerId && selectedDate && selectedTime

    return (
        <div className="min-h-screen bg-gray-50">
            {/* HEADER FIXED HERE */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
                                <ArrowLeft className="w-5 h-5 mr-2" />
                                Back to Dashboard
                            </Link>

                            {/* FIXED: replaced Calendar with CalendarIcon */}
                            <CalendarIcon className="w-8 h-8 text-indigo-600 mr-2" />

                            <h1 className="text-xl font-bold text-gray-900">Schedule New Session</h1>
                        </div>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Schedule a Skill-Sharing Session</CardTitle>
                        <CardDescription>
                            Connect with someone to share or learn a new skill
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Step 1: Skill */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-gray-900">1. Choose a Skill</h3>
                                <div className="space-y-2">
                                    <Label>What skill do you want to learn?</Label>

                                    {validWantedSkills.length === 0 ? (
                                        <Alert>
                                            <BookOpen className="h-4 w-4" />
                                            <AlertDescription>
                                                You haven't added any skills yet.
                                                <Link href="/dashboard/skills" className="ml-2 underline">
                                                    Add skills first →
                                                </Link>
                                            </AlertDescription>
                                        </Alert>
                                    ) : (
                                        <Select
                                            value={formData.skillId}
                                            onValueChange={(value) => updateFormField('skillId', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a skill" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {validWantedSkills.map(skill => (
                                                    <SelectItem key={skill.id} value={skill.id.toString()}>
                                                        {skill.name}{skill.category && ` (${skill.category})`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            </div>

                            {/* Step 2: Teacher */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-gray-900">2. Choose a Teacher</h3>

                                {formData.skillId ? (
                                    <div className="space-y-2">
                                        <Label>Available teachers</Label>
                                        <Select
                                            value={formData.learnerId}
                                            onValueChange={(value) => updateFormField('learnerId', value)}
                                            disabled={filteredUsers.length === 0}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a teacher" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {filteredUsers.map(user => (
                                                    <SelectItem key={user.id} value={user.id.toString()}>
                                                        {user.fullName} (@{user.username})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {filteredUsers.length === 0 && (
                                            <p className="text-sm text-gray-600">
                                                No teachers available for this skill.
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-600">Select a skill first</p>
                                )}
                            </div>

                            {/* Step 3: Schedule */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-gray-900">3. Schedule Your Session</h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Date */}
                                    <div className="space-y-2">
                                        <Label>Select Date</Label>
                                        <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <div
                                                    className={cn(
                                                        "w-full flex items-center justify-start p-3 border rounded-md cursor-pointer",
                                                        !selectedDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    <span>
                            {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                          </span>
                                                </div>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={selectedDate}
                                                    onSelect={(date) => {
                                                        setSelectedDate(date)
                                                        if (date) setDatePopoverOpen(false)
                                                    }}
                                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    {/* Time */}
                                    <div className="space-y-2">
                                        <Label>Select Time</Label>
                                        <Select value={selectedTime} onValueChange={setSelectedTime}>
                                            <SelectTrigger className="w-full p-3">
                                                <SelectValue placeholder="Pick a time" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TIME_SLOTS.map(time => (
                                                    <SelectItem key={time} value={time}>
                                                        {time}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Duration */}
                                <div className="space-y-2">
                                    <Label>Duration</Label>
                                    <Select
                                        value={formData.duration}
                                        onValueChange={(value) => updateFormField('duration', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DURATION_OPTIONS.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Step 4: Type */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-gray-900">4. Session Type</h3>

                                <RadioGroup
                                    value={formData.sessionType}
                                    onValueChange={(val) =>
                                        updateFormField('sessionType', val as 'virtual' | 'in_person')
                                    }
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="virtual" id="virtual" />
                                        <Label htmlFor="virtual" className="flex items-center">
                                            <Video className="w-4 h-4 mr-2 text-blue-600" />
                                            Virtual Session (Google Meet)
                                        </Label>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="in_person" id="in_person" />
                                        <Label htmlFor="in_person" className="flex items-center">
                                            <MapPin className="w-4 h-4 mr-2 text-green-600" />
                                            In-Person Session
                                        </Label>
                                    </div>
                                </RadioGroup>

                                {formData.sessionType === 'in_person' && (
                                    <div className="space-y-2">
                                        <Label>Location</Label>
                                        <Input
                                            value={formData.location}
                                            onChange={(e) => updateFormField('location', e.target.value)}
                                            required
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Step 5: Notes */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-gray-900">5. Additional Notes (Optional)</h3>
                                <Textarea
                                    value={formData.notes}
                                    onChange={(e) => updateFormField('notes', e.target.value)}
                                    placeholder="Anything specific you want to cover..."
                                    rows={3}
                                />
                            </div>

                            {error && (
                                <Alert variant="destructive">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {/* Submit Button */}
                            <div className="flex justify-end">
                                <Button type="submit" disabled={submitting || !isFormValid}>
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Scheduling...
                                        </>
                                    ) : (
                                        <>
                                            <CalendarIcon className="w-4 h-4 mr-2" />
                                            Schedule Session
                                        </>
                                    )}
                                </Button>
                            </div>

                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
