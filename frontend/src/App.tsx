import { useState } from 'react';
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

// Placeholder components - will be implemented in future tasks
const ShotsView = () => <div>Shots View</div>;
const ShotsTableView = () => <div>Shots Table View</div>;
const ShotsOverviewView = () => <div>Shots Overview</div>;
const ShotDetailView = () => <div>Shot Detail View</div>;
const AssetsView = () => <div>Assets View</div>;
const AssetsTableView = () => <div>Assets Table View</div>;
const AssetsOverviewView = () => <div>Assets Overview</div>;
const AssetDetailView = () => <div>Asset Detail View</div>;
const TasksView = () => <div>Tasks View</div>;
const TasksTableView = () => <div>Tasks Table View</div>;
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
  const [currentProject, setCurrentProject] = useState<ProjectConfig | null>({
    project_id: 'demo-project',
    storage_provider: 'gdrive',
    originals_root_url: 'https://drive.google.com/drive/folders/originals',
    proxies_root_url: 'https://drive.google.com/drive/folders/proxies',
    created_at: new Date(),
  });

  const handleProjectSetupComplete = (projectConfig: ProjectConfig) => {
    setCurrentProject(projectConfig);
    console.log('Project setup completed:', projectConfig);
  };

  const handleLogout = () => {
    setCurrentProject(null);
    console.log('User logged out');
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
              {isAuthenticated && currentProject ? (
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