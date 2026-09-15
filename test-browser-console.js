// ============================================
// Browser Console Testing Script
// ============================================
// Open browser DevTools (F12) on the dashboard page
// Paste this entire script into the Console tab and press Enter

console.log('%c=== DASHBOARD BUG FIX VERIFICATION ===', 'color: blue; font-size: 16px; font-weight: bold');

// ============================================
// Test 1: Clear Cache and Force Refresh
// ============================================
function clearDashboardCache() {
    console.log('%c\n[Test 1] Clearing Dashboard Cache...', 'color: orange; font-weight: bold');
    
    // Clear the cache
    localStorage.removeItem('dashboard_data_cache');
    
    // Check if cleared
    const cacheAfter = localStorage.getItem('dashboard_data_cache');
    
    if (cacheAfter === null) {
        console.log('%c✅ Cache cleared successfully', 'color: green');
        console.log('Please refresh the page (F5 or Ctrl+R) to see updated data');
        return true;
    } else {
        console.log('%c❌ Cache still exists', 'color: red');
        return false;
    }
}

// ============================================
// Test 2: Inspect Current Dashboard Data
// ============================================
function inspectDashboardData() {
    console.log('%c\n[Test 2] Inspecting Dashboard Data...', 'color: orange; font-weight: bold');
    
    // Try to access Vue app instance
    const app = document.querySelector('#app').__vueParentComponent;
    
    if (!app) {
        console.log('%c⚠️ Cannot access Vue app. Try running this after dashboard loads.', 'color: orange');
        return null;
    }
    
    // Try to find dashboard data in localStorage
    const cache = localStorage.getItem('dashboard_data_cache');
    
    if (cache) {
        try {
            const data = JSON.parse(cache);
            console.log('%c📊 Dashboard Cache Found:', 'color: blue');
            console.log('Cache Data:', data);
            
            if (data.kalibrasi) {
                console.log(`\n📋 Kalibrasi Data:`);
                console.log(`- Total Schedules: ${data.kalibrasi.totalSchedules || 'N/A'}`);
                console.log(`- Yearly: ${data.kalibrasi.yearly || 'N/A'}`);
                console.log(`- Monthly: ${data.kalibrasi.monthly || 'N/A'}`);
            }
            
            if (data.pm) {
                console.log(`\n📋 PM Data:`);
                console.log(`- Total Schedules: ${data.pm.totalSchedules || 'N/A'}`);
                console.log(`- Yearly: ${data.pm.yearly || 'N/A'}`);
                console.log(`- Monthly: ${data.pm.monthly || 'N/A'}`);
            }
            
            console.log(`\n🕐 Cache Timestamp: ${new Date(data.timestamp).toLocaleString('id-ID')}`);
            
            return data;
        } catch (e) {
            console.log('%c❌ Cache exists but cannot parse:', 'color: red', e);
            return null;
        }
    } else {
        console.log('%c⚠️ No cache found. Data will be fresh from API.', 'color: orange');
        return null;
    }
}

// ============================================
// Test 3: Monitor API Calls
// ============================================
function monitorAPIcalls() {
    console.log('%c\n[Test 3] Setting up API Call Monitor...', 'color: orange; font-weight: bold');
    console.log('This will log getTotalSchedules() calls.');
    console.log('Refresh the page to trigger new API calls.\n');
    
    // Intercept console.log to catch our API logs
    const originalLog = console.log;
    const apiLogs = [];
    
    console.log = function(...args) {
        const message = args[0];
        
        // Check if this is our API log
        if (typeof message === 'string') {
            if (message.includes('getTotalSchedules') || 
                message.includes('Unique calibration IDs') ||
                message.includes('processMonthlyData')) {
                apiLogs.push({ timestamp: new Date(), args: args });
                originalLog.apply(console, ['%c[MONITORED]', 'color: purple', ...args]);
                return;
            }
        }
        
        originalLog.apply(console, args);
    };
    
    console.log('%c✅ Monitor active. API calls will be logged with [MONITORED] prefix.', 'color: green');
    
    // Return function to restore original console.log
    return () => {
        console.log = originalLog;
        console.log('%c[Monitor] Stopped. Captured logs:', 'color: purple', apiLogs);
    };
}

// ============================================
// Test 4: Check Historical Filter (August 2026)
// ============================================
function checkHistoricalFilter() {
    console.log('%c\n[Test 4] Historical Filter Check', 'color: orange; font-weight: bold');
    console.log('Instructions:');
    console.log('1. Manually change dashboard filter to August 2026');
    console.log('2. Run: checkCurrentFilter() in console');
    console.log('3. Check if any data with created_at > Aug 31, 2026 appears');
}

function checkCurrentFilter() {
    console.log('%c\n🔍 Checking Current Filter State...', 'color: blue; font-weight: bold');
    
    // This would need to access your Vue component state
    // Since we can't access it directly, provide instructions
    console.log('%cTo manually verify:', 'color: orange');
    console.log('1. Check the month/year filter on dashboard UI');
    console.log('2. Look at the displayed data');
    console.log('3. For each item, check if its created_at <= end of selected month');
    console.log('\nExample SQL to verify:');
    console.log(`
SELECT 
    k.id,
    d.nama_alat,
    k.due_date,
    k.created_at,
    CASE 
        WHEN k.created_at IS NULL THEN 'Legacy (should appear)'
        WHEN k.created_at <= '2026-08-31 23:59:59' THEN 'Valid for Aug 2026'
        ELSE 'SHOULD NOT appear in Aug 2026'
    END as validity
FROM kalibrasi k
JOIN daftaralat d ON k.id_alat = d.id_alat
WHERE k.due_date ILIKE '%Aug%'
ORDER BY k.created_at DESC NULLS LAST;
    `);
}

