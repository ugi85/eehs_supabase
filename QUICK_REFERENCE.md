# 🚨 QUICK REFERENCE - Emergency Database Switch

## 📍 Situation: Supabase Down, Can't Login

## ✅ Solution in 3 Steps

### **STEP 1: Access Emergency Page**
```
Open in browser:
http://localhost:5173/emergency-switch
```

**OR Click DB button in navbar**

### **STEP 2: Select Database**
```
Select: Google Sheets (Apps Script)
```

### **STEP 3: Click Switch**
```
Click: "Switch to Google Sheets"
Wait for page reload
```

✅ **Done!** Dashboard now uses Google Sheets

---

## 🔄 Switch Back to Supabase

```
Same process:
1. Open /emergency-switch
2. Select: Supabase (PostgreSQL)
3. Click: "Switch to Supabase"
4. ✅ Done!
```

---

## 🎯 Alternative Methods

### Method 2: Navbar Button (Quickest)
```
Click red "DB" button in navbar
→ Select database
→ Click switch
```

### Method 3: Console (Developer)
```
Press F12
Go to Console tab
Paste one of these:

// To Google Sheets:
import {useSettingsStore} from '@/stores/settings'
useSettingsStore().switchToGoogleSheets()
window.location.reload()

// To Supabase:
useSettingsStore().switchToSupabase()
window.location.reload()
```

---

## ✨ Key Points

✅ **No login required**  
✅ **Works immediately**  
✅ **Google Sheets endpoints ready**  
✅ **Auto reload after switch**  
✅ **Can switch back anytime**  

---

## 📊 What Changes

**When switch to Google Sheets:**
- Dashboard data ← Google Sheets
- All APIs ← Google Apps Script
- Supabase ← Ignored
- ✅ System works normally

**When switch to Supabase:**
- Dashboard data ← Supabase
- All APIs ← Supabase
- Google Sheets ← Ignored
- ✅ Back to primary database

---

## 🧪 Verify It Worked

**In browser console:**
```javascript
import {useSettingsStore} from '@/stores/settings'
console.log(useSettingsStore().database.type)

// Should show:
// "googleSheets" or "supabase" ✅
```

---

## 📋 Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't access /emergency-switch | Use navbar "DB" button instead |
| Data not loading | Refresh page (F5) or clear cache (Ctrl+Shift+Del) |
| Don't see navbar button | Scroll to top, button is in header |
| Status doesn't change | Check console (F12) for errors |
| Stuck on old database | Hard reload (Ctrl+Shift+R) |

---

## 🚀 TL;DR

```
Supabase down?
↓
http://localhost:5173/emergency-switch
↓
Select database
↓
Click switch
↓
✅ Done!
```

**That's it! No login needed.** 🎉

---

**Last Updated**: June 2026  
**Status**: ✅ Production Ready
