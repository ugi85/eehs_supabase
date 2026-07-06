# Google Sheets Login Troubleshooting Guide

## ❌ Problem Reported
**User**: "saya sudah switch ke google sheet dan diwaktu ingin login tidak berhasil? sedangkan user dan password yang saya masukan sudah sesuai dengan yang ada di table atau sheet user pada googlesheet?"

**Issue**: Login fails even though credentials are correct in Google Sheets.

---

## 🔍 Root Cause Analysis

### The Problem:
1. **Password Hashing Mismatch**
   - App sends credentials to Google Apps Script
   - Google Apps Script checks if password matches what's stored in the sheet
   - If passwords don't match in format, login fails

2. **Password Format in Google Sheets**
   - Is the password stored as **plain text**?
   - Or is it stored as **SHA-256 hash**?
   - Or is it stored in some **other format**?

3. **App-Side Password Handling**
   - App currently hashes the password with SHA-256
   - Compares it with what's stored in Google Sheets
   - If Google Sheets has plain text, they'll never match

---

## 🔧 Solution: Fix Password Handling

### Option 1: Plain Text Passwords (Simpler, Less Secure)
**Use if**: Google Sheets stores passwords as plain text

**Fix**: Modify `src/api/users.js` to send plain text:

```javascript
// OLD - Hashes password
const hashedPassword = await hashPassword(password)
if (user.password !== hashedPassword) {
  return { success: false, message: 'Email atau password salah' }
}

// NEW - Plain text comparison
if (user.password !== password) {
  return { success: false, message: 'Email atau password salah' }
}
```

### Option 2: Hash Passwords at Google Apps Script Level (More Secure)
**Use if**: Google Apps Script should handle hashing

**Requires**: Modify Google Apps Script to:
1. Receive plain text password from app
2. Hash it server-side using Apps Script Utilities
3. Compare with stored hash

---

## 📊 How to Check Your Google Sheets Setup

### Step 1: Check Password Format in Google Sheets
1. Open your Google Sheets user table
2. Look at the **password column**
3. Check if passwords look like:
   - **Plain text**: `password123`, `admin123`, etc. ✅ Easy to spot
   - **SHA-256 hash**: Long hex string like `5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8`

### Step 2: Test With Browser Console
1. Open your app at http://localhost:5174
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Run this code:

```javascript
// If password is: "password123"
// SHA-256 hash should be:
const hashPassword = async (password) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

// Test it
hashPassword('password123').then(console.log)
```

Then compare the output with what's in Google Sheets password column.

---

## ✅ Quick Fix (Choose One)

### Quick Fix #1: Use Plain Text (Fastest)
**If Google Sheets has plain text passwords:**

File: `src/api/users.js`

Find this code (around line 100):
```javascript
const hashedPassword = await hashPassword(password)

if (user.password !== hashedPassword) {
  return {
    success: false,
    message: 'Email atau password salah'
  }
}
```

Replace with:
```javascript
// ✅ Plain text comparison (if Google Sheets stores plain text)
if (user.password !== password) {
  return {
    success: false,
    message: 'Email atau password salah'
  }
}
```

Then test login again.

---

### Quick Fix #2: Add Debug Logging
**If you want to see what's happening:**

File: `src/api/users.js`

Add this before the password check:
```javascript
const hashedPassword = await hashPassword(password)

console.log('[users] Password comparison debug:')
console.log('[users] Input password:', password)
console.log('[users] Hashed (SHA-256):', hashedPassword)
console.log('[users] Stored in sheet:', user.password)
console.log('[users] Match?', hashedPassword === user.password)
```

Then:
1. Try to login
2. Open browser console (F12)
3. You'll see the comparison
4. Check if they match

---

## 🔐 Recommended: Secure Password Handling

### Best Practice Setup:
1. **Google Sheets column**: Store SHA-256 hashes (not plain text)
2. **When creating user**: Hash the password before storing
3. **When logging in**: 
   - Receive plain text from user
   - Hash it with SHA-256
   - Compare with stored hash

