// === Game Data (預設值) ===
const defaultGame = { 
    qi: 0, maxQi: 100, hp: 100, maxHp: 100, mp: 50, maxMp: 50, realmIdx: 0, gold: 20, 
    items: {}, fighting: false, meditating: false,
    lastSaveTime: Date.now() 
};

// 初始化變數
let game = null;
const SAVE_KEY = "daoist_save_v1";

const realms = [
    { name: "凡人", maxQi: 100, hp: 100, mp: 50, atk: 8, def: 1, regen: 0.5, rate: 1.0, clickExp: 2 },
    { name: "練氣一層", maxQi: 200, hp: 150, mp: 80, atk: 15, def: 3, regen: 1.0, rate: 0.9, clickExp: 4 },
    { name: "練氣二層", maxQi: 400, hp: 250, mp: 120, atk: 25, def: 6, regen: 1.5, rate: 0.8, clickExp: 6 },
    { name: "練氣三層", maxQi: 800, hp: 400, mp: 180, atk: 40, def: 10, regen: 2.0, rate: 0.7, clickExp: 8 },
    { name: "築基期", maxQi: 2000, hp: 1200, mp: 600, atk: 120, def: 40, regen: 5.0, rate: 0.5, clickExp: 20 }
];

const shopDB = [
    { id: 'hp_pill', name: '回春丹', price: 10, icon: '💊', desc: '回復 50 氣血', type: 'use', val: 50 },
    { id: 'mp_pill', name: '聚氣散', price: 15, icon: '🧪', desc: '回復 40 真元', type: 'use', val: 40 },
    { id: 'break_1', name: '破境丹', price: 50, icon: '🔮', desc: '突破機率 +20%', type: 'break', val: 0.2 },
    { id: 'break_2', name: '護脈丹', price: 100, icon: '⚜️', desc: '突破機率 +35%', type: 'break', val: 0.35 }
];

const mobs = [
    { name: "狂暴野豬", icon:"🐗", hp:60, max:60, atk:12, def:2, exp:15, gold:3 },
    { name: "劇毒青蛇", icon:"🐍", hp:80, max:80, atk:18, def:4, exp:25, gold:5 },
    { name: "食人花", icon:"🌺", hp:150, max:150, atk:25, def:5, exp:50, gold:8 }
];

let curMob = null;

// === 初始化 ===
function init() {
    loadGame(); 
    renderShop();
    
    // 自動存檔：每 5 秒
    setInterval(() => saveGame(false), 5000);
    // 遊戲主迴圈：每 1 秒
    setInterval(gameTick, 1000);
    
    // [強制存檔] 關閉/刷新網頁時
    window.addEventListener('beforeunload', () => {
        saveGame(false);
    });
}

// === 存檔系統 ===
function saveGame(showNotice = false) {
    if(!game) return;
    game.lastSaveTime = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(game));
    
    if(showNotice) {
        const notice = document.getElementById('save-notice');
        notice.style.opacity = 1;
        setTimeout(() => notice.style.opacity = 0, 1500);
        log("存檔成功。", 'info');
    }
}

function loadGame() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
        try {
            const saved = JSON.parse(raw);
            game = { ...defaultGame, ...saved };
            game.fighting = false; 
            
            const now = Date.now();
            const diffSeconds = (now - (game.lastSaveTime || now)) / 1000;
            
            if (diffSeconds > 10) { 
                const r = realms[game.realmIdx];
                const hpGain = Math.min(r.regen * diffSeconds, game.maxHp);
                const mpGain = Math.min(r.regen * diffSeconds, game.maxMp);
                const qiGain = Math.min(r.regen * diffSeconds, game.maxQi);
                
                game.hp = Math.min(game.hp + hpGain, game.maxHp);
                game.mp = Math.min(game.mp + mpGain, game.maxMp);
                if(game.qi < game.maxQi) game.qi = Math.min(game.qi + qiGain, game.maxQi);
                
                log(`📂 讀取存檔成功！離線 ${Math.floor(diffSeconds)} 秒，恢復了狀態。`, 'highlight');
            } else {
                log("📂 讀取本地存檔成功。", 'highlight');
            }
        } catch(e) {
            console.error("Save file corrupted", e);
            game = JSON.parse(JSON.stringify(defaultGame));
            log("存檔損毀，已重置。", 'danger');
        }
    } else {
        game = JSON.parse(JSON.stringify(defaultGame));
        log("歡迎來到修仙界，請點擊修煉累積修為。", 'highlight');
    }
    updateUI();
}

