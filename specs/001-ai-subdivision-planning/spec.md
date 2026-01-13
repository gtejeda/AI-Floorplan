# Feature Specification: AI-Assisted Subdivision Planning

**Feature Branch**: `001-ai-subdivision-planning`
**Created**: 2026-01-11
**Status**: Draft
**Input**: User description: "let's implement proper Subdivision planning with AI help; at this point we know the lot dimensions and the target sub-lot (Micro-Villas); We should use Gemini and Nano Banana Pro to start generating the sub-divisions; first the sub-division dimensions text, get that approved, then use that approved plan to generate images for the whole project view"

## Clarifications

### Session 2026-01-11

- Q: How should approved subdivision plans be persisted across application sessions? → A: Auto-save approved plans immediately upon approval AND reload the last approved plan on app startup
- Q: How should image generation be triggered after plan approval? → A: Require user to manually click "Generate Images" button after approval (button becomes enabled only after approval)
- Q: How should generated images be persisted and reloaded across sessions? → A: Auto-save generated images and automatically display them when loading an approved plan that has associated images
- Q: What is the project/plan data model for persistence? → A: Single active project per application instance; only one approved plan can exist at a time (new approval replaces old)
- Q: How should image regeneration handle previously generated images? → A: Keep previous image version as backup until user explicitly confirms new version is acceptable

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate Text-Based Subdivision Plan (Priority: P1)

A real estate investor has entered their land parcel dimensions and wants to explore how to subdivide it into micro-villa lots. They need an AI-generated subdivision plan with specific dimensions that they can review and approve before visualizing.

**Why this priority**: This is the foundation of the feature - without an approved text-based plan, no images can be generated. It delivers immediate value by providing professional subdivision layouts without manual calculation.

**Independent Test**: Can be fully tested by entering land dimensions, requesting a subdivision plan, receiving AI-generated layout with specific lot dimensions and counts, and approving or rejecting the plan. Delivers value even without image generation by providing dimensionally-accurate subdivision proposals.

**Acceptance Scenarios**:

1. **Given** land parcel dimensions are entered (length, width, total area), **When** user requests AI subdivision planning, **Then** system generates a text-based subdivision plan showing number of lots, individual lot dimensions, road widths, amenity areas, and total coverage
2. **Given** a subdivision plan is generated, **When** user reviews the plan, **Then** user can see all lot dimensions meet minimum 90 sqm requirement and understand the spatial layout through descriptive text
3. **Given** user reviews a subdivision plan, **When** user approves the plan, **Then** system immediately auto-saves the approved plan to database (replacing any previously approved plan) and marks it as ready for image generation
4. **Given** an approved subdivision plan was saved in a previous session, **When** user reopens the application, **Then** system automatically loads the approved plan and displays it without requiring regeneration
5. **Given** user reviews a subdivision plan, **When** user rejects the plan, **Then** user can request alternative subdivision layouts with different parameters (lot sizes, road configurations, amenity placements)
6. **Given** land dimensions result in no viable subdivisions, **When** AI generates plan, **Then** system explains why subdivision is not possible and suggests minimum land size needed

---

### User Story 2 - Generate Project Visualization Images (Priority: P2)

After approving a text-based subdivision plan, the investor wants to see visual representations of the entire project layout including lots, roads, amenities, and the overall site plan.

**Why this priority**: Visual confirmation is critical for investment decisions but depends on having an approved plan first. This transforms abstract numbers into concrete visualizations investors can present to stakeholders.

**Independent Test**: Can be tested independently by starting with a pre-approved subdivision plan, requesting image generation, and receiving multiple visual representations (site plan, 3D overview, individual lot views). Delivers value by enabling investor presentations and marketing materials.

**Acceptance Scenarios**:

