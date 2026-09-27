// Vite (vitest) `?raw` imports return the file's text. Used by tests only.
declare module '*?raw' {
  const content: string;
  export default content;
}
