import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // §Stage-18 functional-parity pipeline: hook violations must FAIL
      // validation, never warn — a Rules-of-Hooks bug passes typecheck/build
      // cleanly and only crashes at render time.
      ...reactHooks.configs.recommended.rules,
      // §7B repair — the repository documentation and the §Stage-18 pipeline
      // require enforcement as errors (see DESIGN_SYSTEM.md and the Phase 6
      // report: "Targeted hooks check (rules-of-hooks + exhaustive-deps as
      // error)"). The previous 'off' overrides disabled the intended guard.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // §Stage-27 — underscore prefix is the project's deliberate convention
      // for interface-mandated-but-unused parameters (mock clients matching
      // real signatures, store functions kept call-site compatible).
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // §Stage-27 — these modules MUST mix component and non-component exports
    // by design (AppProvider + useApp, integration context + factory,
    // test-only helpers): the fast-refresh warning is structural noise there.
    files: [
      'src/context/**',
      'src/integrations/IntegrationsContext.tsx',
      'src/testing/**',
      'src/components/shared/BrandComm.tsx',
      // §Truth be told — these mix component and utility exports by design
      'src/components/shared/ErrorBoundary.tsx',
      'src/components/shared/TourEngine.tsx',
      'src/components/shared/RoutingRequest.tsx',
      'src/components/shared/NotificationCenter.tsx',
      'src/components/shared/LiveChatWidget.tsx',
      'src/components/shared/BrandGuidance.tsx',
      'src/components/shared/TamSamDisplay.tsx',
      'src/components/brand/SalesAnalytics.tsx',
      'src/components/brand/BrandTeamMessages.tsx',
      'src/components/brand/OnboardingWizard.tsx',
      'src/components/brand/BrandPurchaseOrders.tsx',
      'src/components/admin/AdminPurchaseOrderList.tsx',
      'src/components/admin/HelpdeskDashboard.tsx',
      'src/components/admin/MonitoringDashboard.tsx',
      'src/components/admin/RetailPipeline.tsx',
      'src/components/admin/ReturnsTrackingDashboard.tsx',
      'src/components/admin/SuperAdminPanel.tsx',
      'src/components/admin/InvestorPitchSection.tsx',
      'src/components/admin/BankFinancingSection.tsx',
      'src/lib/helpdesk/ticketStore.ts',
      'src/lib/amazon/productImageValidator.ts',
      'src/lib/shipping/shippingCalculator.ts',
      'src/lib/warehouse/returnsTracking.ts',
      'src/lib/monitoring/sentry.ts',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  }
);
