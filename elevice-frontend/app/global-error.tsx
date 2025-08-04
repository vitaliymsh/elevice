"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global error caught:", error)
  }, [error])

  const handleGoHome = () => {
    // Redirect to home page
    window.location.href = "/"
  }

  return (
    <html>
      <body>
        <div className="min-h-screen bg-[#F0F1F1] flex items-center justify-center px-4">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white p-8 shadow-lg rounded-lg">
              <h1 className="text-3xl font-normal text-black mb-4 uppercase tracking-wide">
                SOMETHING WENT WRONG
              </h1>
              <p className="text-lg text-[#4A6D7C] mb-6">
                An unexpected error occurred.
              </p>
              
              <div className="space-y-4">
                <button
                  onClick={reset}
                  className="w-full bg-[#4A6D7C] text-white px-6 py-3 text-lg uppercase tracking-wide hover:bg-[#3A5A6B] transition-colors duration-200 border-0"
                >
                  TRY AGAIN
                </button>
                
                <button
                  onClick={handleGoHome}
                  className="w-full bg-transparent text-[#4A6D7C] px-6 py-3 text-lg uppercase tracking-wide border border-[#4A6D7C] hover:bg-[#4A6D7C] hover:text-white transition-colors duration-200"
                >
                  GO TO HOME PAGE
                </button>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
