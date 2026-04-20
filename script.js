// ======================== ХРАНИЛИЩЕ ========================
let products = JSON.parse(localStorage.getItem('stroy_products')) || null;
let requests = JSON.parse(localStorage.getItem('stroy_requests')) || [];
let users = JSON.parse(localStorage.getItem('stroy_users')) || [];
let currentUser = null;

const defaultProducts = [
    { id:0, name:"Гипсокартон 12.5мм", stock:520, basePrice:450, avgSales:42, season:[0.9,0.85,0.95,1.05,1.1,1.2,1.25,1.2,1.05,1.0,0.9,0.85], revenue30d:589000, cv:0.08, demandBase:1280, elasticityCoef:1.15 },
    { id:1, name:"Цемент М500 50кг", stock:310, basePrice:380, avgSales:68, season:[0.95,0.9,1.0,1.05,1.1,1.15,1.1,1.05,1.02,1.0,0.95,0.9], revenue30d:1250000, cv:0.18, demandBase:2100, elasticityCoef:0.72 },
    { id:2, name:"Краска фасадная 10л", stock:85, basePrice:1750, avgSales:12, season:[0.7,0.75,0.9,1.1,1.3,1.4,1.5,1.4,1.2,1.0,0.8,0.7], revenue30d:890000, cv:0.27, demandBase:310, elasticityCoef:1.85 },
    { id:3, name:"Утеплитель Rockwool", stock:200, basePrice:1250, avgSales:23, season:[1.3,1.2,1.1,0.9,0.8,0.75,0.7,0.8,0.9,1.0,1.2,1.4], revenue30d:1420000, cv:0.12, demandBase:690, elasticityCoef:1.32 },
    { id:4, name:"Плитка керамическая", stock:430, basePrice:890, avgSales:31, season:[0.8,0.85,0.95,1.05,1.15,1.2,1.2,1.15,1.05,1.0,0.9,0.85], revenue30d:1980000, cv:0.22, demandBase:940, elasticityCoef:1.48 },
    { id:5, name:"Профиль ПП 60x27", stock:1140, basePrice:210, avgSales:105, season:[1.0,1.0,1.05,1.1,1.1,1.05,1.0,1.0,1.05,1.1,1.05,1.0], revenue30d:650000, cv:0.05, demandBase:3150, elasticityCoef:0.88 },
    { id:6, name:"Грунтовка глуб.пропитки", stock:75, basePrice:540, avgSales:14, season:[0.9,0.9,1.0,1.05,1.1,1.15,1.2,1.15,1.05,1.0,0.95,0.9], revenue30d:410000, cv:0.32, demandBase:380, elasticityCoef:1.55 }
];

if(!products) { products = JSON.parse(JSON.stringify(defaultProducts)); localStorage.setItem('stroy_products', JSON.stringify(products)); }

function saveProducts() { localStorage.setItem('stroy_products', JSON.stringify(products)); }
function saveRequests() { localStorage.setItem('stroy_requests', JSON.stringify(requests)); }
function saveUsers() { localStorage.setItem('stroy_users', JSON.stringify(users)); }
function getProductById(id) { return products.find(p=>p.id==id); }

// ---- ОФОРМЛЕНИЕ ЗАЯВКИ КЛИЕНТОМ ----
function createRequest(productId, quantity, clientName) {
    const product = getProductById(productId);
    if(!product || product.stock < quantity) return false;
    const totalAmount = quantity * product.basePrice;
    const newRequest = {
        id: Date.now(),
        productId: productId,
        productName: product.name,
        quantity: quantity,
        clientName: clientName,
        date: new Date().toLocaleString(),
        status: 'Новая',
        price: product.basePrice,
        total: totalAmount
    };
    requests.push(newRequest);
    saveRequests();
    return true;
}

// ---- КЛИЕНТ ----
function renderClientCatalog() {
    const tbody = document.getElementById('clientTbody');
    tbody.innerHTML = '';
    products.forEach(p => {
        const available = p.stock;
        tbody.innerHTML += `<tr>
            <td><strong>${p.name}</strong></td>
            <td>${available}</td>
            <td>${p.basePrice} ₽</td>
            <td><input type="number" id="qty_${p.id}" class="order-quantity" min="1" max="${available}" value="1"></td>
            <td><button class="btn-order" data-id="${p.id}" data-name="${p.name}">📦 Оформить заявку</button></td>
        </tr>`;
    });
    document.querySelectorAll('.btn-order').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(btn.dataset.id);
            const qtyInput = document.getElementById(`qty_${id}`);
            let qty = parseInt(qtyInput.value);
            if(isNaN(qty)) qty = 1;
            const product = getProductById(id);
            if(product && product.stock >= qty && qty > 0) {
                if(createRequest(id, qty, currentUser.fullname)) {
                    alert(`✅ Заявка оформлена: ${product.name} ${qty} шт. на сумму ${qty*product.basePrice}₽`);
                    renderClientCatalog();
                    renderClientRequests();
                } else alert('❌ Недостаточно товара на складе');
            } else alert('❌ Некорректное количество');
        });
    });
}

