# Quick Reference: Google Sheets Login Testing

## 🚀 Mulai di Sini (Start Here)

### 1️⃣ Buka App
```
http://localhost:5174
```

### 2️⃣ Pastikan Google Sheets Dipilih
- Klik tombol merah **DB** di navbar (top-right)
- Pilih **Google Sheets**
- Klik **Confirm**

### 3️⃣ Buka Browser Console
- Tekan **F12**
- Klik tab **Console**

### 4️⃣ Login
- Email: `[email dari Google Sheets]`
- Password: `[password dari Google Sheets]`
- Klik **Sign In**

### 5️⃣ Lihat Console
- Cari logs yang mengatakan apakah login berhasil atau gagal
- `Plain text match: true` = Plain text password matched ✅
- `SHA-256 match: true` = Hashed password matched ✅
- `Password verification failed` = Salah password ❌

---

## 📊 Expected Outputs

### ✅ SUCCESS - Plain Text
```
[users] Plain text match: true ✅
[users] Login successful (plain text match)
→ Dashboard should load
```

### ✅ SUCCESS - SHA-256
```
[users] SHA-256 match: true ✅
[users] Login successful (SHA-256 match)
→ Dashboard should load
```

### ❌ FAIL - Password Wrong
```
[users] Plain text match: false
[users] SHA-256 match: false ❌
[users] Password verification failed - no match found
→ "Email atau password salah" error
```

### ❌ FAIL - User Not Found
```
[users] User not found for email: ...
→ "Email atau password salah" error
```

---

## 🔧 Troubleshooting Quick Fixes

| Problem | Check | Fix |
|---------|-------|-----|
| User not found | Google Sheets email | Exact spelling, case, no spaces |
| Password wrong | Google Sheets password | Correct password, case-sensitive |
| Neither matches | Password format | Is it plain text or hash in sheet? |
| Console errors | Network tab (F12) | Can endpoint be reached? |

---

## 🧮 Test With Hash

**Generate SHA-256 hash for testing:**

1. Open console (F12 → Console)
2. Run:
```javascript
// Generates hash for "test123"
hashPassword('test123').then(h => console.log('Hash:', h))
```

3. Copy the hash output
4. Put this hash in Google Sheets password column
5. Test login with password `test123`

---

## 📋 Password Formats

**Plain Text Example:**
```
Email: admin@company.com
Password: admin123
```

**SHA-256 Hash Example:**
```
Email: admin@company.com
Password: 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8
        (this is the hash of "admin")
```

---

## ✅ What Should Happen

```
1. Switch to Google Sheets ✓
2. Try login ✓
3. See console logs ✓
4. If success: Dashboard loads ✓
5. If fail: Check error in console ✓
6. Fix in Google Sheets ✓
7. Try again ✓
```

---

## 📞 For Support

If stuck:
1. Take screenshot of **console logs** (F12)
2. Check **Google Sheets** user table
3. Verify **email & password** are correct
4. Share logs and we'll debug

---

**Status**: ✅ Ready to test!  
**Next**: Go to http://localhost:5174 and try login 🎯

