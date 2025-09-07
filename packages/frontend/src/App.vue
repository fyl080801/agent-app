<script setup lang="ts">
import { Chat } from "./components/chat"
</script>

<template>
  <div class="app-container">
    <div class="main-content">
      <h1>Vue + TypeScript + Vite</h1>
      <p>Click the floating message icon to open chat</p>
    </div>
  </div>

  <Chat />
</template>

<style scoped>
@reference 'tailwindcss';

.app-container {
  @apply h-screen w-screen relative overflow-hidden;
}

.main-content {
  @apply p-8;
}

.main-content h1 {
  @apply text-3xl font-bold mb-4;
}

.main-content p {
  @apply text-gray-600;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .main-content h1 {
    @apply text-white;
  }

  .main-content p {
    @apply text-gray-400;
  }
}
</style>
