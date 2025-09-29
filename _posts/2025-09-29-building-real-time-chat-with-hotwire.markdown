---
title: Building real-time chat with Hotwire
date: 2025-09-29T11:49:47+02:00
categories:
excerpt: Learn how to build a sophisticated real-time chat system using Hotwire. We'll create a complete implementation featuring instant message delivery, background processing, and seamless user experience using Turbo Streams, Action Cable, and Stimulus.
tags:
  - ruby on rails
  - hotwire
  - turbo
  - action cable
  - stimulus
published: true
---

Real-time features have become essential in modern web applications. Whether it's notifications, live updates, or AI-powered chat assistants, users expect immediate feedback without page refreshes. The challenge for Rails developers has always been bridging the gap between server-side simplicity and client-side reactivity.

In this post, we'll explore how to build a sophisticated real-time chat system using Hotwire - Rails' answer to modern frontend development. We'll create a complete chat implementation featuring instant message delivery, background processing for AI responses, and seamless user experience without leaving the Rails ecosystem. This architecture is particularly powerful for AI assistants where response times are unpredictable and real-time feedback is crucial for user engagement.

<video controls="controls" width="100%" name="Copyable Text Field">
  <source src="/images/turbo-chat/demo.mov">
</video>

## The Hotwire advantage

Before diving into implementation, let's understand why Hotwire is perfect for real-time features. Traditional approaches often require complex JavaScript frameworks, separate API layers, and intricate state management. Hotwire takes a different approach by enhancing HTML over the wire, keeping your application logic on the server where Rails excels.

The magic happens through three core components:

**Turbo Streams** enable real-time DOM updates via WebSockets. Instead of sending JSON data that requires client-side rendering, you send targeted HTML fragments that update specific parts of the page. This means your server can decide exactly what changes and how, maintaining full control over the user interface.

**Action Cable** provides WebSocket infrastructure for bidirectional communication. It handles connection management, channel subscriptions, and message broadcasting with Rails' typical elegance. No need for separate WebSocket servers or complex connection handling.

**Stimulus** handles interactive behavior without complex JavaScript frameworks. It connects to your existing HTML and adds just enough JavaScript to create responsive interactions, while keeping your application logic server-side.

Our chat system will leverage all these components to create a seamless experience where messages appear instantly, background processing handles heavy lifting, and users enjoy a fluid interface that feels native to modern web applications.

## Building the foundation

The beauty of building with Rails is starting with solid data models. Our chat system needs two main components: conversations (chat containers) and individual messages. This foundation will support everything from basic messaging to complex features like message status tracking and metadata storage.

The Chat model represents conversation containers with automatic title generation for easy identification. This foundation provides users with persistent conversation history while maintaining a clean, organized structure.

The ChatMessage model handles individual messages with support for different message types (user, assistant), generation states for loading indicators, and flexible metadata storage for rich content. The real magic happens in the model callbacks where we integrate Turbo Streams broadcasting.

```ruby
# Key insight: Turbo Streams broadcasting in model callbacks
class ChatMessage < ApplicationRecord
  after_create_commit -> { broadcast_message_created }
  after_update_commit -> { broadcast_message_updated }

  private

  def broadcast_message_created
    broadcast_append_to("chat_#{chat.id}", target: 'messages-container', ...)
  end
end
```

This pattern means that whenever a message is created or updated anywhere in your application - whether from web requests, background jobs, or administrative actions - all connected clients automatically receive the updates. The server maintains complete control over what gets sent and how it's rendered.

## The controller layer: Handling user interactions

The controller serves as the orchestrator for chat interactions, handling message creation, real-time coordination, and background job management. The design philosophy here is to keep actions simple and delegate complex processing to background jobs.

When a user submits a message, the controller immediately saves it to the database and queues a background job for processing. This approach provides instant feedback to the user while handling potentially slow operations (like AI processing or external API calls) asynchronously.

```ruby
def create_message
  @message = @chat.messages.new(message_params)

  if @message.save
    ProcessMessageJob.perform_later(@message.id)
    head :ok
  else
    head :unprocessable_content
  end
end
```

