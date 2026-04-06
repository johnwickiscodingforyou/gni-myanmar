'use client'

import { useEffect, useState } from 'react'

function formatTime(date: Date, tz: string): string {
  return date.toLocaleTimeString('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function formatDate(date: Date, tz: string): string {
  return date.toLocaleDateString('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export default function LiveClock() {
  const [nyTime, setNyTime] = useState('--:--:--')
  const [nyDate, setNyDate] = useState('...')
  const [utcTime, setUtcTime] = useState('--:--:--')
  const [utcDate, setUtcDate] = useState('...')

  useEffect(() => {
    function tick() {
      const now = new Date()
      setNyTime(formatTime(now, 'America/New_York'))
      setNyDate(formatDate(now, 'America/New_York'))
      setUtcTime(formatTime(now, 'UTC'))
      setUtcDate(formatDate(now, 'UTC'))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex items-center gap-4 mt-3 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg w-fit text-xs">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
      <div className="flex items-baseline gap-1.5">
        <span className="font-medium text-gray-400 uppercase tracking-wider">NYC</span>
        <span className="font-mono font-medium text-white tabular-nums">{nyTime}</span>
        <span className="font-mono text-gray-500">{nyDate}</span>
      </div>
      <div className="w-px h-5 bg-gray-600" />
      <div className="flex items-baseline gap-1.5">
        <span className="font-medium text-gray-400 uppercase tracking-wider">UTC</span>
        <span className="font-mono font-medium text-white tabular-nums">{utcTime}</span>
        <span className="font-mono text-gray-500">{utcDate}</span>
      </div>
    </div>
  )
}
