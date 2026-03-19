import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
export default defineConfig({
    plugins: [react()],
    define: {
        __VITE_API_URL__: JSON.stringify(process.env.VITE_API_URL),
    },
    server: {
        port: 5173,
    },
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
                "negociar-bajo-presion": resolve(__dirname, "negociar-bajo-presion.html"),
                "negociacion-bajo-presion-guia": resolve(__dirname, "negociacion-bajo-presion-guia.html"),
            },
        },
    },
});
