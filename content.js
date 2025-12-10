let rates = null;
let lastUpdated = null;

// Default Settings
let currentSettings = {
    persistent: false,     // false = close on click outside
    singleInstance: true,  // true = only one popup at a time
    defaultTax: 15         // default tax %
};

// SVG Icons
const ICONS = {
    settings: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
    trash: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
    close: `&times;`
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "open_converter") {
        rates = request.rates;
        lastUpdated = request.timestamp;
        initPopup(request.selection);
    }
});

async function initPopup(selection) {
    const data = await chrome.storage.local.get(['userSettings']);
    if (data.userSettings) {
        currentSettings = { ...currentSettings, ...data.userSettings };
    }

    if (currentSettings.singleInstance) {
        const existingHosts = document.querySelectorAll('.price-actually-bdt-host');
        existingHosts.forEach(el => el.remove());
    }

    createPopup(selection);
}

function createPopup(selectedText) {
    const { amount, currency } = parseSelection(selectedText);
    
    // Create Unique Host
    const shadowHost = document.createElement('div');
    shadowHost.classList.add('price-actually-bdt-host'); 
    shadowHost.setAttribute('data-darkreader-ignore', 'true'); 
    
    const shadow = shadowHost.attachShadow({ mode: 'open' });

    // CSS
    const style = document.createElement('style');
    style.setAttribute('data-darkreader-ignore', 'true');
    style.textContent = `
        :host { 
            all: initial; 
            font-family: 'Segoe UI', sans-serif; 
            color-scheme: light; /* Force light mode rendering */
        }
        .bdt-box {
            position: fixed;
            bottom: 20px; right: 20px;
            width: 280px;
            background: #ffffff !important; /* Enforce white background */
            color: #333 !important; /* Enforce dark text */
            z-index: 2147483647;
            border-radius: 12px;
            box-shadow: 0 4px 25px rgba(0,0,0,0.2);
            border: 1px solid #ddd;
            padding: 16px; box-sizing: border-box;
            text-align: left;
            animation: slideIn 0.3s ease-out;
            display: flex; flex-direction: column;
        }
        @keyframes slideIn {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        .header {
            display: flex; justify-content: space-between; align-items: center;
            border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 15px;
            cursor: move; user-select: none;
        }
        h3 { margin: 0; font-size: 16px; font-weight: 700; color: #444; pointer-events: none; }
        .header-actions { display: flex; gap: 8px; align-items: center; }
        
        .icon-btn {
            cursor: pointer; color: #aaa; background: none; border: none; padding: 4px; 
            display: flex; align-items: center; justify-content: center;
            border-radius: 4px; transition: 0.2s;
        }
        .icon-btn:hover { color: #555; background: #f5f5f5; }
        .close-btn:hover { color: #d32f2f; background: #ffebee; }
        .trash-btn:hover { color: #d32f2f; background: #ffebee; }

        .view-main { display: block; }
        .view-settings { display: none; }

        .row { margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
        label { font-size: 13px; font-weight: 600; color: #666; flex: 0 0 80px; }
        input, .curr-input {
            padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px;
            flex: 1; font-size: 13px; max-width: 140px; background: white; color: #333;
            text-align: right; box-sizing: border-box;
            font-family: inherit;
        }
        
        /* Custom Dropdown Wrapper to match specific alignment */
        .currency-wrapper {
            flex: 1; max-width: 140px; position: relative;
        }
        .curr-input {
            width: 100%; max-width: 100%; cursor: text;
        }

        .currency-list {
            position: absolute; top: calc(100% + 4px); right: 0; left: 0;
            background: #ffffff; border: 1px solid #ddd; border-radius: 6px;
            max-height: 220px; overflow-y: auto; z-index: 99999;
            box-shadow: 0 6px 16px rgba(0,0,0,0.15); display: none;
        }
        /* Custom Scrollbar */
        .currency-list::-webkit-scrollbar { width: 6px; }
        .currency-list::-webkit-scrollbar-track { background: #f1f1f1; }
        .currency-list::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
        .currency-list::-webkit-scrollbar-thumb:hover { background: #aaa; }

        .currency-item {
            padding: 8px 12px; font-size: 13px; cursor: pointer; text-align: right; 
            border-bottom: 1px solid #f9f9f9; display: flex; justify-content: flex-end; align-items: center; gap: 6px;
        }
        .currency-item:last-child { border-bottom: none; }
        .currency-item:hover, .currency-item.active { background: #f1f8e9; color: #2e7d32; }
        .currency-item small { color: #888; font-size: 11px; }

        .result-box {
            background: #f1f8e9; border: 1px solid #c8e6c9; border-radius: 8px;
            padding: 15px; margin-top: 15px; text-align: center;
        }
        .total-label { font-size: 11px; color: #558b2f; text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 5px; }
        .total-amount { font-size: 26px; font-weight: 800; color: #2e7d32; display: block; line-height: 1.2; }
        .breakdown { font-size: 11px; color: #666; margin-top: 8px; }
        .meta { margin-top: 12px; font-size: 10px; color: #999; display: flex; justify-content: space-between; border-top: 1px solid #f5f5f5; padding-top: 8px; }

        .settings-title { font-size: 14px; font-weight: bold; margin-bottom: 15px; color: #333; }
        .setting-item { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .setting-item label { font-weight: normal; flex: 1; cursor: pointer; }
        
        label.switch { 
            position: relative; display: inline-block; width: 34px; height: 20px; 
            flex: none;
        }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: #2e7d32; }
        input:checked + .slider:before { transform: translateX(14px); }

        .btn-save {
            width: 100%; padding: 8px; background: #2e7d32; color: white; border: none; 
            border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: 10px;
        }
        .btn-save:hover { background: #1b5e20; }
    `;

    // 1. Get all currency codes from rates object
    const currencyCodes = rates ? Object.keys(rates).sort() : ['USD'];
    
    // Currency Symbols Map (Comprehensive ~160 currencies)
    const currencySymbols = {
        AED: "د.إ", AFN: "؋", ALL: "L", AMD: "֏", ANG: "ƒ", AOA: "Kz", ARS: "$", AUD: "$", AWG: "ƒ", AZN: "₼",
        BAM: "KM", BBD: "$", BDT: "৳", BGN: "лв", BHD: ".د.ب", BIF: "FBu", BMD: "$", BND: "$", BOB: "Bs.", BRL: "R$",
        BSD: "$", BTC: "₿", BTN: "Nu.", BWP: "P", BYN: "Br", BZD: "BZ$", CAD: "$", CDF: "FC", CHF: "Fr", CLF: "UF",
        CLP: "$", CNH: "¥", CNY: "¥", COP: "$", CRC: "₡", CUC: "$", CUP: "₱", CVE: "$", CZK: "Kč", DJF: "Fdj",
        DKK: "kr", DOP: "RD$", DZD: "د.ج", EGP: "£", ERN: "Nfk", ETB: "Br", EUR: "€", FJD: "$", FKP: "£", GBP: "£",
        GEL: "₾", GGP: "£", GHS: "GH₵", GIP: "£", GMD: "D", GNF: "FG", GTQ: "Q", GYD: "$", HKD: "$", HNL: "L",
        HRK: "kn", HTG: "G", HUF: "Ft", IDR: "Rp", ILS: "₪", IMP: "£", INR: "₹", IQD: "ع.د", IRR: "﷼", ISK: "kr",
        JEP: "£", JMD: "J$", JOD: "د.ا", JPY: "¥", KES: "KSh", KGS: "с", KHR: "៛", KMF: "CF", KPW: "₩", KRW: "₩",
        KWD: "د.ك", KYD: "$", KZT: "₸", LAK: "₭", LBP: "ل.ل", LKR: "₨", LRD: "$", LSL: "L", LYD: "ل.د", MAD: "د.م.",
        MDL: "L", MGA: "Ar", MKD: "ден", MMK: "K", MNT: "₮", MOP: "P", MRU: "UM", MUR: "₨", MVR: "Rf", MWK: "MK",
        MXN: "$", MYR: "RM", MZN: "MT", NAD: "$", NGN: "₦", NIO: "C$", NOK: "kr", NPR: "₨", NZD: "$", OMR: "ر.ع.",
        PAB: "B/.", PEN: "S/", PGK: "K", PHP: "₱", PKR: "₨", PLN: "zł", PYG: "₲", QAR: "ر.ق", RON: "lei", RSD: "дин.",
        RUB: "₽", RWF: "FRw", SAR: "﷼", SBD: "$", SCR: "₨", SDG: "ج.س.", SEK: "kr", SGD: "$", SHP: "£", SLL: "Le",
        SOS: "S", SRD: "$", SSP: "£", STD: "Db", STN: "Db", SVC: "$", SYP: "£", SZL: "L", THB: "฿", TJS: "SM",
        TMT: "T", TND: "د.ت", TOP: "T$", TRY: "₺", TTD: "TT$", TWD: "NT$", TZS: "TSh", UAH: "₴", UGX: "USh", USD: "$",
        UYU: "$U", UZS: "лв", VES: "Bs.S", VND: "₫", VUV: "VT", WST: "T", XAF: "FCFA", XAG: "oz", XAU: "oz", XCD: "$",
        XDR: "SDR", XOF: "CFA", XPD: "oz", XPF: "₣", XPT: "oz", YER: "﷼", ZAR: "R", ZMW: "ZK", ZWL: "$"
    };

    // 2. Prepare Currency Data for Custom Dropdown
    const currencyData = currencyCodes.map(code => {
        const symbol = currencySymbols[code];
        const label = symbol ? `${code} (${symbol})` : code;
        return { code, label, symbol };
    });

    // Initial Display Label
    const initialSymbol = currencySymbols[currency];
    const initialLabel = initialSymbol ? `${currency} (${initialSymbol})` : currency;

    // HTML Structure
    const dateObj = new Date(lastUpdated);
    const dateString = dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    const container = document.createElement('div');
    container.setAttribute('data-darkreader-ignore', 'true');
    container.classList.add('bdt-box');
    
    container.innerHTML = `
        <div class="header" id="drag-handle">
            <h3>Price Actually BDT</h3>
            <div class="header-actions">
                <button class="icon-btn" id="btn-settings" title="Settings">${ICONS.settings}</button>
                <button class="icon-btn trash-btn" id="btn-delete-all" title="Close All">${ICONS.trash}</button>
                <button class="icon-btn close-btn" id="btn-close" title="Close">${ICONS.close}</button>
            </div>
        </div>
        
        <div id="view-main" class="view-main">
            <div class="row">
                <label>Price</label>
                <input type="number" id="inp-amount" value="${amount}">
            </div>

            <div class="row">
                <label>Currency</label>
                <div class="currency-wrapper">
                    <input type="hidden" id="inp-currency" value="${currency}">
                    <input type="text" id="inp-currency-search" class="curr-input" value="${initialLabel}" placeholder="Search..." autocomplete="off">
                    <div id="currency-list" class="currency-list">
                        <!-- Populated by JS -->
                    </div>
                </div>
            </div>

            <div class="row">
                <label>Tax (%)</label>
                <input type="number" id="inp-tax" value="${currentSettings.defaultTax}">
            </div>

            <div class="result-box">
                <span class="total-label">Total Estimate</span>
                <span class="total-amount" id="res-total">...</span>
                <div class="breakdown">
                    Base: <span id="res-base">0</span> + Tax: <span id="res-tax">0</span>
                </div>
            </div>

            <div class="meta">
                <div id="res-rate">Rate: ...</div>
                <div>Updated: ${dateString}</div>
            </div>
        </div>

        <div id="view-settings" class="view-settings">
            <div class="settings-title">Extension Settings</div>
            
            <div class="setting-item">
                <label for="set-persistent">Persistent Popup <br><small style="color:#888">(Don't close on click outside)</small></label>
                <label class="switch">
                    <input type="checkbox" id="set-persistent" ${currentSettings.persistent ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>

            <div class="setting-item">
                <label for="set-single">Single Instance <br><small style="color:#888">(Close others when opening new)</small></label>
                <label class="switch">
                    <input type="checkbox" id="set-single" ${currentSettings.singleInstance ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>

            <div class="setting-item">
                <label for="set-def-tax">Default VAT (%)</label>
                <input type="number" id="set-def-tax" value="${currentSettings.defaultTax}" style="max-width: 60px;">
            </div>

            <button class="btn-save" id="btn-save-settings">Save & Close</button>
        </div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(container);
    document.body.appendChild(shadowHost);

    // ============================
    // LOGIC
    // ============================
    const box = container; 
    
    // 1. Dragging
    const header = shadow.getElementById('drag-handle');
    let isDragging = false, startX, startY;

    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return; 
        e.preventDefault();
        isDragging = true;
        const rect = box.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
        box.style.bottom = 'auto'; box.style.right = 'auto';
        box.style.left = rect.left + 'px'; box.style.top = rect.top + 'px';
        box.style.animation = 'none';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
        if (!isDragging) return;
        box.style.left = (e.clientX - startX) + 'px';
        box.style.top = (e.clientY - startY) + 'px';
    }

    function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    // 2. Button Handlers
    const viewMain = shadow.getElementById('view-main');
    const viewSettings = shadow.getElementById('view-settings');
    const btnSettings = shadow.getElementById('btn-settings');
    const btnClose = shadow.getElementById('btn-close');
    const btnDeleteAll = shadow.getElementById('btn-delete-all');
    const btnSave = shadow.getElementById('btn-save-settings');

    const checkPersistent = shadow.getElementById('set-persistent');
    const checkSingle = shadow.getElementById('set-single');

    checkSingle.addEventListener('change', (e) => {
        if (!e.target.checked) {
            checkPersistent.checked = true;
        } 
    });

    btnSettings.onclick = () => {
        if (viewMain.style.display !== 'none') {
            viewMain.style.display = 'none';
            viewSettings.style.display = 'block';
            btnSettings.style.background = '#e0e0e0';
        } else {
            viewMain.style.display = 'block';
            viewSettings.style.display = 'none';
            btnSettings.style.background = 'none';
        }
    };

    btnClose.onclick = () => {
        shadowHost.remove();
    };

    btnDeleteAll.onclick = () => {
        const allHosts = document.querySelectorAll('.price-actually-bdt-host');
        allHosts.forEach(el => el.remove());
    };

    btnSave.onclick = () => {
        const newSettings = {
            persistent: checkPersistent.checked,
            singleInstance: checkSingle.checked,
            defaultTax: parseFloat(shadow.getElementById('set-def-tax').value) || 0
        };

        chrome.storage.local.set({ userSettings: newSettings }, () => {
            currentSettings = newSettings;
            shadow.getElementById('inp-tax').value = currentSettings.defaultTax;
            updateCalculation(); 
            viewMain.style.display = 'block';
            viewSettings.style.display = 'none';
            btnSettings.style.background = 'none';
        });
    };

    setTimeout(() => {
        document.addEventListener('click', closeOnClickOutside);
    }, 100);

    function closeOnClickOutside(e) {
        if (currentSettings.persistent) return;
        if (shadowHost && document.body.contains(shadowHost) && e.target !== shadowHost) {
            shadowHost.remove();
        }
    }

    const inputs = shadow.querySelectorAll('input:not(#inp-currency-search), select');
    inputs.forEach(input => input.addEventListener('input', updateCalculation));

    // ============================
    // SEARCHABLE DROPDOWN LOGIC
    // ============================
    const searchInp = shadow.getElementById('inp-currency-search');
    const currencyInp = shadow.getElementById('inp-currency');
    const listEl = shadow.getElementById('currency-list');
    let isDropdownOpen = false;

    // Render List Function
    function renderCurrencyList(filterText = '') {
        const filter = filterText.toLowerCase();
        listEl.innerHTML = '';
        
        const filtered = currencyData.filter(c => 
            c.code.toLowerCase().includes(filter) || 
            (c.symbol && c.symbol.toLowerCase().includes(filter))
        );

        if (filtered.length === 0) {
            const noRes = document.createElement('div');
            noRes.textContent = "No currency found";
            noRes.style.padding = "8px 12px";
            noRes.style.color = "#999";
            noRes.style.fontSize = "12px";
            noRes.style.textAlign = "center";
            listEl.appendChild(noRes);
        } else {
            filtered.forEach(c => {
                const item = document.createElement('div');
                item.className = 'currency-item';
                if (c.code === currencyInp.value) item.classList.add('active');
                
                // Content: "Code (Symbol)" or just "Code"
                const symbolText = c.symbol ? `<small>(${c.symbol})</small>` : '';
                item.innerHTML = `${symbolText} ${c.code}`;
                
                item.onclick = () => {
                    selectCurrency(c);
                };
                listEl.appendChild(item);
            });
        }
    }

    function selectCurrency(cObj) {
        currencyInp.value = cObj.code;
        searchInp.value = cObj.label;
        closeDropdown();
        updateCalculation(); // Trigger recalc
    }

    function openDropdown() {
        renderCurrencyList(''); // Show all on open
        listEl.style.display = 'block';
        isDropdownOpen = true;
        
        // Auto scroll to selected
        setTimeout(() => {
            const active = listEl.querySelector('.active');
            if (active) active.scrollIntoView({ block: 'nearest' });
        }, 0);
    }

    function closeDropdown() {
        // If user left raw text that matches nothing perfectly, revert? 
        // Or cleaner: Revert visual to currently selected hidden value
        const currentCode = currencyInp.value;
        const currentObj = currencyData.find(c => c.code === currentCode);
        if (currentObj) searchInp.value = currentObj.label;

        listEl.style.display = 'none';
        isDropdownOpen = false;
    }

    // Event Listeners for Search Input
    
    // 1. Focus/Click -> Open
    searchInp.addEventListener('focus', () => {
        searchInp.select(); // Select all text for easy replacement
        openDropdown();
    });
    searchInp.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent bubble causing immediate close
        if (!isDropdownOpen) openDropdown();
    });

    // 2. Input -> Filter
    searchInp.addEventListener('input', (e) => {
        if (!isDropdownOpen) {
            listEl.style.display = 'block';
            isDropdownOpen = true;
        }
        renderCurrencyList(e.target.value);
    });

    // 3. Click Outside -> Close
    document.addEventListener('click', (e) => {
        // We need to check if click target is inside our shadow DOM wrapper
        // Since we are in shadow DOM, 'e.target' might be the host. 
        // But we added listener to document. 
        // Use a clearer scoped listener?
    });
    // Actually, stick to shadow root click listener for local events
    shadow.addEventListener('click', (e) => {
        if (!searchInp.contains(e.target) && !listEl.contains(e.target)) {
            if (isDropdownOpen) closeDropdown();
        }
    });
    // Document listener for clicks outside component entirely
    window.addEventListener('click', (e) => {
       // logic already handled mostly by persistent check, but for dropdown:
       // The dropdown is inside the shadow DOM. A click outside the shadow host triggers document click.
       // We can just rely on the fact that if the popup closes, the dropdown dies.
       // But if persistent is ON, we still want dropdown to close if clicking elsewhere in the page.
       // This is tricky from inside. Simplest is: if the focus leaves the input, we close lightly?
    });

    // Handle blur - delay to allow item click
    searchInp.addEventListener('blur', () => {
        setTimeout(() => {
            if (isDropdownOpen) closeDropdown();
        }, 200);
    });

    updateCalculation();

    function updateCalculation() {
        const amt = parseFloat(shadow.getElementById('inp-amount').value) || 0;
        const taxRate = parseFloat(shadow.getElementById('inp-tax').value) || 0;
        const selectedCurr = shadow.getElementById('inp-currency').value;

        if (!rates || !rates.BDT) return;

        const rateToUsd = (selectedCurr === 'USD') ? 1 : (1 / rates[selectedCurr]); 
        const bdtRate = rates.BDT;
        const effectiveRate = rateToUsd * bdtRate;

        const totalBdtNoTax = amt * effectiveRate;
        const taxAmount = totalBdtNoTax * (taxRate / 100);
        const totalBdt = totalBdtNoTax + taxAmount;

        const formatMoney = (num) => {
            return num.toLocaleString('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 2 });
        };

        shadow.getElementById('res-total').textContent = formatMoney(totalBdt);
        shadow.getElementById('res-base').textContent = totalBdtNoTax.toLocaleString('en-BD', { maximumFractionDigits: 0 });
        shadow.getElementById('res-tax').textContent = taxAmount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        shadow.getElementById('res-rate').textContent = `1 ${selectedCurr} = ${effectiveRate.toFixed(2)} BDT`;
    }

    function parseSelection(text) {
        if (!text) return { amount: 0, currency: 'USD' };
        const numberMatch = text.match(/[\d,.]+/);
        const amount = numberMatch ? parseFloat(numberMatch[0].replace(/,/g, '')) : 0;
        
        let currency = 'USD';
        // Expanded Currency Detection for common symbols
        if (text.includes('€')) currency = 'EUR';
        if (text.includes('£')) currency = 'GBP';
        if (text.includes('₹') || text.includes('Rs')) currency = 'INR';
        if (text.includes('¥')) currency = 'JPY';
        if (text.includes('RM')) currency = 'MYR';
        if (text.includes('﷼')) currency = 'SAR';
        if (text.includes('د.إ')) currency = 'AED';
        if (text.includes('C$')) currency = 'CAD';
        if (text.includes('A$')) currency = 'AUD';
        if (text.includes('৳') || text.includes('Tk')) currency = 'BDT';

        // Check if detected currency exists in rates, otherwise default to USD
        if (rates && !rates[currency]) {
            currency = 'USD';
        }

        return { amount, currency };
    }
}