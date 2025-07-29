<template>
  <div>
    <!-- Skeleton Card -->
    <div
      v-if="type === 'card'"
      class="skeleton-card"
    >
      <div class="skeleton-header">
        <div class="skeleton-avatar" />
        <div class="skeleton-text-group">
          <div class="skeleton-text skeleton-text--title" />
          <div class="skeleton-text skeleton-text--subtitle" />
        </div>
      </div>
      <div class="skeleton-body">
        <div class="skeleton-text skeleton-text--body" />
        <div class="skeleton-text skeleton-text--body skeleton-text--short" />
      </div>
    </div>

    <!-- Skeleton List -->
    <div
      v-else-if="type === 'list'"
      class="skeleton-list"
    >
      <div
        v-for="i in count"
        :key="i"
        class="skeleton-list-item"
      >
        <div class="skeleton-avatar skeleton-avatar--small" />
        <div class="skeleton-text-group">
          <div class="skeleton-text skeleton-text--title" />
          <div class="skeleton-text skeleton-text--subtitle" />
        </div>
        <div class="skeleton-actions">
          <div class="skeleton-button" />
          <div class="skeleton-button" />
        </div>
      </div>
    </div>

    <!-- Skeleton Grid -->
    <div
      v-else-if="type === 'grid'"
      class="skeleton-grid"
    >
      <div
        v-for="i in count"
        :key="i"
        class="skeleton-grid-item"
      >
        <div class="skeleton-image" />
        <div class="skeleton-text skeleton-text--title" />
        <div class="skeleton-text skeleton-text--body" />
        <div class="skeleton-button-group">
          <div class="skeleton-button" />
          <div class="skeleton-button" />
        </div>
      </div>
    </div>

    <!-- Skeleton Chart -->
    <div
      v-else-if="type === 'chart'"
      class="skeleton-chart"
    >
      <div class="skeleton-chart-header">
        <div class="skeleton-text skeleton-text--title" />
        <div class="skeleton-text skeleton-text--subtitle" />
      </div>
      <div class="skeleton-chart-body">
        <div class="skeleton-chart-bars">
          <div
            v-for="i in 7"
            :key="i"
            class="skeleton-chart-bar"
            :style="{ height: Math.random() * 80 + 20 + '%' }"
          />
        </div>
      </div>
      <div class="skeleton-chart-legend">
        <div class="skeleton-text skeleton-text--body" />
        <div class="skeleton-text skeleton-text--body skeleton-text--short" />
      </div>
    </div>

    <!-- Skeleton Table -->
    <div
      v-else-if="type === 'table'"
      class="skeleton-table"
    >
      <div class="skeleton-table-header">
        <div
          v-for="i in 4"
          :key="i"
          class="skeleton-text skeleton-text--subtitle"
        />
      </div>
      <div
        v-for="i in count"
        :key="i"
        class="skeleton-table-row"
      >
        <div
          v-for="j in 4"
          :key="j"
          class="skeleton-text skeleton-text--body"
        />
      </div>
    </div>

    <!-- Skeleton Form -->
    <div
      v-else-if="type === 'form'"
      class="skeleton-form"
    >
      <div
        v-for="i in count"
        :key="i"
        class="skeleton-form-field"
      >
        <div class="skeleton-text skeleton-text--label" />
        <div class="skeleton-input" />
      </div>
      <div class="skeleton-form-actions">
        <div class="skeleton-button skeleton-button--primary" />
        <div class="skeleton-button" />
      </div>
    </div>

    <!-- Default Skeleton -->
    <div
      v-else
      class="skeleton-default"
    >
      <div class="skeleton-text skeleton-text--title" />
      <div class="skeleton-text skeleton-text--body" />
      <div class="skeleton-text skeleton-text--body skeleton-text--short" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  type?: 'card' | 'list' | 'grid' | 'chart' | 'table' | 'form' | 'default';
  count?: number;
}

withDefaults(defineProps<Props>(), {
  type: 'default',
  count: 3,
});
</script>

<style scoped>
/* Base skeleton styles */
.skeleton-text,
.skeleton-avatar,
.skeleton-button,
.skeleton-input,
.skeleton-image,
.skeleton-chart-bar {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 4px;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Text variations */
.skeleton-text {
  height: 1rem;
  margin-bottom: 0.5rem;
}

.skeleton-text--title {
  height: 1.5rem;
  width: 60%;
}

.skeleton-text--subtitle {
  height: 1rem;
  width: 40%;
}

.skeleton-text--body {
  height: 1rem;
  width: 80%;
}

.skeleton-text--short {
  width: 50%;
}

.skeleton-text--label {
  height: 0.875rem;
  width: 30%;
  margin-bottom: 0.25rem;
}

/* Avatar variations */
.skeleton-avatar {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton-avatar--small {
  width: 2rem;
  height: 2rem;
}

/* Button variations */
.skeleton-button {
  height: 2.5rem;
  width: 5rem;
  border-radius: 6px;
}

.skeleton-button--primary {
  width: 7rem;
}

/* Input variations */
.skeleton-input {
  height: 2.5rem;
  width: 100%;
  border-radius: 6px;
}

/* Image variations */
.skeleton-image {
  width: 100%;
  height: 8rem;
  border-radius: 8px;
}

/* Card skeleton */
.skeleton-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.skeleton-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.skeleton-text-group {
  flex: 1;
}

.skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* List skeleton */
.skeleton-list {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.skeleton-list-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
}

.skeleton-list-item:last-child {
  border-bottom: none;
}

.skeleton-actions {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}

/* Grid skeleton */
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.skeleton-grid-item {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.skeleton-button-group {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

/* Chart skeleton */
.skeleton-chart {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.skeleton-chart-header {
  text-align: center;
  margin-bottom: 2rem;
}

.skeleton-chart-body {
  height: 300px;
  display: flex;
  align-items: end;
  justify-content: center;
  margin-bottom: 1rem;
}

.skeleton-chart-bars {
  display: flex;
  align-items: end;
  gap: 1rem;
  height: 100%;
  width: 80%;
}

.skeleton-chart-bar {
  flex: 1;
  min-height: 20%;
  border-radius: 4px 4px 0 0;
}

.skeleton-chart-legend {
  display: flex;
  justify-content: center;
  gap: 2rem;
}

/* Table skeleton */
.skeleton-table {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.skeleton-table-header {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e2e8f0;
}

.skeleton-table-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
}

.skeleton-table-row:last-child {
  border-bottom: none;
}

/* Form skeleton */
.skeleton-form {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.skeleton-form-field {
  margin-bottom: 1.5rem;
}

.skeleton-form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

/* Default skeleton */
.skeleton-default {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .skeleton-grid {
    grid-template-columns: 1fr;
  }

  .skeleton-table-header,
  .skeleton-table-row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .skeleton-chart-body {
    height: 200px;
  }

  .skeleton-chart-legend {
    flex-direction: column;
    gap: 0.5rem;
  }

  .skeleton-form-actions {
    flex-direction: column;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .skeleton-text,
  .skeleton-avatar,
  .skeleton-button,
  .skeleton-input,
  .skeleton-image,
  .skeleton-chart-bar {
    background: linear-gradient(90deg, #d0d0d0 25%, #b0b0b0 50%, #d0d0d0 75%);
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .skeleton-text,
  .skeleton-avatar,
  .skeleton-button,
  .skeleton-input,
  .skeleton-image,
  .skeleton-chart-bar {
    animation: none;
    background: #f0f0f0;
  }
}
</style>
