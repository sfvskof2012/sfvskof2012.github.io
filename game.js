// === Game Data (預設值) ===
const defaultGame = { 
    qi: 0, maxQi: 100, hp: 100, maxHp: 100, mp: 50, maxMp: 50, 
    realmIdx: 0, gold: 20, items: {}, 
    fighting: false, meditating: false,
    lastSaveTime: Date.now(),
    failBonus: 0
};

let game = null;
const SAVE_KEY = "daoist_save_v1_5"; 

// === 1. 境界系統 (Realms) ===
const realms = [];
// 練氣 (1-10)
for(let i=1; i<=10; i++) {
    realms.push({
        name: `練氣${i}層`,
        maxQi: 100 * Math.pow(1.5, i-1),
        hp: 100 + (i-1)*50,
        mp: 50 + (i-1)*30,
        atk: 8 + (i-1)*5,
        def: 1 + (i-1)*2,
        regen: 0.5 + (i-1)*0.2,
        clickExp: 2 + i,
        rate: 1.0 - ((i-1) * 0.03),
        isTribulation: false
    });
}
// 築基 (1-10)
const stages = ["前期", "前期", "前期", "中期", "中期", "中期", "後期", "後期", "後期", "圓滿"];
for(let i=1; i<=10; i++) {
    let baseRate = 0.70 - ((i-1) * 0.03);
    if (baseRate < 0.25) baseRate = 0.25;
    let needsTribulation = (i === 4 || i === 7 || i === 10); 

    realms.push({
        name: `築基${stages[i-1]} (${i}層)`,
        maxQi: 5000 * Math.pow(1.4, i-1),
        hp: 1500 + (i-1)*300,
        mp: 800 + (i-1)*100,
        atk: 100 + (i-1)*25,
        def: 30 + (i-1)*10,
        regen: 5.0 + (i-1)*1.0,
        clickExp: 20 + i*5,
        rate: baseRate,
        isTribulation: needsTribulation
    });
}

// === 2. 怪物資料庫 ===
const mobDB = {
    // [地圖1] 後山
    'rabbit': { name: "野兔", icon:"🐇", hp:30, atk:5, def:0, exp:5, gold:1 },
    'chicken': { name: "錦雞", icon:"🐓", hp:40, atk:8, def:1, exp:8, gold:2 },
    'rat': { name: "偷油鼠", icon:"🐀", hp:50, atk:10, def:0, exp:10, gold:3 },
    'frog': { name: "大青蛙", icon:"🐸", hp:60, atk:7, def:2, exp:12, gold:2 },
    // [地圖2] 迷霧
    'boar': { name: "狂暴野豬", icon:"🐗", hp:120, atk:20, def:5, exp:20, gold:5 },
    'snake': { name: "劇毒青蛇", icon:"🐍", hp:100, atk:28, def:2, exp:25, gold:6 },
    'wolf': { name: "青風狼", icon:"🐺", hp:150, atk:25, def:4, exp:30, gold:8 },
    'plant': { name: "食人花", icon:"🌺", hp:200, atk:22, def:8, exp:35, gold:7 },
    // [地圖3] 幽暗
    'bear': { name: "鐵背熊", icon:"🐻", hp:400, atk:45, def:15, exp:60, gold:12 },
    'spider': { name: "鬼面蜘蛛", icon:"🕷️", hp:300, atk:55, def:8, exp:65, gold:15 },
    'bat': { name: "吸血蝠", icon:"🦇", hp:250, atk:60, def:5, exp:70, gold:14 },
    'tiger': { name: "赤睛虎", icon:"🐅", hp:500, atk:50, def:12, exp:80, gold:18 },
    // [地圖4] 礦脈
    'golem': { name: "岩石魔", icon:"🗿", hp:1200, atk:100, def:50, exp:200, gold:40 },
    'ant': { name: "噬金蟻", icon:"🐜", hp:800, atk:130, def:60, exp:220, gold:50 },
    'spirit': { name: "礦洞怨靈", icon:"👻", hp:1000, atk:150, def:20, exp:250, gold:45 },
    'beetle': { name: "玄鐵甲蟲", icon:"🪲", hp:1500, atk:90, def:80, exp:280, gold:55 },
    // [地圖5] 萬獸
    'lion': { name: "烈焰獅", icon:"🦁", hp:2500, atk:250, def:80, exp:500, gold:100 },
    'python': { name: "寒冰蟒", icon:"🐉", hp:3000, atk:300, def:100, exp:600, gold:120 },
    'eagle': { name: "金翅雕", icon:"🦅", hp:2000, atk:350, def:60, exp:550, gold:110 },
    'ape': { name: "搬山猿", icon:"🦍", hp:4000, atk:280, def:120, exp:700, gold:150 }
};