function resetGame() {
    if(confirm("確定要刪除存檔重來嗎？修為將盡失！")) {
        game = JSON.parse(JSON.stringify(defaultGame));
        saveGame();
        location.reload();
    }
}

// === 核心循環 ===
function gameTick() {
    if (!game || game.fighting) return;

    const r = realms[game.realmIdx];

    if (game.meditating) {
        game.hp = Math.min(game.hp + r.regen * 5, game.maxHp);
        game.mp = Math.min(game.mp + r.regen * 5, game.maxMp);
        
        if (game.hp >= game.maxHp && game.mp >= game.maxMp) {
            toggleMeditate(); 
            log("氣血真元已盈滿，結束打坐，繼續修煉。", "info");
        }
    } else {
        game.hp = Math.min(game.hp + r.regen, game.maxHp);
        game.mp = Math.min(game.mp + r.regen, game.maxMp);
        if (game.qi < game.maxQi) game.qi = Math.min(game.qi + r.regen, game.maxQi);
    }
    
    updateUI();
}

function toggleMeditate() {
    game.meditating = !game.meditating;
    updateUI();
}

function updateUI() {
    if(!game) return;
    const r = realms[game.realmIdx];
    
    document.getElementById('realm-badge').innerText = r.name;
    
    if(document.getElementById('rate-hp')) {
        const currentRate = game.meditating ? (r.regen * 5) : r.regen;
        const qiRate = game.meditating ? 0 : r.regen;

        document.getElementById('rate-hp').innerText = `(+${currentRate}/s)`;
        document.getElementById('rate-mp').innerText = `(+${currentRate}/s)`;
        document.getElementById('rate-qi').innerText = `(+${qiRate}/s)`;
    }

    setBar('hp', game.hp, game.maxHp);
    setBar('mp', game.mp, game.maxMp);
    setBar('qi', game.qi, game.maxQi);

    document.getElementById('atk-disp').innerText = r.atk;
    document.getElementById('def-disp').innerText = r.def;
    document.getElementById('gold-disp').innerText = game.gold;
    document.getElementById('shop-gold').innerText = game.gold;

    const btnMed = document.getElementById('btn-meditate');
    const btnCultivate = document.getElementById('btn-cultivate');
    const statusText = document.getElementById('meditate-status');

    if (game.meditating) {
        btnMed.innerHTML = "<span>🛑</span> 停止打坐";
        btnMed.classList.add('active');
        statusText.style.display = 'block';
        btnCultivate.disabled = true; 
        btnCultivate.innerHTML = "<span>🧘</span> 專心調息中...";
        btnCultivate.style.opacity = "0.5";
    } else {
        btnMed.innerHTML = "<span>🧘</span> 開始打坐調息";
        btnMed.classList.remove('active');
        statusText.style.display = 'none';
        btnCultivate.disabled = false;
        btnCultivate.innerHTML = "<span>⚡</span> 點擊修煉 (獲取修為)";
        btnCultivate.style.opacity = "1";
    }

    const btnBreak = document.getElementById('btn-breakthrough');
    const btnMax = document.getElementById('btn-max-level');
    
    const isMaxLevel = (game.realmIdx >= realms.length - 1);

    if (isMaxLevel) {
        btnBreak.style.display = 'none';
        btnCultivate.style.display = 'none';
        btnMax.style.display = 'flex'; 
    } else if (game.qi >= game.maxQi && !game.meditating) {
        btnBreak.style.display = 'flex';
        btnCultivate.style.display = 'none'; 
        btnMax.style.display = 'none';
        document.getElementById('qi-bar').style.background = '#e3b341';
    } else {
        btnBreak.style.display = 'none';
        btnMax.style.display = 'none';
        if (!game.meditating) btnCultivate.style.display = 'flex';
        document.getElementById('qi-bar').style.background = 'var(--color-qi)';
    }
}

function setBar(type, val, max) {
    const pct = (val / max) * 100;
    document.getElementById(`${type}-bar`).style.width = pct + "%";
    document.getElementById(`${type}-val`).innerText = `${Math.floor(val)}/${max}`;
}

function log(msg, type='') {
    const box = document.getElementById('game-log');
    const line = document.createElement('div');
    line.className = 'log-line ' + (type === 'warn' ? 'log-danger' : (type === 'gold' ? 'log-highlight' : (type === 'exp' ? 'log-exp' : (type === 'info' ? 'log-info' : ''))));
    const time = new Date().toLocaleTimeString('en-US', {hour12:false, hour:"2-digit", minute:"2-digit", second:"2-digit"});
    line.innerHTML = `<span style="opacity:0.5">[${time}]</span> ${msg}`;
    box.prepend(line);
}

