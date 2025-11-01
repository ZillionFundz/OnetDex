// Minimal, robust script.js: CoinGecko live prices + ±1% color logic + debug logs

// ------- CONFIG -------
const DEBUG = true;            // set false to silence debug logs
const POLL_INTERVAL_MS = 30000; // price update interval

// Debug log helper
function dlog(...args) { if (DEBUG) console.log(...args); }

// ------- COIN ID MAPPING (UI data-coin -> CoinGecko id) -------
const coinIdMap = {
    pi: 'pi-network',
    bitcoin: 'bitcoin',
    ethereum: 'ethereum',
    binancecoin: 'binancecoin',
    coredao: 'coredaoorg',
    rockycat: 'rockycat',
    snowman: 'snowman',
    ice: 'ice',
    one: 'harmony' // added mapping for $ONE
};

// Price formatting with adaptive decimals
function formatPrice(value) {
    if (typeof value !== 'number' || !isFinite(value)) return '--';
    const abs = Math.abs(value);
    const decimals = abs < 1 ? 6 : (abs < 10 ? 4 : 2);
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

// Apply color classes based on price change
// THIS IS FIRST OPTION. USES SMALL THREASHOLD (OF 0.01%). ADJUST AS NEEDED.
function applyColorClass(el, changePercent) {
    const THRESHOLD = 0.01; // 0.01% sensitivity

    // clear previous state classes
    el.classList.remove('price-up', 'price-down', 'price-error', 'price-loading');

    const change = Number(changePercent);
    if (!isFinite(change)) {
        dlog('   ⚠️ Invalid changePercent', changePercent);
        el.classList.add('price-error');
        return;
    }

    dlog(`   💹 changePercent: ${change.toFixed(6)}% (threshold ${THRESHOLD}%)`);

    if (change >= THRESHOLD) {
        el.classList.add('price-up');
    } else if (change <= -THRESHOLD) {
        el.classList.add('price-down');
    }
}
// ...existing code...


// Track previous prices for change calculation
const previousPrices = {};

// Main price update function
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

        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(uniqueIds.join(','))}&vs_currencies=usd&include_24h_change=true`;
        dlog('Fetching', url);

        const res = await fetch(url);
        dlog('Fetch status', res.status);
        if (!res.ok) throw new Error(`CoinGecko fetch failed: ${res.status}`);

        const data = await res.json();
        dlog('API response keys:', Object.keys(data));

        // Now process elements with the fetched data
        elems.forEach(el => {
            const uiKey = (el.dataset.coin || '').trim();
            const apiId = coinIdMap[uiKey] || uiKey;
            const entry = data[apiId];
            const target = el.querySelector('.coin-value') || el;

            // ensure previous state removed
            target.classList.remove('price-up', 'price-down', 'price-error', 'price-loading');

            if (!entry || typeof entry.usd === 'undefined') {
                dlog(`❌ No data for ${apiId}`);
                target.textContent = '--';
                target.classList.add('price-error');
                return;
            }

            const current = Number(entry.usd);
            const apiChange24 = (typeof entry.usd_24h_change === 'number' && isFinite(entry.usd_24h_change))
                ? Number(entry.usd_24h_change)
                : null;

            dlog(`💱 ${apiId}`, { price: current, change24h: apiChange24 });

            target.textContent = formatPrice(current);

            if (apiChange24 !== null) {
                // use API 24h change when available
                applyColorClass(target, apiChange24);
            } else if (previousPrices[apiId]) {
                // fallback: compute percent change vs previous price
                const prev = Number(previousPrices[apiId]);
                if (prev && isFinite(prev)) {
                    const pct = ((current - prev) / prev) * 100;
                    dlog(`   fallback pct vs previous: ${pct.toFixed(2)}%`);
                    applyColorClass(target, pct);
                } else {
                    target.classList.add('price-error');
                }
            } else {
                // first fetch and no change data — show neutral/error
                target.classList.add('price-error');
            }

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

// Start price updates
updateCryptoPrices();
setInterval(updateCryptoPrices, POLL_INTERVAL_MS);

// Keep your existing Swiper code below this line
// ...existing code...



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


// ------- NFT SHOW FUNCTION -------
function nftShow() {
    const listed = document.getElementsByClassName("listed-card")[0];
    listed.style.display = "none";
    const nft = document.getElementById("nft");
    nft.style.display = "block";
}


