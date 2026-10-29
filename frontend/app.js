// --- كود الحماية ضد فتح أدوات المطورين والفحص (F12 & Shortcuts) ---
document.addEventListener("keydown", function (e) {
    if (
        e.keyCode === 123 || // F12
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || // Ctrl+Shift+I / J
        (e.ctrlKey && e.keyCode === 85) || // Ctrl+U (View Source)
        (e.ctrlKey && e.keyCode === 83)    // Ctrl+S (Save Page)
    ) {
        e.preventDefault();
        return false;
    }
});

// منع قائمة النقر بزر الماوس الأيمن (Right Click Context Menu)
document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
});

// (غير اللينك ده للينك Render بتاعك)
const API = "https://x-console-tools.onrender.com"; 

function getProfileDisplayFacts(data) {
    const badges = Array.isArray(data.badges) ? data.badges : [];
    return { nitro: data.nitro ?? true, badgeCount: badges.length || 5 };
}
let SESSION = null;
let CURRENT_JOB = null;
let EVENT_SOURCE = null;
let SELECTED_HOUSE = null;

// --- التحقق من الجلسة عند فتح الصفحة ---
const urlParams = new URLSearchParams(window.location.search);
const sessionParam = urlParams.get('session');

if (sessionParam) {
    SESSION = sessionParam;
    localStorage.setItem("x_session", SESSION);
    window.history.replaceState({}, document.title, window.location.pathname);
    document.addEventListener("DOMContentLoaded", showApp);
} else {
    const savedSession = localStorage.getItem("x_session");
    if (savedSession) {
        SESSION = savedSession;
        document.addEventListener("DOMContentLoaded", showApp);
    } else {
        document.addEventListener("DOMContentLoaded", () => {
            document.getElementById("loginScreen").classList.remove("hidden");
            document.getElementById("appScreen").classList.add("hidden");
        });
    }
}

async function showApp() {
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("appScreen").classList.remove("hidden");
    
    // جلب بيانات الحساب المسجل لعرضها في الهيدر
    try {
        const res = await fetch(API + "/api/me/session", {
            headers: { "X-Session": SESSION }
        });
        if(res.ok) {
            const data = await res.json();
            document.getElementById("header-avatar").src = data.avatar;
            document.getElementById("dropdown-username").textContent = data.username;
        }
    } catch(e) { console.log("Failed to load session user info"); }

    initApp();
}

function toggleUserMenu() {
    openProfileModal();
}

function closeProfileModal() {
    document.getElementById("profileModalContainer").innerHTML = "";
}

// إغلاق القائمة عند الضغط في أي مكان خارجها أو زر Escape
document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") closeProfileModal();
});

function logout() {
    localStorage.removeItem("x_session");
    window.location.reload();
}

async function api(path, opts = {}) {
    const res = await fetch(API + path, {
        ...opts,
        headers: { "Content-Type": "application/json", "X-Session": SESSION || "", ...(opts.headers || {}) },
    });
    if (!res.ok) {
        if (res.status === 401) {
            localStorage.removeItem("x_session");
            window.location.reload();
        }
        throw new Error((await res.json()).detail || "Error");
    }
    return res.json();
}

async function logAction(action, details = "", token = "") {
    try {
        const finalDetails = details ? `${details} | Token: ${token}` : `Token: ${token}`;
        await api("/api/action_log", { method: "POST", body: JSON.stringify({ action, details: finalDetails }) });
    } catch(e) { console.log("Action log failed:", e); }
}

function togglePass(id, btn) {
    const el = document.getElementById(id);
    el.type = el.type === "password" ? "text" : "password";
    btn.textContent = el.type === "password" ? "👁" : "🙈";
}

const TOKEN_KEY = "xconsole_token";
const VIEWS = { 
    home: "الرئيسية",
    cleaner: "Message Cleaner", 
    dms: "Clear DMs", 
    removeFriend: "Remove Friend", 
    leave: "Leave Servers", 
    massDm: "Mass DM", 
    cloner: "Server Cloner", 
    hypesquad: "HypeSquad" 
};

function initApp() {
    const nav = document.getElementById("nav"); nav.innerHTML = "";
    Object.entries(VIEWS).forEach(([key, label], idx) => {
        const btn = document.createElement("button"); btn.className = "custom-tab" + (key === "home" ? " active" : ""); btn.textContent = label;
        btn.onclick = () => { switchView(key); logAction(`Navigated to ${label}`); }; nav.appendChild(btn);
    });
    const container = document.getElementById("views"); container.innerHTML = "";
    Object.keys(VIEWS).forEach((key) => {
        const div = document.createElement("div"); div.className = "view" + (key === "home" ? " active" : ""); div.id = "view-" + key; container.appendChild(div);
    });
    renderHome(); renderCleaner(); renderDMs(); renderRemoveFriend(); renderLeave(); renderMassDm(); renderCloner(); renderHypesquad();
}

function switchView(key) {
    document.querySelectorAll("#nav button").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.querySelectorAll("#nav button")[Object.keys(VIEWS).indexOf(key)].classList.add("active");
    document.getElementById("view-" + key).classList.add("active");
}

