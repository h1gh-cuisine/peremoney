# Локальная разработка

## Требования

- Node.js, совместимый с Next.js 15 и NestJS 11.
- npm.
- Docker с Docker Compose.
- Свободные порты 3010, 4010 и 5433 для QA-контура.

## Первый запуск

```bash
cd server
cp .env.example .env
docker compose up -d postgres
npm install
npm run prisma:generate
npm run prisma:deploy
npm run start:dev
```

В отдельном терминале:

```bash
cd client
cp .env.example .env.local
npm install
npm run dev -- -p 3010
```

Для backend на QA-порту задайте `PORT=4010`. Frontend должен получить `NEXT_PUBLIC_API_URL=http://localhost:4010/api` **до** запуска или сборки.

## Проверка

```bash
curl -f http://127.0.0.1:4010/api/health
curl -f http://127.0.0.1:4010/api/health/ready
```

Откройте `http://localhost:3010/login`. MASTER создаётся/обновляется из `MASTER_LOGIN` и `MASTER_PASSWORD` при старте приложения.

## Сборка

```bash
cd server && npm run build
cd ../client && npm run build
```

## Частые проблемы

- **Порт занят:** Next автоматически выбирает другой порт; для воспроизводимого стенда явно передавайте `-p 3010`.
- **`Cannot find module .next/...` или React Client Manifest:** остановите dev-сервер, переместите/очистите `.next-dev`, затем запустите снова. Не запускайте `next build` и старый `next dev` с общей cache-папкой.
- **401 после перезапуска:** войдите заново; JWT привязан к активному пользователю и `sessionVersion`.
- **Prisma schema mismatch:** выполните `npm run prisma:deploy` и проверьте `npx prisma migrate status`.
- **Leads Factory `fetch failed`:** проверьте DNS/TLS/VPN и URL; полезная диагностика — `curl -4 --http1.1`.
