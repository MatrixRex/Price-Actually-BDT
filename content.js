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
    sum: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="9" x2="19" y2="9"></line><line x1="5" y1="15" x2="19" y2="15"></line></svg>`,
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
    
    // Currency Info Map (Codes, Symbols, Names, Countries)
    const currencyInfo = {
        AED: { symbol: "د.إ", name: "UAE Dirham", countries: ["United Arab Emirates"] },
        AFN: { symbol: "؋", name: "Afghan Afghani", countries: ["Afghanistan"] },
        ALL: { symbol: "L", name: "Albanian Lek", countries: ["Albania"] },
        AMD: { symbol: "֏", name: "Armenian Dram", countries: ["Armenia"] },
        ANG: { symbol: "ƒ", name: "Netherlands Antillean Guilder", countries: ["Curaçao", "Sint Maarten"] },
        AOA: { symbol: "Kz", name: "Angolan Kwanza", countries: ["Angola"] },
        ARS: { symbol: "$", name: "Argentine Peso", countries: ["Argentina"] },
        AUD: { symbol: "$", name: "Australian Dollar", countries: ["Australia", "Christmas Island", "Cocos (Keeling) Islands", "Heard Island and McDonald Islands", "Kiribati", "Nauru", "Norfolk Island", "Tuvalu"] },
        AWG: { symbol: "ƒ", name: "Aruban Florin", countries: ["Aruba"] },
        AZN: { symbol: "₼", name: "Azerbaijani Manat", countries: ["Azerbaijan"] },
        BAM: { symbol: "KM", name: "Bosnia-Herzegovina Convertible Mark", countries: ["Bosnia and Herzegovina"] },
        BBD: { symbol: "$", name: "Barbadian Dollar", countries: ["Barbados"] },
        BDT: { symbol: "৳", name: "Bangladeshi Taka", countries: ["Bangladesh"] },
        BGN: { symbol: "лв", name: "Bulgarian Lev", countries: ["Bulgaria"] },
        BHD: { symbol: ".د.ب", name: "Bahraini Dinar", countries: ["Bahrain"] },
        BIF: { symbol: "FBu", name: "Burundian Franc", countries: ["Burundi"] },
        BMD: { symbol: "$", name: "Bermudan Dollar", countries: ["Bermuda"] },
        BND: { symbol: "$", name: "Brunei Dollar", countries: ["Brunei"] },
        BOB: { symbol: "Bs.", name: "Bolivian Boliviano", countries: ["Bolivia"] },
        BRL: { symbol: "R$", name: "Brazilian Real", countries: ["Brazil"] },
        BSD: { symbol: "$", name: "Bahamian Dollar", countries: ["Bahamas"] },
        BTC: { symbol: "₿", name: "Bitcoin", countries: [] },
        BTN: { symbol: "Nu.", name: "Bhutanese Ngultrum", countries: ["Bhutan"] },
        BWP: { symbol: "P", name: "Botswanan Pula", countries: ["Botswana"] },
        BYN: { symbol: "Br", name: "Belarusian Ruble", countries: ["Belarus"] },
        BZD: { symbol: "BZ$", name: "Belize Dollar", countries: ["Belize"] },
        CAD: { symbol: "$", name: "Canadian Dollar", countries: ["Canada"] },
        CDF: { symbol: "FC", name: "Congolese Franc", countries: ["Democratic Republic of the Congo"] },
        CHF: { symbol: "Fr", name: "Swiss Franc", countries: ["Switzerland", "Liechtenstein"] },
        CLP: { symbol: "$", name: "Chilean Peso", countries: ["Chile"] },
        CNY: { symbol: "¥", name: "Chinese Yuan", countries: ["China"] },
        COP: { symbol: "$", name: "Colombian Peso", countries: ["Colombia"] },
        CRC: { symbol: "₡", name: "Costa Rican Colón", countries: ["Costa Rica"] },
        CUP: { symbol: "₱", name: "Cuban Peso", countries: ["Cuba"] },
        CVE: { symbol: "$", name: "Cape Verdean Escudo", countries: ["Cape Verde"] },
        CZK: { symbol: "Kč", name: "Czech Koruna", countries: ["Czech Republic"] },
        DJF: { symbol: "Fdj", name: "Djiboutian Franc", countries: ["Djibouti"] },
        DKK: { symbol: "kr", name: "Danish Krone", countries: ["Denmark", "Faroe Islands", "Greenland"] },
        DOP: { symbol: "RD$", name: "Dominican Peso", countries: ["Dominican Republic"] },
        DZD: { symbol: "د.ج", name: "Algerian Dinar", countries: ["Algeria"] },
        EGP: { symbol: "£", name: "Egyptian Pound", countries: ["Egypt"] },
        ERN: { symbol: "Nfk", name: "Eritrean Nakfa", countries: ["Eritrea"] },
        ETB: { symbol: "Br", name: "Ethiopian Birr", countries: ["Ethiopia"] },
        EUR: { symbol: "€", name: "Euro", countries: ["Andorra", "Austria", "Belgium", "Cyprus", "Estonia", "Finland", "France", "Germany", "Greece", "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", "Monaco", "Montenegro", "Netherlands", "Portugal", "San Marino", "Slovakia", "Slovenia", "Spain", "Vatican City"] },
        FJD: { symbol: "$", name: "Fijian Dollar", countries: ["Fiji"] },
        FKP: { symbol: "£", name: "Falkland Islands Pound", countries: ["Falkland Islands"] },
        GBP: { symbol: "£", name: "British Pound Sterling", countries: ["United Kingdom", "Isle of Man", "Jersey", "Guernsey"] },
        GEL: { symbol: "₾", name: "Georgian Lari", countries: ["Georgia"] },
        GHS: { symbol: "GH₵", name: "Ghanaian Cedi", countries: ["Ghana"] },
        GIP: { symbol: "£", name: "Gibraltar Pound", countries: ["Gibraltar"] },
        GMD: { symbol: "D", name: "Gambian Dalasi", countries: ["Gambia"] },
        GNF: { symbol: "FG", name: "Guinean Franc", countries: ["Guinea"] },
        GTQ: { symbol: "Q", name: "Guatemalan Quetzal", countries: ["Guatemala"] },
        GYD: { symbol: "$", name: "Guyanese Dollar", countries: ["Guyana"] },
        HKD: { symbol: "$", name: "Hong Kong Dollar", countries: ["Hong Kong"] },
        HNL: { symbol: "L", name: "Honduran Lempira", countries: ["Honduras"] },
        HRK: { symbol: "kn", name: "Croatian Kuna", countries: ["Croatia"] },
        HTG: { symbol: "G", name: "Haitian Gourde", countries: ["Haiti"] },
        HUF: { symbol: "Ft", name: "Hungarian Forint", countries: ["Hungary"] },
        IDR: { symbol: "Rp", name: "Indonesian Rupiah", countries: ["Indonesia"] },
        ILS: { symbol: "₪", name: "Israeli New Shekel", countries: ["Israel", "Palestine"] },
        INR: { symbol: "₹", name: "Indian Rupee", countries: ["India", "Bhutan"] },
        IQD: { symbol: "ع.د", name: "Iraqi Dinar", countries: ["Iraq"] },
        IRR: { symbol: "﷼", name: "Iranian Rial", countries: ["Iran"] },
        ISK: { symbol: "kr", name: "Icelandic Króna", countries: ["Iceland"] },
        JMD: { symbol: "J$", name: "Jamaican Dollar", countries: ["Jamaica"] },
        JOD: { symbol: "د.ا", name: "Jordanian Dinar", countries: ["Jordan"] },
        JPY: { symbol: "¥", name: "Japanese Yen", countries: ["Japan"] },
        KES: { symbol: "KSh", name: "Kenyan Shilling", countries: ["Kenya"] },
        KGS: { symbol: "с", name: "Kyrgystani Som", countries: ["Kyrgyzstan"] },
        KHR: { symbol: "៛", name: "Cambodian Riel", countries: ["Cambodia"] },
        KMF: { symbol: "CF", name: "Comorian Franc", countries: ["Comoros"] },
        KPW: { symbol: "₩", name: "North Korean Won", countries: ["North Korea"] },
        KRW: { symbol: "₩", name: "South Korean Won", countries: ["South Korea"] },
        KWD: { symbol: "د.ك", name: "Kuwaiti Dinar", countries: ["Kuwait"] },
        KYD: { symbol: "$", name: "Cayman Islands Dollar", countries: ["Cayman Islands"] },
        KZT: { symbol: "₸", name: "Kazakhstani Tenge", countries: ["Kazakhstan"] },
        LAK: { symbol: "₭", name: "Laotian Kip", countries: ["Laos"] },
        LBP: { symbol: "ل.ل", name: "Lebanese Pound", countries: ["Lebanon"] },
        LKR: { symbol: "₨", name: "Sri Lankan Rupee", countries: ["Sri Lanka"] },
        LRD: { symbol: "$", name: "Liberian Dollar", countries: ["Liberia"] },
        LSL: { symbol: "L", name: "Lesotho Loti", countries: ["Lesotho"] },
        LYD: { symbol: "ل.د", name: "Libyan Dinar", countries: ["Libya"] },
        MAD: { symbol: "د.م.", name: "Moroccan Dirham", countries: ["Morocco", "Western Sahara"] },
        MDL: { symbol: "L", name: "Moldovan Leu", countries: ["Moldova"] },
        MGA: { symbol: "Ar", name: "Malagasy Ariary", countries: ["Madagascar"] },
        MKD: { symbol: "ден", name: "Macedonian Denar", countries: ["North Macedonia"] },
        MMK: { symbol: "K", name: "Myanmar Kyat", countries: ["Myanmar"] },
        MNT: { symbol: "₮", name: "Mongolian Tugrik", countries: ["Mongolia"] },
        MOP: { symbol: "P", name: "Macanese Pataca", countries: ["Macau"] },
        MRU: { symbol: "UM", name: "Mauritanian Ouguiya", countries: ["Mauritania"] },
        MUR: { symbol: "₨", name: "Mauritian Rupee", countries: ["Mauritius"] },
        MVR: { symbol: "Rf", name: "Maldivian Rufiyaa", countries: ["Maldives"] },
        MWK: { symbol: "MK", name: "Malawian Kwacha", countries: ["Malawi"] },
        MXN: { symbol: "$", name: "Mexican Peso", countries: ["Mexico"] },
        MYR: { symbol: "RM", name: "Malaysian Ringgit", countries: ["Malaysia"] },
        MZN: { symbol: "MT", name: "Mozambican Metical", countries: ["Mozambique"] },
        NAD: { symbol: "$", name: "Namibian Dollar", countries: ["Namibia"] },
        NGN: { symbol: "₦", name: "Nigerian Naira", countries: ["Nigeria"] },
        NIO: { symbol: "C$", name: "Nicaraguan Córdoba", countries: ["Nicaragua"] },
        NOK: { symbol: "kr", name: "Norwegian Krone", countries: ["Norway", "Svalbard and Jan Mayen", "Bouvet Island"] },
        NPR: { symbol: "₨", name: "Nepalese Rupee", countries: ["Nepal"] },
        NZD: { symbol: "$", name: "New Zealand Dollar", countries: ["New Zealand", "Cook Islands", "Niue", "Pitcairn Islands", "Tokelau"] },
        OMR: { symbol: "ر.ع.", name: "Omani Rial", countries: ["Oman"] },
        PAB: { symbol: "B/.", name: "Panamanian Balboa", countries: ["Panama"] },
        PEN: { symbol: "S/", name: "Peruvian Sol", countries: ["Peru"] },
        PGK: { symbol: "K", name: "Papua New Guinean Kina", countries: ["Papua New Guinea"] },
        PHP: { symbol: "₱", name: "Philippine Peso", countries: ["Philippines"] },
        PKR: { symbol: "₨", name: "Pakistani Rupee", countries: ["Pakistan"] },
        PLN: { symbol: "zł", name: "Polish Złoty", countries: ["Poland"] },
        PYG: { symbol: "₲", name: "Paraguayan Guarani", countries: ["Paraguay"] },
        QAR: { symbol: "ر.ق", name: "Qatari Rial", countries: ["Qatar"] },
        RON: { symbol: "lei", name: "Romanian Leu", countries: ["Romania"] },
        RSD: { symbol: "дин.", name: "Serbian Dinar", countries: ["Serbia"] },
        RUB: { symbol: "₽", name: "Russian Ruble", countries: ["Russia"] },
        RWF: { symbol: "FRw", name: "Rwandan Franc", countries: ["Rwanda"] },
        SAR: { symbol: "﷼", name: "Saudi Riyal", countries: ["Saudi Arabia"] },
        SBD: { symbol: "$", name: "Solomon Islands Dollar", countries: ["Solomon Islands"] },
        SCR: { symbol: "₨", name: "Seychellois Rupee", countries: ["Seychelles"] },
        SDG: { symbol: "ج.س.", name: "Sudanese Pound", countries: ["Sudan"] },
        SEK: { symbol: "kr", name: "Swedish Krona", countries: ["Sweden"] },
        SGD: { symbol: "$", name: "Singapore Dollar", countries: ["Singapore"] },
        SHP: { symbol: "£", name: "Saint Helena Pound", countries: ["Saint Helena", "Ascension Island", "Tristan da Cunha"] },
        SLL: { symbol: "Le", name: "Sierra Leonean Leone", countries: ["Sierra Leone"] },
        SOS: { symbol: "S", name: "Somali Shilling", countries: ["Somalia"] },
        SRD: { symbol: "$", name: "Surinamese Dollar", countries: ["Suriname"] },
        SSP: { symbol: "£", name: "South Sudanese Pound", countries: ["South Sudan"] },
        STN: { symbol: "Db", name: "São Tomé and Príncipe Dobra", countries: ["São Tomé and Príncipe"] },
        SVC: { symbol: "$", name: "Salvadoran Colón", countries: ["El Salvador"] },
        SYP: { symbol: "£", name: "Syrian Pound", countries: ["Syria"] },
        SZL: { symbol: "L", name: "Swazi Lilangeni", countries: ["Eswatini"] },
        THB: { symbol: "฿", name: "Thai Baht", countries: ["Thailand"] },
        TJS: { symbol: "SM", name: "Tajikistani Somoni", countries: ["Tajikistan"] },
        TMT: { symbol: "T", name: "Turkmenistani Manat", countries: ["Turkmenistan"] },
        TND: { symbol: "د.ت", name: "Tunisian Dinar", countries: ["Tunisia"] },
        TOP: { symbol: "T$", name: "Tongan Pa'anga", countries: ["Tonga"] },
        TRY: { symbol: "₺", name: "Turkish Lira", countries: ["Turkey"] },
        TTD: { symbol: "TT$", name: "Trinidad and Tobago Dollar", countries: ["Trinidad and Tobago"] },
        TWD: { symbol: "NT$", name: "New Taiwan Dollar", countries: ["Taiwan"] },
        TZS: { symbol: "TSh", name: "Tanzanian Shilling", countries: ["Tanzania"] },
        UAH: { symbol: "₴", name: "Ukrainian Hryvnia", countries: ["Ukraine"] },
        UGX: { symbol: "USh", name: "Ugandan Shilling", countries: ["Uganda"] },
        USD: { symbol: "$", name: "United States Dollar", countries: ["United States", "American Samoa", "British Indian Ocean Territory", "British Virgin Islands", "Ecuador", "El Salvador", "Guam", "Marshall Islands", "Micronesia", "Northern Mariana Islands", "Palau", "Panama", "Puerto Rico", "Turks and Caicos Islands", "U.S. Virgin Islands"] },
        UYU: { symbol: "$U", name: "Uruguayan Peso", countries: ["Uruguay"] },
        UZS: { symbol: "лв", name: "Uzbekistan Som", countries: ["Uzbekistan"] },
        VES: { symbol: "Bs.S", name: "Venezuelan Bolívar Soberano", countries: ["Venezuela"] },
        VND: { symbol: "₫", name: "Vietnamese Dong", countries: ["Vietnam"] },
        VUV: { symbol: "VT", name: "Vanuatu Vatu", countries: ["Vanuatu"] },
        WST: { symbol: "T", name: "Samoan Tala", countries: ["Samoa"] },
        XAF: { symbol: "FCFA", name: "Central African CFA Franc", countries: ["Cameroon", "Central African Republic", "Chad", "Congo", "Equatorial Guinea", "Gabon"] },
        XCD: { symbol: "$", name: "East Caribbean Dollar", countries: ["Anguilla", "Antigua and Barbuda", "Dominica", "Grenada", "Montserrat", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines"] },
        XOF: { symbol: "CFA", name: "West African CFA Franc", countries: ["Benin", "Burkina Faso", "Ivory Coast", "Guinea-Bissau", "Mali", "Niger", "Senegal", "Togo"] },
        XPF: { symbol: "₣", name: "CFP Franc", countries: ["French Polynesia", "New Caledonia", "Wallis and Futuna"] },
        YER: { symbol: "﷼", name: "Yemeni Rial", countries: ["Yemen"] },
        ZAR: { symbol: "R", name: "South African Rand", countries: ["South Africa", "Lesotho", "Namibia"] },
        ZMW: { symbol: "ZK", name: "Zambian Kwacha", countries: ["Zambia"] }
    };

    // 2. Prepare Currency Data for Custom Dropdown
    const currencyData = currencyCodes.map(code => {
        const info = currencyInfo[code] || { symbol: '', name: code, countries: [] };
        const label = info.symbol ? `${code} (${info.symbol})` : code;
        return { 
            code, 
            label, 
            symbol: info.symbol, 
            name: info.name, 
            countries: info.countries.join(', ')
        };
    });

    // Initial Display Label
    const initialInfo = currencyInfo[currency] || { symbol: '', name: currency };
    const initialLabel = initialInfo.symbol ? `${currency} (${initialInfo.symbol})` : currency;

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
                <button class="icon-btn" id="btn-sum" title="Total of All" style="display: none;">${ICONS.sum}</button>
                <button class="icon-btn trash-btn" id="btn-delete-all" title="Close All" style="display: ${currentSettings.singleInstance ? 'none' : 'flex'}">${ICONS.trash}</button>
                <button class="icon-btn close-btn" id="btn-close" title="Close">${ICONS.close}</button>
            </div>
        </div>
        
        <div id="view-main" class="view-main">
            <div class="row">
                <label>Price</label>
                <input type="text" id="inp-amount" value="${amount}">
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
                <input type="text" id="inp-tax" value="${currentSettings.defaultTax}">
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
            
            <div class="setting-item" id="item-persistent" style="display: ${currentSettings.singleInstance ? 'flex' : 'none'}">
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
                <input type="text" id="set-def-tax" value="${currentSettings.defaultTax}" style="max-width: 60px;">
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
        const isSingle = e.target.checked;
        btnDeleteAll.style.display = isSingle ? 'none' : 'flex';
        shadow.getElementById('item-persistent').style.display = isSingle ? 'flex' : 'none';
        
        if (!isSingle) {
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

    const btnSum = shadow.getElementById('btn-sum');

    btnSum.onclick = () => {
        const allHosts = Array.from(document.querySelectorAll('.price-actually-bdt-host'))
            .filter(h => h.getAttribute('data-type') !== 'summary'); // Don't sum existing summaries
        
        let grandTotal = 0;
        const items = [];

        allHosts.forEach(host => {
            const total = parseFloat(host.getAttribute('data-total-bdt') || '0');
            const detail = host.getAttribute('data-detail');
            if (total > 0 && detail) {
                grandTotal += total;
                items.push({ detail, total });
            }
        });

        if (items.length > 1) {
            createSummaryPopup(items, grandTotal);
        }
    };

    function updateGlobalActions() {
        const allHosts = Array.from(document.querySelectorAll('.price-actually-bdt-host'))
            .filter(h => h.getAttribute('data-type') !== 'summary');
        
        const showSum = allHosts.length > 1;
        
        // Also update the summary instance visibility if any
        const allTotalHosts = document.querySelectorAll('.price-actually-bdt-host');
        allTotalHosts.forEach(host => {
            if (host.shadowRoot) {
                const sBtn = host.shadowRoot.getElementById('btn-sum');
                if (sBtn) sBtn.style.display = showSum ? 'flex' : 'none';
            }
        });
    }

    // Call update on creation
    setTimeout(updateGlobalActions, 0);

    btnClose.onclick = () => {
        shadowHost.remove();
        document.removeEventListener('mousedown', closeOnClickOutside);
        setTimeout(updateGlobalActions, 0);
    };

    btnDeleteAll.onclick = () => {
        const allHosts = document.querySelectorAll('.price-actually-bdt-host');
        allHosts.forEach(el => el.remove());
    };

    btnSave.onclick = () => {
        const newSettings = {
            persistent: checkPersistent.checked,
            singleInstance: checkSingle.checked,
            defaultTax: safeEval(shadow.getElementById('set-def-tax').value)
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
        document.addEventListener('mousedown', closeOnClickOutside);
    }, 100);

    function closeOnClickOutside(e) {
        if (currentSettings.persistent) return;
        // Use composedPath to check if the click originated inside the shadow DOM
        if (shadowHost && document.body.contains(shadowHost) && !e.composedPath().includes(shadowHost)) {
            shadowHost.remove();
            document.removeEventListener('mousedown', closeOnClickOutside);
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

    // Fuzzy Match Helper (Simple subsequence matching)
    function isFuzzyMatch(str, pattern) {
        pattern = pattern.toLowerCase();
        str = str.toLowerCase();
        let i = 0, j = 0;
        while (i < str.length && j < pattern.length) {
            if (str[i] === pattern[j]) j++;
            i++;
        }
        return j === pattern.length;
    }

    // Render List Function
    function renderCurrencyList(filterText = '') {
        const filter = filterText.toLowerCase();
        listEl.innerHTML = '';
        
        let filtered = currencyData.filter(c => {
            const searchStr = `${c.code} ${c.name} ${c.countries}`.toLowerCase();
            return searchStr.includes(filter) || isFuzzyMatch(searchStr, filter);
        });

        // Sort by priority: Exact code match first, then string includes, then fuzzy
        filtered.sort((a, b) => {
            const aCode = a.code.toLowerCase();
            const bCode = b.code.toLowerCase();
            if (aCode === filter) return -1;
            if (bCode === filter) return 1;
            
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();
            const aInc = aName.includes(filter) || a.code.toLowerCase().includes(filter);
            const bInc = bName.includes(filter) || b.code.toLowerCase().includes(filter);
            
            if (aInc && !bInc) return -1;
            if (!aInc && bInc) return 1;
            
            return 0;
        });

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
                item.style.flexDirection = 'column';
                item.style.alignItems = 'flex-end';
                item.style.gap = '2px';
                if (c.code === currencyInp.value) item.classList.add('active');
                
                const mainInfo = document.createElement('div');
                mainInfo.style.display = 'flex';
                mainInfo.style.gap = '6px';
                mainInfo.style.fontWeight = '600';
                mainInfo.innerHTML = `${c.symbol ? `<small>(${c.symbol})</small>` : ''} ${c.code}`;
                
                const subInfo = document.createElement('div');
                subInfo.style.fontSize = '10px';
                subInfo.style.color = '#888';
                subInfo.textContent = c.name;

                const countryInfo = document.createElement('div');
                countryInfo.style.fontSize = '9px';
                countryInfo.style.color = '#aaa';
                countryInfo.style.maxWidth = '200px';
                countryInfo.style.overflow = 'hidden';
                countryInfo.style.textOverflow = 'ellipsis';
                countryInfo.style.whiteSpace = 'nowrap';
                countryInfo.textContent = c.countries;
                
                item.appendChild(mainInfo);
                item.appendChild(subInfo);
                if (c.countries) item.appendChild(countryInfo);
                
                item.onclick = () => {
                    selectCurrency(c);
                };
                listEl.appendChild(item);
            });
        }
        listEl.scrollTop = 0;
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
        const amtStr = shadow.getElementById('inp-amount').value;
        const taxStr = shadow.getElementById('inp-tax').value;
        const amt = safeEval(amtStr);
        const taxRate = safeEval(taxStr);
        const selectedCurr = shadow.getElementById('inp-currency').value;

        // Display results in label if expression is found
        const labelEl = shadow.querySelector('.total-label');
        const hasAmtOp = /[+\-*/]/.test(amtStr);
        const hasTaxOp = /[+\-*/]/.test(taxStr);

        if (hasAmtOp || hasTaxOp) {
            const resP = Number.isInteger(amt) ? amt : amt.toFixed(2);
            const resT = Number.isInteger(taxRate) ? taxRate : taxRate.toFixed(2);
            if (hasAmtOp && hasTaxOp) labelEl.textContent = `P: ${resP}, T: ${resT}%`;
            else if (hasAmtOp) labelEl.textContent = `Price Result: ${resP}`;
            else labelEl.textContent = `Tax Result: ${resT}%`;
        } else {
            labelEl.textContent = 'Total Estimate';
        }

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
        
        // Save current BDT total to host for global consumption
        shadowHost.setAttribute('data-total-bdt', totalBdt.toString());
        shadowHost.setAttribute('data-detail', `${selectedCurr} ${amt.toLocaleString()} (${taxRate}%)`);
    }

    function safeEval(str) {
        if (!str) return 0;
        try {
            // 1. Tokenize: Numbers, operators, and parentheses
            const tokens = str.match(/[0-9.]+|[-+*/()]/g);
            if (!tokens) return 0;

            let pos = 0;
            const peek = () => tokens[pos];
            const consume = () => tokens[pos++];

            // 2. Recursive Descent Parser following operator precedence
            // Expr   -> Term (('+' | '-') Term)*
            // Term   -> Factor (('*' | '/') Factor)*
            // Factor -> Number | '(' Expr ')' | '-' Factor

            function parseExpression() {
                let left = parseTerm();
                while (peek() === '+' || peek() === '-') {
                    const op = consume();
                    const right = parseTerm();
                    left = (op === '+') ? left + right : left - right;
                }
                return left;
            }

            function parseTerm() {
                let left = parseFactor();
                while (peek() === '*' || peek() === '/') {
                    const op = consume();
                    const right = parseFactor();
                    if (op === '*') left *= right;
                    else left /= (right || 1); // Avoid division by zero
                }
                return left;
            }

            function parseFactor() {
                const token = consume();
                if (token === '(') {
                    const val = parseExpression();
                    if (peek() === ')') consume(); 
                    return val;
                }
                if (token === '-') {
                    return -parseFactor();
                }
                return parseFloat(token) || 0;
            }

            const result = parseExpression();
            return (typeof result === 'number' && isFinite(result)) ? result : 0;
        } catch (e) {
            console.error('Math evaluation error:', e);
            return 0;
        }
    }

    function parseSelection(text) {
        if (!text) return { amount: 0, currency: 'USD' };
        const numberMatch = text.match(/[\d,.]+/);
        const amount = numberMatch ? parseFloat(numberMatch[0].replace(/,/g, '')) : 0;
        
        let currency = 'USD';
        const lowerText = text.toLowerCase();

        // Expanded Currency Detection for common symbols and names
        if (text.includes('€') || lowerText.includes('euro')) currency = 'EUR';
        else if (text.includes('£') || lowerText.includes('pound')) currency = 'GBP';
        else if (text.includes('₹') || lowerText.includes('inr') || lowerText.includes('rupee')) currency = 'INR';
        else if (text.includes('¥') || lowerText.includes('yen') || lowerText.includes('yuan')) {
            currency = (text.includes('¥') && (lowerText.includes('yuan') || lowerText.includes('china'))) ? 'CNY' : 'JPY';
        }
        else if (lowerText.includes('rm')) currency = 'MYR';
        else if (text.includes('﷼') || lowerText.includes('riyal')) currency = 'SAR';
        else if (text.includes('د.إ') || lowerText.includes('dirham')) currency = 'AED';
        else if (text.includes('C$') || lowerText.includes('cad')) currency = 'CAD';
        else if (text.includes('A$') || lowerText.includes('aud')) currency = 'AUD';
        else if (text.includes('৳') || text.includes('tk') || lowerText.includes('taka')) currency = 'BDT';
        else if (text.includes('$')) currency = 'USD'; // Default $ to USD if nothing else matched

        // Check if detected currency exists in rates, otherwise default to USD
        if (rates && !rates[currency]) {
            currency = 'USD';
        }

        return { amount, currency };
    }

    function createSummaryPopup(items, grandTotal) {
        if (currentSettings.singleInstance) {
             const existingHosts = document.querySelectorAll('.price-actually-bdt-host');
             existingHosts.forEach(el => el.remove());
        }

        const shadowHost = document.createElement('div');
        shadowHost.classList.add('price-actually-bdt-host');
        shadowHost.setAttribute('data-type', 'summary');
        shadowHost.setAttribute('data-darkreader-ignore', 'true');
        
        const shadow = shadowHost.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
            :host { all: initial; font-family: 'Segoe UI', sans-serif; }
            .bdt-box {
                position: fixed; bottom: 20px; right: 20px; width: 300px;
                background: #ffffff !important; color: #333 !important;
                z-index: 2147483647; border-radius: 12px;
                box-shadow: 0 4px 25px rgba(0,0,0,0.2); border: 1px solid #ddd;
                padding: 16px; box-sizing: border-box; animation: slideIn 0.3s ease-out;
            }
            @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            .header {
                display: flex; justify-content: space-between; align-items: center;
                border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 12px;
                cursor: move;
            }
            h3 { margin: 0; font-size: 15px; font-weight: 700; color: #2e7d32; }
            .icon-btn {
                cursor: pointer; color: #aaa; background: none; border: none; padding: 4px; 
                display: flex; align-items: center; justify-content: center;
                border-radius: 4px; transition: 0.2s;
            }
            .icon-btn:hover { color: #d32f2f; background: #ffebee; }
            
            .summary-list {
                max-height: 200px; overflow-y: auto; margin-bottom: 12px;
                border-bottom: 1px solid #f5f5f5;
            }
            .summary-item {
                display: flex; justify-content: space-between; align-items: center;
                padding: 6px 0; font-size: 12px; border-bottom: 1px dashed #eee;
            }
            .summary-item:last-child { border-bottom: none; }
            .item-detail { color: #666; font-weight: 500; }
            .item-bdt { color: #333; font-weight: 600; }

            .total-box {
                background: #f1f8e9; border: 1px solid #c8e6c9; border-radius: 8px;
                padding: 12px; text-align: center;
            }
            .total-label { font-size: 10px; color: #558b2f; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
            .total-val { font-size: 24px; font-weight: 800; color: #2e7d32; }
        `;

        const container = document.createElement('div');
        container.classList.add('bdt-box');
        
        let listHtml = items.map(item => `
            <div class="summary-item">
                <span class="item-detail">${item.detail}</span>
                <span class="item-bdt">${item.total.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ৳</span>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="header" id="drag-handle">
                <h3>Combined Calculation</h3>
                <button class="icon-btn close-btn" id="btn-close" title="Close">${ICONS.close}</button>
            </div>
            <div class="summary-list">
                ${listHtml}
            </div>
            <div class="total-box">
                <div class="total-label">Grand Total</div>
                <div class="total-val">${grandTotal.toLocaleString('en-BD', { style: 'currency', currency: 'BDT' })}</div>
            </div>
        `;

        shadow.appendChild(style);
        shadow.appendChild(container);
        document.body.appendChild(shadowHost);

        // Dragging & Close
        const header = shadow.getElementById('drag-handle');
        header.onmousedown = (e) => {
            if (e.target.closest('button')) return;
            let isDragging = true;
            const startX = e.clientX - container.getBoundingClientRect().left;
            const startY = e.clientY - container.getBoundingClientRect().top;
            container.style.bottom = 'auto'; container.style.right = 'auto';
            container.style.left = (e.clientX - startX) + 'px'; container.style.top = (e.clientY - startY) + 'px';
            
            const move = (me) => {
                if (!isDragging) return;
                container.style.left = (me.clientX - startX) + 'px';
                container.style.top = (me.clientY - startY) + 'px';
            };
            const up = () => {
                isDragging = false;
                window.removeEventListener('mousemove', move);
                window.removeEventListener('mouseup', up);
            };
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', up);
        };

        shadow.getElementById('btn-close').onclick = () => {
            shadowHost.remove();
        };
    }
}