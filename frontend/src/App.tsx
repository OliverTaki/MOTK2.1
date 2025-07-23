import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { ProjectConfig } from '@shared/types';
import theme from './theme';
import { queryClient } from './lib/queryClient';
import { ProjectSetupWizard } from './components/project-setup';
import { Dashboard, ProjectSettings } from './components/dashboard';
import { AppNavigation } from './components/navigation';
import { ErrorBoundary, ErrorProvider } from './components/error-handling';
import { NotificationProvider } from './components/notifications';
import { errorLogger } from './services/error';

// Import data table components
import { ShotsTable, AssetsTable, TasksTable } from './components/data-display';

// Placeholder components - will be implemented in future tasks
const ShotsView = () => <ShotsTable />;
const ShotsTableView = () => <ShotsTable />;
const ShotsOverviewView = () => <div>Shots Overview</div>;
const ShotDetailView = () => <div>Shot Detail View</div>;
const AssetsView = () => <AssetsTable />;
const AssetsTableView = () => <AssetsTable />;
const AssetsOverviewView = () => <div>Assets Overview</div>;
const AssetDetailView = () => <div>Asset Detail View</div>;
const TasksView = () => <TasksTable />;
const TasksTableView = () => <TasksTable />;
const TasksScheduleView = () => <div>Tasks Schedule View</div>;
const TaskDetailView = () => <div>Task Detail View</div>;
const TeamView = () => <div>Team View</div>;
const TeamMembersView = () => <div>Team Members View</div>;
const MemberDetailView = () => <div>Member Detail View</div>;
const TeamChatView = () => <div>Team Chat View</div>;
const TeamForumView = () => <div>Team Forum View</div>;
const ProfileView = () => <div>Profile View</div>;
const HelpView = () => <div>Help View</div>;
const NotFound = () => <div>404 - Page Not Found</div>;

