Внутренняя платформа для преподавателей летней школы: пошаговые модули с материалами,
задания с ИИ-инструментами (Gemini), тесты, анонимная рецензия коллег и рейтинг.

## Стек

- Next.js (App Router) + TypeScript + Tailwind
- Auth.js (Credentials) с JWT-сессиями
- Prisma ORM (dev: SQLite)
- Gemini API (`@google/genai`) — генерация и проверка заданий
- `@react-pdf/renderer` / `docx` — экспорт работ

## Запуск локально

```bash
npm install
cp .env.example .env   # заполнить GEMINI_API_KEY и NEXTAUTH_SECRET
npx prisma migrate deploy
npx prisma db seed     # дни/модули/вопросы/задания
npm run dev
```

## Переменные окружения

См. `.env.example`. Обязательные для запуска: `DATABASE_URL`, `NEXTAUTH_SECRET`,
`NEXTAUTH_URL`, `GEMINI_API_KEY`. Остальные — параметры баланса (лимиты попыток/рецензий,
веса рейтинга) со значениями по умолчанию в `src/lib/config.ts`.

## ⚠️ Перед деплоем на Vercel

Сейчас `prisma/schema.prisma` использует `provider = "sqlite"` с файлом на диске
(`DATABASE_URL="file:./dev.db"`). Это подходит только для локальной разработки — на Vercel
файловая система эфемерна и не расшарена между инстансами функций, так что SQLite там
**не будет сохранять данные между запросами**.

Перед деплоем нужно:
1. Завести managed Postgres (Vercel Postgres, Neon, Supabase — любой).
2. Сменить `provider = "sqlite"` → `provider = "postgresql"` в `prisma/schema.prisma`.
3. Пересоздать миграции под Postgres (`npx prisma migrate dev`) и накатить их на новую БД.
4. Прописать `DATABASE_URL` реальной БД и `NEXTAUTH_SECRET` (сгенерировать новый, не dev-заглушку)
   в переменных окружения проекта на Vercel.
