'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Plus, BookOpen, Users, ArrowLeft, X } from 'lucide-react'
import Link from 'next/link'
import { CustomAlert, useCustomAlert } from '@/components/custom-alert'

interface Skill {
  id: number
  name: string
  description?: string
  category?: string
}

const skillCategories = [
  'Technology',
  'Languages',
  'Arts & Design',
  'Music',
  'Sports & Fitness',
  'Cooking & Culinary',
  'Business',
  'Science',
  'Writing',
  'Photography',
  'Other'
]

export default function SkillsPage() {
  const { isOpen: alertOpen, alertData, showAlert, showConfirm, closeAlert, confirmAlert, cancelAlert } = useCustomAlert()
  const [offeredSkills, setOfferedSkills] = useState<Skill[]>([])
  const [wantedSkills, setWantedSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddSkillDialog, setShowAddSkillDialog] = useState(false)
  const [skillType, setSkillType] = useState<'offered' | 'wanted'>('offered')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    loadSkills()
  }, [])

  const checkAuth = () => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/auth/login')
      return
    }
  }

  const loadSkills = async () => {
    try {
      const token = localStorage.getItem('token')
      const userId = localStorage.getItem('userId')

      if (!token || !userId) {
        router.push('/auth/login')
        return
      }

      // Load user profile to get skills
      const response = await fetch(`http://localhost:8080/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const userData = await response.json()
        setOfferedSkills(userData.offeredSkills || [])
        setWantedSkills(userData.wantedSkills || [])
      }
    } catch (error) {
      console.error('Failed to load skills:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      const userId = localStorage.getItem('userId')

      if (!token || !userId) {
        router.push('/auth/login')
        return
      }

      // Create skill
      const skillData = {
        name: formData.name,
        description: formData.description || null,
        category: formData.category || null
      }

      // Add skill to user's profile
      const endpoint = skillType === 'offered' ? 'skills/offered' : 'skills/wanted'
      const response = await fetch(`http://localhost:8080/api/users/${userId}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(skillData)
      })

      if (!response.ok) {
        throw new Error('Failed to add skill')
      }

      await loadSkills()

      setFormData({ name: '', description: '', category: '' })
      setShowAddSkillDialog(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add skill')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveSkill = async (skillId: number, type: 'offered' | 'wanted') => {
    const confirmed = await showConfirm(`Are you sure you want to remove this ${type === 'offered' ? 'offered' : 'wanted'} skill?`, {
      title: 'Confirm Removal',
      confirmText: 'Remove',
      cancelText: 'Cancel'
    })
    if (!confirmed) return

    try {
      const token = localStorage.getItem('token')
      const userId = localStorage.getItem('userId')

      if (!token || !userId) {
        router.push('/auth/login')
        return
      }

      const endpoint = type === 'offered'
        ? `skills/offered/${skillId}`
        : `skills/wanted/${skillId}`

      const response = await fetch(`http://localhost:8080/api/users/${userId}/${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to remove skill')
      }

      await loadSkills()
    } catch (error) {
      console.error('Failed to remove skill:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading your skills...</p>
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
              <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </Link>
              <BookOpen className="w-8 h-8 text-indigo-600 mr-2" />
              <h1 className="text-xl font-bold text-gray-900">My Skills</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Skills I Offer */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center text-green-600">
                    <BookOpen className="w-5 h-5 mr-2" />
                    Skills I Offer
                  </CardTitle>
                  <CardDescription>
                    Skills you can teach others
                  </CardDescription>
                </div>
                <Dialog open={showAddSkillDialog && skillType === 'offered'} onOpenChange={(open) => {
                  setShowAddSkillDialog(open)
                  if (open) setSkillType('offered')
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Skill
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Skill to Offer</DialogTitle>
                      <DialogDescription>
                        Add a skill that you can teach others
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddSkill} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Skill Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., React Development"
                          required
                          disabled={submitting}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                          disabled={submitting}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {skillCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe your expertise and what you can teach..."
                          rows={3}
                          disabled={submitting}
                        />
                      </div>

                      {error && (
                        <Alert variant="destructive">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}

                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAddSkillDialog(false)}
                          disabled={submitting}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                          {submitting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            'Add Skill'
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {offeredSkills.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No skills offered yet</h3>
                  <p className="text-gray-600">Share your expertise with the community</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {offeredSkills.map((skill) => (
                    <div key={skill.id} className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 truncate">{skill.name}</h4>
                          {skill.category && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">
                              {skill.category}
                            </Badge>
                          )}
                        </div>
                        {skill.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{skill.description}</p>
                        )}
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSkill(skill.id, 'offered')}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skills I Want to Learn */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center text-blue-600">
                    <Users className="w-5 h-5 mr-2" />
                    Skills I Want to Learn
                  </CardTitle>
                  <CardDescription>
                    Skills you're interested in learning
                  </CardDescription>
                </div>
                <Dialog open={showAddSkillDialog && skillType === 'wanted'} onOpenChange={(open) => {
                  setShowAddSkillDialog(open)
                  if (open) setSkillType('wanted')
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Skill
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Skill to Learn</DialogTitle>
                      <DialogDescription>
                        Add a skill that you want to learn from others
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddSkill} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Skill Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Spanish Conversation"
                          required
                          disabled={submitting}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                          disabled={submitting}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {skillCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="What do you want to learn about this skill?"
                          rows={3}
                          disabled={submitting}
                        />
                      </div>

                      {error && (
                        <Alert variant="destructive">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}

                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAddSkillDialog(false)}
                          disabled={submitting}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                          {submitting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            'Add Skill'
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {wantedSkills.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No skills wanted yet</h3>
                  <p className="text-gray-600">Discover new skills from our community</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {wantedSkills.map((skill) => (
                    <div key={skill.id} className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 truncate">{skill.name}</h4>
                          {skill.category && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">
                              {skill.category}
                            </Badge>
                          )}
                        </div>
                        {skill.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{skill.description}</p>
                        )}
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSkill(skill.id, 'wanted')}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tips Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Tips for Better Skill Sharing</CardTitle>
            <CardDescription>
              Make your profile more attractive to potential teachers and learners
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">For Skills You Offer:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Be specific about your expertise level</li>
                  <li>• Mention years of experience</li>
                  <li>• Include what makes you unique</li>
                  <li>• Specify your teaching style</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">For Skills You Want to Learn:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Explain why you want to learn it</li>
                  <li>• Mention your current skill level</li>
                  <li>• Specify what you hope to achieve</li>
                  <li>• Be open to different teaching approaches</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

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
    </div>
  )
}
