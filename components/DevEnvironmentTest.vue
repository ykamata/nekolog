<script setup lang="ts">
// This component is used to test the development environment functionality
// It verifies TypeScript compilation, ESLint integration, and auto-imports

// 1. Testing TypeScript compilation and type checking
interface TestConfig {
  name: string;
  enabled: boolean;
  count: number;
  options?: {
    debug: boolean;
    timeout: number;
  };
}

// Create a typed object with TypeScript
const _config: TestConfig = {
  name: 'Development Environment Test',
  enabled: true,
  count: 0,
  options: {
    debug: true,
    timeout: 1000,
  },
};

// 2. Testing auto-imports for Vue Composition API
// These should work without explicit imports
const counter = ref(0);
const message = ref('Hot reload test - edit this message to test hot reload');
const isTestPassed = ref(false);

// Computed property using auto-import
const doubledCounter = computed(() => counter.value * 2);

// Method to test reactivity
const incrementCounter = (): void => {
  counter.value++;
  // This will trigger the watcher
};

// 3. Testing lifecycle hooks with auto-imports
onMounted(() => {
  // This will be caught by ESLint as a warning due to no-console rule
  console.log('DevEnvironmentTest component mounted');

  // Test TypeScript type checking
  const typeCheckTest = (): string => {
    return 'Type checking works!';
  };

  message.value = typeCheckTest();
});

// 4. Testing watchers with auto-imports
watch(counter, (newValue: number, oldValue: number) => {
  console.log(`Counter changed from ${oldValue} to ${newValue}`);

  // Test TypeScript type safety
  if (typeof newValue === 'number' && newValue > 5) {
    isTestPassed.value = true;
  }
});

// 5. Testing nextTick with auto-imports
const testNextTick = async (): Promise<void> => {
  counter.value++;
  await nextTick();
  message.value = 'DOM updated after nextTick';
};

// Intentional TypeScript error to test error reporting
// Uncomment the line below to test TypeScript error reporting
// const errorTest: number = 'This should cause a TypeScript error';

// Intentional ESLint error to test ESLint integration
// Uncomment the line below to test ESLint error reporting
// var badVariable = 'This should trigger an ESLint error for using var';
</script>

<template>
  <div class="dev-environment-test">
    <h2>Development Environment Test</h2>

    <div class="test-section">
      <h3>1. Hot Reload Test</h3>
      <p>Edit the message in the component to test hot reload:</p>
      <p class="message">
        {{ message }}
      </p>
      <p class="hint">
        (After editing, the page should update without a full refresh)
      </p>
    </div>

    <div class="test-section">
      <h3>2. TypeScript & Reactivity Test</h3>
      <p>Counter: {{ counter }} (Double: {{ doubledCounter }})</p>
      <button @click="incrementCounter">
        Increment Counter
      </button>
      <p
        v-if="isTestPassed"
        class="success"
      >
        Test passed! TypeScript and reactivity working.
      </p>
      <p
        v-else
        class="hint"
      >
        Click the button until counter exceeds 5 to pass the test
      </p>
    </div>

    <div class="test-section">
      <h3>3. NextTick Test</h3>
      <button @click="testNextTick">
        Test NextTick
      </button>
      <p class="hint">
        (This tests if the Vue nextTick function is auto-imported correctly)
      </p>
    </div>

    <div class="test-section">
      <h3>4. ESLint Integration Test</h3>
      <p>Check the component code for ESLint warnings:</p>
      <ul>
        <li>Console statements should show ESLint warnings</li>
        <li>
          Uncomment the "var badVariable" line to test ESLint error for using
          var
        </li>
      </ul>
    </div>

    <div class="test-section">
      <h3>5. TypeScript Error Test</h3>
      <p>Uncomment the "errorTest" line to test TypeScript error reporting</p>
      <p class="hint">
        (This should show a type error in your IDE and during compilation)
      </p>
    </div>
  </div>
</template>

<style scoped>
.dev-environment-test {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 2px solid #e9ecef;
}

h2 {
  color: #343a40;
  text-align: center;
  margin-bottom: 2rem;
  font-size: 1.8rem;
}

h3 {
  color: #495057;
  margin-bottom: 1rem;
  font-size: 1.3rem;
}

.test-section {
  background-color: white;
  padding: 1.5rem;
  border-radius: 6px;
  margin-bottom: 1.5rem;
  border: 1px solid #dee2e6;
}

button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  margin: 0.5rem 0;
}

button:hover {
  background-color: #0069d9;
}

.message {
  font-weight: bold;
  color: #0056b3;
  background-color: #e7f5ff;
  padding: 0.5rem;
  border-radius: 4px;
  border-left: 4px solid #339af0;
}

.success {
  color: #2b8a3e;
  background-color: #ebfbee;
  padding: 0.5rem;
  border-radius: 4px;
  border-left: 4px solid #40c057;
  font-weight: bold;
}

.hint {
  font-size: 0.9rem;
  color: #6c757d;
  font-style: italic;
}

ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

li {
  margin-bottom: 0.5rem;
}
</style>
