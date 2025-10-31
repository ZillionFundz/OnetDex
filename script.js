// Minimal, robust script.js: Swiper init + CoinGecko live prices + ±5% color logic + debug logs

// ------- CONFIG -------
const DEBUG = true;            // set false to silence debug logs
const POLL_INTERVAL_MS = 30000; // price update interval

function dlog(...args) { if (DEBUG) console.log('[PRICE]', ...args); }


// TRENDING SWIPER INIT
// const swiper = new Swiper('.trending-swiper', {
//     slidesPerView: 'auto',
//     spaceBetween: 4,
//     loop: true,
//     freeMode: {
//         enabled: true,
//         momentum: true,
//         momentumRatio: 0.8,
//         sticky: false,
//     },
//     autoplay: {
//         delay: 2500,
//         disableOnInteraction: false,
//     }
// });

// ------- SWIPER (trending) -------
const swiper = new Swiper('.trending-swiper', {
    slidesPerView: 'auto',
    spaceBetween: 2,
    loop: true,
    freeMode: {
        enabled: true,
        momentum: true,
        momentumRatio: 0.8,
        sticky: false,
    },
    autoplay: {
        delay: 2500,
        disableOnInteraction: false,
        waitForTransition: true
    },
    speed: 4000
});

// ------- COIN ID MAPPING (UI data-coin -> CoinGecko id) -------
// Add/update mappings here for any UI keys that differ from CoinGecko ids.
const coinIdMap = {
    // examples from your HTML
    pi: 'pi-network',
    bitcoin: 'bitcoin',
    ethereum: 'ethereum',
    binancecoin: 'binancecoin',
    // your UI uses "coredaoorg" -> map to CoinGecko 'coredao'
    coredaoorg: 'coredao',
    coredao: 'coredao',
    rockycat: 'rockycat',
    snowman: 'snowman',
    ice: 'ice'
};

// ------- STATE -------
let previousPrices = {}; // stores last fetched price per API id

// ------- HELPERS -------
function formatPrice(value) {
    if (typeof value !== 'number' || !isFinite(value)) return '--';
    const abs = Math.abs(value);
    const decimals = abs < 1 ? 6 : (abs < 10 ? 4 : 2);
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

// ...existing code...

function applyColorClass(el, changePercent) {
    // Remove existing state classes
    el.classList.remove('price-up', 'price-down', 'price-error', 'price-loading');

    // Ensure changePercent is a valid number
    const change = Number(changePercent);
    if (isNaN(change)) {
        dlog(`   ⚠️ Invalid change percentage: ${changePercent}`);
        el.classList.add('price-error');
        return;
    }

    dlog(`   💹 Price Change Analysis:`);
    dlog(`   - Raw change: ${change}`);
    dlog(`   - Formatted: ${change.toFixed(2)}%`);

    // Apply color classes based on ±1% thresholds
    if (change >= 1) {
        el.classList.add('price-up');
        dlog(`   🟢 Added class: price-up (≥ +1%)`);
    } else if (change <= -1) {  // Changed from -5% to -1%
        el.classList.add('price-down');
        dlog(`   🔴 Added class: price-down (≤ -1%)`);
    } else {
        dlog(`   ⚪ No color change (between -1% and +1%)`);
    }

    // Log final state
    const finalClasses = Array.from(el.classList).join(' ');
    dlog(`   📊 Final classes: ${finalClasses || 'none'}`);
}

// ...existing code...

// ------- MAIN UPDATE FUNCTION -------
async function updateCryptoPrices() {
    try {
        const elems = Array.from(document.querySelectorAll('[data-coin]'));
        dlog('-------- Price Update Start --------');
        dlog(`Found ${elems.length} price elements`);

        // Build list of API ids to request
        const ids = elems
            .map(el => (coinIdMap[el.dataset.coin] || el.dataset.coin || '').trim())
            .filter(Boolean);

        const uniqueIds = [...new Set(ids)];
        if (!uniqueIds.length) {
            dlog('No valid coin ids to request');
            return;
        }

        // Fetch price data from CoinGecko
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(uniqueIds.join(','))}&vs_currencies=usd&include_24h_change=true`;
        dlog('Fetching', url);

        const res = await fetch(url);
        dlog('Fetch status', res.status);
        if (!res.ok) throw new Error(`CoinGecko fetch failed: ${res.status}`);

        const data = await res.json();
        dlog('API response keys:', Object.keys(data));

        // Now process elements with the fetched data
        elems.forEach(el => {
            const uiKey = el.dataset.coin;
            const apiId = coinIdMap[uiKey] || uiKey;
            const entry = data[apiId];

            if (!entry || typeof entry.usd === 'undefined') {
                dlog(`❌ No data for ${apiId}`);
                el.textContent = '--';
                el.classList.add('price-error');
                return;
            }

            const current = Number(entry.usd);
            const apiChange24 = (typeof entry.usd_24h_change === 'number') ? Number(entry.usd_24h_change) : null;

            dlog(`💱 ${apiId.toUpperCase()}`);
            dlog(`   Price: $${current}`);
            dlog(`   24h Change: ${apiChange24 !== null ? apiChange24.toFixed(2) + '%' : 'not available'}`);
            dlog(`   Previous Price: ${previousPrices[apiId] || 'none'}`);

            // Update element with price and color
            el.textContent = formatPrice(current);
            applyColorClass(el, apiChange24 || 0);
            previousPrices[apiId] = current;
        });

        dlog('-------- Price Update Complete --------\n');

    } catch (err) {
        console.error('❌ Price update error:', err);
        document.querySelectorAll('[data-coin]').forEach(el => {
            el.textContent = '--';
            el.classList.add('price-error');
        });
    }
}

// ------- START UP -------
updateCryptoPrices();
setInterval(updateCryptoPrices, POLL_INTERVAL_MS);
