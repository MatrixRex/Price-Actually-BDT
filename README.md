# Price Actually BDT

**Price Actually BDT** is a lightweight Chrome Extension that allows you to instantly convert selected prices on any webpage into Bangladeshi Taka (BDT). It helps you estimate the actual cost of an item by including a configurable tax/VAT percentage.

![alt text](images/showcase.jpg)

## Features

*   **Instant Conversion:** Select any price on a webpage, right-click, and choose "Price Actually in BDT: Convert..." to see the converted price.
*   **Real-time Exchange Rates:** Uses live currency rates fetched from the ExchangeRate API.
*   **Smart Parsing:** Automatically detects the currency symbol (€, £, ₹, ¥) from the selected text, defaulting to USD if none is found.
*   **Tax/VAT Calculator:** Includes an adjustable tax field (defaulting to 15%).
*   **Detailed Breakdown:** Shows the base price in BDT separate from the calculated tax amount.
*   **Caching:** Caches exchange rates locally for 24 hours to minimize API calls and ensure speed.
*   **Supported Currencies:** USD, EUR, GBP, INR, JPY, SAR, AED, MYR, CAD, AUD, CNY.

## Installation

Since this extension is currently in development/local mode, you can install it using the "Load Unpacked" method:

1.  **Download** from [Latest Release](https://github.com/MatrixRex/Price-Actually-BDT/releases/latest). **Unzip** it.
2.  Open Google Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** by toggling the switch in the top-right corner.
4.  Click the **Load unpacked** button that appears.
5.  Select the folder containing this project (the folder with the `manifest.json` file).
6.  The extension should now appear in your list and is ready to use!
7. **Refresh** page before using the extension.
8. **Do not delete** the unzipped extension folder after installation.

## How to Use

1.  **Highlight a price** on any website (e.g., "$199" or "€50").
2.  **Right-click** the highlighted text.
3.  Select **Price Actually in BDT: Convert...** from the context menu.
4.  A popup will appear in the bottom-right corner of the page showing:
    *   The converted total in BDT.
    *   Fields to adjust the original amount, currency, or tax rate.
    *   A breakdown of the base cost vs. tax.

## Technical Details

*   **Manifest V3:** Built using the latest Chrome Extension manifest version.
*   **Permissions:**
    *   `contextMenus`: To add the right-click option.
    *   `storage`: To cache exchange rates locally.
    *   `activeTab` / `content_scripts`: To inject the standard converter UI into the current page.
*   **API:** Uses [ExchangeRate-API](https://www.exchangerate-api.com/) for exchange rates (Base: USD).

## File Structure

*   `manifest.json`: Configuration file defining the extension's settings and permissions.
*   `background.js`: Handles the context menu events and fetches/caches exchange rates.
*   `content.js`: Handles the logic for parsing the selected text and rendering the popup UI on the page.
*   `styles.css`: Styling for the injected popup component.
