import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import LoginPage from './page'

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

const mockGetUser = vi.fn()
const mockSignInWithOAuth = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    mockSignInWithOAuth.mockResolvedValue({})
  })

  describe('loading state', () => {
    it('shows loading text while checking auth', () => {
      mockGetUser.mockReturnValue(new Promise(() => {})) // never resolves
      render(<LoginPage />)
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('unauthenticated state', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    })

    it('shows the Kentic logo', async () => {
      render(<LoginPage />)
      await waitFor(() => {
        expect(screen.getByAltText('Kentic')).toBeInTheDocument()
      })
    })

    it('shows tagline text', async () => {
      render(<LoginPage />)
      await waitFor(() => {
        expect(screen.getByText(/track your income and expenses/i)).toBeInTheDocument()
      })
    })

    it('shows Google sign-in button', async () => {
      render(<LoginPage />)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
      })
    })
  })

  describe('authenticated redirect', () => {
    it('does not show the login button when user is already logged in (stays loading)', async () => {
      // When user exists, the page stays in loading=true and shows "Loading..."
      // because setLoading(false) is only called when there's no user
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
      render(<LoginPage />)

      await waitFor(() => {
        // After redirect branch, Google button should not be visible
        expect(screen.queryByRole('button', { name: /continue with google/i })).not.toBeInTheDocument()
      })
    })
  })

  describe('Google login click', () => {
    it('calls signInWithOAuth when button is clicked', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
      render(<LoginPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith(
          expect.objectContaining({ provider: 'google' })
        )
      })
    })
  })
})