function switchTab(id) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-' + id).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    event.currentTarget.classList.add('active');
    if(id === 'bag') renderBag();
}

function clickCultivate(e) {
    if (game.meditating) return;

    const r = realms[game.realmIdx];
    game.qi = Math.min(game.qi + r.clickExp, game.maxQi);
    game.hp = Math.min(game.hp + r.regen * 2, game.maxHp);
    game.mp = Math.min(game.mp + r.regen * 2, game.maxMp);
    showFloatText(e.clientX, e.clientY, `修為 +${r.clickExp}`, '#7ee787');
    updateUI();
}

function showFloatText(x, y, text, color) {
    const el = document.createElement('div');
    el.className = 'float-text';
    el.innerText = text;
    el.style.color = color;
    el.style.left = x + 'px';
    el.style.top = (y - 20) + 'px';
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); }, 800);
}

// === Shop & Bag ===
function renderShop() {
    const con = document.getElementById('shop-container');
    con.innerHTML = shopDB.map(item => `
        <div class="shop-card">
            <div><div class="shop-icon">${item.icon}</div><div class="shop-name">${item.name}</div><div class="shop-desc">${item.desc}</div></div>
            <div><div class="shop-price">$${item.price}</div><button class="btn btn-primary" style="padding:6px;" onclick="buy('${item.id}')">購買</button></div>
        </div>`).join('');
}

function buy(id) {
    const item = shopDB.find(i => i.id === id);
    if (game.gold >= item.price) {
        game.gold -= item.price;
        game.items[id] = (game.items[id] || 0) + 1;
        log(`購買了 ${item.name}`, 'gold');
        updateUI();
        saveGame(); 
    } else log("靈石不足！", 'warn');
}

function renderBag() {
    const list = document.getElementById('bag-list');
    const items = Object.keys(game.items).filter(k => game.items[k] > 0);
    if (items.length === 0) { list.innerHTML = `<div style="text-align:center; padding:20px; color:#555;">背包空空如也</div>`; return; }
    list.innerHTML = items.map(k => {
        const data = shopDB.find(i => i.id === k);
        return `<div class="bag-item"><div style="display:flex; align-items:center; gap:10px;"><span style="font-size:1.5em">${data.icon}</span><div><div style="font-weight:bold; color:var(--text-main)">${data.name}</div><div style="font-size:0.8em; color:var(--text-dim)">持有: ${game.items[k]}</div></div></div>${data.type === 'use' ? `<button class="btn" style="width:auto; padding:6px 12px;" onclick="useItem('${k}')">使用</button>` : ''}</div>`;
    }).join('');
}

function useItem(id) {
    const item = shopDB.find(i => i.id === id);
    if (game.items[id] > 0) {
        game.items[id]--;
        if (id === 'hp_pill') game.hp = Math.min(game.hp + 50, game.maxHp);
        if (id === 'mp_pill') game.mp = Math.min(game.mp + 40, game.maxMp);
        log(`使用了 ${item.name}`);
        renderBag(); updateUI(); saveGame();
    }
}

// === Actions ===
function explore() {
    if(game.hp < 20) { log("氣血不足，請先打坐調息！", "warn"); return; }
    log("進入迷霧森林探索...");
    setTimeout(() => {
        if(Math.random() < 0.6) { startCombat(); } else {
            const g = Math.floor(Math.random() * 5) + 2;
            game.gold += g;
            log(`發現了一些靈石 (+$${g})`, 'gold');
            updateUI();
            saveGame();
        }
    }, 600);
}

function openBreakModal() {
    const next = realms[game.realmIdx + 1];
    if(!next) {
        log("已達版本最高境界，無法再突破！", "highlight");
        return;
    }

    document.getElementById('break-modal').style.display = 'flex';
    document.getElementById('target-realm').innerText = next.name;
    const sel = document.getElementById('break-item-select');
    sel.innerHTML = '<option value="">不使用</option>';
    Object.keys(game.items).forEach(k => {
        const d = shopDB.find(i => i.id === k);
        if(d.type === 'break' && game.items[k] > 0) sel.innerHTML += `<option value="${k}">${d.name} (+${d.val*100}%)</option>`;
    });
    updateRate();
}