1. **Given** a subdivision plan is approved, **When** user views the approved plan, **Then** "Generate Images" button becomes enabled and is visibly available
2. **Given** "Generate Images" button is enabled, **When** user clicks the button, **Then** system begins generating a top-down site plan image showing all lots, roads, and amenities with labels
3. **Given** image generation is in progress, **When** user waits, **Then** system shows generation progress and estimated completion time
4. **Given** images are generated, **When** user views them, **Then** user sees multiple perspectives (2D site plan, aerial view, and neighborhood context view)
5. **Given** generated images, **When** generation completes, **Then** images are automatically saved to file system and linked to the approved subdivision plan in database
6. **Given** approved plan with previously generated images exists, **When** user reopens application and loads the plan, **Then** system automatically displays the saved images without regeneration
7. **Given** generated images don't meet expectations, **When** user requests regeneration with refinement prompts, **Then** system generates new images while preserving previous version as backup
8. **Given** regenerated images are displayed alongside previous version, **When** user confirms new version is acceptable, **Then** system replaces the displayed images and archives the old version

---

### User Story 3 - Compare Multiple AI-Generated Subdivision Options (Priority: P3)

An investor wants to compare different subdivision strategies (maximize lot count vs. larger lots with premium pricing, different amenity allocations) before committing to one plan.

**Why this priority**: Advanced optimization feature that enhances decision-making but isn't required for basic subdivision planning. Provides competitive advantage for sophisticated investors.

**Independent Test**: Can be tested by requesting multiple subdivision plans for the same land parcel, viewing them side-by-side with comparative metrics (total lots, average lot size, amenity percentage), and selecting preferred option. Delivers value through data-driven investment optimization.

**Acceptance Scenarios**:

1. **Given** land parcel dimensions are entered, **When** user requests multiple subdivision options, **Then** system generates 3-5 different plans with varying lot counts and layouts
2. **Given** multiple subdivision plans are generated, **When** user reviews them, **Then** user sees comparison table showing lot count, average lot size, road coverage, amenity percentage, and estimated costs for each option
3. **Given** comparison view is displayed, **When** user selects a preferred plan, **Then** system designates it as the active plan and archives alternatives for future reference
4. **Given** archived alternative plans exist, **When** user changes their mind, **Then** user can switch to a different plan without regenerating from scratch

---

### Edge Cases

- What happens when land parcel is too small to subdivide into even one 90 sqm lot after accounting for roads and setbacks?
- How does system handle irregular land shapes (non-rectangular parcels) when generating subdivision plans?
- What happens if AI service (Gemini or Nano Banana Pro) is unavailable or returns errors during generation?
- How does system handle very large land parcels that could result in hundreds of lots (performance and visualization limits)?
- What happens when user requests regeneration multiple times in quick succession (rate limiting, cost management)?
- How does system handle approved plans if land dimensions change after approval?
- What happens when database references generated images but the image files are missing or corrupted on disk (allow regeneration without error)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST integrate with Gemini AI to generate text-based subdivision plans from land parcel dimensions
- **FR-002**: System MUST integrate with Nano Banana Pro AI to generate project visualization images from approved subdivision plans
- **FR-003**: System MUST validate that all proposed lots meet minimum 90 sqm size requirement before presenting plan to user
- **FR-004**: System MUST generate subdivision plans that include lot dimensions, road widths, amenity area allocations, and total coverage calculations
- **FR-005**: System MUST allow users to approve or reject generated subdivision plans with feedback for refinements
- **FR-006**: System MUST immediately auto-save approved subdivision plan to the project database upon approval (replacing any previously approved plan as only one active plan is supported), and automatically reload the approved plan on application startup
- **FR-007**: System MUST pass approved subdivision plan details as structured prompts to image generation AI
- **FR-008**: System MUST generate multiple visual perspectives of the project (site plan, aerial view, context view)
- **FR-009**: System MUST display generation progress for both text and image generation phases
- **FR-010**: System MUST handle AI service errors gracefully with user-friendly error messages and retry options
- **FR-011**: System MUST allow users to request alternative subdivision layouts without losing previous proposals
- **FR-012**: System MUST calculate and display total lot count, road coverage percentage, and amenity coverage for each plan
- **FR-013**: System MUST disable "Generate Images" button until a subdivision plan is explicitly approved, then enable the button requiring manual user click to trigger image generation
- **FR-014**: System MUST automatically save generated images to file system with database references linking them to their source subdivision plan, and automatically load and display these images when the associated approved plan is loaded
- **FR-015**: System MUST support regeneration of images with user-provided refinement prompts while preserving previous image version as backup until user explicitly confirms the new version is acceptable

