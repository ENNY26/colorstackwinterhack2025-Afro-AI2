/**
 * Helpers for nested navigators: root stack wraps MainTabs (tabs).
 * Tab screens must use the parent navigator to reach stack-only routes.
 */

import { CommonActions } from '@react-navigation/native';

/**
 * Navigate to a screen registered on the root stack (above tabs).
 * @param {import('@react-navigation/native').NavigationProp<any>} navigation
 */
export function navigateRootStack(navigation, screenName, params) {
  const parent = typeof navigation?.getParent === 'function' ? navigation.getParent() : null;
  const nav = parent || navigation;
  if (params !== undefined) {
    nav.navigate(screenName, params);
  } else {
    nav.navigate(screenName);
  }
}

/**
 * Open the Conversation tab with params from a root-stack screen (e.g. History).
 */
export function navigateToConversationTab(navigation, params = {}) {
  navigation.navigate('MainTabs', {
    screen: 'Conversation',
    params,
  });
}

/**
 * Reset navigation to Login from anywhere (e.g. Settings tab → root stack).
 * Walks up all parents: a single getParent() from a tab screen can be the tab
 * navigator, which does not register `Login` — we need the outer stack.
 */
export function resetToLogin(navigation) {
  let root = navigation;
  let parent = root?.getParent?.();
  while (parent) {
    root = parent;
    parent = root.getParent?.();
  }
  root.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    })
  );
}
