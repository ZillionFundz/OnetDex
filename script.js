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
// Replace the existing updateCryptoPrices(...) function with this block

async function updateCryptoPrices() {
    try {
        // Helper: derive ui key from element (supports elements without data-coin)
        function deriveUiKeyFromElement(el) {
            if (!el) return '';
            const data = (el.dataset && el.dataset.coin) ? el.dataset.coin.trim() : '';
            if (data) return data.toLowerCase();
            const parent = el.closest('.ticker-and-trend-value') || el.closest('.ticker-and-value') || el.parentElement;
            if (parent) {
                const ticker = parent.querySelector('.coin-ticker');
                if (ticker) return ticker.textContent.replace(/^\s*\$?/, '').trim().toLowerCase();
            }
            return '';
        }

        // Local parser for numeric volume strings like "1.2K", "10M", "2,500"
        function parseNumberString(str) {
            if (!str || typeof str !== 'string') return NaN;
            const s = str.trim().replace(/,/g, '').toUpperCase();
            const match = s.match(/^(-?[\d.]+)\s*([KMBT])?$/);
            if (!match) return NaN;
            let value = parseFloat(match[1]);
            const suffix = match[2];
            if (!isFinite(value)) return NaN;
            if (suffix) {
                switch (suffix) {
                    case 'K': value *= 1e3; break;
                    case 'M': value *= 1e6; break;
                    case 'B': value *= 1e9; break;
                    case 'T': value *= 1e12; break;
                }
            }
            return value;
        }

        // Select all relevant price elements (supports both .coin-value and explicit [data-coin])
        const elems = Array.from(document.querySelectorAll('.coin-value, [data-coin]'));
        dlog('-------- Price Update Start --------');
        dlog(`Found ${elems.length} price elements`);

        // Build list of API ids to request
        const ids = elems
            .map(el => {
                const key = deriveUiKeyFromElement(el);
                return (coinIdMap[key] || key || '').trim();
            })
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

        // Process each element and update price, color and holding amount
        elems.forEach(el => {
            const uiKey = deriveUiKeyFromElement(el);
            const apiId = (coinIdMap[uiKey] || uiKey).trim();
            const entry = data[apiId];

            // Target the element that displays the price value
            const target = el.classList.contains('coin-value') ? el : (el.querySelector('.coin-value') || el);

            // clear previous state
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

            dlog(`💱 ${apiId}`, { price: current, change24h: apiChange24, uiKey });

            // update shown price
            target.textContent = formatPrice(current);

            // apply color using API 24h change if available, otherwise fallback to prev price comparison
            if (apiChange24 !== null) {
                applyColorClass(target, apiChange24);
            } else if (previousPrices[apiId]) {
                const prev = Number(previousPrices[apiId]);
                if (prev && isFinite(prev)) {
                    const pct = ((current - prev) / prev) * 100;
                    dlog(`   fallback pct vs previous: ${pct.toFixed(6)}%`);
                    applyColorClass(target, pct);
                } else {
                    target.classList.add('price-error');
                }
            } else {
                // first fetch and no API change — neutral/error state
                target.classList.add('price-error');
            }

            // ---- compute and update per-coin USD holding amount ----
            const container = target.closest('.trending-card') || target.closest('.listed-card') || target.closest('.coin') || target.parentElement;
            if (container) {
                const volumeEl = container.querySelector('.coin-volume');
                const amountEl = container.querySelector('.coin-amount');

                if (amountEl) {
                    let volumeNum = NaN;

                    if (volumeEl) {
                        volumeNum = parseNumberString(volumeEl.textContent || '');
                    } else {
                        const dataVol = target.dataset.volume || target.getAttribute('data-volume') || '';
                        volumeNum = parseNumberString(String(dataVol));
                    }

                    if (!isNaN(volumeNum) && isFinite(current)) {
                        const holdingUsd = volumeNum * current;
                        // formatTotalCurrency should exist in your script; fallback to a simple formatter if not
                        if (typeof formatTotalCurrency === 'function') {
                            amountEl.textContent = formatTotalCurrency(holdingUsd);
                        } else {
                            amountEl.textContent = '$' + holdingUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        }
                    } else {
                        dlog(`   ⚠️ could not compute holding amount for ${apiId}`, { volumeRaw: volumeEl ? volumeEl.textContent : null, volumeNum });
                    }
                }
            }

            // store current price for future fallback comparisons
            previousPrices[apiId] = current;
        });

        // Update header total (if function exists)
        if (typeof updateTotalHoldings === 'function') updateTotalHoldings();

        dlog('-------- Price Update Complete --------\n');

    } catch (err) {
        console.error('❌ Price update error:', err);
        document.querySelectorAll('.coin-value, [data-coin]').forEach(el => {
            const target = el.classList.contains('coin-value') ? el : (el.querySelector('.coin-value') || el);
            if (target) {
                target.textContent = '--';
                target.classList.add('price-error');
            }
        });
    }
}

// Start price updates
updateCryptoPrices();
setInterval(updateCryptoPrices, POLL_INTERVAL_MS);


// ...existing code...

// View More functionality
document.getElementById('viewMoreBtn').addEventListener('click', function () {
    const hiddenCoins = document.querySelectorAll('.hidden-coin');
    const btn = this;

    hiddenCoins.forEach(coin => {
        if (coin.classList.contains('visible')) {
            coin.classList.remove('visible');
            btn.textContent = 'View More';
        } else {
            coin.classList.add('visible');
            btn.textContent = 'View Less';
        }
    });

    // Update prices for newly visible coins
    updateCryptoPrices();
});
// ...existing code...


// ...existing code...

/**
 * Parse strings like "$1,234.56", "$2K", "$3.5M", "$2B" -> numeric USD value
 */
function parseCurrencyString(str) {
    if (!str || typeof str !== 'string') return NaN;
    const s = str.trim().replace(/\$/g, '').replace(/,/g, '').toUpperCase();
    const match = s.match(/^(-?[\d.]+)\s*([KMBT])?$/);
    if (!match) return NaN;
    let value = parseFloat(match[1]);
    const suffix = match[2];
    if (!isFinite(value)) return NaN;
    if (suffix) {
        switch (suffix) {
            case 'K': value *= 1e3; break;
            case 'M': value *= 1e6; break;
            case 'B': value *= 1e9; break;
            case 'T': value *= 1e12; break;
        }
    }
    return value;
}

function formatTotalCurrency(value) {
    if (typeof value !== 'number' || !isFinite(value)) return '--';
    return '$' + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Sum displayed .coin-amount values and update the header total.
 * If no .coin-amount elements are present, this does nothing.
 */
function updateTotalHoldings() {
    const amountEls = Array.from(document.querySelectorAll('.coin-amount'));
    if (!amountEls.length) return;
    let total = 0;
    amountEls.forEach(el => {
        const txt = el.textContent.trim();
        const parsed = parseCurrencyString(txt.replace(/\s+/g, ''));
        if (!isNaN(parsed)) total += parsed;
    });

    // target the header amount element (the second .amount in .amount-group)
    const amountGroup = document.querySelector('.amount-group');
    if (!amountGroup) return;
    const amountNodes = Array.from(amountGroup.querySelectorAll('.amount'));
    const target = amountNodes[1] || amountNodes[0]; // fallback to first if second missing
    if (target) target.textContent = formatTotalCurrency(total);
}

// ...existing code...

// Call updateTotalHoldings after prices are updated
// Insert this call at end of updateCryptoPrices (after previousPrices updates)
updateTotalHoldings();

// ...existing code...



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