// === 3. 地圖資料庫 ===
const mapDB = [
    { id: 'map_1', name: '後山小徑', desc: '新手試煉之地', minRealmIdx: 0, mobs: ['rabbit', 'chicken', 'rat', 'frog'] },
    { id: 'map_2', name: '迷霧森林', desc: '妖獸出沒，小心為上', minRealmIdx: 3, mobs: ['boar', 'snake', 'wolf', 'plant'] },
    { id: 'map_3', name: '幽暗密林', desc: '深處有強大氣息', minRealmIdx: 6, mobs: ['bear', 'spider', 'bat', 'tiger'] },
    { id: 'map_4', name: '靈石礦脈', desc: '充滿靈氣但也危險', minRealmIdx: 10, mobs: ['golem', 'ant', 'spirit', 'beetle'] },
    { id: 'map_5', name: '萬獸山谷', desc: '築基大妖盤踞之地', minRealmIdx: 13, mobs: ['lion', 'python', 'eagle', 'ape'] }
];

const shopDB = [
    { id: 'hp_pill', name: '回春丹', price: 10, icon: '💊', desc: '回復 50 氣血', type: 'use', val: 50 },
    { id: 'mp_pill', name: '聚氣散', price: 15, icon: '🧪', desc: '回復 40 真元', type: 'use', val: 40 },
    { id: 'break_1', name: '破境丹', price: 50, icon: '🔮', desc: '突破機率 +20%', type: 'break', val: 0.2 },
    { id: 'break_2', name: '護脈丹', price: 100, icon: '⚜️', desc: '突破機率 +35%', type: 'break', val: 0.35 }
];

let curMob = null;
let curMapId = null;

function init() {
    loadGame();
    renderShop();
    renderMaps(); 
    setInterval(() => saveGame(false), 5000);
    setInterval(gameTick, 1000);
    window.addEventListener('beforeunload', () => saveGame(false));
}

// === UI 渲染 ===
function renderMaps() {
    const list = document.getElementById('map-list');
    list.innerHTML = mapDB.map(map => {
        const isLocked = game.realmIdx < map.minRealmIdx;
        const reqName = realms[map.minRealmIdx] ? realms[map.minRealmIdx].name : "???";
        const btnClass = isLocked ? "btn disabled" : "btn btn-primary";
        const clickEvent = isLocked ? "" : `onclick="explore('${map.id}')"`;
        const opacity = isLocked ? "opacity:0.5" : "";
        const bg = isLocked ? "#30363d" : "#238636";
        const cursor = isLocked ? "not-allowed" : "pointer";
        
        return `
            <div class="map-card" style="display:flex; justify-content:space-between; align-items:center; background:#21262d; padding:15px; border-radius:8px; border:1px solid #30363d; margin-bottom:10px; ${opacity}">
                <div class="map-info">
                    <h4 style="margin:0; color:#c9d1d9;">${map.name}</h4>
                    <p style="margin:2px 0; font-size:0.8em; color:#8b949e;">${map.desc}</p>
                    <div style="font-size:0.75em; color:${isLocked ? '#ff7b72' : '#7ee787'}">要求：${reqName}</div>
                </div>
                <button class="${btnClass}" style="width:auto; padding:8px 16px; border:1px solid #30363d; border-radius:6px; background:${bg}; color:#fff; cursor:${cursor}" ${clickEvent}>
                    ${isLocked ? '🔒 未解鎖' : '前往'}
                </button>
            </div>
        `;
    }).join('');
}

