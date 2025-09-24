<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, unref } from 'vue'
import { BubbleList, EditorSender } from 'vue-element-plus-x'
import { HttpAgent } from '@ag-ui/client'
import type { SubmitResult } from 'vue-element-plus-x/types/EditorSender'
import type { BubbleListItemProps } from 'vue-element-plus-x/types/BubbleList'

const senderRef = ref()
const sending = ref(false)
const messages = ref<BubbleListItemProps[]>([])
const agent = new HttpAgent({
  url: '/api/chat/stream',
  headers: {
    'Content-Type': 'application/json',
  },
  initialState: {
    model: 'openai/gpt-oss-120b',
  },
})

const sendMessage = async (payload: SubmitResult) => {
  agent.addMessage({
    role: 'user',
    content: payload.text,
    id: '1',
  })

  unref(senderRef).clear()

  await agent.runAgent({})
}

const onCancel = () => {
  try {
    agent.abortRun()
  } catch {}
}

const startSubscribe = () => {
  const subscribe = agent.subscribe({
    onRunStartedEvent() {
      sending.value = true
    },

    onRunFinishedEvent() {
      sending.value = false
    },
    onRunFailed() {
      sending.value = false
    },
    onRunErrorEvent() {
      sending.value = false
    },

    onTextMessageStartEvent(e) {
      messages.value = e.messages.map(item => ({
        placement: item.role === 'user' ? 'end' : 'start',
        content: item.content,
      }))

      messages.value.push({
        loading: true,
        placement: 'start',
      })
    },

    onTextMessageContentEvent(e) {
      messages.value = e.messages.map(item => {
        return {
          placement: item.role === 'user' ? 'end' : 'start',
          content: item.content,
          isMarkdown: true,
        }
      })
    },

    onTextMessageEndEvent() {},
  })

  return () => {
    subscribe.unsubscribe()
  }
}

let release = () => {}

onMounted(() => {
  release = startSubscribe()
})

onBeforeUnmount(() => {
  release()
})
</script>

<template>
  <div class="chat-container">
    <!-- Chat Header -->
    <div class="chat-header">
      <div class="header-content">
        <h2>Chat</h2>
        <div class="status">
          <div class="status-indicator online"></div>
          <span>Online</span>
        </div>
      </div>
    </div>

    <!-- Messages Area -->
    <div class="messages-container">
      <BubbleList
        :list="messages"
        max-height="100%"
        class="w-full"
      ></BubbleList>
    </div>

    <!-- Message Input -->
    <div class="input-container">
      <EditorSender
        ref="senderRef"
        :loading="sending"
        @cancel="onCancel"
        @submit="sendMessage"
      />
    </div>
  </div>
</template>

<style scoped>
.chat-container {
  @apply h-full w-full;
  @apply flex flex-col;

  @apply border border-solid border-[#e5e7eb];
  @apply rounded-[8px];

  @apply bg-[#fff];

  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  :deep(.el-bubble-content) {
    @apply max-w-full;
  }
}

.chat-header {
  @apply px-[16px] py-[12px];

  @apply border-b border-solid border-[#e5e7eb];
  @apply rounded-tl-[8px] rounded-tr-[8px];

  @apply bg-[#f9fafb];
}

.header-content {
  @apply flex justify-between items-center;
  @apply h-[32px] leading-[32px];
}

.header-content h2 {
  @apply m-[0px];

  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.status {
  @apply flex items-center gap-[8px];

  font-size: 0.875rem;
  color: #6b7280;
}

.status-indicator {
  @apply w-[8px] h-[8px];
  @apply rounded-[50%];

  @apply bg-[#9ca3af];
}

.status-indicator.online {
  background-color: #10b981;
}

.messages-container {
  @apply flex-1;
  @apply p-[20px];
  @apply overflow-hidden;
}

.input-container {
  @apply px-[16px] pb-[20px];
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .chat-container {
    @apply bg-[#1f2937];
    @apply border-[#374151];
  }

  .chat-header {
    @apply bg-[#111827];
    @apply border-[#374151];
  }

  .header-content h2 {
    color: #f9fafb;
  }

  .status {
    color: #9ca3af;
  }

  .messages-container {
    @apply bg-[#1f2937];
  }
}
</style>
