'use client'

import { useState, useRef, useEffect } from 'react'

export default function VoiceInput({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const [error, setError] = useState('')
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setSupported(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'ar-YE'
    recognition.continuous = true
    recognition.interimResults = true

    let finalTranscript = ''

    recognition.onresult = (event: any) => {
      let interimTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }
      onTranscript(finalTranscript + interimTranscript)
    }

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setError('لم يُسمح باستخدام الميكروفون. فعل الإذن من إعدادات المتصفح.')
      } else if (event.error === 'no-speech') {
        setError('لم يُسمع أي صوت. حاول مرة أخرى.')
      } else {
        setError('تعذّر التسجيل: ' + event.error)
      }
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      try {
        recognition.stop()
      } catch {
        // تجاهل
      }
    }
  }, [onTranscript])

  function toggleListening() {
    setError('')
    if (!recognitionRef.current) return

    if (listening) {
      recognitionRef.current.stop()
      setListening(false)
    } else {
      try {
        recognitionRef.current.start()
        setListening(true)
      } catch {
        setError('تعذّر بدء التسجيل')
      }
    }
  }

  if (!supported) return null

  return (
    <div>
      <button
        type="button"
        onClick={toggleListening}
        className={
          listening
            ? 'text-xs font-bold px-4 py-2 rounded-lg bg-red-600 text-white animate-pulse w-full'
            : 'text-xs font-bold px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition w-full'
        }
      >
        {listening ? '⏹ إيقاف التسجيل' : '🎤 إملاء صوتي'}
      </button>

      {listening && (
        <p className="text-[10px] text-slate-500 mt-1.5 text-center">
          تحدّث الآن... سيظهر النص تلقائياً. راجعه قبل الحفظ.
        </p>
      )}

      {error && <p className="text-[10px] text-red-600 mt-1.5">{error}</p>}
    </div>
  )
}
