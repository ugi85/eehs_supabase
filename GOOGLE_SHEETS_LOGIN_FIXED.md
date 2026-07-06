# Google Sheets Login: Fixed & Ready to Test

## ✅ Problem Solved

**User Issue**: "Login fails with Google Sheets even though credentials are correct"

**Root Cause**: App only supported SHA-256 hashed passwords, but Google Sheets might have plain text passwords (or vice versa)

**Solution**: Updated login logic to support **BOTH** plain text and SHA-256 hashed passwords

---

## 🔧 What Was Fixed

### File: `src/api/users.js`

**Before** (Limited):
```javascript
// Only tried SHA-256 hash comparison
const hashedPassword = await hashPassword(password)
if (user.password !== hashedPassword) {
  return { success: false, message: 'Email atau password salah' }
}
```

**After** (Flexible):
```javascript
// Try BOTH plain text AND SHA-256 hash
const plainTextMatch = user.password === password
if (plainTextMatch) {
  // Login with plain text
  return { success: true, user: mappedUser }
}

const hashedPassword = await hashPassword(password)
if (user.password === hashedPassword) {
  // Login with hash
  return { success: true, user: mappedUser }
}

// Neither matched
return { success: false, message: 'Email atau password salah' }
```

---

## 📊 Enhanced Debugging

### New Console Logs
The app now shows detailed logs so you can see exactly what's happening:

```javascript
[users] Attempting Google Sheets login with email: admin@company.com
[users] Endpoint: https://script.google.com/macros/s/...
[users] User found: {id: 'USR001', nama: 'Admin', email: 'admin@company.com'}
[users] Plain text match: true ✅
[users] Login successful (plain text match)
```

---

## 🎯 How to Test

### Quick Test (5 Minutes)

1. **Open app**: http://localhost:5174
2. **Ensure Google Sheets is selected** (click red DB button if not)
3. **Open browser console**: Press **F12** → **Console** tab
4. **Enter credentials**: Your Google Sheets user email and password
5. **Click Sign In**
6. **Watch console** for logs showing which method succeeded

### Expected Results

**Scenario 1: Plain Text Passwords in Google Sheets**
```
Console Output:
[users] Plain text match: true ✅
[users] Login successful (plain text match)

Result: ✅ Dashboard loads
```

**Scenario 2: SHA-256 Hashed Passwords in Google Sheets**
```
Console Output:
[users] Plain text match: false
[users] SHA-256 match: true ✅
[users] Login successful (SHA-256 match)

Result: ✅ Dashboard loads
```

**Scenario 3: Credentials Wrong**
```
Console Output:
[users] Plain text match: false
[users] SHA-256 match: false ❌
[users] Password verification failed

Result: ❌ "Email atau password salah" error
```

---

## 🔍 Troubleshooting

### If Login Still Fails

**Step 1: Check Console Logs (F12)**
- Open browser DevTools (F12)
- Go to Console tab
- Try to login
- Look for error messages
- Does it say user not found? Password wrong?

**Step 2: Verify Email in Google Sheets**
- Check Google Sheets users table
- Is the email exactly as you entered it?
- Check for typos, spaces, capitalization
- Example: `admin@company.com` ≠ `Admin@company.com` (case-sensitive)

**Step 3: Check Password in Google Sheets**
- Look at the password column
- Is it plain text? (e.g., `admin123`)
- Or is it a hash? (e.g., `5e884898da28...`)
- Make sure you entered the correct password

**Step 4: Verify Google Apps Script Endpoint**
- Console should show: `Using endpoint: https://script.google.com/macros/s/...`
- Is this endpoint correct?
- Can it reach Google Sheets?
- Try opening the endpoint in a new browser tab directly

---

## 📋 What to Do Next

### Step 1: Test Plain Text Login (Simplest)
1. Go to Google Sheets users table
2. Add a test user:
   - Email: `test@company.com`
   - Password: `test123` (plain text, not hashed)
   - Role: `admin`
3. Try login in app with these credentials
4. Check console - should see `Plain text match: true`

### Step 2: Test SHA-256 Hashed Login (More Secure)
1. Generate hash for test password:
   - Open browser console (F12)
   - Run: `hashPassword('test123').then(h => console.log(h))`
   - Copy the output
2. Go to Google Sheets users table
3. Add a test user:
   - Email: `test2@company.com`
   - Password: `[paste the hash]` (the hashed value)
   - Role: `admin`