The beauty of this pattern is its simplicity. The user sees their message immediately (thanks to the model's broadcast callback), while complex processing happens in the background. If something goes wrong with background processing, it doesn't affect the user's experience of sending the message.

## Crafting the real-time interface

The view layer combines traditional Rails templating with Hotwire's real-time capabilities. The key insight is using `turbo_stream_from` to establish the WebSocket connection and strategically placing target containers for dynamic updates.

The chat interface consists of three main sections: a header for context, a scrollable messages container that updates in real-time, and an input form for user interactions. Each section has specific responsibilities and design considerations.

```erb
<!-- The magic line that enables real-time updates -->
<%= turbo_stream_from "chat_#{@chat.id}" %>

<div id="messages-container">
  <!-- Messages render here and update automatically -->
</div>
```

The messages container becomes a live-updating viewport where new messages appear automatically without page refreshes. Each message includes metadata for styling, status indicators for loading states, and semantic HTML for accessibility.

Message partials handle different states elegantly. User messages appear on the right with blue styling, assistant messages on the left with gray backgrounds, and generating messages show a typing indicator that updates to actual content when processing completes.

## Adding intelligent interactivity with Stimulus

Stimulus controllers coordinate the critical interaction between user input and real-time updates. The most important responsibility is managing form submission in a way that feels instant while maintaining data consistency with server-side processing.

The key challenge in real-time chat is handling form submission without disrupting the continuous flow of conversation. Traditional form submissions would cause page refreshes or loading states that break the real-time experience. Stimulus solves this by intercepting form submission and coordinating it with the broadcast system.

```javascript
async submitForm(event) {
  event.preventDefault()

  if (!this.hasValidInput()) return

  const formData = new FormData(this.formTarget)
  this.setLoading(true)

  // Submit via fetch, not traditional form submission
  await fetch(this.formTarget.action, {
    method: 'POST',
    body: formData,
    headers: { 'X-CSRF-Token': document.querySelector('[name="csrf-token"]').content }
  })

  this.resetForm()
  this.setLoading(false)
}
```

The magic happens in the coordination: the form submits asynchronously via fetch, the server processes the message and triggers a Turbo Stream broadcast, and the new message appears in the interface without any page navigation. The user sees their message immediately (via the broadcast callback), while the form resets and prepares for the next message.

This pattern eliminates the jarring experience of traditional form submissions while maintaining Rails' server-side processing model. Users can type and send messages in rapid succession, creating the fluid experience expected in modern chat applications.

## WebSocket infrastructure with Action Cable

Action Cable provides the real-time communication layer with minimal configuration. The channel setup includes authorization logic to ensure users only access conversations they're permitted to see, and connection management handles authentication seamlessly.

```ruby
class ChatChannel < ApplicationCable::Channel
  def subscribed
    if can_user_subscribe?(params[:id])
      stream_from "chat_#{params[:id]}"
    else
      reject
    end
  end
end
```

The authorization pattern ensures security while maintaining simplicity. Users authenticate once through your existing Rails authentication system, and Action Cable leverages those credentials for WebSocket connections.

The streaming pattern `stream_from "chat_#{chat.id}"` creates unique channels for each conversation. This ensures message isolation - users only receive updates for conversations they're actively viewing or participating in.

## Background processing for complex operations

Background jobs handle the heavy lifting that would otherwise slow down user interactions. In our chat system, this means processing user messages, calling external APIs, generating responses, and updating message states - all without blocking the user interface.

The job pattern creates immediate loading feedback, processes the actual work, and broadcasts results back to connected clients. This approach works for any time-consuming operation: AI responses, image processing, data analysis, or external service integration.

```ruby
def perform(user_message_id)
  user_message = ChatMessage.find(user_message_id)
  loading_message = create_loading_message(user_message.chat)

  # Complex processing happens here
  response_data = process_user_message(user_message.content)

  # Results automatically broadcast to all connected clients
  update_message_with_success(loading_message, response_data)
rescue StandardError => e
  handle_error(loading_message, e)
end
```

Error handling becomes straightforward because the job can update the message state to reflect any issues, and those updates automatically propagate to the user interface through the same broadcasting mechanism.

## Putting it all together

The routing configuration connects all these pieces with RESTful patterns that feel natural to Rails developers. Chat resources use nested routes for message operations, maintaining clear URL structure while supporting real-time features.

```ruby
resources :chats, only: [:show] do
  member do
    post :create_message
  end
end
```

The beauty of this architecture is its composability. Want to add file uploads? Create a separate background job and broadcast file processing updates. Need message reactions? Add them to the message model and broadcast changes. Want to integrate AI responses? Process them in background jobs and stream results back.

Each feature builds on the same patterns: server-side logic, background processing for complex operations, and Turbo Streams for real-time updates. This consistency means your team can understand and extend the system without learning new paradigms.

## The typing indicator: A small detail with big impact

One detail that significantly improves user experience is the typing indicator. When someone starts typing a response, other participants see a subtle animation indicating activity. This feature demonstrates how Hotwire handles nuanced real-time interactions.

The implementation uses CSS animations for the visual effect and Turbo Streams for coordination. When a background job begins processing, it creates a message with `is_generating: true`, which renders with the typing animation. When processing completes, the message updates with actual content, and the animation disappears.

```css
.typing-indicator span {
  animation: typing 1.4s infinite ease-in-out;
}
```

This pattern extends to any loading state in your application. Progress indicators, status updates, and completion notifications all use the same broadcast-and-update approach.

## Scaling considerations

As your chat system grows, several patterns help maintain performance and reliability:

**Frontend Performance:**
- Implement message pagination to prevent large conversations from overwhelming the browser
- Use lazy loading for message history and media content
- Consider virtual scrolling for very long conversations

**Backend Scaling:**
- Background job queues handle processing spikes gracefully without blocking user interactions
- Scale background processing independently from your web servers
- Use Action Cable's Redis adapter to support multiple server instances

**Database Optimization:**
- Add proper indexing for efficient message retrieval and chat queries
- Consider read replicas for high-traffic read operations
- Implement database connection pooling for concurrent users

**Real-time Infrastructure:**
- Action Cable's broadcast pattern scales horizontally with Redis integration
- Monitor WebSocket connection counts and implement connection limits per user
- Set up rate limiting for message creation to prevent abuse

**High-Traffic Applications:**
- Consider implementing message batching for extremely busy channels
- Use CDN for static assets and media files
- Monitor memory usage and implement connection cleanup for idle users

The modular design makes it easy to add these optimizations without changing core functionality.

## Wrap-up

We've built a complete real-time chat system using Hotwire that demonstrates the power of Rails' modern frontend stack. The key insights are:

**Server-side control** means your application logic stays where Rails excels, with real-time updates handled through targeted HTML broadcasts rather than complex client-side state management.

**Background processing** enables responsive user interfaces while handling complex operations asynchronously, with results automatically propagating to all connected clients.

**Turbo Streams broadcasting** creates the real-time experience users expect while maintaining Rails' development productivity and architectural simplicity.

**Stimulus enhancements** add just enough client-side behavior to create polished interactions without requiring JavaScript framework expertise.

This implementation showcases how Hotwire enables sophisticated real-time features while maintaining the simplicity and productivity that makes Rails special. The system handles message delivery, background processing, and user interactions without requiring complex JavaScript frameworks or separate API layers.

The beauty of this approach is that it scales naturally with Rails patterns while delivering a modern, real-time user experience that rivals any single-page application. Your team can build, understand, and maintain these features using familiar Rails conventions, making real-time functionality accessible to any Rails developer.

## References

- [Hotwire](https://hotwired.dev/) - Official Hotwire documentation
- [Turbo Handbook](https://turbo.hotwired.dev/) - Complete guide to Turbo Streams and Frames
- [Stimulus Handbook](https://stimulus.hotwired.dev/) - JavaScript framework for Rails applications
- [Action Cable Overview](https://guides.rubyonrails.org/action_cable_overview.html) - Rails WebSocket integration guide
- [Rails Background Jobs](https://guides.rubyonrails.org/active_job_basics.html) - Active Job documentation for background processing