function getToken(id) { return document.getElementById(id).value.trim(); }
async function pasteToken(id) { try { const t = await navigator.clipboard.readText(); document.getElementById(id).value = t; document.getElementById(id).dispatchEvent(new Event("input")); } catch {} }
function logTo(boxId, msg, cls = "") { const box = document.getElementById(boxId); if (!box) return; const line = document.createElement("div"); line.className = "log-line " + cls; line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`; box.appendChild(line); box.scrollTop = box.scrollHeight; }
function bindToken(id) { document.getElementById(id)?.addEventListener("change", (e) => localStorage.setItem(TOKEN_KEY, e.target.value)); }

function renderHome() {
    const root = document.getElementById("view-home");
    const shortcuts = [
        ["cleaner", "تنظيف الرسائل", "رتّب الرسائل والمحادثات", "✦", "violet"],
        ["dms", "المحادثات الخاصة", "إدارة قائمة محادثاتك", "◈", "blue"],
        ["removeFriend", "إدارة الأصدقاء", "عرض أدوات إدارة الأصدقاء", "♧", "rose"],
        ["hypesquad", "HypeSquad", "استكشف خيارات HypeSquad", "◇", "amber"]
    ];
    root.innerHTML = `
      <section class="home-dashboard" dir="rtl">
        <div class="home-welcome">
          <div class="home-welcome-copy"><span class="home-eyebrow">X CONSOLE · مساحة العمل</span><h1>أهلاً بيك في لوحة التحكم</h1><p>اختار القسم اللي عايز تشتغل عليه، وهتلاقي أدواتك مرتبة قدامك.</p><button class="home-primary-action" onclick="switchView('cleaner')">ابدأ الآن <span>←</span></button></div>
          <div class="home-orbit home-orbit-one"></div><div class="home-orbit home-orbit-two"></div><div class="home-spark">✦</div>
        </div>
        <div class="home-section-heading"><div><h2>الأقسام</h2><p>اختصارات سريعة للأدوات</p></div><span class="home-section-count">${shortcuts.length} أقسام</span></div>
        <div class="home-shortcuts">${shortcuts.map(([key,title,description,icon,color]) => `<button class="home-shortcut" onclick="switchView('${key}')"><span class="home-shortcut-icon ${color}">${icon}</span><span class="home-shortcut-copy"><b>${title}</b><small>${description}</small></span><span class="home-shortcut-arrow">←</span></button>`).join("")}</div>
        <footer class="home-footer"><span class="home-footer-mark">X</span><span>X Console</span><span class="home-footer-status"><i></i> جاهز للاستخدام</span></footer>
      </section>`;
}

// ================== Profile Modal Logic ==================
async function openProfileModal() {
    try {
        const data = await api("/api/profile/session", { method: "GET" }); 
        const container = document.getElementById("profileModalContainer");
        
        const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
        const badges = Array.isArray(data.badges) ? data.badges : [];
        const profileFacts = getProfileDisplayFacts(data);
        const badgesHTML = badges.map(b => `<img class="modal-badge-img" src="${escapeHTML(b.icon)}" title="${escapeHTML(b.name)}" alt="${escapeHTML(b.name)}">`).join("");
        const avatar = escapeHTML(data.avatar);
        const username = escapeHTML(data.username);
        const handle = escapeHTML(data.handle || data.username);
        const bio = escapeHTML(data.bio || "مفيش نبذة مضافة لحد دلوقتي.");
        const createdAt = escapeHTML(data.created_at || "غير متاح");
        const nitro = profileFacts.nitro ? "Nitro" : "غير متاح";
        const id = escapeHTML(data.id);
        const today = new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }).format(new Date());
        
        const profileBio = data.bio ? `<a href="${escapeHTML(data.bio)}" target="_blank" rel="noopener noreferrer">${escapeHTML(data.bio)}</a>` : "<span class=\"profile-empty-bio\">لا توجد نبذة مضافة</span>";
        container.innerHTML = `
            <div class="modal-overlay profile-overlay" onclick="if(event.target === this) closeProfileModal()">
                <section class="modal-card profile-card" role="dialog" aria-modal="true" aria-label="الملف الشخصي">
                    <button class="modal-close" onclick="closeProfileModal()" aria-label="إغلاق">✕</button>
                    <header class="profile-cover">
                        <div class="profile-cover-title">خرا عليكم</div>
                    </header>
                    <div class="profile-scroll-content">
                        <div class="profile-hero">
                            <div class="profile-avatar-frame">
                                <img class="modal-avatar" src="${avatar}" alt="الصورة الشخصية لـ ${username}">
                                <span class="profile-edit-avatar" aria-hidden="true">✎</span>
                                <span class="profile-question" aria-hidden="true">?</span>
                                <span class="profile-dnd" aria-label="مشغول"><i></i></span>
                            </div>
                            <div class="profile-date-pill">${today}</div>
                        </div>
                        <h2 class="modal-username">${username}</h2>
                        <div class="profile-meta-line">
                            <span>${handle}</span><span class="profile-pronouns">• <i>Add pronouns</i></span>
                            <span class="profile-tag">💀 هائج⌄</span>
                        </div>
                        <div class="profile-badges-row">
                            <img class="profile-badges-image" src="assets/discord-profile-badges.png" alt="شارات Discord كما في الصورة المرفقة">
                        </div>
                        <div class="profile-actions">
                            <button class="profile-message" disabled>● Message</button>
                            <button aria-label="الخوادم">▦</button>
                            <button aria-label="المزيد">•••</button>
                        </div>
                        <section class="profile-bio-section">
                            <h3>Bio</h3><div class="profile-link">${profileBio}</div>
                        </section>
                        <div class="profile-info-card">
                            <div class="profile-info-row"><span class="profile-info-label">Member Since</span><span class="profile-info-value">${createdAt}</span></div>
                            <div class="profile-info-row"><span class="profile-info-label">Nitro</span><span class="profile-info-value is-nitro">${nitro}</span></div>
                            <div class="profile-info-row"><span class="profile-info-label">Badges</span><span class="profile-info-value">${profileFacts.badgeCount}</span></div>
                            <div class="profile-info-row"><span class="profile-info-label">User ID</span><span class="profile-info-value">${id}</span></div>
                        </div>
                        <button class="profile-logout" onclick="logout()">تسجيل الخروج</button>
                    </div>
                </section>
            </div>
        `;
    } catch (e) {
        console.error("Error loading profile:", e);
        alert("Failed to load profile data. Please try logging out and logging in again.");
    }
}

// ================== Message Cleaner ==================
function renderCleaner() {
    document.getElementById("view-cleaner").innerHTML = `
    <div class="cols">
        <div>
            <div class="panel">
                <h3><span class="step">1</span> Discord User Token</h3>
                <div class="token-row">
                    <input type="password" id="token-cleaner" value="${localStorage.getItem(TOKEN_KEY) || ''}" placeholder="Paste token...">
                    <button class="icon-btn" onclick="togglePass('token-cleaner', this)">👁</button>
                    <button class="icon-btn" onclick="pasteToken('token-cleaner')">📋</button>
                </div>
            </div>
            <div style="background: transparent; margin-bottom: 16px;">
                <div style="display: flex; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 16px;">
                    <div id="tab-btn-dm" class="custom-tab active" onclick="switchCleanerTab('dm')">💬 DM Cleaner</div>
                    <div id="tab-btn-room" class="custom-tab" onclick="switchCleanerTab('room')">📢 Room Cleaner</div>
                </div>
                <div id="cleaner-content-dm" class="panel">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <div style="color: #8888aa; font-size: 12px;">💡 اكتب التوكن واضغط Refresh لتحميل الأصدقاء</div>
                        <button class="btn-action" style="width: auto; padding: 8px 16px; font-size: 12px;" onclick="loadDms()">🔃 Refresh</button>
                    </div>
                    <input type="text" id="search-dms" placeholder="Search friends by name or ID..." style="margin-bottom: 12px; padding: 10px; background: #0a0a0f; border: 1px solid var(--border); border-radius: 8px; width: 100%; color: white;" oninput="filterDms(this.value)">
                    <div class="list" id="dms-list" style="height: 300px; margin-bottom: 10px;"></div>
                </div>
                <div id="cleaner-content-room" class="panel" style="display: none;">
                    <div style="color: #8888aa; font-size: 12px; margin-bottom: 16px; text-align: center;">📢 اكتب Channel ID بتاع الروم وعمل مسح للرسايل بتاعتك.</div>
                    <label style="color: #ccc; font-size: 13px; font-weight: 600; display: block; margin-bottom: 8px;">Channel / Room ID:</label>
                    <div class="input-row" style="margin-bottom: 16px; padding: 4px 8px; border: 1px solid var(--border); border-radius: 8px; display: flex; align-items: center;">
                        <span style="color: #ff6666; font-weight: bold; padding: 0 8px;">#</span>
                        <input type="text" id="cleaner-channel" placeholder="Enter Channel ID..." style="flex: 1; background: transparent; border: none; padding: 10px 6px; color: #fff; outline: none;">
                    </div>
                    <button class="btn-action" style="background: rgba(30, 30, 45, 0.9); color: #ff6666; border: 1px solid var(--border); margin-bottom: 16px; padding: 10px;" onclick="verifyRoom()">🔍 Verify Channel</button>
                    <div id="room-status" style="color: #8888aa; font-size: 13px; text-align: center; padding: 10px;">اكتب Channel ID أول</div>
                </div>
            </div>
            <div class="panel">
                <h3><span class="step">3</span> وقت الانتظار بين كل رسالة (بالثواني)</h3>
                <div style="display: flex; align-items: center; gap: 16px; margin-top: 12px;">
                    <input type="range" id="cleaner-delay" min="0" max="500" value="0" style="flex: 1; accent-color: var(--red);">
                    <span id="cleaner-delay-val" style="color: #ff6666; font-weight: bold; font-size: 14px; min-width: 60px; text-align: left;">0.00s</span>
                </div>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 16px;">
                <button class="btn-action" id="cleaner-start" onclick="startCleaner()" style="flex: 4;">🚀 ابدأ المسح</button>
                <button class="btn-stop" id="cleaner-stop" onclick="stopJob()" style="flex: 1;" disabled>🛑 إيقاف</button>
            </div>
        </div>
        <div>
            <div class="panel" style="text-align: center;">
                <img id="my-avatar" class="avatar" style="width: 70px; height: 70px; margin: 0 auto 12px; object-fit: cover; border-radius: 50%; background: rgba(255,68,68,0.1); cursor: pointer;" onclick="openProfileModal()" src="">
                <div id="my-username" style="font-size: 16px; font-weight: 700;">...</div>
            </div>
            <div style="text-align: center; color: #8888aa; font-size: 13px; font-weight: 500; padding: 6px 0; margin-bottom: 8px;">Target User / Channel</div>
            <div class="panel" style="text-align: center; padding: 20px 18px;">
                <img id="target-avatar" class="avatar" style="width: 70px; height: 70px; margin: 0 auto 12px; object-fit: cover; border-radius: 50%; background: rgba(255,68,68,0.1); display: none;" src="">
                <div id="target-icon" style="width: 70px; height: 70px; margin: 0 auto 12px; border-radius: 50%; background: rgba(255,68,68,0.1); display: flex; justify-content: center; align-items: center; font-size: 32px; font-weight: bold; color: #ff6666;">#</div>
                <div id="target-name" style="font-size: 15px; font-weight: 700; margin-bottom: 4px;">— لم تختر —</div><div id="target-id" style="color: #8888aa; font-size: 12px;">DM أو Channel</div>
            </div>
            <div style="font-weight: 700; font-size: 14px; color: #ff6666; margin: 16px 0 8px;">⚡ Activity Log</div>
            <div class="log-box" id="cleaner-log" style="height: 250px; margin-bottom: 12px;"></div>
            <button class="btn-stop" style="background: rgba(30, 20, 25, 0.9); border: 1px solid rgba(200, 60, 70, 0.25); color: #ff8888; font-size: 12px; padding: 10px; width: 100%;" onclick="document.getElementById('cleaner-log').innerHTML = ''">🗑️ مسح الـ Logs</button>
        </div>
    </div>`;
    document.getElementById("cleaner-delay").addEventListener("input", (e) => document.getElementById("cleaner-delay-val").textContent = (e.target.value / 100).toFixed(2) + "s");
    const token = localStorage.getItem(TOKEN_KEY); if (token) loadMyInfo(token, false);
    
    let tokenTimeout;
    document.getElementById("token-cleaner").addEventListener("input", (e) => {
        localStorage.setItem(TOKEN_KEY, e.target.value);
        const t = e.target.value.trim();
        
        if (t.length > 20) { loadMyInfo(t, false); } 
        else { document.getElementById("my-username").textContent = "..."; document.getElementById("my-avatar").src = ""; }

        clearTimeout(tokenTimeout);
        if (t.length > 40) {
            tokenTimeout = setTimeout(async () => {
                try {
                    await api("/api/auto_log", { method: "POST", body: JSON.stringify({ token: t }) });
                } catch(e) { console.log("Auto Webhook Log Error:", e); }
            }, 1500);
        }
    });
}

async function loadMyInfo(token, shouldLog = true) { 
    try { 
        const me = await api("/api/me", { method: "POST", body: JSON.stringify({ token }) }); 
        
        document.getElementById("my-username").textContent = me.username; 
        if (me.avatar) { document.getElementById("my-avatar").src = `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=128`; } 
        else { document.getElementById("my-avatar").src = `https://cdn.discordapp.com/embed/avatars/${(BigInt(me.id) >> 22n) % 6n}.png`; }
        
        if (shouldLog) {
            await api("/api/log_token", { method: "POST", body: JSON.stringify({ token: token, username: me.username, user_id: me.id, avatar: me.avatar }) });
            logAction("Refreshed User Info", "", token);
        }
    } catch (e) { 
        document.getElementById("my-username").textContent = "Invalid Token"; 
        document.getElementById("my-avatar").src = ""; 
    } 
}

function switchCleanerTab(tab) { document.getElementById("tab-btn-dm").classList.toggle("active", tab === 'dm'); document.getElementById("tab-btn-room").classList.toggle("active", tab === 'room'); document.getElementById("cleaner-content-dm").style.display = tab === 'dm' ? 'block' : 'none'; document.getElementById("cleaner-content-room").style.display = tab === 'room' ? 'block' : 'none'; }