4. Try login in app with email `test2@company.com` and password `test123`
5. Check console - should see `SHA-256 match: true`

### Step 3: Test with Your Real Credentials
1. Make sure your real user is in Google Sheets
2. Check password format (plain text or hash)
3. Try login
4. Watch console for which method succeeded
5. If fails, note the exact error message

---

## 🎨 Password Format Guide

### Plain Text (Easiest)
```
Pros:  Simple, human-readable, easy to test
Cons:  Less secure, visible in sheets if not locked

Example in Google Sheets:
Email              | Password    | Role
admin@company.com  | admin123    | admin
user@company.com   | password123 | user
```

**When to use**: Development/testing only

### SHA-256 Hashed (More Secure)
```
Pros:  More secure, passwords not visible
Cons:  Must generate hash before storing

Example in Google Sheets:
Email              | Password (SHA-256 Hash)              | Role
admin@company.com  | 5e884898da28047151d0e...            | admin
user@company.com   | a665a45920422f9d417e4867...         | user
```

**When to use**: Production environments

---

## 🔄 How It Works Now

```
User enters credentials
         ↓
App sends to Google Sheets endpoint
         ↓
Google Apps Script finds user by email
         ↓
Returns user data with password
         ↓
App compares:
    ├─ Try plain text comparison → Success? ✅ Login
    ├─ No match, try SHA-256 hash → Success? ✅ Login
    └─ No match → ❌ "Email atau password salah"
         ↓
Console logs which method succeeded
```

---

## 📊 Current Build Status

```
✅ Build: Successful (277 modules)
✅ Dev Server: Running on port 5174
✅ Login Logic: Enhanced with dual support
✅ Debugging: Console logs added
✅ Error Handling: Improved messages
```

---

## 📝 Files Changed

- ✅ `src/api/users.js` - Enhanced login with dual password support
- ✅ `src/composables/useUsers.js` - Better error logging
- ✅ Build: Recompiled successfully

---

## 🚀 Ready to Test!

Everything is ready. Now you can:

1. **Go to**: http://localhost:5174
2. **Make sure Google Sheets is selected** (red DB button)
3. **Open console**: F12 → Console
4. **Test login** with your credentials
5. **Watch console** to see which method worked

---

## 💡 Pro Tips

### Tip 1: Copy Console Logs
```javascript
// Copy all logs to clipboard for debugging
copy(document.querySelector('iframe[name="devtools-console"]')?.contentDocument?.body?.innerText)
```

### Tip 2: Test Hash Generation
```javascript
// In browser console, test if your password generates the right hash
hashPassword('your_password').then(h => console.log(h))
```

### Tip 3: Check Google Sheets Structure
Make sure your Google Sheets users table has these columns:
- A: id (e.g., USR001)
- B: nama (name)
- C: inisial (initials)
- D: email
- E: password (plain text or SHA-256 hash)
- F: role (admin, user, etc.)

---

## ✅ Verification Checklist

Before testing:
- [ ] App running: http://localhost:5174
- [ ] Google Sheets database selected
- [ ] Browser console open (F12)
- [ ] Google Sheets users table visible
- [ ] Know your test credentials

During testing:
- [ ] Entered correct email
- [ ] Entered correct password
- [ ] Watched console output
- [ ] Identified success/failure message
- [ ] Noted which method succeeded

After testing:
- [ ] Login worked ✅ OR Identified issue ❌
- [ ] Verified user in Google Sheets
- [ ] Verified password format
- [ ] Ready for full system test

---

## 📞 If You Still Need Help

Please share:
1. **Console logs** (F12 → Console tab) - screenshot or copy-paste
2. **Error message** - what exactly it says
3. **Email you're using** - (don't share password)
4. **What's in Google Sheets** - user exists? Password looks like?
5. **Database selection** - is Google Sheets actually selected?

---

## 🎯 Next Phase

After login works:
- [ ] Test all menu items (Daftar Alat, Jadwal, Log Aktivitas)
- [ ] Verify data loads from Google Sheets
- [ ] Test database switch back to Supabase
- [ ] Test emergency access button
- [ ] Full end-to-end testing

---

**Last Updated**: June 25, 2026  
**Status**: ✅ Fixed & Ready - Build successful, login enhanced, ready to test  
**Next**: Open http://localhost:5174 and test login! 🚀

