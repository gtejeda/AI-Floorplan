# Feature Specification: Micro Villas Investment Platform - Desktop Application

**Feature Branch**: `main`
**Created**: 2026-01-10
**Status**: Draft
**Input**: Cross-platform (Windows, Mac) desktop application for AI-powered Micro Villas project generation

## Overview

This platform enables investment developers to analyze, plan, and generate Micro Villas projects with AI integration. **Micro Villas solve the vacation property affordability problem** by subdividing land into smaller lots with centralized social club amenities, allowing investors to own vacation property at a fraction of traditional villa costs **while enjoying amenities from day one** - the social club is built and operational from the start, not years later.

The application is a native desktop tool (Windows + macOS) that provides investment analysis, automatic subdivision calculation, financial modeling, and AI-ready project descriptions for visualization and marketing. **The app serves as a data gathering system for AI tools**: users configure projects, then export structured data for Claude Code (subdivision optimization) and Google Nano Banana Pro (image generation).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Land Investment Setup (Priority: P1)

An investment developer acquires a large plot of land in Dominican Republic and needs to configure the basic project parameters to evaluate its viability as a Micro Villas development.

**Why this priority**: Core foundation - without defining the land parcel and its characteristics, no other functionality can work. This is the entry point for all investment analysis.

**Independent Test**: Can be fully tested by entering land dimensions, location, cost, and viewing the saved project configuration. Delivers immediate value by capturing investment parameters.

**Acceptance Scenarios**:

1. **Given** a new project, **When** developer enters land dimensions (length/width or total area) in square meters or square feet, **Then** system calculates and displays total land area
2. **Given** land dimensions are entered, **When** developer specifies Dominican Republic province, land cost, urbanization status, and nearby landmarks, **Then** system stores all property characteristics
3. **Given** complete land information, **When** developer optionally specifies target number of Micro-Villas desired, **Then** system stores this target for validation against subdivision scenarios
4. **Given** complete land information, **When** developer saves the project, **Then** all land parameters are persisted to local storage

---

### User Story 2 - Automatic Subdivision Calculation (Priority: P1)

The developer needs to see all possible ways to subdivide the land parcel into Micro Villa lots plus a centralized social club area, considering 10-30% of land dedicated to the social club.

**Why this priority**: Critical for investment feasibility - developers need to know how many units they can create to calculate revenue potential. This is the core value proposition of the platform.

**Independent Test**: Can be fully tested by providing land dimensions and getting multiple subdivision scenarios showing different lot configurations and social club percentages. Delivers immediate value by showing development potential.

**Acceptance Scenarios**:

1. **Given** a land parcel with defined dimensions, **When** system calculates subdivisions, **Then** system generates multiple scenarios with social club ranging from 10% to 30% of total area in 1% increments
2. **Given** subdivision scenarios, **When** viewing each option, **Then** each scenario shows: number of Micro Villa lots, individual lot dimensions, social club dimensions and location (centralized), centralized parking area with 2 spaces per Micro-Villa, maintenance room area (user-defined size and location), and total walkway/landscaping areas
3. **Given** multiple subdivision options, **When** developer selects a preferred scenario, **Then** system uses this configuration for all subsequent calculations
4. **Given** a selected subdivision, **When** system calculates common area percentages, **Then** each Micro Villa lot includes its proportional share of common area ownership (social club + parking + walkways + landscaping)
5. **Given** subdivision scenarios with target number of Micro-Villas specified, **When** system generates scenarios, **Then** system validates if target is achievable and highlights scenarios that meet the target
6. **Given** subdivision scenarios, **When** lots would be smaller than 90 sqm minimum, **Then** those scenarios are filtered out and not displayed

---

### User Story 3 - Social Club Amenities Design (Priority: P2)

The developer needs to design the social club by selecting from a comprehensive list of amenities to attract buyers and differentiate the investment opportunity.

**Why this priority**: Important for marketability and value proposition, but can be added after basic subdivision is determined. Directly impacts project cost and buyer appeal.

**Independent Test**: Can be fully tested by selecting various amenities from a catalog (pool, BBQ area, lounge, pool chairs, umbrellas, etc.) and viewing the selected amenities list. Delivers value by defining the shared facilities that make Micro Villas attractive.

**Acceptance Scenarios**:

1. **Given** a subdivision is selected, **When** developer views amenities catalog, **Then** system displays comprehensive list of available amenities organized by category (aquatic, dining, recreation, storage, etc.)
2. **Given** the amenities catalog, **When** developer selects/deselects amenities, **Then** system updates the social club design configuration
3. **Given** selected amenities, **When** viewing social club design, **Then** system displays all chosen amenities with space requirements
4. **Given** social club design, **When** developer configures storage units (mandatory), **Then** developer chooses: dedicated storage area in social club OR individual patio storage for each Micro Villa (one storage unit per villa required)
5. **Given** social club design, **When** developer configures maintenance room (mandatory), **Then** developer specifies maintenance room size and location (in social club or separate dedicated area)
6. **Given** social club design, **When** developer views parking configuration (mandatory), **Then** system shows centralized parking area with 2 spaces allocated per Micro-Villa