function renderClientRequests() {
    const tbody = document.getElementById('clientRequestsTbody');
    const myRequests = requests.filter(r => r.clientName === currentUser.fullname);
    tbody.innerHTML = '';
    myRequests.forEach(r => {
        tbody.innerHTML += `<tr>
            <td>${r.date}</td>
            <td>${r.productName}</td>
            <td>${r.quantity}</td>
            <td>${r.total} ₽</td>
            <td><span class="status-new">${r.status}</span></td>
        </tr>`;
    });
}

// ---- МЕНЕДЖЕР ----
function getTotalRequestedQty(productId) {
    return requests.filter(r => r.productId === productId).reduce((sum, r) => sum + r.quantity, 0);
}

function renderManagerForecast(monthIdx) {
    const tbody = document.getElementById('forecastMgrTbody');
    tbody.innerHTML = '';
    for(let p of products) {
        const season = p.season[monthIdx];
        const requested = getTotalRequestedQty(p.id);
        const effective = p.stock - requested;
        const dailyAdj = p.avgSales * season;
        let daysLeft = dailyAdj > 0 ? Math.floor(effective / dailyAdj) : 0;
        if(effective < 0) daysLeft = 0;
        let rec = '';
        if(effective <= 0) rec = 'Дефицит!';
        else if(daysLeft <= 5) rec = 'Срочный закуп';
        else if(daysLeft <= 14) rec = 'Пополнить запасы';
        else rec = 'Норма';
        tbody.innerHTML += `<tr>
            <td>${p.name}</td>
            <td>${p.stock}</td>
            <td>${requested}</td>
            <td>${p.avgSales.toFixed(1)}</td>
            <td>${daysLeft > 0 ? daysLeft : 0}</td>
            <td><span class="${effective<=0?'status-critical':'status-ok'}">${rec}</span></td>
        </tr>`;
    }
}

function renderManagerAbcXyz() {
    const tbody = document.getElementById('abcMgrTbody');
    const sorted = [...products].sort((a,b)=>b.revenue30d - a.revenue30d);
    const total = sorted.reduce((s,x)=>s+x.revenue30d,0);
    let cum = 0;
    let rows = [];
    for(let p of sorted) {
        cum += p.revenue30d;
        let abc = cum/total <= 0.7 ? 'A' : (cum/total <= 0.9 ? 'B' : 'C');
        let xyz = p.cv<0.1 ? 'X' : (p.cv<=0.25 ? 'Y' : 'Z');
        let strategy = (abc==='A' && xyz==='X') ? 'Приоритет' : (abc==='C' && xyz==='Z') ? 'Неликвид' : 'Мониторинг';
        rows.push(`<tr>
            <td>${p.name}</td>
            <td>${(p.revenue30d/1000).toFixed(0)} тыс.</td>
            <td><span class="abc-${abc.toLowerCase()}">${abc}</span></td>
            <td class="xyz-${xyz.toLowerCase()}">${xyz}</td>
            <td>${strategy}</td>
        </tr>`);
    }
    tbody.innerHTML = rows.join('');
}

function renderManagerRequests() {
    const tbody = document.getElementById('managerRequestsTbody');
    const allRequests = [...requests].reverse();
    tbody.innerHTML = '';
    allRequests.forEach(r => {
        tbody.innerHTML += `<tr>
            <td>${r.clientName}</td>
            <td>${r.productName}</td>
            <td>${r.quantity}</td>
            <td>${r.total} ₽</td>
            <td>${r.date}</td>
            <td><span class="status-new">${r.status}</span></td>
        </tr>`;
    });
}

// ---- АНАЛИТИК ----
let analystChart = null;

