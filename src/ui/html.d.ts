/**
 * Type declaration for importing HTML files as strings.
 * Enables TypeScript to recognize .html imports in the bundler environment.
 */
declare module '*.html' {
    const content: string;
    export default content;
}

