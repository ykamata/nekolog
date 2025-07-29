# End-to-End Test Suite

This directory contains comprehensive end-to-end tests for the cat meal management application using Playwright.

## Test Structure

### Core Test Files

- **`meal-recording-workflow.test.ts`** - Tests the complete meal recording workflow
- **`cat-food-management.test.ts`** - Tests cat and food management user journeys
- **`data-visualization.test.ts`** - Tests analytics and chart functionality across devices
- **`offline-sync.test.ts`** - Tests offline/online synchronization scenarios
- **`responsive-design.test.ts`** - Tests responsive design on different screen sizes
- **`comprehensive-validation.test.ts`** - Validates all requirements from the specification

### Utility Files

- **`utils/test-data.ts`** - Test data generators and validation helpers
- **`utils/test-setup.ts`** - Test setup, teardown, and helper functions

## Test Coverage

### Requirements Validation

The test suite validates all requirements from the specification:

1. **食事記録の登録** - Meal recording functionality
2. **食事記録の閲覧** - Meal history viewing
3. **猫の管理** - Cat management
4. **フード管理** - Food management
5. **データ可視化** - Data visualization and analytics
6. **オフライン対応** - Offline functionality
7. **レスポンシブデザイン対応** - Responsive design
8. **パフォーマンス要件** - Performance requirements
9. **セキュリティ要件** - Security requirements

### Device Testing

Tests are run across multiple device types:

- **Mobile**: iPhone SE (375x667), iPhone 11 Pro Max (414x896)
- **Tablet**: iPad (768x1024), iPad Landscape (1024x768)
- **Desktop**: Standard (1200x800), Large (1920x1080)

### Browser Testing

Tests run on:

- Chromium (Desktop Chrome)
- Firefox (Desktop Firefox)
- WebKit (Desktop Safari)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

## Running Tests

### Prerequisites

1. Install Playwright browsers:

   ```bash
   npx playwright install
   ```

2. Ensure the development server is running:
   ```bash
   npm run dev
   ```

### Test Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (visible browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug

# Run specific test file
npx playwright test meal-recording-workflow

# Run tests on specific browser
npx playwright test --project=chromium

# Run tests on mobile devices only
npx playwright test --project="Mobile Chrome" --project="Mobile Safari"
```

### Test Configuration

The test configuration is defined in `playwright.config.ts`:

- **Base URL**: http://localhost:3000
- **Timeout**: 30 seconds per test
- **Retries**: 2 retries on CI, 0 locally
- **Screenshots**: On failure only
- **Videos**: Retained on failure
- **Traces**: On first retry

## Test Data Management

### Test Data Setup

Each test suite sets up its own clean database state:

1. **Clean Database**: All existing data is cleared before each test
2. **Test Data Creation**: Required cats, foods, and meal records are created via API
3. **Teardown**: Database is cleaned after each test

### Test Data Generators

The `test-data.ts` file provides:

- **Static Test Data**: Predefined cats, foods, and meal records
- **Dynamic Generators**: Functions to generate large datasets for performance testing
- **Validation Helpers**: Functions to validate test data integrity

## Test Utilities

### TestSetup Class

The `TestSetup` class provides helper methods for:

- **Database Management**: Setup, cleanup, and data creation
- **Page Interactions**: Form filling, button clicking, waiting for responses
- **Network Simulation**: Offline/online mode switching
- **Viewport Management**: Responsive design testing
- **Accessibility Checks**: Basic accessibility validation
- **Screenshot Capture**: Debug screenshots

### Common Patterns

```typescript
// Setup clean database and test data
await testSetup.setupCleanDatabase();
await testSetup.createTestCats([testCats[0]]);
await testSetup.createTestFoods([testFoods[0]]);

// Fill form fields with validation
await testSetup.fillFormField('input[name="quantity"]', "30");
await testSetup.selectOption('select[name="catId"]', testCats[0].name);

// Click button and wait for API response
await testSetup.clickButtonAndWait('button[type="submit"]', "/api/meals");

// Wait for success/error messages
await testSetup.waitForSuccessMessage("食事記録を保存しました");
await testSetup.waitForErrorMessage("エラーが発生しました");

// Test responsive design
await testSetup.setViewportSize(375, 667); // Mobile
await testSetup.checkResponsiveElements();

// Test offline functionality
await testSetup.goOffline();
// ... perform offline actions
await testSetup.goOnline();
```

## Debugging Tests

### Visual Debugging

1. **UI Mode**: Run `npm run test:e2e:ui` for interactive test running
2. **Headed Mode**: Run `npm run test:e2e:headed` to see browser actions
3. **Debug Mode**: Run `npm run test:e2e:debug` to step through tests

### Screenshots and Videos

- Screenshots are automatically taken on test failures
- Videos are recorded and retained on failures
- Manual screenshots can be taken with `testSetup.takeScreenshot(name)`

### Trace Viewer

Playwright traces are collected on first retry and can be viewed with:

```bash
npx playwright show-trace trace.zip
```

## Performance Testing

### Load Time Validation

Tests validate that:

- Pages load within 1 second (requirement 8.1)
- Charts render within 5 seconds
- Large datasets load within 10 seconds

### Memory and Resource Usage

Tests monitor:

- Local storage usage (should not exceed 1MB)
- Network request efficiency
- Chart rendering performance

## Accessibility Testing

### Basic Accessibility Checks

Tests validate:

- Proper heading structure (h1, h2, etc.)
- Alt text on images
- Form labels and ARIA attributes
- Keyboard navigation support
- Touch target sizes (minimum 44x44px)

### Screen Reader Support

Tests check for:

- ARIA labels on interactive elements
- Proper form associations
- Chart accessibility attributes

## Continuous Integration

### CI Configuration

Tests are configured to run in CI with:

- Headless mode only
- Single worker (no parallel execution)
- 2 retries on failure
- HTML report generation

### Test Artifacts

CI preserves:

- Test reports (HTML format)
- Screenshots from failed tests
- Video recordings of failures
- Playwright traces for debugging

## Troubleshooting

### Common Issues

1. **Server Not Running**: Ensure `npm run dev` is running before tests
2. **Database Connection**: Check database configuration and connectivity
3. **Timeout Issues**: Increase timeout in playwright.config.ts if needed
4. **Flaky Tests**: Add proper wait conditions and retry logic

### Debug Commands

```bash
# Check Playwright installation
npx playwright --version

# Verify browser installation
npx playwright install --dry-run

# Run single test with debug output
npx playwright test meal-recording-workflow --debug

# Generate test report
npx playwright show-report
```

## Contributing

### Adding New Tests

1. Create test file in appropriate category
2. Use TestSetup class for common operations
3. Follow existing naming conventions
4. Add proper test data cleanup
5. Include accessibility checks where relevant

### Test Best Practices

1. **Isolation**: Each test should be independent
2. **Clean State**: Always start with clean database
3. **Explicit Waits**: Use proper wait conditions
4. **Descriptive Names**: Use clear test descriptions
5. **Error Handling**: Test both success and failure scenarios
6. **Responsive**: Test across different viewport sizes
7. **Accessibility**: Include basic accessibility validation

### Code Review Checklist

- [ ] Tests are isolated and independent
- [ ] Database cleanup is properly implemented
- [ ] Wait conditions are explicit and appropriate
- [ ] Test data is realistic and comprehensive
- [ ] Error scenarios are covered
- [ ] Responsive design is tested
- [ ] Accessibility is validated
- [ ] Performance requirements are checked
