'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Users, BookOpen, CheckCircle, AlertTriangle } from 'lucide-react'

declare global {
  interface Window {
    google: any;
    requestCalendarAccess?: () => void;
  }
}

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [googleUserData, setGoogleUserData] = useState<any>(null)
  const [completionFormData, setCompletionFormData] = useState({
    username: '',
    fullName: '',
    location: '',
    bio: '',
    password: '',
    confirmPassword: ''
  })
  const [usernameError, setUsernameError] = useState('')
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [usernameTimeout, setUsernameTimeout] = useState<NodeJS.Timeout | null>(null)
  const [completionLoading, setCompletionLoading] = useState(false)

  // Validation logic for completion form
  const isCompletionFormValid = useMemo(() => {
    const hasRequiredFields = completionFormData.fullName?.trim() &&
                             completionFormData.username?.trim() &&
                             completionFormData.password?.trim() &&
                             completionFormData.confirmPassword?.trim()
    const isUsernameValid = completionFormData.username?.length >= 3 && !usernameError
    const isPasswordValid = completionFormData.password?.length >= 6 &&
                           completionFormData.password === completionFormData.confirmPassword
    return hasRequiredFields && isUsernameValid && isPasswordValid && !usernameChecking
  }, [completionFormData, usernameError, usernameChecking])

  const resetCompletionModal = () => {
    setCompletionFormData({
      username: '',
      fullName: '',
      location: '',
      bio: '',
      password: '',
      confirmPassword: ''
    })
    setUsernameError('')
    setPasswordError('')
    setGoogleUserData(null)
    setError('')
  }

  const router = useRouter()

  useEffect(() => {
    // Load Google OAuth script
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    script.onload = () => {
      // Initialize Google Sign-In
      if (window.google) {
        let calendarTokenClient: any = null;

        // Initialize Google OAuth 2.0 flow for Calendar access
        calendarTokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: '1001273272414-r8edq47mlv5j2b0b75v1db1dkt47rjlj.apps.googleusercontent.com',
          scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly'
          // No callback here - we'll set it dynamically in the sign-in handler
        });

        // Initialize Google Identity Services for authentication
        window.google.accounts.id.initialize({
          client_id: '1001273272414-r8edq47mlv5j2b0b75v1db1dkt47rjlj.apps.googleusercontent.com',
          callback: (response: any) => handleGoogleSignIn(response, calendarTokenClient),
          context: 'signin'
        })

        // Render the Google Sign-In button
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular'
          }
        )
      }
    }

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  // Cleanup username timeout on unmount
  useEffect(() => {
    return () => {
      if (usernameTimeout) {
        clearTimeout(usernameTimeout)
      }
    }
  }, [usernameTimeout])

  const handleGoogleSignIn = async (response: any, calendarTokenClient?: any) => {
    setGoogleLoading(true)
    setError('')

    try {
      console.log('🔐 Google sign-in initiated...')

      let calendarToken = null
      let calendarExpiry = null

      // After successful authentication, request Calendar access
      if (calendarTokenClient) {
        console.log('📅 Requesting Calendar access...')

        // Request calendar access and wait for it
        await new Promise<void>((resolve) => {
          const originalCallback = calendarTokenClient.callback
          calendarTokenClient.callback = (response: any) => {
            if (response.access_token) {
              calendarToken = response.access_token
              calendarExpiry = Date.now() + 3600000 // 1 hour
              sessionStorage.setItem('googleCalendarToken', response.access_token)
              sessionStorage.setItem('googleCalendarExpiry', calendarExpiry.toString())
              console.log('✅ Got Calendar access token')
            }
            // Call original callback if it exists
            if (originalCallback) originalCallback(response)
            resolve()
          }
          calendarTokenClient.requestAccessToken()
        })
      }

      // Extract tokens from Google response
      const googleLoginData = {
        idToken: response.credential,
        accessToken: calendarToken || response.access_token || '',
        refreshToken: '', // GIS doesn't provide refresh tokens
        tokenExpiry: calendarExpiry || (response.expires_at ? response.expires_at * 1000 : Date.now() + (3600 * 1000))
      }

      console.log('🔑 Token summary:')
      console.log('  ID token present:', !!response.credential)
      console.log('  Calendar token present:', !!calendarToken)
      console.log('  General access token present:', !!response.access_token)
      console.log('  Final access token:', !!googleLoginData.accessToken)

      console.log('📤 Sending Google credential to backend for verification...')

      const loginResponse = await fetch('http://localhost:8080/api/auth/google-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleLoginData)
      })

      if (!loginResponse.ok) {
        const errorText = await loginResponse.text()
        console.error('❌ Google login failed:', errorText)
        throw new Error(errorText || 'Google login failed')
      }

      const data = await loginResponse.json()
      console.log('✅ Google login successful for user:', data.username, '(ID:', data.userId + ')')

      const isProfileComplete = data.username && data.username.trim() !== ''

      if (isProfileComplete) {
        console.log('🔄 User profile already complete, auto-signing in...')
        localStorage.setItem('token', data.token)
        localStorage.setItem('userId', data.userId)
        localStorage.setItem('username', data.username)
        localStorage.setItem('user', JSON.stringify(data))

        // Clean up session storage
        sessionStorage.removeItem('googleCalendarToken')
        sessionStorage.removeItem('googleCalendarExpiry')

        router.push('/dashboard')
      } else {
        console.log('🔧 User profile incomplete, showing completion modal...')
        setGoogleUserData(data)

        setCompletionFormData({
          username: data.username || '',
          fullName: data.fullName || '',
          location: data.location || '',
          bio: data.bio || '',
          password: '',
          confirmPassword: ''
        })
        setShowCompletionModal(true)
      }
    } catch (error) {
      console.error('❌ Google sign-in error:', error)
      setError(error instanceof Error ? error.message : 'Google login failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleSubmit = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Login failed')
      }

      const data = await response.json()

      localStorage.setItem('token', data.token)
      localStorage.setItem('userId', data.userId)
      localStorage.setItem('username', data.username)
      localStorage.setItem('user', JSON.stringify(data))

      router.push('/dashboard')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCompletionSubmit = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    setCompletionLoading(true)

    try {
      if (!googleUserData) {
        throw new Error('No Google user data available')
      }

      if (!completionFormData.fullName.trim()) {
        throw new Error('Full name is required')
      }

      if (!completionFormData.username.trim()) {
        throw new Error('Username is required')
      }

      if (completionFormData.username.length < 3) {
        throw new Error('Username must be at least 3 characters long')
      }

      if (usernameError) {
        throw new Error(usernameError)
      }

      if (!completionFormData.password.trim()) {
        throw new Error('Password is required')
      }

      if (completionFormData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long')
      }

      if (completionFormData.password !== completionFormData.confirmPassword) {
        throw new Error('Passwords do not match')
      }

      const updateData = {
        username: completionFormData.username.trim(),
        fullName: completionFormData.fullName.trim(),
        location: completionFormData.location.trim() || null,
        bio: completionFormData.bio.trim() || null,
        password: completionFormData.password.trim()
      }

      const response = await fetch(`http://localhost:8080/api/users/${googleUserData.userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${googleUserData.token}`
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to update profile')
      }

      const responseData = await response.json()

      const finalToken = responseData.token || googleUserData.token

      localStorage.setItem('token', finalToken)
      localStorage.setItem('userId', googleUserData.userId.toString())
      localStorage.setItem('username', completionFormData.username)
      localStorage.setItem('user', JSON.stringify({
        ...googleUserData,
        username: completionFormData.username
      }))

      console.log('✅ Profile completion successful, redirecting to dashboard...')
      setShowCompletionModal(false)
      router.push('/dashboard')
    } catch (error) {
      console.error('❌ Profile completion failed:', error)
      setError(error instanceof Error ? error.message : 'Profile completion failed')
      setShowCompletionModal(false)
    } finally {
      setCompletionLoading(false)
    }
  }

  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 3) {
      setUsernameError('')
      return
    }

    if (googleUserData?.username && googleUserData.username === username) {
      setUsernameError('')
      setUsernameChecking(false)
      return
    }

    setUsernameChecking(true)
    setUsernameError('')

    try {
      const response = await fetch(`http://localhost:8080/api/auth/check-username?username=${encodeURIComponent(username)}`, {
        method: 'GET'
      })

      if (response.status === 409) {
        setUsernameError('This username is already taken. Please choose another one.')
      } else if (response.ok) {
        setUsernameError('')
      } else {
        setUsernameError('')
      }
    } catch (error) {
      console.error('Error checking username availability:', error)
      setUsernameError('')
    } finally {
      setUsernameChecking(false)
      setUsernameTimeout(null)
    }
  }

  const handleCompletionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    setCompletionFormData(prev => ({
      ...prev,
      [name]: value
    }))

    if (name === 'username') {
      setUsernameError('')
      setUsernameChecking(false)

      if (usernameTimeout) {
        clearTimeout(usernameTimeout)
        setUsernameTimeout(null)
      }

      if (value.length >= 3) {
        setUsernameChecking(true)

        const timeout = setTimeout(() => {
          checkUsernameAvailability(value)
        }, 500)

        setUsernameTimeout(timeout)
      }
    }

    if (name === 'password' || name === 'confirmPassword') {
      setPasswordError('')

      if (name === 'password' && completionFormData.confirmPassword) {
        if (value !== completionFormData.confirmPassword) {
          setPasswordError('Passwords do not match')
        }
      } else if (name === 'confirmPassword' && completionFormData.password) {
        if (value !== completionFormData.password) {
          setPasswordError('Passwords do not match')
        }
      }

      if (completionFormData.password === completionFormData.confirmPassword &&
          completionFormData.password?.length >= 6) {
        setPasswordError('')
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleKeyPress = (e: React.KeyboardEvent, handler: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handler()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-full mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SkillShare</h1>
          <p className="text-gray-600">Connect, Learn, Grow Together</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={handleChange}
                  onKeyPress={(e) => handleKeyPress(e, handleSubmit)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  onKeyPress={(e) => handleKeyPress(e, handleSubmit)}
                  disabled={loading}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleSubmit}
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </div>

            {/* Divider */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>
            </div>

            {/* Google Sign In */}
            <div className="mt-6">
              <div id="google-signin-button" className="w-full flex justify-center"></div>
              {googleLoading && (
                <div className="flex items-center justify-center mt-2">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in with Google...
                </div>
              )}
            </div>

          </CardContent>
        </Card>

        {/* Google OAuth Profile Completion Modal - FIXED */}
        <Dialog open={showCompletionModal} onOpenChange={(open) => {
          setShowCompletionModal(open)
          if (!open) resetCompletionModal()
        }}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
            {/* Fixed Header - No Scroll */}
            <DialogHeader className="px-6 pt-6 pb-4 border-b bg-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <DialogTitle className="text-xl font-bold text-gray-900">
                    Complete Your Profile
                  </DialogTitle>
                  <DialogDescription className="text-sm text-gray-600">
                    Just a few details to get started
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {googleUserData && (
                <div className="space-y-4">
                  {/* Google Info Summary - Compact */}
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-green-800">Google Account Connected</p>
                        <p className="text-xs text-green-700 truncate">{googleUserData.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Required Fields */}
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="completion-fullName" className="text-sm font-medium">
                          Full Name *
                        </Label>
                        <Input
                          id="completion-fullName"
                          name="fullName"
                          type="text"
                          placeholder="Enter your full name"
                          value={completionFormData.fullName}
                          onChange={handleCompletionChange}
                          disabled={completionLoading}
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="completion-username" className="text-sm font-medium">
                          Username *
                        </Label>
                        <div className="relative">
                          <Input
                            id="completion-username"
                            name="username"
                            type="text"
                            placeholder="Choose a unique username"
                            value={completionFormData.username}
                            onChange={handleCompletionChange}
                            minLength={3}
                            disabled={completionLoading}
                            className={`h-9 pr-9 ${
                              usernameError
                                ? 'border-red-300 focus:border-red-500'
                                : completionFormData.username && completionFormData.username.length >= 3 && !usernameError && !usernameChecking
                                  ? 'border-green-300 focus:border-green-500'
                                  : ''
                            }`}
                          />
                          {usernameChecking && (
                            <Loader2 className="absolute right-2.5 top-2 w-4 h-4 animate-spin text-yellow-500" />
                          )}
                          {!usernameChecking && completionFormData.username && completionFormData.username.length >= 3 && !usernameError && (
                            <CheckCircle className="absolute right-2.5 top-2 w-4 h-4 text-green-500" />
                          )}
                        </div>
                        {usernameError && (
                          <p className="text-xs text-red-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {usernameError}
                          </p>
                        )}
                        {!usernameError && !usernameChecking && completionFormData.username && completionFormData.username.length >= 3 && (
                          <p className="text-xs text-green-600">✓ Available</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="completion-password" className="text-sm font-medium">
                            Password *
                          </Label>
                          <Input
                            id="completion-password"
                            name="password"
                            type="password"
                            placeholder="Min. 6 characters"
                            value={completionFormData.password}
                            onChange={handleCompletionChange}
                            minLength={6}
                            disabled={completionLoading}
                            className="h-9"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="completion-confirmPassword" className="text-sm font-medium">
                            Confirm *
                          </Label>
                          <Input
                            id="completion-confirmPassword"
                            name="confirmPassword"
                            type="password"
                            placeholder="Repeat password"
                            value={completionFormData.confirmPassword}
                            onChange={handleCompletionChange}
                            minLength={6}
                            disabled={completionLoading}
                            className={`h-9 ${
                              passwordError
                                ? 'border-red-300'
                                : completionFormData.confirmPassword && completionFormData.password === completionFormData.confirmPassword && completionFormData.password.length >= 6
                                  ? 'border-green-300'
                                  : ''
                            }`}
                          />
                        </div>
                      </div>
                      {passwordError && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {passwordError}
                        </p>
                      )}
                      {completionFormData.confirmPassword && completionFormData.password === completionFormData.confirmPassword && completionFormData.password.length >= 6 && (
                        <p className="text-xs text-green-600">✓ Passwords match</p>
                      )}
                    </div>

                    {/* Optional Fields */}
                    <div className="pt-2 border-t space-y-3">
                      <p className="text-xs text-gray-500 font-medium">Optional Information</p>
                      
                      <div className="space-y-1.5">
                        <Label htmlFor="completion-location" className="text-sm">
                          Location
                        </Label>
                        <Input
                          id="completion-location"
                          name="location"
                          type="text"
                          placeholder="City, Country"
                          value={completionFormData.location}
                          onChange={handleCompletionChange}
                          disabled={completionLoading}
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="completion-bio" className="text-sm">
                          Bio
                        </Label>
                        <Textarea
                          id="completion-bio"
                          name="bio"
                          placeholder="Tell us about yourself..."
                          value={completionFormData.bio}
                          onChange={handleCompletionChange}
                          rows={3}
                          disabled={completionLoading}
                          className="resize-none text-sm"
                        />
                      </div>
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-sm">{error}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Fixed Footer - No Scroll */}
            <div className="px-6 py-4 border-t bg-gray-50 flex gap-3 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCompletionModal(false)
                  resetCompletionModal()
                }}
                disabled={completionLoading}
                className="flex-1 h-9"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCompletionSubmit}
                disabled={!isCompletionFormValid || completionLoading}
                className="flex-1 h-9 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                {completionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Complete Profile
                    <CheckCircle className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}