This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## A2UI PoC Demo

시연에서 A2UI MCP 연동까지 확인하려면 아래 3개 서버를 각각 다른 터미널에서 실행합니다.

```bash
# Terminal 1: fixture 데이터를 제공하는 Mock API
npm run dev -w @a2ui/demo-mock-api
# http://localhost:3200

# Terminal 2: A2UI MCP/Admin 서버
npm run dev -w @a2ui/admin
# Admin UI: http://localhost:3100
# MCP endpoint: http://localhost:3100/mcp

# Terminal 3: Next.js 프론트엔드
npm run dev
# http://localhost:3000
```

브라우저에서는 보통 아래 페이지를 확인합니다.

```text
http://localhost:3000/a2ui-test
http://localhost:3000/a2ui-test/admin
http://localhost:3000/a2ui-test/guide
```

Python FastAPI agent까지 시연하려면 추가 터미널에서 선택적으로 실행합니다.

```bash
cd packages/demo-agent-server
source .venv/bin/activate
python -m uvicorn app.main:app --port 8000
# http://localhost:8000
```

Next.js 챗봇 API가 Python agent를 호출하게 하려면 Next.js 실행 전에 `ASSISTANT_BACKEND=python`을 지정합니다.

```bash
ASSISTANT_BACKEND=python npm run dev
```

요약하면 UI만 확인할 때는 `npm run dev`만으로 충분하고, A2UI MCP 연동 시연에는 Mock API `3200`, MCP/Admin `3100`, Next.js `3000`이 필요합니다. Python agent 시연은 FastAPI `8000`을 추가로 켜고 `ASSISTANT_BACKEND=python`으로 Next.js를 실행합니다. OpenAI 설정은 `.env.local`의 `OPENAI_API_KEY`, `OPENAI_MODEL`을 사용하며, 키가 없어도 일부 경로는 mock/fallback 응답으로 동작합니다.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