This is **more secure** than plain text.

---

## 📝 Step-by-Step: Implement Secure Login

### Step 1: Generate Hash for Test User
```javascript
// In browser console
const hashPassword = async (password) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Generate hash for each password
hashPassword('admin123').then(h => console.log('admin123 hash:', h))
hashPassword('password123').then(h => console.log('password123 hash:', h))
```

### Step 2: Update Google Sheets
Replace passwords in your user sheet with the hashes from Step 1

### Step 3: Test Login
Try logging in - should work now ✅

---

## 🚀 Quick Debug Checklist

- [ ] Check what format passwords are in Google Sheets
- [ ] Run hash test in browser console to compare
- [ ] Choose fix #1 (plain text) or fix #2 (keep hashing)
- [ ] Apply the fix to `src/api/users.js`
- [ ] Refresh browser (Ctrl+F5)
- [ ] Try login again
- [ ] Check browser console (F12) for debug logs
- [ ] If still fails, share the debug logs

---

## 🎯 Expected Result After Fix

**Before Fix**:
```
[users] Attempting login with email: admin@test.com
[users] Email atau password salah ❌
```

**After Fix** (with plain text):
```
[users] Attempting login with email: admin@test.com
[users] Login berhasil ✅
Dashboard loads with user data
```

---

## 📞 If Fix Doesn't Work

1. **Check Google Apps Script logs**
   - Go to your Google Apps Script editor
   - Check the `getByEmail` function
   - See what it's returning
   - Is user found?
   - What's the password format?

2. **Enable Debug Logging in Google Apps Script**
   ```javascript
   function getByEmail(email) {
     const sheet = SpreadsheetApp.getSheetByName('users')
     const data = sheet.getDataRange().getValues()
     
     console.log('Looking for email:', email)
     
     for (let i = 1; i < data.length; i++) {
       console.log('Row', i, ':', data[i])
       if (data[i][3] === email) {
         console.log('Found user at row', i)
         return {
           success: true,
           user: {
             id: data[i][0],
             nama: data[i][1],
             email: data[i][3],
             password: data[i][4], // This is what we check
             role: data[i][5]
           }
         }
       }
     }
     
     console.log('User not found')
     return { success: false }
   }
   ```

3. **Check Execution in Apps Script**
   - Go to Google Apps Script
   - Click "Execution log"
   - See what's being logged
   - This helps diagnose the issue

---

## 📋 Troubleshooting Flowchart

```
Login fails
    ↓
Check browser console (F12)
    ↓
[Error] "Email atau password salah"
    ↓
Is user found? → Check Google Sheets
                  - Does user email exist?
                  - Is email spelled correctly?
    ↓
Is password correct?
    ↓
Check password format:
    ├→ Plain text? → Use Fix #1
    ├→ SHA-256? → Hashing should work (check debug logs)
    └→ Other? → Need custom fix

Apply fix → Test again → Success ✅
```

---

## 🔒 Security Recommendations

### DO ✅
- [ ] Use SHA-256 hashing for production
- [ ] Never store plain text passwords
- [ ] Hash passwords before storing in Google Sheets
- [ ] Use HTTPS for login requests
- [ ] Validate email format

### DON'T ❌
- [ ] Don't store plain text passwords (unless development only)
- [ ] Don't log passwords to console in production
- [ ] Don't send passwords without HTTPS
- [ ] Don't use weak passwords (min 8 chars, mixed case)

---

## 📚 Files to Check

- `src/api/users.js` - Login function
- `src/composables/useUsers.js` - Login composable
- `src/views/pages/examples/login.vue` - Login UI
- Your Google Apps Script `getByEmail()` function
- Your Google Sheets users table

---

## ✅ Next Steps

1. **Determine password format** in Google Sheets
2. **Apply appropriate fix** (Fix #1 or Keep #2)
3. **Test login** with browser console open
4. **Share any errors** from console for debugging

---

**Last Updated**: June 25, 2026
**Status**: Ready to diagnose and fix