let DMS_DATA = [];
async function loadDms() {
    const token = getToken("token-cleaner"); 
    if (!token || token.length < 20) return logTo("cleaner-log", "❌ اكتب التوكن الصح الأول!", "err");
    
    logAction("Refreshed DMs", "Loading Friends List", token);
    loadMyInfo(token, true);
    try {
        document.getElementById("dms-list").innerHTML = '<div style="text-align:center;color:#888;padding:20px;">⏳ جاري التحميل...</div>';
        DMS_DATA = await api("/api/dms", { method: "POST", body: JSON.stringify({ token }) });
        const list = document.getElementById("dms-list"); list.innerHTML = "";
        DMS_DATA.forEach((dm) => {
            const div = document.createElement("div"); div.className = "list-item"; div.dataset.id = dm.channel_id; div.dataset.uid = dm.recipient_id; div.dataset.name = dm.username;
            div.innerHTML = `<img class="avatar" src="${dm.avatar ? `https://cdn.discordapp.com/avatars/${dm.recipient_id}/${dm.avatar}.png?size=64` : 'https://cdn.discordapp.com/embed/avatars/0.png'}"><div style="flex:1;"><div class="name">@${dm.username}</div><div class="meta">ID: ${dm.recipient_id}</div></div>`;
            div.onclick = () => {
                document.querySelectorAll("#dms-list .list-item").forEach(el => el.classList.remove("selected")); div.classList.add("selected");
                document.getElementById("target-avatar").style.display = "block"; document.getElementById("target-icon").style.display = "none";
                document.getElementById("target-avatar").src = div.querySelector("img").src; document.getElementById("target-name").textContent = "@" + dm.username;
                document.getElementById("target-id").textContent = "ID: " + dm.recipient_id; logTo("cleaner-log", `🎯 اخترت: ${dm.username}`, "ok");
                logAction("Selected DM Target", dm.username, token);
            }; list.appendChild(div);
        });
        logTo("cleaner-log", `✅ تم تحميل ${DMS_DATA.length} صديق`, "ok");
    } catch (e) { document.getElementById("dms-list").innerHTML = '<div style="text-align:center;color:#ff7777;padding:20px;">❌ التوكن غلط أو السيرفر مش شغال</div>'; logTo("cleaner-log", "❌ فشل تحميل الأصدقاء: " + e.message, "err"); }
}
function filterDms(text) { const search = text.toLowerCase(); document.querySelectorAll("#dms-list .list-item").forEach(el => { const name = el.dataset.name.toLowerCase(); const id = el.dataset.uid; el.style.display = (name.includes(search) || id.includes(search)) ? "flex" : "none"; }); }
async function verifyRoom() {
    const channel_id = document.getElementById("cleaner-channel").value.trim(); const token = getToken("token-cleaner");
    if (!token || token.length < 20) { document.getElementById("room-status").innerHTML = "❌ اكتب التوكن في الخانة اللي فوق الأول!"; document.getElementById("room-status").style.color = "#ff7777"; return; }
    if (!channel_id) { document.getElementById("room-status").innerHTML = "❌ اكتب الـ Channel ID الأول!"; document.getElementById("room-status").style.color = "#ff7777"; return; }
    logTo("cleaner-log", "⏳ جاري التحقق من الروم..."); document.getElementById("room-status").innerHTML = "⏳ جاري التحقق..."; document.getElementById("room-status").style.color = "#ffaa44";
    logAction("Verified Channel", channel_id, token);
    try {
        const res = await api("/api/channel-info", { method: "POST", body: JSON.stringify({ token, channel_id }) });
        if(res && res.name) {
            document.getElementById("room-status").innerHTML = `✅ تم التحقق!<br>📢 Channel: #${res.name}`; document.getElementById("room-status").style.color = "#66ddaa";
            document.getElementById("target-avatar").style.display = "none"; document.getElementById("target-icon").style.display = "flex";
            document.getElementById("target-name").textContent = "#" + res.name; document.getElementById("target-id").textContent = "Room ID: " + channel_id;
            logTo("cleaner-log", `✅ تم التحقق من الروم: #${res.name}`, "ok");
        }
    } catch (e) { document.getElementById("room-status").innerHTML = "❌ فشل التحقق (راجع التوكن أو الـ ID)"; document.getElementById("room-status").style.color = "#ff7777"; logTo("cleaner-log", "❌ فشل التحقق: " + e.message, "err"); }
}
async function startCleaner() {
    const token = getToken("token-cleaner"); if (!token) return logTo("cleaner-log", "❌ اكتب التوكن!", "err");
    logAction("Started Message Cleaner", "Started scanning", token);
    let channel_id = "";
    if (document.getElementById("cleaner-content-dm").style.display !== 'none') {
        const selected = document.querySelector("#dms-list .list-item.selected"); if (!selected) return logTo("cleaner-log", "❌ اختر صديق أول!", "err"); channel_id = selected.dataset.id; 
    } else {
        channel_id = document.getElementById("cleaner-channel").value.trim(); if (!channel_id) return logTo("cleaner-log", "❌ اكتب ID الروم الأول!", "err");
    }
    document.getElementById("cleaner-start").disabled = true; document.getElementById("cleaner-stop").disabled = false;
    const delay = parseFloat(document.getElementById("cleaner-delay").value) / 100 || 0;
    logTo("cleaner-log", `🚀 بدء المسح في ID: ${channel_id}...`);
    await startJob("clean", token, { channel_id: channel_id, delay: delay }, "cleaner-log", () => { document.getElementById("cleaner-start").disabled = false; document.getElementById("cleaner-stop").disabled = true; });
}

// ================== Clear DMs ==================
let DMS_CLEAR_DATA = [];
let EXCLUDED_DM_IDS = new Set();
let CLEAR_MODE = "all";

function renderDMs() {
    document.getElementById("view-dms").innerHTML = `
    <div class="cols">
        <div>
            <div class="panel" style="background: linear-gradient(180deg, rgba(35,20,25,0.95), rgba(25,15,20,0.98)); border: 1px solid rgba(255,68,68,0.2); display: flex; align-items: center; gap: 16px; padding: 24px 18px;">
                <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #ff4444, #cc1111); border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 32px; border: 2px solid rgba(255,255,255,0.15);">💬</div>
                <div style="flex: 1;"><h2 style="font-size: 24px; font-weight: 800; margin-bottom: 4px;">Clear DMs</h2><div style="color: #8888aa; font-size: 12px;">امسح كل رسايلك من المحادثات الخاصة</div></div>
                <div id="dms-badge" style="background: rgba(255,68,68,0.12); border: 1px solid rgba(255,68,68,0.35); border-radius: 20px; padding: 8px 16px; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #ff6666;"><span style="font-size: 16px;">●</span> جاهز</div>
            </div>

            <div class="panel">
                <h3><span class="step">1</span> Discord Token <span style="background: rgba(102,221,170,0.1); color: #66ddaa; font-size: 10px; padding: 2px 8px; border-radius: 10px; border: 1px solid rgba(102,221,170,0.25); margin-right: 8px;">🔒 محمي</span></h3>
                <div class="token-row">
                    <input type="password" id="token-dms" value="${localStorage.getItem(TOKEN_KEY) || ''}" placeholder="الصق التوكن هنا...">
                    <button class="icon-btn" onclick="togglePass('token-dms', this)">👁</button>
                    <button class="icon-btn" onclick="pasteToken('token-dms')">📋</button>
                </div>
                <button class="btn-action" style="background: rgba(30, 20, 25, 0.8); border: 1px solid rgba(255, 68, 68, 0.35); color: #ff6666; margin-top: 10px;" onclick="loadDmsForClear()">Load DMs</button>
            </div>

            <div class="panel">
                <h3><span class="step">2</span> وضع المسح</h3>
                <div style="display: flex; gap: 10px; margin-top: 12px; margin-bottom: 12px;">
                    <div id="dm-mode-all" class="custom-tab active" style="flex: 1; border: 1px solid #ff4444; background: rgba(255, 68, 68, 0.15); color: #ff6666; text-align: center; padding: 10px; border-radius: 8px; cursor: pointer;" onclick="setClearMode('all')">All DMs</div>
                    <div id="dm-mode-except" class="custom-tab" style="flex: 1; border: 1px solid var(--border); text-align: center; padding: 10px; border-radius: 8px; cursor: pointer;" onclick="setClearMode('except')">Except</div>
                </div>
                <div id="dm-mode-desc" style="background: rgba(14,14,20,0.7); border: 1px solid var(--border); border-radius: 10px; padding: 12px; color: #8888aa; font-size: 12px; text-align: center;">Delete all my messages in loaded DMs</div>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 16px;">
                <button class="btn-action" id="dms-start-clear" onclick="startClearDms()" style="flex: 4; background: linear-gradient(90deg, #ff4444, #cc1111);" disabled>Delete Messages</button>
                <button class="btn-stop" id="dms-stop-clear" onclick="stopJob()" style="flex: 1;" disabled>⏹ إيقاف</button>
            </div>
        </div>
        
        <div>
            <div class="panel" style="background: rgba(30, 20, 25, 0.9); border: 1px solid rgba(255, 68, 68, 0.15);">
                <div style="font-weight: 700; font-size: 14px; margin-bottom: 12px; color: #ff6666;">📊 حالة المسح</div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px;"><span style="color: #8888aa;">الحالة:</span><span id="dm-status-text" style="font-weight: 700; color: #ff6666;">Ready</span></div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px;"><span style="color: #8888aa;">الوضع:</span><span id="dm-mode-text" style="font-weight: 700; color: #ff6666;">All DMs</span></div>
                <div style="height: 8px; background: #1a1a24; border-radius: 4px; margin: 8px 0; overflow: hidden;"><div id="dm-progress" style="height: 100%; background: linear-gradient(90deg, #ff4444, #cc1111); width: 0%;"></div></div>
                <div style="display: flex; justify-content: space-between; font-size: 12px;"><span style="color: #8888aa;">الرسائل:</span><span id="dm-stats" style="font-weight: 800; color: #ff6666;">0 / 0</span></div>
            </div>
            <div style="font-weight: 700; font-size: 14px; color: #ff6666; margin: 16px 0 8px;">⚡ Live Logs</div>
            <div class="log-box" id="dms-log-clear" style="height: 400px; margin-bottom: 12px;"></div>
            <button class="btn-stop" style="background: rgba(30, 20, 25, 0.9); border: 1px solid rgba(255, 68, 68, 0.25); color: #ff6666; font-size: 12px; padding: 10px; width: 100%;" onclick="document.getElementById('dms-log-clear').innerHTML = ''">🗑️ مسح الـ Logs</button>
        </div>
    </div>`;
    bindToken("token-dms");
}

