import {
  BookOpen,
  BookMarked,
  Eye,
  Moon,
  Sun,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import "../styles/sidebar.css";

const navigation = [
  { id: "chats", label: "Stories", icon: BookOpen },
  { id: "characters", label: "Characters", icon: UsersRound },
  { id: "memories", label: "Memories", icon: BookMarked },
  { id: "profile", label: "Profile", icon: UserRound },
];

function Sidebar({ activePage, onNavigate }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const displayName =
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    "Orvayne member";
  const initial = displayName.trim()[0]?.toUpperCase() || "V";

  return (
    <>
      <aside className="sidebar">
        <button className="sidebar__brand" onClick={() => onNavigate("chats")}>
          <span className="sidebar__brand-name" aria-label="ORVAYNE" style={{ display: "inline-flex", alignItems: "baseline", whiteSpace: "nowrap" }}>ORVAYN<span aria-hidden="true" style={{ display: "inline-block", position: "relative", width: "0.57em", height: "0.69em", marginLeft: "0.015em", flexShrink: 0, alignSelf: "baseline", background: "linear-gradient(to bottom, currentColor 0 8%, transparent 8% 46%, currentColor 46% 54%, transparent 54% 92%, currentColor 92% 100%)" }} /></span>
        </button>

        <nav className="sidebar__navigation" aria-label="Main navigation">
          {navigation.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              activePage={activePage}
              onNavigate={onNavigate}
            />
          ))}
        </nav>

        <footer className="sidebar__footer">
          <button className="sidebar__theme" onClick={toggleTheme}>
            {theme === "dark" ? <Moon size={18} /> : theme === "comfort" ? <Eye size={18} /> : <Sun size={18} />}
            <span>{theme === "light" ? "Light" : theme === "dark" ? "Dark" : "Sky Blue"}</span>
          </button>

          <button className="sidebar__profile" onClick={() => onNavigate("profile")}>
            <span className="sidebar__avatar">{initial}</span>
            <span className="sidebar__profile-copy">
              <strong>{displayName}</strong>
              <small>{user?.email}</small>
            </span>
          </button>
        </footer>
      </aside>

      <nav className="mobile-nav velvet-reference-nav" aria-label="Mobile navigation">
        {navigation.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            activePage={activePage}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </>
  );
}

function NavButton({ item, activePage, onNavigate }) {
  const Icon = item.icon;
  const active = activePage === item.id;

  return (
    <button
      className={`sidebar__link ${active ? "sidebar__link--active" : ""}`}
      onClick={() => onNavigate(item.id)}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={21} />
      <span>{item.label}</span>
    </button>
  );
}

export default Sidebar;
