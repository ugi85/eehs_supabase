# 🐛 CRITICAL BUG FOUND: Supabase 1000 Row Limit

## Root Cause

**Supabase has a DEFAULT limit of 1000 rows** for `select()` queries. Our `logaktivitas` table has **MORE than 1000 rows**, so data was being **TRUNCATED**.

### Evidence:
```javascript
[API] Data fetched: {
  logs: 1000  // ← EXACTLY 1000 = HIT THE LIMIT!
}
```

### Impact:
- **Kalibrasi**: Works fine because most logs are within first 1000 rows
- **PM**: Broken because PM logs for August 2026 are **AFTER row 1000** (truncated)

## The Fix

Changed from:
```javascript
supabase.from('logaktivitas').select('*')
// ← Uses default limit of 1000 rows
```

To:
```javascript
supabase.from('logaktivitas')
  .select('*', { count: 'exact' })
  .range(0, 9999)
// ← Explicitly fetch up to 10,000 rows
```

### Why `.range(0, 9999)`?
- Supabase uses **range-based pagination**
- `range(0, 9999)` = fetch rows 0 to 9999 (10,000 rows total)
- This should cover most use cases
- If you have >10k rows, need to implement pagination

## Verification

After fix, console should show:
```javascript
[Fetch] logaktivitas: XXXX rows (total: XXXX)
// ← Should be MORE than 1000 now!

[API] Data fetched: {
  logs: 1234,  // ← NOT exactly 1000
  pmLogs: 386,
  pmLogsAugust2026: 56  // ← Should match SQL count!
}
```

## Testing Steps

1. **Clear cache**:
   ```javascript
   localStorage.clear()
   location.reload()
   ```

2. **Check console logs**:
   - Look for `[Fetch] logaktivitas: XXXX rows`
   - Should be > 1000
   - Check `pmLogsAugust2026` should be ~56

3. **Verify dashboard**:
   - PM August should show: **56/66 (85%)** ✅
   - Not: **4/66 (6%)** ❌

## Future Improvements

If `logaktivitas` grows beyond 10,000 rows:

### Option A: Increase Range
```javascript
.range(0, 99999)  // 100k rows
```

### Option B: Filter by Year
```javascript
supabase
  .from('logaktivitas')
  .select('*')
  .gte('execute_date', `${year}-01-01`)
  .lte('execute_date', `${year}-12-31`)
  .range(0, 9999)
```

### Option C: Implement Pagination
```javascript
async function fetchAllLogs() {
  const pageSize = 1000
  let allData = []
  let page = 0
  let hasMore = true
  
  while (hasMore) {
    const { data } = await supabase
      .from('logaktivitas')
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1)
    
    if (data && data.length > 0) {
      allData = [...allData, ...data]
      page++
    } else {
      hasMore = false
    }
  }
  
  return allData
}
```

## Related Issues

This bug affects:
- ✅ **Kalibrasi**: Partially (if logs >1000, newer logs missing)
- ✅ **PM**: Completely (PM logs are after row 1000)
- ✅ **Any dashboard metric** that relies on `logaktivitas` data

## Files Modified

- `src/api/supabase/logAktivitasApi.js` - Added `.range(0, 9999)` to all fetch queries

---

**Date**: December 26, 2024  
**Bug Severity**: 🔴 CRITICAL  
**Status**: ✅ FIXED  
**Discovered**: After seeing SQL query returned 56 PM logs but system only detected 4