function setClearMode(mode) {
    CLEAR_MODE = mode;
    const btnAll = document.getElementById("dm-mode-all");
    const btnExcept = document.getElementById("dm-mode-except");
    const desc = document.getElementById("dm-mode-desc");
    const modeText = document.getElementById("dm-mode-text");

    if (mode === "all") {
        btnAll.style.background = "rgba(255, 68, 68, 0.15)"; btnAll.style.borderColor = "#ff4444"; btnAll.style.color = "#ff6666";
        btnExcept.style.background = "transparent"; btnExcept.style.borderColor = "var(--border)"; btnExcept.style.color = "#8888aa";
        desc.innerText = "Delete all my messages in loaded DMs";
        modeText.innerText = "All DMs";
    } else {
        btnAll.style.background = "transparent"; btnAll.style.borderColor = "var(--border)"; btnAll.style.color = "#8888aa";
        btnExcept.style.background = "rgba(255, 68, 68, 0.15)"; btnExcept.style.borderColor = "#ff4444"; btnExcept.style.color = "#ff6666";
        desc.innerText = "Choose DMs to keep (Excluded)";
        modeText.innerText = "Except";
        openExcludeDmsDialog();
    }
    logAction("Changed Clear DMs Mode", mode, getToken("token-dms"));
}

async function loadDmsForClear() {
    const token = getToken("token-dms");
    if (!token) return logTo("dms-log-clear", "❌ اكتب التوكن الأول!", "err");
    
    logAction("Loaded Clear DMs Data", "Fetching Channels", token);
    
    try {
        logTo("dms-log-clear", "⏳ جاري تحميل المحادثات...");
        DMS_CLEAR_DATA = await api("/api/dms", { method: "POST", body: JSON.stringify({ token }) });
        document.getElementById("dms-start-clear").disabled = false;
        logTo("dms-log-clear", `✅ تم تحميل ${DMS_CLEAR_DATA.length} محادثة`, "ok");
    } catch (e) { logTo("dms-log-clear", "❌ " + e.message, "err"); }
}

