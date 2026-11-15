# Quiz Web

Website ngân hàng câu hỏi và thi trắc nghiệm bằng tiếng Việt. Ứng dụng dùng React + TypeScript + Vite, Express, Prisma và PostgreSQL. Trên Render, Express phục vụ API cùng static build của frontend.

## Chạy local

1. Cài Node.js 20+ và PostgreSQL.
2. Sao chép `.env.example` thành `.env`, đặt `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_BOOTSTRAP_EMAIL` và `ADMIN_BOOTSTRAP_PASSWORD`.
3. Chạy `npm install`, `npm run db:generate`, `npm run db:deploy` (hoặc `npm run db:migrate -- --name init` khi tạo migration local mới).
4. Chạy `npm run dev`; Vite dùng cổng 5173 và proxy `/api` tới Express cổng 3000.

Các lệnh: `npm run build`, `npm test`, `npm run typecheck`, `npm run db:migrate`, `npm run db:deploy`.

Xem [DEPLOY_RENDER.md](DEPLOY_RENDER.md) để triển khai.
