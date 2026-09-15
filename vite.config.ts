import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    watch: {
      // docs/contador/ guarda materiais de apoio para reuniões com o contador
      // (nunca lidos pelo código da aplicação, e fora do versionamento — ver
      // .gitignore). Ficam abertos por outros programas (Word, visualizador
      // de PDF, sincronização de nuvem) enquanto o dev server roda, e isso
      // trava o watcher do Vite com EBUSY. Ignorar a pasta inteira evita o
      // problema, independente de qual arquivo esteja aberto no momento.
      ignored: (file) => file.replace(/\\/g, "/").includes("docs/contador"),
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