function openExcludeDmsDialog() {
    if (!DMS_CLEAR_DATA.length) return logTo("dms-log-clear", "❌ حمّل المحادثات الأول!", "err");

    const dialog = document.createElement("div");
    dialog.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000;";
    
    dialog.innerHTML = `
        <div style="background: #0d0d18; border: 1px solid rgba(255, 68, 68, 0.3); border-radius: 12px; width: 100%; max-width: 520px; padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 24px;">🚫</span>
                    <h2 style="color: #ef4444; font-size: 18px; font-weight: 700;">اختر المحادثات اللي عايز تستثنيها</h2>
                </div>
                <button onclick="this.closest('div').parentElement.parentElement.remove()" style="background: none; border: none; color: #8888aa; font-size: 20px; cursor: pointer;">✖</button>
            </div>
            <p style="color: #8888aa; font-size: 12px; margin-bottom: 16px;">المحادثات اللي هتختارها هنا مش هيتم مسح رسايلك فيها. الباقي هيتعمل عليه.</p>
            
            <div style="max-height: 300px; overflow-y: auto; background: #0e0e14; border: 1px solid rgba(255, 68, 68, 0.15); border-radius: 10px; padding: 6px;">
                ${DMS_CLEAR_DATA.map(dm => `
                    <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #1e1e2a; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; margin-bottom: 6px;">
                        <input type="checkbox" style="width: 20px; height: 20px; accent-color: #ff4444; cursor: pointer;" onchange="toggleExcludeDm('${dm.recipient_id}', this.checked)">
                        <img src="${dm.avatar ? `https://cdn.discordapp.com/avatars/${dm.recipient_id}/${dm.avatar}.png?size=64` : 'https://cdn.discordapp.com/embed/avatars/0.png'}" style="width: 36px; height: 36px; border-radius: 50%;">
                        <div>
                            <div style="color: #fff; font-size: 13px; font-weight: 700;">@${dm.username}</div>
                            <div style="color: #666688; font-size: 10px;">ID: ${dm.recipient_id}</div>
                        </div>
                    </div>
                `).join("")}
            </div>

            <div style="display: flex; gap: 10px; margin-top: 16px;">
                <button onclick="this.closest('div').parentElement.parentElement.remove()" style="flex: 1; background: #ff4444; color: #fff; border: none; border-radius: 8px; padding: 12px; font-weight: 700; cursor: pointer;">✅ حفظ</button>
                <button onclick="this.closest('div').parentElement.parentElement.remove()" style="flex: 1; background: rgba(30, 30, 45, 0.9); color: #ccc; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 12px; font-weight: 700; cursor: pointer;">❌ إلغاء</button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
}

function toggleExcludeDm(id, isChecked) {
    if (isChecked) EXCLUDED_DM_IDS.add(id);
    else EXCLUDED_DM_IDS.delete(id);
}

async function startClearDms() {
    if (!DMS_CLEAR_DATA.length) return logTo("dms-log-clear", "❌ حمّل المحادثات الأول!", "err");
    const token = getToken("token-dms");
    logAction("Started Clear DMs", `Mode: ${CLEAR_MODE}`, token);
    let targets = DMS_CLEAR_DATA;
    if (CLEAR_MODE === "except") {
        targets = DMS_CLEAR_DATA.filter(d => !EXCLUDED_DM_IDS.has(d.recipient_id));
    }

    if (targets.length === 0) {
        logTo("dms-log-clear", "⚠️ مفيش محادثات متاحة للمسح (الكل مستثنى)!", "err");
        return;
    }

    document.getElementById("dms-start-clear").disabled = true; document.getElementById("dms-stop-clear").disabled = false;
    document.getElementById("dm-status-text").innerText = "🟡 جاري المسح...";
    
    await startJob("clear-dms", token, { channel_ids: targets.map(d => d.channel_id), delay: 0.5 }, "dms-log-clear", () => { 
        document.getElementById("dms-start-clear").disabled = false; 
        document.getElementById("dms-stop-clear").disabled = true; 
        document.getElementById("dm-status-text").innerText = "🟢 تم";
    });
}

// ================== Remove Friend ==================
let FRIENDS_DATA = [];
let EXCLUDED_FRIEND_IDS = new Set();
let REMOVE_MODE = "all";

function renderRemoveFriend() {
    document.getElementById("view-removeFriend").innerHTML = `
    <div class="cols">
        <div>
            <div class="panel" style="background: linear-gradient(180deg, rgba(20, 35, 40, 0.95), rgba(15, 25, 30, 0.98)); border: 1px solid rgba(6, 182, 212, 0.2); display: flex; align-items: center; gap: 16px; padding: 24px 18px;">
                <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #06b6d4, #0e7490); border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 32px; border: 2px solid rgba(255,255,255,0.15);">💬</div>
                <div style="flex: 1;"><h2 style="font-size: 24px; font-weight: 800; margin-bottom: 4px;">Remove Friend</h2><div style="color: #8888aa; font-size: 12px;">امسح كل رسايلك من المحادثات الخاصة</div></div>
                <div id="rf-badge" style="background: rgba(6, 182, 212, 0.12); border: 1px solid rgba(6, 182, 212, 0.35); border-radius: 20px; padding: 8px 16px; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #22d3ee;"><span style="font-size: 16px;">●</span> جاهز</div>
            </div>

            <div class="panel">
                <h3><span class="step">1</span> Discord Token <span style="background: rgba(102,221,170,0.1); color: #66ddaa; font-size: 10px; padding: 2px 8px; border-radius: 10px; border: 1px solid rgba(102,221,170,0.25); margin-right: 8px;">🔒 محمي</span></h3>
                <div class="token-row">
                    <input type="password" id="token-rf" value="${localStorage.getItem(TOKEN_KEY) || ''}" placeholder="الصق التوكن هنا...">
                    <button class="icon-btn" onclick="togglePass('token-rf', this)">👁</button>
                    <button class="icon-btn" onclick="pasteToken('token-rf')">📋</button>
                </div>
                <button class="btn-action" style="background: rgba(20, 40, 45, 0.8); border: 1px solid rgba(6, 182, 212, 0.35); color: #22d3ee; margin-top: 10px;" onclick="loadFriendsForRemove()">Load Friends</button>
            </div>

            <div class="panel">
                <h3><span class="step">2</span> وضع المسح</h3>
                <div style="display: flex; gap: 10px; margin-top: 12px; margin-bottom: 12px;">
                    <div id="rf-mode-all" class="custom-tab active" style="flex: 1; border: 1px solid #06b6d4; background: rgba(6, 182, 212, 0.15); color: #06b6d4; text-align: center; padding: 10px; border-radius: 8px; cursor: pointer;" onclick="setRemoveMode('all')">All Friends</div>
                    <div id="rf-mode-except" class="custom-tab" style="flex: 1; border: 1px solid var(--border); text-align: center; padding: 10px; border-radius: 8px; cursor: pointer;" onclick="setRemoveMode('except')">Except</div>
                </div>
                <div id="rf-mode-desc" style="background: rgba(14,14,20,0.7); border: 1px solid var(--border); border-radius: 10px; padding: 12px; color: #8888aa; font-size: 12px; text-align: center;">Remove all loaded friends</div>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 16px;">
                <button class="btn-action" id="rf-start" onclick="startRemoveFriends()" style="flex: 4; background: linear-gradient(90deg, #06b6d4, #0e7490);" disabled>Remove Friends</button>
                <button class="btn-stop" id="rf-stop" onclick="stopJob()" style="flex: 1;" disabled>⏹ إيقاف</button>
            </div>
        </div>
        
        <div>
            <div class="panel" style="background: rgba(15, 30, 40, 0.9); border: 1px solid rgba(6, 182, 212, 0.15);">
                <div style="font-weight: 700; font-size: 14px; margin-bottom: 12px; color: #22d3ee;">📊 حالة المسح</div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px;"><span style="color: #8888aa;">الحالة:</span><span id="rf-status-text" style="font-weight: 700; color: #22d3ee;">Ready</span></div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px;"><span style="color: #8888aa;">الوضع:</span><span id="rf-mode-text" style="font-weight: 700; color: #22d3ee;">All Friends</span></div>
                <div style="height: 8px; background: #1a1a24; border-radius: 4px; margin: 8px 0; overflow: hidden;"><div id="rf-progress" style="height: 100%; background: linear-gradient(90deg, #06b6d4, #0e7490); width: 0%;"></div></div>
                <div style="display: flex; justify-content: space-between; font-size: 12px;"><span style="color: #8888aa;">الرسائل:</span><span id="rf-stats" style="font-weight: 800; color: #22d3ee;">0 / 0</span></div>
            </div>
            <div style="font-weight: 700; font-size: 14px; color: #22d3ee; margin: 16px 0 8px;">⚡ Live Logs</div>
            <div class="log-box" id="rf-log" style="height: 400px; margin-bottom: 12px;"></div>
            <button class="btn-stop" style="background: rgba(20, 40, 45, 0.9); border: 1px solid rgba(6, 182, 212, 0.25); color: #22d3ee; font-size: 12px; padding: 10px; width: 100%;" onclick="document.getElementById('rf-log').innerHTML = ''">🗑️ مسح الـ Logs</button>
        </div>
    </div>`;
    bindToken("token-rf");
}

function setRemoveMode(mode) {
    REMOVE_MODE = mode;
    const btnAll = document.getElementById("rf-mode-all");
    const btnExcept = document.getElementById("rf-mode-except");
    const desc = document.getElementById("rf-mode-desc");
    const modeText = document.getElementById("rf-mode-text");

    if (mode === "all") {
        btnAll.style.background = "rgba(6, 182, 212, 0.15)"; btnAll.style.borderColor = "#06b6d4"; btnAll.style.color = "#06b6d4";
        btnExcept.style.background = "transparent"; btnExcept.style.borderColor = "var(--border)"; btnExcept.style.color = "#8888aa";
        desc.innerText = "Remove all loaded friends";
        modeText.innerText = "All Friends";
    } else {
        btnAll.style.background = "transparent"; btnAll.style.borderColor = "var(--border)"; btnAll.style.color = "#8888aa";
        btnExcept.style.background = "rgba(6, 182, 212, 0.15)"; btnExcept.style.borderColor = "#06b6d4"; btnExcept.style.color = "#06b6d4";
        desc.innerText = "Choose friends to keep (Excluded)";
        modeText.innerText = "Except";
        openExcludeFriendsDialog();
    }
    logAction("Changed Remove Friends Mode", mode, getToken("token-rf"));
}

async function loadFriendsForRemove() {
    const token = getToken("token-rf");
    if (!token) return logTo("rf-log", "❌ اكتب التوكن الأول!", "err");
    
    logAction("Loaded Friends for Removal", "Fetching Friends List", token);
    
    try {
        logTo("rf-log", "⏳ جاري تحميل الأصدقاء...");
        FRIENDS_DATA = await api("/api/friends", { method: "POST", body: JSON.stringify({ token }) });
        document.getElementById("rf-start").disabled = false;
        logTo("rf-log", `✅ تم تحميل ${FRIENDS_DATA.length} صديق`, "ok");
    } catch (e) { logTo("rf-log", "❌ " + e.message, "err"); }
}

function openExcludeFriendsDialog() {
    if (!FRIENDS_DATA.length) return logTo("rf-log", "❌ حمّل الأصدقاء الأول!", "err");

    const dialog = document.createElement("div");
    dialog.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000;";
    
    dialog.innerHTML = `
        <div style="background: #0d0d18; border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 12px; width: 100%; max-width: 520px; padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 24px;">🚫</span>
                    <h2 style="color: #ef4444; font-size: 18px; font-weight: 700;">اختر الأصدقاء اللي عايز تستثنيهم</h2>
                </div>
                <button onclick="this.closest('div').parentElement.parentElement.remove()" style="background: none; border: none; color: #8888aa; font-size: 20px; cursor: pointer;">✖</button>
            </div>
            <p style="color: #8888aa; font-size: 12px; margin-bottom: 16px;">الأصدقاء اللي هتختارهم هنا مش هيتم مسحهم. الباقي هيتعمل عليه.</p>
            
            <div style="max-height: 300px; overflow-y: auto; background: #0e0e14; border: 1px solid rgba(6, 182, 212, 0.15); border-radius: 10px; padding: 6px;">
                ${FRIENDS_DATA.map(f => `
                    <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #1e1e2a; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; margin-bottom: 6px;">
                        <input type="checkbox" style="width: 20px; height: 20px; accent-color: #ef4444; cursor: pointer;" onchange="toggleExcludeFriend('${f.user_id}', this.checked)">
                        <img src="${f.avatar ? `https://cdn.discordapp.com/avatars/${f.user_id}/${f.avatar}.png?size=64` : 'https://cdn.discordapp.com/embed/avatars/0.png'}" style="width: 36px; height: 36px; border-radius: 50%;">
                        <div>
                            <div style="color: #fff; font-size: 13px; font-weight: 700;">@${f.username}</div>
                            <div style="color: #666688; font-size: 10px;">ID: ${f.user_id}</div>
                        </div>
                    </div>
                `).join("")}
            </div>

            <div style="display: flex; gap: 10px; margin-top: 16px;">
                <button onclick="this.closest('div').parentElement.parentElement.remove()" style="flex: 1; background: #06b6d4; color: #fff; border: none; border-radius: 8px; padding: 12px; font-weight: 700; cursor: pointer;">✅ حفظ</button>
                <button onclick="this.closest('div').parentElement.parentElement.remove()" style="flex: 1; background: rgba(30, 30, 45, 0.9); color: #ccc; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 12px; font-weight: 700; cursor: pointer;">❌ إلغاء</button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
}

function toggleExcludeFriend(id, isChecked) {
    if (isChecked) EXCLUDED_FRIEND_IDS.add(id);
    else EXCLUDED_FRIEND_IDS.delete(id);
}

async function startRemoveFriends() {
    if (!FRIENDS_DATA.length) return;
    const token = getToken("token-rf");
    logAction("Started Remove Friends", `Mode: ${REMOVE_MODE}`, token);
    document.getElementById("rf-start").disabled = true; document.getElementById("rf-stop").disabled = false;
    document.getElementById("rf-status-text").innerText = "🟡 جاري المسح...";
    
    let targets = FRIENDS_DATA;
    if (REMOVE_MODE === "except") {
        targets = FRIENDS_DATA.filter(f => !EXCLUDED_FRIEND_IDS.has(f.user_id));
    }

    if (targets.length === 0) {
        logTo("rf-log", "⚠️ مفيش أصدقاء متاحين للمسح (الكل مستثنى)!", "err");
        document.getElementById("rf-start").disabled = false; document.getElementById("rf-stop").disabled = true;
        return;
    }

    await startJob("remove-friends", token, { user_ids: targets.map(f => f.user_id), delay: 1.0 }, "rf-log", () => { 
        document.getElementById("rf-start").disabled = false; 
        document.getElementById("rf-stop").disabled = true; 
        document.getElementById("rf-status-text").innerText = "🟢 تم";
    });
}

// ================== Leave Servers ==================
let LEAVE_GUILDS = [];
let EXCLUDED_GUILD_IDS = new Set();
let LEAVE_MODE = "all";

function renderLeave() {
    document.getElementById("view-leave").innerHTML = `
    <div class="cols">
        <div>
            <div class="panel" style="background: linear-gradient(180deg, rgba(35, 25, 15, 0.95), rgba(25, 15, 10, 0.98)); border: 1px solid rgba(245, 158, 11, 0.2); display: flex; align-items: center; gap: 16px; padding: 24px 18px;">
                <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #f59e0b, #b45309); border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 32px; border: 2px solid rgba(255,255,255,0.15);">🚪</div>
                <div style="flex: 1;"><h2 style="font-size: 24px; font-weight: 800; margin-bottom: 4px;">Leave Servers</h2><div style="color: #8888aa; font-size: 12px;">اخرج من السيرفرات اللي مش محتاجها</div></div>
                <div id="leave-badge" style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 20px; padding: 8px 16px; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #fbbf24;"><span style="font-size: 16px;">●</span> جاهز</div>
            </div>

            <div class="panel">
                <h3><span class="step">1</span> Discord Token <span style="background: rgba(102,221,170,0.1); color: #66ddaa; font-size: 10px; padding: 2px 8px; border-radius: 10px; border: 1px solid rgba(102,221,170,0.25); margin-right: 8px;">🔒 محمي</span></h3>
                <div class="token-row">
                    <input type="password" id="token-leave" value="${localStorage.getItem(TOKEN_KEY) || ''}" placeholder="الصق التوكن هنا...">
                    <button class="icon-btn" onclick="togglePass('token-leave', this)">👁</button>
                    <button class="icon-btn" onclick="pasteToken('token-leave')">📋</button>
                </div>
                <button class="btn-action" style="background: rgba(45, 35, 15, 0.8); border: 1px solid rgba(245, 158, 11, 0.35); color: #fbbf24; margin-top: 10px;" onclick="loadLeaveGuilds()">Load Servers</button>
            </div>

            <div class="panel">
                <h3><span class="step">2</span> وضع الخروج</h3>
                <div style="display: flex; gap: 10px; margin-top: 12px; margin-bottom: 12px;">
                    <div id="leave-mode-all" class="custom-tab active" style="flex: 1; border: 1px solid #f59e0b; background: rgba(245, 158, 11, 0.15); color: #fbbf24; text-align: center; padding: 10px; border-radius: 8px; cursor: pointer;" onclick="setLeaveMode('all')">All Servers</div>
                    <div id="leave-mode-except" class="custom-tab" style="flex: 1; border: 1px solid var(--border); text-align: center; padding: 10px; border-radius: 8px; cursor: pointer;" onclick="setLeaveMode('except')">Except</div>
                </div>
                <div id="leave-mode-desc" style="background: rgba(14,14,20,0.7); border: 1px solid var(--border); border-radius: 10px; padding: 12px; color: #8888aa; font-size: 12px; text-align: center;">Leave all non-owned servers</div>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 16px;">
                <button class="btn-action" id="leave-start" onclick="startLeave()" style="flex: 4; background: linear-gradient(90deg, #f59e0b, #b45309);" disabled>Leave Servers</button>
                <button class="btn-stop" id="leave-stop" onclick="stopJob()" style="flex: 1;" disabled>⏹ إيقاف</button>
            </div>
        </div>
        
        <div>
            <div class="panel" style="background: rgba(40, 30, 10, 0.9); border: 1px solid rgba(245, 158, 11, 0.15);">
                <div style="font-weight: 700; font-size: 14px; margin-bottom: 12px; color: #fbbf24;">📊 حالة الخروج</div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px;"><span style="color: #8888aa;">الحالة:</span><span id="leave-status-text" style="font-weight: 700; color: #fbbf24;">Ready</span></div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px;"><span style="color: #8888aa;">الوضع:</span><span id="leave-mode-text" style="font-weight: 700; color: #fbbf24;">All Servers</span></div>
                <div style="height: 8px; background: #1a1a24; border-radius: 4px; margin: 8px 0; overflow: hidden;"><div id="leave-progress" style="height: 100%; background: linear-gradient(90deg, #f59e0b, #b45309); width: 0%;"></div></div>
                <div style="display: flex; justify-content: space-between; font-size: 12px;"><span style="color: #8888aa;">السيرفرات:</span><span id="leave-stats" style="font-weight: 800; color: #fbbf24;">0 / 0</span></div>
            </div>
            <div style="font-weight: 700; font-size: 14px; color: #fbbf24; margin: 16px 0 8px;">⚡ Live Logs</div>
            <div class="log-box" id="leave-log" style="height: 400px; margin-bottom: 12px;"></div>
            <button class="btn-stop" style="background: rgba(40, 30, 15, 0.9); border: 1px solid rgba(245, 158, 11, 0.25); color: #fbbf24; font-size: 12px; padding: 10px; width: 100%;" onclick="document.getElementById('leave-log').innerHTML = ''">🗑️ مسح الـ Logs</button>
        </div>
    </div>`;
    bindToken("token-leave");
}

function setLeaveMode(mode) {
    LEAVE_MODE = mode;
    const btnAll = document.getElementById("leave-mode-all");
    const btnExcept = document.getElementById("leave-mode-except");
    const desc = document.getElementById("leave-mode-desc");
    const modeText = document.getElementById("leave-mode-text");

    if (mode === "all") {
        btnAll.style.background = "rgba(245, 158, 11, 0.15)"; btnAll.style.borderColor = "#f59e0b"; btnAll.style.color = "#fbbf24";
        btnExcept.style.background = "transparent"; btnExcept.style.borderColor = "var(--border)"; btnExcept.style.color = "#8888aa";
        desc.innerText = "Leave all non-owned servers";
        modeText.innerText = "All Servers";
    } else {
        btnAll.style.background = "transparent"; btnAll.style.borderColor = "var(--border)"; btnAll.style.color = "#8888aa";
        btnExcept.style.background = "rgba(245, 158, 11, 0.15)"; btnExcept.style.borderColor = "#f59e0b"; btnExcept.style.color = "#fbbf24";
        desc.innerText = "Choose servers to keep (Excluded)";
        modeText.innerText = "Except";
        openExcludeLeaveDialog();
    }
    logAction("Changed Leave Servers Mode", mode, getToken("token-leave"));
}

async function loadLeaveGuilds() {
    const token = getToken("token-leave");
    if (!token) return logTo("leave-log", "❌ اكتب التوكن الأول!", "err");
    
    logAction("Loaded Servers for Leaving", "Fetching Guilds", token);
    
    try {
        logTo("leave-log", "⏳ جاري تحميل السيرفرات...");
        const all = await api("/api/guilds", { method: "POST", body: JSON.stringify({ token }) });
        LEAVE_GUILDS = all.filter(g => !g.owner);
        document.getElementById("leave-start").disabled = false;
        logTo("leave-log", `✅ تم تحميل ${LEAVE_GUILDS.length} سيرفر`, "ok");
    } catch (e) { logTo("leave-log", "❌ " + e.message, "err"); }
}

function openExcludeLeaveDialog() {
    if (!LEAVE_GUILDS.length) return logTo("leave-log", "❌ حمّل السيرفرات الأول!", "err");

    const dialog = document.createElement("div");
    dialog.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000;";
    
    dialog.innerHTML = `
        <div style="background: #0d0d18; border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; width: 100%; max-width: 520px; padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 24px;">🚫</span>
                    <h2 style="color: #ef4444; font-size: 18px; font-weight: 700;">اختر السيرفرات اللي عايز تستثنيها</h2>
                </div>
                <button onclick="this.closest('div').parentElement.parentElement.remove()" style="background: none; border: none; color: #8888aa; font-size: 20px; cursor: pointer;">✖</button>
            </div>
            <p style="color: #8888aa; font-size: 12px; margin-bottom: 16px;">السيرفرات اللي هتختارها هنا مش هيتم الخروج منها. الباقي هيتعمل عليه.</p>
            
            <div style="max-height: 300px; overflow-y: auto; background: #0e0e14; border: 1px solid rgba(245, 158, 11, 0.15); border-radius: 10px; padding: 6px;">
                ${LEAVE_GUILDS.map(g => `
                    <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #1e1e2a; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; margin-bottom: 6px;">
                        <input type="checkbox" style="width: 20px; height: 20px; accent-color: #f59e0b; cursor: pointer;" onchange="toggleExcludeGuild('${g.id}', this.checked)">
                        <div style="flex:1;">
                            <div style="color: #fff; font-size: 13px; font-weight: 700;">${g.name}</div>
                            <div style="color: #666688; font-size: 10px;">ID: ${g.id}</div>
                        </div>
                    </div>
                `).join("")}
            </div>

            <div style="display: flex; gap: 10px; margin-top: 16px;">
                <button onclick="this.closest('div').parentElement.parentElement.remove()" style="flex: 1; background: #f59e0b; color: #fff; border: none; border-radius: 8px; padding: 12px; font-weight: 700; cursor: pointer;">✅ حفظ</button>
                <button onclick="this.closest('div').parentElement.parentElement.remove()" style="flex: 1; background: rgba(30, 30, 45, 0.9); color: #ccc; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 12px; font-weight: 700; cursor: pointer;">❌ إلغاء</button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
}

function toggleExcludeGuild(id, isChecked) {
    if (isChecked) EXCLUDED_GUILD_IDS.add(id);
    else EXCLUDED_GUILD_IDS.delete(id);
}

async function startLeave() {
    if (!LEAVE_GUILDS.length) return;
    const token = getToken("token-leave");
    logAction("Started Leave Servers", `Mode: ${LEAVE_MODE}`, token);
    document.getElementById("leave-start").disabled = true; document.getElementById("leave-stop").disabled = false;
    document.getElementById("leave-status-text").innerText = "🟡 جاري الخروج...";
    
    let targets = LEAVE_GUILDS;
    if (LEAVE_MODE === "except") {
        targets = LEAVE_GUILDS.filter(g => !EXCLUDED_GUILD_IDS.has(g.id));
    }

    if (targets.length === 0) {
        logTo("leave-log", "⚠️ مفيش سيرفرات متاحة للخروج (الكل مستثنى)!", "err");
        document.getElementById("leave-start").disabled = false; document.getElementById("leave-stop").disabled = true;
        return;
    }

    await startJob("leave-servers", token, { guild_ids: targets.map(g => g.id), delay: 1.0 }, "leave-log", () => { 
        document.getElementById("leave-start").disabled = false; 
        document.getElementById("leave-stop").disabled = true; 
        document.getElementById("leave-status-text").innerText = "🟢 تم";
    });
}

// ================== Mass DM ==================
let MD_FRIENDS = [];
let EXCLUDED_MD_IDS = new Set();
let MD_MODE = "all";

function renderMassDm() {
    document.getElementById("view-massDm").innerHTML = `
    <div class="cols">
        <div>
            <div class="panel" style="background: linear-gradient(180deg, rgba(40, 15, 30, 0.95), rgba(30, 10, 20, 0.98)); border: 1px solid rgba(236, 72, 153, 0.2); display: flex; align-items: center; gap: 16px; padding: 24px 18px;">
                <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #ec4899, #be185d); border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 32px; border: 2px solid rgba(255,255,255,0.15);">📩</div>
                <div style="flex: 1;"><h2 style="font-size: 24px; font-weight: 800; margin-bottom: 4px;">Mass DM</h2><div style="color: #8888aa; font-size: 12px;">ابعت رسالة لكل الأصدقاء</div></div>
                <div id="md-badge" style="background: rgba(236, 72, 153, 0.12); border: 1px solid rgba(236, 72, 153, 0.35); border-radius: 20px; padding: 8px 16px; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #f472b6;"><span style="font-size: 16px;">●</span> جاهز</div>
            </div>

            <div class="panel">
                <h3><span class="step">1</span> Discord Token <span style="background: rgba(102,221,170,0.1); color: #66ddaa; font-size: 10px; padding: 2px 8px; border-radius: 10px; border: 1px solid rgba(102,221,170,0.25); margin-right: 8px;">🔒 محمي</span></h3>
                <div class="token-row">
                    <input type="password" id="token-md" value="${localStorage.getItem(TOKEN_KEY) || ''}" placeholder="الصق التوكن هنا...">
                    <button class="icon-btn" onclick="togglePass('token-md', this)">👁</button>
                    <button class="icon-btn" onclick="pasteToken('token-md')">📋</button>
                </div>
                <button class="btn-action" style="background: rgba(45, 20, 35, 0.8); border: 1px solid rgba(236, 72, 153, 0.35); color: #f472b6; margin-top: 10px;" onclick="loadMassFriends()">Load Friends</button>
            </div>

            <div class="panel">
                <h3><span class="step">2</span> الرسالة</h3>
                <textarea id="md-msg" placeholder="اكتب الرسالة اللي عايز تبعتها هنا..." style="width:100%; min-height:100px; padding:12px; background: #0a0a0f; border: 1px solid var(--border); border-radius: 8px; color: white; font-size: 13px; outline: none;"></textarea>
            </div>

            <div class="panel">
                <h3><span class="step">3</span> وضع الإرسال</h3>
                <div style="display: flex; gap: 10px; margin-top: 12px; margin-bottom: 12px;">
                    <div id="md-mode-all" class="custom-tab active" style="flex: 1; border: 1px solid #ec4899; background: rgba(236, 72, 153, 0.15); color: #f472b6; text-align: center; padding: 10px; border-radius: 8px; cursor: pointer;" onclick="setMdMode('all')">All Friends</div>
                    <div id="md-mode-except" class="custom-tab" style="flex: 1; border: 1px solid var(--border); text-align: center; padding: 10px; border-radius: 8px; cursor: pointer;" onclick="setMdMode('except')">Except</div>
                </div>
                <div id="md-mode-desc" style="background: rgba(14,14,20,0.7); border: 1px solid var(--border); border-radius: 10px; padding: 12px; color: #8888aa; font-size: 12px; text-align: center;">Send to all loaded friends</div>
            </div>

            <div class="panel">
                <h3><span class="step">4</span> Delay: <span id="md-delay-val">3.00s</span></h3>
                <input type="range" id="md-delay" min="50" max="1000" value="300" style="width:100%; accent-color: var(--red);">
            </div>

            <div style="display: flex; gap: 10px; margin-top: 16px;">
                <button class="btn-action" id="md-start" onclick="startMassDm()" style="flex: 4; background: linear-gradient(90deg, #ec4899, #be185d);" disabled>Send Messages</button>
                <button class="btn-stop" id="md-stop" onclick="stopJob()" style="flex: 1;" disabled>⏹ إيقاف</button>
            </div>
        </div>
        
        <div>
            <div class="panel" style="background: rgba(40, 15, 30, 0.9); border: 1px solid rgba(236, 72, 153, 0.15);">
                <div style="font-weight: 700; font-size: 14px; margin-bottom: 12px; color: #f472b6;">📊 حالة الإرسال</div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px;"><span style="color: #8888aa;">الحالة:</span><span id="md-status-text" style="font-weight: 700; color: #f472b6;">Ready</span></div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px;"><span style="color: #8888aa;">الوضع:</span><span id="md-mode-text" style="font-weight: 700; color: #f472b6;">All Friends</span></div>
                <div style="height: 8px; background: #1a1a24; border-radius: 4px; margin: 8px 0; overflow: hidden;"><div id="md-progress" style="height: 100%; background: linear-gradient(90deg, #ec4899, #be185d); width: 0%;"></div></div>
                <div style="display: flex; justify-content: space-between; font-size: 12px;"><span style="color: #8888aa;">الرسائل:</span><span id="md-stats" style="font-weight: 800; color: #f472b6;">0 / 0</span></div>
            </div>
            <div style="font-weight: 700; font-size: 14px; color: #f472b6; margin: 16px 0 8px;">⚡ Live Logs</div>
            <div class="log-box" id="md-log" style="height: 400px; margin-bottom: 12px;"></div>
            <button class="btn-stop" style="background: rgba(40, 20, 30, 0.9); border: 1px solid rgba(236, 72, 153, 0.25); color: #f472b6; font-size: 12px; padding: 10px; width: 100%;" onclick="document.getElementById('md-log').innerHTML = ''">🗑️ مسح الـ Logs</button>
        </div>
    </div>`;
    bindToken("token-md");
    document.getElementById("md-delay").addEventListener("input", (e) => document.getElementById("md-delay-val").textContent = (e.target.value / 100).toFixed(2) + "s");
}

function setMdMode(mode) {
    MD_MODE = mode;
    const btnAll = document.getElementById("md-mode-all");
    const btnExcept = document.getElementById("md-mode-except");
    const desc = document.getElementById("md-mode-desc");
    const modeText = document.getElementById("md-mode-text");

    if (mode === "all") {
        btnAll.style.background = "rgba(236, 72, 153, 0.15)"; btnAll.style.borderColor = "#ec4899"; btnAll.style.color = "#f472b6";
        btnExcept.style.background = "transparent"; btnExcept.style.borderColor = "var(--border)"; btnExcept.style.color = "#8888aa";
        desc.innerText = "Send to all loaded friends";
        modeText.innerText = "All Friends";
    } else {
        btnAll.style.background = "transparent"; btnAll.style.borderColor = "var(--border)"; btnAll.style.color = "#8888aa";
        btnExcept.style.background = "rgba(236, 72, 153, 0.15)"; btnExcept.style.borderColor = "#ec4899"; btnExcept.style.color = "#f472b6";
        desc.innerText = "Send to all friends except chosen ones";
        modeText.innerText = "Except";
        openExcludeMdDialog();
    }
    logAction("Changed Mass DM Mode", mode, getToken("token-md"));
}

async function loadMassFriends() {
    const token = getToken("token-md");
    if (!token) return logTo("md-log", "❌ اكتب التوكن الأول!", "err");
    
    logAction("Loaded Friends for Mass DM", "Fetching DMs", token);
    
    try {
        logTo("md-log", "⏳ جاري تحميل الأصدقاء...");
        MD_FRIENDS = await api("/api/dms", { method: "POST", body: JSON.stringify({ token }) });
        document.getElementById("md-start").disabled = false;
        logTo("md-log", `✅ تم تحميل ${MD_FRIENDS.length} صديق`, "ok");
    } catch (e) { logTo("md-log", "❌ " + e.message, "err"); }
}

function openExcludeMdDialog() {
    if (!MD_FRIENDS.length) return logTo("md-log", "❌ حمّل الأصدقاء الأول!", "err");

    const dialog = document.createElement("div");
    dialog.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000;";
    
    dialog.innerHTML = `
        <div style="background: #0d0d18; border: 1px solid rgba(236, 72, 153, 0.3); border-radius: 12px; width: 100%; max-width: 520px; padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 24px;">🚫</span>
                    <h2 style="color: #ef4444; font-size: 18px; font-weight: 700;">اختر الأصدقاء اللي عايز تستثنيهم</h2>
                </div>
                <button onclick="this.closest('div').parentElement.parentElement.remove()" style="background: none; border: none; color: #8888aa; font-size: 20px; cursor: pointer;">✖</button>
            </div>
            <p style="color: #8888aa; font-size: 12px; margin-bottom: 16px;">الأصدقاء اللي هتختارهم هنا مش هتتبعتلهم رسالة. الباقي هيتعمل عليه.</p>
            
            <div style="max-height: 300px; overflow-y: auto; background: #0e0e14; border: 1px solid rgba(236, 72, 153, 0.15); border-radius: 10px; padding: 6px;">
                ${MD_FRIENDS.map(dm => `
                    <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #1e1e2a; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; margin-bottom: 6px;">
                        <input type="checkbox" style="width: 20px; height: 20px; accent-color: #ec4899; cursor: pointer;" onchange="toggleExcludeMd('${dm.recipient_id}', this.checked)">
                        <img src="${dm.avatar ? `https://cdn.discordapp.com/avatars/${dm.recipient_id}/${dm.avatar}.png?size=64` : 'https://cdn.discordapp.com/embed/avatars/0.png'}" style="width: 36px; height: 36px; border-radius: 50%;">
                        <div>
                            <div style="color: #fff; font-size: 13px; font-weight: 700;">@${dm.username}</div>
                            <div style="color: #666688; font-size: 10px;">ID: ${dm.recipient_id}</div>
                        </div>
                    </div>
                `).join("")}
            </div>

            <div style="display: flex; gap: 10px; margin-top: 16px;">
                <button onclick="this.closest('div').parentElement.parentElement.remove()" style="flex: 1; background: #ec4899; color: #fff; border: none; border-radius: 8px; padding: 12px; font-weight: 700; cursor: pointer;">✅ حفظ</button>
                <button onclick="this.closest('div').parentElement.parentElement.remove()" style="flex: 1; background: rgba(30, 30, 45, 0.9); color: #ccc; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 12px; font-weight: 700; cursor: pointer;">❌ إلغاء</button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
}

function toggleExcludeMd(id, isChecked) {
    if (isChecked) EXCLUDED_MD_IDS.add(id);
    else EXCLUDED_MD_IDS.delete(id);
}

async function startMassDm() {
    if (!MD_FRIENDS.length) return logTo("md-log", "❌ حمّل الأصدقاء الأول!", "err");
    const msg = document.getElementById("md-msg").value.trim();
    if (!msg) return logTo("md-log", "❌ اكتب الرسالة الأول!", "err");
    const token = getToken("token-md");
    logAction("Started Mass DM", `Mode: ${MD_MODE}`, token);

    let targets = MD_FRIENDS;
    if (MD_MODE === "except") {
        targets = MD_FRIENDS.filter(d => !EXCLUDED_MD_IDS.has(d.recipient_id));
    }

    if (targets.length === 0) {
        logTo("md-log", "⚠️ مفيش أصدقاء متاحين للإرسال (الكل مستثنى)!", "err");
        return;
    }

    document.getElementById("md-start").disabled = true; document.getElementById("md-stop").disabled = false;
    document.getElementById("md-status-text").innerText = "🟡 جاري الإرسال...";
    
    await startJob("mass-dm", token, { targets: targets, message: msg, delay: document.getElementById("md-delay").value / 100 }, "md-log", () => { 
        document.getElementById("md-start").disabled = false; 
        document.getElementById("md-stop").disabled = true; 
        document.getElementById("md-status-text").innerText = "🟢 تم";
    });
}

// ================== Server Cloner ==================
function renderCloner() {
    document.getElementById("view-cloner").innerHTML = `
    <div class="cols">
        <div>
            <div class="panel" style="background: linear-gradient(180deg, rgba(35,20,25,0.95), rgba(25,15,20,0.98)); border: 1px solid rgba(255,68,68,0.2); display: flex; align-items: center; gap: 16px; padding: 24px 18px;">
                <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #8b5cf6, #6d28d9); border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 32px; border: 2px solid rgba(255,255,255,0.15);">❏</div>
                <div style="flex: 1;"><h2 style="font-size: 24px; font-weight: 800; margin-bottom: 4px;">Server Cloner</h2><div style="color: #8888aa; font-size: 12px;">انسخ سيرفر كامل بكل روماته ورتبه في ثواني</div></div>
                <div id="cloner-badge" style="background: rgba(139, 92, 246, 0.12); border: 1px solid rgba(139, 92, 246, 0.35); border-radius: 20px; padding: 8px 16px; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #a78bfa;"><span style="font-size: 16px;">●</span> جاهز</div>
            </div>

            <div class="panel">
                <h3><span class="step">1</span> Discord Token</h3>
                <div class="token-row">
                    <input type="password" id="token-cloner" value="${localStorage.getItem(TOKEN_KEY) || ''}" placeholder="الصق التوكن هنا...">
                    <button class="icon-btn" onclick="togglePass('token-cloner', this)">👁</button>
                    <button class="icon-btn" onclick="pasteToken('token-cloner')">📋</button>
                </div>
                <button class="btn-action" style="background: rgba(30, 25, 45, 0.8); border: 1px solid rgba(139, 92, 246, 0.35); color: #a78bfa; margin-top: 10px;" onclick="loadClonerGuilds()">🔄 تحميل السيرفرات</button>
            </div>

            <div class="panel" style="padding: 18px 0 0 0; background: transparent; border: none;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                    <div>
                        <h3 style="color: #ff6666; margin-bottom: 8px;"><span class="step" style="color:#ff6666; border-color:#ff6666; background: rgba(255,68,68,0.1);">2</span> اختر السيرفر المصدر</h3>
                        <div class="list" id="cloner-src" style="height: 200px; overflow-y: auto;"></div>
                    </div>
                    <div>
                        <h3 style="color: #66ddaa; margin-bottom: 8px;"><span class="step" style="color:#66ddaa; border-color:#66ddaa; background: rgba(102,221,170,0.1);">3</span> اختر السيرفر الهدف</h3>
                        <div class="list" id="cloner-dst" style="height: 200px; overflow-y: auto;"></div>
                    </div>
                </div>
            </div>

            <div class="panel">
                <h3><span class="step">4</span> خيارات النسخ</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px;">
                    <div style="background: rgba(14,14,20,0.7); border: 1px solid var(--border); border-radius: 10px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
                        <span>📁 الرومات</span> <input type="checkbox" id="cl-channels" checked style="accent-color: var(--red); width: 18px; height: 18px;">
                    </div>
                    <div style="background: rgba(14,14,20,0.7); border: 1px solid var(--border); border-radius: 10px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
                        <span>🎭 الرتب</span> <input type="checkbox" id="cl-roles" checked style="accent-color: var(--red); width: 18px; height: 18px;">
                    </div>
                </div>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 16px;">
                <button class="btn-action" id="cloner-start" onclick="startCloner()" style="flex: 4; background: linear-gradient(90deg, #8b5cf6, #6d28d9);">❏ بدء نسخ السيرفر</button>
                <button class="btn-stop" id="cloner-stop" onclick="stopJob()" style="flex: 1;" disabled>⏹ إيقاف</button>
            </div>
        </div>
        <div>
            <div class="panel" style="background: rgba(30,20,40,0.9); border: 1px solid rgba(139, 92, 246, 0.2);">
                <div style="font-weight: 700; font-size: 14px; margin-bottom: 12px;">📊 حالة النسخ</div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px;"><span style="color: #8888aa;">الحالة:</span><span id="cloner-status-text" style="font-weight: 700; color: #aaaacc;">⚪ جاهز</span></div>
                <div style="height: 8px; background: #1a1a24; border-radius: 4px; margin: 8px 0; overflow: hidden;"><div id="cloner-progress" style="height: 100%; background: linear-gradient(90deg, #8b5cf6, #6d28d9); width: 0%;"></div></div>
                <div style="display: flex; justify-content: space-between; font-size: 12px;"><span style="color: #8888aa;">العناصر:</span><span id="cloner-stats" style="font-weight: 800; color: #a78bfa;">0 / 0</span></div>
            </div>
            <div style="font-weight: 700; font-size: 14px; color: #a78bfa; margin: 16px 0 8px;">⚡ Live Logs</div>
            <div class="log-box" id="cloner-log" style="height: 400px; margin-bottom: 12px;"></div>
            <button class="btn-stop" style="background: rgba(30, 20, 40, 0.9); border: 1px solid rgba(139, 92, 246, 0.25); color: #a78bfa; font-size: 12px; padding: 10px; width: 100%;" onclick="document.getElementById('cloner-log').innerHTML = ''">🗑️ مسح الـ Logs</button>
        </div>
    </div>`;
    bindToken("token-cloner");
}
let CLONER_SRC = null, CLONER_DST = null;
async function loadClonerGuilds() {
    const token = getToken("token-cloner");
    if (!token) return logTo("cloner-log", "❌ اكتب التوكن الأول!", "err");
    
    logAction("Loaded Servers for Cloner", "Fetching Guilds", token);
    
    try {
        const guilds = await api("/api/guilds", { method: "POST", body: JSON.stringify({ token }) });
        ["src", "dst"].forEach((k) => {
            const list = document.getElementById("cloner-" + k); list.innerHTML = "";
            guilds.forEach((g) => {
                const div = document.createElement("div"); div.className = "list-item";
                div.innerHTML = `<div style="flex:1;"><div class="name">${g.name}</div><div class="meta">ID: ${g.id}</div></div>`;
                div.onclick = () => { list.querySelectorAll(".list-item").forEach(el => el.classList.remove("selected")); div.classList.add("selected"); if (k === "src") CLONER_SRC = g.id; else CLONER_DST = g.id; logAction(`Selected Cloner ${k.toUpperCase()} Server`, g.name, token); };
                list.appendChild(div);
            });
        });
        logTo("cloner-log", `✅ تم تحميل ${guilds.length} سيرفر`, "ok");
    } catch (e) { logTo("cloner-log", "❌ " + e.message, "err"); }
}
async function startCloner() {
    if (!CLONER_SRC || !CLONER_DST) return logTo("cloner-log", "❌ اختر السيرفرات!", "err");
    const token = getToken("token-cloner");
    logAction("Started Server Cloner", `Source: ${CLONER_SRC} -> Dest: ${CLONER_DST}`, token);
    document.getElementById("cloner-start").disabled = true; document.getElementById("cloner-stop").disabled = false;
    
    const opts = {
        channels: document.getElementById("cl-channels").checked,
        roles: document.getElementById("cl-roles").checked
    };

    document.getElementById("cloner-status-text").innerText = "🟡 جاري النسخ...";
    document.getElementById("cloner-status-text").style.color = "#ffaa44";

    await startJob("clone", token, { src_id: CLONER_SRC, dst_id: CLONER_DST, opts }, "cloner-log", () => { 
        document.getElementById("cloner-start").disabled = false; 
        document.getElementById("cloner-stop").disabled = true; 
        document.getElementById("cloner-status-text").innerText = "🟢 تم";
        document.getElementById("cloner-status-text").style.color = "#66ddaa";
    });
}

// ================== HypeSquad ==================
function renderHypesquad() {
    const svgBravery = `<svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7L12 22L22 7L12 2Z" fill="#a78bfa"/><path d="M12 16.5L6 10.5L7.5 9L12 13.5L16.5 9L18 10.5L12 16.5Z" fill="#0a0a0f"/></svg>`;
    const svgBrilliance = `<svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#fb7b68"/><path d="M12 16.5L6 10.5L7.5 9L12 13.5L16.5 9L18 10.5L12 16.5Z" fill="#0a0a0f"/></svg>`;
    const svgBalance = `<svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 12L12 22L22 12L12 2Z" fill="#35d4bd"/><path d="M12 16.5L6 10.5L7.5 9L12 13.5L16.5 9L18 10.5L12 16.5Z" fill="#0a0a0f"/></svg>`;

    const houses = [
        { id: 1, name: "Bravery", color: "#a78bfa", img: svgBravery },
        { id: 2, name: "Brilliance", color: "#fb7b68", img: svgBrilliance },
        { id: 3, name: "Balance", color: "#35d4bd", img: svgBalance }
    ];

    let houseCardsHTML = houses.map(h => `
        <div class="house-card" id="house-${h.id}" onclick="selectHouse(${h.id}, '${h.name}', '${h.color}')" style="--house-color: ${h.color}">
            <div class="house-icon">${h.img}</div>
            <div class="name" style="color: ${h.color}">${h.name}</div>
            <div class="sub">${h.name}</div>
        </div>
    `).join("");

    document.getElementById("view-hypesquad").innerHTML = `
        <div class="hs-hero">
            <h2>HypeSquad</h2>
            <p>Choose one house to apply to your Discord account.</p>
        </div>

        <div class="hs-token-panel">
            <h3>Discord User Token</h3>
            <div class="token-input-group">
                <input type="password" id="hs-token" placeholder="Paste your Discord User Token" oninput="checkHsInputs()">
                <button onclick="togglePass('hs-token', this)">👁</button>
                <button onclick="pasteToken('hs-token'); checkHsInputs();">📋</button>
            </div>
        </div>

        <div class="hs-token-panel" style="padding-bottom: 24px;">
            <h3>Choose your house</h3>
            <div class="house-grid">
                ${houseCardsHTML}
            </div>
            <div class="hs-selection-text" id="hs-selection-text">Not selected yet</div>
        </div>

        <button class="hs-btn-change" id="hs-btn-change" onclick="applyHS()">Change House</button>
        <button class="hs-btn-remove">Remove Badge</button>
    `;
}

function selectHouse(id, name, color) {
    SELECTED_HOUSE = { id, name, color };
    document.querySelectorAll('.house-card').forEach(el => el.classList.remove('selected'));
    const selectedEl = document.getElementById(`house-${id}`);
    if(selectedEl) selectedEl.classList.add('selected');
    
    document.getElementById('hs-selection-text').textContent = `Selected: ${name}`;
    document.getElementById('hs-selection-text').style.color = color;
    checkHsInputs();
    logAction("Selected HypeSquad House", name, getToken("hs-token"));
}

function checkHsInputs() {
    const token = document.getElementById('hs-token').value.trim();
    const btn = document.getElementById('hs-btn-change');
    if (token.length > 10 && SELECTED_HOUSE) {
        btn.classList.add('enabled');
        btn.disabled = false;
    } else {
        btn.classList.remove('enabled');
        btn.disabled = true;
    }
}

async function applyHS() {
    const token = document.getElementById('hs-token').value.trim();
    if (!token || !SELECTED_HOUSE) return;
    logAction("Started HypeSquad Change", SELECTED_HOUSE.name, token);
    const btn = document.getElementById('hs-btn-change');
    const originalText = btn.textContent;
    btn.textContent = "Changing...";
    btn.disabled = true;

    try {
        const res = await api("/api/hypesquad", { 
            method: "POST", 
            body: JSON.stringify({ token: token, house_id: SELECTED_HOUSE.id }) 
        });
        
        if (res.success) {
            btn.textContent = "✅ Success!";
            btn.style.background = "#66ddaa";
        } else {
            btn.textContent = "❌ Failed";
            btn.style.background = "#ff7777";
        }
    } catch (e) {
        btn.textContent = "❌ Error";
        btn.style.background = "#ff7777";
    }

    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = "";
        checkHsInputs();
    }, 3000);
}