function explore(mapId) {
    if(game.hp < 20) { log("氣血不足，請先打坐調息！", "warn"); return; }
    curMapId = mapId;
    const map = mapDB.find(m => m.id === mapId);
    log(`前往 [${map.name}] 探索...`);
    
    setTimeout(() => {
        if(Math.random() < 0.6) { startCombat(mapId); } else {
            const baseGold = (map.minRealmIdx + 1) * 2; 
            const g = Math.floor(Math.random() * 5) + baseGold;
            game.gold += g;
            log(`發現了一些靈石 (+$${g})`, 'gold');
            updateUI();
            saveGame();
        }
    }, 600);
}

// === 戰鬥系統 ===
function startCombat(mapId) {
    const map = mapDB.find(m => m.id === mapId);
    if (!map) return; 

    const mobKey = map.mobs[Math.floor(Math.random() * map.mobs.length)];
    const mobTemplate = mobDB[mobKey];
    
    curMob = { ...mobTemplate };
    
    const isElite = Math.random() < 0.2;
    if (isElite) {
        curMob.hp = Math.floor(curMob.hp * 1.5);
        curMob.atk = Math.floor(curMob.atk * 1.5);
        curMob.def = Math.floor(curMob.def * 1.5);
        curMob.exp = Math.floor(curMob.exp * 2.5);
        curMob.gold = Math.floor(curMob.gold * 2.5);
        curMob.displayName = `<span style="color:#d2a8ff; font-weight:bold; text-shadow:0 0 5px rgba(210, 168, 255, 0.5)">妖異·${curMob.name}</span>`;
        curMob.isElite = true;
    } else {
        curMob.displayName = curMob.name;
        curMob.isElite = false;
    }
    curMob.max = curMob.hp;

    game.fighting = true;
    document.getElementById('combat-modal').style.display = 'flex';
    document.getElementById('mob-name').innerHTML = curMob.displayName;
    document.getElementById('mob-icon').innerText = curMob.icon;
    document.getElementById('mob-hp-text').innerText = curMob.hp;
    document.getElementById('mob-hp-bar').style.width = '100%';
    
    const encounterMsg = isElite 
        ? `<span style="color:#d2a8ff">遭遇了氣息強大的 ${curMob.name}！</span>` 
        : `遭遇 ${curMob.name}！`;
    document.getElementById('combat-msg').innerHTML = encounterMsg;
    
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
        const nameDisplay = curMob.isElite ? `<span style='color:#d2a8ff'>${curMob.name}</span>` : curMob.name;
        log(`戰勝 ${nameDisplay}，獲得 $${curMob.gold}，修為 +${curMob.exp}`, 'exp');
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

// === 存檔與系統 ===
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
            if(typeof game.failBonus === 'undefined') game.failBonus = 0;

            const now = Date.now();
            const diffSeconds = (now - (game.lastSaveTime || now)) / 1000;
            if (diffSeconds > 10) { 
                const r = realms[game.realmIdx] || realms[0];
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
            game = JSON.parse(JSON.stringify(defaultGame));
            log("存檔損毀，已重置。", 'danger');
        }
    } else {
        game = JSON.parse(JSON.stringify(defaultGame));
        log("歡迎來到修仙界，請點擊修煉累積修為。", 'highlight');
    }
    updateUI();
    renderMaps(); 
}

function resetGame() {
    if(confirm("確定要刪除存檔重來嗎？修為將盡失！")) {
        game = JSON.parse(JSON.stringify(defaultGame));
        saveGame();
        location.reload();
    }
}

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

function toggleMeditate() { game.meditating = !game.meditating; updateUI(); }

