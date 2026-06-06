import Navbar from "./components/layout/Navbar";
import HomePage from "./pages/HomePage";
import MarketplacePage from "./pages/MarketplacePage";
import IntegrationPage from "./pages/IntegrationPage";
import AnalyzePage from "./pages/AnalyzePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import { AuthProvider } from "./context/AuthContext";

const routes = {
  "/": HomePage,
  "/marketplace": MarketplacePage,
  "/integration": IntegrationPage,
  "/analyze": AnalyzePage,
  "/login": LoginPage,
  "/signup": SignupPage
};

function AppContent() {
  const Page = routes[window.location.pathname] || null;

  return (
    <div className="app-shell">
      <Navbar />
      <main>
        {Page ? (
          <Page />
        ) : (
          <section className="not-found-page">
            <div className="container">
              <p className="eyebrow">Page not found</p>
              <h1>This route is not available yet.</h1>
              <a className="btn btn-primary" href="/">
                Back to home
              </a>
            </div>
          </section>
        )}
        <footer className="footer-band">
          <div className="container footer-band-inner">
            <p className="footer-brand">Verdara</p>
            <p>
              Building smarter agriculture for farmers, municipalities, and
              institutions.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
