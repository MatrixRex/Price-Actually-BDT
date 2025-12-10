// 1. On Install/Update: Create Menu AND Inject Scripts
chrome.runtime.onInstalled.addListener(async () => {
    // Create the menu item
    chrome.contextMenus.create({
        id: "convert-to-bdt",
        title: "Price Actually in BDT: Convert '%s'",
        contexts: ["selection"]
    });

    // === NEW: Auto-Inject into existing tabs ===
    // Find all tabs that are http or https (skips chrome:// settings pages)
    const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });

    for (const tab of tabs) {
        try {
            // Inject the logic
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["content.js"]
            });
            // Inject the style
            await chrome.scripting.insertCSS({
                target: { tabId: tab.id },
                files: ["styles.css"]
            });
        } catch (err) {
            // Some tabs (like Chrome Web Store) block scripting. We ignore those errors.
            // console.log('Could not inject into tab', tab.id);
        }
    }
});

// Helper: Fetch Rates
async function getRates() {
    const CACHE_KEY = 'currency_rates';
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 Hours

    const data = await chrome.storage.local.get([CACHE_KEY]);
    
    if (data[CACHE_KEY] && (Date.now() - data[CACHE_KEY].timestamp < CACHE_DURATION)) {
        return data[CACHE_KEY]; 
    }

    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const json = await response.json();
        
        const cacheData = {
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

// 2. Handle Right-Click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "convert-to-bdt") {
        const data = await getRates();
        
        if (data) {
            // === NEW: Graceful Error Handling ===
            try {
                // Try to send the message
                await chrome.tabs.sendMessage(tab.id, {
                    action: "open_converter",
                    selection: info.selectionText,
                    rates: data.rates,
                    timestamp: data.timestamp
                });
            } catch (error) {
                // If it fails (script missing), alert the user
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        alert("Please refresh this page to use the BDT Converter.");
                    }
                });
            }
        }
    }
});