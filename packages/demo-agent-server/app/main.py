"""Demo Agent Server — FastAPI 기반 Python 오케스트레이션 서버.

Port: 8000
Endpoints:
  POST /chat — 일반 JSON 응답
  POST /chat/stream — SSE 스트리밍 응답
  GET /health — 헬스 체크
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import uvicorn

from .config import settings
from .orchestrate import ChatRequest, orchestrate_chat_turn, orchestrate_chat_turn_sse

app = FastAPI(
    title="A2UI Demo Agent Server",
    description="Python Agent Server for A2UI PoC — orchestrates intent resolution, tool execution, and A2UI surface generation",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/chat")
async def chat(request: ChatRequest):
    """Process a chat turn and return structured response."""
    result = await orchestrate_chat_turn(request)
    return result.model_dump()


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """Process a chat turn with SSE streaming response."""
    return StreamingResponse(
        orchestrate_chat_turn_sse(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "demo-agent-server",
        "mcp_url": settings.mcp_server_url,
        "mock_api_url": settings.mock_api_url,
        "llm_available": bool(settings.openai_api_key),
        "openai_model": settings.openai_model,
    }


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
