let rates = null;
let lastUpdated = null;

// Default Settings
let currentSettings = {
    persistent: false,     // false = close on click outside
    singleInstance: true,  // true = only one popup at a time
    defaultTax: 15         // default tax %
};

// SVG Icons (Inline)
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
    // 1. Load Settings
    const data = await chrome.storage.local.get(['userSettings']);
    if (data.userSettings) {
        currentSettings = { ...currentSettings, ...data.userSettings };
    }

    // 2. Handle Single Instance Rule
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
    
    const shadow = shadowHost.attachShadow({ mode: 'open' });

    // CSS
    const style = document.createElement('style');
    style.textContent = `
        :host { all: initial; font-family: 'Segoe UI', sans-serif; }
        .bdt-box {
            position: fixed;
            bottom: 20px; right: 20px;
            width: 280px;
            background: #ffffff; color: #333;
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
        
        /* Header */
        .header {
            display: flex; justify-content: space-between; align-items: center;
            border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 15px;
            cursor: move; user-select: none;
        }
        h3 { margin: 0; font-size: 16px; font-weight: 700; color: #444; pointer-events: none; }
        .header-actions { display: flex; gap: 8px; align-items: center; }
        
        /* Buttons */
        .icon-btn {
            cursor: pointer; color: #aaa; background: none; border: none; padding: 4px; 
            display: flex; align-items: center; justify-content: center;
            border-radius: 4px; transition: 0.2s;
        }
        .icon-btn:hover { color: #555; background: #f5f5f5; }
        .close-btn:hover { color: #d32f2f; background: #ffebee; }
        .trash-btn:hover { color: #d32f2f; background: #ffebee; }

        /* Main View */
        .view-main { display: block; }
        .view-settings { display: none; }

        /* Rows */
        .row { margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
        label { font-size: 13px; font-weight: 600; color: #666; flex: 0 0 80px; }
        input, select {
            padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px;
            flex: 1; font-size: 13px; max-width: 140px; background: white; color: #333;
        }
        input { text-align: right; }
        select { text-align: right; padding-right: 25px; cursor: pointer; }

        /* Result */
        .result-box {
            background: #f1f8e9; border: 1px solid #c8e6c9; border-radius: 8px;
            padding: 15px; margin-top: 15px; text-align: center;
        }
        .total-label { font-size: 11px; color: #558b2f; text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 5px; }
        .total-amount { font-size: 26px; font-weight: 800; color: #2e7d32; display: block; line-height: 1.2; }
        .breakdown { font-size: 11px; color: #666; margin-top: 8px; }
        .meta { margin-top: 12px; font-size: 10px; color: #999; display: flex; justify-content: space-between; border-top: 1px solid #f5f5f5; padding-top: 8px; }

        /* Settings View Styles */
        .settings-title { font-size: 14px; font-weight: bold; margin-bottom: 15px; color: #333; }
        .setting-item { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .setting-item label { font-weight: normal; flex: initial; cursor: pointer; }
        
        /* Toggle Switch Fix: Prevent Flex Stretch */
        .switch { 
            position: relative; display: inline-block; width: 34px; height: 20px; 
            /* FIX: Prevents oval stretching */
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

    // HTML Structure
    const dateObj = new Date(lastUpdated);
    const dateString = dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    const container = document.createElement('div');
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
                <select id="inp-currency">
                    <option value="USD" ${currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                    <option value="EUR" ${currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                    <option value="GBP" ${currency === 'GBP' ? 'selected' : ''}>GBP (£)</option>
                    <option value="INR" ${currency === 'INR' ? 'selected' : ''}>INR (₹)</option>
                    <option value="SAR" ${currency === 'SAR' ? 'selected' : ''}>SAR (﷼)</option>
                    <option value="AED" ${currency === 'AED' ? 'selected' : ''}>AED (د.إ)</option>
                    <option value="MYR" ${currency === 'MYR' ? 'selected' : ''}>MYR (RM)</option>
                    <option value="CAD" ${currency === 'CAD' ? 'selected' : ''}>CAD (C$)</option>
                    <option value="AUD" ${currency === 'AUD' ? 'selected' : ''}>AUD (A$)</option>
                    <option value="JPY" ${currency === 'JPY' ? 'selected' : ''}>JPY (¥)</option>
                    <option value="CNY" ${currency === 'CNY' ? 'selected' : ''}>CNY (¥)</option>
                </select>
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
    const btnDeleteAll = shadow.getElementById('btn-delete-all'); // New Button
    const btnSave = shadow.getElementById('btn-save-settings');

    const checkPersistent = shadow.getElementById('set-persistent');
    const checkSingle = shadow.getElementById('set-single');

    // === NEW LOGIC: Enforce Relationship ===
    checkSingle.addEventListener('change', (e) => {
        if (!e.target.checked) {
            // If Single Instance is turned OFF (Multi-mode), Force Persistent ON
            checkPersistent.checked = true;
            // Optional: You could disable checkPersistent here to prevent unchecking
            // checkPersistent.disabled = true; 
        } else {
            // If Single Instance turned ON, user is free to toggle Persistent
            // checkPersistent.disabled = false;
        }
    });

    // Toggle Settings View
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

    // Close Popup (This instance only)
    btnClose.onclick = () => {
        shadowHost.remove();
    };

    // Delete All Popups (Global Cleanup)
    btnDeleteAll.onclick = () => {
        const allHosts = document.querySelectorAll('.price-actually-bdt-host');
        allHosts.forEach(el => el.remove());
    };

    // Save Settings
    btnSave.onclick = () => {
        const newSettings = {
            persistent: checkPersistent.checked,
            singleInstance: checkSingle.checked,
            defaultTax: parseFloat(shadow.getElementById('set-def-tax').value) || 0
        };

        // Save to Chrome
        chrome.storage.local.set({ userSettings: newSettings }, () => {
            currentSettings = newSettings;
            
            // Apply new Tax immediately
            shadow.getElementById('inp-tax').value = currentSettings.defaultTax;
            updateCalculation(); 

            // Go back to main view
            viewMain.style.display = 'block';
            viewSettings.style.display = 'none';
            btnSettings.style.background = 'none';
        });
    };

    // 3. Click Outside Logic
    setTimeout(() => {
        document.addEventListener('click', closeOnClickOutside);
    }, 100);

    function closeOnClickOutside(e) {
        if (currentSettings.persistent) return;

        if (shadowHost && document.body.contains(shadowHost) && e.target !== shadowHost) {
            shadowHost.remove();
        }
    }

    // 4. Calculation Logic
    const inputs = shadow.querySelectorAll('input, select');
    inputs.forEach(input => input.addEventListener('input', updateCalculation));
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
        shadow.getElementById('res-tax').textContent = taxAmount.toLocaleString('en-BD', { maximumFractionDigits: 0 });
        shadow.getElementById('res-rate').textContent = `1 ${selectedCurr} = ${effectiveRate.toFixed(2)} BDT`;
    }

    function parseSelection(text) {
        if (!text) return { amount: 0, currency: 'USD' };
        const numberMatch = text.match(/[\d,.]+/);
        const amount = numberMatch ? parseFloat(numberMatch[0].replace(/,/g, '')) : 0;
        let currency = 'USD';
        if (text.includes('€')) currency = 'EUR';
        if (text.includes('£')) currency = 'GBP';
        if (text.includes('₹') || text.includes('Rs')) currency = 'INR';
        if (text.includes('¥')) currency = 'JPY';
        if (text.includes('RM')) currency = 'MYR';
        if (text.includes('﷼')) currency = 'SAR';
        if (text.includes('د.إ')) currency = 'AED';
        return { amount, currency };
    }
}