---

### User Story 4 - Financial Analysis & Pricing (Priority: P2)

The developer needs comprehensive financial analysis showing total project costs, per-square-meter pricing, and individual Micro Villa lot pricing with target profit margins to determine investment viability.

**Why this priority**: Essential for investment decision-making but requires prior configuration (land, subdivision, amenities). This is where the platform proves its business value by showing profitability.

**Independent Test**: Can be fully tested by entering all costs (land, amenities, legal, other) and viewing calculated pricing with different profit margin targets. Delivers value by showing if the investment is financially viable.

**Acceptance Scenarios**:

1. **Given** a subdivision and amenities selection, **When** developer enters land acquisition cost, **Then** system records the base investment amount
2. **Given** selected amenities, **When** developer enters cost for each amenity item (or uses recommended defaults), **Then** system calculates total amenities investment
3. **Given** project configuration, **When** developer enters centralized parking area cost (construction and landscaping), **Then** system divides parking cost proportionally among all Micro-Villa owners based on their lot square meters
4. **Given** project configuration, **When** developer enters walkway and landscaping costs for common areas, **Then** system divides these costs proportionally among all owners based on their lot square meters
5. **Given** project configuration, **When** developer enters maintenance room cost (construction and equipment), **Then** system includes this in shared costs divided among owners
6. **Given** project configuration, **When** developer enters storage unit costs, **Then** system allocates costs based on storage configuration (shared in social club = divided proportionally; individual patio storage = included in per-lot pricing)
7. **Given** project configuration, **When** developer enters legal costs and other expenses (permits, infrastructure, etc.), **Then** system calculates total project cost
8. **Given** total project cost and number of Micro Villa lots, **When** system performs financial analysis, **Then** system displays: total project cost breakdown (land + amenities + parking + walkways + maintenance room + storage + legal + other), cost per square meter for shared areas, base lot pricing including proportional shared costs
9. **Given** base calculations, **When** developer specifies target profit percentage (e.g., 20%, 30%, 40%), **Then** system shows multiple pricing scenarios with different profit margins and final per-lot sale prices
10. **Given** financial analysis, **When** reviewing maintenance structure, **Then** system shows each owner's proportional maintenance contribution based on common area ownership percentage (social club + parking + walkways + landscaping)

---

### User Story 5 - AI Integration for Subdivision & Images (Priority: P3)

The developer needs to manually trigger AI tools to optimize subdivisions (Claude Code) and generate marketing images (Google Nano Banana Pro) based on the configured project data.

**Why this priority**: Valuable for optimization and marketing but not critical for core investment analysis. Can be added after financial viability is confirmed and project is fully configured.

**Independent Test**: Can be fully tested by clicking "Generate AI Subdivision" or "Generate AI Images" buttons and verifying the system exports appropriate data files for AI consumption. Delivers value by enabling AI-powered subdivision optimization and visual content generation.

**Acceptance Scenarios**:

1. **Given** a fully configured project (land, subdivision, social club, financials), **When** developer clicks "Generate AI Subdivision Description" button, **Then** system generates comprehensive JSON and text description for Claude Code including: location and province, total land area and constraints, target number of Micro-Villas (if specified), social club percentage constraints (10-30%), minimum lot size (90 sqm), parking requirements (2 spaces per villa, centralized), maintenance room requirements, storage configuration, all cost parameters for optimization
2. **Given** an AI subdivision description, **When** system generates the output, **Then** text is formatted optimally for Claude Code with clear structure, specific constraints, and all optimization parameters
3. **Given** a fully configured project with selected subdivision, **When** developer clicks "Generate AI Image Prompts" button, **Then** system generates detailed prompts for Google Nano Banana Pro including: visual description of Micro-Villa lot (dimensions, style), centralized social club with selected amenities, parking area layout (2 spaces per villa), landscaping and walkway descriptions, overall project aerial view description
4. **Given** generated AI outputs, **When** developer reviews the files, **Then** all files are saved to the project's target directory on disk with clear naming (ai-subdivision-prompt.json, ai-image-prompts.txt)
5. **Given** AI-generated subdivision from Claude Code, **When** developer imports the optimized subdivision data, **Then** system loads the new lot configuration and updates all financial calculations accordingly

---

### User Story 6 - Image Management (Priority: P3)

The developer needs to attach and preview images for the land parcel and individual Micro Villa lots to document the property and visualize the project.

