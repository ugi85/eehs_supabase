# 🚀 Deployment Checklist

**Project:** Equipment Dashboard Bug Fixes  
**Version:** 1.0  
**Date:** September 15, 2026  

---

## 📋 Pre-Deployment Checklist

### 1. Code Review
- [ ] All changes reviewed
- [ ] No console.log statements left in production code
- [ ] No commented-out code blocks
- [ ] All TODOs resolved or documented
- [ ] Error handling in place

### 2. Testing Verification
- [ ] Quick test completed (TESTING_QUICK_GUIDE.md)
- [ ] Full test completed (TESTING_CHECKLIST.md)
- [ ] Browser console tests passed
- [ ] SQL verification queries executed
- [ ] All test cases documented

### 3. Documentation Review
- [ ] BUG_FIXES_SUMMARY.md reviewed
- [ ] HISTORICAL_FILTER_FIX.md reviewed
- [ ] KALIBRASI_COUNT_FIX.md reviewed
- [ ] All documentation accurate and complete

### 4. Database Verification
- [ ] Run verify-created-at-columns.sql
- [ ] Confirm audit trail triggers active
- [ ] Backup database (if applicable)
- [ ] Record baseline metrics

### 5. Staging Environment (If Available)
- [ ] Deploy to staging
- [ ] Test on staging for 24 hours
- [ ] Monitor error logs
- [ ] User acceptance testing on staging
- [ ] Performance verification

---

## 🎯 Baseline Metrics (Record Before Deployment)

### Current Production State

**Dashboard Counts:**
- Total Kalibrasi Schedules: _________ (Expected: 929)
- Total PM Schedules: _________
- Obsolete Equipment: _________

**SQL Verification:**
```sql
SELECT COUNT(DISTINCT k.id) FROM kalibrasi k
JOIN daftaralat d ON k.id_alat = d.id_alat
WHERE d.obsolete = false;
```
Result: _________ (Expected: 950)

**Difference:** _________ (Expected: 21)

**Database State:**
```sql
SELECT COUNT(*) FROM daftaralat WHERE created_at IS NULL;
```
Result: _________

```sql
SELECT COUNT(*) FROM kalibrasi WHERE created_at IS NULL;
```
Result: _________

**Last Import Date:**
```sql
SELECT MAX(created_at) FROM daftaralat;
```
Result: _________

---

## 🚀 Deployment Steps

### Step 1: Notification
- [ ] Notify users of upcoming maintenance window
- [ ] Estimated downtime: _______ minutes
- [ ] Notify IT/DevOps team
- [ ] Schedule deployment time: _________

### Step 2: Pre-Deployment Backup
- [ ] Database backup completed
- [ ] Time: _________
- [ ] Backup location: _________
- [ ] Verify backup integrity
- [ ] Code backup (git tag/branch)

### Step 3: Code Deployment
- [ ] Pull latest code from repository
- [ ] Verify branch: _________
- [ ] Build production assets
```bash
npm run build
# or your build command
```
- [ ] Deploy to production server
- [ ] Verify file permissions
- [ ] Clear server-side cache (if any)

### Step 4: Database Verification
- [ ] Verify audit trail columns exist
```sql
-- Run verify-created-at-columns.sql
```
- [ ] Verify triggers are active
- [ ] No schema changes needed (already in place)

### Step 5: Application Restart
- [ ] Restart application server
- [ ] Clear Redis/cache (if applicable)
- [ ] Verify application starts successfully
- [ ] Check error logs

### Step 6: Smoke Testing
- [ ] Dashboard loads without errors
- [ ] Can view equipment list
- [ ] Can filter by month/year
- [ ] Import function works
- [ ] No console errors (F12)

---

## ✅ Post-Deployment Verification

### Immediate Checks (Within 15 Minutes)

#### 1. Dashboard Count Verification
- [ ] Open dashboard
- [ ] Clear browser cache: `localStorage.clear()`
- [ ] Refresh page (F5)
- [ ] Check total kalibrasi count
  - Expected: **950** (or SQL baseline)
  - Actual: _________
- [ ] Status: [ ] ✅ Pass [ ] ❌ Fail

#### 2. SQL Verification
```sql
-- Run in Supabase SQL Editor
SELECT COUNT(DISTINCT k.id) as dashboard_should_show
FROM kalibrasi k
JOIN daftaralat d ON k.id_alat = d.id_alat
WHERE d.obsolete = false;
```
- SQL Result: _________
- Dashboard Shows: _________
- Match: [ ] Yes [ ] No

