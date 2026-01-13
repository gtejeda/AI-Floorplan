/**
 * ProjectSetup Page
 * Main page for setting up a new project with land parcel configuration
 * Phase 3: User Story 1 - Land Investment Setup
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LandConfig } from '../components/LandConfig/LandConfig';
import { ImageManager } from '../components/ImageManager/ImageManager';
import { Project } from '../models/Project';
import { LandParcel } from '../models/LandParcel';
import './ProjectSetup.css';

export const ProjectSetup: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [project, setProject] = useState<Project | null>(null);
  const [landParcel, setLandParcel] = useState<LandParcel | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectNotes, setProjectNotes] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(true);
  const [error, setError] = useState<string>('');
  const [showProjectList, setShowProjectList] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);

  // Load project on mount if exists
  useEffect(() => {
    loadExistingProject();
  }, []);

  // Listen for menu events
  useEffect(() => {
    // Menu: New Project
    window.electronAPI.onMenuNewProject(() => {
      handleNewProject();
    });

    // Menu: Open Project
    window.electronAPI.onMenuOpenProject(() => {
      handleOpenProjectDialog();
    });

    // Menu: Export
    window.electronAPI.onMenuExport(() => {
      if (project) {
        navigate('/export');
      }
    });

    // Menu: Import
    window.electronAPI.onMenuImport(() => {
      navigate('/import');
    });
  }, [project, navigate]);

  const loadExistingProject = async () => {
    try {
      // Try to load the most recent project
      // This is a simplified version - in production, you'd have a project list
      // For now, we'll just check if there's a saved project ID in localStorage
      const savedProjectId = localStorage.getItem('currentProjectId');
      console.log('[ProjectSetup] Loading project ID from localStorage:', savedProjectId);

      if (savedProjectId) {
        const loadedProject = await window.electronAPI.loadProject(savedProjectId);
        console.log('[ProjectSetup] Loaded project:', loadedProject);
        setProject(loadedProject);
        setShowCreateForm(false);

        // Load land parcel if exists
        if (loadedProject.landParcelId) {
          console.log('[ProjectSetup] Project has land parcel ID:', loadedProject.landParcelId);
          try {
            const loadedLandParcel = await window.electronAPI.loadLandParcel(
              loadedProject.landParcelId
            );
            console.log('[ProjectSetup] Loaded land parcel:', loadedLandParcel);
            setLandParcel(loadedLandParcel);
          } catch (error) {
            console.error('[ProjectSetup] Error loading land parcel:', error);
          }
        } else {
          console.log('[ProjectSetup] Project has no land parcel ID');
        }
      }
    } catch (error: any) {
      console.error('[ProjectSetup] Error loading project:', error);
      // No existing project, show create form
      setShowCreateForm(true);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      setIsCreatingProject(true);

      const newProject = await window.electronAPI.createProject({
        name: projectName,
        notes: projectNotes || undefined,
      });

      setProject(newProject);
      setShowCreateForm(false);

      // Save project ID to localStorage
      localStorage.setItem('currentProjectId', newProject.id);

      console.log('Project created:', newProject);
    } catch (error: any) {
      console.error('Error creating project:', error);
      setError(error.message || 'Failed to create project');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleLandParcelSaved = async (savedLandParcel: LandParcel) => {
    setLandParcel(savedLandParcel);
    console.log('Land parcel saved:', savedLandParcel);

    // Update local project state with land parcel ID (no need to reload entire project)
    if (project && !project.landParcelId) {
      // Only update if landParcelId isn't set yet (first-time save)
      setProject({
        ...project,
        landParcelId: savedLandParcel.id,
        modified: new Date(),
      });
      console.log('Project updated with land parcel ID:', savedLandParcel.id);
    }
  };

  const handleNewProject = () => {
    // Clear current project
    localStorage.removeItem('currentProjectId');
    setProject(null);
    setLandParcel(null);
    setProjectName('');
    setProjectNotes('');
    setShowCreateForm(true);
    setError('');
  };

  const handleOpenProjectDialog = async () => {
    try {
      const projects = await window.electronAPI.listProjects();
      setAvailableProjects(projects);
      setShowProjectList(true);
    } catch (error: any) {
      console.error('Error loading projects:', error);
      setError('Failed to load projects');
    }
  };

  const handleSelectProject = async (selectedProject: Project) => {
    try {
      setProject(selectedProject);
      setShowProjectList(false);
      setShowCreateForm(false);
      localStorage.setItem('currentProjectId', selectedProject.id);

      // Load land parcel if exists
      if (selectedProject.landParcelId) {
        try {
          const loadedLandParcel = await window.electronAPI.loadLandParcel(
            selectedProject.landParcelId
          );
          setLandParcel(loadedLandParcel);
          console.log('Loaded land parcel:', loadedLandParcel);
        } catch (error) {
          console.error('Error loading land parcel:', error);
        }
      }
    } catch (error: any) {
      console.error('Error opening project:', error);
      setError('Failed to open project');
    }
  };

  const handleNextStep = () => {
    // Navigate to subdivision planning page
    navigate('/subdivision');
  };

  return (
    <div className="project-setup">
      <div className="page-header">
        <h1>Micro Villas Investment Platform</h1>
        <p>Configure your land parcel and start your investment analysis</p>
      </div>

      {/* Project List Dialog */}
      {showProjectList && (
        <div className="modal-overlay" onClick={() => setShowProjectList(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Open Project</h2>
            <div className="project-list">
              {availableProjects.length === 0 ? (
                <p className="empty-state">
                  No projects found. Create a new project to get started.
                </p>
              ) : (
                availableProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="project-item"
                    onClick={() => handleSelectProject(proj)}
                  >
                    <div className="project-item-header">
                      <h3>{proj.name}</h3>
                      <span className="status-badge">{proj.status}</span>
                    </div>
                    {proj.notes && <p className="project-item-notes">{proj.notes}</p>}
                    <p className="project-item-meta">
                      Modified: {new Date(proj.modified).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowProjectList(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateForm ? (
        <div className="create-project-section">
          <div className="create-project-header">
            <h2>Create New Project</h2>
            <button type="button" className="btn-secondary" onClick={handleOpenProjectDialog}>
              Open Existing Project
            </button>
          </div>

          <form onSubmit={handleCreateProject} className="create-project-form">
            <div className="form-group">
              <label htmlFor="project-name">Project Name *</label>
              <input
                id="project-name"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="E.g., Villa Paradise Investment"
                required
                maxLength={200}
              />
            </div>

            <div className="form-group">
              <label htmlFor="project-notes">Notes (optional)</label>
              <textarea
                id="project-notes"
                value={projectNotes}
                onChange={(e) => setProjectNotes(e.target.value)}
                placeholder="Add any notes about this project..."
                rows={4}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={isCreatingProject}>
                {isCreatingProject ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="project-info">
            <div className="project-header">
              <div>
                <h2>{project?.name}</h2>
                {project?.notes && <p className="project-notes">{project.notes}</p>}
                <p className="project-meta">
                  Created: {project && new Date(project.created).toLocaleDateString()} | Status:{' '}
                  <span className="status-badge">{project?.status}</span>
                </p>
              </div>
              <button type="button" className="btn-secondary" onClick={handleNewProject}>
                New Project
              </button>
            </div>
          </div>

          <div className="land-config-section">
            {project && (
              <LandConfig
                projectId={project.id}
                initialData={landParcel || undefined}
                onSave={handleLandParcelSaved}
              />
            )}
          </div>

          {/* T160: Integrate ImageManager for land parcel images */}
          {project && landParcel && (
            <div className="image-manager-section">
              <ImageManager
                projectId={project.id}
                associationType="land-parcel"
                targetDirectory={project.targetDirectory}
              />
            </div>
          )}

          {landParcel && (
            <div className="navigation-actions">
              <div className="success-message">
                ✓ Land parcel configured successfully! Ready to proceed.
              </div>
              <button type="button" className="btn-primary btn-large" onClick={handleNextStep}>
                Next: Subdivision Planning →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProjectSetup;