**Why this priority**: Useful for documentation and presentation but not essential for investment calculations. Adds visual context after financial viability is established.

**Independent Test**: Can be fully tested by uploading images to land parcel or specific Micro Villa lots, viewing thumbnails, and opening full previews. Delivers value by providing visual context for presentations.

**Acceptance Scenarios**:

1. **Given** a project, **When** developer uploads image(s) to the land parcel, **Then** system stores and displays image thumbnails associated with the property
2. **Given** a subdivision with Micro Villa lots, **When** developer uploads image(s) to specific lots, **Then** system associates images with individual lots and displays them
3. **Given** stored images, **When** developer clicks an image thumbnail, **Then** system displays full-size image preview
4. **Given** attached images, **When** project is saved, **Then** all images are persisted in local storage

---

### User Story 7 - Project Export to Disk (Priority: P2)

The developer needs to save complete project data (configuration, financials, images, AI prompts) to a designated target directory on disk for backup, sharing, AI processing, or version control.

**Why this priority**: Important for data portability, collaboration, and AI integration workflow. Critical for professional use and data safety.

**Independent Test**: Can be fully tested by selecting a directory, exporting a project, and verifying all data (JSON configuration, images, financials, AI prompts) is saved to disk. Delivers value by enabling project backup, sharing, and AI tool integration.

**Acceptance Scenarios**:

1. **Given** a project with all configurations, **When** developer initiates export, **Then** system prompts to select/create a target directory on disk
2. **Given** a selected directory, **When** export proceeds, **Then** system creates structured folder containing: project.json file with all configuration and financial data, images/ subfolder with all project images (both original uploaded and AI-generated), ai-prompts/ subfolder with Claude Code subdivision prompts and Google Nano image prompts (if generated), clear naming convention for easy identification
3. **Given** completed export, **When** developer reviews the directory, **Then** all project data is present and organized: project.json (root), images/ folder, ai-prompts/ folder (if applicable)
4. **Given** an exported project directory, **When** developer uses AI tools (Claude Code, Google Nano), **Then** AI can read the prompts from ai-prompts/ folder and save results (optimized subdivisions, generated images) back to the project directory

---

### User Story 8 - Project Import from Disk (Priority: P2)

The developer needs to load a previously exported project from a disk directory to continue work, share with team members, or review past projects.

**Why this priority**: Important for workflow continuity and collaboration. Enables multi-session work and team collaboration.

**Independent Test**: Can be fully tested by selecting a directory containing exported project data and verifying all configuration, financials, and images load correctly. Delivers value by enabling project continuity.

**Acceptance Scenarios**:

1. **Given** an exported project directory, **When** developer initiates import, **Then** system prompts to select a directory containing project data
2. **Given** a valid project directory, **When** import proceeds, **Then** system loads: all land configuration and subdivision details, complete social club and amenities selection, all financial data and calculations, all associated images
3. **Given** a loaded project, **When** developer views the project, **Then** all data displays correctly as if it were the original working session
4. **Given** an invalid or corrupted project directory, **When** import is attempted, **Then** system displays clear error message explaining what is missing or invalid

---

### Edge Cases

