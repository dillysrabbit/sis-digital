import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import SISEditor from "./pages/SISEditor";
import Admin from "./pages/Admin";
import TextBlocksAdmin from "./pages/TextBlocksAdmin";
import PrintPlan from "./pages/PrintPlan";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/sis/new" component={SISEditor} />
      <Route path="/sis/:id" component={SISEditor} />
      <Route path="/print/:id" component={PrintPlan} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/textblocks" component={TextBlocksAdmin} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
