'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { MeetingSession } from '@/components/meeting-session'
import { CustomAlert, useCustomAlert } from '@/components/custom-alert'
import {
  Users,
  BookOpen,
  Calendar,
  Plus,
  Video,
  MapPin,
  Star,
  LogOut,
  Mail,
  MessageSquare,
  Bell,
  UserCheck,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface Review {
  id: number
  sessionId: number
  reviewerId: number
  revieweeId: number
  rating: number
  comment?: string
  createdAt: string
  reviewerName?: string
}

interface Notification {
  id: number
  userId: number
  title: string
  message: string
  type: string
  referenceId: number
  createdAt: string
  isRead: boolean
}

interface User {
  id: number
  username: string
  email: string
  fullName: string
  bio?: string
  location?: string
  rating: number
  totalReviews: number
  offeredSkills: Skill[]
  wantedSkills: Skill[]
  availability: string[]
  reviews?: Review[]
}

interface Skill {
  id: number
  name: string
  description?: string
  category?: string
}

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
  createdAt?: string
    updatedAt?: string
  responseMessage?: string
}

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
  notes?: string
}

interface RequestWithDetails extends SessionRequest {
  learnerName?: string
  teacherName?: string
  skillName?: string
}

export default function DashboardPage() {
  const { isOpen: alertOpen, alertData, showAlert, showConfirm, closeAlert, confirmAlert, cancelAlert } = useCustomAlert()
  const [user, setUser] = useState<User | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionRequests, setSessionRequests] = useState<SessionRequest[]>([])
  const [requestsWithDetails, setRequestsWithDetails] = useState<RequestWithDetails[]>([])
  const [allBrowseUsers, setAllBrowseUsers] = useState<User[]>([])
  const [loadingBrowseUsers, setLoadingBrowseUsers] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadNotifications, setUnreadNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [searchFilters, setSearchFilters] = useState({
    username: '',
    rating: '',
    skill: '',
    location: ''
  })
  const [showMismatchDialog, setShowMismatchDialog] = useState(false)
  const [selectedTeacherForMismatch, setSelectedTeacherForMismatch] = useState<User | null>(null)
  const [mismatchSkill, setMismatchSkill] = useState<Skill | null>(null)
  const [addingSkill, setAddingSkill] = useState(false)
  const [skillDescription, setSkillDescription] = useState('')
  const [approvedRequestsLimit, setApprovedRequestsLimit] = useState(5)
  const [rejectedRequestsLimit, setRejectedRequestsLimit] = useState(5)
  const [pendingRequestsLimit, setPendingRequestsLimit] = useState(3)
  const [pendingSentLimit, setPendingSentLimit] = useState(5)
  const [teacherSessionsLimit, setTeacherSessionsLimit] = useState(3)
  const [learnerSessionsLimit, setLearnerSessionsLimit] = useState(3)
  const [requestActionModal, setRequestActionModal] = useState<{
    open: boolean
    mode: 'approve' | 'reject'
    requestId: number | null
    message: string
  }>({ open: false, mode: 'approve', requestId: null, message: '' })
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    loadUserData()
  }, [])

  const checkAuth = () => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/auth/login')
      return
    }
  }

  const handleApproveRequest = async (requestId: number, message?: string) => {
    try {
      const token = localStorage.getItem('token')
      const url = message 
        ? `http://localhost:8080/api/session-requests/${requestId}/approve?message=${encodeURIComponent(message)}`
        : `http://localhost:8080/api/session-requests/${requestId}/approve`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        // Refresh data to show updated requests and new session
        await loadUserData()
        showAlert('Request approved successfully! A session has been created.', {
          title: 'Success'
        })
      } else {
        const errorText = await response.text()
        showAlert(`Failed to approve request: ${errorText || 'Unknown error'}`, {
          title: 'Error'
        })
      }
    } catch (error) {
      console.error('Error approving request:', error)
      showAlert('Error approving request', {
        title: 'Error'
      })
    }
  }

  const handleRejectRequest = async (requestId: number, message?: string) => {
    try {
      const token = localStorage.getItem('token')
      const url = message 
        ? `http://localhost:8080/api/session-requests/${requestId}/reject?message=${encodeURIComponent(message)}`
        : `http://localhost:8080/api/session-requests/${requestId}/reject`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        // Refresh data to show updated request status
        await loadUserData()
        showAlert('Request rejected successfully!', {
          title: 'Success'
        })
      } else {
        const errorText = await response.text()
        showAlert(`Failed to reject request: ${errorText || 'Unknown error'}`, {
          title: 'Error'
        })
      }
    } catch (error) {
      console.error('Error rejecting request:', error)
      showAlert('Error rejecting request', {
        title: 'Error'
      })
    }
  }

  const handleCancelRequest = async (requestId: number) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:8080/api/session-requests/${requestId}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        await loadUserData()
      } else {
        const errorText = await response.text()
        showAlert(`Failed to cancel request: ${errorText || 'Unknown error'}`, { title: 'Error' })
      }
    } catch (error) {
      console.error('Error cancelling request:', error)
      showAlert('Error cancelling request', { title: 'Error' })
    }
  }

  const canCancelRequest = (request: RequestWithDetails) => {
    if (!request.createdAt) return true
    const created = new Date(request.createdAt)
    const diffDays = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays >= 3
  }

  const loadUserData = async () => {
    console.log('Loading user data...')
    try {
      const token = localStorage.getItem('token')
      const userIdValue = localStorage.getItem('userId')
      console.log('Token exists:', !!token, 'UserId:', userIdValue)
      setUserId(userIdValue)

      if (!token || !userIdValue) {
        router.push('/auth/login')
        return
      }

      // Load user profile
      const userResponse = await fetch(`http://localhost:8080/api/users/${userIdValue}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (userResponse.ok) {
        const userData = await userResponse.json()
        console.log('🎯 Dashboard loaded for user:', userData.username, '(ID:', userData.id + ')')
        console.log('User data loaded:', userData.wantedSkills?.length || 0, 'wanted skills')
        console.log('Wanted skills details:', userData.wantedSkills)
        setUser(userData)
      }

      // Load user sessions
      const [teacherSessionsRes, learnerSessionsRes] = await Promise.all([
        fetch(`http://localhost:8080/api/sessions/teacher/${userIdValue}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`http://localhost:8080/api/sessions/learner/${userIdValue}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const teacherSessions = teacherSessionsRes.ok ? await teacherSessionsRes.json() : []
      const learnerSessions = learnerSessionsRes.ok ? await learnerSessionsRes.json() : []

      setSessions([...teacherSessions, ...learnerSessions])

      // Load session requests (both sent and received)
      const [sentRequestsRes, receivedRequestsRes] = await Promise.all([
        fetch(`http://localhost:8080/api/session-requests/learner/${userIdValue}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`http://localhost:8080/api/session-requests/teacher/${userIdValue}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const sentRequests = sentRequestsRes.ok ? await sentRequestsRes.json() : []
      const receivedRequests = receivedRequestsRes.ok ? await receivedRequestsRes.json() : []

      const allRequests = [...sentRequests, ...receivedRequests]
      setSessionRequests(allRequests)

      // Enrich requests with user and skill details
      const enrichedRequests = await Promise.all(
        allRequests.map(async (request: SessionRequest) => {
          const enriched: RequestWithDetails = { ...request }
          
          try {
            // Fetch learner details
            const learnerRes = await fetch(`http://localhost:8080/api/users/${request.learnerId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            if (learnerRes.ok) {
              const learner = await learnerRes.json()
              enriched.learnerName = learner.fullName || learner.username
              
              // Try to get skill name from learner's skills
              if (!enriched.skillName) {
                const learnerSkill = [...(learner.offeredSkills || []), ...(learner.wantedSkills || [])]
                  .find((s: Skill) => s.id === request.skillId)
                if (learnerSkill) {
                  enriched.skillName = learnerSkill.name
                }
              }
            }

            // Fetch teacher details
            const teacherRes = await fetch(`http://localhost:8080/api/users/${request.teacherId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            if (teacherRes.ok) {
              const teacher = await teacherRes.json()
              enriched.teacherName = teacher.fullName || teacher.username
              
              // Try to get skill name from teacher's skills if not found yet
              if (!enriched.skillName) {
                const teacherSkill = [...(teacher.offeredSkills || []), ...(teacher.wantedSkills || [])]
                  .find((s: Skill) => s.id === request.skillId)
                if (teacherSkill) {
                  enriched.skillName = teacherSkill.name
                }
              }
            }

            // Fallback: try to find skill in current user's skills
            if (!enriched.skillName && user) {
              const userSkill = [...(user.offeredSkills || []), ...(user.wantedSkills || [])]
                .find(s => s.id === request.skillId)
              if (userSkill) {
                enriched.skillName = userSkill.name
              }
            }
          } catch (err) {
            console.error('Error enriching request:', err)
          }

          return enriched
        })
      )

      setRequestsWithDetails(enrichedRequests)
      console.log('User data loading completed')

      // Load browse users and notifications after user data is loaded
      if (userIdValue) {
        loadBrowseUsers(userIdValue)
        loadNotifications(userIdValue)
      }
    } catch (error) {
      console.error('Failed to load user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.clear()
    router.push('/auth/login')
  }

  const handleStatusUpdate = async (sessionId: number, status: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:8080/api/sessions/${sessionId}/status?status=${status}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        // Reload sessions
        loadUserData()
      }
    } catch (error) {
      console.error('Failed to update session status:', error)
    }
  }

  const loadBrowseUsers = async (currentUserId?: string | null) => {
    try {
      setLoadingBrowseUsers(true) // Set loading state immediately
      const token = localStorage.getItem('token')
      if (!token) {
        setLoadingBrowseUsers(false)
        return
      }

      const response = await fetch('http://localhost:8080/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const allUsers = await response.json()
        // Filter out current user and only keep users with offered skills
        const userIdToUse = currentUserId || userId || '0'
        const usersWithSkills = allUsers.filter((u: User) => 
          u.id !== parseInt(userIdToUse) && 
          u.offeredSkills && 
          u.offeredSkills.length > 0
        )
        setAllBrowseUsers(usersWithSkills)
      } else {
        console.error('Failed to load users:', response.status, response.statusText)
        setAllBrowseUsers([]) // Set empty array on error
      }
    } catch (error) {
      console.error('Error loading users:', error)
      setAllBrowseUsers([]) // Set empty array on error
    } finally {
      setLoadingBrowseUsers(false) // Always set loading to false when done
    }
  }

  // Check if teacher has skills that match user's wanted skills
  const hasSkillMatch = (teacher: User): { hasMatch: boolean, skill?: Skill } => {
    if (!teacher.offeredSkills || !user?.wantedSkills) {
      return { hasMatch: false }
    }

    // Check if any of teacher's offered skills match user's wanted skills
    for (const offeredSkill of teacher.offeredSkills) {
      for (const wantedSkill of user.wantedSkills) {
        if (offeredSkill.name.toLowerCase() === wantedSkill.name.toLowerCase()) {
          return { hasMatch: true }
        }
      }
    }

    // If no exact match, return the first offered skill as suggestion
    return { hasMatch: false, skill: teacher.offeredSkills[0] }
  }

  // Handle adding skill to wanted list
  const handleAddWantedSkill = async (skill: Skill, description: string) => {
    if (!description.trim()) {
      showAlert('Please add a description for this skill.', {
        title: 'Required Field'
      })
      return
    }

    setAddingSkill(true)
    try {
      const token = localStorage.getItem('token')
      const currentUserId = userId

      if (!token || !currentUserId) {
        showAlert('Please log in to add skills', {
          title: 'Authentication Required'
        })
        return
      }

      const skillData = {
        name: skill.name,
        description: description.trim(),
        category: skill.category
      }

      const response = await fetch(`http://localhost:8080/api/users/${currentUserId}/skills/wanted`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(skillData)
      })

      if (response.ok) {
        // Refresh user data to include the new wanted skill
        await loadUserData()
        setShowMismatchDialog(false)
        setSelectedTeacherForMismatch(null)
        setMismatchSkill(null)
        setSkillDescription('')
        showAlert('Skill added to your wanted skills! You can now request a session.', {
          title: 'Skill Added'
        })
      } else {
        showAlert('Failed to add skill. Please try again.', {
          title: 'Error'
        })
      }
    } catch (error) {
      console.error('Error adding skill:', error)
      showAlert('Error adding skill. Please try again.', {
        title: 'Error'
      })
    } finally {
      setAddingSkill(false)
    }
  }

  const handleMismatchClick = (teacher: User) => {
    const skillMatch = hasSkillMatch(teacher)
    setSelectedTeacherForMismatch(teacher)
    setMismatchSkill(skillMatch.skill || null)
    setSkillDescription('')
    setShowMismatchDialog(true)
  }

  const loadNotifications = async (currentUserId?: string | null) => {
    try {
      const token = localStorage.getItem('token')
      const userIdToUse = currentUserId || userId

      if (!token || !userIdToUse) return

      const response = await fetch(`http://localhost:8080/api/notifications/user/${userIdToUse}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const allNotifications = await response.json()
        setNotifications(allNotifications)
        const unread = allNotifications.filter((n: Notification) => !n.isRead)
        setUnreadNotifications(unread)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }

  const markNotificationAsRead = async (notificationId: number) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      await fetch(`http://localhost:8080/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      )
      setUnreadNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Handle removing skill from wanted list
  const handleRemoveWantedSkill = async (skillId: number) => {
    console.log('Attempting to remove skill with ID:', skillId, 'Type:', typeof skillId)

    if (!skillId || skillId <= 0) {
      console.error('Invalid skill ID:', skillId)
      showAlert('Invalid skill ID. Cannot remove skill.', {
        title: 'Error'
      })
      return
    }

    const confirmed = await showConfirm('Are you sure you want to remove this wanted skill?', {
      title: 'Confirm Removal',
      confirmText: 'Remove',
      cancelText: 'Cancel'
    })
    if (!confirmed) return

    try {
      const token = localStorage.getItem('token')
      const currentUserId = userId

      console.log('User ID:', currentUserId, 'Token exists:', !!token)

      if (!token || !currentUserId) {
        showAlert('Please log in to manage skills', {
          title: 'Authentication Required'
        })
        return
      }

      const numericSkillId = Number(skillId)
      const url = `http://localhost:8080/api/users/${currentUserId}/skills/wanted/${numericSkillId}`
      console.log('Making DELETE request to:', url, 'original skillId:', skillId, 'converted:', numericSkillId, 'userId:', currentUserId)

      console.log('Sending DELETE request to:', url)
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      console.log('Response status:', response.status, 'Response ok:', response.ok)
      const responseText = await response.text()
      console.log('Response body:', responseText)

      if (response.ok) {
        console.log('Skill removal successful, refreshing user data')
        await loadUserData()
        console.log('User data refreshed after skill removal')
      } else {
        const errorText = await response.text()
        console.error('Response error:', response.status, response.statusText, errorText)
        showAlert(`Failed to remove skill (${response.status}): ${errorText || 'Unknown error'}`, {
          title: 'Error'
        })
      }
    } catch (error) {
      console.error('Error removing skill:', error)
      showAlert('Error removing skill. Please try again.', {
        title: 'Error'
      })
    }
  }

  const handleRemoveOfferedSkill = async (skillId: number) => {
    console.log('Attempting to remove offered skill with ID:', skillId, 'Type:', typeof skillId)

    const confirmed = await showConfirm('Are you sure you want to remove this offered skill?', {
      title: 'Confirm Removal',
      confirmText: 'Remove',
      cancelText: 'Cancel'
    })
    if (!confirmed) return

    const numericSkillId = Number(skillId)
    const url = `http://localhost:8080/api/users/${userId}/skills/offered/${numericSkillId}`
    console.log('Making DELETE request to:', url, 'original skillId:', skillId, 'converted:', numericSkillId, 'userId:', userId)

    try {
      const token = localStorage.getItem('token')

      if (!token || !userId) {
        showAlert('Please log in to manage skills', {
          title: 'Authentication Required'
        })
        return
      }

      console.log('Sending DELETE request to:', url)
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      console.log('Response status:', response.status, 'Response ok:', response.ok)
      const responseText = await response.text()
      console.log('Response body:', responseText)

      if (response.ok) {
        console.log('Offered skill removal successful, refreshing user data')
        await loadUserData()
        console.log('User data refreshed after offered skill removal')
      } else {
        const errorText = await response.text()
        console.error('Response error:', response.status, response.statusText, errorText)
        showAlert(`Failed to remove skill (${response.status}): ${errorText || 'Unknown error'}`, {
          title: 'Error'
        })
      }
    } catch (error) {
      console.error('Error removing offered skill:', error)
      showAlert('Error removing skill. Please try again.', {
        title: 'Error'
      })
    }
  }

  // Filter users based on search criteria
  const filteredBrowseUsers = useMemo(() => {
    return allBrowseUsers.filter((user: User) => {
      // Username filter (partial match, case-insensitive)
      if (searchFilters.username) {
        const usernameMatch = user.username.toLowerCase().includes(searchFilters.username.toLowerCase()) ||
                              user.fullName.toLowerCase().includes(searchFilters.username.toLowerCase())
        if (!usernameMatch) return false
      }

      // Rating filter (minimum rating)
      if (searchFilters.rating) {
        const minRating = parseFloat(searchFilters.rating)
        if (!isNaN(minRating) && user.rating < minRating) {
          return false
        }
      }

      // Skill filter (partial match, case-insensitive)
      if (searchFilters.skill) {
        const skillMatch = user.offeredSkills?.some(skill => 
          skill.name.toLowerCase().includes(searchFilters.skill.toLowerCase())
        )
        if (!skillMatch) return false
      }

      // Location filter (partial match, case-insensitive)
      if (searchFilters.location) {
        if (!user.location) return false
        const locationMatch = user.location.toLowerCase().includes(searchFilters.location.toLowerCase())
        if (!locationMatch) return false
      }

      return true
    })
  }, [allBrowseUsers, searchFilters])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Failed to load user data</p>
          <Button onClick={() => router.push('/auth/login')}>
            Back to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-indigo-600 mr-2" />
              <h1 className="text-xl font-bold text-gray-900">SkillShare</h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
                    </span>
                  )}
                </Button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No notifications yet
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                              !notification.isRead ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => {
                              if (!notification.isRead) {
                                markNotificationAsRead(notification.id)
                              }
                            }}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-gray-900">{notification.title}</h4>
                                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(notification.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-2"></div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {notifications.length > 10 && (
                      <div className="p-2 border-t border-gray-200 text-center">
                        <Button variant="ghost" size="sm" className="text-xs">
                          View all notifications
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Avatar>
                <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-700">{user.fullName}</span>
                <span className="text-xs text-gray-500">@{user.username}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Profile Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Avatar className="mr-3">
                    <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  Profile
                  {requestsWithDetails.filter(r => r.teacherId === parseInt(userId || '0') && r.status === 'pending').length > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {requestsWithDetails.filter(r => r.teacherId === parseInt(userId || '0') && r.status === 'pending').length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900">{user.fullName}</h3>
                  <p className="text-sm text-gray-600">@{user.username}</p>
                  {user.location && (
                    <p className="text-sm text-gray-600 flex items-center mt-1">
                      <MapPin className="w-3 h-3 mr-1" />
                      {user.location}
                    </p>
                  )}
                </div>

                {user.bio && (
                  <p className="text-sm text-gray-700">{user.bio}</p>
                )}

                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-400 mr-1" />
                  <span className="text-sm font-medium">{user.rating.toFixed(1)}</span>
                  <span className="text-sm text-gray-600 ml-1">
                    ({user.totalReviews} review{user.totalReviews !== 1 ? 's' : ''})
                  </span>
                </div>

                {/* Reviews Section */}
                {user.reviews && user.reviews.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900">Recent Reviews</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {user.reviews.slice(0, 3).map((review: any) => (
                        <div key={review.id} className="p-2 bg-gray-50 rounded text-xs">
                          <div className="flex items-center space-x-1 mb-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span className="font-medium">{review.rating}/5</span>
                            <span className="text-gray-500">by {review.reviewerName}</span>
                          </div>
                          {review.comment && (
                            <p className="text-gray-700">{review.comment}</p>
                          )}
                        </div>
                      ))}
                      {user.reviews.length > 3 && (
                        <p className="text-xs text-gray-500 text-center">
                          +{user.reviews.length - 3} more reviews
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Skills Offered</h4>
                  <div className="flex flex-wrap gap-1">
                    {user.offeredSkills?.map((skill) => (
                      <Badge key={skill.id} variant="secondary" className="text-xs">
                        {skill.name}
                      </Badge>
                    )) || <p className="text-sm text-gray-500">No skills added yet</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="sessions" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="sessions">My Sessions</TabsTrigger>
                <TabsTrigger value="skills">My Skills</TabsTrigger>
                <TabsTrigger value="requests">Requests</TabsTrigger>
                <TabsTrigger value="browse">Browse</TabsTrigger>
              </TabsList>

              <TabsContent value="sessions" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">My Sessions</h2>
                  <Link href="/dashboard/sessions/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Schedule Session
                    </Button>
                  </Link>
                </div>

                {(() => {
                  const teacherSessions = sessions.filter(session => session.teacherId === parseInt(localStorage.getItem('userId') || '0'))
                  const learnerSessions = sessions.filter(session => session.learnerId === parseInt(localStorage.getItem('userId') || '0'))

                  return (
                    <>
                      {/* Sessions Where I Am Teacher */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-green-600" />
                            Sessions as Teacher
                            {teacherSessions.length > 0 && (
                              <Badge variant="secondary">{teacherSessions.length}</Badge>
                            )}
                          </CardTitle>
                          <CardDescription>
                            Sessions where you are teaching others
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {teacherSessions.length === 0 ? (
                            <div className="text-center py-6">
                              <UserCheck className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">No teaching sessions yet</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {teacherSessions.slice(0, teacherSessionsLimit).map((session) => (
                                <MeetingSession
                                  key={session.id}
                                  session={session}
                                  userRole="teacher"
                                  onStatusUpdate={handleStatusUpdate}
                                />
                              ))}
                              {teacherSessions.length > teacherSessionsLimit && (
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => setTeacherSessionsLimit(prev => prev + 3)}
                                >
                                  Load More Teaching Sessions
                                </Button>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Sessions Where I Am Learner */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-blue-600" />
                            Sessions as Learner
                            {learnerSessions.length > 0 && (
                              <Badge variant="secondary">{learnerSessions.length}</Badge>
                            )}
                          </CardTitle>
                          <CardDescription>
                            Sessions where you are learning from others
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {learnerSessions.length === 0 ? (
                            <div className="text-center py-6">
                              <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">No learning sessions yet</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {learnerSessions.slice(0, learnerSessionsLimit).map((session) => (
                                <MeetingSession
                                  key={session.id}
                                  session={session}
                                  userRole="learner"
                                  onStatusUpdate={handleStatusUpdate}
                                />
                              ))}
                              {learnerSessions.length > learnerSessionsLimit && (
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => setLearnerSessionsLimit(prev => prev + 3)}
                                >
                                  Load More Learning Sessions
                                </Button>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  )
                })()}
              </TabsContent>

              <TabsContent value="skills" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">My Skills</h2>
                  <Link href="/dashboard/skills">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Manage Skills
                    </Button>
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <BookOpen className="w-5 h-5 mr-2 text-green-600" />
                        Skills I Offer
                      </CardTitle>
                      <CardDescription>
                        Skills you can teach others
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {user?.offeredSkills && user.offeredSkills.length > 0 ? (
                          user.offeredSkills.map((skill) => (
                            <div key={skill.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded min-w-0">
                              <span className="font-medium truncate">{skill.name}</span>
                              <div className="ml-auto flex items-center gap-2">
                                <Badge variant="outline" className="flex-shrink-0">Offered</Badge>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleRemoveOfferedSkill(skill.id)
                                  }}
                                  className="w-7 h-7 bg-red-500 text-white rounded-full text-base font-bold hover:bg-red-600 flex items-center justify-center cursor-pointer border-2 border-white shadow-lg flex-shrink-0"
                                  title="Remove skill"
                                  type="button"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm py-2">No skills offered yet</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                        Skills I Want to Learn
                      </CardTitle>
                      <CardDescription>
                        Skills you're interested in learning
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {user?.wantedSkills && user.wantedSkills.length > 0 ? (
                          user.wantedSkills.map((skill) => (
                            <div key={skill.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded min-w-0">
                              <span className="font-medium truncate">{skill.name}</span>
                              <div className="ml-auto flex items-center gap-2">
                                <Badge variant="outline" className="flex-shrink-0">Wanted</Badge>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleRemoveWantedSkill(skill.id)
                                  }}
                                  className="w-7 h-7 bg-red-500 text-white rounded-full text-base font-bold hover:bg-red-600 flex items-center justify-center cursor-pointer border-2 border-white shadow-lg flex-shrink-0"
                                  title="Remove skill"
                                  type="button"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm py-2">No skills wanted yet</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="requests" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">Session Requests</h2>
                  </div>

                  {/* Quick Requests Preview - Always show all sections */}
                  <div className="space-y-4">
                    {/* Pending Requests (Received) - Always show */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          Pending Requests
                          {requestsWithDetails.filter(r => r.teacherId === parseInt(userId || '0') && r.status === 'pending').length > 0 && (
                            <Badge variant="secondary">
                              {requestsWithDetails.filter(r => r.teacherId === parseInt(userId || '0') && r.status === 'pending').length}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>Requests waiting for your response</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {requestsWithDetails.filter(r => r.teacherId === parseInt(userId || '0') && r.status === 'pending').length > 0 ? (
                          <div className="space-y-3">
                            {requestsWithDetails
                              .filter(r => r.teacherId === parseInt(userId || '0') && r.status === 'pending')
                              .slice(0, pendingRequestsLimit)
                              .map(request => (
                                <Card key={request.id} className="border-l-4 border-l-indigo-500">
                                  <CardContent className="p-4">
                                    <div className="space-y-3">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-2">
                                            <h4 className="font-semibold text-base">Session Request</h4>
                                            <Badge variant="outline">{request.skillName || 'Skill'}</Badge>
                                          </div>
                                          <div className="space-y-1 text-sm text-gray-600">
                                            <p><span className="font-medium">From:</span> {request.learnerName || `User #${request.learnerId}`}</p>
                                            <p><span className="font-medium">Date & Time:</span> {new Date(request.requestedTime).toLocaleDateString()} at {new Date(request.requestedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            <p><span className="font-medium">Duration:</span> {request.duration} minutes</p>
                                            <p><span className="font-medium">Type:</span> {request.sessionType === 'virtual' ? 'Virtual (Google Meet)' : 'In-Person'}</p>
                                            {request.location && (
                                              <p><span className="font-medium">Location:</span> {request.location}</p>
                                            )}
                                            {request.notes && (
                                              <div className="mt-2 p-2 bg-gray-50 rounded">
                                                <p className="font-medium text-xs text-gray-700 mb-1">Notes:</p>
                                                <p className="text-xs text-gray-600">{request.notes}</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex gap-2 pt-2 border-t">
                                        <Button
                                          size="sm"
                                          className="flex-1 bg-green-600 hover:bg-green-700"
                                          onClick={() => setRequestActionModal({ open: true, mode: 'approve', requestId: request.id, message: '' })}
                                        >
                                          Approve
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          className="flex-1"
                                          onClick={() => setRequestActionModal({ open: true, mode: 'reject', requestId: request.id, message: '' })}
                                        >
                                          Reject
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            {requestsWithDetails.filter(r => r.teacherId === parseInt(userId || '0') && r.status === 'pending').length > pendingRequestsLimit && (
                              <Button
                                variant="outline"
                                className="w-full mt-4"
                                onClick={() => setPendingRequestsLimit(prev => prev + 5)}
                              >
                                Load More Pending Requests
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <Mail className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">No pending requests</p>
                          </div>
                        )}
                        <Link href="/dashboard/requests" className="text-sm text-indigo-600 hover:text-indigo-500 mt-3 inline-block">
                          View all requests →
                        </Link>
                      </CardContent>
                    </Card>

                    {/* Pending Sent Requests (learner pending) */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          Pending Sent Requests
                          {requestsWithDetails.filter(r => r.learnerId === parseInt(userId || '0') && r.status === 'pending').length > 0 && (
                            <Badge variant="secondary">
                              {requestsWithDetails.filter(r => r.learnerId === parseInt(userId || '0') && r.status === 'pending').length}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>Requests you've sent that are awaiting a teacher response</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {requestsWithDetails.filter(r => r.learnerId === parseInt(userId || '0') && r.status === 'pending').length > 0 ? (
                          <div className="space-y-3">
                            {requestsWithDetails
                              .filter(r => r.learnerId === parseInt(userId || '0') && r.status === 'pending')
                              .slice(0, pendingSentLimit)
                              .map(request => (
                                <Card key={request.id} className="border-l-4 border-l-amber-500">
                                  <CardContent className="p-4">
                                    <div className="flex justify-between items-start">
                                      <div className="space-y-1 text-sm text-gray-600">
                                        <p className="font-semibold text-gray-900">To Teacher: {request.teacherName || `User #${request.teacherId}`}</p>
                                        <p><span className="font-medium">Skill:</span> {request.skillName || 'Unknown Skill'}</p>
                                        <p><span className="font-medium">Date & Time:</span> {new Date(request.requestedTime).toLocaleDateString()} at {new Date(request.requestedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        <p><span className="font-medium">Duration:</span> {request.duration} minutes</p>
                                      </div>
                                      <div className="flex flex-col gap-2">
                                        <Badge variant="secondary">Pending</Badge>
                                        {canCancelRequest(request) && (
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleCancelRequest(request.id)}
                                          >
                                            Cancel
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            {requestsWithDetails.filter(r => r.learnerId === parseInt(userId || '0') && r.status === 'pending').length > pendingSentLimit && (
                              <Button
                                variant="outline"
                                className="w-full mt-2"
                                onClick={() => setPendingSentLimit(prev => prev + 5)}
                              >
                                Load More
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-sm text-gray-600">No pending sent requests</div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Approved Sent Requests */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          Approved Requests
                          {requestsWithDetails.filter(r => r.learnerId === parseInt(userId || '0') && r.status === 'approved').length > 0 && (
                            <Badge variant="default">
                              {requestsWithDetails.filter(r => r.learnerId === parseInt(userId || '0') && r.status === 'approved').length}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>Requests that have been approved by teachers</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {requestsWithDetails.filter(r => r.learnerId === parseInt(userId || '0') && r.status === 'approved').length > 0 ? (
                          <div className="space-y-3">
                            {requestsWithDetails
                              .filter(r => r.learnerId === parseInt(userId || '0') && r.status === 'approved')
                              .slice(0, approvedRequestsLimit)
                              .map(request => (
                                <Card key={request.id} className="border-l-4 border-l-green-500">
                                  <CardContent className="p-4">
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <h4 className="font-semibold text-base">Session Request</h4>
                                          <Badge variant="default">approved</Badge>
                                        </div>
                                      </div>
                                      <div className="space-y-1 text-sm text-gray-600">
                                        <p><span className="font-medium">To Teacher:</span> {request.teacherName || `User #${request.teacherId}`}</p>
                                        <p><span className="font-medium">Skill:</span> {request.skillName || 'Unknown Skill'}</p>
                                        <p><span className="font-medium">Date & Time:</span> {new Date(request.requestedTime).toLocaleDateString()} at {new Date(request.requestedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        <p><span className="font-medium">Duration:</span> {request.duration} minutes</p>
                                        <p><span className="font-medium">Type:</span> {request.sessionType === 'virtual' ? 'Virtual (Google Meet)' : 'In-Person'}</p>
                                        {request.location && (
                                          <p><span className="font-medium">Location:</span> {request.location}</p>
                                        )}
                                        {request.responseMessage && (
                                          <div className="mt-2 p-2 bg-green-50 rounded border-l-4 border-l-green-400">
                                            <p className="font-medium text-xs text-green-700 mb-1">Teacher's Response:</p>
                                            <p className="text-xs text-green-600">{request.responseMessage}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            {requestsWithDetails.filter(r => r.learnerId === parseInt(userId || '0') && r.status === 'approved').length > approvedRequestsLimit && (
                              <Button
                                variant="outline"
                                className="w-full mt-4"
                                onClick={() => setApprovedRequestsLimit(prev => prev + 5)}
                              >
                                Load More Approved Requests
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <CheckCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">No approved requests</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Rejected Sent Requests */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <XCircle className="w-5 h-5 text-red-600" />
                          Rejected Requests
                          {requestsWithDetails.filter(r => r.learnerId === parseInt(userId || '0') && r.status === 'rejected').length > 0 && (
                            <Badge variant="destructive">
                              {requestsWithDetails.filter(r => r.learnerId === parseInt(userId || '0') && r.status === 'rejected').length}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>Requests that have been rejected by teachers</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {requestsWithDetails.filter(r => r.learnerId === parseInt(userId || '0') && r.status === 'rejected').length > 0 ? (
                          <div className="space-y-3">
                            {requestsWithDetails
                              .filter(r => r.learnerId === parseInt(userId || '0') && r.status === 'rejected')
                              .slice(0, rejectedRequestsLimit)
                              .map(request => (
                                <Card key={request.id} className="border-l-4 border-l-red-500">
                                  <CardContent className="p-4">
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <h4 className="font-semibold text-base">Session Request</h4>
                                          <Badge variant="destructive">rejected</Badge>
                                        </div>
                                      </div>
                                      <div className="space-y-1 text-sm text-gray-600">
                                        <p><span className="font-medium">To Teacher:</span> {request.teacherName || `User #${request.teacherId}`}</p>
                                        <p><span className="font-medium">Skill:</span> {request.skillName || 'Unknown Skill'}</p>
                                        <p><span className="font-medium">Date & Time:</span> {new Date(request.requestedTime).toLocaleDateString()} at {new Date(request.requestedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        <p><span className="font-medium">Duration:</span> {request.duration} minutes</p>
                                        <p><span className="font-medium">Type:</span> {request.sessionType === 'virtual' ? 'Virtual (Google Meet)' : 'In-Person'}</p>
                                        {request.location && (
                                          <p><span className="font-medium">Location:</span> {request.location}</p>
                                        )}
                                        {request.responseMessage && (
                                          <div className="mt-2 p-2 bg-red-50 rounded border-l-4 border-l-red-400">
                                            <p className="font-medium text-xs text-red-700 mb-1">Teacher's Response:</p>
                                            <p className="text-xs text-red-600">{request.responseMessage}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            {requestsWithDetails.filter(r => r.learnerId === parseInt(userId || '0') && r.status === 'rejected').length > rejectedRequestsLimit && (
                              <Button
                                variant="outline"
                                className="w-full mt-4"
                                onClick={() => setRejectedRequestsLimit(prev => prev + 5)}
                              >
                                Load More Rejected Requests
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <XCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">No rejected requests</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

              <TabsContent value="browse" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Browse Skills</h2>
                </div>

                {/* Search Filters */}
                <Card>
                  <CardHeader>
                    <CardTitle>Search & Filter</CardTitle>
                    <CardDescription>Filter users by username, rating, skills, or location</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="search-username">Username/Name</Label>
                        <Input
                          id="search-username"
                          placeholder="Search by username..."
                          value={searchFilters.username}
                          onChange={(e) => setSearchFilters(prev => ({ ...prev, username: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="search-rating">Min Rating</Label>
                        <Input
                          id="search-rating"
                          type="number"
                          step="0.1"
                          min="0"
                          max="5"
                          placeholder="Min rating (0-5)"
                          value={searchFilters.rating}
                          onChange={(e) => setSearchFilters(prev => ({ ...prev, rating: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="search-skill">Skill Offered</Label>
                        <Input
                          id="search-skill"
                          placeholder="e.g., React, Spanish..."
                          value={searchFilters.skill}
                          onChange={(e) => setSearchFilters(prev => ({ ...prev, skill: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="search-location">Location</Label>
                        <Input
                          id="search-location"
                          placeholder="Search by location..."
                          value={searchFilters.location}
                          onChange={(e) => setSearchFilters(prev => ({ ...prev, location: e.target.value }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Users Grid */}
                {loadingBrowseUsers ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Users className="w-12 h-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Loading users...</h3>
                      <p className="text-gray-600 text-center">
                        Please wait while we load available teachers...
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBrowseUsers.length === 0 ? (
                      <Card className="col-span-full">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                          <Users className="w-12 h-12 text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                          <p className="text-gray-600 text-center">
                            Try adjusting your search filters to find more users
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      filteredBrowseUsers.map((browseUser) => (
                        <Card key={browseUser.id} className="hover:shadow-lg transition-shadow">
                          <CardHeader>
                            <div className="flex items-center space-x-3">
                              <Avatar>
                                <AvatarFallback>{browseUser.fullName.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <CardTitle className="text-lg">{browseUser.fullName}</CardTitle>
                                <CardDescription>@{browseUser.username}</CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {browseUser.location && (
                              <p className="text-sm text-gray-600 flex items-center">
                                <MapPin className="w-4 h-4 mr-1" />
                                {browseUser.location}
                              </p>
                            )}

                            {browseUser.bio && (
                              <p className="text-sm text-gray-700">{browseUser.bio}</p>
                            )}

                            <div className="flex items-center">
                              <Star className="w-4 h-4 text-yellow-400 mr-1" />
                              <span className="text-sm font-medium">{browseUser.rating.toFixed(1)}</span>
                              <span className="text-sm text-gray-500 ml-1">
                                ({browseUser.totalReviews} reviews)
                              </span>
                            </div>

                            {browseUser.offeredSkills && browseUser.offeredSkills.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-green-600 mb-2">Skills Offered:</h4>
                                <div className="flex flex-wrap gap-2">
                                  {browseUser.offeredSkills.map((skill) => (
                                    <Badge key={skill.id} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      {skill.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {browseUser.wantedSkills && browseUser.wantedSkills.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-blue-600 mb-2">Skills Wanted:</h4>
                                <div className="flex flex-wrap gap-2">
                                  {browseUser.wantedSkills.map((skill) => (
                                    <Badge key={skill.id} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                      {skill.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {(() => {
                              const skillMatch = hasSkillMatch(browseUser)
                              return skillMatch.hasMatch ? (
                                <Link href={`/dashboard/sessions/new?teacherId=${browseUser.id}`}>
                                  <Button className="w-full mt-4" size="sm">
                                    Request Session
                                  </Button>
                                </Link>
                              ) : (
                                <div className="space-y-2 mt-4">
                                  <Button
                                    variant="outline"
                                    className="w-full text-gray-500 border-gray-300"
                                    size="sm"
                                    onClick={() => handleMismatchClick(browseUser)}
                                  >
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Why can't I request?
                                  </Button>
                                </div>
                              )
                            })()}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Skill Mismatch Dialog */}
      <Dialog open={showMismatchDialog} onOpenChange={setShowMismatchDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Skill Mismatch</DialogTitle>
            <DialogDescription>
              This teacher currently offers skills that do not match your wanted skills.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTeacherForMismatch && (
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Teacher's Offered Skills:</h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedTeacherForMismatch.offeredSkills?.map((skill) => (
                      <Badge key={skill.id} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {skill.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700">Your Wanted Skills:</h4>
                    <div className="space-y-2 mt-1">
                      {user?.wantedSkills && user.wantedSkills.length > 0 ? (
                        user.wantedSkills.map((skill) => (
                          <div key={skill.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded min-w-0">
                            <span className="font-medium truncate">{skill.name}</span>
                            <div className="ml-auto flex items-center gap-2">
                              <Badge variant="outline" className="flex-shrink-0">Wanted</Badge>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleRemoveWantedSkill(skill.id)
                                }}
                                className="w-7 h-7 bg-red-500 text-white rounded-full text-base font-bold hover:bg-red-600 flex items-center justify-center cursor-pointer border-2 border-white shadow-lg flex-shrink-0"
                                title="Remove skill"
                                type="button"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm py-2">No skills wanted yet</p>
                      )}
                    </div>
                </div>

                {mismatchSkill && (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        Would you like to add <strong>{mismatchSkill.name}</strong> to your wanted skills?
                        This will allow you to request sessions with teachers offering this skill.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="skill-name" className="text-sm font-medium">Skill Name</Label>
                        <Input
                          id="skill-name"
                          value={mismatchSkill.name}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>

                      <div>
                        <Label htmlFor="skill-category" className="text-sm font-medium">Category</Label>
                        <Input
                          id="skill-category"
                          value={mismatchSkill.category || 'General'}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>

                      <div>
                        <Label htmlFor="skill-description" className="text-sm font-medium">Description <span className="text-red-500">*</span></Label>
                        <Textarea
                          id="skill-description"
                          value={skillDescription}
                          onChange={(e) => setSkillDescription(e.target.value)}
                          placeholder="Please add a short description so teachers understand your learning goal..."
                          rows={3}
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Required: Explain what you want to learn about this skill
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowMismatchDialog(false)
                  setSkillDescription('')
                }}
                disabled={addingSkill}
              >
                Cancel
              </Button>
              {mismatchSkill && (
                <Button
                  onClick={() => handleAddWantedSkill(mismatchSkill, skillDescription)}
                  disabled={addingSkill || !skillDescription.trim()}
                >
                  {addingSkill ? 'Adding...' : 'Add Skill to Wanted List'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Alert Dialog */}
      <CustomAlert
        isOpen={alertOpen}
        title={alertData.title}
        description={alertData.description}
        confirmText={alertData.confirmText}
        cancelText={alertData.cancelText}
        isConfirm={alertData.isConfirm}
        onConfirm={confirmAlert}
        onCancel={cancelAlert}
      />

      {/* Approve / Reject modal */}
      <Dialog open={requestActionModal.open} onOpenChange={(open) => setRequestActionModal(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{requestActionModal.mode === 'approve' ? 'Approve Request' : 'Reject Request'}</DialogTitle>
            <DialogDescription>
              Optional message to send along with your {requestActionModal.mode === 'approve' ? 'approval' : 'rejection'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="request-message">Message (optional)</Label>
            <Textarea
              id="request-message"
              value={requestActionModal.message}
              onChange={(e) => setRequestActionModal(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Add a short note..."
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setRequestActionModal(prev => ({ ...prev, open: false }))}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!requestActionModal.requestId) return
                if (requestActionModal.mode === 'approve') {
                  handleApproveRequest(requestActionModal.requestId, requestActionModal.message || undefined)
                } else {
                  handleRejectRequest(requestActionModal.requestId, requestActionModal.message || undefined)
                }
                setRequestActionModal({ open: false, mode: 'approve', requestId: null, message: '' })
              }}
            >
              {requestActionModal.mode === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
