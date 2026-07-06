# Google Sheets Login: Testing & Debugging Guide

**Status**: ✅ Enhanced login with better error handling and dual password support

---

## 🎯 What Changed

### Improved Login Logic (`src/api/users.js`)
The login now supports **BOTH**:
1. ✅ Plain text passwords (if Google Sheets has plain text)
2. ✅ SHA-256 hashed passwords (if Google Sheets has hashes)

### Better Debugging
Console now logs:
- Email being checked
- Whether user was found
- Plain text match result
- SHA-256 hash match result
- Which method succeeded
- Any errors that occurred

---

## 🧪 Step-by-Step Testing

### Step 1: Switch to Google Sheets Database
1. Open http://localhost:5174
2. Click red **DB** button in navbar (top-right)
3. OR go to `/emergency-switch`
4. Select **Google Sheets**
5. Click **Confirm/Switch**

**Result**: Page should redirect to dashboard (no login required for emergency switch)

---

### Step 2: Check Your Google Sheets Password Format

**Option A: Plain Text Passwords**
1. Open your Google Sheets user table
2. Look at password column
3. If you see: `password123`, `admin`, `test123` → **Plain text** ✅

**Option B: SHA-256 Hashed Passwords**
1. If you see long hex strings like: `5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8` → **Hashed** ✅

---

### Step 3: Test Login with Debugging

1. **Open app**: http://localhost:5174
2. **Open browser console**: Press **F12**
3. Go to **Console** tab
4. Enter your email and password
5. Click **Sign In**
6. Watch the console for logs

---

## 📊 Expected Console Output

### Successful Login (Plain Text)
```
[useUsers] Login started for: admin@company.com
[users] Attempting Google Sheets login with email: admin@company.com
[users] Endpoint: https://script.google.com/macros/s/AKfycbwvM73cy-gq3xcI...
[users] getByEmail response: {
  success: true,
  user: { id: 'USR001', nama: 'Admin User', email: 'admin@company.com', password: 'password123', ... }
}
[users] User found: {id: 'USR001', nama: 'Admin User', email: 'admin@company.com'}
[users] Plain text match: true ✅
[users] Login successful (plain text match)
[useUsers] Login result: {success: true, message: 'Login berhasil'}
```

### Successful Login (SHA-256 Hashed)
```
[useUsers] Login started for: admin@company.com
[users] Attempting Google Sheets login with email: admin@company.com
[users] getByEmail response: {
  success: true,
  user: { id: 'USR001', nama: 'Admin User', email: 'admin@company.com', password: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', ... }
}
[users] User found: {id: 'USR001', nama: 'Admin User', email: 'admin@company.com'}
[users] Plain text match: false
[users] Input password (SHA-256): a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3
[users] Stored password: a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3
[users] SHA-256 match: true ✅
[users] Login successful (SHA-256 match)
[useUsers] Login result: {success: true, message: 'Login berhasil'}
```

### Failed Login (Email Not Found)
```
[useUsers] Login started for: unknown@company.com
[users] Attempting Google Sheets login with email: unknown@company.com
[users] getByEmail response: {
  success: false
}
[users] User not found for email: unknown@company.com
[useUsers] Login result: {success: false, message: 'Email atau password salah'}
```

### Failed Login (Password Mismatch)
```
[useUsers] Login started for: admin@company.com
[users] User found: {id: 'USR001', nama: 'Admin User', email: 'admin@company.com'}
[users] Plain text match: false
[users] Input password (SHA-256): 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8
[users] Stored password: a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3
[users] SHA-256 match: false ❌
[users] Password verification failed - no match found
[useUsers] Login result: {success: false, message: 'Email atau password salah'}
```

---

## 🔧 Troubleshooting

### Problem: "Email atau password salah" but credentials are correct

**Diagnosis Steps**:

1. **Check email in Google Sheets**
   - Look at the console log: `User found: {id: ..., email: '...'}`
   - Is the email correct? (Check for typos, case sensitivity)

2. **Check password format**
   - What does password look like in Google Sheets?
   - Plain text or hash?

3. **Look at plain text match result**
   - Console shows: `Plain text match: false` or `true`
   - If false and you have plain text passwords → Format mismatch!

4. **Look at SHA-256 match result**
   - Console shows: `SHA-256 match: false` or `true`
   - If false but looks like hash → Hash mismatch!

---

### Solution: Fix Password Format Mismatch

**If credentials are correct but login fails:**

Check what's in Google Sheets password column:

### Option A: Plain Text in Google Sheets, but app expected hash
**Problem**: You stored `password123` in Google Sheets, but app tried to hash it

