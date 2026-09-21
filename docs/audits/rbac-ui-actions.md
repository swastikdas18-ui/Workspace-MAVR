# UI action inventory

Static AST inventory of every JSX event binding, including form, click, keyboard, navigation and modal callbacks. Context is evidence to review, not proof of authorization: handler-local checks, parent routing, and disabled controls need separate verification. No browser interaction is claimed. Role permission table assertions are in the executable audit.

| File | Line | Event | Handler | Enclosing condition |
|---|---|---|---|---|
| src/App.tsx | 297 | onSuccess | {() => {           setInviteToken(null);           window.history.pushState(null, '', '/dashboard');         }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/App.tsx | 349 | onReturn | {() => setActiveTab('tasks')} | <RoleGuard allowedRoles={['admin', 'employee']} fallback={<ForbiddenPage requiredRole="ADMIN or EMPLOYEE" message="Intern sandbox accounts do not have access to full project roadmaps. Please focus on your assigned tasks in the Task Stream." onReturn={() => setActiveTab('tasks')} />}> |
| src/App.tsx | 352 | onRouteChange | {(newPId) => {                 setProjectIdParam(newPId \|\| null);                 const targetUrl = newPId ? `/projects/${newPId}` : '/projects';                 if (window.location.pathname !== targetUrl) {                   window.his | <RoleGuard allowedRoles={['admin', 'employee']} fallback={<ForbiddenPage requiredRole="ADMIN or EMPLOYEE" message="Intern sandbox accounts do not have access to full project roadmaps. Please focus on your assigned tasks in the Task Stream." onReturn={() => setActiveTab('tasks')} />}> |
| src/App.tsx | 367 | onRouteChange | {(newTId) => {               setTaskIdParam(newTId \|\| null);               const targetUrl = newTId ? `/tasks/${newTId}` : '/tasks';               if (window.location.pathname !== targetUrl) {                 window.history.pushState(nu | No enclosing JSX permission condition; inspect handler and parent view |
| src/App.tsx | 386 | onHandledAction | {() => {               setOpenCreateWiki(false);               setOpenUploadDoc(false);             }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/App.tsx | 390 | onRouteChange | {(id) => {               setWikiPageIdParam(id \|\| null);             }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/App.tsx | 418 | onHandledAction | {() => {               setOpenCreateWiki(false);               setOpenUploadDoc(false);             }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/App.tsx | 422 | onRouteChange | {(id) => {               setDocumentIdParam(id \|\| null);             }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/App.tsx | 433 | onRouteChange | {(newLeadId) => {                 setCrmLeadIdParam(newLeadId \|\| null);                 const targetUrl = newLeadId ? `/crm/${newLeadId}` : '/crm';                 if (window.location.pathname !== targetUrl) {                   window.h | <RequireRole role="admin" fallback={<ForbiddenPage requiredRole="ADMIN" message="CRM customer pipelines, deal values, and forecasting are restricted to Administrators." />}> |
| src/App.tsx | 494 | onOpenCreateWiki | {() => {         setActiveTab('wiki');         setOpenCreateWiki(true);       }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/App.tsx | 498 | onOpenUploadDoc | {() => {         setActiveTab('documents');         setOpenUploadDoc(true);       }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/App.tsx | 519 | onReset | {() => window.location.reload()} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/admin/AdminToolsView.tsx | 46 | onClick | {() => setActiveSubTab('rbac')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/admin/AdminToolsView.tsx | 58 | onClick | {() => setActiveSubTab('schema')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/admin/AdminToolsView.tsx | 70 | onClick | {() => setActiveSubTab('logs')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/admin/AdminToolsView.tsx | 173 | onClick | {() => setSelectedSchemaTable(key as any)} | activeSubTab === 'schema' |
| src/components/admin/AdminToolsView.tsx | 194 | onClick | {() => handleCopy(schemaDefinitions[selectedSchemaTable])} | activeSubTab === 'schema' |
| src/components/admin/AdminToolsView.tsx | 216 | onClick | {() => handleCopy(betterAuthCode)} | activeSubTab === 'schema' |
| src/components/admin/AdminToolsView.tsx | 242 | onChange | {(e) => setLogFilter(e.target.value)} | activeSubTab === 'logs' |
| src/components/admin/AuditCenterView.tsx | 126 | onChange | {(e) => setSearch(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/admin/AuditCenterView.tsx | 138 | onChange | {(e) => setSelectedModule(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/admin/AuditCenterView.tsx | 152 | onChange | {(e) => setSelectedAction(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/admin/AuditCenterView.tsx | 167 | onChange | {(e) => setSelectedActor(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/admin/AuditCenterView.tsx | 178 | onClick | {handleExportCSV} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/admin/AuditCenterView.tsx | 216 | onClick | {() => setExpandedId(expandedId === log.id ? null : log.id)} | filtered.length === 0 |
| src/components/admin/FounderConsoleView.tsx | 147 | onClick | {() => setActiveTab(tab)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/admin/FounderConsoleView.tsx | 161 | onClick | {loadData} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/analytics/AnalyticsView.tsx | 51 | onClick | {() => setActiveTab('overview')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/analytics/AnalyticsView.tsx | 59 | onClick | {() => setActiveTab('velocity')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/analytics/AnalyticsView.tsx | 67 | onClick | {() => setActiveTab('revenue')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/audit/AuditLogViewer.tsx | 136 | onChange | {(e) => setSearchTerm(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/audit/AuditLogViewer.tsx | 144 | onChange | {(e) => setSelectedModule(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/audit/AuditLogViewer.tsx | 160 | onClick | {handleExportCsv} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/audit/AuditLogViewer.tsx | 167 | onClick | {handleExportJson} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/auth/AuthModal.tsx | 143 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/auth/AuthModal.tsx | 168 | onClick | {() => { setMode('start-org'); setErrorMessage(null); }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/auth/AuthModal.tsx | 177 | onClick | {() => { setMode('join-org'); setErrorMessage(null); }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/auth/AuthModal.tsx | 186 | onClick | {() => { setMode('login'); setErrorMessage(null); }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/auth/AuthModal.tsx | 212 | onSubmit | {handleSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/auth/AuthModal.tsx | 225 | onChange | {(e) => setName(e.target.value)} | mode === 'start-org' |
| src/components/auth/AuthModal.tsx | 240 | onChange | {(e) => setWorkspaceName(e.target.value)} | mode === 'start-org' |
| src/components/auth/AuthModal.tsx | 255 | onChange | {(e) => setEmail(e.target.value)} | mode === 'start-org' |
| src/components/auth/AuthModal.tsx | 270 | onChange | {(e) => setPassword(e.target.value)} | mode === 'start-org' |
| src/components/auth/AuthModal.tsx | 291 | onChange | {(e) => setInviteToken(e.target.value)} | mode === 'join-org' |
| src/components/auth/AuthModal.tsx | 297 | onClick | {handleVerifyInviteToken} | disabled={isPreviewLoading} && mode === 'join-org' |
| src/components/auth/AuthModal.tsx | 333 | onChange | {(e) => setName(e.target.value)} | mode === 'join-org' |
| src/components/auth/AuthModal.tsx | 348 | onChange | {(e) => setPassword(e.target.value)} | mode === 'join-org' |
| src/components/auth/AuthModal.tsx | 368 | onChange | {(e) => setEmail(e.target.value)} | mode === 'login' |
| src/components/auth/AuthModal.tsx | 383 | onChange | {(e) => setPassword(e.target.value)} | mode === 'login' |
| src/components/automations/AutomationsView.tsx | 212 | onClick | {() => fetchAllData()} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/AutomationsView.tsx | 220 | onClick | {() => setIsCreateOpen(true)} | currentRole === 'admin' |
| src/components/automations/AutomationsView.tsx | 277 | onClick | {() => setActiveTab('rules')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/AutomationsView.tsx | 289 | onClick | {() => setActiveTab('executions')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/AutomationsView.tsx | 301 | onClick | {() => setActiveTab('templates')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/AutomationsView.tsx | 323 | onChange | {(e) => setSearchQuery(e.target.value)} | activeTab === 'rules' |
| src/components/automations/AutomationsView.tsx | 331 | onClick | {() => setFilterStatus('all')} | activeTab === 'rules' |
| src/components/automations/AutomationsView.tsx | 339 | onClick | {() => setFilterStatus('active')} | activeTab === 'rules' |
| src/components/automations/AutomationsView.tsx | 347 | onClick | {() => setFilterStatus('inactive')} | activeTab === 'rules' |
| src/components/automations/AutomationsView.tsx | 369 | onClick | {() => setIsCreateOpen(true)} | currentRole === 'admin' && filteredRules.length === 0 && activeTab === 'rules' |
| src/components/automations/AutomationsView.tsx | 445 | onClick | {() => handleToggle(rule.id)} | disabled={togglingId === rule.id} && currentRole === 'admin' && filteredRules.length === 0 && activeTab === 'rules' |
| src/components/automations/AutomationsView.tsx | 459 | onClick | {() => handleDuplicate(rule.id, rule.name)} | disabled={duplicatingId === rule.id} && currentRole === 'admin' && filteredRules.length === 0 && activeTab === 'rules' |
| src/components/automations/AutomationsView.tsx | 469 | onClick | {() => setEditingRule(rule)} | currentRole === 'admin' && filteredRules.length === 0 && activeTab === 'rules' |
| src/components/automations/AutomationsView.tsx | 478 | onClick | {() => handleDelete(rule.id, rule.name)} | disabled={deletingId === rule.id} && currentRole === 'admin' && filteredRules.length === 0 && activeTab === 'rules' |
| src/components/automations/AutomationsView.tsx | 597 | onClick | {() => handleInstallTemplate(tpl.id, tpl.name)} | disabled={installingTemplateId === tpl.id} && currentRole === 'admin' && activeTab === 'templates' |
| src/components/automations/AutomationsView.tsx | 615 | onClose | {() => setIsCreateOpen(false)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/AutomationsView.tsx | 616 | onSuccess | {handleCreateSuccess} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/AutomationsView.tsx | 623 | onClose | {() => setEditingRule(null)} | editingRule |
| src/components/automations/AutomationsView.tsx | 624 | onSuccess | {handleEditSuccess} | editingRule |
| src/components/automations/CreateAutomationModal.tsx | 230 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/CreateAutomationModal.tsx | 238 | onSubmit | {handleSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/CreateAutomationModal.tsx | 254 | onChange | {(e) => setName(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/CreateAutomationModal.tsx | 265 | onChange | {(e) => setDescription(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/CreateAutomationModal.tsx | 287 | onClick | {() => setSelectedTrigger(trig.id)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/CreateAutomationModal.tsx | 314 | onClick | {handleAddCondition} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/CreateAutomationModal.tsx | 334 | onChange | {(e) => handleConditionChange(idx, 'field', e.target.value)} | conditions.length === 0 |
| src/components/automations/CreateAutomationModal.tsx | 344 | onChange | {(e) => handleConditionChange(idx, 'operator', e.target.value)} | conditions.length === 0 |
| src/components/automations/CreateAutomationModal.tsx | 356 | onChange | {(e) => handleConditionChange(idx, 'value', e.target.value)} | cond.operator !== 'is_not_empty' && conditions.length === 0 |
| src/components/automations/CreateAutomationModal.tsx | 364 | onClick | {() => handleRemoveCondition(idx)} | conditions.length === 0 |
| src/components/automations/CreateAutomationModal.tsx | 384 | onClick | {handleAddAction} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/CreateAutomationModal.tsx | 404 | onChange | {(e) => handleActionTypeChange(idx, e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/CreateAutomationModal.tsx | 416 | onClick | {() => handleRemoveAction(idx)} | actions.length > 1 |
| src/components/automations/CreateAutomationModal.tsx | 431 | onChange | {(e) => handleActionConfigChange(idx, 'title', e.target.value)} | act.actionType === 'send_notification' |
| src/components/automations/CreateAutomationModal.tsx | 438 | onChange | {(e) => handleActionConfigChange(idx, 'message', e.target.value)} | act.actionType === 'send_notification' |
| src/components/automations/CreateAutomationModal.tsx | 450 | onChange | {(e) => handleActionConfigChange(idx, 'to', e.target.value)} | act.actionType === 'send_email' |
| src/components/automations/CreateAutomationModal.tsx | 457 | onChange | {(e) => handleActionConfigChange(idx, 'subject', e.target.value)} | act.actionType === 'send_email' |
| src/components/automations/CreateAutomationModal.tsx | 469 | onChange | {(e) => handleActionConfigChange(idx, 'title', e.target.value)} | act.actionType === 'create_task' |
| src/components/automations/CreateAutomationModal.tsx | 474 | onChange | {(e) => handleActionConfigChange(idx, 'priority', e.target.value)} | act.actionType === 'create_task' |
| src/components/automations/CreateAutomationModal.tsx | 487 | onChange | {(e) => handleActionConfigChange(idx, 'due_in_days', Number(e.target.value))} | act.actionType === 'create_task' |
| src/components/automations/CreateAutomationModal.tsx | 498 | onChange | {(e) => handleActionConfigChange(idx, 'url', e.target.value)} | act.actionType === 'webhook' |
| src/components/automations/CreateAutomationModal.tsx | 517 | onChange | {(e) => setEnabled(e.target.checked)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/CreateAutomationModal.tsx | 526 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/EditAutomationModal.tsx | 150 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/EditAutomationModal.tsx | 158 | onSubmit | {handleSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/EditAutomationModal.tsx | 174 | onChange | {e => setName(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/EditAutomationModal.tsx | 185 | onChange | {e => setDescription(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/EditAutomationModal.tsx | 207 | onClick | {() => setSelectedTrigger(trig.id)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/EditAutomationModal.tsx | 231 | onClick | {handleAddAction} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/EditAutomationModal.tsx | 250 | onChange | {e => handleActionTypeChange(idx, e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/EditAutomationModal.tsx | 262 | onClick | {() => handleRemoveAction(idx)} | actions.length > 1 |
| src/components/automations/EditAutomationModal.tsx | 278 | onChange | {e => handleActionConfigChange(idx, 'recipient', e.target.value)} | act.actionType === 'send_notification' |
| src/components/automations/EditAutomationModal.tsx | 293 | onChange | {e => handleActionConfigChange(idx, 'title', e.target.value)} | act.actionType === 'send_notification' |
| src/components/automations/EditAutomationModal.tsx | 308 | onChange | {e => handleActionConfigChange(idx, 'title', e.target.value)} | act.actionType === 'create_task' |
| src/components/automations/EditAutomationModal.tsx | 317 | onChange | {e => handleActionConfigChange(idx, 'assignedTo', e.target.value)} | act.actionType === 'create_task' |
| src/components/automations/EditAutomationModal.tsx | 334 | onChange | {e => handleActionConfigChange(idx, 'assignedTo', e.target.value)} | act.actionType === 'assign_user' |
| src/components/automations/EditAutomationModal.tsx | 350 | onChange | {e => handleActionConfigChange(idx, 'stage', e.target.value)} | act.actionType === 'move_crm_stage' |
| src/components/automations/EditAutomationModal.tsx | 369 | onChange | {e => handleActionConfigChange(idx, 'action', e.target.value)} | act.actionType === 'create_activity_log' |
| src/components/automations/EditAutomationModal.tsx | 387 | onChange | {e => setIsActive(e.target.checked)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/EditAutomationModal.tsx | 401 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/beta/BetaFeedbackModal.tsx | 105 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/beta/BetaFeedbackModal.tsx | 113 | onSubmit | {handleSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/beta/BetaFeedbackModal.tsx | 125 | onClick | {() => setCategory(cat.id as any)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/beta/BetaFeedbackModal.tsx | 151 | onClick | {() => setSeverity(sev.id as any)} | (category === 'bug' \|\| category === 'ux_friction' \|\| category === 'performance') |
| src/components/beta/BetaFeedbackModal.tsx | 173 | onChange | {(e) => setTitle(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/beta/BetaFeedbackModal.tsx | 185 | onChange | {(e) => setDescription(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/beta/BetaFeedbackModal.tsx | 202 | onChange | {(e) => setScreenshotUrl(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/beta/BetaFeedbackModal.tsx | 212 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/beta/FounderBetaDashboard.tsx | 108 | onClick | {loadAllBetaData} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/beta/FounderBetaDashboard.tsx | 131 | onClick | {() => setActiveSubTab(tab.id as any)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/beta/FounderBetaDashboard.tsx | 211 | onClick | {() => setActiveSubTab('launch_gates')} | activeSubTab === 'overview' |
| src/components/beta/FounderBetaDashboard.tsx | 304 | onClick | {() => {                       setSelectedFeedback(fb);                       setFounderNotesInput(fb.founderNotes \|\| '');                     }} | feedbackList.length === 0 && activeSubTab === 'feedback_queue' |
| src/components/beta/FounderBetaDashboard.tsx | 370 | onChange | {(e) => setFounderNotesInput(e.target.value)} | selectedFeedback && activeSubTab === 'feedback_queue' |
| src/components/beta/FounderBetaDashboard.tsx | 379 | onClick | {() => handleUpdateFeedbackStatus(selectedFeedback.id, 'resolved')} | selectedFeedback && activeSubTab === 'feedback_queue' |
| src/components/beta/FounderBetaDashboard.tsx | 386 | onClick | {() => handleUpdateFeedbackStatus(selectedFeedback.id, 'in_review')} | selectedFeedback && activeSubTab === 'feedback_queue' |
| src/components/beta/FounderBetaDashboard.tsx | 414 | onClick | {handleGenerateWeeklyReport} | activeSubTab === 'weekly_report' |
| src/components/beta/FounderBetaDashboard.tsx | 431 | onClick | {() => {                     navigator.clipboard.writeText(weeklyReport.markdownSummary);                     addToast({ type: 'success', title: 'Copied', message: 'Markdown report copied to clipboard.' });                   }} | weeklyReport && activeSubTab === 'weekly_report' |
| src/components/billing/BillingView.tsx | 229 | onClick | {() => setBillingCycle((c) => c === 'monthly' ? 'yearly' : 'monthly')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/billing/BillingView.tsx | 265 | onChange | {(e) => setSeatCount(Number(e.target.value))} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/billing/BillingView.tsx | 394 | onClick | {() => handleSelectPlan(plan.tier)} | disabled={isActive \|\| isPaymentProcessing} |
| src/components/billing/BillingView.tsx | 451 | onClick | {() => handleDownloadInvoice(inv.invoiceNumber \|\| inv.id)} | invoices && invoices.length > 0 |
| src/components/billing/BillingView.tsx | 473 | onClick | {() => setIsUpgradeModalOpen(false)} | isUpgradeModalOpen |
| src/components/billing/BillingView.tsx | 480 | onClick | {(e) => e.stopPropagation()} | isUpgradeModalOpen |
| src/components/billing/BillingView.tsx | 530 | onClick | {() => setIsUpgradeModalOpen(false)} | isUpgradeModalOpen |
| src/components/billing/BillingView.tsx | 537 | onClick | {() => handleLaunchRazorpayCheckout(selectedTier)} | disabled={isPaymentProcessing} && isUpgradeModalOpen |
| src/components/common/CommandPalette.tsx | 445 | onClick | {onClose} | isOpen |
| src/components/common/CommandPalette.tsx | 465 | onChange | {e => {                   setQuery(e.target.value);                   setSelectedIndex(0);                 }} | isOpen |
| src/components/common/CommandPalette.tsx | 469 | onKeyDown | {handleKeyDown} | isOpen |
| src/components/common/CommandPalette.tsx | 478 | onClick | {() => {                     setQuery('');                     setSelectedIndex(0);                     inputRef.current?.focus();                   }} | query && isOpen |
| src/components/common/CommandPalette.tsx | 529 | onClick | {() => {                         if (typeof item.action === 'function') {                           try {                             item.action();                           } catch (err) {                             SentryClient.captureE | allItems.length === 0 && isOpen |
| src/components/common/CommandPalette.tsx | 538 | onMouseMove | {() => {                         if (isKeyboardNavRef.current) {                           isKeyboardNavRef.current = false;                         }                         if (selectedIndex !== idx) {                           setSelecte | allItems.length === 0 && isOpen |
| src/components/common/EmptyState.tsx | 42 | onClick | {onAction} | actionLabel && onAction |
| src/components/common/ErrorBoundary.tsx | 56 | onClick | {this.handleReset} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/common/ErrorBoundary.tsx | 75 | onClick | {this.handleReset} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/common/ErrorBoundary.tsx | 101 | onClick | {this.handleReset} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/common/ErrorBoundary.tsx | 109 | onClick | {() => window.location.reload()} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/common/ForbiddenPage.tsx | 69 | onClick | {handleReturn} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/common/MetricCard.tsx | 91 | onClick | {onClick} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/common/NotificationBell.tsx | 296 | onClick | {() => setIsOpen((v) => !v)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/common/NotificationBell.tsx | 337 | onClick | {markAllAsRead} | unreadCount > 0 && isOpen |
| src/components/common/NotificationBell.tsx | 346 | onClick | {() => setIsOpen(false)} | isOpen |
| src/components/common/NotificationBell.tsx | 362 | onChange | {(e) => setSearchQuery(e.target.value)} | isOpen |
| src/components/common/NotificationBell.tsx | 367 | onClick | {() => setSearchQuery('')} | searchQuery && isOpen |
| src/components/common/NotificationBell.tsx | 381 | onClick | {() => setActiveTab('unread')} | isOpen |
| src/components/common/NotificationBell.tsx | 391 | onClick | {() => setActiveTab('read')} | isOpen |
| src/components/common/NotificationBell.tsx | 401 | onClick | {() => setActiveTab('archived')} | isOpen |
| src/components/common/NotificationBell.tsx | 415 | onChange | {(e) => setCategoryFilter(e.target.value as any)} | isOpen |
| src/components/common/NotificationBell.tsx | 448 | onClick | {() => handleNavigateEntity(notif)} | filteredNotifications.length === 0 && isOpen |
| src/components/common/NotificationBell.tsx | 475 | onClick | {(e) => { e.stopPropagation(); archiveNotification(notif.id); }} | !notif.archived && filteredNotifications.length === 0 && isOpen |
| src/components/common/NotificationBell.tsx | 491 | onClick | {(e) => { e.stopPropagation(); handleLeaveAction(notif, 'approve'); }} | disabled={actionInProgress === notif.id} && notif.type === 'leave_submitted' && notif.entityId && filteredNotifications.length === 0 && isOpen |
| src/components/common/NotificationBell.tsx | 499 | onClick | {(e) => { e.stopPropagation(); handleLeaveAction(notif, 'reject'); }} | disabled={actionInProgress === notif.id} && notif.type === 'leave_submitted' && notif.entityId && filteredNotifications.length === 0 && isOpen |
| src/components/common/NotificationBell.tsx | 511 | onClick | {(e) => { e.stopPropagation(); handleNavigateEntity(notif); }} | notif.type === 'initiative_review_requested' && filteredNotifications.length === 0 && isOpen |
| src/components/common/NotificationBell.tsx | 522 | onClick | {(e) => { e.stopPropagation(); handleNavigateEntity(notif); }} | notif.type === 'task_assigned' && filteredNotifications.length === 0 && isOpen |
| src/components/common/NotificationBell.tsx | 533 | onClick | {(e) => { e.stopPropagation(); handleNavigateEntity(notif); }} | notif.type === 'lead_assigned' && filteredNotifications.length === 0 && isOpen |
| src/components/common/NotificationBell.tsx | 544 | onClick | {(e) => { e.stopPropagation(); handleNavigateEntity(notif); }} | notif.type === 'deal_stage_changed' && filteredNotifications.length === 0 && isOpen |
| src/components/common/NotificationBell.tsx | 555 | onClick | {(e) => { e.stopPropagation(); handleNavigateEntity(notif); }} | (notif.type === 'leave_approved' \|\| notif.type === 'leave_rejected') && filteredNotifications.length === 0 && isOpen |
| src/components/common/NotificationBell.tsx | 572 | onClick | {() => {                   setIsOpen(false);                   setAppActiveTab('notifications');                 }} | isOpen |
| src/components/common/PageHeader.tsx | 35 | onClick | {item.onClick} | item.onClick && breadcrumbs && breadcrumbs.length > 0 |
| src/components/common/ToastContainer.tsx | 53 | onClick | {() => removeToast(toast.id)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/common/UserAvatar.tsx | 41 | onError | {(e) => {           // If image fails to load, replace with initials div           (e.target as HTMLElement).style.display = 'none';         }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/crm/CrmView.tsx | 141 | onClick | {() => setActiveTab('pipeline')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/crm/CrmView.tsx | 152 | onClick | {() => setActiveTab('table')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/crm/CrmView.tsx | 166 | onClick | {() => setIsAddModalOpen(true)} | permissions.crm.createRecord |
| src/components/crm/CrmView.tsx | 220 | onAction | {() => setIsAddModalOpen(true)} | visibleRecords.length === 0 |
| src/components/crm/CrmView.tsx | 234 | onSelectLead | {handleSelectLead} | activeTab === 'pipeline' && visibleRecords.length === 0 |
| src/components/crm/CrmView.tsx | 235 | onStageShift | {handleStageShift} | activeTab === 'pipeline' && visibleRecords.length === 0 |
| src/components/crm/CrmView.tsx | 282 | onClick | {() => deleteCrmRecord(rec.id)} | permissions.crm.deleteRecord && activeTab === 'pipeline' && visibleRecords.length === 0 |
| src/components/crm/CrmView.tsx | 309 | onClick | {() => setIsAddModalOpen(false)} | isAddModalOpen |
| src/components/crm/CrmView.tsx | 314 | onSubmit | {handleCreateSubmit} | isAddModalOpen |
| src/components/crm/CrmView.tsx | 323 | onChange | {(e) => setCompany(e.target.value)} | isAddModalOpen |
| src/components/crm/CrmView.tsx | 334 | onChange | {(e) => setCustomerName(e.target.value)} | isAddModalOpen |
| src/components/crm/CrmView.tsx | 348 | onChange | {(e) => setEmail(e.target.value)} | isAddModalOpen |
| src/components/crm/CrmView.tsx | 358 | onChange | {(e) => setPhone(e.target.value)} | isAddModalOpen |
| src/components/crm/CrmView.tsx | 373 | onChange | {(e) => setDealValue(Number(e.target.value))} | isAddModalOpen |
| src/components/crm/CrmView.tsx | 381 | onChange | {(e) => setStatus(e.target.value as CrmStatus)} | isAddModalOpen |
| src/components/crm/CrmView.tsx | 397 | onChange | {(e) => setNotes(e.target.value)} | isAddModalOpen |
| src/components/crm/CrmView.tsx | 405 | onClick | {() => setIsAddModalOpen(false)} | isAddModalOpen |
| src/components/crm/CrmView.tsx | 431 | onClose | {() => handleSelectLead(null)} | selectedLeadModal |
| src/components/crm/CrmView.tsx | 432 | onDelete | {(id) => {               deleteCrmRecord(id);               handleSelectLead(null);             }} | selectedLeadModal |
| src/components/crm/CrmView.tsx | 436 | onStartEditNotes | {(id, currentNotes) => {               setEditingNotesId(id);               setNotesText(currentNotes);             }} | selectedLeadModal |
| src/components/crm/CrmView.tsx | 440 | onCancelEditNotes | {() => setEditingNotesId(null)} | selectedLeadModal |
| src/components/crm/CrmView.tsx | 441 | onSaveNotes | {handleSaveNotes} | selectedLeadModal |
| src/components/crm/CrmView.tsx | 442 | onNotesTextChange | {setNotesText} | selectedLeadModal |
| src/components/dashboard/AdminDashboard.tsx | 129 | onClick | {() => setActiveTab('projects')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/AdminDashboard.tsx | 137 | onClick | {() => setActiveTab('tasks')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/AdminDashboard.tsx | 145 | onClick | {() => setActiveTab('teams')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/AdminDashboard.tsx | 153 | onClick | {() => setActiveTab('crm')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/AdminDashboard.tsx | 161 | onClick | {() => setActiveTab('documents')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/AdminDashboard.tsx | 211 | onClick | {() => setActiveTab('teams')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/AdminDashboard.tsx | 222 | onClick | {() => setActiveTab('projects')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/AdminDashboard.tsx | 233 | onClick | {() => setActiveTab('tasks')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/AdminDashboard.tsx | 244 | onClick | {() => setActiveTab('crm')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/AdminDashboard.tsx | 255 | onClick | {() => setActiveTab('crm')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/AdminDashboard.tsx | 279 | onClick | {() => setActiveTab('projects')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/AdminDashboard.tsx | 327 | onClick | {() => setActiveTab('projects')} | projectsAtRisk.length > 0 |
| src/components/dashboard/AdminDashboard.tsx | 349 | onClick | {() => setActiveTab('tasks')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/AdminDashboard.tsx | 397 | onClick | {() => setActiveTab('teams')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/AdminDashboard.tsx | 496 | onClick | {() => setActiveTab('documents')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/AdminDashboard.tsx | 523 | onClick | {() => setActiveTab('documents')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/AdminDashboard.tsx | 557 | onClick | {() => setActiveTab('teams')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/AdminDashboard.tsx | 646 | onClick | {() => setActiveTab('automations')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/EmployeeDashboard.tsx | 227 | onClick | {() => setActiveTab('tasks')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/EmployeeDashboard.tsx | 261 | onClick | {() => setActiveTab('time')} | activeTimer |
| src/components/dashboard/EmployeeDashboard.tsx | 267 | onClick | {handleStopTimer} | activeTimer |
| src/components/dashboard/EmployeeDashboard.tsx | 286 | onClick | {() => { setTaskFilter('in_progress'); }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/EmployeeDashboard.tsx | 296 | onClick | {() => { setTaskFilter('overdue'); }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/EmployeeDashboard.tsx | 306 | onClick | {() => { setTaskFilter('review'); }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/EmployeeDashboard.tsx | 316 | onClick | {() => { setTaskFilter('done'); }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/EmployeeDashboard.tsx | 338 | onClick | {() => setTaskFilter(tab)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/EmployeeDashboard.tsx | 420 | onClick | {() => handleStartTask(task.id)} | disabled={actionLoading === task.id} && task.status === 'todo' && filteredTasks.length === 0 |
| src/components/dashboard/EmployeeDashboard.tsx | 431 | onClick | {() => handleSubmitReview(task.id)} | disabled={actionLoading === task.id} && task.status === 'in_progress' && filteredTasks.length === 0 |
| src/components/dashboard/EmployeeDashboard.tsx | 483 | onClick | {() => setActiveTab('projects')} | assignedProjects.length === 0 |
| src/components/dashboard/EmployeeDashboard.tsx | 556 | onClick | {() => setActiveTab('teams')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/EmployeeDashboard.tsx | 593 | onClick | {() => setActiveTab('teams')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/InternDashboard.tsx | 49 | onClick | {() => setActiveTab('documents')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/InternDashboard.tsx | 68 | onClick | {() => setActiveTab('tasks')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/InternDashboard.tsx | 78 | onClick | {() => setActiveTab('tasks')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/InternDashboard.tsx | 88 | onClick | {() => setActiveTab('tasks')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/InternDashboard.tsx | 98 | onClick | {() => setActiveTab('documents')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/InternDashboard.tsx | 157 | onClick | {() => updateTaskStatus(task.id, 'in_progress')} | task.status === 'todo' && myTasks.length === 0 |
| src/components/dashboard/InternDashboard.tsx | 166 | onClick | {() => updateTaskStatus(task.id, 'completed')} | task.status !== 'completed' && myTasks.length === 0 |
| src/components/dashboard/InternDashboard.tsx | 214 | onClick | {() => incrementDocDownload(doc.id)} | learningDocs.length === 0 |
| src/components/documents/DocumentsView.tsx | 238 | onClick | {() => setViewMode('grid')} | !embedded |
| src/components/documents/DocumentsView.tsx | 249 | onClick | {() => setViewMode('list')} | !embedded |
| src/components/documents/DocumentsView.tsx | 263 | onClick | {() => setIsUploadModalOpen(true)} | (permissions.documents.createOrgDoc \|\| permissions.documents.createPersonalDoc) && !embedded |
| src/components/documents/DocumentsView.tsx | 281 | onClick | {() => setSelectedCategory(cat)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/documents/DocumentsView.tsx | 295 | onClick | {() => setIsUploadModalOpen(true)} | embedded && currentRole !== 'intern' |
| src/components/documents/DocumentsView.tsx | 311 | onAction | {() => setIsUploadModalOpen(true)} | visibleDocs.length === 0 |
| src/components/documents/DocumentsView.tsx | 325 | onClick | {() => handleSelectDoc(doc)} | viewMode === 'grid' && visibleDocs.length === 0 |
| src/components/documents/DocumentsView.tsx | 352 | onClick | {(e) => e.stopPropagation()} | viewMode === 'grid' && visibleDocs.length === 0 |
| src/components/documents/DocumentsView.tsx | 354 | onClick | {() => incrementDocDownload(doc.id)} | viewMode === 'grid' && visibleDocs.length === 0 |
| src/components/documents/DocumentsView.tsx | 363 | onClick | {() => deleteDocument(doc.id)} | canDelete && viewMode === 'grid' && visibleDocs.length === 0 |
| src/components/documents/DocumentsView.tsx | 399 | onClick | {() => handleSelectDoc(doc)} | viewMode === 'grid' && visibleDocs.length === 0 |
| src/components/documents/DocumentsView.tsx | 426 | onClick | {(e) => e.stopPropagation()} | viewMode === 'grid' && visibleDocs.length === 0 |
| src/components/documents/DocumentsView.tsx | 429 | onClick | {() => handleSelectDoc(doc)} | viewMode === 'grid' && visibleDocs.length === 0 |
| src/components/documents/DocumentsView.tsx | 436 | onClick | {() => incrementDocDownload(doc.id)} | viewMode === 'grid' && visibleDocs.length === 0 |
| src/components/documents/DocumentsView.tsx | 444 | onClick | {() => deleteDocument(doc.id)} | canDelete && viewMode === 'grid' && visibleDocs.length === 0 |
| src/components/documents/DocumentsView.tsx | 470 | onClick | {() => handleSelectDoc(null)} | previewDoc |
| src/components/documents/DocumentsView.tsx | 492 | onClick | {() => handleSelectDoc(null)} | previewDoc |
| src/components/documents/DocumentsView.tsx | 544 | onClick | {() => {                     incrementDocDownload(previewDoc.id);                     setPreviewDoc(null);                   }} | previewDoc |
| src/components/documents/DocumentsView.tsx | 567 | onClick | {() => setIsUploadModalOpen(false)} | isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 581 | onClick | {() => setIsUploadModalOpen(false)} | isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 586 | onSubmit | {handleUploadSubmit} | isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 589 | onDragOver | {(e) => {                     e.preventDefault();                     setIsDragging(true);                   }} | isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 593 | onDragLeave | {() => setIsDragging(false)} | isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 594 | onDrop | {(e) => {                     e.preventDefault();                     setIsDragging(false);                     if (e.dataTransfer.files && e.dataTransfer.files[0]) {                       handleFileChange(e.dataTransfer.files[0]);     | isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 601 | onClick | {() => fileInputRef.current?.click()} | isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 614 | onChange | {(e) => {                       if (e.target.files && e.target.files[0]) {                         handleFileChange(e.target.files[0]);                       }                     }} | isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 642 | onChange | {(e) => setTitle(e.target.value)} | isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 652 | onChange | {(e) => setCategory(e.target.value as any)} | isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 667 | onChange | {(e) => setFileType(e.target.value as any)} | isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 683 | onChange | {(e) => setVisibility(e.target.value as DocumentVisibility)} | isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 698 | onChange | {(e) => setSelectedDepartmentId(e.target.value)} | visibility === 'department' && isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 715 | onClick | {() => setIsUploadModalOpen(false)} | isUploadModalOpen |
| src/components/founder/FounderOperationsView.tsx | 90 | onClick | {loadData} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/founder/FounderOperationsView.tsx | 103 | onClick | {() => setSelectedMetric(mrrItem)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/founder/FounderOperationsView.tsx | 124 | onClick | {() => setSelectedMetric(dauItem)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/founder/FounderOperationsView.tsx | 145 | onClick | {() => setSelectedMetric(activationItem)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/founder/FounderOperationsView.tsx | 166 | onClick | {() => setSelectedMetric(npsItem)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/founder/FounderOperationsView.tsx | 212 | onClick | {() => setSelectedMetric(m)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/founder/FounderOperationsView.tsx | 258 | onClick | {() => setSelectedMetric(null)} | selectedMetric |
| src/components/founder/FounderOperationsView.tsx | 302 | onClick | {() => setSelectedMetric(null)} | selectedMetric |
| src/components/integrations/IntegrationsView.tsx | 69 | onClick | {() => setIsGoogleConnected(!isGoogleConnected)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/integrations/IntegrationsView.tsx | 83 | onClick | {() => setIsScheduling(true)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/integrations/IntegrationsView.tsx | 94 | onSubmit | {handleScheduleMeeting} | isScheduling |
| src/components/integrations/IntegrationsView.tsx | 102 | onChange | {(e) => setNewMeetingTitle(e.target.value)} | isScheduling |
| src/components/integrations/IntegrationsView.tsx | 108 | onChange | {(e) => setNewMeetingDate(e.target.value)} | isScheduling |
| src/components/integrations/IntegrationsView.tsx | 115 | onClick | {() => setIsScheduling(false)} | isScheduling |
| src/components/invites/AcceptInviteView.tsx | 133 | onSubmit | {handleSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/invites/AcceptInviteView.tsx | 152 | onChange | {(e) => setName(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/invites/AcceptInviteView.tsx | 167 | onChange | {(e) => setPassword(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/invites/AcceptInviteView.tsx | 182 | onChange | {(e) => setConfirmPassword(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/knowledge/KnowledgeCenterView.tsx | 66 | onClick | {() => setIsWikiCreateModalOpen(true)} | activeTab === 'wiki' && currentRole !== 'intern' |
| src/components/knowledge/KnowledgeCenterView.tsx | 74 | onClick | {() => setIsDocUploadModalOpen(true)} | activeTab === 'wiki' && currentRole !== 'intern' |
| src/components/knowledge/KnowledgeCenterView.tsx | 89 | onClick | {() => setActiveTab('wiki')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/knowledge/KnowledgeCenterView.tsx | 101 | onClick | {() => setActiveTab('documents')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/knowledge/KnowledgeCenterView.tsx | 119 | onRouteChange | {onRouteChange} | activeTab === 'wiki' |
| src/components/knowledge/KnowledgeCenterView.tsx | 121 | onCloseCreate | {() => setIsWikiCreateModalOpen(false)} | activeTab === 'wiki' |
| src/components/knowledge/KnowledgeCenterView.tsx | 129 | onRouteChange | {onRouteChange} | activeTab === 'documents' |
| src/components/knowledge/KnowledgeCenterView.tsx | 131 | onCloseUpload | {() => setIsDocUploadModalOpen(false)} | activeTab === 'documents' |
| src/components/landing/FoundingPartnerForm.tsx | 106 | onSubmit | {handleSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/landing/FoundingPartnerForm.tsx | 143 | onChange | {(e) => setBusinessName(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/landing/FoundingPartnerForm.tsx | 152 | onChange | {(e) => setIndustry(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/landing/FoundingPartnerForm.tsx | 171 | onChange | {(e) => setWebsite(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/landing/FoundingPartnerForm.tsx | 180 | onChange | {(e) => setTeamSize(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/landing/FoundingPartnerForm.tsx | 198 | onChange | {(e) => setLocation(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/landing/FoundingPartnerForm.tsx | 219 | onChange | {(e) => setOwnerName(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/landing/FoundingPartnerForm.tsx | 231 | onChange | {(e) => setEmail(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/landing/FoundingPartnerForm.tsx | 243 | onChange | {(e) => setPhone(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/landing/FoundingPartnerForm.tsx | 263 | onChange | {(e) => setCurrentTools(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/landing/FoundingPartnerForm.tsx | 274 | onChange | {(e) => setBiggestChallenge(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/landing/FoundingPartnerForm.tsx | 285 | onChange | {(e) => setWhyInterested(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/landing/LandingPage.tsx | 60 | onClick | {() => handleOpenAuth('join-org')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/landing/LandingPage.tsx | 67 | onClick | {() => handleOpenAuth('login')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/landing/LandingPage.tsx | 74 | onClick | {() => handleOpenAuth('start-org')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/landing/LandingPage.tsx | 108 | onClick | {() => handleOpenAuth('start-org')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/landing/LandingPage.tsx | 503 | onClick | {() => handleOpenAuth('start-org')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/landing/LandingPage.tsx | 527 | onClick | {() => handleOpenAuth('login')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/landing/LandingPage.tsx | 528 | onClick | {() => handleOpenAuth('join-org')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/landing/LandingPage.tsx | 529 | onClick | {() => handleOpenAuth('start-org')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/landing/LandingPage.tsx | 537 | onClose | {() => setIsAuthOpen(false)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/layout/AppLayout.tsx | 236 | onToggleCollapse | {() => setIsSidebarCollapsed((prev) => !prev)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/layout/AppLayout.tsx | 238 | onCloseMobile | {() => setIsMobileSidebarOpen(false)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/layout/AppLayout.tsx | 239 | onOpenCommandPalette | {() => setIsCommandPaletteOpen(true)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/layout/AppLayout.tsx | 245 | onOpenMobileSidebar | {() => setIsMobileSidebarOpen(true)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/layout/AppLayout.tsx | 246 | onOpenCommandPalette | {() => setIsCommandPaletteOpen(true)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/layout/AppLayout.tsx | 247 | onOpenCreateTeam | {handleTriggerCreateTeam} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/layout/AppLayout.tsx | 248 | onOpenInviteMember | {handleTriggerInviteMember} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/layout/AppLayout.tsx | 249 | onOpenCreateProject | {handleTriggerCreateProject} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/layout/AppLayout.tsx | 250 | onOpenCreateTask | {handleTriggerCreateTask} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/layout/AppLayout.tsx | 251 | onOpenCreateWiki | {onOpenCreateWiki} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/layout/AppLayout.tsx | 252 | onOpenUploadDoc | {onOpenUploadDoc} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/layout/AppLayout.tsx | 273 | onReset | {() => setIsCommandPaletteOpen(false)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/layout/AppLayout.tsx | 276 | onClose | {() => setIsCommandPaletteOpen(false)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/layout/AppLayout.tsx | 277 | onOpenCreateProject | {handleTriggerCreateProject} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/layout/AppLayout.tsx | 278 | onOpenCreateTask | {handleTriggerCreateTask} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/layout/AppLayout.tsx | 279 | onOpenCreateLead | {onOpenCreateLead} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/layout/AppLayout.tsx | 280 | onOpenUploadDoc | {onOpenUploadDoc} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/layout/AppLayout.tsx | 281 | onOpenInviteMember | {handleTriggerInviteMember} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/layout/AppLayout.tsx | 295 | onClick | {() => setIsCreateTeamModalOpen(false)} | isCreateTeamModalOpen |
| src/components/layout/AppLayout.tsx | 306 | onClick | {() => setIsCreateTeamModalOpen(false)} | isCreateTeamModalOpen |
| src/components/layout/AppLayout.tsx | 311 | onSubmit | {handleCreateTeamSubmit} | isCreateTeamModalOpen |
| src/components/layout/AppLayout.tsx | 319 | onChange | {(e) => setTeamName(e.target.value)} | isCreateTeamModalOpen |
| src/components/layout/AppLayout.tsx | 331 | onChange | {(e) => setTeamDescription(e.target.value)} | isCreateTeamModalOpen |
| src/components/layout/AppLayout.tsx | 342 | onChange | {(e) => setTeamColor(e.target.value)} | isCreateTeamModalOpen |
| src/components/layout/AppLayout.tsx | 350 | onChange | {(e) => setTeamLeadId(e.target.value)} | isCreateTeamModalOpen |
| src/components/layout/AppLayout.tsx | 363 | onClick | {() => setIsCreateTeamModalOpen(false)} | isCreateTeamModalOpen |
| src/components/layout/AppLayout.tsx | 391 | onClick | {() => {                 setIsInviteModalOpen(false);                 setGeneratedInvite(null);               }} | isInviteModalOpen |
| src/components/layout/AppLayout.tsx | 406 | onClick | {() => {                     setIsInviteModalOpen(false);                     setGeneratedInvite(null);                   }} | isInviteModalOpen |
| src/components/layout/AppLayout.tsx | 436 | onClick | {() => handleCopyLink(generatedInvite.token)} | generatedInvite && isInviteModalOpen |
| src/components/layout/AppLayout.tsx | 447 | onClick | {() => {                         setIsInviteModalOpen(false);                         setGeneratedInvite(null);                         setInviteEmail('');                       }} | generatedInvite && isInviteModalOpen |
| src/components/layout/AppLayout.tsx | 459 | onSubmit | {handleInviteSubmit} | generatedInvite && isInviteModalOpen |
| src/components/layout/AppLayout.tsx | 466 | onChange | {(e) => setInviteName(e.target.value)} | generatedInvite && isInviteModalOpen |
| src/components/layout/AppLayout.tsx | 478 | onChange | {(e) => setInviteEmail(e.target.value)} | generatedInvite && isInviteModalOpen |
| src/components/layout/AppLayout.tsx | 487 | onChange | {(e) => setInviteRole(e.target.value as UserRole)} | generatedInvite && isInviteModalOpen |
| src/components/layout/AppLayout.tsx | 500 | onChange | {(e) => setInviteTeamId(e.target.value)} | generatedInvite && isInviteModalOpen |
| src/components/layout/AppLayout.tsx | 512 | onClick | {() => setIsInviteModalOpen(false)} | generatedInvite && isInviteModalOpen |
| src/components/layout/AppLayout.tsx | 542 | onClick | {() => setIsCreateProjectModalOpen(false)} | isCreateProjectModalOpen |
| src/components/layout/AppLayout.tsx | 555 | onClick | {() => setIsCreateProjectModalOpen(false)} | isCreateProjectModalOpen |
| src/components/layout/AppLayout.tsx | 562 | onSubmit | {handleCreateProjectSubmit} | isCreateProjectModalOpen |
| src/components/layout/AppLayout.tsx | 570 | onChange | {(e) => setProjectTitle(e.target.value)} | isCreateProjectModalOpen |
| src/components/layout/AppLayout.tsx | 582 | onChange | {(e) => setProjectDescription(e.target.value)} | isCreateProjectModalOpen |
| src/components/layout/AppLayout.tsx | 594 | onChange | {(e) => setProjectDueDate(e.target.value)} | isCreateProjectModalOpen |
| src/components/layout/AppLayout.tsx | 604 | onChange | {(e) => setProjectBudget(e.target.value)} | isCreateProjectModalOpen |
| src/components/layout/AppLayout.tsx | 614 | onChange | {(e) => setSelectedProjectDepartmentId(e.target.value)} | isCreateProjectModalOpen |
| src/components/layout/AppLayout.tsx | 630 | onChange | {(e) => setProjectTagsInput(e.target.value)} | isCreateProjectModalOpen |
| src/components/layout/AppLayout.tsx | 638 | onClick | {() => setIsCreateProjectModalOpen(false)} | isCreateProjectModalOpen |
| src/components/layout/AppLayout.tsx | 666 | onClick | {() => setIsCreateTaskModalOpen(false)} | isCreateTaskModalOpen |
| src/components/layout/AppLayout.tsx | 678 | onClick | {() => setIsCreateTaskModalOpen(false)} | isCreateTaskModalOpen |
| src/components/layout/AppLayout.tsx | 683 | onSubmit | {handleCreateTaskSubmit} | isCreateTaskModalOpen |
| src/components/layout/AppLayout.tsx | 691 | onChange | {(e) => setTaskTitle(e.target.value)} | isCreateTaskModalOpen |
| src/components/layout/AppLayout.tsx | 703 | onChange | {(e) => setTaskDescription(e.target.value)} | isCreateTaskModalOpen |
| src/components/layout/AppLayout.tsx | 713 | onChange | {(e) => setTaskPriority(e.target.value as TaskPriority)} | isCreateTaskModalOpen |
| src/components/layout/AppLayout.tsx | 728 | onChange | {(e) => setTaskDueDate(e.target.value)} | isCreateTaskModalOpen |
| src/components/layout/AppLayout.tsx | 739 | onChange | {(e) => setTaskProjectId(e.target.value)} | isCreateTaskModalOpen |
| src/components/layout/AppLayout.tsx | 751 | onChange | {(e) => setTaskAssigneeId(e.target.value)} | isCreateTaskModalOpen |
| src/components/layout/AppLayout.tsx | 769 | onChange | {(e) => setTaskEstimateHours(e.target.value)} | isCreateTaskModalOpen |
| src/components/layout/AppLayout.tsx | 779 | onChange | {(e) => setTaskTagsInput(e.target.value)} | isCreateTaskModalOpen |
| src/components/layout/AppLayout.tsx | 788 | onClick | {() => setIsCreateTaskModalOpen(false)} | isCreateTaskModalOpen |
| src/components/layout/Header.tsx | 132 | onClick | {onOpenMobileSidebar} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/layout/Header.tsx | 142 | onClick | {() => setActiveTab('dashboard')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/layout/Header.tsx | 153 | onClick | {onOpenCommandPalette} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/layout/Header.tsx | 176 | onClick | {() => setShowNewActionMenu(!showNewActionMenu)} | actionMenuItems.length > 0 |
| src/components/layout/Header.tsx | 189 | onClick | {() => setShowNewActionMenu(false)} | showNewActionMenu && actionMenuItems.length > 0 |
| src/components/layout/Header.tsx | 207 | onClick | {item.action} | showNewActionMenu && actionMenuItems.length > 0 |
| src/components/layout/Sidebar.tsx | 100 | onClick | {() => handleNavClick(item.id)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/layout/Sidebar.tsx | 167 | onClick | {onToggleCollapse} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/layout/Sidebar.tsx | 180 | onClick | {onOpenCommandPalette} | !isCollapsed && onOpenCommandPalette |
| src/components/layout/Sidebar.tsx | 224 | onClick | {() => setActiveTab('settings')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/layout/Sidebar.tsx | 250 | onClick | {logout} | !isCollapsed |
| src/components/layout/Sidebar.tsx | 283 | onClick | {onCloseMobile} | isMobileOpen |
| src/components/notifications/NotificationsView.tsx | 251 | onClick | {handleMarkAllRead} | unreadCount > 0 |
| src/components/notifications/NotificationsView.tsx | 266 | onClick | {() => setTab('unread')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/notifications/NotificationsView.tsx | 276 | onClick | {() => setTab('read')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/notifications/NotificationsView.tsx | 286 | onClick | {() => setTab('archived')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/notifications/NotificationsView.tsx | 305 | onChange | {(e) => setSearch(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/notifications/NotificationsView.tsx | 312 | onChange | {(e) => setCategory(e.target.value as any)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/notifications/NotificationsView.tsx | 354 | onClick | {() => handleNavigateEntity(notif)} | filteredNotifications.length === 0 && loading && notifications.length === 0 |
| src/components/notifications/NotificationsView.tsx | 380 | onClick | {(e) => e.stopPropagation()} | filteredNotifications.length === 0 && loading && notifications.length === 0 |
| src/components/notifications/NotificationsView.tsx | 383 | onClick | {() => handleMarkRead(notif.id)} | !notif.isRead && filteredNotifications.length === 0 && loading && notifications.length === 0 |
| src/components/notifications/NotificationsView.tsx | 392 | onClick | {() => handleArchive(notif.id)} | !notif.archived && filteredNotifications.length === 0 && loading && notifications.length === 0 |
| src/components/notifications/NotificationsView.tsx | 403 | onClick | {(e) => e.stopPropagation()} | filteredNotifications.length === 0 && loading && notifications.length === 0 |
| src/components/notifications/NotificationsView.tsx | 409 | onClick | {() => handleLeaveAction(notif, 'approve')} | disabled={actionInProgress === notif.id} && notif.type === 'leave_submitted' && notif.entityId && filteredNotifications.length === 0 && loading && notifications.length === 0 |
| src/components/notifications/NotificationsView.tsx | 417 | onClick | {() => handleLeaveAction(notif, 'reject')} | disabled={actionInProgress === notif.id} && notif.type === 'leave_submitted' && notif.entityId && filteredNotifications.length === 0 && loading && notifications.length === 0 |
| src/components/notifications/NotificationsView.tsx | 429 | onClick | {() => handleNavigateEntity(notif)} | notif.type === 'initiative_review_requested' && filteredNotifications.length === 0 && loading && notifications.length === 0 |
| src/components/notifications/NotificationsView.tsx | 440 | onClick | {() => handleNavigateEntity(notif)} | notif.type === 'task_assigned' && filteredNotifications.length === 0 && loading && notifications.length === 0 |
| src/components/notifications/NotificationsView.tsx | 451 | onClick | {() => handleNavigateEntity(notif)} | notif.type === 'lead_assigned' && filteredNotifications.length === 0 && loading && notifications.length === 0 |
| src/components/notifications/NotificationsView.tsx | 462 | onClick | {() => handleNavigateEntity(notif)} | notif.type === 'deal_stage_changed' && filteredNotifications.length === 0 && loading && notifications.length === 0 |
| src/components/notifications/NotificationsView.tsx | 473 | onClick | {() => handleNavigateEntity(notif)} | (notif.type === 'leave_approved' \|\| notif.type === 'leave_rejected') && filteredNotifications.length === 0 && loading && notifications.length === 0 |
| src/components/onboarding/OnboardingChecklist.tsx | 136 | onClick | {handleDismiss} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/onboarding/OnboardingChecklist.tsx | 163 | onClick | {() => !step.completed && setActiveTab(step.actionTab)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/onboarding/OnboardingPage.tsx | 120 | onClick | {() => {                       setActiveTab('workspaces');                       window.history.pushState(null, '', '/workspaces');                     }} | userWorkspaces.length > 1 && userWorkspaces.length > 0 |
| src/components/onboarding/OnboardingPage.tsx | 131 | onClick | {() => {                     setActiveTab('dashboard');                     window.history.pushState(null, '', `/${currentRole}/dashboard`);                   }} | userWorkspaces.length > 0 |
| src/components/onboarding/OnboardingPage.tsx | 166 | onClick | {() => setMode('create')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/onboarding/OnboardingPage.tsx | 177 | onClick | {() => setMode('invite')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/onboarding/OnboardingPage.tsx | 197 | onSubmit | {handleCreate} | mode === 'create' |
| src/components/onboarding/OnboardingPage.tsx | 206 | onChange | {(e) => setWorkspaceName(e.target.value)} | mode === 'create' |
| src/components/onboarding/OnboardingPage.tsx | 259 | onSubmit | {(e) => {                   e.preventDefault();                   if (inviteToken.trim()) {                     window.location.href = `/invite/${inviteToken.trim()}`;                   }                 }} | mode === 'invite' |
| src/components/onboarding/OnboardingPage.tsx | 275 | onChange | {(e) => setInviteToken(e.target.value)} | mode === 'invite' |
| src/components/onboarding/OnboardingWizard.tsx | 149 | onClick | {() => setDismissed(true)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/onboarding/OnboardingWizard.tsx | 182 | onClick | {() => setActiveTab(step.targetTab)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/DepartmentDetailsModal.tsx | 244 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/DepartmentDetailsModal.tsx | 260 | onChange | {(e) => setSearchQuery(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/DepartmentDetailsModal.tsx | 267 | onChange | {(e) => setPositionFilter(e.target.value as any)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/DepartmentDetailsModal.tsx | 279 | onClick | {() => setIsAddMemberOpen(true)} | isAdmin |
| src/components/people/DepartmentDetailsModal.tsx | 306 | onClick | {() => setIsAddMemberOpen(true)} | isAdmin && members.length === 0 && filteredMembers.length === 0 && loading |
| src/components/people/DepartmentDetailsModal.tsx | 370 | onClick | {() => handlePromoteLead(member)} | disabled={isBusy} && isAdmin && filteredMembers.length === 0 && loading |
| src/components/people/DepartmentDetailsModal.tsx | 386 | onClick | {() => {                             setMovingMember(member);                             setTargetDepartmentId(                               allDepartments.find((d) => d.id !== department.id)?.id \|\| ''                             );       | disabled={isBusy} && isAdmin && filteredMembers.length === 0 && loading |
| src/components/people/DepartmentDetailsModal.tsx | 403 | onClick | {() => handleRemoveMember(member)} | disabled={isBusy} && isAdmin && filteredMembers.length === 0 && loading |
| src/components/people/DepartmentDetailsModal.tsx | 427 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/DepartmentDetailsModal.tsx | 451 | onClick | {() => setIsAddMemberOpen(false)} | isAddMemberOpen |
| src/components/people/DepartmentDetailsModal.tsx | 458 | onSubmit | {handleAddMember} | isAddMemberOpen |
| src/components/people/DepartmentDetailsModal.tsx | 469 | onChange | {(e) => setSelectedAddUserId(e.target.value)} | candidateProfiles.length === 0 && isAddMemberOpen |
| src/components/people/DepartmentDetailsModal.tsx | 490 | onClick | {() => setIsAddMemberOpen(false)} | isAddMemberOpen |
| src/components/people/DepartmentDetailsModal.tsx | 529 | onClick | {() => setMovingMember(null)} | movingMember |
| src/components/people/DepartmentDetailsModal.tsx | 536 | onSubmit | {handleMoveMemberSubmit} | movingMember |
| src/components/people/DepartmentDetailsModal.tsx | 542 | onChange | {(e) => setTargetDepartmentId(e.target.value)} | movingMember |
| src/components/people/DepartmentDetailsModal.tsx | 559 | onClick | {() => setMovingMember(null)} | movingMember |
| src/components/people/PeopleView.tsx | 519 | onClick | {() => setIsCreateTeamModalOpen(true)} | permissions?.teams?.manageTeams |
| src/components/people/PeopleView.tsx | 528 | onClick | {() => {                 setGeneratedInvite(null);                 setIsInviteModalOpen(true);               }} | permissions?.teams?.inviteMembers |
| src/components/people/PeopleView.tsx | 541 | onClick | {handleCheckOut} | isCheckedIn |
| src/components/people/PeopleView.tsx | 549 | onClick | {handleCheckIn} | isCheckedIn |
| src/components/people/PeopleView.tsx | 558 | onClick | {() => setIsRequestLeaveModalOpen(true)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleView.tsx | 588 | onClick | {() => {                 setActiveSubTab(tab.id as any);                 if (tab.id === 'invitations') {                   loadInvites();                 }               }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleView.tsx | 621 | onClick | {() => setInviteStatusFilter(st)} | activeSubTab === 'invitations' |
| src/components/people/PeopleView.tsx | 640 | onClick | {() => {                   setGeneratedInvite(null);                   setIsInviteModalOpen(true);                 }} | permissions?.teams?.inviteMembers && activeSubTab === 'invitations' |
| src/components/people/PeopleView.tsx | 716 | onClick | {() => handleCopyLink(inv.token)} | activeSubTab === 'invitations' |
| src/components/people/PeopleView.tsx | 726 | onClick | {() => handleRevokeInvite(inv.id)} | disabled={revokingInviteId === inv.id} && computedStatus !== 'accepted' && permissions?.teams?.manageTeams && activeSubTab === 'invitations' |
| src/components/people/PeopleView.tsx | 757 | onChange | {(e) => setDeptSearchQuery(e.target.value)} | activeSubTab === 'departments' |
| src/components/people/PeopleView.tsx | 764 | onClick | {() => setIsCreateTeamModalOpen(true)} | permissions?.teams?.manageTeams && activeSubTab === 'departments' |
| src/components/people/PeopleView.tsx | 865 | onClick | {() => {                                 setEditingDepartment(dept);                                 setEditDeptName(dept.name \|\| '');                                 setEditDeptDescription(dept.description \|\| '');                       | permissions?.teams?.manageTeams && activeSubTab === 'departments' |
| src/components/people/PeopleView.tsx | 879 | onClick | {() => {                                 setTargetReassignUser(profiles.find(p => p.departmentId !== dept.id) \|\| profiles[0]);                                 setSelectedNewDeptId(dept.id);                                 setIsTransferMo | permissions?.teams?.manageTeams && activeSubTab === 'departments' |
| src/components/people/PeopleView.tsx | 894 | onClick | {() => {                             setSelectedDepartmentDetails(dept);                           }} | activeSubTab === 'departments' |
| src/components/people/PeopleView.tsx | 927 | onChange | {(e) => setSearchQuery(e.target.value)} | activeSubTab === 'directory' |
| src/components/people/PeopleView.tsx | 935 | onChange | {(e) => setSelectedDepartmentFilter(e.target.value)} | activeSubTab === 'directory' |
| src/components/people/PeopleView.tsx | 948 | onChange | {(e) => setSelectedEmploymentTypeFilter(e.target.value)} | activeSubTab === 'directory' |
| src/components/people/PeopleView.tsx | 973 | onClick | {() => setSelectedDepartmentFilter('')} | selectedDepartmentFilter && activeSubTab === 'directory' |
| src/components/people/PeopleView.tsx | 1016 | onClick | {(e) => {                               e.stopPropagation();                               const targetId = prof.userId \|\| prof.user?.id \|\| prof.id;                               setActiveActionMenuUserId(activeActionMenuUserId === targe | currentRole === 'admin' && (prof.userId !== currentUser?.id && prof.user?.id !== currentUser?.id) && activeSubTab === 'directory' |
| src/components/people/PeopleView.tsx | 1031 | onClick | {(e) => e.stopPropagation()} | activeActionMenuUserId === (prof.userId \|\| prof.user?.id \|\| prof.id) && currentRole === 'admin' && (prof.userId !== currentUser?.id && prof.user?.id !== currentUser?.id) && activeSubTab === 'directory' |
| src/components/people/PeopleView.tsx | 1035 | onClick | {() => {                                   setMemberToRemove(prof);                                   setRemoveConfirmName('');                                   setActiveActionMenuUserId(null);                                 }} | activeActionMenuUserId === (prof.userId \|\| prof.user?.id \|\| prof.id) && currentRole === 'admin' && (prof.userId !== currentUser?.id && prof.user?.id !== currentUser?.id) && activeSubTab === 'directory' |
| src/components/people/PeopleView.tsx | 1086 | onClick | {() => setSelectedProfile(prof)} | activeSubTab === 'directory' |
| src/components/people/PeopleView.tsx | 1102 | onClick | {() => setSelectedDepartmentFilter('')} | selectedDepartmentFilter && filteredProfiles.length === 0 && activeSubTab === 'directory' |
| src/components/people/PeopleView.tsx | 1110 | onClick | {() => {                       setTargetReassignUser(profiles[0]);                       setSelectedNewDeptId(selectedDepartmentFilter \|\| departments[0]?.id \|\| '');                       setIsTransferModalOpen(true);                     | permissions?.teams?.manageTeams && profiles.length > 0 && filteredProfiles.length === 0 && activeSubTab === 'directory' |
| src/components/people/PeopleView.tsx | 1134 | onClick | {() => setIsRequestLeaveModalOpen(true)} | activeSubTab === 'leaves' |
| src/components/people/PeopleView.tsx | 1183 | onClick | {() => handleReviewLeave(l.id, 'approved')} | l.status === 'pending' && (currentRole === 'admin' \|\| (currentUser as any)?.role === 'lead') && activeSubTab === 'leaves' |
| src/components/people/PeopleView.tsx | 1190 | onClick | {() => handleReviewLeave(l.id, 'rejected')} | l.status === 'pending' && (currentRole === 'admin' \|\| (currentUser as any)?.role === 'lead') && activeSubTab === 'leaves' |
| src/components/people/PeopleView.tsx | 1234 | onClick | {isCheckedIn ? handleCheckOut : handleCheckIn} | activeSubTab === 'attendance' |
| src/components/people/PeopleView.tsx | 1310 | onClick | {() => setIsRequestLeaveModalOpen(false)} | isRequestLeaveModalOpen |
| src/components/people/PeopleView.tsx | 1315 | onSubmit | {handleRequestLeave} | isRequestLeaveModalOpen |
| src/components/people/PeopleView.tsx | 1320 | onChange | {(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })} | isRequestLeaveModalOpen |
| src/components/people/PeopleView.tsx | 1336 | onChange | {(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} | isRequestLeaveModalOpen |
| src/components/people/PeopleView.tsx | 1346 | onChange | {(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} | isRequestLeaveModalOpen |
| src/components/people/PeopleView.tsx | 1359 | onChange | {(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} | isRequestLeaveModalOpen |
| src/components/people/PeopleView.tsx | 1368 | onClick | {() => setIsRequestLeaveModalOpen(false)} | isRequestLeaveModalOpen |
| src/components/people/PeopleView.tsx | 1398 | onClick | {() => {                 setIsInviteModalOpen(false);                 setGeneratedInvite(null);               }} | isInviteModalOpen |
| src/components/people/PeopleView.tsx | 1413 | onClick | {() => {                     setIsInviteModalOpen(false);                     setGeneratedInvite(null);                   }} | isInviteModalOpen |
| src/components/people/PeopleView.tsx | 1443 | onClick | {() => handleCopyLink(generatedInvite.token)} | generatedInvite && isInviteModalOpen |
| src/components/people/PeopleView.tsx | 1454 | onClick | {() => {                         setIsInviteModalOpen(false);                         setGeneratedInvite(null);                         setInviteEmail('');                       }} | generatedInvite && isInviteModalOpen |
| src/components/people/PeopleView.tsx | 1466 | onSubmit | {handleInviteSubmit} | generatedInvite && isInviteModalOpen |
| src/components/people/PeopleView.tsx | 1473 | onChange | {(e) => setInviteName(e.target.value)} | generatedInvite && isInviteModalOpen |
| src/components/people/PeopleView.tsx | 1485 | onChange | {(e) => setInviteEmail(e.target.value)} | generatedInvite && isInviteModalOpen |
| src/components/people/PeopleView.tsx | 1494 | onChange | {(e) => setInviteRole(e.target.value as UserRole)} | generatedInvite && isInviteModalOpen |
| src/components/people/PeopleView.tsx | 1507 | onChange | {(e) => setInviteTeamId(e.target.value)} | generatedInvite && isInviteModalOpen |
| src/components/people/PeopleView.tsx | 1519 | onClick | {() => setIsInviteModalOpen(false)} | generatedInvite && isInviteModalOpen |
| src/components/people/PeopleView.tsx | 1549 | onClick | {() => setIsCreateTeamModalOpen(false)} | isCreateTeamModalOpen |
| src/components/people/PeopleView.tsx | 1560 | onClick | {() => setIsCreateTeamModalOpen(false)} | isCreateTeamModalOpen |
| src/components/people/PeopleView.tsx | 1565 | onSubmit | {handleCreateTeamSubmit} | isCreateTeamModalOpen |
| src/components/people/PeopleView.tsx | 1573 | onChange | {(e) => setTeamName(e.target.value)} | isCreateTeamModalOpen |
| src/components/people/PeopleView.tsx | 1585 | onChange | {(e) => setTeamDescription(e.target.value)} | isCreateTeamModalOpen |
| src/components/people/PeopleView.tsx | 1596 | onChange | {(e) => setTeamColor(e.target.value)} | isCreateTeamModalOpen |
| src/components/people/PeopleView.tsx | 1604 | onChange | {(e) => setTeamLeadId(e.target.value)} | isCreateTeamModalOpen |
| src/components/people/PeopleView.tsx | 1617 | onClick | {() => setIsCreateTeamModalOpen(false)} | isCreateTeamModalOpen |
| src/components/people/PeopleView.tsx | 1645 | onClick | {() => setSelectedProfile(null)} | selectedProfile |
| src/components/people/PeopleView.tsx | 1662 | onClick | {() => setSelectedProfile(null)} | selectedProfile |
| src/components/people/PeopleView.tsx | 1667 | onSubmit | {handleUpdateProfile} | selectedProfile |
| src/components/people/PeopleView.tsx | 1675 | onChange | {(e) => setSelectedProfile({ ...selectedProfile, designation: e.target.value })} | disabled={currentRole !== 'admin'} && selectedProfile |
| src/components/people/PeopleView.tsx | 1684 | onChange | {(e) => setSelectedProfile({ ...selectedProfile, departmentId: e.target.value \|\| null })} | disabled={currentRole !== 'admin'} && selectedProfile |
| src/components/people/PeopleView.tsx | 1701 | onChange | {(e) => setSelectedProfile({ ...selectedProfile, managerId: e.target.value \|\| null })} | disabled={currentRole !== 'admin'} && selectedProfile |
| src/components/people/PeopleView.tsx | 1717 | onChange | {(e) => setSelectedProfile({ ...selectedProfile, employmentType: e.target.value })} | disabled={currentRole !== 'admin'} && selectedProfile |
| src/components/people/PeopleView.tsx | 1734 | onChange | {(e) => setSelectedProfile({ ...selectedProfile, location: e.target.value })} | selectedProfile |
| src/components/people/PeopleView.tsx | 1744 | onChange | {(e) => setSelectedProfile({ ...selectedProfile, status: e.target.value })} | disabled={currentRole !== 'admin'} && selectedProfile |
| src/components/people/PeopleView.tsx | 1759 | onChange | {(e) => setSelectedProfile({ ...selectedProfile, bio: e.target.value })} | selectedProfile |
| src/components/people/PeopleView.tsx | 1768 | onClick | {() => setSelectedProfile(null)} | selectedProfile |
| src/components/people/PeopleView.tsx | 1798 | onClick | {() => {                 setIsReassignModalOpen(false);                 setTargetReassignUser(null);               }} | isReassignModalOpen |
| src/components/people/PeopleView.tsx | 1813 | onClick | {() => {                     setIsReassignModalOpen(false);                     setTargetReassignUser(null);                   }} | isReassignModalOpen |
| src/components/people/PeopleView.tsx | 1823 | onSubmit | {handleReassignManagerSubmit} | isReassignModalOpen |
| src/components/people/PeopleView.tsx | 1829 | onChange | {(e) => {                       const found = profiles.find((p) => (p.userId \|\| p.id) === e.target.value);                       setTargetReassignUser(found \|\| null);                     }} | isReassignModalOpen |
| src/components/people/PeopleView.tsx | 1848 | onChange | {(e) => setSelectedNewManagerId(e.target.value)} | isReassignModalOpen |
| src/components/people/PeopleView.tsx | 1865 | onClick | {() => {                       setIsReassignModalOpen(false);                       setTargetReassignUser(null);                     }} | isReassignModalOpen |
| src/components/people/PeopleView.tsx | 1897 | onClick | {() => {                 setIsTransferModalOpen(false);                 setTargetReassignUser(null);               }} | isTransferModalOpen |
| src/components/people/PeopleView.tsx | 1912 | onClick | {() => {                     setIsTransferModalOpen(false);                     setTargetReassignUser(null);                   }} | isTransferModalOpen |
| src/components/people/PeopleView.tsx | 1922 | onSubmit | {handleTransferDepartmentSubmit} | isTransferModalOpen |
| src/components/people/PeopleView.tsx | 1928 | onChange | {(e) => {                       const found = profiles.find((p) => (p.userId \|\| p.id) === e.target.value \|\| p.user?.id === e.target.value);                       setTargetReassignUser(found \|\| null);                     }} | isTransferModalOpen |
| src/components/people/PeopleView.tsx | 1952 | onChange | {(e) => setSelectedNewDeptId(e.target.value)} | isTransferModalOpen |
| src/components/people/PeopleView.tsx | 1965 | onClick | {() => {                       setIsTransferModalOpen(false);                       setTargetReassignUser(null);                     }} | isTransferModalOpen |
| src/components/people/PeopleView.tsx | 1997 | onClick | {() => {                 setIsEditDepartmentModalOpen(false);                 setEditingDepartment(null);               }} | isEditDepartmentModalOpen && editingDepartment |
| src/components/people/PeopleView.tsx | 2015 | onClick | {() => {                     setIsEditDepartmentModalOpen(false);                     setEditingDepartment(null);                   }} | isEditDepartmentModalOpen && editingDepartment |
| src/components/people/PeopleView.tsx | 2025 | onSubmit | {handleUpdateDepartmentSubmit} | isEditDepartmentModalOpen && editingDepartment |
| src/components/people/PeopleView.tsx | 2032 | onChange | {(e) => setEditDeptName(e.target.value)} | isEditDepartmentModalOpen && editingDepartment |
| src/components/people/PeopleView.tsx | 2043 | onChange | {(e) => setEditDeptDescription(e.target.value)} | isEditDepartmentModalOpen && editingDepartment |
| src/components/people/PeopleView.tsx | 2053 | onChange | {(e) => setEditDeptHeadId(e.target.value)} | isEditDepartmentModalOpen && editingDepartment |
| src/components/people/PeopleView.tsx | 2072 | onClick | {() => setEditDeptColor(c)} | isEditDepartmentModalOpen && editingDepartment |
| src/components/people/PeopleView.tsx | 2085 | onClick | {() => handleDeleteDepartment(editingDepartment.id, editingDepartment.name)} | isEditDepartmentModalOpen && editingDepartment |
| src/components/people/PeopleView.tsx | 2095 | onClick | {() => {                         setIsEditDepartmentModalOpen(false);                         setEditingDepartment(null);                       }} | isEditDepartmentModalOpen && editingDepartment |
| src/components/people/PeopleView.tsx | 2133 | onClick | {() => {                     setMemberToRemove(null);                     setRemoveConfirmName('');                   }} | memberToRemove |
| src/components/people/PeopleView.tsx | 2143 | onSubmit | {handleRemoveMemberSubmit} | memberToRemove |
| src/components/people/PeopleView.tsx | 2169 | onChange | {(e) => setRemoveConfirmName(e.target.value)} | memberToRemove |
| src/components/people/PeopleView.tsx | 2179 | onClick | {() => {                             setMemberToRemove(null);                             setRemoveConfirmName('');                           }} | memberToRemove |
| src/components/people/PeopleView.tsx | 2219 | onClose | {() => setSelectedDepartmentDetails(null)} | selectedDepartmentDetails |
| src/components/people/PeopleView.tsx | 2220 | onDepartmentUpdated | {async () => {               await loadData();               const updated = departments.find((d) => d.id === selectedDepartmentDetails.id);               if (updated) {                 setSelectedDepartmentDetails(updated);            | selectedDepartmentDetails |
| src/components/portal/ClientPortalView.tsx | 160 | onChange | {(e) => setFeedbackInput(e.target.value)} | selectedApprovalId === approval.id && approval.status === 'pending' && approvals.length === 0 |
| src/components/portal/ClientPortalView.tsx | 164 | onClick | {() => handleApprove(approval.id)} | selectedApprovalId === approval.id && approval.status === 'pending' && approvals.length === 0 |
| src/components/portal/ClientPortalView.tsx | 170 | onClick | {() => handleRequestChanges(approval.id)} | selectedApprovalId === approval.id && approval.status === 'pending' && approvals.length === 0 |
| src/components/portal/ClientPortalView.tsx | 178 | onClick | {() => setSelectedApprovalId(approval.id)} | selectedApprovalId === approval.id && approval.status === 'pending' && approvals.length === 0 |
| src/components/projects/ProjectsView.tsx | 250 | onClick | {() => setViewMode('board')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectsView.tsx | 260 | onClick | {() => setViewMode('list')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectsView.tsx | 270 | onClick | {() => setViewMode('timeline')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectsView.tsx | 284 | onChange | {(e) => setSelectedStatus(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectsView.tsx | 297 | onClick | {() => setIsCreateModalOpen(true)} | permissions.projects.create |
| src/components/projects/ProjectsView.tsx | 315 | onAction | {() => setIsCreateModalOpen(true)} | visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 360 | onClick | {() => deleteProject(project.id)} | permissions.projects.delete && viewMode === 'board' && visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 372 | onClick | {() => handleSelectProject(project)} | viewMode === 'board' && visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 419 | onClick | {(e) => handleStartWork(project.id, e)} | project.status === 'planning' && (isLead \|\| currentRole === 'admin') && viewMode === 'board' && visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 430 | onClick | {(e) => handleOpenProgressModal(project, e)} | project.status === 'in_progress' && (isAssigned \|\| isLead \|\| currentRole === 'admin') && viewMode === 'board' && visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 437 | onClick | {(e) => handleOpenSubmitReviewModal(project, e)} | project.status === 'in_progress' && (isAssigned \|\| isLead \|\| currentRole === 'admin') && viewMode === 'board' && visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 451 | onClick | {(e) => handleApprove(project.id, e)} | isLead \|\| currentRole === 'admin' && project.status === 'review' && viewMode === 'board' && visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 458 | onClick | {(e) => handleOpenChangesModal(project, e)} | isLead \|\| currentRole === 'admin' && project.status === 'review' && viewMode === 'board' && visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 529 | onClick | {() => handleSelectProject(project)} | viewMode === 'list' && viewMode === 'board' && visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 573 | onClick | {(e) => e.stopPropagation()} | viewMode === 'list' && viewMode === 'board' && visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 577 | onClick | {(e) => handleStartWork(project.id, e)} | project.status === 'planning' && (isLead \|\| currentRole === 'admin') && viewMode === 'list' && viewMode === 'board' && visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 585 | onClick | {(e) => handleOpenProgressModal(project, e)} | project.status === 'in_progress' && (isAssigned \|\| isLead \|\| currentRole === 'admin') && viewMode === 'list' && viewMode === 'board' && visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 593 | onClick | {(e) => handleApprove(project.id, e)} | project.status === 'review' && (isLead \|\| currentRole === 'admin') && viewMode === 'list' && viewMode === 'board' && visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 601 | onClick | {() => deleteProject(project.id)} | permissions.projects.delete && viewMode === 'list' && viewMode === 'board' && visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 676 | onClick | {() => setIsCreateModalOpen(false)} | isCreateModalOpen |
| src/components/projects/ProjectsView.tsx | 689 | onClick | {() => setIsCreateModalOpen(false)} | isCreateModalOpen |
| src/components/projects/ProjectsView.tsx | 696 | onSubmit | {handleCreateSubmit} | isCreateModalOpen |
| src/components/projects/ProjectsView.tsx | 704 | onChange | {(e) => setTitle(e.target.value)} | isCreateModalOpen |
| src/components/projects/ProjectsView.tsx | 716 | onChange | {(e) => setDescription(e.target.value)} | isCreateModalOpen |
| src/components/projects/ProjectsView.tsx | 728 | onChange | {(e) => setDueDate(e.target.value)} | isCreateModalOpen |
| src/components/projects/ProjectsView.tsx | 738 | onChange | {(e) => setBudget(e.target.value)} | isCreateModalOpen |
| src/components/projects/ProjectsView.tsx | 758 | onClick | {() => setSelectedDepartmentId(isSelected ? '' : dept.id)} | departments.length > 0 && isCreateModalOpen |
| src/components/projects/ProjectsView.tsx | 784 | onClick | {() => toggleMemberSelection(user.id)} | isCreateModalOpen |
| src/components/projects/ProjectsView.tsx | 805 | onChange | {(e) => setTagsInput(e.target.value)} | isCreateModalOpen |
| src/components/projects/ProjectsView.tsx | 813 | onClick | {() => setIsCreateModalOpen(false)} | isCreateModalOpen |
| src/components/projects/ProjectsView.tsx | 837 | onClick | {() => setProgressModalProject(null)} | progressModalProject |
| src/components/projects/ProjectsView.tsx | 852 | onClick | {() => setProgressModalProject(null)} | progressModalProject |
| src/components/projects/ProjectsView.tsx | 876 | onChange | {(e) => setProgressValue(Number(e.target.value))} | progressModalProject |
| src/components/projects/ProjectsView.tsx | 894 | onChange | {(e) => setProgressNote(e.target.value)} | progressModalProject |
| src/components/projects/ProjectsView.tsx | 902 | onClick | {() => setProgressModalProject(null)} | progressModalProject |
| src/components/projects/ProjectsView.tsx | 908 | onClick | {handleSaveProgress} | progressModalProject |
| src/components/projects/ProjectsView.tsx | 925 | onClick | {() => setSubmitReviewModalProject(null)} | submitReviewModalProject |
| src/components/projects/ProjectsView.tsx | 940 | onClick | {() => setSubmitReviewModalProject(null)} | submitReviewModalProject |
| src/components/projects/ProjectsView.tsx | 954 | onClick | {() => setSubmitReviewModalProject(null)} | submitReviewModalProject |
| src/components/projects/ProjectsView.tsx | 960 | onClick | {handleConfirmSubmitReview} | submitReviewModalProject |
| src/components/projects/ProjectsView.tsx | 977 | onClick | {() => setChangesModalProject(null)} | changesModalProject |
| src/components/projects/ProjectsView.tsx | 992 | onClick | {() => setChangesModalProject(null)} | changesModalProject |
| src/components/projects/ProjectsView.tsx | 1012 | onChange | {(e) => setReviewFeedback(e.target.value)} | changesModalProject |
| src/components/projects/ProjectsView.tsx | 1020 | onClick | {() => setChangesModalProject(null)} | changesModalProject |
| src/components/projects/ProjectsView.tsx | 1026 | onClick | {handleSaveRequestChanges} | changesModalProject |
| src/components/projects/ProjectsView.tsx | 1085 | onClick | {() => handleSelectProject(null)} | selectedProjectModal |
| src/components/projects/ProjectsView.tsx | 1095 | onClick | {() => setProjectModalTab('overview')} | selectedProjectModal |
| src/components/projects/ProjectsView.tsx | 1106 | onClick | {() => setProjectModalTab('tasks')} | selectedProjectModal |
| src/components/projects/ProjectsView.tsx | 1117 | onClick | {() => setProjectModalTab('timeline')} | selectedProjectModal |
| src/components/projects/ProjectsView.tsx | 1128 | onClick | {() => setProjectModalTab('team')} | selectedProjectModal |
| src/components/projects/ProjectsView.tsx | 1302 | onClick | {() => {                           handleStartWork(selectedProjectModal.id);                           handleSelectProject(null);                         }} | selectedProjectModal.status === 'planning' && (isTeamLeadForProject(selectedProjectModal) \|\| currentRole === 'admin') && selectedProjectModal |
| src/components/projects/ProjectsView.tsx | 1315 | onClick | {() => handleOpenProgressModal(selectedProjectModal)} | selectedProjectModal.status === 'in_progress' && (isAssignedToProject(selectedProjectModal) \|\| isTeamLeadForProject(selectedProjectModal) \|\| currentRole === 'ad && selectedProjectModal |
| src/components/projects/ProjectsView.tsx | 1322 | onClick | {() => handleOpenSubmitReviewModal(selectedProjectModal)} | selectedProjectModal.status === 'in_progress' && (isAssignedToProject(selectedProjectModal) \|\| isTeamLeadForProject(selectedProjectModal) \|\| currentRole === 'ad && selectedProjectModal |
| src/components/projects/ProjectsView.tsx | 1333 | onClick | {() => {                             handleApprove(selectedProjectModal.id);                             handleSelectProject(null);                           }} | selectedProjectModal.status === 'review' && (isTeamLeadForProject(selectedProjectModal) \|\| currentRole === 'admin') && selectedProjectModal |
| src/components/projects/ProjectsView.tsx | 1343 | onClick | {() => handleOpenChangesModal(selectedProjectModal)} | selectedProjectModal.status === 'review' && (isTeamLeadForProject(selectedProjectModal) \|\| currentRole === 'admin') && selectedProjectModal |
| src/components/projects/ProjectsView.tsx | 1354 | onClick | {() => handleSelectProject(null)} | selectedProjectModal |
| src/components/settings/SettingsView.tsx | 257 | onClick | {() => setActiveTab('profile')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/settings/SettingsView.tsx | 269 | onClick | {() => setActiveTab('security')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/settings/SettingsView.tsx | 281 | onClick | {() => setActiveTab('rbac')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/settings/SettingsView.tsx | 293 | onClick | {() => setActiveTab('team_billing')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/settings/SettingsView.tsx | 305 | onClick | {() => setActiveTab('api')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/settings/SettingsView.tsx | 317 | onClick | {() => setActiveTab('notifications')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/settings/SettingsView.tsx | 329 | onClick | {() => setActiveTab('labs')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/settings/SettingsView.tsx | 359 | onClick | {() => setGlobalActiveTab('automations')} | activeTab === 'labs' |
| src/components/settings/SettingsView.tsx | 376 | onClick | {() => setGlobalActiveTab('time')} | activeTab === 'labs' |
| src/components/settings/SettingsView.tsx | 393 | onClick | {() => setGlobalActiveTab('analytics')} | activeTab === 'labs' |
| src/components/settings/SettingsView.tsx | 410 | onClick | {() => setGlobalActiveTab('portal')} | activeTab === 'labs' |
| src/components/settings/SettingsView.tsx | 427 | onClick | {() => setGlobalActiveTab('integrations')} | activeTab === 'labs' |
| src/components/settings/SettingsView.tsx | 446 | onSubmit | {handleSave} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/settings/SettingsView.tsx | 471 | onChange | {(e) => setName(e.target.value)} | activeTab === 'profile' |
| src/components/settings/SettingsView.tsx | 484 | onChange | {(e) => setSlug(e.target.value)} | activeTab === 'profile' |
| src/components/settings/SettingsView.tsx | 525 | onChange | {(e) => setEnforceTwoFactor(e.target.checked)} | activeTab === 'security' |
| src/components/settings/SettingsView.tsx | 540 | onChange | {(e) => setAllowPublicInvites(e.target.checked)} | activeTab === 'security' |
| src/components/settings/SettingsView.tsx | 557 | onChange | {(e) => setSessionTimeout(e.target.value)} | activeTab === 'security' |
| src/components/settings/SettingsView.tsx | 697 | onChange | {(e) => {                                 const val = Number(e.target.value);                                 setBillingProfiles((prev) =>                                   prev.map((p) => (p.userId === item.userId ? { ...p, costRate: va | billingProfiles.length === 0 && isProfilesLoading && activeTab === 'team_billing' |
| src/components/settings/SettingsView.tsx | 715 | onChange | {(e) => {                                 const val = Number(e.target.value);                                 setBillingProfiles((prev) =>                                   prev.map((p) => (p.userId === item.userId ? { ...p, billableRate | billingProfiles.length === 0 && isProfilesLoading && activeTab === 'team_billing' |
| src/components/settings/SettingsView.tsx | 732 | onChange | {(e) => {                                 const val = Number(e.target.value);                                 setBillingProfiles((prev) =>                                   prev.map((p) => (p.userId === item.userId ? { ...p, utilizationT | billingProfiles.length === 0 && isProfilesLoading && activeTab === 'team_billing' |
| src/components/settings/SettingsView.tsx | 746 | onClick | {() => handleUpdateProfile(item)} | disabled={savingUserId === item.userId} && billingProfiles.length === 0 && isProfilesLoading && activeTab === 'team_billing' |
| src/components/settings/SettingsView.tsx | 856 | onClick | {() => setRotatingSecretId(secret.id)} | !isPendingRotation && activeTab === 'api' |
| src/components/settings/SettingsView.tsx | 866 | onClick | {() => handleRotateSecret(secret.id)} | disabled={isRotating} && !isPendingRotation && activeTab === 'api' |
| src/components/settings/SettingsView.tsx | 875 | onClick | {() => setRotatingSecretId(null)} | !isPendingRotation && activeTab === 'api' |
| src/components/settings/SettingsView.tsx | 917 | onClick | {handleSaveNotificationPrefs} | disabled={isPrefsSaving} && activeTab === 'notifications' |
| src/components/settings/SettingsView.tsx | 948 | onChange | {(e) => setNotificationPrefs(p => ({ ...p, peopleEmployeeInvites: e.target.checked }))} | isPrefsLoading && activeTab === 'notifications' |
| src/components/settings/SettingsView.tsx | 960 | onChange | {(e) => setNotificationPrefs(p => ({ ...p, peopleEmployeeJoined: e.target.checked }))} | isPrefsLoading && activeTab === 'notifications' |
| src/components/settings/SettingsView.tsx | 972 | onChange | {(e) => setNotificationPrefs(p => ({ ...p, peopleLeaveRequests: e.target.checked }))} | isPrefsLoading && activeTab === 'notifications' |
| src/components/settings/SettingsView.tsx | 994 | onChange | {(e) => setNotificationPrefs(p => ({ ...p, projectsInitiativeUpdates: e.target.checked }))} | isPrefsLoading && activeTab === 'notifications' |
| src/components/settings/SettingsView.tsx | 1006 | onChange | {(e) => setNotificationPrefs(p => ({ ...p, projectsReviewRequests: e.target.checked }))} | isPrefsLoading && activeTab === 'notifications' |
| src/components/settings/SettingsView.tsx | 1018 | onChange | {(e) => setNotificationPrefs(p => ({ ...p, projectsAssignments: e.target.checked }))} | isPrefsLoading && activeTab === 'notifications' |
| src/components/settings/SettingsView.tsx | 1040 | onChange | {(e) => setNotificationPrefs(p => ({ ...p, tasksAssignments: e.target.checked }))} | isPrefsLoading && activeTab === 'notifications' |
| src/components/settings/SettingsView.tsx | 1052 | onChange | {(e) => setNotificationPrefs(p => ({ ...p, tasksCompletions: e.target.checked }))} | isPrefsLoading && activeTab === 'notifications' |
| src/components/settings/SettingsView.tsx | 1064 | onChange | {(e) => setNotificationPrefs(p => ({ ...p, tasksOverdueAlerts: e.target.checked }))} | isPrefsLoading && activeTab === 'notifications' |
| src/components/settings/SettingsView.tsx | 1086 | onChange | {(e) => setNotificationPrefs(p => ({ ...p, crmLeadAssignment: e.target.checked }))} | isPrefsLoading && activeTab === 'notifications' |
| src/components/settings/SettingsView.tsx | 1098 | onChange | {(e) => setNotificationPrefs(p => ({ ...p, crmDealUpdates: e.target.checked }))} | isPrefsLoading && activeTab === 'notifications' |
| src/components/settings/SettingsView.tsx | 1110 | onChange | {(e) => setNotificationPrefs(p => ({ ...p, mentions: e.target.checked }))} | isPrefsLoading && activeTab === 'notifications' |
| src/components/tasks/TasksView.tsx | 353 | onClick | {() => setViewMode('kanban')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksView.tsx | 364 | onClick | {() => setViewMode('list')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksView.tsx | 379 | onChange | {(e) => setFilterProject(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksView.tsx | 391 | onChange | {(e) => setFilterPriority(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksView.tsx | 405 | onClick | {handleOpenCreateModal} | permissions.tasks.create |
| src/components/tasks/TasksView.tsx | 423 | onAction | {handleOpenCreateModal} | visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 462 | onClick | {() => handleSelectTask(task)} | viewMode === 'kanban' && visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 481 | onClick | {(e) => {                                 e.stopPropagation();                                 deleteTask(task.id);                               }} | permissions.tasks.delete && viewMode === 'kanban' && visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 530 | onClick | {(e) => e.stopPropagation()} | viewMode === 'kanban' && visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 535 | onClick | {() => handleStartTask(task.id)} | column.id === 'todo' && viewMode === 'kanban' && visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 545 | onClick | {() => handleSubmitReview(task.id)} | column.id === 'in_progress' && viewMode === 'kanban' && visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 556 | onClick | {() => {                                   setSelectedTask(task);                                   setReviewFeedbackModalOpen(true);                                 }} | column.id === 'review' && currentRole !== 'intern' && viewMode === 'kanban' && visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 566 | onClick | {() => handleApproveTask(task.id)} | column.id === 'review' && currentRole !== 'intern' && viewMode === 'kanban' && visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 614 | onClick | {() => setSelectedTask(task)} | viewMode === 'kanban' && visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 660 | onClick | {(e) => e.stopPropagation()} | viewMode === 'kanban' && visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 663 | onClick | {() => handleStartTask(task.id)} | status === 'todo' && viewMode === 'kanban' && visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 671 | onClick | {() => handleSubmitReview(task.id)} | status === 'in_progress' && viewMode === 'kanban' && visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 679 | onClick | {() => handleApproveTask(task.id)} | status === 'review' && currentRole !== 'intern' && viewMode === 'kanban' && visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 687 | onClick | {() => deleteTask(task.id)} | permissions.tasks.delete && viewMode === 'kanban' && visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 711 | onClick | {() => setSelectedTask(null)} | selectedTask |
| src/components/tasks/TasksView.tsx | 735 | onClick | {() => handleSelectTask(null)} | selectedTask |
| src/components/tasks/TasksView.tsx | 745 | onClick | {() => setDrawerTab('details')} | selectedTask |
| src/components/tasks/TasksView.tsx | 755 | onClick | {() => setDrawerTab('activity')} | selectedTask |
| src/components/tasks/TasksView.tsx | 766 | onClick | {() => setDrawerTab('comments')} | selectedTask |
| src/components/tasks/TasksView.tsx | 827 | onClick | {() => handleUnblockTask(selectedTask.id)} | selectedTask.is_blocked \|\| (selectedTask as any).isBlocked && drawerTab === 'details' && selectedTask |
| src/components/tasks/TasksView.tsx | 836 | onClick | {() => setBlockModalOpen(true)} | selectedTask.is_blocked \|\| (selectedTask as any).isBlocked && drawerTab === 'details' && selectedTask |
| src/components/tasks/TasksView.tsx | 851 | onClick | {() => handleStartTask(selectedTask.id)} | disabled={actionLoading} && selectedTask.status === 'todo' && drawerTab === 'details' && selectedTask |
| src/components/tasks/TasksView.tsx | 862 | onClick | {() => handleSubmitReview(selectedTask.id)} | disabled={actionLoading} && selectedTask.status === 'in_progress' && drawerTab === 'details' && selectedTask |
| src/components/tasks/TasksView.tsx | 874 | onClick | {() => handleApproveTask(selectedTask.id)} | disabled={actionLoading} && selectedTask.status === 'review' && currentRole !== 'intern' && drawerTab === 'details' && selectedTask |
| src/components/tasks/TasksView.tsx | 882 | onClick | {() => setReviewFeedbackModalOpen(true)} | disabled={actionLoading} && selectedTask.status === 'review' && currentRole !== 'intern' && drawerTab === 'details' && selectedTask |
| src/components/tasks/TasksView.tsx | 957 | onSubmit | {handleSendComment} | drawerTab === 'comments' && selectedTask |
| src/components/tasks/TasksView.tsx | 962 | onChange | {(e) => setCommentInput(e.target.value)} | drawerTab === 'comments' && selectedTask |
| src/components/tasks/TasksView.tsx | 992 | onClick | {() => setBlockModalOpen(false)} | blockModalOpen |
| src/components/tasks/TasksView.tsx | 1012 | onChange | {(e) => setBlockReason(e.target.value)} | blockModalOpen |
| src/components/tasks/TasksView.tsx | 1019 | onClick | {() => setBlockModalOpen(false)} | blockModalOpen |
| src/components/tasks/TasksView.tsx | 1026 | onClick | {handleBlockTask} | disabled={!blockReason.trim() \|\| actionLoading} && blockModalOpen |
| src/components/tasks/TasksView.tsx | 1046 | onClick | {() => setReviewFeedbackModalOpen(false)} | reviewFeedbackModalOpen |
| src/components/tasks/TasksView.tsx | 1066 | onChange | {(e) => setReviewFeedback(e.target.value)} | reviewFeedbackModalOpen |
| src/components/tasks/TasksView.tsx | 1073 | onClick | {() => setReviewFeedbackModalOpen(false)} | reviewFeedbackModalOpen |
| src/components/tasks/TasksView.tsx | 1080 | onClick | {handleRequestChanges} | disabled={!reviewFeedback.trim() \|\| actionLoading} && reviewFeedbackModalOpen |
| src/components/tasks/TasksView.tsx | 1100 | onClick | {handleCloseCreateModal} | isCreateModalOpen |
| src/components/tasks/TasksView.tsx | 1112 | onClick | {handleCloseCreateModal} | isCreateModalOpen |
| src/components/tasks/TasksView.tsx | 1117 | onSubmit | {handleCreateSubmit} | isCreateModalOpen |
| src/components/tasks/TasksView.tsx | 1125 | onChange | {(e) => setTitle(e.target.value)} | isCreateModalOpen |
| src/components/tasks/TasksView.tsx | 1137 | onChange | {(e) => setDescription(e.target.value)} | isCreateModalOpen |
| src/components/tasks/TasksView.tsx | 1147 | onChange | {(e) => setPriority(e.target.value as TaskPriority)} | isCreateModalOpen |
| src/components/tasks/TasksView.tsx | 1163 | onChange | {(e) => setProjectId(e.target.value)} | isCreateModalOpen |
| src/components/tasks/TasksView.tsx | 1183 | onChange | {(e) => {                           const newAssignee = e.target.value;                           setAssignedTo(newAssignee);                           const targetUser = users.find((u) => u.id === newAssignee);                          | permissions.tasks.assign && isCreateModalOpen |
| src/components/tasks/TasksView.tsx | 1206 | onChange | {(e) => setDueDate(e.target.value)} | isCreateModalOpen |
| src/components/tasks/TasksView.tsx | 1220 | onChange | {(e) => setStoryPoints(parseInt(e.target.value) \|\| 1)} | isCreateModalOpen |
| src/components/tasks/TasksView.tsx | 1231 | onChange | {(e) => setEstimatedHours(parseInt(e.target.value) \|\| 1)} | isCreateModalOpen |
| src/components/tasks/TasksView.tsx | 1240 | onClick | {handleCloseCreateModal} | isCreateModalOpen |
| src/components/teams/TeamsView.tsx | 204 | onClick | {() => setIsCreateTeamModalOpen(true)} | permissions.teams.inviteMembers |
| src/components/teams/TeamsView.tsx | 211 | onClick | {() => {                   setGeneratedInvite(null);                   setIsInviteModalOpen(true);                 }} | permissions.teams.inviteMembers |
| src/components/teams/TeamsView.tsx | 288 | onClick | {() => setSelectedTeam(team)} | visibleTeams.length === 0 |
| src/components/teams/TeamsView.tsx | 379 | onClick | {() => handleCopyLink(inv.token)} | currentRole === 'admin' && pendingInvites.length > 0 |
| src/components/teams/TeamsView.tsx | 457 | onClick | {() => setSelectedTeam(null)} | activeSelectedTeam |
| src/components/teams/TeamsView.tsx | 486 | onClick | {() => setSelectedTeam(null)} | activeSelectedTeam |
| src/components/teams/TeamsView.tsx | 518 | onClick | {() => {                       setSelectedNewLeadId(activeSelectedTeam.lead_id \|\| '');                       setIsChangeLeadModalOpen(true);                     }} | permissions.teams.manageTeams && activeSelectedTeam |
| src/components/teams/TeamsView.tsx | 542 | onClick | {() => {                       setSelectedUserIdsToAdd([]);                       setIsAddMembersModalOpen(true);                     }} | permissions.teams.manageTeams && activeSelectedTeam |
| src/components/teams/TeamsView.tsx | 591 | onClick | {() => {                                   setMemberToMove(member);                                   const otherTeams = teams.filter((t) => t.id !== activeSelectedTeam.id);                                   setTargetMoveTeamId(otherTeam | teams.length > 1 && permissions.teams.manageTeams && getTeamMembers(activeSelectedTeam).length === 0 && activeSelectedTeam |
| src/components/teams/TeamsView.tsx | 607 | onClick | {() => handleRemoveMember(member.id, member.name)} | permissions.teams.manageTeams && getTeamMembers(activeSelectedTeam).length === 0 && activeSelectedTeam |
| src/components/teams/TeamsView.tsx | 625 | onClick | {() => setSelectedTeam(null)} | activeSelectedTeam |
| src/components/teams/TeamsView.tsx | 646 | onClick | {() => setIsAddMembersModalOpen(false)} | isAddMembersModalOpen && activeSelectedTeam |
| src/components/teams/TeamsView.tsx | 661 | onClick | {() => setIsAddMembersModalOpen(false)} | isAddMembersModalOpen && activeSelectedTeam |
| src/components/teams/TeamsView.tsx | 675 | onChange | {(e) => setMemberSearchQuery(e.target.value)} | isAddMembersModalOpen && activeSelectedTeam |
| src/components/teams/TeamsView.tsx | 681 | onSubmit | {handleAddMembersSubmit} | isAddMembersModalOpen && activeSelectedTeam |
| src/components/teams/TeamsView.tsx | 707 | onClick | {() => {                             setSelectedUserIdsToAdd((prev) =>                               isSelected ? prev.filter((id) => id !== u.id) : [...prev, u.id]                             );                           }} | isAddMembersModalOpen && activeSelectedTeam |
| src/components/teams/TeamsView.tsx | 752 | onClick | {() => setIsAddMembersModalOpen(false)} | isAddMembersModalOpen && activeSelectedTeam |
| src/components/teams/TeamsView.tsx | 782 | onClick | {() => setIsMoveMemberModalOpen(false)} | isMoveMemberModalOpen && activeSelectedTeam && memberToMove |
| src/components/teams/TeamsView.tsx | 793 | onClick | {() => setIsMoveMemberModalOpen(false)} | isMoveMemberModalOpen && activeSelectedTeam && memberToMove |
| src/components/teams/TeamsView.tsx | 809 | onSubmit | {handleMoveMemberSubmit} | isMoveMemberModalOpen && activeSelectedTeam && memberToMove |
| src/components/teams/TeamsView.tsx | 814 | onChange | {(e) => setTargetMoveTeamId(e.target.value)} | isMoveMemberModalOpen && activeSelectedTeam && memberToMove |
| src/components/teams/TeamsView.tsx | 834 | onClick | {() => setIsMoveMemberModalOpen(false)} | isMoveMemberModalOpen && activeSelectedTeam && memberToMove |
| src/components/teams/TeamsView.tsx | 863 | onClick | {() => setIsChangeLeadModalOpen(false)} | isChangeLeadModalOpen && activeSelectedTeam |
| src/components/teams/TeamsView.tsx | 877 | onClick | {() => setIsChangeLeadModalOpen(false)} | isChangeLeadModalOpen && activeSelectedTeam |
| src/components/teams/TeamsView.tsx | 882 | onSubmit | {handleChangeLeadSubmit} | isChangeLeadModalOpen && activeSelectedTeam |
| src/components/teams/TeamsView.tsx | 887 | onChange | {(e) => setSelectedNewLeadId(e.target.value)} | isChangeLeadModalOpen && activeSelectedTeam |
| src/components/teams/TeamsView.tsx | 905 | onClick | {() => setIsChangeLeadModalOpen(false)} | isChangeLeadModalOpen && activeSelectedTeam |
| src/components/teams/TeamsView.tsx | 934 | onClick | {() => {                 setIsInviteModalOpen(false);                 setGeneratedInvite(null);               }} | isInviteModalOpen |
| src/components/teams/TeamsView.tsx | 949 | onClick | {() => {                     setIsInviteModalOpen(false);                     setGeneratedInvite(null);                   }} | isInviteModalOpen |
| src/components/teams/TeamsView.tsx | 979 | onClick | {() => handleCopyLink(generatedInvite.token)} | generatedInvite && isInviteModalOpen |
| src/components/teams/TeamsView.tsx | 990 | onClick | {() => {                         setIsInviteModalOpen(false);                         setGeneratedInvite(null);                         setInviteEmail('');                       }} | generatedInvite && isInviteModalOpen |
| src/components/teams/TeamsView.tsx | 1002 | onSubmit | {handleInviteSubmit} | generatedInvite && isInviteModalOpen |
| src/components/teams/TeamsView.tsx | 1010 | onChange | {(e) => setInviteEmail(e.target.value)} | generatedInvite && isInviteModalOpen |
| src/components/teams/TeamsView.tsx | 1019 | onChange | {(e) => setInviteRole(e.target.value as UserRole)} | generatedInvite && isInviteModalOpen |
| src/components/teams/TeamsView.tsx | 1032 | onChange | {(e) => setInviteTeamId(e.target.value)} | generatedInvite && isInviteModalOpen |
| src/components/teams/TeamsView.tsx | 1044 | onClick | {() => setIsInviteModalOpen(false)} | generatedInvite && isInviteModalOpen |
| src/components/teams/TeamsView.tsx | 1074 | onClick | {() => setIsCreateTeamModalOpen(false)} | isCreateTeamModalOpen |
| src/components/teams/TeamsView.tsx | 1085 | onClick | {() => setIsCreateTeamModalOpen(false)} | isCreateTeamModalOpen |
| src/components/teams/TeamsView.tsx | 1090 | onSubmit | {handleCreateTeamSubmit} | isCreateTeamModalOpen |
| src/components/teams/TeamsView.tsx | 1098 | onChange | {(e) => setTeamName(e.target.value)} | isCreateTeamModalOpen |
| src/components/teams/TeamsView.tsx | 1110 | onChange | {(e) => setTeamDescription(e.target.value)} | isCreateTeamModalOpen |
| src/components/teams/TeamsView.tsx | 1121 | onChange | {(e) => setTeamColor(e.target.value)} | isCreateTeamModalOpen |
| src/components/teams/TeamsView.tsx | 1129 | onChange | {(e) => setTeamLeadId(e.target.value)} | isCreateTeamModalOpen |
| src/components/teams/TeamsView.tsx | 1142 | onClick | {() => setIsCreateTeamModalOpen(false)} | isCreateTeamModalOpen |
| src/components/time/TimeTrackingView.tsx | 202 | onChange | {(e) => setActiveTaskTitle(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/time/TimeTrackingView.tsx | 211 | onChange | {(e) => setIsBillable(e.target.checked)} | isAdmin |
| src/components/time/TimeTrackingView.tsx | 226 | onClick | {() => setIsTimerRunning(false)} | isTimerRunning |
| src/components/time/TimeTrackingView.tsx | 234 | onClick | {handleStartTimer} | isTimerRunning |
| src/components/time/TimeTrackingView.tsx | 243 | onClick | {handleStopTimer} | disabled={elapsedSeconds === 0 && !isTimerRunning} |
| src/components/time/TimeTrackingView.tsx | 486 | onClick | {() => handleDeleteEntry(entry.id)} | (currentRole === 'admin' \|\| entry.userId === currentUser.id) && entries.length === 0 |
| src/components/ui/EmptyState.tsx | 42 | onClick | {onAction} | actionLabel && onAction |
| src/components/ui/KPIWidget.tsx | 86 | onClick | {onClick} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/ui/PageHeader.tsx | 35 | onClick | {item.onClick} | item.onClick && breadcrumbs && breadcrumbs.length > 0 |
| src/components/ui/SectionCard.tsx | 35 | onClick | {onClick} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/wiki/WikiView.tsx | 339 | onClick | {() => openCreateModal(null)} | currentRole !== 'intern' && !embedded |
| src/components/wiki/WikiView.tsx | 357 | onClick | {() => openCreateModal(null)} | currentRole !== 'intern' |
| src/components/wiki/WikiView.tsx | 371 | onChange | {(e) => setSearchQuery(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/wiki/WikiView.tsx | 389 | onClick | {() => selectPage(page.id)} | visiblePages.length === 0 |
| src/components/wiki/WikiView.tsx | 410 | onClick | {() => openCreateModal(selectedPage.id)} | currentRole !== 'intern' && selectedPage |
| src/components/wiki/WikiView.tsx | 439 | onChange | {(e) => setEditTitle(e.target.value)} | isEditing && selectedPage && isLoading |
| src/components/wiki/WikiView.tsx | 457 | onClick | {handleSaveEdit} | isEditing && currentRole !== 'intern' && (currentRole === 'admin' \|\| selectedPage.createdBy === currentUser?.id \|\| (selectedPage as any).created_by === currentUser?.id) && selectedPage && isLoading |
| src/components/wiki/WikiView.tsx | 466 | onClick | {() => {                             setEditTitle(selectedPage.title);                             setEditContentText(                               selectedPage.contentJson.blocks?.find((b: any) => b.type === 'paragraph')?.text \|\| ''   | isEditing && currentRole !== 'intern' && (currentRole === 'admin' \|\| selectedPage.createdBy === currentUser?.id \|\| (selectedPage as any).created_by === currentUser?.id) && selectedPage && isLoading |
| src/components/wiki/WikiView.tsx | 479 | onClick | {() => handleDeletePage(selectedPage.id)} | isEditing && currentRole !== 'intern' && (currentRole === 'admin' \|\| selectedPage.createdBy === currentUser?.id \|\| (selectedPage as any).created_by === currentUser?.id) && selectedPage && isLoading |
| src/components/wiki/WikiView.tsx | 497 | onChange | {(e) => setEditContentText(e.target.value)} | isEditing && selectedPage && isLoading |
| src/components/wiki/WikiView.tsx | 552 | onSubmit | {handleAddComment} | comments.filter((c) => c.pageId === selectedPage.id).length > 0 && selectedPage && isLoading |
| src/components/wiki/WikiView.tsx | 557 | onChange | {(e) => setNewComment(e.target.value)} | comments.filter((c) => c.pageId === selectedPage.id).length > 0 && selectedPage && isLoading |
| src/components/wiki/WikiView.tsx | 589 | onClick | {() => selectPage(pages[0].id)} | pages.length > 0 && selectedPage && isLoading |
| src/components/wiki/WikiView.tsx | 597 | onClick | {() => openCreateModal(null)} | currentRole !== 'intern' && selectedPage && isLoading |
| src/components/wiki/WikiView.tsx | 618 | onClick | {() => setIsCreateModalOpen(false)} | isCreateModalOpen |
| src/components/wiki/WikiView.tsx | 632 | onClick | {() => setIsCreateModalOpen(false)} | isCreateModalOpen |
| src/components/wiki/WikiView.tsx | 637 | onSubmit | {handleCreateSubmit} | isCreateModalOpen |
| src/components/wiki/WikiView.tsx | 645 | onChange | {(e) => setCreateTitle(e.target.value)} | isCreateModalOpen |
| src/components/wiki/WikiView.tsx | 654 | onChange | {(e) => setCreateVisibility(e.target.value)} | isCreateModalOpen |
| src/components/wiki/WikiView.tsx | 669 | onChange | {(e) => setCreateDepartmentId(e.target.value)} | createVisibility === 'department' && isCreateModalOpen |
| src/components/wiki/WikiView.tsx | 686 | onClick | {() => setIsCreateModalOpen(false)} | isCreateModalOpen |
| src/components/workspace/WorkspaceSelector.tsx | 73 | onClick | {() => setIsOpen(!isOpen)} | disabled={isWorkspaceLoading} |
| src/components/workspace/WorkspaceSelector.tsx | 130 | onClick | {() => handleSwitch(ws.id)} | isOpen |
| src/components/workspace/WorkspaceSelector.tsx | 172 | onClick | {() => {                   setActiveTab('workspaces');                   setIsOpen(false);                   window.history.pushState(null, '', '/workspaces');                 }} | isOpen |
| src/components/workspace/WorkspaceSelector.tsx | 184 | onClick | {() => {                   setShowCreateModal(true);                   setIsOpen(false);                 }} | isOpen |
| src/components/workspace/WorkspaceSelector.tsx | 218 | onSubmit | {handleCreate} | showCreateModal |
| src/components/workspace/WorkspaceSelector.tsx | 227 | onChange | {(e) => setNewWorkspaceName(e.target.value)} | showCreateModal |
| src/components/workspace/WorkspaceSelector.tsx | 246 | onClick | {() => setShowCreateModal(false)} | showCreateModal |
| src/components/workspace/WorkspacesSelectionPage.tsx | 111 | onClick | {logout} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/workspace/WorkspacesSelectionPage.tsx | 149 | onClick | {() => !isSwitching && handleSelect(ws)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/workspace/WorkspacesSelectionPage.tsx | 209 | onClick | {() => setShowCreateModal(true)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/workspace/WorkspacesSelectionPage.tsx | 230 | onClick | {() => {                 setActiveTab('onboarding');                 window.history.pushState(null, '', '/onboarding');               }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/workspace/WorkspacesSelectionPage.tsx | 270 | onSubmit | {handleCreate} | showCreateModal |
| src/components/workspace/WorkspacesSelectionPage.tsx | 279 | onChange | {(e) => setNewWorkspaceName(e.target.value)} | showCreateModal |
| src/components/workspace/WorkspacesSelectionPage.tsx | 294 | onClick | {() => setNewPlan(tier)} | showCreateModal |
| src/components/workspace/WorkspacesSelectionPage.tsx | 313 | onClick | {() => setShowCreateModal(false)} | showCreateModal |
| src/components/workspace/WorkspaceView.tsx | 24 | onClick | {() => setActiveTab('settings')} | currentRole === 'admin' |
| src/features/crm/components/CrmKanbanColumn.tsx | 56 | onClick | {() => onSelectLead(rec)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/features/crm/components/CrmKanbanColumn.tsx | 85 | onChange | {(e) => onStageShift(rec.id, e.target.value as CrmStatus)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/features/crm/components/CrmLeadModal.tsx | 46 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/features/crm/components/CrmLeadModal.tsx | 65 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/features/crm/components/CrmLeadModal.tsx | 120 | onClick | {() => onStartEditNotes(lead.id, lead.notes \|\| '')} | canEditNotes && editingNotesId !== lead.id |
| src/features/crm/components/CrmLeadModal.tsx | 133 | onChange | {(e) => onNotesTextChange(e.target.value)} | editingNotesId === lead.id |
| src/features/crm/components/CrmLeadModal.tsx | 139 | onClick | {onCancelEditNotes} | editingNotesId === lead.id |
| src/features/crm/components/CrmLeadModal.tsx | 145 | onClick | {() => onSaveNotes(lead.id)} | editingNotesId === lead.id |
| src/features/crm/components/CrmLeadModal.tsx | 163 | onClick | {() => onDelete(lead.id)} | canDelete |
| src/features/crm/components/CrmLeadModal.tsx | 171 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/features/dashboard/components/AdminMetricsGrid.tsx | 37 | onClick | {() => onNavigate('teams')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/features/dashboard/components/AdminMetricsGrid.tsx | 47 | onClick | {() => onNavigate('projects')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/features/dashboard/components/AdminMetricsGrid.tsx | 57 | onClick | {() => onNavigate('tasks')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/features/dashboard/components/AdminMetricsGrid.tsx | 67 | onClick | {() => onNavigate('crm')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/features/dashboard/components/DashboardWelcomeBanner.tsx | 29 | onClick | {() => onNavigate('projects')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/features/dashboard/components/DashboardWelcomeBanner.tsx | 37 | onClick | {() => onNavigate('tasks')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/features/dashboard/components/DashboardWelcomeBanner.tsx | 46 | onClick | {onOpenCommandPalette} | onOpenCommandPalette |
