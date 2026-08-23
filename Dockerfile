FROM node:20-slim

# تثبيت poppler-utils (يوفر pdftotext) اللازمة لتحليل ملفات جلسات وزارة العدل
RUN apt-get update && apt-get install -y poppler-utils && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 10000

CMD ["npm", "start"]
