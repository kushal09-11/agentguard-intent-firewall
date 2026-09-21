from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.database.database import init_db
from app.routes import agent, analytics, audit, firewall, goal

app = FastAPI(title="AgentGuard — Intent-Aware Runtime Firewall for AI Agents", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

for r in (goal.router, firewall.router, agent.router, audit.router, analytics.router):
    app.include_router(r)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "agentguard", "version": "0.2.0"}


@app.exception_handler(HTTPException)
async def http_err(_: Request, e: HTTPException):
    return JSONResponse({"error": "request_failed", "detail": e.detail}, status_code=e.status_code)


@app.exception_handler(RequestValidationError)
async def validation_err(_: Request, e: RequestValidationError):
    msg = "; ".join(f"{'.'.join(str(x) for x in i['loc'][1:])}: {i['msg']}" for i in e.errors())
    return JSONResponse({"error": "validation_error", "detail": f"Invalid request — {msg}"}, status_code=422)
