# MicroVillas Investment Platform - Distribution Guide

**Version**: 1.0.0
**Date**: 2026-01-11

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Application Icons](#application-icons)
3. [Building for Production](#building-for-production)
4. [Packaging for Windows](#packaging-for-windows)
5. [Packaging for macOS](#packaging-for-macos)
6. [Code Signing](#code-signing)
7. [Testing the Packages](#testing-the-packages)
8. [Distribution](#distribution)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

**For Windows builds:**
- Node.js 22.20.0+ (must match development version)
- npm 10+
- Windows 10+ (for building Windows installers)
- Visual Studio Build Tools (for native modules)

**For macOS builds:**
- Node.js 22.20.0+
- npm 10+
- macOS 10.15+ (Catalina or later)
- Xcode Command Line Tools
- Apple Developer account (for code signing)

### Environment Variables (Optional but Recommended)

For macOS code signing and notarization:
```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="YOUR_TEAM_ID"
export APPLE_IDENTITY="Developer ID Application: Your Name (TEAM_ID)"
```

For Windows code signing:
```bash
export WINDOWS_CERTIFICATE_FILE="path/to/certificate.pfx"
export WINDOWS_CERTIFICATE_PASSWORD="your-password"
```

---

## Application Icons

### Icon Requirements

The application requires icons in multiple formats:

| Platform | Format | Sizes Required | File Location |
|----------|--------|----------------|---------------|
| **Windows** | .ico | 16x16, 32x32, 48x48, 64x64, 128x128, 256x256 | `public/assets/icon.ico` |
| **macOS** | .icns | 16x16, 32x32, 128x128, 256x256, 512x512, 1024x1024 | `public/assets/icon.icns` |
| **Linux** | .png | 512x512 | `public/assets/icon.png` |

### Creating Icons

#### Design Guidelines

**Brand Identity:**
- Use MicroVillas brand colors
- Professional, modern design
- Recognizable at small sizes (16x16)
- Clear silhouette

**Design Tips:**
- Keep it simple - complex designs don't scale down well
- Use a strong central icon with minimal text
- Consider using a house/villa icon with subdivision grid overlay
- Use high contrast colors for visibility

#### Step 1: Create Master Icon (1024x1024)

Use a design tool like:
- **Adobe Illustrator** (vector, best quality)
- **Figma** (free, collaborative)
- **Sketch** (macOS only)
- **GIMP** (free, raster)

**Suggested Design:**
```
┌─────────────────────────┐
│                         │
│      🏠 📐              │
│    MICRO                │
│    VILLAS               │
│                         │
└─────────────────────────┘
```

Example concept:
- Background: Gradient from #2C3E50 to #3498DB
- Icon: White house silhouette with grid overlay
- Text: "MV" initials in modern sans-serif

#### Step 2: Convert to Windows .ico

**Using ImageMagick:**
```bash
magick convert icon-1024.png -define icon:auto-resize="256,128,64,48,32,16" public/assets/icon.ico
```

**Using Online Tool:**
1. Visit https://icoconvert.com/
2. Upload your 1024x1024 PNG
3. Select all sizes (16-256)
4. Download as `icon.ico`
5. Save to `public/assets/icon.ico`

**Using Electron-Icon-Builder:**
```bash
npm install -g electron-icon-builder
electron-icon-builder --input=icon-1024.png --output=public/assets
```

#### Step 3: Convert to macOS .icns

**Using png2icns (macOS only):**
```bash
# Install tool
npm install -g png2icns

# Create icon set
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

# Convert to .icns
iconutil -c icns icon.iconset -o public/assets/icon.icns
```

**Using Electron-Icon-Builder (cross-platform):**
```bash
electron-icon-builder --input=icon-1024.png --output=public/assets --flatten
```

#### Step 4: Create DMG Background (Optional)

Create a custom DMG installer background:

**Size:** 660x400 pixels
**Location:** `public/assets/dmg-background.png`

**Design Guidelines:**
- Modern gradient background
- "Drag to Applications" instruction
- Brand logo
- Minimal text

#### Step 5: Create Install Spinner GIF (Optional)

For Windows installer animation:

**Size:** 150x150 pixels
**Location:** `public/assets/install-spinner.gif`
**Duration:** 1-2 seconds loop

---

## Building for Production

### Step 1: Clean Build

```bash
# Remove old build artifacts
rm -rf out/
rm -rf .vite/

# Clean node_modules (optional but recommended)
rm -rf node_modules/
npm install
```

### Step 2: Run Tests

```bash
# Unit tests
npm run test:unit

# E2E tests (optional, may require display server)
npm run test:e2e

# Linting
npm run lint
```

### Step 3: Build Application

```bash
# Build for current platform
npm run make

# Build for specific platform
npm run make -- --platform=win32   # Windows
npm run make -- --platform=darwin  # macOS
npm run make -- --platform=linux   # Linux
```

**Build Output:**
```
out/
├── make/
│   ├── squirrel.windows/      # Windows installers
│   │   └── x64/
│   │       └── MicroVillasSetup.exe
│   ├── dmg/                   # macOS installers
│   │   └── x64/
│   │       └── MicroVillas Investment Platform.dmg
│   └── zip/                   # Portable archives
│       ├── darwin/
│       │   └── x64/
│       │       └── microvillas-darwin-x64-1.0.0.zip
│       └── win32/
│           └── x64/
│               └── microvillas-win32-x64-1.0.0.zip
└── MicroVillas Investment Platform-darwin-x64/  # Packaged app (macOS)
    └── MicroVillas Investment Platform.app
```

---

## Packaging for Windows

### Standard Build (No Code Signing)

```bash
npm run make -- --platform=win32
```

**Output:**
- `out/make/squirrel.windows/x64/MicroVillasSetup.exe` - Installer
- `out/make/zip/win32/x64/microvillas-win32-x64-1.0.0.zip` - Portable

### With Code Signing

#### Prerequisites

1. **Obtain Code Signing Certificate:**
   - Purchase from certificate authority (DigiCert, Sectigo, etc.)
   - Or use self-signed for testing (NOT for production)

2. **Install Certificate:**
   ```bash
   # Import PFX certificate to Windows certificate store
   # Or set environment variable
   export WINDOWS_CERTIFICATE_FILE="D:/certs/microvillas.pfx"
   export WINDOWS_CERTIFICATE_PASSWORD="your-password"
   ```

#### Update forge.config.js

Add to `packagerConfig`:
```javascript
win32metadata: {
  // ... existing metadata ...
  requested ExecutionLevel: 'asInvoker',
  'application-manifest': path.join(__dirname, 'app-manifest.xml')
}
```

Add to `makers` > `@electron-forge/maker-squirrel` > `config`:
```javascript
certificateFile: process.env.WINDOWS_CERTIFICATE_FILE,
certificatePassword: process.env.WINDOWS_CERTIFICATE_PASSWORD,
signWithParams: `/a /f "${process.env.WINDOWS_CERTIFICATE_FILE}" /p "${process.env.WINDOWS_CERTIFICATE_PASSWORD}" /fd sha256 /tr http://timestamp.digicert.com /td sha256`
```

#### Build Signed Package

```bash
npm run make -- --platform=win32
```

### Testing Windows Installer

```powershell
# Install
.\out\make\squirrel.windows\x64\MicroVillasSetup.exe

# Verify installation
Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* | Where-Object {$_.DisplayName -like "*MicroVillas*"}

# Run application
& "$env:LOCALAPPDATA\MicroVillas\microvillas.exe"

# Uninstall
& "$env:LOCALAPPDATA\MicroVillas\Update.exe" --uninstall
```

---

## Packaging for macOS

### Standard Build (No Code Signing)

```bash
npm run make -- --platform=darwin
```

**Output:**
- `out/make/dmg/x64/MicroVillas Investment Platform.dmg` - Installer
- `out/make/zip/darwin/x64/microvillas-darwin-x64-1.0.0.zip` - Portable

### With Code Signing and Notarization

#### Prerequisites

1. **Apple Developer Account:**
   - Enroll at https://developer.apple.com/programs/
   - Cost: $99/year

2. **Create Developer ID Certificate:**
   - Open Xcode
   - Preferences → Accounts → Manage Certificates
   - Create "Developer ID Application" certificate
   - Or use Keychain Access

3. **Create App-Specific Password:**
   ```bash
   # Visit https://appleid.apple.com/account/manage
   # Generate app-specific password for notarization
   ```

4. **Set Environment Variables:**
   ```bash
   export APPLE_ID="your-apple-id@example.com"
   export APPLE_PASSWORD="xxxx-xxxx-xxxx-xxxx"  # App-specific password
   export APPLE_TEAM_ID="ABCDE12345"
   export APPLE_IDENTITY="Developer ID Application: Your Name (TEAM_ID)"
   ```

#### Build Signed and Notarized Package

```bash
npm run make -- --platform=darwin
```

**Forge will automatically:**
1. Sign the application with your Developer ID
2. Create DMG installer
3. Submit to Apple for notarization
4. Staple notarization ticket to DMG

**This process takes 5-15 minutes.**

#### Manual Notarization (if automatic fails)

```bash
# Sign app
codesign --deep --force --verify --verbose --sign "Developer ID Application: Your Name (TEAM_ID)" --options runtime "out/MicroVillas Investment Platform-darwin-x64/MicroVillas Investment Platform.app"

# Create DMG
hdiutil create -volname "MicroVillas Investment Platform" -srcfolder "out/MicroVillas Investment Platform-darwin-x64" -ov -format UDZO MicroVillas-1.0.0.dmg

# Notarize
xcrun notarytool submit MicroVillas-1.0.0.dmg --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$APPLE_TEAM_ID" --wait

# Staple
xcrun stapler staple MicroVillas-1.0.0.dmg
```

### Testing macOS DMG

```bash
# Mount DMG
hdiutil attach "out/make/dmg/x64/MicroVillas Investment Platform.dmg"

# Verify code signature
codesign --verify --deep --strict --verbose=2 "/Volumes/MicroVillas Investment Platform/MicroVillas Investment Platform.app"

# Check notarization
spctl -a -t exec -vv "/Volumes/MicroVillas Investment Platform/MicroVillas Investment Platform.app"

# Install
cp -R "/Volumes/MicroVillas Investment Platform/MicroVillas Investment Platform.app" /Applications/

# Unmount
hdiutil detach "/Volumes/MicroVillas Investment Platform"

# Run
open "/Applications/MicroVillas Investment Platform.app"
```

---

## Code Signing

### Why Code Sign?

**Benefits:**
- **User Trust**: Users know the software comes from you
- **Security**: Prevents tampering and malware injection
- **Gatekeeper**: macOS allows installation without warnings
- **SmartScreen**: Windows doesn't show "Unknown Publisher" warning

### Windows Code Signing

**Certificate Types:**
- **EV (Extended Validation)**: Best, no SmartScreen warnings immediately
- **OV (Organization Validation)**: Good, builds reputation over time
- **Self-Signed**: Only for testing, will show warnings

**Recommended Providers:**
- DigiCert (premium, EV available)
- Sectigo (good value)
- GlobalSign (reliable)

**Cost:** $100-$500/year

### macOS Code Signing

**Requirements:**
- Apple Developer Program membership ($99/year)
- Developer ID Application certificate
- Notarization for macOS 10.15+

**Process:**
1. Sign app with codesign
2. Submit to Apple for notarization
3. Staple notarization ticket
4. Distribute DMG

---

## Testing the Packages

### Automated Tests

```bash
# Test installer creation (don't install)
npm run make -- --platform=win32 --dry-run

# Verify package structure
tar -tzf out/make/zip/darwin/x64/microvillas-darwin-x64-1.0.0.zip | head -20
```

### Manual Testing Checklist

#### Windows

- [ ] Installer runs without errors
- [ ] App installs to correct location (`%LOCALAPPDATA%\MicroVillas`)
- [ ] Desktop shortcut created (if configured)
- [ ] Start menu entry created
- [ ] App launches successfully
- [ ] All features work (land config, subdivision, export, etc.)
- [ ] Auto-update works (if configured)
- [ ] Uninstaller works cleanly
- [ ] No antivirus false positives

#### macOS

- [ ] DMG mounts correctly
- [ ] Background image displays (if configured)
- [ ] Drag-to-Applications works
- [ ] App opens without Gatekeeper warnings (if notarized)
- [ ] App launches successfully
- [ ] All features work
- [ ] Proper icon in Dock and Finder
- [ ] Quit and reopen preserves state
- [ ] Uninstall removes all files

### Fresh Install Testing

**Windows:**
```powershell
# Clean slate
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\MicroVillas"
Remove-Item -Recurse -Force "$env:APPDATA\microvillas"

# Install
.\MicroVillasSetup.exe /S  # Silent install for testing

# Test
& "$env:LOCALAPPDATA\MicroVillas\microvillas.exe"
```

**macOS:**
```bash
# Clean slate
rm -rf "/Applications/MicroVillas Investment Platform.app"
rm -rf ~/Library/Application\ Support/microvillas
rm -rf ~/Library/Preferences/com.microvillas.investment-platform.plist

# Install
hdiutil attach MicroVillas-1.0.0.dmg
cp -R "/Volumes/MicroVillas Investment Platform/MicroVillas Investment Platform.app" /Applications/
hdiutil detach "/Volumes/MicroVillas Investment Platform"

# Test
open "/Applications/MicroVillas Investment Platform.app"
```

---

## Distribution

### Distribution Channels

#### 1. Direct Download (Recommended for v1.0)

**Host installers on:**
- GitHub Releases (free, reliable)
- Your own website
- Cloud storage (Dropbox, Google Drive, etc.)

**GitHub Releases Setup:**
```bash
# Create release
gh release create v1.0.0 \
  --title "MicroVillas Investment Platform v1.0.0" \
  --notes "First production release" \
  "out/make/squirrel.windows/x64/MicroVillasSetup.exe#Windows Installer" \
  "out/make/dmg/x64/MicroVillas Investment Platform.dmg#macOS Installer" \
  "out/make/zip/win32/x64/microvillas-win32-x64-1.0.0.zip#Windows Portable" \
  "out/make/zip/darwin/x64/microvillas-darwin-x64-1.0.0.zip#macOS Portable"
```

#### 2. Microsoft Store (Windows)

**Pros:**
- Professional appearance
- Automatic updates
- Discovery by users

**Cons:**
- $19 registration fee
- Review process (1-3 days)
- Package restrictions

**Process:**
1. Register for Microsoft Partner Center
2. Convert to MSIX package
3. Submit for review

#### 3. Mac App Store

**Pros:**
- Trusted distribution
- Automatic updates
- Discovery

**Cons:**
- $99/year Developer Program
- Strict sandboxing requirements
- Review process (1-7 days)
- May require app modifications

**Process:**
1. Enroll in Apple Developer Program
2. Create App Store Connect record
3. Enable sandboxing (may break file access)
4. Submit via Xcode or Transporter

#### 4. Homebrew (macOS)

For developer audience:
```bash
# Create formula
brew create https://github.com/yourusername/ai-floorplan/releases/download/v1.0.0/microvillas-darwin-x64-1.0.0.zip

# Submit to homebrew-cask
```

#### 5. Chocolatey (Windows)

For developer audience:
```bash
# Create package
choco new microvillas

# Submit to Chocolatey Community Repository
```

### Download Page Template

Create a simple download page:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Download MicroVillas Investment Platform</title>
</head>
<body>
  <h1>Download MicroVillas Investment Platform v1.0.0</h1>

  <h2>Windows</h2>
  <a href="https://github.com/yourusername/ai-floorplan/releases/download/v1.0.0/MicroVillasSetup.exe">
    Download for Windows (.exe)
  </a>
  <p>Windows 10 or later required</p>

  <h2>macOS</h2>
  <a href="https://github.com/yourusername/ai-floorplan/releases/download/v1.0.0/MicroVillas-1.0.0.dmg">
    Download for macOS (.dmg)
  </a>
  <p>macOS 10.15 (Catalina) or later required</p>

  <h2>Release Notes</h2>
  <ul>
    <li>Initial production release</li>
    <li>All 8 user stories implemented</li>
    <li>Comprehensive financial analysis</li>
    <li>AI integration support</li>
  </ul>
</body>
</html>
```

---

## Troubleshooting

### Common Build Issues

#### Issue: "Module not found" errors

**Solution:**
```bash
rm -rf node_modules/
rm package-lock.json
npm install
```

#### Issue: Native module build failures

**Windows:**
```bash
npm install --global windows-build-tools
npm rebuild
```

**macOS:**
```bash
xcode-select --install
npm rebuild
```

#### Issue: "ENOENT: no such file or directory, open 'icon.ico'"

**Solution:**
- Create placeholder icons (see "Application Icons" section)
- Or temporarily comment out icon references in forge.config.js

#### Issue: DMG creation fails on Windows

**Solution:**
- DMG can only be created on macOS
- Use GitHub Actions for cross-platform builds

#### Issue: Code signing fails

**Windows:**
- Verify certificate file path
- Check password is correct
- Ensure certificate is not expired

**macOS:**
- Run `security find-identity -v -p codesigning` to list certificates
- Verify APPLE_ID and APPLE_PASSWORD
- Check Apple ID has 2FA enabled and app-specific password

### Performance Issues

#### Large installer size

**Solutions:**
```bash
# Remove dev dependencies from package
npm prune --production

# Minimize asar
# In forge.config.js:
packagerConfig: {
  asar: {
    unpack: '*.{node,dll}'
  }
}

# Remove unnecessary files
# In forge.config.js:
ignore: [
  /^\/\.vscode/,
  /^\/\.git/,
  /^\/tests/,
  /^\/docs/,
  /^\/\.eslintrc/,
  /^\/\.prettierrc/
]
```

#### Slow build times

**Solutions:**
```bash
# Use build cache
npm run make -- --use-cache

# Build for specific architecture only
npm run make -- --arch=x64

# Parallel builds (if multiple makers)
npm run make -- --parallel
```

---

## Continuous Integration (Optional)

### GitHub Actions Workflow

Create `.github/workflows/build.yml`:

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 22
      - run: npm ci
      - run: npm run make -- --platform=win32
      - uses: actions/upload-artifact@v3
        with:
          name: windows-installer
          path: out/make/squirrel.windows/x64/*.exe

  build-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 22
      - run: npm ci
      - run: npm run make -- --platform=darwin
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
      - uses: actions/upload-artifact@v3
        with:
          name: macos-installer
          path: out/make/dmg/x64/*.dmg

  release:
    needs: [build-windows, build-macos]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v3
      - uses: softprops/action-gh-release@v1
        with:
          files: |
            windows-installer/*.exe
            macos-installer/*.dmg
```

---

## Summary

**Distribution Checklist:**

- [ ] Icons created (icon.ico, icon.icns)
- [ ] package.json metadata updated
- [ ] forge.config.js configured
- [ ] Tests passing
- [ ] Build succeeds on target platforms
- [ ] Code signing certificates obtained (optional but recommended)
- [ ] Installers tested on clean systems
- [ ] Release notes prepared
- [ ] Download page created
- [ ] GitHub Release published

**Next Steps After Release:**

1. Monitor crash reports (via telemetry if users opt-in)
2. Gather user feedback
3. Plan v1.1 enhancements
4. Set up auto-update mechanism (Squirrel for Windows, built-in for macOS)

---

**Last Updated**: 2026-01-11
**Version**: 1.0.0
