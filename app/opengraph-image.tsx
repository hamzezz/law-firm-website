import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'مكتب وليد الكثيري للمحاماة'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const cairoFont = await fetch(
    new URL('https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvangtZmpQdkhzfH5lkSscQyyS4J0.woff')
  ).then((res) => res.arrayBuffer())

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 10,
            background: 'linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)',
          }}
        />
        <div
          style={{
            width: 130,
            height: 130,
            borderRadius: '50%',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 64,
            marginBottom: 30,
            boxShadow: '0 0 0 6px rgba(245, 158, 11, 0.3)',
          }}
        >
          ⚖️
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: '#ffffff',
            fontFamily: 'Cairo',
            marginBottom: 12,
          }}
        >
          مكتب وليد الكثيري
        </div>
        <div
          style={{
            fontSize: 30,
            color: '#fbbf24',
            fontFamily: 'Cairo',
            fontWeight: 700,
          }}
        >
          للمحاماة والاستشارات القانونية والتحكيم
        </div>
        <div
          style={{
            display: 'flex',
            gap: 40,
            marginTop: 40,
            fontSize: 20,
            color: '#94a3b8',
            fontFamily: 'Cairo',
          }}
        >
          <span>+15 عاماً من الخبرة</span>
          <span>•</span>
          <span>96% نسبة كسب القضايا</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Cairo',
          data: cairoFont,
          style: 'normal',
          weight: 700,
        },
      ],
    }
  )
}
