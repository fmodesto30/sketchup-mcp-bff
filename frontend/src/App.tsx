import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/shell/app-shell";
import Overview from "@/screens/overview";
import Agents from "@/screens/agents";
import Runs from "@/screens/runs";
import RunDetail from "@/screens/run-detail";
import Workflows from "@/screens/workflows";
import Models from "@/screens/models";
import Decisions from "@/screens/decisions";
import Artifacts from "@/screens/artifacts";
import Docs from "@/screens/docs";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Overview />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/runs" element={<Runs />} />
        <Route path="/runs/:id" element={<RunDetail />} />
        <Route path="/workflows" element={<Workflows />} />
        <Route path="/models" element={<Models />} />
        <Route path="/decisions" element={<Decisions />} />
        <Route path="/artifacts" element={<Artifacts />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