// ============================================
// Test 5: Count Verification
// ============================================
function verifyCount() {
    console.log('%c\n[Test 5] Count Verification', 'color: orange; font-weight: bold');
    
    const cache = localStorage.getItem('dashboard_data_cache');
    
    if (!cache) {
        console.log('%c⚠️ No cache found. Refresh page first.', 'color: orange');
        return;
    }
    
    try {
        const data = JSON.parse(cache);
        
        console.log('%c📊 Current Dashboard Counts:', 'color: blue; font-weight: bold');
        
        if (data.kalibrasi) {
            console.log('\n🔬 KALIBRASI:');
            console.log(`   Total Schedules: ${data.kalibrasi.totalSchedules || 'N/A'}`);
            console.log(`   Expected: 950 (or your SQL unique count)`);
            
            const kalTotal = data.kalibrasi.totalSchedules;
            if (kalTotal === 950) {
                console.log('%c   ✅ CORRECT! Matches expected count', 'color: green; font-weight: bold');
            } else if (kalTotal === 929) {
                console.log('%c   ❌ OLD BUG! Still showing 929 (cache not cleared?)', 'color: red; font-weight: bold');
            } else {
                console.log(`%c   ⚠️ UNEXPECTED! Got ${kalTotal}, check SQL for actual count`, 'color: orange; font-weight: bold');
            }
            
            // Check if monthly data exists
            if (data.kalibrasi.yearly) {
                console.log(`\n   Monthly breakdown available: Yes`);
                console.log(`   Yearly count: ${data.kalibrasi.yearly}`);
                
                // Count unique IDs from monthly data
                if (Array.isArray(data.kalibrasi.yearly)) {
                    const uniqueIds = new Set();
                    data.kalibrasi.yearly.forEach(month => {
                        if (month.schedules && Array.isArray(month.schedules)) {
                            month.schedules.forEach(s => {
                                if (s.calibration_id) uniqueIds.add(s.calibration_id);
                            });
                        }
                    });
                    console.log(`   Unique IDs in yearly data: ${uniqueIds.size}`);
                    
                    if (uniqueIds.size !== kalTotal) {
                        console.log('%c   ⚠️ MISMATCH between total and unique IDs!', 'color: orange');
                    }
                }
            }
        }
        
        if (data.pm) {
            console.log('\n🔧 PM (Preventive Maintenance):');
            console.log(`   Total Schedules: ${data.pm.totalSchedules || 'N/A'}`);
        }
        
        console.log('\n%c💡 TIP:', 'color: blue');
        console.log('If counts are wrong, run: clearDashboardCache() and refresh');
        
    } catch (e) {
        console.log('%c❌ Error parsing cache:', 'color: red', e);
    }
}

// ============================================
// Test 6: Full Test Suite
// ============================================
function runFullTest() {
    console.log('%c\n🚀 Running Full Test Suite...', 'color: green; font-size: 14px; font-weight: bold');
    console.log('━'.repeat(50));
    
    // Test 1
    clearDashboardCache();
    
    // Test 2
    inspectDashboardData();
    
    // Test 5
    verifyCount();
    
    console.log('\n%c━'.repeat(50), 'color: green');
    console.log('%c✅ Test suite complete!', 'color: green; font-size: 14px; font-weight: bold');
    console.log('\n%c📋 Next Steps:', 'color: blue; font-weight: bold');
    console.log('1. Refresh the page (F5)');
    console.log('2. Run: verifyCount() to check updated data');
    console.log('3. Test historical filter by selecting August 2026');
    console.log('4. Run SQL verification: test-dashboard-count.sql');
}

// ============================================
// Auto-run basic checks
// ============================================
console.log('%c\n📌 Available Commands:', 'color: purple; font-weight: bold');
console.log('- clearDashboardCache()    : Clear cache and force refresh');
console.log('- inspectDashboardData()   : View current cached data');
console.log('- monitorAPIcalls()        : Monitor API calls (returns stop function)');
console.log('- checkCurrentFilter()     : Verify historical filter logic');
console.log('- verifyCount()            : Check if counts are correct');
console.log('- runFullTest()            : Run all tests at once');

console.log('%c\n🎯 Quick Start:', 'color: green; font-weight: bold');
console.log('Run: runFullTest()');
console.log('');

// Auto-inspect on load
inspectDashboardData();

// ============================================
// Export functions to global scope
// ============================================
window.dashboardTest = {
    clearCache: clearDashboardCache,
    inspect: inspectDashboardData,
    monitor: monitorAPIcalls,
    checkFilter: checkCurrentFilter,
    verifyCount: verifyCount,
    runAll: runFullTest
};

console.log('%c\n✨ Also available as:', 'color: purple');
console.log('window.dashboardTest.clearCache()');
console.log('window.dashboardTest.verifyCount()');
console.log('window.dashboardTest.runAll()');
console.log('');
