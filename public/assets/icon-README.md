# Application Icon Files

## Required Icons

For proper distribution on Windows and macOS, the following icon files are needed:

### Windows
- **icon.ico** (256x256, 128x128, 64x64, 48x48, 32x32, 16x16)
  - Multi-resolution ICO file
  - Place in: `public/assets/icon.ico`

### macOS
- **icon.icns** (1024x1024, 512x512, 256x256, 128x128, 64x64, 32x32, 16x16)
  - ICNS format for macOS
  - Place in: `public/assets/icon.icns`

### Development
- **icon.png** (1024x1024)
  - Source PNG for generating platform-specific icons
  - Place in: `public/assets/icon.png`

## Icon Design Guidelines

The icon should represent:
- Real estate / property development
- Micro villas concept (small houses)
- Professional financial tool
- Dominican Republic market (optional: use DR colors - red, blue, white)

Suggested concepts:
- Grid of small houses with social club in center
- Stylized villa with calculator/chart overlay
- Abstract land parcel division pattern

## Generating Icons

Use online tools or:
```bash
# Install icon generator
npm install --save-dev electron-icon-maker

# Generate from PNG
npx electron-icon-maker --input=public/assets/icon.png --output=public/assets
```

## Configuration

Icons are configured in `forge.config.js`:
```javascript
packagerConfig: {
  icon: './public/assets/icon'  // Electron Forge will add .ico/.icns automatically
}
```

## Temporary Placeholder

Until custom icons are designed, Electron will use default icons. This does not affect functionality, only branding and user experience.

**TODO**: Commission icon design from graphic designer before production release.
