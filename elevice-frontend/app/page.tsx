"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useUserSession } from "@/hooks/useUserSession"

function WavyLinesCanvas() {
  // Use a ref to get a reference to the canvas element
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Get the canvas element from the ref
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get the 2D rendering context
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set the canvas dimensions to match its content size
    canvas.width = canvas.parentElement?.clientWidth || 400; // w-32 = 8rem = 128px
    canvas.height = canvas.parentElement?.clientHeight || 400; // h-16 = 4rem = 64px

    // Add a resize listener to make the canvas responsive
    const handleResize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 400;
    };
    window.addEventListener('resize', handleResize);

    // Define constants for the wave's properties
    const waveFrequency = 0.1;
    const waveAmplitude = 2.2; // Minimal amplitude for a subtle effect
    const waveSpeed = 0.005;
    const lineWidth = 6; // The line thickness remains consistent

    // Create a linear gradient for the line color
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#75A8BA');
    gradient.addColorStop(0.5, '#4A6D7C');
    gradient.addColorStop(1, '#2F4858');

    let timeOffset = 0;
    let animationFrameId: number;

    /**
     * Draws a single wavy line with a specified rotation angle.
     * @param {number} angle - The rotation angle in radians.
     */
    const drawLine = (angle: number) => {
      ctx.beginPath();
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = gradient;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 8 * 5;
      ctx.moveTo(centerX, centerY);

      const time = performance.now() * waveSpeed;
      const pulsatingAmplitude = (Math.sin(time) + 1) * waveAmplitude / 2 + 0.5;

      for (let i = 0; i < canvas.width / 2; i++) {
        const y = pulsatingAmplitude * Math.sin(i * waveFrequency + timeOffset);
        const x = i;

        const rotatedX = x * Math.cos(angle) - y * Math.sin(angle);
        const rotatedY = x * Math.sin(angle) + y * Math.cos(angle);

        const finalX = centerX + rotatedX;
        const finalY = centerY + rotatedY;

        ctx.lineTo(finalX, finalY);
      }

      ctx.stroke();
    };

    /**
     * The main animation loop.
     * Clears the canvas, draws both wave shapes, and schedules the next frame.
     */
    const drawWavyLines = () => {
      // Clear the canvas. This is what makes the background transparent.
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const angle = 180

      // Draw the two lines at a 150 and 210-degree angle
      const angleRad1 = (angle + 60) * Math.PI / 180;
      const angleRad2 = (angle + 120) * Math.PI / 180;

      drawLine(angleRad1);
      drawLine(angleRad2);

      timeOffset += 0.05;

      animationFrameId = requestAnimationFrame(drawWavyLines);
    };

    // Start the animation loop when the component mounts
    drawWavyLines();

    // The cleanup function stops the animation and removes the event listener
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // The component returns a single canvas element inside a div.
  return (
    <div className="">
      <canvas ref={canvasRef} />
    </div>
  );
}



export default function VoiceInterviewSimulator() {
  const router = useRouter()
  const { userId } = useUserSession()

  const [links, setLinks] = useState({ github: '', notion: '', video: '' })

  useEffect(() => {
    async function fetchLinks() {
      const { data, error } = await supabase
        .from('links')
        .select('id, url')
        .in('id', ['github', 'notion', 'video'])
      if (error) {
        console.error('Error fetching links:', error)
        return
      }
      // Map the results to an object
      const linksObj = { github: '', notion: '', video: '' }
      data?.forEach((row: { id: string, url: string }) => {
        if (row.id === 'github') linksObj.github = row.url
        if (row.id === 'notion') linksObj.notion = row.url
        if (row.id === 'video') linksObj.video = row.url
      })
      setLinks(linksObj)
    }
    fetchLinks()
  }, [])

  return (
    <div className="min-h-screen bg-[#F0F1F1] flex flex-col justify-between">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-4xl mx-auto text-center inline-block">
          <div className="relative">
            <h1 className="text-6xl md:text-8xl font-normal text-black mb-12 uppercase tracking-wide leading-none">
              ELEVICE
            </h1>
          </div>

          <p className="text-lg md:text-xl text-black mb-8 max-w-2xl mx-auto leading-relaxed">
            PRACTICE YOUR INTERVIEW SKILLS WITH AI-POWERED MOCK INTERVIEWS. GET REAL-TIME FEEDBACK AND IMPROVE YOUR
            PERFORMANCE.
          </p>

          <div className="space-y-6 justify-center items-center">
            <button
              onClick={() => router.push("/interview-setup")}
              className="bg-[#4A6D7C] text-white px-8 py-3 text-lg uppercase tracking-wide hover:bg-[#3A5A6B] transition-colors duration-200 border-0"
            >
              START INTERVIEW PRACTICE
            </button>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.push("/interview-history")}
                className="bg-transparent text-[#4A6D7C] px-8 py-3 text-lg uppercase tracking-wide border border-[#4A6D7C] hover:bg-[#4A6D7C] hover:text-white transition-colors duration-200"
              >
                VIEW PAST SESSIONS
              </button>
              
              <button
                onClick={() => router.push("/jobs")}
                className="bg-transparent text-[#4A6D7C] px-8 py-3 text-lg uppercase tracking-wide border border-[#4A6D7C] hover:bg-[#4A6D7C] hover:text-white transition-colors duration-200"
              >
                MANAGE JOBS
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Links row at the bottom */}
      <div className="w-full py-8 flex justify-center items-center bg-[#F0F1F1] border-t border-gray-200">
        <div className="flex gap-4">
          <a href={links.github} target="_blank" rel="noopener noreferrer" className="px-6 py-2 rounded border border-[#4A6D7C] bg-transparent text-[#4A6D7C] text-sm uppercase tracking-wide hover:bg-[#4A6D7C] hover:text-white transition-colors duration-200">🐙 GitHub</a>
          <a href={links.notion} target="_blank" rel="noopener noreferrer" className="px-6 py-2 rounded border border-[#4A6D7C] bg-transparent text-[#4A6D7C] text-sm uppercase tracking-wide hover:bg-[#4A6D7C] hover:text-white transition-colors duration-200">🗒️ Notion</a>
          <a href={links.video} target="_blank" rel="noopener noreferrer" className="px-6 py-2 rounded border border-[#4A6D7C] bg-transparent text-[#4A6D7C] text-sm uppercase tracking-wide hover:bg-[#4A6D7C] hover:text-white transition-colors duration-200">🎥 Video</a>
        </div>
      </div>
    </div>
  )
}
