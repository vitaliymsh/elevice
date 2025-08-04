"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function InterviewNotFound() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to interview history page after a short delay
    const timer = setTimeout(() => {
      router.push("/interview-history")
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-[#F0F1F1] flex items-center justify-center px-4">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white p-8 shadow-lg rounded-lg">
          <h1 className="text-3xl font-normal text-black mb-4 uppercase tracking-wide">
            INTERVIEW NOT FOUND
          </h1>
          <p className="text-lg text-[#4A6D7C] mb-4">
            The interview session you're looking for doesn't exist or you don't have access to it.
          </p>
          <p className="text-sm text-gray-600 mb-6">
            Redirecting to interview history in 3 seconds...
          </p>
          
          {/* Loading indicator */}
          <div className="flex justify-center mb-6">
            <div className="w-8 h-8 border-2 border-[#4A6D7C] border-t-transparent rounded-full animate-spin"></div>
          </div>
          
          {/* Manual redirect buttons */}
          <div className="space-y-3">
            <button
              onClick={() => router.push("/interview-history")}
              className="w-full bg-[#4A6D7C] text-white px-6 py-3 text-lg uppercase tracking-wide hover:bg-[#3A5A6B] transition-colors duration-200 border-0"
            >
              VIEW INTERVIEW HISTORY
            </button>
            
            <button
              onClick={() => router.push("/")}
              className="w-full bg-transparent text-[#4A6D7C] px-6 py-3 text-lg uppercase tracking-wide border border-[#4A6D7C] hover:bg-[#4A6D7C] hover:text-white transition-colors duration-200"
            >
              GO TO HOME PAGE
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
