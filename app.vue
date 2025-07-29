<script setup lang="ts">
// Root component for the cat meal management app
// Uses the default layout with responsive navigation

// Set global meta tags
useSeoMeta({
  title: '猫の健康管理アプリ',
  description: '飼い猫の食事記録と健康管理を行うアプリケーション',
});
</script>

<template>
  <div>
    <NuxtPage />
  </div>
</template>

<style>
/* Global styles for the cat meal management app */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  background-color: #f8f9fa;
  color: #333;
  line-height: 1.6;
}

/* Remove default link styles */
a {
  color: inherit;
  text-decoration: none;
}

/* Button reset */
button {
  font-family: inherit;
  font-size: inherit;
  border: none;
  background: none;
  cursor: pointer;
}

/* Form element consistency */
input,
textarea,
select {
  font-family: inherit;
  font-size: inherit;
}

/* Utility classes */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Focus styles for accessibility */
*:focus {
  outline: 2px solid #4caf50;
  outline-offset: 2px;
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Print styles */
@media print {
  .sidebar,
  .mobile-header,
  .bottom-nav {
    display: none !important;
  }

  .main-content {
    margin-left: 0 !important;
  }

  .page-content {
    padding: 0 !important;
  }
}
</style>