### Key Entities

- **Subdivision Plan**: AI-generated layout containing lot array (each with dimensions and position), road network configuration (widths and layout), amenity area allocations, total coverage metrics, approval status, generation timestamp, and source AI model
- **AI Generation Request**: Represents a request to AI service containing input parameters (land dimensions, constraints, user preferences), target AI service (Gemini for text, Nano Banana Pro for images), generation status, response data, error messages if failed, and timestamp
- **Project Visualization**: Generated image asset with file system path reference, associated subdivision plan ID, view type (site plan/aerial/context), generation parameters used, user satisfaction rating, regeneration history, backup image reference (previous version kept until user confirms new version), confirmation status, and auto-load flag indicating whether to display on plan load
- **Subdivision Lot**: Individual lot within a plan containing dimensions (length, width, area), position coordinates, lot number/identifier, and compliance status with minimum size requirement

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users receive AI-generated subdivision plan within 30 seconds of submitting land dimensions
- **SC-002**: 95% of generated subdivision plans comply with 90 sqm minimum lot requirement without manual intervention
- **SC-003**: Users can approve or reject a subdivision plan and provide feedback in under 2 minutes
- **SC-004**: Project visualization images are generated within 2 minutes of plan approval
- **SC-005**: System successfully handles AI service failures with clear error messages and recovery options in 100% of error cases
- **SC-006**: 80% of users successfully generate and approve a subdivision plan on their first or second attempt
- **SC-007**: Generated images accurately represent the approved subdivision plan (verified through user acceptance rate >85%)
- **SC-008**: System maintains all approved plans and generated images across application sessions with 100% data persistence

## Assumptions

- Gemini AI and Nano Banana Pro services are accessible via API and have sufficient rate limits for anticipated usage
- Land parcel dimensions provided by users are accurate and in metric units (square meters)
- Standard road width conventions apply (assumed 6-8 meters unless specified in prompts)
- Users understand basic subdivision terminology (lots, setbacks, amenities, coverage)
- Desktop application has persistent internet connection for AI service calls (offline AI not in scope)
- Image generation produces standard image formats (PNG/JPEG) that can be stored in local file system
- User approval is a binary decision (approve/reject) with optional text feedback for refinements
- Application supports single active project model: only one approved subdivision plan exists at a time, new approvals replace previous ones
- Multiple subdivision plan requests for same land parcel are treated as independent explorations (not automatically linked)

## Dependencies

- Gemini AI API availability and response times
- Nano Banana Pro API availability and image generation capacity
- Existing land parcel data entry system (user has already entered land dimensions)
- Project database schema supporting subdivision plan and image storage
- File system access for storing generated images
- Network connectivity for AI API calls

## Out of Scope

- Manual subdivision editing (users cannot drag-and-drop lots or roads in this version)
- Multi-project management (only one active project/approved plan supported per application instance)
- Cost estimation or financial analysis integration (separate feature)
- 3D walkthrough or interactive visualization (only static images in this version)
- AI training or customization (use AI services as-is)
- Offline AI generation (requires internet connection)
- Real-time collaboration on subdivision plans (single-user approval workflow)
- Integration with external GIS or mapping services
- Automated compliance checking with local zoning regulations (only 90 sqm minimum enforced)