function App() {
  const [isAuthenticated] = useState(true); // Set to true for development
  // ハードコードされたプロジェクト設定
  const [currentProject, setCurrentProject] = useState<ProjectConfig | null>({
    project_id: 'Oliver05',
    storage_provider: 'gdrive',
    originals_root_url: 'https://drive.google.com/drive/folders/1bGlJgxkCwKjtTpKY7v1AtbvAPro9Zt2u',
    proxies_root_url: 'https://drive.google.com/drive/folders/1cWedhZ1l_O1ehKPD5OB1qAZbws2G1nbU',
    created_at: new Date('2025-07-23T01:27:38.635Z')
  });
  const [isLoadingProject, setIsLoadingProject] = useState(false); // 読み込み中フラグをfalseに設定

  // Load selected project from localStorage on startup
  useEffect(() => {
    const loadSavedProject = async () => {
      try {
        console.log('🔍 Loading project data...');
        setIsLoadingProject(true);
        const { getAllProjects, getProject } = await import('./services/projectService');
        
        // Try to load the Oliver05 project directly
        try {
          console.log('🔄 Fetching Oliver05 project directly');
          const projectResponse = await getProject('Oliver05');
          console.log('📊 Oliver05 project response:', projectResponse);
          
          if (projectResponse.success && projectResponse.data) {
            console.log('✅ Successfully loaded Oliver05 project:', projectResponse.data);
            setCurrentProject({
              project_id: projectResponse.data.project_id,
              storage_provider: projectResponse.data.storage_provider,
              originals_root_url: projectResponse.data.originals_root_url,
              proxies_root_url: projectResponse.data.proxies_root_url,
              created_at: new Date(projectResponse.data.created_at)
            });
            
            // Save to localStorage
            localStorage.setItem('selectedProjectId', 'Oliver05');
            localStorage.setItem('lastProjectSelection', new Date().toISOString());
            return; // Successfully loaded Oliver05 project, exit early
          } else {
            console.warn('⚠️ Failed to load Oliver05 project:', projectResponse.error);
          }
        } catch (error) {
          console.error('❌ Error loading Oliver05 project:', error);
        }
        
        // If Oliver05 project loading failed, try the saved project ID
        const savedProjectId = localStorage.getItem('selectedProjectId');
        console.log('📋 Saved project ID from localStorage:', savedProjectId);
        
        if (savedProjectId && savedProjectId !== 'Oliver05') {
          // If we have a saved project ID, try to load it
          try {
            console.log('🔄 Fetching specific project:', savedProjectId);
            // First try to get the specific project
            const projectResponse = await getProject(savedProjectId);
            console.log('📊 Project response:', projectResponse);
            
            if (projectResponse.success && projectResponse.data) {
              console.log('✅ Successfully loaded saved project:', projectResponse.data);
              setCurrentProject({
                project_id: projectResponse.data.project_id,
                storage_provider: projectResponse.data.storage_provider,
                originals_root_url: projectResponse.data.originals_root_url,
                proxies_root_url: projectResponse.data.proxies_root_url,
                created_at: new Date(projectResponse.data.created_at)
              });
              return; // Successfully loaded saved project, exit early
            } else {
              console.warn('⚠️ Failed to load saved project:', projectResponse.error);
            }
          } catch (error) {
            console.error('❌ Error loading saved project:', error);
            // Clear the saved project ID if it's invalid
            localStorage.removeItem('selectedProjectId');
          }
        }
        
        // If we get here, both Oliver05 and saved project ID failed
        // Try to get all projects
        try {
          console.log('🔄 Fetching all projects...');
          const allProjectsResponse = await getAllProjects();
          console.log('📊 All projects response:', allProjectsResponse);
          
          if (allProjectsResponse.success && allProjectsResponse.data && allProjectsResponse.data.length > 0) {
            console.log('📋 Available projects:', allProjectsResponse.data);
            // Find the user's project (not demo-project) if available
            const userProject = allProjectsResponse.data.find(p => p.project_id !== 'demo-project');
            const projectToSelect = userProject || allProjectsResponse.data[0];
            console.log('✅ Selected project:', projectToSelect);
            setCurrentProject(projectToSelect);
            
            // Update localStorage with the selected project
            localStorage.setItem('selectedProjectId', projectToSelect.project_id);
            localStorage.setItem('lastProjectSelection', new Date().toISOString());
          } else {
            console.warn('⚠️ No projects found or API error:', allProjectsResponse.error);
          }
        } catch (error) {
          console.error('❌ Error loading projects:', error);
        }
      } finally {
        setIsLoadingProject(false);
      }
    };
    
    loadSavedProject();
  }, []);

  const handleProjectSetupComplete = (projectConfig: ProjectConfig) => {
    setCurrentProject(projectConfig);
    console.log('Project setup completed:', projectConfig);
    
    // Save to localStorage
    try {
      localStorage.setItem('selectedProjectId', projectConfig.project_id);
      localStorage.setItem('lastProjectSelection', new Date().toISOString());
    } catch (err) {
      console.error('Error saving project selection to localStorage:', err);
    }
  };

  const handleLogout = () => {
    setCurrentProject(null);
    console.log('User logged out');
    
    // Clear from localStorage
    try {
      localStorage.removeItem('selectedProjectId');
      localStorage.removeItem('lastProjectSelection');
    } catch (err) {
      console.error('Error clearing project selection from localStorage:', err);
    }
  };

  const ProjectSetupPage = () => (
    <ProjectSetupWizard 
      onComplete={handleProjectSetupComplete}
    />
  );

  // Main app layout with navigation
  const AppLayout = ({ children }: { children: React.ReactNode }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppNavigation
        projectName={currentProject?.project_id || 'MOTK Project'}
        userName="Demo User"
        onLogout={handleLogout}
      />
      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>
    </Box>
  );

  return (
    <ErrorBoundary
      errorLogger={errorLogger}
      onReset={() => {
        // Clear any cached error states
        queryClient.clear();
      }}
    >
      <ErrorProvider>
        <NotificationProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
              {isLoadingProject ? (
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '100vh',
                  flexDirection: 'column',
                  gap: 2
                }}>
                  <div className="loading-spinner"></div>
                  <div>Loading project data...</div>
                </Box>
              ) : isAuthenticated && currentProject ? (
                <AppLayout>
                  <Routes>
                    <Route 
                      path="/" 
                      element={
                        <ErrorBoundary>
                          <Dashboard 
                            projectId={currentProject.project_id}
                            projectName={currentProject.project_id}
                          />
                        </ErrorBoundary>
                      } 
                    />
                    <Route path="/shots" element={<ErrorBoundary><ShotsView /></ErrorBoundary>} />
                    <Route path="/shots/table" element={<ErrorBoundary><ShotsTableView /></ErrorBoundary>} />
                    <Route path="/shots/overview" element={<ErrorBoundary><ShotsOverviewView /></ErrorBoundary>} />
                    <Route path="/shots/detail" element={<ErrorBoundary><ShotDetailView /></ErrorBoundary>} />
                    <Route path="/assets" element={<ErrorBoundary><AssetsView /></ErrorBoundary>} />
                    <Route path="/assets/table" element={<ErrorBoundary><AssetsTableView /></ErrorBoundary>} />
                    <Route path="/assets/overview" element={<ErrorBoundary><AssetsOverviewView /></ErrorBoundary>} />
                    <Route path="/assets/detail" element={<ErrorBoundary><AssetDetailView /></ErrorBoundary>} />
                    <Route path="/tasks" element={<ErrorBoundary><TasksView /></ErrorBoundary>} />
                    <Route path="/tasks/table" element={<ErrorBoundary><TasksTableView /></ErrorBoundary>} />
                    <Route path="/tasks/schedule" element={<ErrorBoundary><TasksScheduleView /></ErrorBoundary>} />
                    <Route path="/tasks/detail" element={<ErrorBoundary><TaskDetailView /></ErrorBoundary>} />
                    <Route path="/team" element={<ErrorBoundary><TeamView /></ErrorBoundary>} />
                    <Route path="/team/members" element={<ErrorBoundary><TeamMembersView /></ErrorBoundary>} />
                    <Route path="/team/member-detail" element={<ErrorBoundary><MemberDetailView /></ErrorBoundary>} />
                    <Route path="/team/chat" element={<ErrorBoundary><TeamChatView /></ErrorBoundary>} />
                    <Route path="/team/forum" element={<ErrorBoundary><TeamForumView /></ErrorBoundary>} />
                    <Route 
                      path="/settings" 
                      element={
                        <ErrorBoundary>
                          <ProjectSettings projectId={currentProject.project_id} />
                        </ErrorBoundary>
                      } 
                    />
                    <Route path="/profile" element={<ErrorBoundary><ProfileView /></ErrorBoundary>} />
                    <Route path="/help" element={<ErrorBoundary><HelpView /></ErrorBoundary>} />
                    <Route path="/setup" element={<ErrorBoundary><ProjectSetupPage /></ErrorBoundary>} />
                    <Route path="*" element={<ErrorBoundary><NotFound /></ErrorBoundary>} />
                  </Routes>
                </AppLayout>
              ) : (
                <Routes>
                  <Route path="*" element={
                    <ErrorBoundary>
                      <ProjectSetupPage />
                    </ErrorBoundary>
                  } />
                </Routes>
              )}
          </ThemeProvider>
        </NotificationProvider>
      </ErrorProvider>
    </ErrorBoundary>
  );
}

export default App;