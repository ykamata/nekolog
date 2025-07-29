<script setup lang="ts">
// Testing auto-imports for Vue Composition API functions
// These should work without explicit imports

// Reactive state
const count = ref(0);
const message = ref('Auto-imports working!');
const isVisible = ref(true);

// Computed properties
const doubleCount = computed(() => count.value * 2);
const uppercaseMessage = computed(() => message.value.toUpperCase());

// Reactive object
const user = reactive({
  name: 'Test User',
  email: 'test@example.com',
});

// Methods
const increment = () => {
  count.value++;
};

const toggleVisibility = () => {
  isVisible.value = !isVisible.value;
};

// Lifecycle hooks
onMounted(() => {
  console.log('AutoImportTest component mounted');
  console.log('Auto-imports working for:', {
    ref: typeof ref,
    computed: typeof computed,
    reactive: typeof reactive,
    onMounted: typeof onMounted,
    watch: typeof watch,
    nextTick: typeof nextTick,
  });
});

// Watchers
watch(count, (newValue: number, oldValue: number) => {
  console.log(`Count changed from ${oldValue} to ${newValue}`);
});

// Test nextTick
const testNextTick = async () => {
  count.value++;
  await nextTick();
  console.log('DOM updated after nextTick');
};
</script>

<template>
  <div class="auto-import-test">
    <h3>Auto-Import Test Component</h3>

    <div class="test-section">
      <h4>Reactive State (ref)</h4>
      <p>Count: {{ count }}</p>
      <p>Double Count (computed): {{ doubleCount }}</p>
      <button @click="increment">
        Increment
      </button>
    </div>

    <div class="test-section">
      <h4>Reactive Object</h4>
      <p>Name: {{ user.name }}</p>
      <p>Email: {{ user.email }}</p>
    </div>

    <div class="test-section">
      <h4>Conditional Rendering</h4>
      <p v-if="isVisible">
        {{ uppercaseMessage }}
      </p>
      <button @click="toggleVisibility">
        {{ isVisible ? "Hide" : "Show" }} Message
      </button>
    </div>

    <div class="test-section">
      <h4>NextTick Test</h4>
      <button @click="testNextTick">
        Test NextTick
      </button>
    </div>
  </div>
</template>

<style scoped>
.auto-import-test {
  padding: 1rem;
  border: 2px solid #007bff;
  border-radius: 8px;
  margin: 1rem 0;
  background: #f8f9ff;
}

.test-section {
  margin: 1rem 0;
  padding: 1rem;
  background: white;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

h3 {
  color: #007bff;
  margin-bottom: 1rem;
}

h4 {
  color: #495057;
  margin-bottom: 0.5rem;
}

button {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin: 0.25rem;
}

button:hover {
  background: #0056b3;
}

p {
  margin: 0.5rem 0;
  color: #495057;
}
</style>