function renderAnalystForecast(monthIdx) {
    const tbody = document.getElementById('analystForecastTbody');
    tbody.innerHTML = '';
    for(let p of products) {
        const season = p.season[monthIdx];
        const requested = getTotalRequestedQty(p.id);
        const effective = p.stock - requested;
        const days = effective / (p.avgSales * season);
        const risk = effective<=0 ? 'Дефицит' : (days<5 ? 'Красная зона' : (days<15 ? 'Внимание' : 'Стабильно'));
        tbody.innerHTML += `<tr>
            <td>${p.name}</td>
            <td>${p.stock}</td>
            <td>${requested}</td>
            <td>${days>0?Math.floor(days):0}</td>
            <td><span class="${risk==='Дефицит'?'status-critical':'status-warning'}">${risk}</span></td>
        </tr>`;
    }
}

function renderAnalystAbc() {
    const tbody = document.getElementById('analystAbcTbody');
    const sorted = [...products].sort((a,b)=>b.revenue30d - a.revenue30d);
    const total = sorted.reduce((s,x)=>s+x.revenue30d,0);
    let cum = 0;
    let html='';
    for(let p of sorted){
        cum += p.revenue30d;
        let abc = cum/total <=0.7 ? 'A' : (cum/total<=0.9?'B':'C');
        let xyz = p.cv<0.1 ? 'X' : (p.cv<=0.25?'Y':'Z');
        let recommend = (abc==='A' && xyz==='X') ? 'AX - бестселлер' : (abc==='C' && xyz==='Z') ? 'CZ - убрать' : 'Контроль';
        html += `<tr>
            <td>${p.name}</td>
            <td>${(p.revenue30d/1000).toFixed(0)} тыс.</td>
            <td><span class="abc-${abc.toLowerCase()}">${abc}</span></td>
            <td>${(p.cv*100).toFixed(1)}%</td>
            <td class="xyz-${xyz.toLowerCase()}">${xyz}</td>
            <td>${recommend}</td>
        </tr>`;
    }
    tbody.innerHTML = html;
}

function updateAnalystElasticity(productId, newPrice) {
    const prod = products.find(p=>p.id==productId);
    if(!prod) return;
    const newDemand = Math.round(prod.demandBase * Math.pow(prod.basePrice / newPrice, prod.elasticityCoef));
    const deltaPercent = ((newDemand - prod.demandBase)/prod.demandBase*100).toFixed(1);
    const pointElast = (Math.abs(deltaPercent) / (Math.abs((newPrice-prod.basePrice)/prod.basePrice*100))).toFixed(2);
    document.getElementById('analystBaseDemand').innerHTML = prod.demandBase;
    document.getElementById('analystNewDemand').innerHTML = newDemand;
    document.getElementById('analystDelta').innerHTML = (deltaPercent>=0?'+':'')+deltaPercent+'%';
    document.getElementById('analystElasticVal').innerHTML = pointElast;
    const prices=[], demands=[];
    for(let price = prod.basePrice*0.3; price <= prod.basePrice*2.2; price += (prod.basePrice*1.9)/40){
        prices.push(Math.round(price));
        demands.push(Math.round(prod.demandBase * Math.pow(prod.basePrice/price, prod.elasticityCoef)));
    }
    if(analystChart) analystChart.destroy();
    const ctx = document.getElementById('analystChart').getContext('2d');
    analystChart = new Chart(ctx, { 
        type:'line', 
        data:{ labels:prices, datasets:[{ label:`Спрос (${prod.name})`, data:demands, borderColor:'#e67e22', fill:true, tension:0.2 }] }, 
        options:{ responsive:true } 
    });
}

function initAnalystElasticSelect() {
    const select = document.getElementById('analystElasticSelect');
    select.innerHTML = '';
    products.forEach(p=>{ select.innerHTML += `<option value="${p.id}">${p.name} (${p.basePrice}₽)</option>`; });
    const slider = document.getElementById('analystPriceSlider');
    select.onchange = () => { 
        const prod = products.find(p=>p.id==parseInt(select.value)); 
        if(prod){ slider.min = prod.basePrice*0.3; slider.max = prod.basePrice*2.2; slider.value = prod.basePrice; updateAnalystElasticity(prod.id, prod.basePrice); } 
    };
    const first = products[0];
    if(first){ slider.min = first.basePrice*0.3; slider.max = first.basePrice*2.2; slider.value = first.basePrice; updateAnalystElasticity(first.id, first.basePrice); }
    slider.oninput = () => { const pid = parseInt(select.value); updateAnalystElasticity(pid, parseFloat(slider.value)); };
}

