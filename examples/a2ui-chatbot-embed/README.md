# A2UI Chatbot Embed Example

This example shows the intended production integration shape.

The existing chatbot keeps ownership of:

- message list
- composer
- streaming
- persistence
- user/session state

A2UI contributes only the surface host:

```tsx
<A2UIMessageSurface
  part={createA2UIChatSurfacePart(message.surface)}
  onAction={hostActionAdapter}
/>
```

The host action adapter decides how to call the application backend, Python agent, Node bridge, or MCP runtime. The A2UI package does not depend on the PoC conversation store.

Supported integration modes:

- inline message surface
- tool-result renderer
- active surface panel fallback

