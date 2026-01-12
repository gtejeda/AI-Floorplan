/**
 * Vite environment type declarations
 * Enables importing SQL files as raw strings
 */

declare module '*.sql?raw' {
  const content: string;
  export default content;
}
