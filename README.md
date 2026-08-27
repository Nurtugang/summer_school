Внутренняя платформа для преподавателей летней школы: пошаговые модули с материалами,
задания с ИИ-инструментами (Gemini), тесты, анонимная рецензия коллег и рейтинг.

## Стек

- Next.js (App Router) + TypeScript + Tailwind
- Auth.js (Credentials) с JWT-сессиями
- Prisma ORM (SQLite)
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

`GEMINI_PROXY_URL` — опционально, нужен только если сервер стоит в стране/датацентре,
которую Gemini API блокирует по IP (ошибка `User location is not supported`). Формат:
`http(s)://user:pass@host:port`.

## Деплой на свой сервер (self-hosted)

Приложение развёрнуто на собственном VPS: SQLite-файл, `pm2` как процесс-менеджер, nginx —
реверс-прокси. Т.к. это не serverless-платформа, файловая БД сохраняется между запросами
без проблем (в отличие от Vercel/AWS Lambda и т.п.).

```bash
git clone <repo> && cd summer_school
npm install
cp .env.example .env   # заполнить, NEXTAUTH_URL — реальный домен с http/https по факту
npx prisma migrate deploy
npx prisma db seed
npm run build
pm2 start npm --name summer-school -- start
pm2 save
```

nginx — реверс-прокси на `localhost:3000` под нужный домен, дальше `certbot --nginx` для SSL
(после чего `NEXTAUTH_URL` поменять на `https://...` и перезапустить pm2).

В `src/lib/auth.ts` уже включён `trustHost: true` — Auth.js по умолчанию не доверяет `Host`
от произвольного реверс-прокси, без этого будет `UntrustedHost`.