// ---- ОБЩИЕ ФУНКЦИИ ----
function refreshAllByRole() {
    if(!currentUser) return;
    if(currentUser.role === 'client') {
        document.getElementById('clientPanel').style.display = 'block';
        renderClientCatalog();
        renderClientRequests();
    } else if(currentUser.role === 'manager') {
        document.getElementById('managerPanel').style.display = 'block';
        let month = parseInt(document.getElementById('seasonMonthSelectMgr').value);
        renderManagerForecast(month);
        renderManagerAbcXyz();
        renderManagerRequests();
    } else if(currentUser.role === 'analyst') {
        document.getElementById('analystPanel').style.display = 'block';
        let month = parseInt(document.getElementById('seasonMonthAnalyst').value);
        renderAnalystForecast(month);
        renderAnalystAbc();
        initAnalystElasticSelect();
    }
}

function showApp() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('appMain').style.display = 'block';
    document.getElementById('userNameSpan').innerText = currentUser.fullname || currentUser.username;
    document.getElementById('userRoleSpan').innerText = currentUser.role === 'client' ? 'Клиент' : (currentUser.role==='manager' ? 'Менеджер' : 'Аналитик');
    document.getElementById('clientPanel').style.display = 'none';
    document.getElementById('managerPanel').style.display = 'none';
    document.getElementById('analystPanel').style.display = 'none';
    refreshAllByRole();
}

function register(uname, pwd, fullname, role) { 
    if(users.find(u=>u.username===uname)) return false; 
    users.push({ username:uname, password:pwd, fullname, role }); 
    saveUsers(); 
    return true; 
}

function login(uname, pwd) { 
    return users.find(u=>u.username===uname && u.password===pwd); 
}

// ---- ИНИЦИАЛИЗАЦИЯ ДЕМО-ПОЛЬЗОВАТЕЛЕЙ ----
if(!users.length){
    users.push({ username:"client@stroy", password:"123", fullname:"ООО СтройКлиент", role:"client" });
    users.push({ username:"manager", password:"123", fullname:"Иван Менеджер", role:"manager" });
    users.push({ username:"analyst", password:"123", fullname:"Анна Аналитик", role:"analyst" });
    saveUsers();
}

// ---- НАВЕШИВАНИЕ ОБРАБОТЧИКОВ СОБЫТИЙ ----
document.getElementById('doLoginBtn').onclick = () => { 
    const u = login(document.getElementById('loginUsername').value, document.getElementById('loginPassword').value); 
    if(u){ currentUser=u; showApp(); } 
    else document.getElementById('loginError').innerText='Неверный логин/пароль'; 
};

document.getElementById('showRegisterBtn').onclick = () => { 
    document.getElementById('loginForm').style.display='none'; 
    document.getElementById('registerForm').style.display='block'; 
};

document.getElementById('showLoginBtn').onclick = () => { 
    document.getElementById('loginForm').style.display='block'; 
    document.getElementById('registerForm').style.display='none'; 
};

document.getElementById('doRegisterBtn').onclick = () => { 
    const uname=document.getElementById('regUsername').value.trim(); 
    const pwd=document.getElementById('regPassword').value.trim(); 
    const fname=document.getElementById('regFullname').value.trim()||uname; 
    const role=document.getElementById('regRole').value; 
    if(!uname||!pwd){ document.getElementById('regError').innerText='Заполните поля'; return; } 
    if(register(uname,pwd,fname,role)){ 
        alert('Регистрация успешна! Войдите.'); 
        document.getElementById('loginForm').style.display='block'; 
        document.getElementById('registerForm').style.display='none'; 
    } else document.getElementById('regError').innerText='Логин занят'; 
};

document.getElementById('logoutBtn').onclick = () => { 
    currentUser=null; 
    document.getElementById('appMain').style.display='none'; 
    document.getElementById('authModal').style.display='flex'; 
    document.getElementById('loginUsername').value = ''; 
    document.getElementById('loginPassword').value = ''; 
    document.getElementById('loginError').innerText = ''; 
};

document.getElementById('refreshForecastMgr').onclick = () => { 
    if(currentUser?.role==='manager') renderManagerForecast(parseInt(document.getElementById('seasonMonthSelectMgr').value)); 
};

document.getElementById('refreshAnalyst').onclick = () => { 
    if(currentUser?.role==='analyst') renderAnalystForecast(parseInt(document.getElementById('seasonMonthAnalyst').value)); 
};

document.getElementById('seasonMonthSelectMgr').onchange = () => { 
    if(currentUser?.role==='manager') renderManagerForecast(parseInt(document.getElementById('seasonMonthSelectMgr').value)); 
};

document.getElementById('seasonMonthAnalyst').onchange = () => { 
    if(currentUser?.role==='analyst') renderAnalystForecast(parseInt(document.getElementById('seasonMonthAnalyst').value)); 
};