FROM node:20-slim

RUN apt-get update && apt-get install -y poppler-utils && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# قيم عامة (Public) بطبيعتها، آمنة للتضمين المباشر - القيم السرية الحقيقية تبقى في Environment Variables بلوحة Render
ENV NEXT_PUBLIC_SUPABASE_URL=https://crpjulgnywcbsvdgehiw.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_wsIMNnPBKI6oGtJ7ntzAWA_ppKv93nv
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=BHk5qXJIXUQ6CcdGGEXwWdwO4wSaDsRc4BhKbZWrgLDahlm_1eJJaCKtIhIOvOiLObxwsnTwL1RgtPinlHkBg_c

RUN npm run build

EXPOSE 10000

CMD ["npm", "start"]