#### 3. Browser Console Check
```javascript
// Run in browser console (F12)
// Paste test-browser-console.js
verifyCount()
```
- [ ] No errors shown
- [ ] Count matches expectation
- [ ] "Unique calibration IDs" message appears

#### 4. Historical Filter Test
- [ ] Filter to current month - 2 (e.g., July 2026)
- [ ] Check displayed data
- [ ] All data should have `created_at <= July 31, 2026`
- [ ] No future-imported data visible

#### 5. Error Log Review
- [ ] Check server error logs
- [ ] Check browser console errors
- [ ] Check Supabase logs
- [ ] No critical errors: [ ] Yes [ ] No

---

### Extended Monitoring (24 Hours)

#### Hour 1
- [ ] Monitor error logs
- [ ] Check user feedback
- [ ] Verify 3-5 user sessions
- [ ] No critical issues

#### Hour 4
- [ ] Re-check dashboard counts
- [ ] Verify historical filters
- [ ] Check import functionality
- [ ] Performance normal

#### Hour 8
- [ ] Review all error logs
- [ ] Check for any anomalies
- [ ] User feedback review
- [ ] Document any issues

#### Hour 24
- [ ] Final verification
- [ ] Re-run test-dashboard-count.sql
- [ ] Compare with baseline
- [ ] Sign-off deployment

---

## 🧪 Test Cases Post-Deployment

### Test Case 1: New Data Import
**Purpose:** Verify historical filter works correctly

**Steps:**
1. [ ] Import new equipment with schedule for current month - 1
2. [ ] Filter dashboard to current month - 1
3. [ ] Verify new data does NOT appear (created after period)
4. [ ] Filter to current month
5. [ ] Verify new data DOES appear

**Result:** [ ] Pass [ ] Fail  
**Notes:** _________

---

### Test Case 2: Dashboard Count Accuracy
**Purpose:** Verify count shows 950, not 929

**Steps:**
1. [ ] Clear cache: `localStorage.clear()`
2. [ ] Refresh dashboard
3. [ ] Check total kalibrasi count
4. [ ] Run SQL verification
5. [ ] Compare dashboard vs SQL

**Expected:** Dashboard = SQL = 950  
**Actual:** Dashboard = _____ , SQL = _____  
**Result:** [ ] Pass [ ] Fail

---

### Test Case 3: Legacy Data Still Works
**Purpose:** Verify backward compatibility

**Steps:**
1. [ ] Find equipment with created_at = NULL
```sql
SELECT * FROM daftaralat 
WHERE created_at IS NULL 
LIMIT 5;
```
2. [ ] Filter to various historical periods
3. [ ] Verify legacy data appears in all valid periods

**Result:** [ ] Pass [ ] Fail  
**Notes:** _________

---

### Test Case 4: 6-Monthly Schedules
**Purpose:** Verify correct counting

**Steps:**
1. [ ] Find 6-monthly schedule in DB
```sql
SELECT * FROM kalibrasi 
WHERE int = '6' 
LIMIT 1;
```
2. [ ] Note the schedule ID: _________
3. [ ] Verify it appears in 2 months (e.g., Jan & Jul)
4. [ ] Check dashboard total count
5. [ ] Verify schedule counted only once

**Result:** [ ] Pass [ ] Fail

---

## 📊 Success Criteria

### Critical (Must Pass)
- [ ] Dashboard count = SQL count (950)
- [ ] Historical filter hides future-imported data
- [ ] No data loss
- [ ] No console errors
- [ ] Import function works
- [ ] All views load correctly

### Important (Should Pass)
- [ ] Legacy data (NULL created_at) still visible
- [ ] 6-monthly schedules display in 2 months
- [ ] 6-monthly schedules counted once
- [ ] Performance not degraded
- [ ] User feedback positive

### Nice to Have
- [ ] Documentation easily accessible
- [ ] Testing tools available
- [ ] Metrics dashboard updated

---

## 🐛 Rollback Plan

### When to Rollback
Rollback immediately if:
- [ ] Dashboard shows 0 schedules
- [ ] Critical errors in logs
- [ ] Data loss detected
- [ ] Application won't start
- [ ] Database corruption
- [ ] User impact > 50% of users

### Rollback Steps

#### 1. Stop Application
```bash
# Your stop command
# Example:
# pm2 stop app
# systemctl stop app-service
```

