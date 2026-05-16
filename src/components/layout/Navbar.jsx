import { useAuth } from "../../context/AuthContext";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Intelligence", href: "/intelligence" },
  { label: "Community", href: "/community" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Integration", href: "/integration" },
  { label: "Analyze", href: "/analyze" }
];

function Navbar() {
  const currentPath = window.location.pathname;
  const { user, isAuthenticated, logout } = useAuth();

  function handleLogout() {
    logout();
    window.location.href = "/";
  }

  return (
    <header className="navbar-wrap">
      <div className="container navbar">
        <a className="brand" href="/">
          Verdara
        </a>
        <nav>
          <ul className="nav-list">
            {navItems.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className={currentPath === item.href ? "nav-link-active" : ""}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="nav-auth">
          {isAuthenticated ? (
            <div className="user-menu">
              <span className="user-label">Welcome, {user?.username}</span>
              <button
                className="btn btn-secondary"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <a href="/login" className="btn btn-secondary">
                Login
              </a>
              <a href="/signup" className="btn btn-primary">
                Sign Up
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
