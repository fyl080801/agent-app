<script lang="ts" setup>
import { ChatDotRound, Close } from "@element-plus/icons-vue"
import { ElButton } from "element-plus"
import {
  computed,
  reactive,
  ref,
  nextTick,
  onMounted,
  onBeforeUnmount
} from "vue"
import Chat from "./Chat.vue"

const chatVisible = ref(false)
const dragging = ref(false)
const popupBtnRef = ref<InstanceType<typeof ElButton> | null>(null)

const iconPosition = reactive({
  x: window.innerWidth - 50,
  y: window.innerHeight - 50
})

const chatPopupStyle = computed(() => {
  if (!popupBtnRef.value || !popupBtnRef.value.$el) {
    return {
      right: "10px",
      left: "auto",
      bottom: "10px",
      top: "auto"
    }
  }

  const buttonRect = popupBtnRef.value.$el.getBoundingClientRect()
  const buttonCenterX = buttonRect.left + buttonRect.width / 2
  const buttonCenterY = buttonRect.top + buttonRect.height / 2

  const popupWidth = 350
  const popupHeight = 500

  // Calculate distances to screen edges
  const distanceToLeft = buttonCenterX
  const distanceToRight = window.innerWidth - buttonCenterX
  const distanceToTop = buttonCenterY
  const distanceToBottom = window.innerHeight - buttonCenterY

  // Determine popup position based on available space
  let left, top

  // Horizontal positioning
  if (distanceToLeft < popupWidth / 2) {
    // Not enough space on the left, position from left edge
    left = `${50 - buttonRect.width / 2}px`
  } else if (distanceToRight < popupWidth / 2) {
    // Not enough space on the right, position from right edge
    left = `${window.innerWidth - popupWidth - (50 - buttonRect.width / 2)}px`
  } else {
    // Center the popup on the button's center
    left = `${buttonCenterX - popupWidth / 2}px`
  }

  // Vertical positioning
  if (distanceToTop < popupHeight / 2) {
    // Not enough space above, position below the button
    top = `${buttonRect.bottom + 10}px`
  } else if (distanceToBottom < popupHeight / 2) {
    // Not enough space below, position above the button
    top = `${buttonRect.top - popupHeight - 10}px`
  } else {
    // Center the popup on the button's center
    top = `${buttonCenterY - popupHeight / 2}px`
  }

  return {
    left,
    top,
    right: "auto",
    bottom: "auto"
  }
})

const toggleChat = async () => {
  if (!dragging.value) {
    chatVisible.value = !chatVisible.value
    // Wait for next tick to ensure DOM is updated
    if (chatVisible.value) {
      await nextTick()
    }
  }
}

const closeChat = () => {
  chatVisible.value = false
}

onMounted(() => {})

onBeforeUnmount(() => {})
</script>

<template>
  <ElButton
    ref="popupBtnRef"
    :type="!chatVisible ? 'primary' : 'danger'"
    :icon="!chatVisible ? ChatDotRound : Close"
    circle
    class="floating-icon"
    :style="{
      left: iconPosition.x + 'px',
      top: iconPosition.y + 'px'
    }"
    @click="toggleChat"
  />

  <div v-if="chatVisible" class="chat-popup" :style="chatPopupStyle">
    <ElButton :icon="Close" circle class="close-btn" @click="closeChat" />
    <Chat />
  </div>
</template>

<style scoped>
@reference 'tailwindcss';

.floating-icon {
  @apply fixed;
}

.chat-popup {
  @apply fixed w-[350px] h-[500px];
  @apply z-[999];
  @apply shadow-2xl rounded-lg;
  animation: slideIn 0.3s ease-out;
}

.close-btn {
  @apply absolute -top-[16px] -right-[16px] z-[1001];
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
