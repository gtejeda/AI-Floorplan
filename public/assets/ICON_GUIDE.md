# Application Icons Guide

This directory should contain the application icons for Windows, macOS, and other platforms.

## Required Files

### 1. icon.ico (Windows)
- **Format**: ICO file with multiple sizes
- **Sizes**: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256
- **Used for**: Windows executable, taskbar, file explorer

### 2. icon.icns (macOS)
- **Format**: ICNS file with multiple sizes
- **Sizes**: 16x16, 32x32, 128x128, 256x256, 512x512, 1024x1024 (with @2x retina variants)
- **Used for**: macOS app bundle, Dock, Finder

### 3. icon.png (Linux/Web)
- **Format**: PNG
- **Size**: 512x512 or 1024x1024
- **Used for**: Linux desktop, web favicon

## Quick Creation Guide

### Method 1: Using Online Tools (Easiest)

1. **Create master design** (1024x1024 PNG)
   - Simple, recognizable design
   - Use high contrast colors
   - Test at 16x16 to ensure it's readable

2. **Convert to ICO**:
   - Visit: https://icoconvert.com/
   - Upload your PNG
   - Select all sizes (16-256)
   - Download and save as `icon.ico`

3. **Convert to ICNS**:
   - Visit: https://cloudconvert.com/png-to-icns
   - Upload your PNG
   - Download and save as `icon.icns`

### Method 2: Using ImageMagick (Command Line)

```bash
# Install ImageMagick
# Windows: choco install imagemagick
# macOS: brew install imagemagick
# Linux: sudo apt-get install imagemagick

# Create ICO
magick convert icon-1024.png -define icon:auto-resize="256,128,64,48,32,16" icon.ico

# For ICNS, use on macOS:
# Create iconset
mkdir icon.iconset
sips -z 16 16     icon-1024.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon-1024.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon-1024.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon-1024.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon-1024.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon-1024.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon-1024.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon-1024.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon-1024.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon-1024.png --out icon.iconset/icon_512x512@2x.png

# Convert to ICNS
iconutil -c icns icon.iconset -o icon.icns
```

### Method 3: Using Electron-Icon-Builder (Cross-Platform)

```bash
# Install
npm install -g electron-icon-builder

# Create both ICO and ICNS from single PNG
electron-icon-builder --input=icon-1024.png --output=./ --flatten
```

## Design Recommendations

### Concept Ideas

**Option 1: House + Grid**
```
┌─────────────┐
│   ┌─┬─┐     │
│   │ │ │ 🏠  │  <- Simple house with subdivision grid
│   ├─┼─┤     │
│   │ │ │     │
│   └─┴─┘     │
└─────────────┘
```

**Option 2: MV Monogram**
```
┌─────────────┐
│             │
│     M V     │  <- Professional monogram
│    ╱ ╲      │
│             │
└─────────────┘
```

**Option 3: Villa Silhouette**
```
┌─────────────┐
│  ▲ ▲  ▲     │
│  │ │  │     │  <- Modern villa outline
│  └─┴──┘     │
│  └────┘     │
└─────────────┘
```

### Color Palette Suggestions

**Option 1: Professional Blue**
- Primary: #2C3E50 (Dark Blue)
- Accent: #3498DB (Bright Blue)
- Background: White or gradient

**Option 2: Real Estate Green**
- Primary: #27AE60 (Green)
- Accent: #F39C12 (Orange)
- Background: White

**Option 3: Modern Gradient**
- Gradient: #667eea → #764ba2
- Text: White
- Clean, modern look

## Placeholder Icons (Temporary)

If you need to build immediately without custom icons, you can use these placeholder commands:

### Create Simple Placeholder

```bash
# On macOS/Linux
# Create 1024x1024 colored square
magick -size 1024x1024 xc:#3498DB -gravity center -pointsize 200 -fill white -annotate +0+0 "MV" icon.png

# Convert to formats
magick convert icon.png -define icon:auto-resize="256,128,64,48,32,16" icon.ico

# On Windows (PowerShell)
# Download a free icon pack from:
# https://icon-icons.com/
# https://www.flaticon.com/
```

## Testing Icons

### Windows
```powershell
# View ICO in explorer
explorer.exe icon.ico

# Check sizes
Get-ChildItem icon.ico | Select-Object Name, Length
```

### macOS
```bash
# View ICNS
open icon.icns

# Check sizes
iconutil -c iconset icon.icns -o icon.iconset
ls -lh icon.iconset/
```

## Additional Assets (Optional)

### DMG Background (macOS Installer)
- **File**: dmg-background.png
- **Size**: 660x400 pixels
- **Purpose**: Custom background for DMG installer window
- **Design**: Show drag-to-Applications instruction

### Install Spinner (Windows Installer)
- **File**: install-spinner.gif
- **Size**: 150x150 pixels
- **Purpose**: Animated spinner during Windows installation
- **Duration**: 1-2 seconds loop

## Resources

### Free Icon Tools
- **Inkscape**: Vector graphics (free)
- **GIMP**: Raster graphics (free)
- **Figma**: Web-based design (free tier)
- **Canva**: Simple designs (free tier)

### Free Icon Templates
- **Electron Icon Template**: https://github.com/electron/electron/blob/main/docs/images/icon.png
- **macOS Icon Template**: https://developer.apple.com/design/resources/
- **Windows Icon Guidelines**: https://learn.microsoft.com/en-us/windows/apps/design/style/iconography/app-icon-construction

### Commercial Icon Services
- **Fiverr**: Custom icon design ($5-$50)
- **99designs**: Professional design contests
- **Upwork**: Freelance designers

## Next Steps

1. Create your master 1024x1024 PNG icon
2. Convert to ICO and ICNS formats
3. Place files in this directory:
   - `public/assets/icon.ico`
   - `public/assets/icon.icns`
   - `public/assets/icon.png`
4. Run `npm run build` to package with your icons

## Need Help?

If you need assistance creating icons, consider:

1. **Hire a designer** on Fiverr (quick, affordable)
2. **Use AI generation** (DALL-E, Midjourney, Stable Diffusion)
3. **Use icon libraries** (Font Awesome, Material Icons adapted)
4. **Post on design communities** (r/forhire, Dribbble)

---

**Note**: The build will work without custom icons (using defaults), but custom icons are highly recommended for professional distribution.