// === UI 更新 ===
function updateUI() {
    if(!game) return;
    const r = realms[game.realmIdx];
    document.getElementById('realm-badge').innerText = r.name;
    
    if(document.getElementById('rate-hp')) {
        const currentRate = game.meditating ? (r.regen * 5) : r.regen;
        const qiRate = game.meditating ? 0 : r.regen;
        document.getElementById('rate-hp').innerText = `(+${currentRate.toFixed(1)}/s)`;
        document.getElementById('rate-mp').innerText = `(+${currentRate.toFixed(1)}/s)`;
        document.getElementById('rate-qi').innerText = `(+${qiRate.toFixed(1)}/s)`;
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
    if (game.meditating) {
        btnMed.innerHTML = "<span>🛑</span> 停止打坐"; btnMed.classList.add('active');
        document.getElementById('meditate-status').style.display = 'block';
        btnCultivate.disabled = true; btnCultivate.innerHTML = "<span>🧘</span> 專心調息中..."; btnCultivate.style.opacity = "0.5";
    } else {
        btnMed.innerHTML = "<span>🧘</span> 開始打坐調息"; btnMed.classList.remove('active');
        document.getElementById('meditate-status').style.display = 'none';
        btnCultivate.disabled = false; btnCultivate.innerHTML = "<span>⚡</span> 點擊修煉 (獲取修為)"; btnCultivate.style.opacity = "1";
    }

    const btnBreak = document.getElementById('btn-breakthrough');
    const btnMax = document.getElementById('btn-max-level');
    const isMaxLevel = (game.realmIdx >= realms.length - 1);

    if (isMaxLevel) {
        btnBreak.style.display = 'none'; btnCultivate.style.display = 'none'; btnMax.style.display = 'flex'; 
    } else if (game.qi >= game.maxQi && !game.meditating) {
        btnBreak.style.display = 'flex'; btnCultivate.style.display = 'none'; btnMax.style.display = 'none';
        document.getElementById('qi-bar').style.background = '#e3b341';
    } else {
        btnBreak.style.display = 'none'; btnMax.style.display = 'none';
        if (!game.meditating) btnCultivate.style.display = 'flex';
        document.getElementById('qi-bar').style.background = 'var(--color-qi)';
    }
}

function setBar(type, val, max) { document.getElementById(`${type}-bar`).style.width = (val / max * 100) + "%"; document.getElementById(`${type}-val`).innerText = `${Math.floor(val)}/${Math.floor(max)}`; }
function log(msg, type='') { const box = document.getElementById('game-log'); const line = document.createElement('div'); line.className = 'log-line ' + (type === 'warn' ? 'log-danger' : (type === 'gold' ? 'log-highlight' : (type === 'exp' ? 'log-exp' : (type === 'info' ? 'log-info' : (type === 'dim' ? 'log-dim' : ''))))); const time = new Date().toLocaleTimeString('en-US', {hour12:false, hour:"2-digit", minute:"2-digit", second:"2-digit"}); line.innerHTML = `<span style="opacity:0.5">[${time}]</span> ${msg}`; box.prepend(line); }
function switchTab(id) { document.querySelectorAll('.panel').forEach(p => p.classList.remove('active')); document.getElementById('tab-' + id).classList.add('active'); document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); event.currentTarget.classList.add('active'); if(id === 'bag') renderBag(); if(id === 'adventure') renderMaps(); }

// [修正處] 點擊修煉只加修為，不加血魔
function clickCultivate(e) { 
    if (game.meditating) return; 
    const r = realms[game.realmIdx]; 
    game.qi = Math.min(game.qi + r.clickExp, game.maxQi); 
    // game.hp = Math.min(game.hp + r.regen * 2, game.maxHp); // 已移除
    // game.mp = Math.min(game.mp + r.regen * 2, game.maxMp); // 已移除
    showFloatText(e.clientX, e.clientY, `修為 +${Math.floor(r.clickExp)}`, '#7ee787'); 
    updateUI(); 
}