- What happens when land dimensions result in awkward subdivision ratios that don't produce practical lot sizes? (System filters out scenarios where lots would be smaller than 90 sqm minimum)
- How does system handle very small land parcels where 10-30% social club percentage makes lots too small to be viable? (System filters out non-viable scenarios; if no viable scenarios exist, user receives message indicating land is too small)
- What happens when the developer changes subdivision after amenities and financials are configured? (All financial data is preserved and derived calculations automatically update)
- How does system handle different units (square meters vs square feet) consistently across all calculations? (System converts all measurements to user's selected unit and maintains consistency throughout)
- What happens when image files are large (multiple MB) - are there size limits? (Images up to 10MB are stored; larger images may be compressed or rejected with notification)
- What happens during import if images are corrupted or fail to load? (System displays placeholder indicators for corrupted/missing images)
- How does system handle provinces or landmarks with special characters or non-English names? (System accepts UTF-8 encoded text for all text inputs supporting international characters)
- What happens when social club percentage would result in fractional or impractical dimensions? (System rounds dimensions to practical values, e.g., 0.1m precision, and validates minimum viable sizes)

## Requirements *(mandatory)*

### Functional Requirements

#### Land Configuration (Priority: P1)

- **FR-001**: System MUST allow users to input land dimensions via length and width OR total area
- **FR-002**: System MUST support both square meters and square feet with automatic conversion
- **FR-003**: System MUST allow users to specify Dominican Republic province from a predefined list
- **FR-004**: System MUST allow users to input land acquisition cost in Dominican Pesos (DOP) or USD with currency selection
- **FR-005**: System MUST allow users to mark land as urbanized or non-urbanized
- **FR-006**: System MUST allow users to add multiple nearby landmarks (beaches, airports, tourist attractions, etc.) as free-text entries
- **FR-007**: System MUST allow users to optionally specify target number of Micro-Villas desired for the project
- **FR-008**: System MUST persist all land configuration data to local storage

#### Subdivision Calculation (Priority: P1)

- **FR-009**: System MUST automatically calculate multiple subdivision scenarios varying social club percentage from 10% to 30% of total land area in 1% increments
- **FR-010**: System MUST default to 20% social club percentage as the initial scenario
- **FR-011**: System MUST allow users to manually adjust social club percentage to any value between 10-30%
- **FR-012**: System MUST calculate optimal Micro Villa lot dimensions for each scenario ensuring rectangular or square lots
- **FR-013**: System MUST calculate and display the number of Micro Villa lots possible in each scenario
- **FR-014**: System MUST position social club in the center of the land parcel in all scenarios
- **FR-015**: System MUST calculate centralized parking area with exactly 2 parking spaces per Micro Villa in each scenario
- **FR-016**: System MUST allow user to specify maintenance room size and location (in social club or separate area) for each scenario
- **FR-017**: System MUST calculate walkway and landscaping areas for each subdivision scenario
- **FR-018**: System MUST calculate each Micro Villa's proportional common area percentage based on lot size relative to total Micro Villa area (excluding parking, walkways, and social club)
- **FR-019**: System MUST include parking area, walkways, and landscaping in common area ownership calculations divided proportionally by lot square meters
- **FR-020**: System MUST allow user to select one subdivision scenario as the active configuration
- **FR-021**: System MUST recalculate subdivisions when land dimensions change
- **FR-022**: System MUST enforce minimum lot size of 90 sqm per Micro Villa (excluding common areas)
- **FR-023**: System MUST filter out and not display subdivision scenarios where any lot would be smaller than 90 sqm
- **FR-024**: System MUST display subdivision scenarios as 2D top-down schematic diagrams with labeled rectangles showing: lot positions and dimensions, social club location and size, centralized parking area, maintenance room location, walkways
- **FR-025**: System MUST validate and highlight subdivision scenarios that meet the target number of Micro-Villas (if specified by user)

#### Data Persistence (Priority: P1)

- **FR-026**: System MUST automatically save project data to local storage on every change
- **FR-027**: System MUST persist all project state including: land configuration, subdivision scenarios and selection, social club design, parking configuration, maintenance room configuration, storage configuration, financial data, image references
- **FR-028**: System MUST restore project data from local storage when user returns to the application
- **FR-029**: System MUST provide visual indicator when auto-save occurs
- **FR-030**: System MUST allow users to clear local storage and start a new project

#### Social Club Design (Priority: P2)

- **FR-031**: System MUST provide a comprehensive amenities catalog including: aquatic (pools, jacuzzis), dining (BBQ areas, outdoor kitchens, dining pavilions), recreation (lounges, game areas, sports courts), furniture (pool chairs, umbrellas, tables), landscaping (gardens, pathways), utilities (bathrooms, changing rooms), storage facilities
- **FR-032**: System MUST allow users to select/deselect any combination of amenities
- **FR-033**: System MUST allow users to specify storage unit configuration: dedicated storage area in social club OR individual patio storage per Micro Villa (mandatory - one storage unit per villa)
- **FR-034**: System MUST allow users to specify maintenance room size and choose location: within social club area OR separate dedicated area (mandatory for all projects)
- **FR-035**: System MUST display centralized parking configuration showing 2 spaces per Micro Villa (mandatory, automatically calculated based on lot count)
- **FR-036**: System MUST display selected amenities with descriptions
- **FR-037**: System MUST persist social club design configuration including parking, storage, and maintenance room
- **FR-038**: System MUST provide recommended default costs in USD for all amenities
- **FR-039**: System MUST allow users to override any default amenity cost with custom values

#### Financial Analysis (Priority: P2)

- **FR-040**: System MUST allow users to input cost for each selected amenity (or use recommended defaults)
- **FR-041**: System MUST allow users to input centralized parking area cost (construction, asphalt/paving, landscaping) for 2 spaces per Micro Villa
- **FR-042**: System MUST divide parking area cost proportionally among all Micro Villa owners based on their individual lot square meters
- **FR-043**: System MUST allow users to input walkway construction cost and landscaping cost for common areas
- **FR-044**: System MUST divide walkway and landscaping costs proportionally among all owners based on their lot square meters
- **FR-045**: System MUST allow users to input maintenance room cost (construction and equipment)
- **FR-046**: System MUST divide maintenance room cost proportionally among all owners based on their lot square meters
- **FR-047**: System MUST allow users to input storage unit cost
- **FR-048**: System MUST allocate storage cost based on configuration: if in social club, divide proportionally by lot sqm; if individual patio storage, include full cost in per-lot pricing
- **FR-049**: System MUST allow users to input legal costs (notary, permits, registrations)
- **FR-050**: System MUST allow users to input other costs (infrastructure, utilities installation, marketing) with custom labels
- **FR-051**: System MUST calculate total project cost: land cost + amenities cost + parking cost + walkway cost + landscaping cost + maintenance room cost + storage cost + legal costs + other costs
- **FR-052**: System MUST calculate cost per square meter for shared areas (social club, parking, walkways, landscaping) divided proportionally by Micro Villa lot sizes
- **FR-053**: System MUST calculate base cost per Micro Villa lot including: proportional land cost, proportional shared area costs (parking, walkways, landscaping, maintenance room), storage cost (if individual patio storage)
- **FR-054**: System MUST allow users to specify target profit margin percentages (e.g., 15%, 20%, 25%, 30%)
- **FR-055**: System MUST calculate final lot sale price for each profit margin scenario: base cost per lot × (1 + profit margin)
- **FR-056**: System MUST display total project revenue for each pricing scenario: lot sale price × number of lots
- **FR-057**: System MUST calculate and display expected profit: total revenue - total project cost
- **FR-058**: System MUST allow users to input estimated total monthly maintenance cost (social club + parking + landscaping maintenance), then calculate each owner's proportional monthly contribution based on their common area ownership percentage
- **FR-059**: System MUST support multi-currency display (DOP and USD) with exchange rate input
- **FR-060**: System MUST preserve all entered financial data when user changes subdivision scenario
- **FR-061**: System MUST automatically recalculate all derived financial values (including per-sqm shared costs) when subdivision scenario changes

#### AI Integration (Priority: P3)

- **FR-062**: System MUST provide "Generate AI Subdivision Description" button when project is fully configured
- **FR-063**: System MUST generate comprehensive JSON file for Claude Code containing: location and province, total land area and constraints, target number of Micro-Villas (if specified), social club percentage constraints (10-30%), minimum lot size (90 sqm), parking requirements (2 spaces per villa, centralized), maintenance room requirements (user-defined size and location), storage configuration (social club or patio), walkway and landscaping area requirements, all cost parameters for optimization
- **FR-064**: System MUST format Claude Code prompts with clear constraint structure and optimization parameters
- **FR-065**: System MUST provide "Generate AI Image Prompts" button when subdivision is selected
- **FR-066**: System MUST generate detailed text prompts for Google Nano Banana Pro containing: visual description of Micro-Villa lot (dimensions, style, features), centralized social club with all selected amenities, parking area layout (2 spaces per villa, centralized), landscaping and walkway visual descriptions, overall project aerial view description, maintenance room visual description
- **FR-067**: System MUST save AI-generated files to project's target directory: ai-subdivision-prompt.json for Claude Code, ai-image-prompts.txt for Google Nano
- **FR-068**: System MUST support importing optimized subdivision data from Claude Code (JSON format) and updating all financial calculations accordingly
- **FR-069**: System MUST allow users to manually trigger AI generation (no automatic triggers on save/export)

#### Image Management (Priority: P3)

- **FR-070**: System MUST allow users to select multiple image files from disk for the land parcel
- **FR-071**: System MUST allow users to select multiple image files from disk for individual Micro Villa lots
- **FR-072**: System MUST support importing AI-generated images from Google Nano Banana Pro (from project target directory)
- **FR-073**: System MUST store image data in local storage for session persistence
- **FR-074**: System MUST display image thumbnails in the interface
- **FR-075**: System MUST allow users to click thumbnails to view full-size images
- **FR-076**: System MUST support common image formats (JPEG, PNG, WebP)
- **FR-077**: System SHOULD handle images up to 10MB; larger images MAY be compressed or rejected with user notification

#### Project Export (Priority: P2)

- **FR-078**: System MUST allow users to select a target directory on disk for project export via native file picker
- **FR-079**: System MUST create a structured export package containing: project.json file with all configuration and financial data, images/ subfolder with all project images (uploaded and AI-generated), ai-prompts/ subfolder with Claude Code subdivision prompts and Google Nano image prompts (if generated)
- **FR-080**: System MUST copy all image files to the export images/ subfolder
- **FR-081**: System MUST use clear naming conventions for exported files: project.json, images/, ai-prompts/
- **FR-082**: System MUST validate export directory is writable before proceeding
- **FR-083**: System MUST provide success/failure feedback after export
- **FR-084**: System MUST store the project target directory path for future AI tool integration (Claude Code and Google Nano can save results to this directory)

#### Project Import (Priority: P2)

- **FR-085**: System MUST allow users to select a directory on disk for project import via native file picker
- **FR-086**: System MUST validate directory contains required project files (project.json, images/ folder, and optionally ai-prompts/ folder)
- **FR-087**: System MUST load all configuration data from project.json file
- **FR-088**: System MUST load all associated images from images/ subfolder (both uploaded and AI-generated)
- **FR-089**: System MUST restore complete project state including: land configuration, selected subdivision, social club design (parking, storage, maintenance room), all financial data and calculations, all images, target directory path
- **FR-090**: System MUST detect corrupted or invalid JSON fields during import
- **FR-091**: System MUST display detailed error message listing all invalid/corrupted fields when JSON validation fails
- **FR-092**: System MUST offer option to attempt partial recovery (load valid fields, skip invalid ones) when JSON is corrupted
- **FR-093**: System MUST show warning message listing which fields were skipped during partial recovery
- **FR-094**: System MUST handle missing images gracefully by displaying placeholder indicators

#### Desktop Platform Requirements

- **FR-095**: System MUST run as native desktop application on Windows 10+ and macOS 10.15+
- **FR-096**: System MUST use native file/directory picker dialogs for export/import operations
- **FR-097**: System MUST support offline operation (no internet connection required for core features)
- **FR-098**: System MUST persist data locally without cloud dependencies
- **FR-099**: System root directory MUST be located at: D:\fast2ai\AI-Floorplan\src

### Key Entities

- **Land Parcel**: The main investment property with dimensions (length/width or area), location (province), acquisition cost, urbanization status, nearby landmarks, target number of Micro-Villas (optional), and measurement unit (sqm/sqft)
- **Subdivision Scenario**: A calculated configuration showing one possible way to divide the land with social club percentage (10-30%), social club dimensions and position, Micro Villa lot count, individual lot dimensions, centralized parking area (2 spaces per villa), maintenance room (size and location), walkway and landscaping areas, and common area percentages
- **Micro Villa Lot**: An individual subdivided unit with dimensions, lot number/identifier, common area ownership percentage (social club + parking + walkways + landscaping), associated images, and proportional shared costs
- **Parking Area**: Centralized parking facility with total area, number of spaces (2 per Micro Villa), construction cost, and per-owner cost allocation (divided proportionally by lot sqm)
- **Storage Unit**: Storage facility configuration with location type (social club or individual patio), individual unit size, total cost, and cost allocation method (shared proportionally or per-lot)
- **Maintenance Room**: Mandatory maintenance facility with size (user-defined), location (in social club or separate area), construction and equipment cost, and per-owner cost allocation (divided proportionally by lot sqm)
- **Social Club**: The centralized shared amenities area with dimensions and position, selected amenities from catalog, maintenance room (if located in social club), storage area (if centralized), and total cost
- **Amenity**: A social club feature with name and category (aquatic, dining, recreation, etc.), description, space requirements, and individual cost
- **Financial Analysis**: The investment calculation with total project cost breakdown (land, amenities, parking, walkways, landscaping, maintenance room, storage, legal, other), cost per square meter for shared areas (divided proportionally by lot size), base lot cost including all proportional shared costs, multiple pricing scenarios with different profit margins, expected revenue and profit, and per-owner maintenance contributions
- **Project**: The complete investment package containing land parcel data, selected subdivision scenario, social club design, parking configuration, maintenance room configuration, storage configuration, financial analysis, associated images (uploaded and AI-generated), AI prompts (Claude Code and Google Nano), target directory path, and export/import metadata

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Investment developers can configure complete land parcel parameters (dimensions, location, cost, characteristics) in under 5 minutes
- **SC-002**: System generates up to 21 subdivision scenarios (1% increments from 10-30% social club percentage) within 2 seconds of land configuration
- **SC-003**: Users can select and configure social club amenities from a catalog of at least 20 different options organized by category
- **SC-004**: System calculates complete financial analysis (total cost, per-sqm pricing, lot pricing, profit margins) automatically when all cost inputs are provided
- **SC-005**: Financial calculations update in real-time (under 1 second) when any cost parameter changes
- **SC-006**: Users can export complete projects (including all images) to disk in under 10 seconds
- **SC-007**: Users can import previously exported projects with 100% data fidelity (all configuration and images restored)
- **SC-008**: System generates AI-ready project descriptions containing all key details in under 3 seconds
- **SC-009**: 90% of users can complete a full project setup (land, subdivision selection, amenities, financials) in under 20 minutes
- **SC-010**: System handles land parcels ranging from 500 sqm to 50,000 sqm without performance degradation
- **SC-011**: All calculations maintain accuracy to 2 decimal places for financial values and areas
- **SC-012**: Application launches in under 3 seconds on both Windows and macOS

## Assumptions

- Dominican Republic provinces list is predefined and maintained in application configuration
- Exchange rates between DOP and USD are manually entered by users (no automatic fetching)
- Social club is always rectangular and centered within the land parcel
- Micro Villa lots are rectangular (not irregular shapes)
- **Parking is ALWAYS centralized (separate from individual lots) with exactly 2 spaces per Micro Villa - 100% mandatory for all projects**
- **Parking cost is divided proportionally among all owners based on their lot square meters**
- **Storage units are ALWAYS required (one per villa) - developer chooses location: social club (shared) OR individual patio per lot**
- **Maintenance room is ALWAYS required - 100% mandatory for all projects - developer specifies size and location (in social club or separate area)**
- **Walkway and landscaping costs are divided proportionally among all owners based on their lot square meters**
- Maintenance cost calculations are proportional to common area ownership (social club + parking + walkways + landscaping)
- Land parcel is rectangular or easily representable as total area
- **Minimum lot size of 90 sqm per Micro Villa (excluding common areas like parking, social club, walkways)**
- **Target number of Micro-Villas is optional input; if specified, system highlights scenarios that meet the target**
- Amenity default costs are based on Dominican Republic market research and maintained in application database
- When subdivision changes, all financial inputs remain valid and only derived calculations (per-sqm shared costs, per-lot allocations) need updating
- Project data is automatically saved to local storage on every change for session persistence
- Images are stored in local storage for persistent access across sessions; large images (>10MB) may be compressed
- **AI-generated images from Google Nano Banana Pro are imported from project target directory and stored with uploaded images**
- One user works on one project at a time (no concurrent multi-user editing)
- Project JSON format is version 1.0 (future versions may need migration tools)
- Subdivision scenarios are displayed as 2D top-down schematics showing lots, social club, parking, walkways (no 3D visualization)
- Default social club percentage is 20% with 1% increment options from 10-30%
- **AI integration is manual (user clicks buttons to generate Claude Code prompts and Google Nano prompts) - no automatic triggers**
- **App root directory is D:\fast2ai\AI-Floorplan\src**
- **Micro Villas value proposition: social club amenities are available from day one (not built years later)**

## Scope

### In Scope

- Cross-platform desktop application (Windows 10+ and macOS 10.15+)
- Land parcel configuration with Dominican Republic-specific location data and optional target Micro-Villas count
- Automatic subdivision calculations with centralized social club positioning, centralized parking (2 spaces per villa), maintenance room, and walkways
- Mandatory parking area (2 spaces per villa, centralized, cost shared proportionally by lot sqm)
- Mandatory storage units (one per villa, location: social club OR individual patio)
- Mandatory maintenance room (user-defined size and location, cost shared proportionally by lot sqm)
- Comprehensive amenities catalog for social club design
- Complete financial analysis with proportional cost allocation (parking, walkways, landscaping, maintenance room shared by lot sqm) and multiple profit margin scenarios
- Multi-currency support (DOP and USD)
- Image management for land parcels and individual lots (uploaded and AI-generated)
- AI integration: manual triggers to generate Claude Code subdivision prompts and Google Nano Banana Pro image prompts
- Import optimized subdivisions from Claude Code
- Full project export/import to/from target disk directories via native file pickers
- Project target directory for AI tool integration (Claude Code and Google Nano can save results to project directory)
- Common area ownership and maintenance calculations (social club + parking + walkways + landscaping)
- Local storage for session persistence
- Offline operation capability (AI integration requires manual export/import workflow)

### Out of Scope

- Web browser version (desktop-only)
- Mobile applications (iOS/Android)
- 3D visualization or rendering of subdivisions
- Irregular or non-rectangular land parcels
- Automatic land valuation based on location
- Integration with real estate listing platforms
- Legal document generation (contracts, titles, etc.)
- Buyer management or sales tracking
- Construction planning or villa design tools
- Loan/financing calculators or banking integrations
- Cloud storage or online project sharing
- Multi-user collaboration or role-based access
- Automatic zoning/regulatory compliance checking
- Streets or road layout within subdivisions
- Integration with mapping services (Google Maps, etc.)
- Automatic amenity space requirement calculations
- Property appreciation projections
- Comparison with similar projects or market analysis
- Real-time currency exchange rate fetching

## Dependencies

- Desktop framework supporting Windows and macOS (Electron, Tauri, or native SDKs)
- File system access for project export/import operations
- Local storage mechanism (IndexedDB, SQLite, or equivalent)
- Native file/directory picker APIs
- User must provide all cost data (no external pricing databases)
- User must define amenity costs (or use provided defaults)
- User must know or research land acquisition costs
- Image files must be in supported formats and accessible on local system
- User must have basic knowledge of investment terms (profit margin, cost per sqm, etc.)

## Clarifications & Decisions

### Parking Allocation Strategy (CLARIFIED: 2026-01-11)
- **Decision**: Centralized parking area separate from individual Micro Villa lots
- **Rationale**: Keeps individual lot sizes smaller (90 sqm minimum without parking), simplifies lot layout, common ownership model aligns with social club approach
- **Implementation**: System automatically calculates parking area for exactly 2 spaces per Micro Villa, positioned centrally or near social club
- **Cost Allocation**: Parking construction and landscaping costs divided proportionally among all owners based on their lot square meters (larger lots pay proportionally more)

### Storage Unit Configuration (CLARIFIED: 2026-01-11)
- **Decision**: User decides per project - developer chooses between social club storage OR individual patio storage
- **Mandatory**: Every Micro Villa MUST have one storage unit
- **Rationale**: Flexibility for different project scales and market preferences - some buyers prefer patio convenience, others accept shared storage for smaller lot sizes
- **Cost Allocation**: Social club storage = costs divided proportionally by lot sqm; Individual patio storage = cost included in per-lot pricing

### Maintenance Room Configuration (CLARIFIED: 2026-01-11)
- **Decision**: User-defined area and location
- **Mandatory**: 100% of projects MUST include maintenance room
- **Rationale**: Maximum flexibility - developers can size maintenance room based on project scale and choose optimal location (in social club to consolidate utilities, or separate for better access)
- **Cost Allocation**: Maintenance room construction and equipment costs divided proportionally among all owners based on their lot square meters

### AI Integration Workflow (CLARIFIED: 2026-01-11)
- **Decision**: Manual trigger - user clicks buttons to request AI generation when ready
- **Rationale**: Gives developer control over when to engage AI tools, avoids unnecessary processing, allows review before AI generation
- **Claude Code Integration**: User clicks "Generate AI Subdivision Description" → system exports JSON with all constraints → Claude Code reads prompts and generates optimized subdivision → user imports results back into app
- **Google Nano Integration**: User clicks "Generate AI Image Prompts" → system exports detailed visual descriptions → Google Nano Banana Pro generates images → user imports images from project target directory

### Target Number of Micro-Villas (CLARIFIED: 2026-01-11)
- **Decision**: Optional input parameter (not mandatory)
- **Rationale**: Some developers have specific unit targets (e.g., "I need 20 villas"), others want to maximize land utilization
- **Implementation**: If target is specified, system validates feasibility and highlights subdivision scenarios that meet the target; if not specified, system auto-calculates maximum viable lots

### Minimum Lot Size Requirements
- System enforces minimum 90 sqm per Micro Villa lot (excluding common areas like parking, social club, walkways)
- Subdivision scenarios that would result in lots smaller than 90 sqm are filtered out and not presented to users
- Ensures all generated lots are viable vacation properties

### Financial Data Handling on Subdivision Changes
- When user changes selected subdivision scenario, all entered financial data (land cost, amenity costs, parking costs, walkway costs, maintenance room costs, storage costs, legal costs, other costs) is preserved
- System automatically recalculates all derived values (per-sqm shared costs, per-lot proportional allocations, pricing scenarios) based on the new subdivision configuration
- Provides user convenience and maintains data continuity across scenario comparisons

### Proportional Cost Allocation Method
- **Shared Costs** (parking, walkways, landscaping, maintenance room, social club storage if applicable): Divided among all owners proportionally based on their lot square meters
- **Example**: If Owner A has 100 sqm lot and Owner B has 150 sqm lot, and parking costs $10,000, Owner A pays $4,000 (40%) and Owner B pays $6,000 (60%)
- **Rationale**: Fair allocation - larger lot owners pay proportionally more for shared infrastructure they use

### Amenity Pricing Approach
- System provides recommended default costs in USD for all amenities based on Dominican Republic market research
- Users can override any default cost with their specific vendor quotes or quality preferences
- Recommended costs serve as starting point to accelerate financial analysis while maintaining flexibility

### Desktop Platform Choice
- Cross-platform desktop framework required (Electron selected - see plan.md and research.md)
- Native file system access is mandatory for export/import functionality and AI integration workflow
- Offline-first architecture with local storage persistence
- No web-only constraints (leverage desktop capabilities)
- **App root directory: D:\fast2ai\AI-Floorplan\src**

### Micro Villas Value Proposition
- **Core differentiator**: Social club amenities are built and operational from day one (not promised for future delivery)
- **Affordability**: Subdividing land into smaller lots makes vacation property ownership accessible to more buyers
- **Shared amenities**: Buyers get access to pool, BBQ areas, lounges, etc. immediately without waiting years for community development
