import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

export function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory()
    ? sourceFiles(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(dir, e.name)] : []);
}

/** AST inventory, including inline handlers, named handlers and inherited JSX conditions. */
export function uiInventory() {
  const rows: { file: string; line: number; event: string; handler: string; context: string }[] = [];
  for (const file of sourceFiles('src')) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node) => {
      if (ts.isJsxAttribute(node) && /^on[A-Z]/.test(node.name.getText(source))) {
        const contexts: string[] = [];
        const attributes = node.parent;
        if (ts.isJsxAttributes(attributes)) {
          const disabled = attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(source) === 'disabled');
          if (disabled) contexts.push(disabled.getText(source));
        }
        let parent: ts.Node | undefined = node.parent;
        while (parent) {
          if (ts.isConditionalExpression(parent)) contexts.push(parent.condition.getText(source));
          if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken)
            contexts.push(parent.left.getText(source).slice(0, 160));
          if (ts.isJsxElement(parent) && /^(Can|RoleGuard|RequireRole)$/.test(parent.openingElement.tagName.getText(source)))
            contexts.push(parent.openingElement.getText(source));
          parent = parent.parent;
        }
        rows.push({ file: file.replaceAll('\\', '/'), line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          event: node.name.getText(source), handler: node.initializer?.getText(source).slice(0, 240) || '',
          context: contexts.join(' && ') || 'No enclosing JSX permission condition; inspect handler and parent view' });
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return rows;
}

export type Role = 'admin' | 'employee' | 'intern' | 'anonymous';
export type Policy = 'public' | 'session' | 'admin' | 'staff' | 'platform' | 'scoped' | 'review';
export function canonicalPath(value: string) { return value.replace(/^\/api(?:\/v2)?(?=\/|$)/, '').replace(/\/$/, '') || '/'; }

/** Independent expected boundaries from docs/03 + AGENTS; extension-only scope is explicit. */
export function expectedPolicy(method: string, original: string): Policy {
  const p = canonicalPath(original);
  if (/^\/auth\/(register|login|logout|csrf|forgot-password|reset-password|verify-email)/.test(p)) return 'public';
  if (/^\/invites\/(preview\/|accept$|:token$)/.test(p) || p === '/billing/webhook' || p === '/founding-partner' || /^\/portal\/(auth|approvals)/.test(p)) return 'public';
  if (/^\/founding-partner\/(apply|metrics)$/.test(p)) return 'public';
  if (/^\/founding-partner\/(applications|approve)$/.test(p)) return 'platform';
  if (/^\/health(?:\/(live|ready|client-error))?$/.test(p)) return 'public';
  if (/^\/(health|storage)\//.test(p)) return 'admin';
  if (/^\/admin\/(founder-console|revenue|customers|platform-health|email-health|backups|observability)$/.test(p)) return 'platform';
  if (p === '/analytics/founder') return 'platform';
  if (p === '/notifications/retention/run') return 'admin';
  if (/^\/admin\/observability\/client-error$/.test(p)) return 'session';
  if (/^\/(analytics|executive|billing|audit|export|transfer|developer|invoices)(\/|$)/.test(p) || p === '/dashboard/executive') return 'admin';
  if (/^\/admin(\/|$)/.test(p)) return 'admin';
  if (/^\/automations/.test(p)) return 'admin';
  if (/^\/beta/.test(p)) return method === 'POST' && p === '/beta/feedback' ? 'session' : 'admin';
  if (p === '/nps/metrics' || /^\/digest\/(send|preview)$/.test(p)) return 'admin';
  if (/^\/auth\//.test(p) || /^\/(onboarding|notifications|nps|digest|presence)(\/|$)/.test(p)) return 'session';
  if (p === '/dashboard' || p === '/portability/export-user' || p === '/portability/gdpr-erasure') return 'session';
  if (p === '/portability/export-workspace') return 'admin';
  if (/^\/workspaces?(\/|$)/.test(p)) {
    if (/\/(all|list|current|switch|select)$/.test(p) || (method === 'POST' && /^\/workspaces?$/.test(p))) return 'session';
    return method === 'GET' ? 'staff' : 'admin';
  }
  if (/^\/members/.test(p)) return method === 'GET' ? 'staff' : 'admin';
  if (/^\/invites/.test(p)) return 'admin';
  if (/^\/projects/.test(p)) {
    if (method === 'GET' || /\/(start|progress|submit-review)$/.test(p)) return 'staff';
    return 'admin';
  }
  if (/^\/tasks/.test(p)) {
    if (method === 'DELETE' || /\/(assignees|approve|request-changes)$/.test(p)) return 'admin';
    if (method === 'GET' || /\/(start|submit-review)$/.test(p)) return 'scoped';
    return 'staff';
  }
  if (/^\/teams/.test(p)) return method === 'GET' ? 'staff' : 'admin';
  if (p === '/crm/pipelines') return 'admin';
  if (/^\/crm/.test(p)) return method === 'GET' || ['PATCH', 'PUT'].includes(method) ? 'staff' : 'admin';
  if (/^\/documents/.test(p)) return method === 'GET' || /\/download$/.test(p) ? 'scoped' : 'staff';
  if (/^\/wiki/.test(p)) return method === 'GET' ? 'scoped' : 'staff';
  if (/^\/time\/(report|analytics|utilization|profiles)/.test(p)) return 'admin';
  if (/^\/time/.test(p)) return 'scoped';
  if (/^\/integrations/.test(p)) return 'staff';
  if (/^\/portal/.test(p)) return 'admin';
  if (/^\/departments/.test(p)) return method === 'GET' ? 'staff' : 'admin';
  if (/^\/people\/(departments|org-chart)/.test(p)) return method === 'GET' ? 'staff' : 'admin';
  if (/^\/people\/(analytics|attendance\/metrics)/.test(p)) return 'admin';
  if (/^\/people\/profiles/.test(p)) return method === 'GET' ? 'staff' : 'scoped';
  if (/^\/people\//.test(p)) return 'scoped';
  if (/^\/(search|activity)/.test(p)) return 'scoped';
  return 'review';
}

export function allowed(policy: Policy, role: Role): boolean | undefined {
  if (policy === 'public') return true;
  if (policy === 'review') return undefined;
  if (role === 'anonymous' || policy === 'platform') return false;
  if (policy === 'admin') return role === 'admin';
  if (policy === 'staff') return role !== 'intern';
  return true;
}
