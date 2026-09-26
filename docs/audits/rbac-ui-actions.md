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
| src/App.tsx | 433 | onRouteChange | {(newLeadId) => {                 setCrmLeadIdParam(newLeadId \|\| null);                 const targetUrl = newLeadId ? `/crm/${newLeadId}` : '/crm';                 if (window.location.pathname !== targetUrl) {                   window.h | <RoleGuard allowedRoles={['admin', 'employee']} fallback={<ForbiddenPage requiredRole="ADMIN or EMPLOYEE" message="CRM customer pipelines, deal values, and forecasting are restricted to Staff." />}> |
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
| src/components/automations/AutomationsView.tsx | 370 | onClick | {() => setIsCreateOpen(true)} | currentRole === 'admin' && filteredRules.length === 0 && activeTab === 'rules' |
| src/components/automations/AutomationsView.tsx | 377 | onClick | {() => setIsCreateOpen(true)} | currentRole === 'admin' && filteredRules.length === 0 && activeTab === 'rules' |
| src/components/automations/AutomationsView.tsx | 454 | onClick | {() => handleToggle(rule.id)} | disabled={togglingId === rule.id} && currentRole === 'admin' && filteredRules.length === 0 && activeTab === 'rules' |
| src/components/automations/AutomationsView.tsx | 468 | onClick | {() => handleDuplicate(rule.id, rule.name)} | disabled={duplicatingId === rule.id} && currentRole === 'admin' && filteredRules.length === 0 && activeTab === 'rules' |
| src/components/automations/AutomationsView.tsx | 478 | onClick | {() => setEditingRule(rule)} | currentRole === 'admin' && filteredRules.length === 0 && activeTab === 'rules' |
| src/components/automations/AutomationsView.tsx | 487 | onClick | {() => handleDelete(rule.id, rule.name)} | disabled={deletingId === rule.id} && currentRole === 'admin' && filteredRules.length === 0 && activeTab === 'rules' |
| src/components/automations/AutomationsView.tsx | 610 | onClick | {() => handleInstallTemplate(tpl.id, tpl.name)} | disabled={installingTemplateId === tpl.id} && currentRole === 'admin' && activeTab === 'templates' |
| src/components/automations/AutomationsView.tsx | 628 | onClose | {() => setIsCreateOpen(false)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/AutomationsView.tsx | 629 | onSuccess | {handleCreateSuccess} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/automations/AutomationsView.tsx | 636 | onClose | {() => setEditingRule(null)} | editingRule |
| src/components/automations/AutomationsView.tsx | 637 | onSuccess | {handleEditSuccess} | editingRule |
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
| src/components/common/EmptyState.tsx | 88 | onClick | {onAction} | actionLabel && onAction && (actionLabel \|\| secondaryLabel) |
| src/components/common/EmptyState.tsx | 94 | onClick | {onSecondaryAction} | secondaryLabel && onSecondaryAction && (actionLabel \|\| secondaryLabel) |
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
| src/components/crm/CrmView.tsx | 222 | onSecondaryAction | {() => setIsAddModalOpen(true)} | visibleRecords.length === 0 |
| src/components/crm/CrmView.tsx | 237 | onSelectLead | {handleSelectLead} | activeTab === 'pipeline' && visibleRecords.length === 0 |
| src/components/crm/CrmView.tsx | 238 | onStageShift | {handleStageShift} | activeTab === 'pipeline' && visibleRecords.length === 0 |
| src/components/crm/CrmView.tsx | 285 | onClick | {() => deleteCrmRecord(rec.id)} | permissions.crm.deleteRecord && activeTab === 'pipeline' && visibleRecords.length === 0 |
| src/components/crm/CrmView.tsx | 312 | onClick | {() => setIsAddModalOpen(false)} | isAddModalOpen |
| src/components/crm/CrmView.tsx | 317 | onSubmit | {handleCreateSubmit} | isAddModalOpen |
| src/components/crm/CrmView.tsx | 326 | onChange | {(e) => setCompany(e.target.value)} | isAddModalOpen |
| src/components/crm/CrmView.tsx | 337 | onChange | {(e) => setCustomerName(e.target.value)} | isAddModalOpen |
| src/components/crm/CrmView.tsx | 351 | onChange | {(e) => setEmail(e.target.value)} | isAddModalOpen |
| src/components/crm/CrmView.tsx | 361 | onChange | {(e) => setPhone(e.target.value)} | isAddModalOpen |
| src/components/crm/CrmView.tsx | 376 | onChange | {(e) => setDealValue(Number(e.target.value))} | isAddModalOpen |
| src/components/crm/CrmView.tsx | 384 | onChange | {(e) => setStatus(e.target.value as CrmStatus)} | isAddModalOpen |
| src/components/crm/CrmView.tsx | 400 | onChange | {(e) => setNotes(e.target.value)} | isAddModalOpen |
| src/components/crm/CrmView.tsx | 408 | onClick | {() => setIsAddModalOpen(false)} | isAddModalOpen |
| src/components/crm/CrmView.tsx | 434 | onClose | {() => handleSelectLead(null)} | selectedLeadModal |
| src/components/crm/CrmView.tsx | 435 | onDelete | {(id) => {               deleteCrmRecord(id);               handleSelectLead(null);             }} | selectedLeadModal |
| src/components/crm/CrmView.tsx | 439 | onStartEditNotes | {(id, currentNotes) => {               setEditingNotesId(id);               setNotesText(currentNotes);             }} | selectedLeadModal |
| src/components/crm/CrmView.tsx | 443 | onCancelEditNotes | {() => setEditingNotesId(null)} | selectedLeadModal |
| src/components/crm/CrmView.tsx | 444 | onSaveNotes | {handleSaveNotes} | selectedLeadModal |
| src/components/crm/CrmView.tsx | 445 | onNotesTextChange | {setNotesText} | selectedLeadModal |
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
| src/components/dashboard/AdminDashboard.tsx | 500 | onClick | {() => setActiveTab('documents')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/AdminDashboard.tsx | 527 | onClick | {() => setActiveTab('documents')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/AdminDashboard.tsx | 561 | onClick | {() => setActiveTab('teams')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/AdminDashboard.tsx | 650 | onClick | {() => setActiveTab('automations')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/EmployeeDashboard.tsx | 227 | onClick | {() => setActiveTab('tasks')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/EmployeeDashboard.tsx | 261 | onClick | {() => setActiveTab('time')} | activeTimer |
| src/components/dashboard/EmployeeDashboard.tsx | 267 | onClick | {handleStopTimer} | activeTimer |
| src/components/dashboard/EmployeeDashboard.tsx | 286 | onClick | {() => { setTaskFilter('in_progress'); }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/EmployeeDashboard.tsx | 296 | onClick | {() => { setTaskFilter('overdue'); }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/EmployeeDashboard.tsx | 306 | onClick | {() => { setTaskFilter('review'); }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/EmployeeDashboard.tsx | 316 | onClick | {() => { setTaskFilter('done'); }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/EmployeeDashboard.tsx | 338 | onClick | {() => setTaskFilter(tab)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/EmployeeDashboard.tsx | 422 | onClick | {() => handleStartTask(task.id)} | disabled={actionLoading === task.id} && task.status === 'todo' && filteredTasks.length === 0 |
| src/components/dashboard/EmployeeDashboard.tsx | 433 | onClick | {() => handleSubmitReview(task.id)} | disabled={actionLoading === task.id} && task.status === 'in_progress' && filteredTasks.length === 0 |
| src/components/dashboard/EmployeeDashboard.tsx | 487 | onClick | {() => setActiveTab('projects')} | assignedProjects.length === 0 |
| src/components/dashboard/EmployeeDashboard.tsx | 560 | onClick | {() => setActiveTab('teams')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/dashboard/EmployeeDashboard.tsx | 597 | onClick | {() => setActiveTab('teams')} | No enclosing JSX permission condition; inspect handler and parent view |
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
| src/components/documents/DocumentsView.tsx | 314 | onSecondaryAction | {() => {/* toggle shared filter */}} | visibleDocs.length === 0 |
| src/components/documents/DocumentsView.tsx | 329 | onClick | {() => handleSelectDoc(doc)} | viewMode === 'grid' && visibleDocs.length === 0 |
| src/components/documents/DocumentsView.tsx | 356 | onClick | {(e) => e.stopPropagation()} | viewMode === 'grid' && visibleDocs.length === 0 |
| src/components/documents/DocumentsView.tsx | 358 | onClick | {() => incrementDocDownload(doc.id)} | viewMode === 'grid' && visibleDocs.length === 0 |
| src/components/documents/DocumentsView.tsx | 367 | onClick | {() => deleteDocument(doc.id)} | canDelete && viewMode === 'grid' && visibleDocs.length === 0 |
| src/components/documents/DocumentsView.tsx | 403 | onClick | {() => handleSelectDoc(doc)} | viewMode === 'grid' && visibleDocs.length === 0 |
| src/components/documents/DocumentsView.tsx | 430 | onClick | {(e) => e.stopPropagation()} | viewMode === 'grid' && visibleDocs.length === 0 |
| src/components/documents/DocumentsView.tsx | 433 | onClick | {() => handleSelectDoc(doc)} | viewMode === 'grid' && visibleDocs.length === 0 |
| src/components/documents/DocumentsView.tsx | 440 | onClick | {() => incrementDocDownload(doc.id)} | viewMode === 'grid' && visibleDocs.length === 0 |
| src/components/documents/DocumentsView.tsx | 448 | onClick | {() => deleteDocument(doc.id)} | canDelete && viewMode === 'grid' && visibleDocs.length === 0 |
| src/components/documents/DocumentsView.tsx | 474 | onClick | {() => handleSelectDoc(null)} | previewDoc |
| src/components/documents/DocumentsView.tsx | 496 | onClick | {() => handleSelectDoc(null)} | previewDoc |
| src/components/documents/DocumentsView.tsx | 548 | onClick | {() => {                     incrementDocDownload(previewDoc.id);                     setPreviewDoc(null);                   }} | previewDoc |
| src/components/documents/DocumentsView.tsx | 571 | onClick | {() => setIsUploadModalOpen(false)} | isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 585 | onClick | {() => setIsUploadModalOpen(false)} | isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 590 | onSubmit | {handleUploadSubmit} | isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 593 | onDragOver | {(e) => {                     e.preventDefault();                     setIsDragging(true);                   }} | isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 597 | onDragLeave | {() => setIsDragging(false)} | isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 598 | onDrop | {(e) => {                     e.preventDefault();                     setIsDragging(false);                     if (e.dataTransfer.files && e.dataTransfer.files[0]) {                       handleFileChange(e.dataTransfer.files[0]);     | isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 605 | onClick | {() => fileInputRef.current?.click()} | isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 618 | onChange | {(e) => {                       if (e.target.files && e.target.files[0]) {                         handleFileChange(e.target.files[0]);                       }                     }} | isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 646 | onChange | {(e) => setTitle(e.target.value)} | isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 656 | onChange | {(e) => setCategory(e.target.value as any)} | isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 671 | onChange | {(e) => setFileType(e.target.value as any)} | isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 687 | onChange | {(e) => setVisibility(e.target.value as DocumentVisibility)} | isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 702 | onChange | {(e) => setSelectedDepartmentId(e.target.value)} | visibility === 'department' && isUploadModalOpen |
| src/components/documents/DocumentsView.tsx | 719 | onClick | {() => setIsUploadModalOpen(false)} | isUploadModalOpen |
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
| src/components/people/AddDepartmentMemberModal.tsx | 44 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/AddDepartmentMemberModal.tsx | 51 | onSubmit | {onSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/AddDepartmentMemberModal.tsx | 62 | onChange | {(e) => setSelectedAddUserId(e.target.value)} | candidateProfiles.length === 0 |
| src/components/people/AddDepartmentMemberModal.tsx | 83 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/AttendanceSubTab.tsx | 34 | onClick | {isCheckedIn ? onCheckOut : onCheckIn} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/CreateTeamModal.tsx | 60 | onClick | {() => setIsOpen(false)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/CreateTeamModal.tsx | 67 | onSubmit | {handleSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/CreateTeamModal.tsx | 75 | onChange | {(e) => setTeamName(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/CreateTeamModal.tsx | 87 | onChange | {(e) => setTeamDescription(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/CreateTeamModal.tsx | 98 | onChange | {(e) => setTeamColor(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/CreateTeamModal.tsx | 106 | onChange | {(e) => setTeamLeadId(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/CreateTeamModal.tsx | 119 | onClick | {() => setIsOpen(false)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/DepartmentDetailsHeader.tsx | 52 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/DepartmentDetailsHeader.tsx | 67 | onChange | {(e) => setSearchQuery(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/DepartmentDetailsHeader.tsx | 75 | onChange | {(e) => setPositionFilter(e.target.value as any)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/DepartmentDetailsHeader.tsx | 89 | onClick | {onOpenAddMember} | isAdmin |
| src/components/people/DepartmentDetailsModal.tsx | 178 | onClose | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/DepartmentDetailsModal.tsx | 184 | onOpenAddMember | {() => setIsAddMemberOpen(true)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/DepartmentDetailsModal.tsx | 203 | onAction | {() => setIsAddMemberOpen(true)} | filteredMembers.length === 0 && loading |
| src/components/people/DepartmentDetailsModal.tsx | 213 | onPromoteLead | {handlePromoteLead} | filteredMembers.length === 0 && loading |
| src/components/people/DepartmentDetailsModal.tsx | 214 | onStartMove | {(m) => {                 setMovingMember(m);                 setTargetDepartmentId(allDepartments.find((d) => d.id !== department.id)?.id \|\| '');               }} | filteredMembers.length === 0 && loading |
| src/components/people/DepartmentDetailsModal.tsx | 218 | onRemoveMember | {handleRemoveMember} | filteredMembers.length === 0 && loading |
| src/components/people/DepartmentDetailsModal.tsx | 230 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/DepartmentDetailsModal.tsx | 239 | onClose | {() => setIsAddMemberOpen(false)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/DepartmentDetailsModal.tsx | 244 | onSubmit | {handleAddMember} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/DepartmentDetailsModal.tsx | 250 | onClose | {() => setMovingMember(null)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/DepartmentDetailsModal.tsx | 251 | onSubmit | {handleMoveMemberSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/DepartmentMembersList.tsx | 74 | onClick | {() => onPromoteLead(member)} | disabled={isBusy} && isAdmin |
| src/components/people/DepartmentMembersList.tsx | 89 | onClick | {() => onStartMove(member)} | disabled={isBusy} && isAdmin |
| src/components/people/DepartmentMembersList.tsx | 100 | onClick | {() => onRemoveMember(member)} | disabled={isBusy} && isAdmin |
| src/components/people/DepartmentsSubTab.tsx | 44 | onChange | {(e) => setDeptSearchQuery(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/DepartmentsSubTab.tsx | 51 | onClick | {onOpenCreateTeam} | permissions?.teams?.manageTeams |
| src/components/people/DepartmentsSubTab.tsx | 154 | onClick | {() => onEditDepartment(dept)} | permissions?.teams?.manageTeams |
| src/components/people/DepartmentsSubTab.tsx | 161 | onClick | {() => onAssignMember(dept)} | permissions?.teams?.manageTeams |
| src/components/people/DepartmentsSubTab.tsx | 172 | onClick | {() => onManageMembers(dept)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/DepartmentsSubTab.tsx | 191 | onAction | {onOpenCreateTeam} | departments.length === 0 |
| src/components/people/DepartmentsSubTab.tsx | 193 | onSecondaryAction | {onViewDirectory} | departments.length === 0 |
| src/components/people/DirectorySubTab.tsx | 53 | onChange | {(e) => setSearchQuery(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/DirectorySubTab.tsx | 61 | onChange | {(e) => setSelectedDepartmentFilter(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/DirectorySubTab.tsx | 74 | onChange | {(e) => setSelectedEmploymentTypeFilter(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/DirectorySubTab.tsx | 98 | onClick | {() => setSelectedDepartmentFilter('')} | selectedDepartmentFilter |
| src/components/people/DirectorySubTab.tsx | 145 | onClick | {(e) => {                           e.stopPropagation();                           const targetId = prof.userId \|\| prof.user?.id \|\| prof.id;                           setActiveActionMenuUserId(activeActionMenuUserId === targetId ? null : ta | currentRole === 'admin' && prof.userId !== currentUser?.id && prof.user?.id !== currentUser?.id |
| src/components/people/DirectorySubTab.tsx | 160 | onClick | {(e) => e.stopPropagation()} | activeActionMenuUserId === (prof.userId \|\| prof.user?.id \|\| prof.id) && currentRole === 'admin' && prof.userId !== currentUser?.id && prof.user?.id !== currentUser?.id |
| src/components/people/DirectorySubTab.tsx | 164 | onClick | {() => onOpenRemoveMember(prof)} | activeActionMenuUserId === (prof.userId \|\| prof.user?.id \|\| prof.id) && currentRole === 'admin' && prof.userId !== currentUser?.id && prof.user?.id !== currentUser?.id |
| src/components/people/DirectorySubTab.tsx | 212 | onClick | {() => onViewProfile(prof)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/DirectorySubTab.tsx | 233 | onAction | {() => setSelectedDepartmentFilter('')} | filteredProfiles.length === 0 |
| src/components/people/DirectorySubTab.tsx | 236 | onSecondaryAction | {onOpenInviteModal} | filteredProfiles.length === 0 |
| src/components/people/EditDepartmentModal.tsx | 47 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/EditDepartmentModal.tsx | 61 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/EditDepartmentModal.tsx | 66 | onSubmit | {onSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/EditDepartmentModal.tsx | 73 | onChange | {(e) => setEditDeptName(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/EditDepartmentModal.tsx | 84 | onChange | {(e) => setEditDeptDescription(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/EditDepartmentModal.tsx | 94 | onChange | {(e) => setEditDeptHeadId(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/EditDepartmentModal.tsx | 113 | onClick | {() => setEditDeptColor(c)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/EditDepartmentModal.tsx | 126 | onClick | {() => onDelete(editingDepartment.id, editingDepartment.name)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/EditDepartmentModal.tsx | 136 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/EmployeeProfileModal.tsx | 34 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/EmployeeProfileModal.tsx | 51 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/EmployeeProfileModal.tsx | 56 | onSubmit | {onSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/EmployeeProfileModal.tsx | 64 | onChange | {(e) => setSelectedProfile({ ...selectedProfile, designation: e.target.value })} | disabled={currentRole !== 'admin'} |
| src/components/people/EmployeeProfileModal.tsx | 73 | onChange | {(e) => setSelectedProfile({ ...selectedProfile, departmentId: e.target.value \|\| null })} | disabled={currentRole !== 'admin'} |
| src/components/people/EmployeeProfileModal.tsx | 92 | onChange | {(e) => setSelectedProfile({ ...selectedProfile, managerId: e.target.value \|\| null })} | disabled={currentRole !== 'admin'} |
| src/components/people/EmployeeProfileModal.tsx | 110 | onChange | {(e) => setSelectedProfile({ ...selectedProfile, employmentType: e.target.value })} | disabled={currentRole !== 'admin'} |
| src/components/people/EmployeeProfileModal.tsx | 127 | onChange | {(e) => setSelectedProfile({ ...selectedProfile, location: e.target.value })} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/EmployeeProfileModal.tsx | 137 | onChange | {(e) => setSelectedProfile({ ...selectedProfile, status: e.target.value })} | disabled={currentRole !== 'admin'} |
| src/components/people/EmployeeProfileModal.tsx | 152 | onChange | {(e) => setSelectedProfile({ ...selectedProfile, bio: e.target.value })} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/EmployeeProfileModal.tsx | 161 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/InvitationsSubTab.tsx | 36 | onClick | {() => setInviteStatusFilter(st)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/InvitationsSubTab.tsx | 59 | onClick | {onOpenInviteModal} | permissions?.teams?.inviteMembers |
| src/components/people/InvitationsSubTab.tsx | 131 | onClick | {() => handleCopyLink(inv.token)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/InvitationsSubTab.tsx | 141 | onClick | {() => handleRevokeInvite(inv.id)} | disabled={revokingInviteId === inv.id} && computedStatus !== 'accepted' && permissions?.teams?.manageTeams |
| src/components/people/InvitationsSubTab.tsx | 160 | onAction | {onOpenInviteModal} | invites.length === 0 |
| src/components/people/InvitationsSubTab.tsx | 163 | onSecondaryAction | {onOpenInviteModal} | invites.length === 0 |
| src/components/people/InviteMemberModal.tsx | 58 | onClick | {() => setIsOpen(false)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/InviteMemberModal.tsx | 87 | onClick | {() => handleCopyLink(generatedInvite.token)} | generatedInvite |
| src/components/people/InviteMemberModal.tsx | 98 | onClick | {() => {                   setIsOpen(false);                   setGeneratedInvite(null);                   setInviteEmail('');                 }} | generatedInvite |
| src/components/people/InviteMemberModal.tsx | 110 | onSubmit | {handleSubmit} | generatedInvite |
| src/components/people/InviteMemberModal.tsx | 117 | onChange | {(e) => setInviteName(e.target.value)} | generatedInvite |
| src/components/people/InviteMemberModal.tsx | 129 | onChange | {(e) => setInviteEmail(e.target.value)} | generatedInvite |
| src/components/people/InviteMemberModal.tsx | 138 | onChange | {(e) => setInviteRole(e.target.value as 'admin' \| 'employee' \| 'intern')} | generatedInvite |
| src/components/people/InviteMemberModal.tsx | 151 | onChange | {(e) => { /* team selection handled */}                 } | generatedInvite |
| src/components/people/InviteMemberModal.tsx | 164 | onClick | {() => {                   setIsOpen(false);                   setGeneratedInvite(null);                   setInviteEmail('');                 }} | generatedInvite |
| src/components/people/LeaveRequestModal.tsx | 40 | onClick | {() => setIsOpen(false)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/LeaveRequestModal.tsx | 47 | onSubmit | {handleSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/LeaveRequestModal.tsx | 52 | onChange | {(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/LeaveRequestModal.tsx | 68 | onChange | {(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/LeaveRequestModal.tsx | 78 | onChange | {(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/LeaveRequestModal.tsx | 91 | onChange | {(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/LeaveRequestModal.tsx | 100 | onClick | {() => setIsOpen(false)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/LeaveRequestsTable.tsx | 54 | onClick | {() => handleReviewLeave(l.id, 'approved')} | l.status === 'pending' && (currentRole === 'admin' \|\| (currentUser as any)?.role === 'lead') |
| src/components/people/LeaveRequestsTable.tsx | 63 | onClick | {() => handleReviewLeave(l.id, 'rejected')} | l.status === 'pending' && (currentRole === 'admin' \|\| (currentUser as any)?.role === 'lead') |
| src/components/people/LeaveRequestsTable.tsx | 87 | onClick | {() => { /* request leave */ }} | leaves.length === 0 |
| src/components/people/LeavesSubTab.tsx | 25 | onClick | {onOpenRequestModal} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/MoveDepartmentMemberModal.tsx | 46 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/MoveDepartmentMemberModal.tsx | 53 | onSubmit | {onSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/MoveDepartmentMemberModal.tsx | 59 | onChange | {(e) => setTargetDepartmentId(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/MoveDepartmentMemberModal.tsx | 76 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleModalsContainer.tsx | 171 | onClose | {() => setSelectedProfile(null)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleModalsContainer.tsx | 172 | onSubmit | {handleUpdateProfile} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleModalsContainer.tsx | 181 | onClose | {() => {           setIsEditDepartmentModalOpen(false);           setEditingDepartment(null);         }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleModalsContainer.tsx | 195 | onSubmit | {handleUpdateDepartmentSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleModalsContainer.tsx | 196 | onDelete | {handleDeleteDepartment} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleModalsContainer.tsx | 201 | onClose | {() => {           setIsTransferModalOpen(false);           setTargetReassignUser(null);         }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleModalsContainer.tsx | 211 | onSubmit | {handleTransferDepartmentSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleModalsContainer.tsx | 218 | onClose | {() => setSelectedDepartmentDetails(null)} | selectedDepartmentDetails |
| src/components/people/PeopleModalsContainer.tsx | 219 | onDepartmentUpdated | {async () => {             await loadData();             const updated = departments.find((d) => d.id === selectedDepartmentDetails.id);             if (updated) setSelectedDepartmentDetails(updated);           }} | selectedDepartmentDetails |
| src/components/people/PeopleSubTabNav.tsx | 42 | onClick | {() => {               setActiveSubTab(tab.id as any);               if (tab.id === 'invitations') loadInvites();             }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleTabContent.tsx | 122 | onOpenInviteModal | {onOpenInviteModal} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleTabContent.tsx | 140 | onOpenCreateTeam | {onOpenCreateTeam} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleTabContent.tsx | 141 | onEditDepartment | {(dept) => {           setEditingDepartment(dept);           setEditDeptName(dept.name \|\| '');           setEditDeptDescription(dept.description \|\| '');           setEditDeptColor(dept.color \|\| '#7C3AED');           setEditDeptHeadId(dept.h | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleTabContent.tsx | 149 | onAssignMember | {(dept) => {           setTargetReassignUser(profiles.find((p) => p.departmentId !== dept.id) \|\| profiles[0]);           setSelectedNewDeptId(dept.id);           setIsTransferModalOpen(true);         }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleTabContent.tsx | 154 | onManageMembers | {(dept) => setSelectedDepartmentDetails(dept)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleTabContent.tsx | 155 | onViewDirectory | {() => setActiveSubTab('directory')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleTabContent.tsx | 175 | onOpenRemoveMember | {(prof) => {           setMemberToRemove(prof);           setRemoveConfirmName('');           setActiveActionMenuUserId(null);         }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleTabContent.tsx | 180 | onViewProfile | {(prof) => setSelectedProfile(prof)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleTabContent.tsx | 182 | onOpenInviteModal | {onOpenInviteModal} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleTabContent.tsx | 193 | onOpenRequestModal | {() => setIsRequestLeaveModalOpen(true)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleTabContent.tsx | 194 | onReviewLeave | {handleReviewLeave} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleTabContent.tsx | 205 | onCheckIn | {handleCheckIn} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleTabContent.tsx | 206 | onCheckOut | {handleCheckOut} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleView.tsx | 146 | onOpenCreateTeam | {() => setIsCreateTeamModalOpen(true)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleView.tsx | 147 | onOpenInviteModal | {() => {           setGeneratedInvite(null);           setIsInviteModalOpen(true);         }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleView.tsx | 151 | onCheckIn | {handleCheckIn} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleView.tsx | 152 | onCheckOut | {handleCheckOut} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleView.tsx | 153 | onOpenRequestLeave | {() => setIsRequestLeaveModalOpen(true)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleView.tsx | 174 | onOpenInviteModal | {() => {           setGeneratedInvite(null);           setIsInviteModalOpen(true);         }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleView.tsx | 187 | onOpenCreateTeam | {() => setIsCreateTeamModalOpen(true)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/PeopleViewHeader.tsx | 32 | onClick | {onOpenCreateTeam} | permissions?.teams?.manageTeams |
| src/components/people/PeopleViewHeader.tsx | 41 | onClick | {onOpenInviteModal} | permissions?.teams?.inviteMembers |
| src/components/people/PeopleViewHeader.tsx | 51 | onClick | {onCheckOut} | isCheckedIn |
| src/components/people/PeopleViewHeader.tsx | 59 | onClick | {onCheckIn} | isCheckedIn |
| src/components/people/PeopleViewHeader.tsx | 68 | onClick | {onOpenRequestLeave} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/RemoveMemberConfirmModal.tsx | 67 | onClick | {() => {               setMemberToRemove(null);               setRemoveConfirmName('');             }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/RemoveMemberConfirmModal.tsx | 79 | onSubmit | {handleSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/RemoveMemberConfirmModal.tsx | 99 | onChange | {(e) => setRemoveConfirmName(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/RemoveMemberConfirmModal.tsx | 109 | onClick | {() => {                 setMemberToRemove(null);                 setRemoveConfirmName('');             }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/TransferDepartmentModal.tsx | 37 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/TransferDepartmentModal.tsx | 48 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/TransferDepartmentModal.tsx | 53 | onSubmit | {onSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/TransferDepartmentModal.tsx | 59 | onChange | {(e) => {                   const found = profiles.find((p) => (p.userId \|\| p.id) === e.target.value \|\| p.user?.id === e.target.value);                   setTargetReassignUser(found \|\| null);                 }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/TransferDepartmentModal.tsx | 83 | onChange | {(e) => setSelectedNewDeptId(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/people/TransferDepartmentModal.tsx | 98 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/portal/ClientPortalView.tsx | 93 | onAction | {() => {}} | approvals.length === 0 |
| src/components/portal/ClientPortalView.tsx | 96 | onSecondaryAction | {() => window.open('https://docs.workspace-os.com/client-portal', '_blank')} | approvals.length === 0 |
| src/components/portal/ClientPortalView.tsx | 168 | onChange | {(e) => setFeedbackInput(e.target.value)} | selectedApprovalId === approval.id && approval.status === 'pending' && approvals.length === 0 |
| src/components/portal/ClientPortalView.tsx | 172 | onClick | {() => handleApprove(approval.id)} | selectedApprovalId === approval.id && approval.status === 'pending' && approvals.length === 0 |
| src/components/portal/ClientPortalView.tsx | 178 | onClick | {() => handleRequestChanges(approval.id)} | selectedApprovalId === approval.id && approval.status === 'pending' && approvals.length === 0 |
| src/components/portal/ClientPortalView.tsx | 186 | onClick | {() => setSelectedApprovalId(approval.id)} | selectedApprovalId === approval.id && approval.status === 'pending' && approvals.length === 0 |
| src/components/projects/CreateProjectModal.tsx | 59 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/CreateProjectModal.tsx | 71 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/CreateProjectModal.tsx | 76 | onSubmit | {onSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/CreateProjectModal.tsx | 84 | onChange | {(e) => setTitle(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/CreateProjectModal.tsx | 96 | onChange | {(e) => setDescription(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/CreateProjectModal.tsx | 108 | onChange | {(e) => setDueDate(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/CreateProjectModal.tsx | 118 | onChange | {(e) => setBudget(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/CreateProjectModal.tsx | 137 | onClick | {() => setSelectedDepartmentId(isSelected ? '' : dept.id)} | departments.length > 0 |
| src/components/projects/CreateProjectModal.tsx | 162 | onClick | {() => toggleMemberSelection(targetUserId)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/CreateProjectModal.tsx | 182 | onChange | {(e) => setTagsInput(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/CreateProjectModal.tsx | 190 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectBoardView.tsx | 83 | onClick | {() => onDeleteProject(project.id)} | permissions.projects.delete |
| src/components/projects/ProjectBoardView.tsx | 94 | onClick | {() => onSelectProject(project)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectBoardView.tsx | 136 | onClick | {(e) => onStartWork(project.id, e)} | project.status === 'planning' && (isLead \|\| currentRole === 'admin') |
| src/components/projects/ProjectBoardView.tsx | 147 | onClick | {(e) => onOpenProgressModal(project, e)} | project.status === 'in_progress' && (isAssigned \|\| isLead \|\| currentRole === 'admin') |
| src/components/projects/ProjectBoardView.tsx | 154 | onClick | {(e) => onOpenSubmitReviewModal(project, e)} | project.status === 'in_progress' && (isAssigned \|\| isLead \|\| currentRole === 'admin') |
| src/components/projects/ProjectBoardView.tsx | 168 | onClick | {(e) => onApprove(project.id, e)} | isLead \|\| currentRole === 'admin' && project.status === 'review' |
| src/components/projects/ProjectBoardView.tsx | 175 | onClick | {(e) => onOpenChangesModal(project, e)} | isLead \|\| currentRole === 'admin' && project.status === 'review' |
| src/components/projects/ProjectDetailModal.tsx | 96 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectDetailModal.tsx | 106 | onClick | {() => setProjectModalTab('overview')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectDetailModal.tsx | 117 | onClick | {() => setProjectModalTab('tasks')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectDetailModal.tsx | 128 | onClick | {() => setProjectModalTab('timeline')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectDetailModal.tsx | 139 | onClick | {() => setProjectModalTab('team')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectDetailModal.tsx | 313 | onClick | {() => {                     onStartWork(selectedProjectModal.id);                     onClose();                   }} | selectedProjectModal.status === 'planning' && (isTeamLeadForProject(selectedProjectModal) \|\| currentRole === 'admin') |
| src/components/projects/ProjectDetailModal.tsx | 326 | onClick | {() => onOpenProgressModal(selectedProjectModal)} | selectedProjectModal.status === 'in_progress' && (isAssignedToProject(selectedProjectModal) \|\| isTeamLeadForProject(selectedProjectModal) \|\| currentRole === 'ad |
| src/components/projects/ProjectDetailModal.tsx | 333 | onClick | {() => onOpenSubmitReviewModal(selectedProjectModal)} | selectedProjectModal.status === 'in_progress' && (isAssignedToProject(selectedProjectModal) \|\| isTeamLeadForProject(selectedProjectModal) \|\| currentRole === 'ad |
| src/components/projects/ProjectDetailModal.tsx | 344 | onClick | {() => {                       onApprove(selectedProjectModal.id);                       onClose();                     }} | selectedProjectModal.status === 'review' && (isTeamLeadForProject(selectedProjectModal) \|\| currentRole === 'admin') |
| src/components/projects/ProjectDetailModal.tsx | 354 | onClick | {() => onOpenChangesModal(selectedProjectModal)} | selectedProjectModal.status === 'review' && (isTeamLeadForProject(selectedProjectModal) \|\| currentRole === 'admin') |
| src/components/projects/ProjectDetailModal.tsx | 365 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectsView.tsx | 184 | onOpenCreateModal | {() => setIsCreateModalOpen(true)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectsView.tsx | 193 | onAction | {() => setIsCreateModalOpen(true)} | visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 206 | onSelectProject | {handleSelectProject} | viewMode === 'board' && visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 207 | onDeleteProject | {deleteProject} | viewMode === 'board' && visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 208 | onStartWork | {(id, e) => { if (e) e.stopPropagation(); startProject(id); }} | viewMode === 'board' && visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 209 | onOpenProgressModal | {handleOpenProgressModal} | viewMode === 'board' && visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 210 | onOpenSubmitReviewModal | {handleOpenSubmitReviewModal} | viewMode === 'board' && visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 211 | onApprove | {(id, e) => { if (e) e.stopPropagation(); approveProjectReview(id); }} | viewMode === 'board' && visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 212 | onOpenChangesModal | {handleOpenChangesModal} | viewMode === 'board' && visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 224 | onSelectProject | {handleSelectProject} | viewMode === 'list' && viewMode === 'board' && visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 225 | onDeleteProject | {deleteProject} | viewMode === 'list' && viewMode === 'board' && visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 226 | onStartWork | {(id, e) => { if (e) e.stopPropagation(); startProject(id); }} | viewMode === 'list' && viewMode === 'board' && visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 227 | onOpenProgressModal | {handleOpenProgressModal} | viewMode === 'list' && viewMode === 'board' && visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 228 | onApprove | {(id, e) => { if (e) e.stopPropagation(); approveProjectReview(id); }} | viewMode === 'list' && viewMode === 'board' && visibleProjects.length === 0 |
| src/components/projects/ProjectsView.tsx | 236 | onClose | {() => setIsCreateModalOpen(false)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectsView.tsx | 237 | onSubmit | {handleCreateSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectsView.tsx | 263 | onSaveProgress | {handleSaveProgress} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectsView.tsx | 266 | onConfirmSubmitReview | {handleConfirmSubmitReview} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectsView.tsx | 271 | onSaveRequestChanges | {handleSaveRequestChanges} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectsView.tsx | 276 | onClose | {() => handleSelectProject(null)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectsView.tsx | 284 | onStartWork | {(id) => startProject(id)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectsView.tsx | 285 | onOpenProgressModal | {handleOpenProgressModal} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectsView.tsx | 286 | onOpenSubmitReviewModal | {handleOpenSubmitReviewModal} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectsView.tsx | 287 | onApprove | {(id) => approveProjectReview(id)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectsView.tsx | 288 | onOpenChangesModal | {handleOpenChangesModal} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectsViewHeader.tsx | 45 | onClick | {() => setViewMode('board')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectsViewHeader.tsx | 56 | onClick | {() => setViewMode('list')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectsViewHeader.tsx | 67 | onClick | {() => setViewMode('timeline')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectsViewHeader.tsx | 81 | onChange | {(e) => setSelectedStatus(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectsViewHeader.tsx | 93 | onClick | {onOpenCreateModal} | permissions?.projects?.create |
| src/components/projects/ProjectTableAndTimeline.tsx | 66 | onClick | {() => onSelectProject(project)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectTableAndTimeline.tsx | 110 | onClick | {(e) => e.stopPropagation()} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/projects/ProjectTableAndTimeline.tsx | 114 | onClick | {(e) => onStartWork(project.id, e)} | project.status === 'planning' && (isLead \|\| currentRole === 'admin') |
| src/components/projects/ProjectTableAndTimeline.tsx | 122 | onClick | {(e) => onOpenProgressModal(project, e)} | project.status === 'in_progress' && (isAssigned \|\| isLead \|\| currentRole === 'admin') |
| src/components/projects/ProjectTableAndTimeline.tsx | 130 | onClick | {(e) => onApprove(project.id, e)} | project.status === 'review' && (isLead \|\| currentRole === 'admin') |
| src/components/projects/ProjectTableAndTimeline.tsx | 138 | onClick | {() => onDeleteProject(project.id)} | permissions.projects.delete |
| src/components/projects/ProjectWorkflowModals.tsx | 52 | onClick | {() => setProgressModalProject(null)} | progressModalProject |
| src/components/projects/ProjectWorkflowModals.tsx | 67 | onClick | {() => setProgressModalProject(null)} | progressModalProject |
| src/components/projects/ProjectWorkflowModals.tsx | 91 | onChange | {(e) => setProgressValue(Number(e.target.value))} | progressModalProject |
| src/components/projects/ProjectWorkflowModals.tsx | 109 | onChange | {(e) => setProgressNote(e.target.value)} | progressModalProject |
| src/components/projects/ProjectWorkflowModals.tsx | 117 | onClick | {() => setProgressModalProject(null)} | progressModalProject |
| src/components/projects/ProjectWorkflowModals.tsx | 123 | onClick | {onSaveProgress} | progressModalProject |
| src/components/projects/ProjectWorkflowModals.tsx | 140 | onClick | {() => setSubmitReviewModalProject(null)} | submitReviewModalProject |
| src/components/projects/ProjectWorkflowModals.tsx | 155 | onClick | {() => setSubmitReviewModalProject(null)} | submitReviewModalProject |
| src/components/projects/ProjectWorkflowModals.tsx | 169 | onClick | {() => setSubmitReviewModalProject(null)} | submitReviewModalProject |
| src/components/projects/ProjectWorkflowModals.tsx | 175 | onClick | {onConfirmSubmitReview} | submitReviewModalProject |
| src/components/projects/ProjectWorkflowModals.tsx | 192 | onClick | {() => setChangesModalProject(null)} | changesModalProject |
| src/components/projects/ProjectWorkflowModals.tsx | 207 | onClick | {() => setChangesModalProject(null)} | changesModalProject |
| src/components/projects/ProjectWorkflowModals.tsx | 227 | onChange | {(e) => setReviewFeedback(e.target.value)} | changesModalProject |
| src/components/projects/ProjectWorkflowModals.tsx | 235 | onClick | {() => setChangesModalProject(null)} | changesModalProject |
| src/components/projects/ProjectWorkflowModals.tsx | 241 | onClick | {onSaveRequestChanges} | changesModalProject |
| src/components/settings/ApiKeysTab.tsx | 161 | onClick | {() => setRotatingSecretId(secret.id)} | !isPendingRotation |
| src/components/settings/ApiKeysTab.tsx | 171 | onClick | {() => onRotateSecret(secret.id)} | disabled={isRotating} && !isPendingRotation |
| src/components/settings/ApiKeysTab.tsx | 180 | onClick | {() => setRotatingSecretId(null)} | !isPendingRotation |
| src/components/settings/LabsTab.tsx | 28 | onClick | {() => onNavigate('automations')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/settings/LabsTab.tsx | 45 | onClick | {() => onNavigate('time')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/settings/LabsTab.tsx | 62 | onClick | {() => onNavigate('analytics')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/settings/LabsTab.tsx | 79 | onClick | {() => onNavigate('portal')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/settings/LabsTab.tsx | 96 | onClick | {() => onNavigate('integrations')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/settings/NotificationsTab.tsx | 56 | onClick | {onSaveNotificationPrefs} | disabled={isPrefsSaving} |
| src/components/settings/NotificationsTab.tsx | 87 | onChange | {(e) => setNotificationPrefs(p => ({ ...p, peopleEmployeeInvites: e.target.checked }))} | isPrefsLoading |
| src/components/settings/NotificationsTab.tsx | 99 | onChange | {(e) => setNotificationPrefs(p => ({ ...p, peopleEmployeeJoined: e.target.checked }))} | isPrefsLoading |
| src/components/settings/NotificationsTab.tsx | 111 | onChange | {(e) => setNotificationPrefs(p => ({ ...p, peopleLeaveRequests: e.target.checked }))} | isPrefsLoading |
| src/components/settings/NotificationsTab.tsx | 133 | onChange | {(e) => setNotificationPrefs(p => ({ ...p, projectsInitiativeUpdates: e.target.checked }))} | isPrefsLoading |
| src/components/settings/NotificationsTab.tsx | 145 | onChange | {(e) => setNotificationPrefs(p => ({ ...p, projectsReviewRequests: e.target.checked }))} | isPrefsLoading |
| src/components/settings/NotificationsTab.tsx | 157 | onChange | {(e) => setNotificationPrefs(p => ({ ...p, projectsAssignments: e.target.checked }))} | isPrefsLoading |
| src/components/settings/NotificationsTab.tsx | 179 | onChange | {(e) => setNotificationPrefs(p => ({ ...p, tasksAssignments: e.target.checked }))} | isPrefsLoading |
| src/components/settings/NotificationsTab.tsx | 191 | onChange | {(e) => setNotificationPrefs(p => ({ ...p, tasksCompletions: e.target.checked }))} | isPrefsLoading |
| src/components/settings/NotificationsTab.tsx | 203 | onChange | {(e) => setNotificationPrefs(p => ({ ...p, tasksOverdueAlerts: e.target.checked }))} | isPrefsLoading |
| src/components/settings/NotificationsTab.tsx | 225 | onChange | {(e) => setNotificationPrefs(p => ({ ...p, crmLeadAssignment: e.target.checked }))} | isPrefsLoading |
| src/components/settings/NotificationsTab.tsx | 237 | onChange | {(e) => setNotificationPrefs(p => ({ ...p, crmDealUpdates: e.target.checked }))} | isPrefsLoading |
| src/components/settings/NotificationsTab.tsx | 249 | onChange | {(e) => setNotificationPrefs(p => ({ ...p, mentions: e.target.checked }))} | isPrefsLoading |
| src/components/settings/ProfileAndSecurityTabs.tsx | 36 | onChange | {(e) => setName(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/settings/ProfileAndSecurityTabs.tsx | 49 | onChange | {(e) => setSlug(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/settings/ProfileAndSecurityTabs.tsx | 106 | onChange | {(e) => setEnforceTwoFactor(e.target.checked)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/settings/ProfileAndSecurityTabs.tsx | 121 | onChange | {(e) => setAllowPublicInvites(e.target.checked)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/settings/ProfileAndSecurityTabs.tsx | 138 | onChange | {(e) => setSessionTimeout(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/settings/SettingsTabBar.tsx | 40 | onClick | {() => setActiveTab(tab.id)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/settings/SettingsView.tsx | 201 | onNavigate | {setGlobalActiveTab} | activeTab === 'labs' |
| src/components/settings/SettingsView.tsx | 204 | onSubmit | {handleSave} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/settings/SettingsView.tsx | 235 | onUpdateProfile | {handleUpdateProfile} | activeTab === 'team_billing' |
| src/components/settings/SettingsView.tsx | 245 | onRotateSecret | {handleRotateSecret} | activeTab === 'api' |
| src/components/settings/SettingsView.tsx | 255 | onSaveNotificationPrefs | {handleSaveNotificationPrefs} | activeTab === 'notifications' |
| src/components/settings/TeamBillingTab.tsx | 88 | onChange | {(e) => {                           const val = Number(e.target.value);                           setBillingProfiles((prev) =>                             prev.map((p) => (p.userId === item.userId ? { ...p, costRate: val } : p))             | billingProfiles.length === 0 && isProfilesLoading |
| src/components/settings/TeamBillingTab.tsx | 106 | onChange | {(e) => {                           const val = Number(e.target.value);                           setBillingProfiles((prev) =>                             prev.map((p) => (p.userId === item.userId ? { ...p, billableRate: val } : p))         | billingProfiles.length === 0 && isProfilesLoading |
| src/components/settings/TeamBillingTab.tsx | 123 | onChange | {(e) => {                           const val = Number(e.target.value);                           setBillingProfiles((prev) =>                             prev.map((p) => (p.userId === item.userId ? { ...p, utilizationTarget: val } : p))    | billingProfiles.length === 0 && isProfilesLoading |
| src/components/settings/TeamBillingTab.tsx | 137 | onClick | {() => onUpdateProfile(item)} | disabled={savingUserId === item.userId} && billingProfiles.length === 0 && isProfilesLoading |
| src/components/tasks/CreateTaskModal.tsx | 68 | onClick | {onClose} | isOpen |
| src/components/tasks/CreateTaskModal.tsx | 80 | onClick | {onClose} | isOpen |
| src/components/tasks/CreateTaskModal.tsx | 85 | onSubmit | {onSubmit} | isOpen |
| src/components/tasks/CreateTaskModal.tsx | 93 | onChange | {(e) => setTitle(e.target.value)} | isOpen |
| src/components/tasks/CreateTaskModal.tsx | 105 | onChange | {(e) => setDescription(e.target.value)} | isOpen |
| src/components/tasks/CreateTaskModal.tsx | 115 | onChange | {(e) => setPriority(e.target.value as TaskPriority)} | isOpen |
| src/components/tasks/CreateTaskModal.tsx | 131 | onChange | {(e) => setProjectId(e.target.value)} | isOpen |
| src/components/tasks/CreateTaskModal.tsx | 151 | onChange | {(e) => {                         const newAssignee = e.target.value;                         setAssignedTo(newAssignee);                         const targetUser = users.find((u) => u.id === newAssignee);                         if (target | canAssign && isOpen |
| src/components/tasks/CreateTaskModal.tsx | 174 | onChange | {(e) => setDueDate(e.target.value)} | isOpen |
| src/components/tasks/CreateTaskModal.tsx | 188 | onChange | {(e) => setStoryPoints(parseInt(e.target.value) \|\| 1)} | isOpen |
| src/components/tasks/CreateTaskModal.tsx | 199 | onChange | {(e) => setEstimatedHours(parseInt(e.target.value) \|\| 1)} | isOpen |
| src/components/tasks/CreateTaskModal.tsx | 208 | onClick | {onClose} | isOpen |
| src/components/tasks/TaskDetailDrawer.tsx | 66 | onClick | {onClose} | selectedTask |
| src/components/tasks/TaskDetailDrawer.tsx | 90 | onClick | {onClose} | selectedTask |
| src/components/tasks/TaskDetailDrawer.tsx | 100 | onClick | {() => setDrawerTab('details')} | selectedTask |
| src/components/tasks/TaskDetailDrawer.tsx | 110 | onClick | {() => setDrawerTab('activity')} | selectedTask |
| src/components/tasks/TaskDetailDrawer.tsx | 121 | onClick | {() => setDrawerTab('comments')} | selectedTask |
| src/components/tasks/TaskDetailDrawer.tsx | 182 | onClick | {() => onUnblockTask(selectedTask.id)} | selectedTask.is_blocked \|\| (selectedTask as any).isBlocked && drawerTab === 'details' && selectedTask |
| src/components/tasks/TaskDetailDrawer.tsx | 191 | onClick | {onOpenBlockModal} | selectedTask.is_blocked \|\| (selectedTask as any).isBlocked && drawerTab === 'details' && selectedTask |
| src/components/tasks/TaskDetailDrawer.tsx | 206 | onClick | {() => onStartTask(selectedTask.id)} | disabled={actionLoading} && selectedTask.status === 'todo' && drawerTab === 'details' && selectedTask |
| src/components/tasks/TaskDetailDrawer.tsx | 217 | onClick | {() => onSubmitReview(selectedTask.id)} | disabled={actionLoading} && selectedTask.status === 'in_progress' && drawerTab === 'details' && selectedTask |
| src/components/tasks/TaskDetailDrawer.tsx | 229 | onClick | {() => onApproveTask(selectedTask.id)} | disabled={actionLoading} && selectedTask.status === 'review' && currentRole !== 'intern' && drawerTab === 'details' && selectedTask |
| src/components/tasks/TaskDetailDrawer.tsx | 237 | onClick | {onOpenReviewFeedbackModal} | disabled={actionLoading} && selectedTask.status === 'review' && currentRole !== 'intern' && drawerTab === 'details' && selectedTask |
| src/components/tasks/TaskDetailDrawer.tsx | 316 | onSubmit | {onSendComment} | drawerTab === 'comments' && selectedTask |
| src/components/tasks/TaskDetailDrawer.tsx | 321 | onChange | {(e) => setCommentInput(e.target.value)} | drawerTab === 'comments' && selectedTask |
| src/components/tasks/TaskKanbanBoard.tsx | 80 | onClick | {() => onSelectTask(task)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TaskKanbanBoard.tsx | 99 | onClick | {(e) => {                             e.stopPropagation();                             onDeleteTask(task.id);                           }} | canDelete |
| src/components/tasks/TaskKanbanBoard.tsx | 148 | onClick | {(e) => e.stopPropagation()} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TaskKanbanBoard.tsx | 153 | onClick | {() => onStartTask(task.id)} | column.id === 'todo' |
| src/components/tasks/TaskKanbanBoard.tsx | 163 | onClick | {() => onSubmitReview(task.id)} | column.id === 'in_progress' |
| src/components/tasks/TaskKanbanBoard.tsx | 174 | onClick | {() => onOpenReviewFeedbackModal(task)} | column.id === 'review' && currentRole !== 'intern' |
| src/components/tasks/TaskKanbanBoard.tsx | 181 | onClick | {() => onApproveTask(task.id)} | column.id === 'review' && currentRole !== 'intern' |
| src/components/tasks/TaskListView.tsx | 54 | onClick | {() => onSelectTask(task)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TaskListView.tsx | 100 | onClick | {(e) => e.stopPropagation()} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TaskListView.tsx | 103 | onClick | {() => onStartTask(task.id)} | status === 'todo' |
| src/components/tasks/TaskListView.tsx | 111 | onClick | {() => onSubmitReview(task.id)} | status === 'in_progress' |
| src/components/tasks/TaskListView.tsx | 119 | onClick | {() => onApproveTask(task.id)} | status === 'review' && currentRole !== 'intern' |
| src/components/tasks/TaskListView.tsx | 127 | onClick | {() => onDeleteTask(task.id)} | canDelete |
| src/components/tasks/TasksModalsContainer.tsx | 136 | onClose | {onCloseDrawer} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksModalsContainer.tsx | 150 | onSendComment | {onSendComment} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksModalsContainer.tsx | 151 | onStartTask | {onStartTask} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksModalsContainer.tsx | 152 | onSubmitReview | {onSubmitReview} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksModalsContainer.tsx | 153 | onApproveTask | {onApproveTask} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksModalsContainer.tsx | 154 | onOpenReviewFeedbackModal | {onOpenReviewFeedbackModal} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksModalsContainer.tsx | 155 | onOpenBlockModal | {onOpenBlockModal} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksModalsContainer.tsx | 156 | onUnblockTask | {onUnblockTask} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksModalsContainer.tsx | 161 | onClose | {() => setBlockModalOpen(false)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksModalsContainer.tsx | 164 | onSubmit | {onBlockTask} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksModalsContainer.tsx | 170 | onClose | {() => setReviewFeedbackModalOpen(false)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksModalsContainer.tsx | 173 | onSubmit | {onRequestChanges} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksModalsContainer.tsx | 179 | onClose | {onCloseCreateModal} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksModalsContainer.tsx | 180 | onSubmit | {onCreateSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksView.tsx | 177 | onOpenCreateModal | {handleOpenCreateModal} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksView.tsx | 186 | onAction | {handleOpenCreateModal} | visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 194 | onSelectTask | {handleSelectTask} | viewMode === 'kanban' && visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 195 | onDeleteTask | {deleteTask} | viewMode === 'kanban' && visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 196 | onStartTask | {handleStartTask} | viewMode === 'kanban' && visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 197 | onSubmitReview | {handleSubmitReview} | viewMode === 'kanban' && visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 198 | onApproveTask | {handleApproveTask} | viewMode === 'kanban' && visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 199 | onOpenReviewFeedbackModal | {(task) => {             setSelectedTask(task);             setReviewFeedbackModalOpen(true);           }} | viewMode === 'kanban' && visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 211 | onSelectTask | {handleSelectTask} | viewMode === 'kanban' && visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 212 | onDeleteTask | {deleteTask} | viewMode === 'kanban' && visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 213 | onStartTask | {handleStartTask} | viewMode === 'kanban' && visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 214 | onSubmitReview | {handleSubmitReview} | viewMode === 'kanban' && visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 215 | onApproveTask | {handleApproveTask} | viewMode === 'kanban' && visibleTasks.length === 0 |
| src/components/tasks/TasksView.tsx | 224 | onCloseDrawer | {() => handleSelectTask(null)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksView.tsx | 238 | onSendComment | {handleSendComment} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksView.tsx | 239 | onStartTask | {handleStartTask} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksView.tsx | 240 | onSubmitReview | {handleSubmitReview} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksView.tsx | 241 | onApproveTask | {handleApproveTask} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksView.tsx | 242 | onOpenReviewFeedbackModal | {() => setReviewFeedbackModalOpen(true)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksView.tsx | 243 | onOpenBlockModal | {() => setBlockModalOpen(true)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksView.tsx | 244 | onUnblockTask | {handleUnblockTask} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksView.tsx | 249 | onBlockTask | {handleBlockTask} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksView.tsx | 254 | onRequestChanges | {handleRequestChanges} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksView.tsx | 256 | onCloseCreateModal | {handleCloseCreateModal} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksView.tsx | 257 | onCreateSubmit | {handleCreateSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksViewHeader.tsx | 45 | onClick | {() => setViewMode('kanban')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksViewHeader.tsx | 56 | onClick | {() => setViewMode('list')} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksViewHeader.tsx | 71 | onChange | {(e) => setFilterProject(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksViewHeader.tsx | 83 | onChange | {(e) => setFilterPriority(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/tasks/TasksViewHeader.tsx | 97 | onClick | {onOpenCreateModal} | canCreate |
| src/components/tasks/TaskWorkflowModals.tsx | 30 | onClick | {onClose} | isOpen |
| src/components/tasks/TaskWorkflowModals.tsx | 50 | onChange | {(e) => setBlockReason(e.target.value)} | isOpen |
| src/components/tasks/TaskWorkflowModals.tsx | 57 | onClick | {onClose} | isOpen |
| src/components/tasks/TaskWorkflowModals.tsx | 64 | onClick | {onSubmit} | disabled={!blockReason.trim() \|\| loading} && isOpen |
| src/components/tasks/TaskWorkflowModals.tsx | 103 | onClick | {onClose} | isOpen |
| src/components/tasks/TaskWorkflowModals.tsx | 123 | onChange | {(e) => setReviewFeedback(e.target.value)} | isOpen |
| src/components/tasks/TaskWorkflowModals.tsx | 130 | onClick | {onClose} | isOpen |
| src/components/tasks/TaskWorkflowModals.tsx | 137 | onClick | {onSubmit} | disabled={!reviewFeedback.trim() \|\| loading} && isOpen |
| src/components/teams/DepartmentCardsGrid.tsx | 45 | onAction | {onOpenCreateTeam} | visibleTeams.length === 0 |
| src/components/teams/DepartmentCardsGrid.tsx | 47 | onSecondaryAction | {onOpenInviteModal} | visibleTeams.length === 0 |
| src/components/teams/DepartmentCardsGrid.tsx | 61 | onClick | {() => onSelectTeam(team)} | visibleTeams.length === 0 |
| src/components/teams/PendingInvitesSection.tsx | 43 | onClick | {() => onCopyLink(inv.token)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamActionModals.tsx | 48 | onClick | {onClose} | isOpen |
| src/components/teams/TeamActionModals.tsx | 59 | onClick | {onClose} | isOpen |
| src/components/teams/TeamActionModals.tsx | 84 | onClick | {() => onCopyLink(generatedInvite.token)} | generatedInvite && isOpen |
| src/components/teams/TeamActionModals.tsx | 95 | onClick | {onClose} | generatedInvite && isOpen |
| src/components/teams/TeamActionModals.tsx | 103 | onSubmit | {onSubmit} | generatedInvite && isOpen |
| src/components/teams/TeamActionModals.tsx | 111 | onChange | {(e) => setInviteEmail(e.target.value)} | generatedInvite && isOpen |
| src/components/teams/TeamActionModals.tsx | 120 | onChange | {(e) => setInviteRole(e.target.value as UserRole)} | generatedInvite && isOpen |
| src/components/teams/TeamActionModals.tsx | 133 | onChange | {(e) => setInviteTeamId(e.target.value)} | generatedInvite && isOpen |
| src/components/teams/TeamActionModals.tsx | 145 | onClick | {onClose} | generatedInvite && isOpen |
| src/components/teams/TeamActionModals.tsx | 204 | onClick | {onClose} | isOpen |
| src/components/teams/TeamActionModals.tsx | 215 | onClick | {onClose} | isOpen |
| src/components/teams/TeamActionModals.tsx | 220 | onSubmit | {onSubmit} | isOpen |
| src/components/teams/TeamActionModals.tsx | 228 | onChange | {(e) => setTeamName(e.target.value)} | isOpen |
| src/components/teams/TeamActionModals.tsx | 240 | onChange | {(e) => setTeamDescription(e.target.value)} | isOpen |
| src/components/teams/TeamActionModals.tsx | 251 | onChange | {(e) => setTeamColor(e.target.value)} | isOpen |
| src/components/teams/TeamActionModals.tsx | 259 | onChange | {(e) => setTeamLeadId(e.target.value)} | isOpen |
| src/components/teams/TeamActionModals.tsx | 272 | onClick | {onClose} | isOpen |
| src/components/teams/TeamDetailsModal.tsx | 42 | onClick | {onClose} | team |
| src/components/teams/TeamDetailsModal.tsx | 71 | onClick | {onClose} | team |
| src/components/teams/TeamDetailsModal.tsx | 103 | onClick | {onOpenChangeLead} | canManageTeams && team |
| src/components/teams/TeamDetailsModal.tsx | 124 | onClick | {onOpenAddMembers} | canManageTeams && team |
| src/components/teams/TeamDetailsModal.tsx | 141 | onAction | {onOpenAddMembers} | getTeamMembers(team).length === 0 && team |
| src/components/teams/TeamDetailsModal.tsx | 172 | onClick | {() => onOpenMoveMember(member)} | teams.length > 1 && canManageTeams && getTeamMembers(team).length === 0 && team |
| src/components/teams/TeamDetailsModal.tsx | 182 | onClick | {() => onRemoveMember(member.id, member.name)} | canManageTeams && getTeamMembers(team).length === 0 && team |
| src/components/teams/TeamDetailsModal.tsx | 200 | onClick | {onClose} | team |
| src/components/teams/TeamMemberModals.tsx | 53 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamMemberModals.tsx | 67 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamMemberModals.tsx | 78 | onChange | {(e) => setMemberSearchQuery(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamMemberModals.tsx | 83 | onSubmit | {onSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamMemberModals.tsx | 99 | onClick | {() => {                         setSelectedUserIdsToAdd((prev) =>                           isSelected ? prev.filter((id) => id !== u.id) : [...prev, u.id]                         );                       }} | eligible.length === 0 |
| src/components/teams/TeamMemberModals.tsx | 143 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamMemberModals.tsx | 198 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamMemberModals.tsx | 209 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamMemberModals.tsx | 225 | onSubmit | {onSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamMemberModals.tsx | 230 | onChange | {(e) => setTargetMoveTeamId(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamMemberModals.tsx | 250 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamMemberModals.tsx | 300 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamMemberModals.tsx | 314 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamMemberModals.tsx | 319 | onSubmit | {onSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamMemberModals.tsx | 324 | onChange | {(e) => setSelectedNewLeadId(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamMemberModals.tsx | 342 | onClick | {onClose} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsModalsContainer.tsx | 120 | onClose | {onCloseSelectedTeam} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsModalsContainer.tsx | 125 | onOpenAddMembers | {() => {           setSelectedUserIdsToAdd([]);           setIsAddMembersModalOpen(true);         }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsModalsContainer.tsx | 129 | onOpenChangeLead | {() => {           setSelectedNewLeadId(activeSelectedTeam?.lead_id \|\| '');           setIsChangeLeadModalOpen(true);         }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsModalsContainer.tsx | 133 | onOpenMoveMember | {(member) => {           setMemberToMove(member);           const otherTeams = teams.filter((t) => t.id !== activeSelectedTeam?.id);           setTargetMoveTeamId(otherTeams[0]?.id \|\| '');           setIsMoveMemberModalOpen(true);         } | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsModalsContainer.tsx | 139 | onRemoveMember | {onRemoveMember} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsModalsContainer.tsx | 144 | onClose | {() => setIsAddMembersModalOpen(false)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsModalsContainer.tsx | 152 | onSubmit | {onAddMembersSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsModalsContainer.tsx | 158 | onClose | {() => setIsMoveMemberModalOpen(false)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsModalsContainer.tsx | 164 | onSubmit | {onMoveMemberSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsModalsContainer.tsx | 171 | onClose | {() => setIsChangeLeadModalOpen(false)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsModalsContainer.tsx | 176 | onSubmit | {onChangeLeadSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsModalsContainer.tsx | 182 | onClose | {() => {           setIsInviteModalOpen(false);           setGeneratedInvite(null);         }} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsModalsContainer.tsx | 186 | onSubmit | {onInviteSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsModalsContainer.tsx | 195 | onCopyLink | {onCopyLink} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsModalsContainer.tsx | 202 | onClose | {() => setIsCreateTeamModalOpen(false)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsModalsContainer.tsx | 203 | onSubmit | {onCreateTeamSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsView.tsx | 192 | onClick | {() => setIsCreateTeamModalOpen(true)} | permissions.teams.inviteMembers |
| src/components/teams/TeamsView.tsx | 199 | onClick | {() => {                   setGeneratedInvite(null);                   setIsInviteModalOpen(true);                 }} | permissions.teams.inviteMembers |
| src/components/teams/TeamsView.tsx | 228 | onSelectTeam | {setSelectedTeam} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsView.tsx | 229 | onOpenCreateTeam | {() => setIsCreateTeamModalOpen(true)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsView.tsx | 230 | onOpenInviteModal | {() => setIsInviteModalOpen(true)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsView.tsx | 235 | onCopyLink | {handleCopyLink} | currentRole === 'admin' |
| src/components/teams/TeamsView.tsx | 244 | onCloseSelectedTeam | {() => setSelectedTeam(null)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsView.tsx | 256 | onRemoveMember | {handleRemoveMember} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsView.tsx | 261 | onAddMembersSubmit | {handleAddMembersSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsView.tsx | 266 | onMoveMemberSubmit | {handleMoveMemberSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsView.tsx | 269 | onChangeLeadSubmit | {handleChangeLeadSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsView.tsx | 273 | onInviteSubmit | {handleInviteSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsView.tsx | 282 | onCopyLink | {handleCopyLink} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/teams/TeamsView.tsx | 286 | onCreateTeamSubmit | {handleCreateTeamSubmit} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/time/TimeTrackingView.tsx | 203 | onChange | {(e) => setActiveTaskTitle(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/time/TimeTrackingView.tsx | 212 | onChange | {(e) => setIsBillable(e.target.checked)} | isAdmin |
| src/components/time/TimeTrackingView.tsx | 227 | onClick | {() => setIsTimerRunning(false)} | isTimerRunning |
| src/components/time/TimeTrackingView.tsx | 235 | onClick | {handleStartTimer} | isTimerRunning |
| src/components/time/TimeTrackingView.tsx | 244 | onClick | {handleStopTimer} | disabled={elapsedSeconds === 0 && !isTimerRunning} |
| src/components/time/TimeTrackingView.tsx | 443 | onAction | {() => setIsTimerRunning(true)} | entries.length === 0 |
| src/components/time/TimeTrackingView.tsx | 446 | onSecondaryAction | {() => window.open('https://docs.workspace-os.com/time-tracking', '_blank')} | entries.length === 0 |
| src/components/time/TimeTrackingView.tsx | 494 | onClick | {() => handleDeleteEntry(entry.id)} | (currentRole === 'admin' \|\| entry.userId === currentUser.id) && entries.length === 0 |
| src/components/ui/EmptyState.tsx | 88 | onClick | {onAction} | actionLabel && onAction && (actionLabel \|\| secondaryLabel) |
| src/components/ui/EmptyState.tsx | 94 | onClick | {onSecondaryAction} | secondaryLabel && onSecondaryAction && (actionLabel \|\| secondaryLabel) |
| src/components/ui/KPIWidget.tsx | 86 | onClick | {onClick} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/ui/PageHeader.tsx | 35 | onClick | {item.onClick} | item.onClick && breadcrumbs && breadcrumbs.length > 0 |
| src/components/ui/SectionCard.tsx | 35 | onClick | {onClick} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/wiki/WikiView.tsx | 339 | onClick | {() => openCreateModal(null)} | currentRole !== 'intern' && !embedded |
| src/components/wiki/WikiView.tsx | 357 | onClick | {() => openCreateModal(null)} | currentRole !== 'intern' |
| src/components/wiki/WikiView.tsx | 371 | onChange | {(e) => setSearchQuery(e.target.value)} | No enclosing JSX permission condition; inspect handler and parent view |
| src/components/wiki/WikiView.tsx | 383 | onClick | {() => openCreateModal(null)} | currentRole !== 'intern' && visiblePages.length === 0 |
| src/components/wiki/WikiView.tsx | 398 | onClick | {() => selectPage(page.id)} | visiblePages.length === 0 |
| src/components/wiki/WikiView.tsx | 419 | onClick | {() => openCreateModal(selectedPage.id)} | currentRole !== 'intern' && selectedPage |
| src/components/wiki/WikiView.tsx | 448 | onChange | {(e) => setEditTitle(e.target.value)} | isEditing && selectedPage && isLoading |
| src/components/wiki/WikiView.tsx | 466 | onClick | {handleSaveEdit} | isEditing && currentRole !== 'intern' && (currentRole === 'admin' \|\| selectedPage.createdBy === currentUser?.id \|\| (selectedPage as any).created_by === currentUser?.id) && selectedPage && isLoading |
| src/components/wiki/WikiView.tsx | 475 | onClick | {() => {                             setEditTitle(selectedPage.title);                             setEditContentText(                               selectedPage.contentJson.blocks?.find((b: any) => b.type === 'paragraph')?.text \|\| ''   | isEditing && currentRole !== 'intern' && (currentRole === 'admin' \|\| selectedPage.createdBy === currentUser?.id \|\| (selectedPage as any).created_by === currentUser?.id) && selectedPage && isLoading |
| src/components/wiki/WikiView.tsx | 488 | onClick | {() => handleDeletePage(selectedPage.id)} | isEditing && currentRole !== 'intern' && (currentRole === 'admin' \|\| selectedPage.createdBy === currentUser?.id \|\| (selectedPage as any).created_by === currentUser?.id) && selectedPage && isLoading |
| src/components/wiki/WikiView.tsx | 506 | onChange | {(e) => setEditContentText(e.target.value)} | isEditing && selectedPage && isLoading |
| src/components/wiki/WikiView.tsx | 561 | onSubmit | {handleAddComment} | comments.filter((c) => c.pageId === selectedPage.id).length > 0 && selectedPage && isLoading |
| src/components/wiki/WikiView.tsx | 566 | onChange | {(e) => setNewComment(e.target.value)} | comments.filter((c) => c.pageId === selectedPage.id).length > 0 && selectedPage && isLoading |
| src/components/wiki/WikiView.tsx | 593 | onAction | {() => openCreateModal(null)} | selectedPage && isLoading |
| src/components/wiki/WikiView.tsx | 595 | onSecondaryAction | {() => pages.length > 0 && selectPage(pages[0].id)} | selectedPage && isLoading |
| src/components/wiki/WikiView.tsx | 610 | onClick | {() => setIsCreateModalOpen(false)} | isCreateModalOpen |
| src/components/wiki/WikiView.tsx | 624 | onClick | {() => setIsCreateModalOpen(false)} | isCreateModalOpen |
| src/components/wiki/WikiView.tsx | 629 | onSubmit | {handleCreateSubmit} | isCreateModalOpen |
| src/components/wiki/WikiView.tsx | 637 | onChange | {(e) => setCreateTitle(e.target.value)} | isCreateModalOpen |
| src/components/wiki/WikiView.tsx | 646 | onChange | {(e) => setCreateVisibility(e.target.value)} | isCreateModalOpen |
| src/components/wiki/WikiView.tsx | 661 | onChange | {(e) => setCreateDepartmentId(e.target.value)} | createVisibility === 'department' && isCreateModalOpen |
| src/components/wiki/WikiView.tsx | 678 | onClick | {() => setIsCreateModalOpen(false)} | isCreateModalOpen |
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
