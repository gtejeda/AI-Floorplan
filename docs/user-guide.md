# Micro Villas Investment Platform - User Guide

**Version**: 1.0.0
**Last Updated**: 2026-01-11
**Platform**: Windows 10+ | macOS 10.15+

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Land Investment Setup](#land-investment-setup)
4. [Subdivision Planning](#subdivision-planning)
5. [Social Club Design](#social-club-design)
6. [Financial Analysis](#financial-analysis)
7. [AI Integration](#ai-integration)
8. [Image Management](#image-management)
9. [Project Export & Import](#project-export--import)
10. [Tips & Best Practices](#tips--best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is Micro Villas Investment Platform?

The Micro Villas Investment Platform is a desktop application designed to help real estate developers analyze and plan Micro Villa projects in the Dominican Republic. It provides comprehensive tools for:

- **Land configuration** and parcel analysis
- **Automatic subdivision** calculation with 10-30% social club scenarios
- **Financial analysis** with detailed cost breakdowns and profit margins
- **Social club amenities** design and costing
- **AI-ready exports** for integration with Claude Code and image generation tools
- **Complete project management** with import/export capabilities

### Key Features

✓ **Offline-capable**: No internet required for core features
✓ **Auto-save**: All changes automatically saved to local database
✓ **Multiple scenarios**: Generate up to 21 subdivision scenarios instantly
✓ **Proportional costing**: Fair allocation of shared costs by lot size
✓ **AI integration**: Export projects for AI optimization and visualization
✓ **Cross-platform**: Works on Windows and macOS

---

## Getting Started

### First Launch

1. **Launch the application** from your Start Menu (Windows) or Applications folder (macOS)
2. The application will create a local database automatically
3. You'll see the main window with an empty project state

### Creating Your First Project

1. Click **File > New Project** or press `Ctrl+N` (Windows) or `Cmd+N` (macOS)
2. Enter a project name (e.g., "Punta Cana Villa Development")
3. Optionally add notes about the project
4. Click **Create**

The application will navigate to the **Project Setup** page.

---

## Land Investment Setup

### Entering Land Dimensions

The Land Configuration panel allows you to specify your land parcel details.

#### Option 1: Length × Width

1. Enter **Land Length** in meters or square feet
2. Enter **Land Width** in meters or square feet
3. Total area is calculated automatically
4. Use the unit selector to switch between **sqm** and **sqft**

#### Option 2: Total Area

1. Click **"Use Total Area Instead"**
2. Enter the total area directly
3. The application will use this for calculations

### Location & Province

1. Select the **Province** from the dropdown (all 32 Dominican Republic provinces available)
2. Optionally add **Landmarks** nearby:
   - Click **"Add Landmark"**
   - Enter type (beach, highway, shopping center, etc.)
   - Enter name
   - Enter distance in kilometers
   - Add description

### Acquisition Cost

1. Enter the **Acquisition Cost**
2. Select currency: **DOP** (Dominican Peso) or **USD** (US Dollar)
3. The application uses this for financial calculations

### Urbanization Status

- Check **"Land is urbanized"** if infrastructure (water, electricity, roads) exists
- Leave unchecked for raw land

### Target Number of Villas (Optional)

- Enter your target number of Micro-Villas
- The application will highlight subdivision scenarios that match this target
- This is optional - you can explore all scenarios

### Auto-Save

Changes are automatically saved every few seconds. Look for the **"✓ Saved"** indicator.

---

## Subdivision Planning

### Understanding Subdivision Scenarios

The platform automatically generates up to 21 subdivision scenarios with social club percentages from 10% to 30% (in 1% increments). Each scenario shows:

- **Lot count**: Number of Micro-Villa lots
- **Lot dimensions**: Width × Length of each lot
- **Social club area**: Size and position of shared social club
- **Parking**: Centralized parking (2 spaces per villa)
- **Maintenance room**: Dedicated area for equipment and storage
- **Walkways**: Pedestrian paths
- **Landscaping**: Green spaces

### Viewing Scenarios

1. Navigate to the **Subdivision Planner** page
2. Click **"Calculate Subdivisions"** (if not already calculated)
3. Browse scenarios in the scenario selector
4. Each scenario shows:
   - Social club percentage
   - Number of lots
   - Lot area (minimum 90 sqm enforced)
   - Common area ownership percentage

### Scenario Details

When you select a scenario, you'll see:

- **2D Visualization**: Top-down view showing:
  - Micro-Villa lot positions
  - Social club location (centered)
  - Parking area layout
  - Maintenance room placeholder
  - Walkways and landscaping

- **Key Metrics**:
  - Total lots area
  - Parking spaces (2 × lot count)
  - Common area percentage per lot
  - Viability status

### Selecting a Scenario

1. Review all scenarios
2. Click on your preferred scenario
3. Click **"Select This Scenario"**
4. The selected scenario is highlighted and used for financial analysis

### Adjusting Social Club Percentage

- Use the **Social Club Percentage slider** (10-30%)
- The visualization updates in real-time
- Fine-tune to match your investment goals

---

## Social Club Design

### Accessing Amenities Catalog

1. Navigate to **Social Club Designer** page
2. View the categorized amenities catalog

### Amenity Categories

The catalog includes 20+ amenities organized by category:

- **Aquatic**: Pool, jacuzzi, splash pad
- **Dining**: BBQ area, picnic tables, outdoor kitchen
- **Recreation**: Playground, yoga deck, fitness equipment
- **Furniture**: Lounge chairs, benches, tables
- **Landscaping**: Palm trees, gardens, pergolas
- **Utilities**: Lighting, sound system, Wi-Fi
- **Storage**: Equipment storage units

### Selecting Amenities

1. Browse amenities by category
2. Check the box next to each amenity you want
3. View default cost or enter custom cost
4. Quantity and total cost update automatically

### Mandatory Configurations

#### Storage Units (Required)

Choose one:
- **Social Club Storage**: Centralized storage area within social club (cost divided proportionally among all lots)
- **Individual Patio Storage**: Small storage unit per Micro-Villa (cost added to each lot's base cost)

#### Maintenance Room (Required)

1. Enter **Maintenance Room Size** (square meters)
   - Minimum: 15 sqm recommended
   - Typical: 20-25 sqm
2. Choose **Location**:
   - **In Social Club**: Integrated with social club building
   - **Separate Area**: Standalone structure

### Parking Configuration (Read-Only)

The parking configuration is automatically calculated:
- **Formula**: 2 spaces per villa
- **Example**: 12 lots = 24 parking spaces
- **Layout**: Centralized parking area
- **Area**: Calculated based on standard parking space dimensions

### Viewing Total Costs

At the bottom of the page:
- **Selected Amenities List** with individual costs
- **Total Amenities Cost**
- **Total Social Club Design Cost** (amenities + storage + maintenance room)

### Auto-Save

All amenity selections auto-save when changed.

---

## Financial Analysis

### Overview

The Financial Analysis page provides comprehensive cost breakdowns and pricing scenarios.

### Cost Inputs

#### Land Acquisition

- **Read-only**: Pulled from Land Configuration
- Displays cost in selected currency

#### Amenities Cost

- **Read-only**: Calculated from Social Club Design
- Shows total of all selected amenities

#### Infrastructure Costs

Enter costs for:

1. **Parking Area**: Construction and landscaping
   - Shows total spaces: `2 × [lot count] = [total] spaces`
2. **Walkways**: Path construction
3. **Landscaping**: Green spaces, plants, irrigation
4. **Maintenance Room**: Construction and equipment
   - Shows room size: `[X] sqm`

#### Storage Costs

Label changes based on storage type:
- **Social Club Storage (shared)**: Divided proportionally
- **Patio Storage (per lot)**: Added to each lot's base cost

#### Legal & Administrative

Enter costs for:
- **Notary Fees**: Document preparation and notarization
- **Permits & Approvals**: Municipal permits, environmental approvals
- **Property Registrations**: Land registry fees

#### Other Costs

Add custom cost categories:
1. Click **"Add Cost Item"**
2. Enter label (e.g., "Marketing", "Utilities Installation")
3. Enter amount
4. Add description (optional)

### Cost Breakdown Summary

View detailed breakdown:
- **Total Project Cost**: Sum of all costs
- **Cost per sqm (shared areas)**: Infrastructure costs divided by total land area
- **Base Lot Cost**: Cost per lot before profit margin
  - Proportional land cost
  - Proportional shared costs (parking, walkways, landscaping, maintenance room)
  - Storage cost (if individual patio type)

### Pricing Scenarios

#### Setting Profit Margins

1. Enter desired profit margins (%)
   - Default: 15%, 20%, 25%, 30%
   - Add or remove margins as needed
2. Click **"Generate Pricing Scenarios"**

#### Viewing Scenarios

For each profit margin, the table shows:
- **Profit Margin %**
- **Lot Sale Price**: Base cost × (1 + margin)
- **Total Revenue**: Sale price × lot count
- **Expected Profit**: Revenue - total project cost
- **ROI**: (Profit / total project cost) × 100

### Monthly Maintenance

1. Enter **Monthly Maintenance Cost** for the community
2. The application calculates **Per-Owner Contribution**:
   - Based on common area ownership percentage
   - Fair allocation by lot size

### Currency Conversion

1. Click the currency toggle (DOP ↔ USD)
2. Enter current **Exchange Rate**
3. All amounts display in selected currency
4. Conversion happens in real-time

### Auto-Recalculation

When you:
- Change subdivision scenario
- Update amenity selection
- Modify any cost input

All financial calculations update automatically (performance target: <1 second).

---

## AI Integration

### Overview

The platform can export AI-optimized descriptions for:
1. **Claude Code**: Subdivision optimization prompts
2. **Google Nano Banana Pro**: Image generation prompts

### Generating AI Subdivision Description

1. Navigate to **Financial Analysis** or **AI Tools** page
2. Ensure all required data is complete:
   - Land parcel configured
   - Subdivision scenario selected
   - Social club designed
   - Financial analysis complete
3. Click **"Generate AI Subdivision Description"**
4. The application creates `ai-subdivision-prompt.json` in your project's target directory

**JSON Contents**:
- Land area and dimensions
- Target villa count
- Social club constraints (%, amenities)
- Parking requirements (2 spaces/villa)
- Maintenance room specifications
- Storage configuration
- Cost targets

### Generating AI Image Prompts

1. Select a subdivision scenario
2. Click **"Generate AI Image Prompts"**
3. The application creates `ai-image-prompts.txt` in your project's target directory

**Text Contents**:
- Visual description of Micro-Villa lot
- Social club with amenities detail
- Parking layout description
- Landscaping and walkways
- Maintenance room appearance
- Overall community aesthetic

### Using AI Tools

#### With Claude Code

1. Open the exported `ai-subdivision-prompt.json`
2. Paste contents into Claude Code conversation
3. Request: "Optimize this subdivision layout"
4. Claude Code will suggest improved configurations

#### Importing Optimized Results

1. Save Claude Code's output as JSON
2. In the application, click **"Import Optimized Subdivision from Claude Code"**
3. Select the JSON file
4. The subdivision scenario updates with optimized values

#### With Google Nano Banana Pro

1. Open `ai-image-prompts.txt`
2. Copy individual prompts
3. Use with image generation tool
4. Save generated images to project directory

### Importing AI-Generated Images

1. Place images in project directory under `images/` folder
2. Click **"Import AI-Generated Images"**
3. Images are linked to appropriate lots or social club

---

## Image Management

### Uploading Images to Land Parcel

1. Navigate to **Project Setup** page
2. Scroll to **Images** section
3. Click **"Upload Images to Land Parcel"**
4. Select image files (JPEG, PNG, WebP)
   - Maximum size: 10 MB per image
   - Multiple selection supported
5. Images appear as thumbnails

### Uploading Images to Specific Lots

1. Navigate to **Subdivision Planner** page
2. Select a lot in the visualization
3. Click **"Upload Images to Lot"**
4. Select image files
5. Images are associated with that specific lot

### Viewing Image Previews

1. Click any thumbnail
2. Full-size preview opens in modal
3. View image details:
   - Filename
   - Size
   - Dimensions
   - Upload date
   - Caption (if added)

### Image Captions

1. Click thumbnail
2. Enter caption in the text field
3. Caption saves automatically

### Importing AI-Generated Images

1. Generate images with AI tools (see AI Integration)
2. Save images to project export directory under `images/`
3. Click **"Import AI-Generated Images"**
4. Application scans the directory and imports all images
5. Images are automatically associated based on naming convention

### Image Validation

The application validates:
- ✓ File format (JPEG, PNG, WebP only)
- ✓ File size (max 10 MB)
- ✓ Image compression (automatic for large images)

---

## Project Export & Import

### Exporting a Project

#### Purpose

Export creates a complete backup of your project including:
- All configuration data
- Subdivision scenarios
- Financial analysis
- Images
- AI prompts (if generated)

#### Steps

1. Click **File > Export Project** or press `Ctrl+E` / `Cmd+E`
2. Select target directory using native file picker
3. Click **"Export"**
4. Export completes in <10 seconds (performance target)

#### Export Structure

```
microvillas-export-[timestamp]/
├── project.json         # Complete project data with checksum
├── images/              # All uploaded and AI-generated images
│   ├── land-01.jpg
│   ├── lot-05-01.jpg
│   └── ...
├── ai-prompts/          # AI tool files (if generated)
│   ├── ai-subdivision-prompt.json
│   └── ai-image-prompts.txt
└── README.txt           # Export metadata
```

#### Verification

- **Checksum validation**: SHA-256 hash verifies data integrity
- **File count**: Metadata shows total files exported
- **Total size**: Display of export package size

### Importing a Project

#### Purpose

Import loads a previously exported project with 100% data fidelity.

#### Steps

1. Click **File > Import Project** or press `Ctrl+I` / `Cmd+I`
2. Select directory containing exported project
3. Click **"Import"**
4. Import completes in <10 seconds (performance target)

#### Validation & Recovery

The import process validates:
1. **Directory structure**: Checks for `project.json`
2. **Checksum**: Verifies data integrity
3. **Schema**: Validates all fields match expected format
4. **Images**: Scans for missing images

#### Partial Recovery

If `project.json` is corrupted:
1. Application offers **Partial Recovery** option
2. Lists invalid fields with detailed errors
3. You can choose to:
   - Import valid fields only (skip corrupted data)
   - Cancel import and fix JSON manually

#### Missing Images

- Missing images are flagged with warnings
- Placeholders shown in UI
- Functionality preserved (project still usable)

### Recent Projects

The application tracks your last 5 projects:

1. Click **File > Open Recent**
2. Select from recent projects list
3. Project loads instantly

To clear recent projects:
1. **File > Open Recent > Clear Recent Projects**

---

## Tips & Best Practices

### Land Configuration

✓ **Measure accurately**: Use official survey documents
✓ **Include buffer zones**: Account for setbacks and easements
✓ **Research zoning**: Verify Micro-Villa developments are permitted
✓ **Check soil reports**: Ensure land is suitable for construction

### Subdivision Planning

✓ **Explore multiple scenarios**: Don't settle on the first scenario
✓ **Balance lot count vs. social club**: More amenities = fewer lots but higher appeal
✓ **Consider target market**: Larger lots for families, smaller for singles
✓ **Review parking**: 2 spaces per villa is standard, adjust if needed

### Financial Analysis

✓ **Get multiple quotes**: Use real contractor quotes for accuracy
✓ **Include contingency**: Add 10-15% buffer for unexpected costs
✓ **Research market rates**: Price lots competitively
✓ **Factor in timeline**: Longer projects have higher carrying costs

### Social Club Design

✓ **Prioritize amenities**: Start with must-haves (pool, parking, maintenance)
✓ **Think maintenance**: Higher-end amenities = higher monthly costs
✓ **Plan for growth**: Leave space for future amenity additions
✓ **Consider climate**: Dominican Republic climate favors outdoor amenities

### Data Management

✓ **Export regularly**: Create backups after major changes
✓ **Use descriptive names**: Name projects clearly (location + date)
✓ **Version control**: Export different iterations for comparison
✓ **Organize files**: Keep all project files in one directory

---

## Troubleshooting

### Application Won't Launch

**Symptoms**: Application doesn't open, crashes immediately

**Solutions**:
1. Restart your computer
2. Check system requirements (Windows 10+ or macOS 10.15+)
3. Reinstall the application
4. Check antivirus isn't blocking the app

### Subdivision Calculation Takes Too Long

**Symptoms**: "Calculating..." spinner runs for > 5 seconds

**Expected**: Should complete in <2 seconds for 21 scenarios

**Solutions**:
1. Close other applications to free up CPU
2. Reduce lot count targets (if set very high)
3. Restart the application
4. Check for app updates

### Financial Recalculation Slow

**Symptoms**: Lag when changing costs or scenarios

**Expected**: Should update in <1 second

**Solutions**:
1. Clear browser cache (if using web-based renderer)
2. Restart application
3. Reduce number of pricing scenarios (use 3-4 instead of 10+)

### Images Won't Upload

**Symptoms**: "Upload failed" error or images not appearing

**Solutions**:
1. Check file format (must be JPEG, PNG, or WebP)
2. Check file size (must be ≤ 10 MB)
3. Ensure disk space available
4. Try compressing images before upload

### Export/Import Fails

**Symptoms**: "Export failed" or "Import validation error"

**Solutions**:
1. **Export**: Check target directory is writable
2. **Export**: Ensure disk space available (≥ 50 MB)
3. **Import**: Verify `project.json` file exists
4. **Import**: Check JSON syntax (use JSON validator)
5. **Import**: Enable partial recovery for corrupted files

### Data Not Saving

**Symptoms**: Changes disappear after closing app

**Solutions**:
1. Check auto-save indicator shows "✓ Saved"
2. Manually trigger save with `Ctrl+S` / `Cmd+S`
3. Check database file permissions
4. Export project as backup

### Currency Conversion Issues

**Symptoms**: Incorrect conversion values

**Solutions**:
1. Verify exchange rate is current
2. Check currency selector shows correct currency
3. Update exchange rate in Settings
4. Restart application if conversion stuck

### Performance Issues

**Symptoms**: App feels slow or unresponsive

**Solutions**:
1. Close unused browser tabs
2. Restart application
3. Clear app cache (Settings > Clear Local Storage)
4. Check system resources (Task Manager / Activity Monitor)

---

## Keyboard Shortcuts

### Global

- `Ctrl+N` / `Cmd+N`: New Project
- `Ctrl+O` / `Cmd+O`: Open Project
- `Ctrl+S` / `Cmd+S`: Manual Save
- `Ctrl+E` / `Cmd+E`: Export Project
- `Ctrl+I` / `Cmd+I`: Import Project
- `Ctrl+,` / `Cmd+,`: Settings
- `Ctrl+/` / `Cmd+/`: Documentation (opens this guide)

### Recent Projects

- `Ctrl+1` / `Cmd+1`: Open most recent project
- `Ctrl+2` / `Cmd+2`: Open 2nd recent project
- ...up to `Ctrl+5` / `Cmd+5`

### Application

- `F5`: Reload
- `Ctrl+Shift+I` / `Cmd+Opt+I`: Developer Tools (advanced)

---

## Support & Resources

### Getting Help

- **Documentation**: This user guide
- **Quickstart**: See `quickstart.md` for developer setup
- **Issues**: Report bugs or request features on GitHub

### System Requirements

- **Windows**: 10 or higher (64-bit)
- **macOS**: 10.15 (Catalina) or higher
- **RAM**: 4 GB minimum, 8 GB recommended
- **Disk Space**: 500 MB for application + project data
- **Display**: 1200×800 minimum resolution

### Version History

**v1.0.0** (2026-01-11)
- Initial release
- All 8 user stories implemented
- Performance optimizations
- Recent projects feature
- Comprehensive validation and error handling

---

## Glossary

**Micro-Villa**: Small residential lot (minimum 90 sqm) in a planned community development

**Social Club**: Shared amenity area for all lot owners (10-30% of total land)

**Centralized Parking**: Common parking area with 2 spaces per villa

**Maintenance Room**: Shared facility for equipment, tools, and utilities

**Storage Unit**: Individual or shared storage for lot owners

**Common Area Percentage**: Ownership share of social club, parking, and walkways

**Proportional Cost Allocation**: Fair distribution of shared costs based on lot size

**Base Lot Cost**: Cost per lot before adding profit margin

**Pricing Scenario**: Sale price calculated from base cost + profit margin

**Export**: Complete project backup with all data and images

**Import**: Load previously exported project with validation

**AI-Ready Export**: Structured JSON for Claude Code optimization

**Checksum**: SHA-256 hash for verifying data integrity

---

**End of User Guide**
