# Price Actually in BDT

[বাংলায় পড়ুন (Read in Bengali)](README.md)

[![Latest Release](https://img.shields.io/github/v/release/MatrixRex/Price-Actually-BDT?label=Download&color=2e7d32&logo=github)](https://github.com/MatrixRex/Price-Actually-BDT/releases/latest)

**Stop Googling "USD to BDT" and doing the tax math in your head.**

**Price Actually in BDT** is a Chrome Extension that instantly converts foreign prices into Bangladeshi Taka (BDT). It calculates the *real* cost (Current Rate + Bank Tax/VAT) via a right-click, so you know exactly how much will be deducted from your card.

![alt text](images/showcase.jpg)

## Features

### 🚀 Core Functionality
* **Context Aware:** Highlight any price (e.g., "$50") and right-click to convert instantly.
* **Anywhere Access:** Right-click anywhere on a page (even without selecting text) to open the tool with a default value of 0.
* **Smart Parsing:** Automatically detects currency symbols (€, £, ₹, ¥, ﷼, etc.) and formats numbers.
* **160+ Currencies:** Supports major currencies including USD, EUR, GBP, INR, SAR, AED, MYR, CAD, AUD, JPY, and CNY.

### 🎛️ UI & Usability
* **Draggable Interface:** Click and drag the header to move the popup anywhere on the screen.
* **Shadow DOM:** The UI is isolated from the webpage, meaning website styles won't break it, and Dark Mode extensions won't mess up the colors.
* **Auto-Inject:** Works immediately on already open tabs upon installation (no refresh needed).

### ⚙️ Customizable Settings
* **Persistent Mode:** Toggle to keep the popup open even when you click outside of it.
* **Multi-Instance Support:** Allow multiple calculators to be open on the screen at once (great for comparing prices).
* **Default Tax %:** Set your preferred VAT/Tax rate (defaults to 15%) so you don't have to type it every time.

## Installation

1.  **Download** the `.zip` file from the [Latest Release](https://github.com/MatrixRex/Price-Actually-BDT/releases/latest).
2.  **Unzip** the file into a folder.
3.  Open Google Chrome and navigate to `chrome://extensions/`.
4.  Enable **Developer mode** (toggle in the top-right corner).
5.  Click **Load unpacked**.
6.  Select the folder where you unzipped the extension.
7.  That's it! Right-click on any page to test it.

## How to Use

### Basic Conversion
1.  Highlight a price (e.g., **$199**).
2.  Right-click and select **Price Actually in BDT**.
3.  The popup shows the total BDT cost (Base Price + Tax).

### Using the Controls
* **⚙️ Settings:** Click the gear icon to toggle **Persistent Mode**, **Single Instance**, or change your **Default Tax**.
* **🗑️ Clear All:** Click the trash icon to instantly close all open popups on the screen.
* **Drag:** Click and hold the top header text to move the box.

## Technical Details

* **Manifest V3:** Built using the latest modern Chrome Extension standards.
* **Shadow DOM:** All CSS is injected programmatically into a Shadow Root, ensuring 100% style isolation from the host page.
* **No External CSS File:** Styles are embedded in `content.js` for cleaner distribution and encapsulation.
* **ExchangeRate-API:** Fetches daily rates (USD Base) and caches them locally for 24 hours to ensure speed and offline capability.
* **Permissions:**
    * `contextMenus`: For the right-click integration.
    * `storage`: To save user preferences and cache rates.
    * `scripting` & `host_permissions`: To inject the interface into tabs programmatically.

## File Structure

* `manifest.json`: Configuration and permissions.
* `background.js`: Handles context menu events, API fetching, and caching logic.
* `content.js`: The core logic. Contains the UI rendering, Shadow DOM creation, Drag-and-Drop logic, and Settings management.
* `images/`: Contains extension icons.