**Solution**: No code change needed! New code tries both:
- First tries: `user.password === 'password123'` ✅ Plain text match
- If fails, tries: `user.password === sha256('password123')` ✅ Hash match

So it should work now!

### Option B: Hash in Google Sheets, but entered wrong password
**Problem**: You stored the hash of `password123`, but entered `password1234` or `Password123`

**Solution**: 
- Double-check your password - must match exactly
- Password is case-sensitive: `Admin` ≠ `admin`
- No extra spaces

### Option C: User email doesn't exist in Google Sheets
**Problem**: The email doesn't exist in Google Sheets

**Solution**:
- Check email in Google Sheets (exact spelling)
- Add the user if missing
- Check for typos or extra spaces

---

## 🧮 Generate Test SHA-256 Hashes

**To create hashed passwords for testing:**

1. Open browser console (F12)
2. Paste this:

```javascript
const hashPassword = async (password) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Generate hashes for your passwords
hashPassword('password123').then(h => console.log('password123:', h))
hashPassword('admin').then(h => console.log('admin:', h))
hashPassword('test123').then(h => console.log('test123:', h))
```

3. Copy the hashes into your Google Sheets password column

---

## ✅ Verification Checklist

### Before Testing
- [ ] App running on http://localhost:5174
- [ ] Switched to Google Sheets database
- [ ] Browser console open (F12)
- [ ] Google Sheets tab open in another window

### During Testing
- [ ] Checked email format in Google Sheets
- [ ] Confirmed password format (plain text or hash)
- [ ] Entered correct email and password
- [ ] Watched console logs for any errors
- [ ] Identified which match method succeeded

### After Testing
- [ ] Login successful ✅ OR
- [ ] Identified the specific password format issue
- [ ] Fixed the issue in Google Sheets or code
- [ ] Retested and confirmed working

---

## 🎯 Common Test Cases

### Test Case 1: Plain Text Password
```
Sheet:
  Email: admin@company.com
  Password: admin123

Login:
  Email: admin@company.com
  Password: admin123
  
Expected Result: ✅ Success (plain text match)
Console Shows: [users] Plain text match: true
```

### Test Case 2: SHA-256 Hashed Password
```
Sheet:
  Email: user@company.com
  Password: 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918

Login:
  Email: user@company.com
  Password: admin
  
Expected Result: ✅ Success (SHA-256 of "admin")
Console Shows: [users] SHA-256 match: true
```

### Test Case 3: Wrong Password
```
Sheet:
  Email: admin@company.com
  Password: admin123

Login:
  Email: admin@company.com
  Password: wrongpassword
  
Expected Result: ❌ Failed
Console Shows: [users] Plain text match: false
                [users] SHA-256 match: false
```

### Test Case 4: Wrong Email
```
Sheet:
  Email: admin@company.com

Login:
  Email: wrong@company.com
  Password: admin123
  
Expected Result: ❌ Failed (user not found)
Console Shows: [users] User not found for email: wrong@company.com
```

---

## 📝 Debug Log Reference

| Log Message | Meaning | Status |
|-------------|---------|--------|
| `Attempting Google Sheets login` | Login started | ℹ️ Info |
| `User found: {id, nama, email}` | Email exists in sheet | ✅ Good |
| `User not found for email` | Email doesn't exist | ❌ Problem |
| `Plain text match: true` | Password matches as plain text | ✅ Success |
| `Plain text match: false` | Not a plain text match | ℹ️ Trying hash next |
| `SHA-256 match: true` | Password matches hash | ✅ Success |
| `SHA-256 match: false` | Neither method matched | ❌ Wrong password |
| `Login successful` | Login worked! | ✅ Success |
| `Login error` | Exception occurred | ❌ Error |

---

## 🚀 Next Steps

1. **Test with your actual Google Sheets credentials**
   - Open console (F12)
   - Try to login
   - Watch console logs
   - Share logs if issues

2. **If login fails**:
   - Check console logs (what's the problem?)
   - Verify email in Google Sheets
   - Verify password format
   - Update password format if needed

3. **If login works**:
   - Dashboard should load
   - All menus should work (Daftar Alat, Jadwal, etc.)
   - Try switching back to Supabase
   - Test other features

---

## 📞 Need Help?

Share these details if login still fails:
1. Screenshot of console logs (F12)
2. What you see in Google Sheets password column
3. The email you're trying to login with
4. The password you're using (don't share the actual password, just describe format)

---

**Last Updated**: June 25, 2026  
**Status**: ✅ Ready for testing

