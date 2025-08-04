import { useRouter } from "next/navigation"

/**
 * Utility hook for redirecting to different pages
 */
export const useRedirect = () => {
  const router = useRouter()

  const redirectToHome = () => {
    router.push("/")
  }

  const redirectToInterviewHistory = () => {
    router.push("/interview-history")
  }

  const redirectToInterviewSetup = () => {
    router.push("/interview-setup")
  }

  const redirectToJobs = () => {
    router.push("/jobs")
  }

  const redirectWithDelay = (path: string, delay: number = 2000) => {
    setTimeout(() => {
      router.push(path)
    }, delay)
  }

  return {
    redirectToHome,
    redirectToInterviewHistory,
    redirectToInterviewSetup,
    redirectToJobs,
    redirectWithDelay,
    router
  }
}

/**
 * Utility function to check if a route exists in our application
 */
export const isValidRoute = (pathname: string): boolean => {
  const validRoutes = [
    '/',
    '/interview-setup',
    '/interview-history', 
    '/jobs'
  ]

  // Check exact matches first
  if (validRoutes.includes(pathname)) {
    return true
  }

  // Check dynamic routes
  if (pathname.startsWith('/interview-session/') && pathname.split('/').length === 3) {
    return true // interview-session/[id]
  }

  return false
}

/**
 * Utility function to redirect invalid routes to home
 */
export const handleInvalidRoute = () => {
  if (typeof window !== 'undefined') {
    window.location.href = '/'
  }
}
