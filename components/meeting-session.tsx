'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Video, Copy, ExternalLink, Clock, User, MessageSquare, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

interface Session {
  id: number
  teacherId: number
  learnerId: number
  skillId: number
  scheduledTime: string
  duration: number
  status: string
  location?: string
  sessionType?: string
  meetingUrl?: string
  meetingId?: string
  notes?: string
}

interface MeetingSessionProps {
  session: Session
  userRole: 'teacher' | 'learner'
  onStatusUpdate?: (sessionId: number, status: string) => void
}

export function MeetingSession({ session, userRole, onStatusUpdate }: MeetingSessionProps) {
  const [timeUntilStart, setTimeUntilStart] = useState<string>('')
  const [canJoin, setCanJoin] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [userHasGoogleAuth, setUserHasGoogleAuth] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    const updateTimeUntilStart = () => {
      const now = new Date()
      const sessionTime = new Date(session.scheduledTime)
      const diff = sessionTime.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeUntilStart('Session has started')
        setCanJoin(true)
      } else if (diff <= 15 * 60 * 1000) { // 15 minutes
        const minutes = Math.ceil(diff / (1000 * 60))
        setTimeUntilStart(`Starts in ${minutes} minute${minutes !== 1 ? 's' : ''}`)
        setCanJoin(true)
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        if (hours > 0) {
          setTimeUntilStart(`Starts in ${hours}h ${minutes}m`)
        } else {
          setTimeUntilStart(`Starts in ${minutes} minutes`)
        }
        setCanJoin(false)
      }
    }

    updateTimeUntilStart()
    const interval = setInterval(updateTimeUntilStart, 60000) // Update every minute

    // Check user's Google authentication status
    checkUserGoogleAuth()

    return () => clearInterval(interval)
  }, [session.scheduledTime])

  const checkUserGoogleAuth = async () => {
    try {
      const token = localStorage.getItem('token')
      const userId = localStorage.getItem('userId')

      if (!token || !userId) {
        setUserHasGoogleAuth(false)
        return
      }

      const response = await fetch(`http://localhost:8080/api/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const userData = await response.json()
        const hasGoogleAuth = userData.googleAccessToken && userData.googleAccessToken.trim() !== ''
        setUserHasGoogleAuth(hasGoogleAuth)
      } else {
        setUserHasGoogleAuth(false)
      }
    } catch (error) {
      console.error('Failed to check Google auth status:', error)
      setUserHasGoogleAuth(false)
    }
  }

  const handleGoogleAuthRequired = () => {
    router.push('/auth/login?requireGoogle=true')
  }

  const handleJoinMeeting = () => {
    if (session.meetingUrl) {
      window.open(session.meetingUrl, '_blank', 'noopener,noreferrer')
      // Optionally update session status to 'in_progress'
      if (onStatusUpdate && session.status === 'scheduled') {
        onStatusUpdate(session.id, 'in_progress')
      }
    }
  }

  const handleCopyMeetingLink = async () => {
    if (session.meetingUrl) {
      try {
        await navigator.clipboard.writeText(session.meetingUrl)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      } catch (error) {
        console.error('Failed to copy meeting link:', error)
      }
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (onStatusUpdate) {
      onStatusUpdate(session.id, newStatus)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const sessionDate = new Date(session.scheduledTime)
  const isUpcoming = sessionDate > new Date()
  const isActive = session.status === 'in_progress' || (canJoin && session.status === 'scheduled')

  return (
    <Card className={`transition-all duration-200 ${isActive ? 'ring-2 ring-indigo-500 shadow-lg' : ''}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Video className="w-5 h-5 text-indigo-600" />
              <span>Skill Sharing Session #{session.skillId}</span>
            </CardTitle>
            <CardDescription className="mt-1">
              {format(sessionDate, 'EEEE, MMMM d, yyyy')} at {format(sessionDate, 'h:mm a')}
            </CardDescription>
          </div>
          <Badge className={getStatusColor(session.status)}>
            {session.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Session Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="w-4 h-4 mr-2" />
              Duration: {session.duration} minutes
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <User className="w-4 h-4 mr-2" />
              Role: {userRole === 'teacher' ? 'Teacher' : 'Learner'}
            </div>
            {session.sessionType === 'virtual' ? (
              <div className="flex items-center text-sm text-green-600">
                <Video className="w-4 h-4 mr-2" />
                Virtual Session
              </div>
            ) : (
              <div className="flex items-center text-sm text-blue-600">
                <div className="w-4 h-4 mr-2 rounded-full bg-blue-100 flex items-center justify-center">
                  📍
                </div>
                In-Person: {session.location}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium text-gray-700">Time until start:</span>
              <br />
              <span className={`font-medium ${canJoin ? 'text-green-600' : 'text-orange-600'}`}>
                {timeUntilStart}
              </span>
            </div>

            {session.notes && (
              <div className="text-sm">
                <span className="font-medium text-gray-700 flex items-center">
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Notes:
                </span>
                <p className="text-gray-600 mt-1">{session.notes}</p>
              </div>
            )}
          </div>
        </div>

        {session.sessionType === 'virtual' && session.meetingUrl && (
          <div className="border-t pt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleJoinMeeting}
                disabled={!canJoin}
                className="flex-1"
                size="lg"
              >
                <Video className="w-4 h-4 mr-2" />
                {canJoin ? 'Join Meeting' : 'Meeting Not Available Yet'}
              </Button>

              <Button
                variant="outline"
                onClick={handleCopyMeetingLink}
                className="flex-1"
              >
                <Copy className="w-4 h-4 mr-2" />
                {copySuccess ? 'Copied!' : 'Copy Link'}
              </Button>

              <Button
                variant="outline"
                onClick={() => window.open(session.meetingUrl, '_blank')}
                className="flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in New Tab
              </Button>
            </div>

            {session.meetingUrl && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Meeting Link:</p>
                <p className="text-sm text-gray-600 break-all font-mono">
                  {session.meetingUrl}
                </p>
              </div>
            )}
          </div>
        )}

        {userRole === 'teacher' && session.status === 'scheduled' && (
          <div className="border-t pt-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusUpdate('in_progress')}
                className="text-green-600 border-green-300 hover:bg-green-50"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Start Session
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusUpdate('cancelled')}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel Session
              </Button>
            </div>
          </div>
        )}

        {userRole === 'teacher' && session.status === 'in_progress' && (
          <div className="border-t pt-4">
            <Button
              onClick={() => handleStatusUpdate('completed')}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark as Completed
            </Button>
          </div>
        )}

        {/* Meeting Instructions */}
        {session.sessionType === 'virtual' && !canJoin && (
          <Alert>
            <Video className="h-4 w-4" />
            <AlertDescription>
              The meeting link will become available 15 minutes before the session starts.
              Make sure to join on time!
            </AlertDescription>
          </Alert>
        )}

        {session.sessionType === 'virtual' && canJoin && userHasGoogleAuth === true && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your virtual meeting is ready! Click "Join Meeting" to start your skill-sharing session.
            </AlertDescription>
          </Alert>
        )}

        {session.sessionType === 'virtual' && canJoin && userHasGoogleAuth === false && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>To join virtual meetings, you need to connect your Google account for calendar integration.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGoogleAuthRequired}
                  className="w-full"
                >
                  Connect Google Account
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