#### 2. Restore Previous Code
```bash
git checkout <previous-version-tag>
npm install
npm run build
```

#### 3. Restart Application
```bash
# Your start command
# Example:
# pm2 start app
# systemctl start app-service
```

#### 4. Verify Rollback
- [ ] Dashboard loads
- [ ] Shows previous count (929)
- [ ] No errors
- [ ] Basic functions work

#### 5. Notify Stakeholders
- [ ] Users notified of rollback
- [ ] IT team notified
- [ ] Document rollback reason
- [ ] Schedule fix/re-deployment

---

## 📞 Emergency Contacts

**Technical Lead:**  
Name: _________  
Phone: _________  
Email: _________

**Database Admin:**  
Name: _________  
Phone: _________  
Email: _________

**DevOps:**  
Name: _________  
Phone: _________  
Email: _________

**Product Owner:**  
Name: _________  
Phone: _________  
Email: _________

---

## 📝 Deployment Log

### Deployment Details

**Deployed By:** _________  
**Date:** _________  
**Time:** _________  
**Git Commit:** _________  
**Environment:** [ ] Staging [ ] Production

### Pre-Deployment Metrics
- Dashboard Count (Before): _________
- SQL Count: _________
- Difference: _________

### Post-Deployment Metrics
- Dashboard Count (After): _________
- SQL Count: _________
- Difference: _________

### Issues Encountered
1. _________________________________________
2. _________________________________________
3. _________________________________________

### Resolutions
1. _________________________________________
2. _________________________________________
3. _________________________________________

---

## ✅ Sign-Off

### Testing Sign-Off

**Tester Name:** _________  
**Date:** _________  
**Result:** [ ] All tests passed [ ] Issues found  
**Signature:** _________

**Issues:** _________

---

### Deployment Sign-Off

**Deployer Name:** _________  
**Date:** _________  
**Result:** [ ] Successful [ ] Failed [ ] Rolled back  
**Signature:** _________

**Notes:** _________

---

### 24-Hour Monitoring Sign-Off

**Monitor Name:** _________  
**Date:** _________  
**Result:** [ ] Stable [ ] Issues detected  
**Signature:** _________

**Notes:** _________

---

### Final Approval

**Approver Name:** _________  
**Title:** _________  
**Date:** _________  
**Status:** [ ] Approved [ ] Rejected  
**Signature:** _________

**Comments:** _________

---

## 📚 Reference Documentation

During deployment, keep these docs handy:

- [ ] BUG_FIXES_SUMMARY.md - Overview
- [ ] TESTING_QUICK_GUIDE.md - Quick testing
- [ ] test-dashboard-count.sql - SQL verification
- [ ] test-browser-console.js - Browser testing
- [ ] HISTORICAL_FILTER_FIX.md - Technical details
- [ ] KALIBRASI_COUNT_FIX.md - Technical details

---

## 🎯 Post-Deployment Tasks

### Week 1
- [ ] Daily error log review
- [ ] User feedback collection
- [ ] Performance monitoring
- [ ] Document any edge cases found

### Week 2
- [ ] Weekly metrics comparison
- [ ] User satisfaction survey
- [ ] Performance analysis
- [ ] Optimization opportunities

### Month 1
- [ ] Monthly review meeting
- [ ] Document lessons learned
- [ ] Update documentation if needed
- [ ] Archive deployment artifacts

---

## 📈 Success Metrics

| Metric | Before | After | Target | Status |
|--------|--------|-------|--------|--------|
| Dashboard Count | 929 | _____ | 950 | [ ] |
| Count Accuracy | 97.8% | _____ | 100% | [ ] |
| Filter Accuracy | 85% | _____ | 100% | [ ] |
| Data Loss | 0 | _____ | 0 | [ ] |
| User Complaints | _____ | _____ | 0 | [ ] |
| Error Rate | _____ | _____ | <0.1% | [ ] |

---

## 🎉 Deployment Complete!

- [ ] All checklists completed
- [ ] All sign-offs obtained
- [ ] No critical issues
- [ ] Documentation updated
- [ ] Stakeholders notified
- [ ] Deployment artifacts archived

**Deployment Status:** [ ] SUCCESS [ ] PARTIAL [ ] FAILED

**Final Notes:**
_________________________________________
_________________________________________
_________________________________________

---

**Date Completed:** _________  
**Final Approver:** _________  
**Archive Location:** _________
