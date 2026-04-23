import { Moon, Sun } from "lucide-react";

const ThemeToggle = ({ theme, toggleTheme }: { theme: string; toggleTheme: () => void }) => (
  <button
    onClick={toggleTheme}
    className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
  >
    {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
  </button>
);

export default ThemeToggle;
