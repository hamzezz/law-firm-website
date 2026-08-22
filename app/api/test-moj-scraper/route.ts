import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

const BASE_URL = 'https://judg.moj.gov.ye'
const PAGE_PATH = '/JudgmentData/CustomRetCourtSittingByDate'

export async function GET() {
  try {
    const res = await fetch(`${BASE_URL}${PAGE_PATH}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    })

    if (!res.ok) {
      return NextResponse.json({ step: 'GET صفحة البحث', ok: false, status: res.status })
    }

    const setCookieHeaders = res.headers.getSetCookie ? res.headers.getSetCookie() : []
    const cookieHeader = setCookieHeaders.map((c) => c.split(';')[0]).join('; ')

    const html = await res.text()
    const $ = cheerio.load(html)
    const verificationToken = $('input[name="__RequestVerificationToken"]').attr('value')

    const provinceOptions: { value: string; text: string }[] = []
    $('select option').each((_, el) => {
      const value = $(el).attr('value')
      const text = $(el).text().trim()
      if (value) provinceOptions.push({ value, text })
    })

    return NextResponse.json({
      step: 'تحليل الصفحة',
      ok: true,
      hasToken: !!verificationToken,
      tokenPreview: verificationToken ? verificationToken.slice(0, 15) + '...' : null,
      hasCookie: !!cookieHeader,
      cookiePreview: cookieHeader ? cookieHeader.slice(0, 30) + '...' : null,
      firstOptionsFound: provinceOptions.slice(0, 15),
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
}