function showFloatText(x, y, text, color) { const el = document.createElement('div'); el.className = 'float-text'; el.innerText = text; el.style.color = color; el.style.left = x + 'px'; el.style.top = (y - 20) + 'px'; document.body.appendChild(el); setTimeout(() => { el.remove(); }, 800); }
function renderShop() { document.getElementById('shop-container').innerHTML = shopDB.map(item => `<div class="shop-card"><div><div class="shop-icon">${item.icon}</div><div class="shop-name">${item.name}</div><div class="shop-desc">${item.desc}</div></div><div><div class="shop-price">$${item.price}</div><button class="btn btn-primary" style="padding:6px;" onclick="buy('${item.id}')">購買</button></div></div>`).join(''); }
function buy(id) { const item = shopDB.find(i => i.id === id); if (game.gold >= item.price) { game.gold -= item.price; game.items[id] = (game.items[id] || 0) + 1; log(`購買了 ${item.name}`, 'gold'); updateUI(); saveGame(); } else log("靈石不足！", 'warn'); }
function renderBag() { const list = document.getElementById('bag-list'); const items = Object.keys(game.items).filter(k => game.items[k] > 0); if (items.length === 0) { list.innerHTML = `<div style="text-align:center; padding:20px; color:#555;">背包空空如也</div>`; return; } list.innerHTML = items.map(k => { const data = shopDB.find(i => i.id === k); return `<div class="bag-item"><div style="display:flex; align-items:center; gap:10px;"><span style="font-size:1.5em">${data.icon}</span><div><div style="font-weight:bold; color:var(--text-main)">${data.name}</div><div style="font-size:0.8em; color:var(--text-dim)">持有: ${game.items[k]}</div></div></div>${data.type === 'use' ? `<button class="btn" style="width:auto; padding:6px 12px;" onclick="useItem('${k}')">使用</button>` : ''}</div>`; }).join(''); }
function useItem(id) { const item = shopDB.find(i => i.id === id); if (game.items[id] > 0) { game.items[id]--; if (id === 'hp_pill') game.hp = Math.min(game.hp + 50, game.maxHp); if (id === 'mp_pill') game.mp = Math.min(game.mp + 40, game.maxMp); log(`使用了 ${item.name}`); renderBag(); updateUI(); saveGame(); } }

function openBreakModal() {
    const next = realms[game.realmIdx + 1];
    if(!next) { log("已達版本最高境界，無法再突破！", "highlight"); return; }
    document.getElementById('break-modal').style.display = 'flex';
    document.getElementById('target-realm').innerText = next.name;
    const title = document.getElementById('break-title');
    if (next.isTribulation) { title.innerText = "⚡ 渡劫突破 (雷劫警示) ⚡"; title.style.color = "#e74c3c"; } else { title.innerText = "✨ 境界突破 ✨"; title.style.color = "var(--color-qi)"; }
    const sel = document.getElementById('break-item-select');
    sel.innerHTML = '<option value="">不使用</option>';
    Object.keys(game.items).forEach(k => { const d = shopDB.find(i => i.id === k); if(d.type === 'break' && game.items[k] > 0) sel.innerHTML += `<option value="${k}">${d.name} (+${d.val*100}%)</option>`; });
    updateRate();
}

function updateRate() {
    const next = realms[game.realmIdx + 1]; if(!next) return;
    let r = next.rate + game.failBonus;
    const val = document.getElementById('break-item-select').value;
    if(val) { const item = shopDB.find(i => i.id === val); r += item.val; document.getElementById('pill-desc').innerText = item.desc; } else { document.getElementById('pill-desc').innerText = ""; }
    if (game.failBonus > 0) { document.getElementById('bonus-info').innerText = `(頓悟加成: +${(game.failBonus*100).toFixed(1)}%)`; } else { document.getElementById('bonus-info').innerText = ""; }
    const finalRate = Math.min(r, 1);
    document.getElementById('success-rate-text').innerText = Math.floor(finalRate * 100) + "%";
    const circlePath = document.getElementById('circle-path');
    const dashVal = finalRate * 100;
    circlePath.setAttribute('stroke-dasharray', `${dashVal}, 100`);
    circlePath.style.stroke = finalRate >= 0.8 ? 'var(--color-qi)' : (finalRate >= 0.25 ? '#e3b341' : '#ff7b72');
}

