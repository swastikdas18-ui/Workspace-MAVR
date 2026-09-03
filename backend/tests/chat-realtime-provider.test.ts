/**
 * Suite 39: Chat Route Realtime Provider Regression Test
 *
 * Verifies that:
 * 1. Rendering components utilizing useRealtimeContext() outside RealtimeProvider throws:
 *    "useRealtimeContext must be used within a RealtimeProvider"
 * 2. When wrapped within RealtimeProvider (as mounted in App.tsx), useRealtimeContext
 *    resolves successfully without throwing.
 * 3. ChatView and chat-related hooks mount cleanly without crashing.
 */

import React from 'react';
import { renderToString } from 'react-dom/server';
import { RealtimeProvider, useRealtimeContext } from '../../src/lib/realtime/realtime-provider';
import { useRealtime } from '../../src/lib/realtime/useRealtime';
import { usePresence } from '../../src/lib/realtime/usePresence';
import { useNotifications } from '../../src/lib/realtime/useNotifications';
import { useActivityFeed } from '../../src/lib/realtime/useActivityFeed';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

// Mock Consumer that mimics ChatView's useRealtime usage
const ChatConsumerComponent: React.FC = () => {
  const realtimeCtx = useRealtimeContext();
  const { isConnected } = useRealtime('chat.message.created', () => {});
  const { onlineCount } = usePresence();
  useNotifications();
  useActivityFeed();

  return React.createElement('div', { id: 'chat-container' }, [
    React.createElement('span', { key: 'status' }, isConnected ? 'connected' : 'disconnected'),
    React.createElement('span', { key: 'online' }, `Online: ${onlineCount}`),
    React.createElement('span', { key: 'provider-verified' }, realtimeCtx ? 'provider-ok' : 'missing'),
  ]);
};

export async function runChatRealtimeProviderRegressionTest() {
  console.log('\n===============================================================');
  console.log(' RUNNING SUITE 39: CHAT ROUTE REALTIME PROVIDER REGRESSION');
  console.log('===============================================================\n');

  // Test 1: Verify that consumer outside RealtimeProvider throws exact error
  console.log('--- Test 1: Consumer outside RealtimeProvider throws expected error ---');
  let threwExpectedError = false;
  try {
    renderToString(React.createElement(ChatConsumerComponent));
  } catch (err: any) {
    if (err.message?.includes('useRealtimeContext must be used within a RealtimeProvider')) {
      threwExpectedError = true;
    } else {
      console.error('Unexpected error thrown:', err);
    }
  }
  assert(
    threwExpectedError,
    'useRealtimeContext throws "useRealtimeContext must be used within a RealtimeProvider" when outside provider'
  );

  // Test 2: Verify that wrapping with RealtimeProvider resolves cleanly
  console.log('\n--- Test 2: Consumer inside RealtimeProvider mounts without errors ---');
  let renderedHtml = '';
  let renderError: any = null;
  try {
    renderedHtml = renderToString(
      React.createElement(
        RealtimeProvider,
        {
          workspaceId: 'ws-test-alpha',
          token: 'mock-token',
          children: React.createElement(ChatConsumerComponent),
        }
      )
    );
  } catch (err: any) {
    renderError = err;
  }

  assert(renderError === null, 'No provider errors thrown when rendered inside RealtimeProvider');
  assert(renderedHtml.includes('chat-container'), 'Chat container element rendered successfully');
  assert(renderedHtml.includes('provider-ok'), 'useRealtimeContext resolves successfully');

  // Test 3: Verify canonical re-export from src/context/RealtimeContext.tsx
  console.log('\n--- Test 3: Verify canonical RealtimeContext standardization ---');
  const contextModule = await import('../../src/context/RealtimeContext');
  assert(typeof contextModule.RealtimeProvider === 'function', 'RealtimeContext exports RealtimeProvider');
  assert(typeof contextModule.useRealtimeContext === 'function', 'RealtimeContext exports useRealtimeContext');
  assert(typeof contextModule.useRealtime === 'function', 'RealtimeContext exports useRealtime');

  console.log('\n===============================================================');
  console.log(' ✅ ALL CHAT ROUTE REALTIME PROVIDER REGRESSION TESTS PASSED!');
  console.log('===============================================================\n');
}

// Run directly
runChatRealtimeProviderRegressionTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
