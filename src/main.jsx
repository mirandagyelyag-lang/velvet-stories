import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AuthProvider } from "./context/AuthContext";
import { CharactersProvider } from "./context/CharactersContext";
import { ChatsProvider } from "./context/ChatsContext";
import { ThemeProvider } from "./context/ThemeContext";

import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <CharactersProvider>
          <ChatsProvider>
            <App />
          </ChatsProvider>
        </CharactersProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);