import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { ROLE_PERMISSIONS } from '../../src/lib/auth';

/** Render the real App routing and guards, with leaf views replaced by markers.
 * Context injection is test-only; no production role or UI code is changed.
 * Effects and browser interactions are intentionally outside this SSR check.
 */
export async function createUiRouteProbe() {
  const compiled = await build({
    stdin: { contents: `import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server';
      import App from './src/App'; export const render = () => renderToStaticMarkup(React.createElement(App));`,
      resolveDir: process.cwd(), loader: 'tsx' },
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
    plugins: [{ name: 'rbac-test-context-and-view-markers', setup(builder) {
      builder.onLoad({ filter: /[\\/]context[\\/]WorkspaceContext\.tsx$/ }, () => ({ loader: 'tsx', contents:
        `export const useWorkspace = () => globalThis.__rbacUiContext;
         export const WorkspaceProvider = ({children}) => children;` }));
      builder.onLoad({ filter: /[\\/]lib[\\/]realtime[\\/]index\.ts$/ }, () => ({ loader: 'tsx', contents:
        `export const RealtimeProvider = ({children}) => children;` }));
      builder.onLoad({ filter: /[\\/]components[\\/].*\.tsx$/ }, args => {
        const name = args.path.replaceAll('\\', '/').split('/').pop()!.replace('.tsx', '');
        if (['RoleGuard', 'RequireRole', 'ErrorBoundary'].includes(name)) return;
        return { loader: 'tsx', contents: `import React from 'react';
          export const ${name} = (props) => ${name === 'AppLayout' ? 'props.children' : `React.createElement('div', {'data-rbac-view': '${name}'})`};` };
      });
    } }],
  });
  const module = { exports: {} as { render?: () => string } };
  // Execute only the freshly bundled local test source, never untrusted input.
  new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
  return (role: 'admin' | 'employee' | 'intern', tab: string) => {
    const old = (globalThis as any).__rbacUiContext;
    (globalThis as any).__rbacUiContext = {
      currentRole: role, permissions: ROLE_PERMISSIONS[role], activeTab: tab,
      currentUser: { id: role, name: role, email: `${role}@rbac.example`, role },
      isLandingPage: false, isAuthBootstrapping: false, currentWorkspace: { id: 'audit-workspace' },
      userWorkspaces: [{ id: 'audit-workspace' }], setActiveTab: () => {},
    };
    try { return module.exports.render!(); }
    finally { (globalThis as any).__rbacUiContext = old; }
  };
}
