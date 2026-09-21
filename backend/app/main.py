from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.database.database import init_db
from app.routes import agent, firewall, goal

app = FastAPI(title="AgentGuard", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_methods=["*"], allow_headers=["*"])
init_db()
for r in (goal.router, firewall.router, agent.router):
    app.include_router(r)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "agentguard"}


@app.exception_handler(HTTPException)
async def http_err(_: Request, e: HTTPException):
    return JSONResponse({"error": "request_failed", "detail": e.detail}, status_code=e.status_code)


@app.exception_handler(RequestValidationError)
async def validation_err(_: Request, e: RequestValidationError):
    msg = "; ".join(f"{'.'.join(str(x) for x in i['loc'][1:])}: {i['msg']}" for i in e.errors())
    return JSONResponse({"error": "validation_error", "detail": f"Invalid request — {msg}"}, status_code=422)
