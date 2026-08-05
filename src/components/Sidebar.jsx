import {
  Compass,
  LogOut,
  MessageCircle,
  Moon,
  Sparkles,
  Sun,
  UserRound,
  UsersRound,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import "../styles/sidebar.css";

function Sidebar({
  activePage,
  onNavigate,
}) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const displayName =
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    "Velvet member";

  const initial =
    displayName.trim()[0]?.toUpperCase() || "V";

  const navigation = [
    {
      id: "discover",
      label: "Discover",
      icon: Compass,
    },
    {
      id: "characters",
      label: "Characters",
      icon: UsersRound,
    },
    {
      id: "chats",
      label: "Chats",
      icon: MessageCircle,
    },
  ];

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      console.error(
        "Error signing out:",
        error
      );
    }
  }

  return (
    <aside className="sidebar">
      <header className="sidebar__brand">
        <Sparkles size={17} />
        <span>VELVET</span>
      </header>

      <nav className="sidebar__navigation">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              className={`sidebar__link ${
                activePage === item.id
                  ? "sidebar__link--active"
                  : ""
              }`}
              onClick={() =>
                onNavigate(item.id)
              }
            >
              <Icon size={21} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <footer className="sidebar__footer">
        <div className="theme-selector">
          <button
            className={
              theme === "light"
                ? "theme-selector__active"
                : ""
            }
            onClick={() =>
              theme === "dark" && toggleTheme()
            }
          >
            <Sun size={17} />
            <span>Light</span>
          </button>

          <button
            className={
              theme === "dark"
                ? "theme-selector__active"
                : ""
            }
            onClick={() =>
              theme === "light" && toggleTheme()
            }
          >
            <Moon size={17} />
            <span>Dark</span>
          </button>
        </div>

        <div className="sidebar__account">
          <div className="sidebar__profile">
            <span className="sidebar__avatar">
              {initial || <UserRound size={19} />}
            </span>

            <span className="sidebar__profile-copy">
              <strong>{displayName}</strong>
              <small>{user?.email}</small>
            </span>
          </div>

          <button
            className="sidebar__logout"
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </footer>
    </aside>
  );
}

export default Sidebar;