let rates = null;
let lastUpdated = null;
let shadowHost = null; // We keep track of the host element

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "open_converter") {
        rates = request.rates;
        lastUpdated = request.timestamp;
        createPopup(request.selection);
    }
});

function createPopup(selectedText) {
    // 1. Cleanup existing popup
    if (shadowHost) shadowHost.remove();

    // 2. Logic (Defaults to 0 if no text)
    const { amount, currency } = parseSelection(selectedText);

    // 3. Create Shadow Host (The shield against outside styles)
    shadowHost = document.createElement('div');
    shadowHost.id = 'price-actually-bdt-host';
    
    // Attach Shadow DOM
    const shadow = shadowHost.attachShadow({ mode: 'open' });

    // 4. Define CSS INSIDE the Shadow DOM
    // This ensures NO dark mode extension or page CSS can break it.
    const style = document.createElement('style');
    style.textContent = `
        :host {
            all: initial; /* Reset everything */
            font-family: 'Segoe UI', sans-serif;
        }
        #bdt-box {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 280px;
            background: #ffffff;
            color: #333333;
            z-index: 2147483647;
            border-radius: 12px;
            box-shadow: 0 4px 25px rgba(0,0,0,0.2);
            border: 1px solid #ddd;
            padding: 16px;
            box-sizing: border-box;
            text-align: left;
            animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .header {
            display: flex; justify-content: space-between; align-items: center;
            border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 15px;
        }
        h3 { margin: 0; font-size: 16px; font-weight: 700; color: #444; }
        .close-btn {
            cursor: pointer; font-size: 20px; color: #aaa; background: none; border: none; padding: 0; line-height: 1;
        }
        .close-btn:hover { color: #d32f2f; }
        .row { margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
        label { font-size: 13px; font-weight: 600; color: #666; flex: 0 0 80px; }
        input, select {
            padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px;
            flex: 1; font-size: 13px; max-width: 140px; background: white; color: #333;
        }
        input { text-align: right; }
        select { text-align: right; padding-right: 25px; cursor: pointer; }
        .result-box {
            background: #f1f8e9; border: 1px solid #c8e6c9; border-radius: 8px;
            padding: 15px; margin-top: 15px; text-align: center;
        }
        .total-label { font-size: 11px; color: #558b2f; text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 5px; }
        .total-amount { font-size: 26px; font-weight: 800; color: #2e7d32; display: block; line-height: 1.2; }
        .breakdown { font-size: 11px; color: #666; margin-top: 8px; }
        .meta { margin-top: 12px; font-size: 10px; color: #999; display: flex; justify-content: space-between; border-top: 1px solid #f5f5f5; padding-top: 8px; }
    `;

    // 5. Build HTML
    const dateObj = new Date(lastUpdated);
    const dateString = dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    const container = document.createElement('div');
    container.id = 'bdt-box';
    container.innerHTML = `
        <div class="header">
            <h3>Price Actually in BDT</h3>
            <button class="close-btn">&times;</button>
        </div>
        
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
            </select>
        </div>

        <div class="row">
            <label>Tax (%)</label>
            <input type="number" id="inp-tax" value="15">
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
    `;

    // Attach to Shadow
    shadow.appendChild(style);
    shadow.appendChild(container);
    document.body.appendChild(shadowHost);

    // 6. Logic & Listeners (Query inside 'shadow', NOT 'document')
    
    // Close Button
    shadow.querySelector('.close-btn').onclick = () => {
        shadowHost.remove();
        shadowHost = null;
    };

    // Click Outside Logic
    setTimeout(() => {
        document.addEventListener('click', closeOnClickOutside);
    }, 100);

    function closeOnClickOutside(e) {
        // e.target is the element clicked on the main page.
        // If the click is NOT on our host element, close it.
        if (shadowHost && e.target !== shadowHost) {
            shadowHost.remove();
            shadowHost = null;
            document.removeEventListener('click', closeOnClickOutside);
        }
    }

    // Calculation Logic
    const inputs = shadow.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('input', updateCalculation);
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
            return num.toLocaleString('en-BD', { 
                style: 'currency', 
                currency: 'BDT',
                minimumFractionDigits: 2 
            });
        };

        shadow.getElementById('res-total').textContent = formatMoney(totalBdt);
        shadow.getElementById('res-base').textContent = totalBdtNoTax.toLocaleString('en-BD', { maximumFractionDigits: 0 });
        shadow.getElementById('res-tax').textContent = taxAmount.toLocaleString('en-BD', { maximumFractionDigits: 0 });
        shadow.getElementById('res-rate').textContent = `1 ${selectedCurr} = ${effectiveRate.toFixed(2)} BDT`;
    }
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