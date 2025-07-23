import React, { useState, useEffect } from 'react';
import { ProjectConfig } from '../../../shared/types';
import { getAllProjects } from '../services/projectService';
import './ProjectSelector.css';

interface ProjectSelectorProps {
  onProjectSelect: (project: ProjectConfig) => void;
  currentProject?: ProjectConfig | null;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  onProjectSelect,
  currentProject
}) => {
  const [projects, setProjects] = useState<ProjectConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await getAllProjects();
      
      if (response.success && response.data) {
        setProjects(response.data);
        
        // Auto-select first project if no current project
        if (!currentProject && response.data.length > 0) {
          // Find the user's project (not demo-project) if available
          const userProject = response.data.find(p => p.project_id !== 'demo-project');
          const projectToSelect = userProject || response.data[0];
          onProjectSelect(projectToSelect);
        }
      } else {
        setError('Failed to load projects');
      }
    } catch (err) {
      setError('Error loading projects');
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleProjectSelect = (project: ProjectConfig) => {
    onProjectSelect(project);
    setIsDropdownOpen(false);
    
    // Save selected project to localStorage
    try {
      localStorage.setItem('selectedProjectId', project.project_id);
      localStorage.setItem('lastProjectSelection', new Date().toISOString());
    } catch (err) {
      console.error('Error saving project selection to localStorage:', err);
    }
  };

  if (loading) {
    return (
      <div className="project-selector">
        <div className="loading">Loading projects...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="project-selector">
        <div className="error">
          {error}
          <button onClick={fetchProjects}>Retry</button>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="project-selector">
        <div className="no-project">
          No projects found
          <button onClick={() => window.location.href = '/setup'}>Create Project</button>
        </div>
      </div>
    );
  }

  return (
    <div className="project-selector">
      <div className="project-dropdown">
        <button 
          className="dropdown-toggle" 
          onClick={toggleDropdown}
          aria-haspopup="true"
          aria-expanded={isDropdownOpen}
        >
          {currentProject ? currentProject.project_id : 'Select Project'}
          <span className="dropdown-arrow">▼</span>
        </button>
        
        {isDropdownOpen && (
          <div className="dropdown-menu">
            {projects.map(project => (
              <div 
                key={project.project_id} 
                className={`dropdown-item ${currentProject?.project_id === project.project_id ? 'active' : ''}`}
                onClick={() => handleProjectSelect(project)}
              >
                <div className="project-name">{project.project_id}</div>
                <div className="project-details">
                  <span>Storage: {project.storage_provider}</span>
                  <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {currentProject && (
        <div className="project-info">
          <div className="project-details">
            <p>Storage: {currentProject.storage_provider}</p>
            <p>Created: {new Date(currentProject.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      )}
    </div>
  );
};