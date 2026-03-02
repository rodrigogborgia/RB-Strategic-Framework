/// <reference types="vite/client" />

declare const __VITE_API_URL__: string | undefined;

declare module "*.svg" {
  const src: string;
  export default src;
}
