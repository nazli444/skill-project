'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, Calendar, Clock, User, MessageSquare, CheckCircle, XCircle, ArrowLeft, Mail } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

interface SessionRequest {
  id: number
  learnerId: number
  teacherId: number
  skillId: number
  requestedTime: string
  duration: number
  sessionType: string
  location?: string
  notes?: string
  status: string
  createdAt: string
  responseMessage?: string
}

interface User {
  id: number
  username: string
  fullName: string
  offeredSkills: Skill[]
}

interface Skill {
  id: number
  name: string
  category?: string
}

export default function SessionRequestsPage() {
  const [requests, setRequests] = useState<SessionRequest[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<SessionRequest | null>(null)
  const [responseMessage, setResponseMessage] = useState('')
  const [showResponseDialog, setShowResponseDialog] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve')
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    loadData()
  }, [])

  const checkAuth = () => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/auth/login')
      return
    }
  }

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token')
      const userId = localStorage.getItem('userId')

      // Load session requests for this teacher
      const requestsResponse = await fetch(`http://localhost:8080/api/session-requests/teacher/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      // Load all users and skills for display
      const [usersResponse, skillsResponse] = await Promise.all([
        fetch('http://localhost:8080/api/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:8080/api/skills', { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json()
        setRequests(requestsData)
      }

      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData)
      }

      if (skillsResponse.ok) {
        const skillsData = await skillsResponse.json()
        setSkills(skillsData)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getUserById = (userId: number) => {
    return users.find(user => user.id === userId)
  }

  const getSkillById = (skillId: number) => {
    return skills.find(skill => skill.id === skillId)
  }

  const handleRespondToRequest = async (requestId: number, action: 'approve' | 'reject') => {
    try {
      const token = localStorage.getItem('token')
      const endpoint = action === 'approve' ? 'approve' : 'reject'

      const response = await fetch(`http://localhost:8080/api/session-requests/${requestId}/${endpoint}?message=${encodeURIComponent(responseMessage)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        // Reload data to reflect changes
        loadData()
        setShowResponseDialog(false)
        setResponseMessage('')
        setSelectedRequest(null)
      }
    } catch (error) {
      console.error('Failed to respond to request:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading session requests...</p>
        </div>
      </div>
    )
  }

  const pendingRequests = requests.filter(req => req.status === 'pending')
  const respondedRequests = requests.filter(req => req.status !== 'pending')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </Link>
              <Mail className="w-8 h-8 text-indigo-600 mr-2" />
              <h1 className="text-xl font-bold text-gray-900">Session Requests</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Pending Requests */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Pending Requests</h2>

          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mail className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pending requests</h3>
                <p className="text-gray-600 text-center">
                  When learners request sessions with you, they'll appear here for your approval.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {pendingRequests.map((request) => {
                const learner = getUserById(request.learnerId)
                const skill = getSkillById(request.skillId)
                const requestDate = new Date(request.requestedTime)

                return (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center space-x-2">
                            <Calendar className="w-5 h-5 text-indigo-600" />
                            <span>Session Request #{request.id}</span>
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {format(requestDate, 'EEEE, MMMM d, yyyy')} at {format(requestDate, 'h:mm a')}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Request Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-gray-600">
                            <User className="w-4 h-4 mr-2" />
                            Learner: {learner?.fullName || 'Unknown'} (@{learner?.username})
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <BookOpen className="w-4 h-4 mr-2" />
                            Skill: {skill?.name || 'Unknown'}
                            {skill?.category && ` (${skill.category})`}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Clock className="w-4 h-4 mr-2" />
                            Duration: {request.duration} minutes
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">Session Type:</span>
                            <br />
                            <span className={`font-medium ${request.sessionType === 'virtual' ? 'text-blue-600' : 'text-green-600'}`}>
                              {request.sessionType === 'virtual' ? 'Virtual (Google Meet)' : 'In-Person'}
                            </span>
                          </div>

                          {request.location && (
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Location:</span>
                              <br />
                              <span className="text-gray-600">{request.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {request.notes && (
                        <div className="border-t pt-4">
                          <div className="text-sm">
                            <span className="font-medium text-gray-700 flex items-center">
                              <MessageSquare className="w-3 h-3 mr-1" />
                              Learner's Message:
                            </span>
                            <p className="text-gray-600 mt-1">{request.notes}</p>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="border-t pt-4">
                        <div className="flex gap-3">
                          <Button
                            onClick={() => {
                              setSelectedRequest(request)
                              setActionType('approve')
                              setShowResponseDialog(true)
                            }}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve Request
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(request)
                              setActionType('reject')
                              setShowResponseDialog(true)
                            }}
                            className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Decline Request
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Responded Requests */}
        {respondedRequests.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Previous Requests</h2>
            <div className="grid gap-4">
              {respondedRequests.slice(0, 5).map((request) => {
                const learner = getUserById(request.learnerId)
                const skill = getSkillById(request.skillId)

                return (
                  <Card key={request.id} className="opacity-75">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${request.status === 'approved' ? 'bg-green-500' : 'bg-red-500'}`} />
                          <div>
                            <p className="font-medium">
                              {learner?.fullName} requested {skill?.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {request.status === 'approved' ? 'Approved' : 'Declined'} • {format(new Date(request.createdAt), 'MMM d')}
                            </p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Response Dialog */}
        <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' ? 'Approve' : 'Decline'} Session Request
              </DialogTitle>
              <DialogDescription>
                {actionType === 'approve'
                  ? 'This will create a scheduled session and generate a Google Meet link if virtual.'
                  : 'This will notify the learner that their request was declined.'
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="response">Response Message (Optional)</Label>
                <Textarea
                  id="response"
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  placeholder={actionType === 'approve'
                    ? "I'm excited to help you learn this skill!"
                    : "I'm sorry, but I'm not available at this time."
                  }
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowResponseDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => selectedRequest && handleRespondToRequest(selectedRequest.id, actionType)}
                  className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                >
                  {actionType === 'approve' ? 'Approve' : 'Decline'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
