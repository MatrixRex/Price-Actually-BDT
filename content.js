let rates = null;
let lastUpdated = null;
let activePopup = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "open_converter") {
        rates = request.rates;
        lastUpdated = request.timestamp;
        createPopup(request.selection);
    }
});

function createPopup(selectedText) {
    if (activePopup) activePopup.remove();

    const { amount, currency } = parseSelection(selectedText);

    const box = document.createElement('div');
    box.id = 'bdt-converter-box';

    // Format the timestamp to readable time
    const dateObj = new Date(lastUpdated);
    const dateString = dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    box.innerHTML = `
        <div id="bdt-converter-header">
            <h3>Price Actually in BDT</h3>
            <button id="bdt-converter-close">&times;</button>
        </div>
        
        <div class="bdt-row">
            <label>Price</label>
            <input type="number" id="bdt-input-amount" value="${amount}">
        </div>

        <div class="bdt-row">
            <label>Currency</label>
            <select id="bdt-select-currency">
                <option value="USD" ${currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                <option value="EUR" ${currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                <option value="GBP" ${currency === 'GBP' ? 'selected' : ''}>GBP (£)</option>
                <option value="INR" ${currency === 'INR' ? 'selected' : ''}>INR (₹)</option>
                <option value="JPY" ${currency === 'JPY' ? 'selected' : ''}>JPY (¥)</option>
            </select>
        </div>

        <div class="bdt-row">
            <label>Tax (%)</label>
            <input type="number" id="bdt-input-tax" value="15">
        </div>

        <div class="bdt-result-container">
            <span class="bdt-total-label">Total Estimate</span>
            <span id="bdt-result">...</span>
            <div class="bdt-breakdown">
                Base: <span id="base-bdt">0</span> + Tax: <span id="tax-bdt">0</span>
            </div>
        </div>

        <div class="bdt-meta-info">
            <div id="bdt-rate-display">Rate: ...</div>
            <div id="bdt-time-display">Updated: ${dateString}</div>
        </div>
    `;

    document.body.appendChild(box);
    activePopup = box;

    // Events
    document.getElementById('bdt-converter-close').onclick = () => {
        box.remove();
        activePopup = null;
    };

    setTimeout(() => {
        document.addEventListener('click', closeOnClickOutside);
    }, 100);

    function closeOnClickOutside(e) {
        if (activePopup && !activePopup.contains(e.target)) {
            activePopup.remove();
            activePopup = null;
            document.removeEventListener('click', closeOnClickOutside);
        }
    }

    const inputs = box.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('input', updateCalculation);
    });

    updateCalculation();

    function updateCalculation() {
        const amt = parseFloat(document.getElementById('bdt-input-amount').value) || 0;
        const taxRate = parseFloat(document.getElementById('bdt-input-tax').value) || 0;
        const selectedCurr = document.getElementById('bdt-select-currency').value;

        if (!rates || !rates.BDT) return;

        // 1. Get Exchange Rate
        // Note: Frankfurter base is USD in our call. 
        // If user selects USD, rate is rates.BDT.
        // If user selects EUR, we need cross rate (1 EUR -> USD -> BDT).
        
        let conversionRate = 0;
        
        // Simple logic since our base is USD
        const rateToUsd = (selectedCurr === 'USD') ? 1 : (1 / rates[selectedCurr]); 
        const bdtRate = rates.BDT;
        
        // Effective Rate: 1 Unit of Selected = X BDT
        const effectiveRate = rateToUsd * bdtRate;

        // 2. Math
        const totalBdtNoTax = amt * effectiveRate;
        const taxAmount = totalBdtNoTax * (taxRate / 100);
        const totalBdt = totalBdtNoTax + taxAmount;

        // 3. UI Updates
        const formatMoney = (num) => {
            return num.toLocaleString('en-BD', { 
                style: 'currency', 
                currency: 'BDT',
                minimumFractionDigits: 2 
            });
        };

        document.getElementById('bdt-result').textContent = formatMoney(totalBdt);
        document.getElementById('base-bdt').textContent = totalBdtNoTax.toLocaleString('en-BD', { maximumFractionDigits: 0 });
        document.getElementById('tax-bdt').textContent = taxAmount.toLocaleString('en-BD', { maximumFractionDigits: 0 });
        
        // Update Rate Info
        document.getElementById('bdt-rate-display').textContent = `1 ${selectedCurr} = ${effectiveRate.toFixed(2)} BDT`;
    }

    function parseSelection(text) {
        const numberMatch = text.match(/[\d,.]+/);
        const amount = numberMatch ? parseFloat(numberMatch[0].replace(/,/g, '')) : 0;
        
        let currency = 'USD';
        if (text.includes('€')) currency = 'EUR';
        if (text.includes('£')) currency = 'GBP';
        if (text.includes('₹')) currency = 'INR';
        if (text.includes('¥')) currency = 'JPY';
        
        return { amount, currency };
    }
}