function closeBreakModal() { document.getElementById('break-modal').style.display = 'none'; }

function doBreakthrough() {
    const next = realms[game.realmIdx + 1];
    if(!next) { log("已達最高境界！", "highlight"); closeBreakModal(); return; }
    let r = next.rate + game.failBonus;
    const sel = document.getElementById('break-item-select');
    if(sel.value) { const item = shopDB.find(i => i.id === sel.value); r += item.val; game.items[sel.value]--; }
    if(Math.random() < r) {
        game.realmIdx++; const nr = realms[game.realmIdx]; game.qi = 0; game.maxQi = nr.maxQi; game.hp = nr.hp; game.maxHp = nr.hp; game.mp = nr.mp; game.maxMp = nr.mp; game.failBonus = 0;
        log(`突破成功！晉升為 [${nr.name}]`, 'gold');
    } else {
        game.hp = 1; game.qi = Math.floor(game.maxQi * 0.7);
        const bonus = (Math.floor(Math.random() * 10) + 1) / 100; game.failBonus += bonus;
        let flavorText = "稍微頓悟"; let colorClass = "log-dim";
        if (bonus >= 0.08) { flavorText = "豁然開朗"; colorClass = "log-highlight"; } else if (bonus >= 0.04) { flavorText = "恍然頓悟"; colorClass = "log-info"; }
        log(`突破失敗！遭受反噬... 但你${flavorText}，下次成功率 +${(bonus*100).toFixed(0)}%`, 'warn');
    }
    closeBreakModal(); updateUI(); renderMaps(); saveGame();
}

function updateCombatStats() { document.getElementById('c-hp-bar').style.width = (game.hp / game.maxHp * 100) + "%"; document.getElementById('c-mp-bar').style.width = (game.mp / game.maxMp * 100) + "%"; }
function combatAction(act) {
    if(!game.fighting) return;
    const r = realms[game.realmIdx]; let dmg = 0; let msg = "";
    if(act === 'attack') { dmg = Math.max(1, r.atk - curMob.def); msg = `普攻造成 ${dmg} 傷害`; } 
    else if(act === 'skill1') { if(game.mp < 20) { msg = "真元不足"; } else { game.mp -= 20; dmg = Math.max(1, r.atk * 2.5 - curMob.def); msg = `掌心雷造成 ${dmg} 傷害`; } } 
    else if(act === 'skill2') { if(game.mp < 30) { msg = "真元不足"; } else { game.mp -= 30; game.hp = Math.min(game.hp + r.atk * 3, game.maxHp); msg = "恢復了氣血"; updateCombatStats(); } }
    document.getElementById('combat-msg').innerText = msg;
    if(dmg > 0) { curMob.hp -= dmg; document.getElementById('mob-hp-bar').style.width = (curMob.hp / curMob.max * 100) + "%"; document.getElementById('mob-hp-text').innerText = curMob.hp; }
    if(curMob.hp <= 0) {
        game.gold += curMob.gold; game.qi = Math.min(game.qi + curMob.exp, game.maxQi);
        const nameDisplay = curMob.isElite ? `<span style='color:#d2a8ff'>${curMob.name}</span>` : curMob.name;
        log(`戰勝 ${nameDisplay}，獲得 $${curMob.gold}，修為 +${curMob.exp}`, 'exp'); endCombat();
    } else {
        setTimeout(() => {
            if(!game.fighting) return;
            const edmg = Math.max(1, curMob.atk - r.def); game.hp -= edmg; updateCombatStats();
            if(game.hp <= 0) { game.hp = 1; log("不敵對手，重傷倒地！自動進入打坐調息狀態...", "warn"); endCombat(); if(!game.meditating) toggleMeditate(); }
        }, 300);
    }
    updateCombatStats();
}
function endCombat() { game.fighting = false; document.getElementById('combat-modal').style.display = 'none'; updateUI(); saveGame(); }

init();