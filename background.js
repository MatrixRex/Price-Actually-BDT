// On Install: Create the Context Menu
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "convert-to-bdt",
        title: "Price Actually in BDT: Convert '%s'",
        contexts: ["selection"]
    });
});

async function getRates() {
    const CACHE_KEY = 'currency_rates';
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 Hours

    const data = await chrome.storage.local.get([CACHE_KEY]);
    
    // Check if cache is valid
    if (data[CACHE_KEY] && (Date.now() - data[CACHE_KEY].timestamp < CACHE_DURATION)) {
        return data[CACHE_KEY]; 
    }

    try {
        // REVERTED TO EXCHANGERATE-API V4 (Better currency support)
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const json = await response.json();
        
        const cacheData = {
            // Use their server time if available, otherwise local time
            timestamp: (json.time_last_updated * 1000) || Date.now(),
            rates: json.rates
        };
        
        await chrome.storage.local.set({ [CACHE_KEY]: cacheData });
        return cacheData;
    } catch (error) {
        console.error("Rate fetch failed", error);
        return null; 
    }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "convert-to-bdt") {
        const data = await getRates();
        
        if (data) {
            chrome.tabs.sendMessage(tab.id, {
                action: "open_converter",
                selection: info.selectionText,
                rates: data.rates,
                timestamp: data.timestamp
            });
        }
    }
});