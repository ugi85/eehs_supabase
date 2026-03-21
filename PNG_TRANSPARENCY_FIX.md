# PNG Transparency Fix

## Problem
PNG images with transparent backgrounds were losing transparency after upload, showing black or white background instead.

## Root Cause
The `compressImage()` function was always converting images to JPEG format using:
```javascript
canvas.toDataURL('image/jpeg', quality)
```

JPEG format does not support transparency (alpha channel), so all transparent pixels were converted to solid color.

## Solution Applied

### 1. Updated `compressImage()` Function
**File:** `src/views/settings/config.vue`

**Changes:**
- ✅ Detect original file format (PNG, JPEG, WebP)
- ✅ Clear canvas with transparent background before drawing
- ✅ Use appropriate mime type based on original file:
  - PNG → `image/png` (preserves transparency)
  - JPEG → `image/jpeg` (no transparency)
  - WebP → `image/webp` (preserves transparency)
- ✅ Set quality parameter correctly (PNG doesn't use quality)

**Before:**
```javascript
const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
```

**After:**
```javascript
// Clear canvas with transparent background
ctx.clearRect(0, 0, width, height)

// Detect file type
let mimeType = 'image/jpeg'
if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
  mimeType = 'image/png'
  compressQuality = 1 // PNG doesn't use quality
}

const compressedDataUrl = canvas.toDataURL(mimeType, compressQuality)
```

### 2. Updated Upload Functions
**Files:** `handleLogoUpload()` and `handleCompanyLogoUpload()`

**Changes:**
- ✅ Extract mime type from compressed dataURL
- ✅ Use detected mime type when creating File object

**Before:**
```javascript
const compressedFile = new File([blob], file.name, { type: 'image/jpeg' })
```

**After:**
```javascript
// Detect mime type from dataURL
const mimeMatch = compressedDataUrl.match(/^data:([^;]+);/)
const mimeType = mimeMatch ? mimeMatch[1] : 'image/png'

const compressedFile = new File([blob], file.name, { type: mimeType })
```

## Supported Formats

| Format | Transparency | Compression | Quality Parameter |
|--------|--------------|-------------|-------------------|
| PNG | ✅ Yes | Lossless | Not used (always 1) |
| JPEG | ❌ No | Lossy | 0.0 - 1.0 (default 0.8) |
| WebP | ✅ Yes | Both | 0.0 - 1.0 (default 0.8) |

## Testing

### Test PNG with Transparency
1. Prepare a PNG image with transparent background
2. Open Konfigurasi Sistem page
3. Upload the PNG as logo sistem
4. Check preview - transparency should be preserved
5. Check sidebar - logo should have transparent background
6. Check favicon - should preserve transparency

### Test JPEG (No Transparency)
1. Upload a JPEG image
2. Should work as before (no transparency expected)
3. File size should be smaller than PNG

### Test WebP (If Supported)
1. Upload a WebP image with transparency
2. Transparency should be preserved
3. File size should be smaller than PNG

## File Size Comparison

Example with 1000x1000px logo:

| Format | Original | Compressed (800x600) | Transparency |
|--------|----------|---------------------|--------------|
| PNG | 500 KB | ~200 KB | ✅ Yes |
| JPEG | 200 KB | ~50 KB | ❌ No |
| WebP | 150 KB | ~40 KB | ✅ Yes |

## Browser Compatibility

All modern browsers support:
- ✅ PNG transparency
- ✅ JPEG compression
- ✅ Canvas API
- ⚠️ WebP (95%+ browsers, IE not supported)

## Recommendations

1. **For logos with transparency:** Use PNG format
2. **For photos without transparency:** Use JPEG format (smaller file size)
3. **For modern browsers:** Consider WebP (best compression + transparency)

## Notes

- PNG compression is lossless, so quality parameter is ignored
- Transparent areas in PNG are preserved during resize
- Canvas `clearRect()` ensures transparent background before drawing
- Base64 encoding preserves all image data including alpha channel