function updateRate() {
    const next = realms[game.realmIdx + 1]; 
    if(!next) return;

    let r = next.rate; 
    const val = document.getElementById('break-item-select').value;
    
    if(val) { 
        const item = shopDB.find(i => i.id === val); 
        r += item.val; 
        document.getElementById('pill-desc').innerText = item.desc; 
    } else { 
        document.getElementById('pill-desc').innerText = ""; 
    }
    
    const finalRate = Math.min(r, 1);
    document.getElementById('success-rate-text').innerText = Math.floor(finalRate * 100) + "%";
    
    const circlePath = document.getElementById('circle-path');
    const dashVal = finalRate * 100;
    circlePath.setAttribute('stroke-dasharray', `${dashVal}, 100`);
    circlePath.style.stroke = finalRate >= 0.8 ? 'var(--color-qi)' : (finalRate >= 0.5 ? '#e3b341' : '#ff7b72');
}

function closeBreakModal() { document.getElementById('break-modal').style.display = 'none'; }

function doBreakthrough() {
    const next = realms[game.realmIdx + 1];
    if(!next) {
        log("已達最高境界！", "highlight");
        closeBreakModal();
        return;
    }

    let r = next.rate;
    const sel = document.getElementById('break-item-select');
    if(sel.value) { const item = shopDB.find(i => i.id === sel.value); r += item.val; game.items[sel.value]--; }

    if(Math.random() < r) {
        game.realmIdx++;
        const nr = realms[game.realmIdx];
        game.qi = 0; game.maxQi = nr.maxQi; game.hp = nr.hp; game.maxHp = nr.hp; game.mp = nr.mp; game.maxMp = nr.mp;
        log(`突破成功！晉升為 [${nr.name}]`, 'gold');
    } else {
        game.hp = 1; game.qi = Math.floor(game.maxQi * 0.7);
        log("突破失敗！遭受雷劫重傷。", 'warn');
    }
    closeBreakModal(); updateUI(); saveGame();
}

// === Combat ===
function startCombat() {
    const m = mobs[Math.floor(Math.random() * mobs.length)];
    curMob = { ...m };
    game.fighting = true;
    document.getElementById('combat-modal').style.display = 'flex';
    document.getElementById('mob-name').innerText = curMob.name;
    document.getElementById('mob-icon').innerText = curMob.icon;
    document.getElementById('mob-hp-text').innerText = curMob.hp;
    document.getElementById('mob-hp-bar').style.width = '100%';
    document.getElementById('combat-msg').innerText = "遭遇敵人！";
    updateCombatStats();
}

function updateCombatStats() {
    document.getElementById('c-hp-bar').style.width = (game.hp / game.maxHp * 100) + "%";
    document.getElementById('c-mp-bar').style.width = (game.mp / game.maxMp * 100) + "%";
}

function combatAction(act) {
    if(!game.fighting) return;
    const r = realms[game.realmIdx];
    let dmg = 0; let msg = "";

    if(act === 'attack') { dmg = Math.max(1, r.atk - curMob.def); msg = `普攻造成 ${dmg} 傷害`; } 
    else if(act === 'skill1') { if(game.mp < 20) { msg = "真元不足"; } else { game.mp -= 20; dmg = Math.max(1, r.atk * 2.5 - curMob.def); msg = `掌心雷造成 ${dmg} 傷害`; } } 
    else if(act === 'skill2') { if(game.mp < 30) { msg = "真元不足"; } else { game.mp -= 30; game.hp = Math.min(game.hp + r.atk * 3, game.maxHp); msg = "恢復了氣血"; updateCombatStats(); } }

    document.getElementById('combat-msg').innerText = msg;
    if(dmg > 0) {
        curMob.hp -= dmg;
        document.getElementById('mob-hp-bar').style.width = (curMob.hp / curMob.max * 100) + "%";
        document.getElementById('mob-hp-text').innerText = curMob.hp;
    }

    if(curMob.hp <= 0) {
        game.gold += curMob.gold;
        game.qi = Math.min(game.qi + curMob.exp, game.maxQi);
        log(`戰勝 ${curMob.name}，獲得 $${curMob.gold}，修為 +${curMob.exp}`, 'exp');
        endCombat();
    } else {
        setTimeout(() => {
            if(!game.fighting) return;
            const edmg = Math.max(1, curMob.atk - r.def);
            game.hp -= edmg;
            updateCombatStats();
            
            if(game.hp <= 0) { 
                game.hp = 1; 
                log("不敵對手，重傷倒地！自動進入打坐調息狀態...", "warn"); 
                endCombat();
                if(!game.meditating) toggleMeditate(); 
            }
        }, 300);
    }
    updateCombatStats();
}

function flee() { log("逃跑成功"); endCombat(); }
function endCombat() { 
    game.fighting = false; 
    document.getElementById('combat-modal').style.display = 'none'; 
    updateUI();
    saveGame(); 
}

init();