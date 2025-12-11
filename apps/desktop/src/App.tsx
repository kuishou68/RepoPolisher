import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ProjectsPage } from '@/pages/Projects';
import { ProjectDetailPage } from '@/pages/Projects/ProjectDetail';
import { AnalysisPage } from '@/pages/Analysis';
import { PRsPage } from '@/pages/PRs';
import { SettingsPage } from '@/pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="analysis" element={<AnalysisPage />} />
        <Route path="prs" element={<PRsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
