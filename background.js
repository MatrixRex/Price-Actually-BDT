// 1. On Install: Context Menu & Auto-Inject
chrome.runtime.onInstalled.addListener(async () => {
    chrome.contextMenus.create({
        id: "convert-to-bdt",
        title: "Price Actually in BDT", // Simplified title since it works on page too
        contexts: ["selection", "page"] // <--- ADDED "page"
    });

    // Auto-inject logic (same as before)
    const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
    for (const tab of tabs) {
        try {
            await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
        } catch (err) {}
    }
});

// Helper: Fetch Rates (Same as before)
async function getRates() {
    const CACHE_KEY = 'currency_rates';
    const CACHE_DURATION = 24 * 60 * 60 * 1000; 

    const data = await chrome.storage.local.get([CACHE_KEY]);
    if (data[CACHE_KEY] && (Date.now() - data[CACHE_KEY].timestamp < CACHE_DURATION)) {
        return data[CACHE_KEY]; 
    }

    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const json = await response.json();
        const cacheData = { timestamp: (json.time_last_updated * 1000) || Date.now(), rates: json.rates };
        await chrome.storage.local.set({ [CACHE_KEY]: cacheData });
        return cacheData;
    } catch (error) { return null; }
}

// 2. Handle Click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "convert-to-bdt") {
        const data = await getRates();
        if (data) {
            try {
                await chrome.tabs.sendMessage(tab.id, {
                    action: "open_converter",
                    selection: info.selectionText || "0", // <--- Handle undefined selection
                    rates: data.rates,
                    timestamp: data.timestamp
                });
            } catch (error) {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => alert("Please refresh this page to use the BDT Converter.")
                });
            }
        }
    }
});