"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function CatchAll() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to main page immediately for catch-all routes
    router.push("/")
  }, [router])

  return (
    <div className="min-h-screen bg-[#F0F1F1] flex items-center justify-center px-4">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white p-8 shadow-lg rounded-lg">
          <h1 className="text-2xl font-normal text-black mb-4 uppercase tracking-wide">
            REDIRECTING...
          </h1>
          <div className="flex justify-center">
            <div className="w-8 h-8 border-2 border-[#4A6D7C] border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
