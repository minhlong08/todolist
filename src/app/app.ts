import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

export interface TodoItem {
  id: number;
  task: string;
  completed: boolean;
}

export interface ChatMessage {
  id: number;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule, CommonModule, HttpClientModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  // Todo functionality
  todoList: TodoItem[] = [];
  newTask: string = '';
  
  // Chat functionality
  chatMessages: ChatMessage[] = [];
  newMessage: string = '';
  isLoading: boolean = false;
  isChatOpen: boolean = false;
  
  // Hugging Face API configuration
  // TODO: Replace with your actual Hugging Face API key from https://huggingface.co/settings/tokens
  private readonly HF_API_KEY = '';
  // Using a more powerful model for better conversations
  private readonly HF_API_URL = 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-large';

  constructor(private http: HttpClient) {
    // Add welcome message with app guidance
    this.chatMessages.push({
      id: Date.now(),
      content: "👋 Hi! I'm your personal productivity assistant! I can help you:\n\n📝 Manage your todos (add, delete, organize)\n⏰ Set priorities and deadlines\n📊 Track your progress\n💡 Give productivity tips\n🎯 Break down complex tasks\n\nTry asking me: 'Help me organize my day' or 'Add a task to call mom'",
      isUser: false,
      timestamp: new Date()
    });
  }

  // Todo functionality methods
  addTask(taskText: string): void {
    if (taskText && taskText.trim() !== '') {
      const newTodoItem: TodoItem = {
        id: Date.now(),
        task: taskText.trim(),
        completed: false
      };

      this.todoList.push(newTodoItem);
    }
  }

  deleteTask(id: number): void {
    this.todoList = this.todoList.filter(item => item.id !== id);
  }

  toggleCompleted(id: number): void {
    const todoItem = this.todoList.find(item => item.id === id);
    if (todoItem) {
      todoItem.completed = !todoItem.completed;
    }
  }

  getCompletedCount(): number {
    return this.todoList.filter(item => item.completed).length;
  }

  trackByFn(index: number, item: TodoItem): number {
    return item.id;
  }

  // Chat functionality methods
  toggleChat(): void {
    this.isChatOpen = !this.isChatOpen;
  }

  async sendMessage(): Promise<void> {
    if (!this.newMessage.trim() || this.isLoading) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now(),
      content: this.newMessage.trim(),
      isUser: true,
      timestamp: new Date()
    };
    this.chatMessages.push(userMessage);
    
    const messageToSend = this.newMessage.trim();
    this.newMessage = '';
    this.isLoading = true;

    try {
      // Always try to handle as a productivity/todo assistant first
      const aiResponse = await this.handleAsProductivityAssistant(messageToSend);
      this.addAIResponse(aiResponse);
    } catch (error) {
      console.error('Error sending message:', error);
      this.addAIResponse("Sorry, I'm having trouble processing that. Could you try rephrasing your request?");
    } finally {
      this.isLoading = false;
      this.scrollToBottom();
    }
  }

  private async handleAsProductivityAssistant(message: string): Promise<string> {
    const lowerMessage = message.toLowerCase();
    
    // Direct todo commands
    if (this.isTodoRelatedMessage(message)) {
      return this.handleTodoCommand(message);
    }
    
    // Productivity and organization help
    if (lowerMessage.includes('organize') || lowerMessage.includes('plan') || lowerMessage.includes('schedule')) {
      return this.handleOrganizationHelp(message);
    }
    
    // Motivation and productivity tips
    if (lowerMessage.includes('motivat') || lowerMessage.includes('productiv') || lowerMessage.includes('focus')) {
      return this.handleMotivationHelp(message);
    }
    
    // Break down complex tasks
    if (lowerMessage.includes('break down') || lowerMessage.includes('complex') || lowerMessage.includes('overwhelm')) {
      return this.handleTaskBreakdown(message);
    }
    
    // Time management
    if (lowerMessage.includes('time') || lowerMessage.includes('deadline') || lowerMessage.includes('priority')) {
      return this.handleTimeManagement(message);
    }
    
    // Progress tracking
    if (lowerMessage.includes('progress') || lowerMessage.includes('status') || lowerMessage.includes('done')) {
      return this.handleProgressTracking();
    }
    
    // General greetings and conversation
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return this.handleGreeting();
    }
    
    // Help requests
    if (lowerMessage.includes('help') || lowerMessage.includes('what can') || lowerMessage.includes('how')) {
      return this.handleHelpRequest(message);
    }
    
    // If no specific pattern matches, try Hugging Face API or provide contextual help
    if (this.HF_API_KEY && this.HF_API_KEY !== '') {
      const apiResponse = await this.callHuggingFaceAPI(message);
      // Enhance API response with productivity context
      return this.enhanceWithProductivityContext(apiResponse, message);
    }
    
    return this.getContextualFallbackResponse(message);
  }

  private isTodoRelatedMessage(message: string): boolean {
    const todoKeywords = ['todo', 'task', 'add', 'delete', 'complete', 'list', 'show', 'remove'];
    return todoKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  private handleTodoCommand(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('add') && (lowerMessage.includes('task') || lowerMessage.includes('todo'))) {
      // Extract task from message
      const taskMatch = message.match(/add.*(?:task|todo)[:\s]+(.+)/i) || 
                       message.match(/add[:\s]+(.+)/i);
      if (taskMatch) {
        const task = taskMatch[1].trim();
        this.addTask(task);
        return `✅ I've added "${task}" to your todo list!`;
      }
      return "What task would you like me to add? Try: 'add task: buy groceries'";
    }
    
    if (lowerMessage.includes('list') || lowerMessage.includes('show')) {
      if (this.todoList.length === 0) {
        return "📝 Your todo list is empty. Would you like to add some tasks?";
      }
      const incompleteTasks = this.todoList.filter(t => !t.completed);
      const completedTasks = this.todoList.filter(t => t.completed);
      
      let response = `📋 You have ${incompleteTasks.length} pending tasks:\n`;
      incompleteTasks.forEach((task, index) => {
        response += `${index + 1}. ${task.task}\n`;
      });
      
      if (completedTasks.length > 0) {
        response += `\n✅ And ${completedTasks.length} completed tasks.`;
      }
      
      return response;
    }
    
    if (lowerMessage.includes('complete') || lowerMessage.includes('done')) {
      const incompleteTasks = this.todoList.filter(t => !t.completed);
      if (incompleteTasks.length === 0) {
        return "🎉 All your tasks are already completed! Great job!";
      }
      return `Which task would you like to mark as complete? You have: ${incompleteTasks.map(t => `"${t.task}"`).join(', ')}`;
    }
    
    if (lowerMessage.includes('delete') || lowerMessage.includes('remove')) {
      if (this.todoList.length === 0) {
        return "📝 Your todo list is empty, nothing to delete.";
      }
      return `Which task would you like to delete? You have: ${this.todoList.map(t => `"${t.task}"`).join(', ')}`;
    }
    
    return "🤖 I can help you manage your todos! Try saying:\n• 'add task: buy milk'\n• 'show my tasks'\n• 'list todos'\n• 'complete [task name]'";
  }

  private handleOrganizationHelp(message: string): string {
    const incompleteTasks = this.todoList.filter(t => !t.completed);
    
    if (incompleteTasks.length === 0) {
      return "🎉 You're all caught up! No pending tasks. Here are some suggestions:\n\n• Plan tomorrow's priorities\n• Review your completed tasks\n• Set new goals\n• Take a well-deserved break!\n\nWhat would you like to focus on next?";
    }
    
    if (incompleteTasks.length <= 3) {
      return `📋 You have ${incompleteTasks.length} tasks - very manageable! Here's my suggestion:\n\n` +
             incompleteTasks.map((task, i) => `${i + 1}. ${task.task}`).join('\n') +
             `\n\n💡 Try tackling them in order, or start with the most important one. Which would you prefer?`;
    }
    
    return `📊 You have ${incompleteTasks.length} pending tasks. Let me help you organize:\n\n` +
           `🔥 Urgent: Which tasks have deadlines?\n` +
           `⚡ Quick wins: Which can be done in under 15 minutes?\n` +
           `🎯 Important: Which will have the biggest impact?\n\n` +
           `Would you like me to help you prioritize or break any of these down into smaller steps?`;
  }

  private handleMotivationHelp(message: string): string {
    const completedCount = this.getCompletedCount();
    const totalTasks = this.todoList.length;
    
    const motivationalTips = [
      `💪 Remember: Every small step counts! You've already completed ${completedCount} tasks.`,
      `🎯 Focus on progress, not perfection. What's one small thing you can do right now?`,
      `⚡ Try the 2-minute rule: If it takes less than 2 minutes, do it now!`,
      `🍅 Consider using the Pomodoro technique: 25 minutes of focused work, then a 5-minute break.`,
      `🏆 Celebrate your wins! You've made real progress today.`,
      `🚀 Start with the easiest task to build momentum, then tackle the harder ones.`
    ];
    
    let response = motivationalTips[Math.floor(Math.random() * motivationalTips.length)];
    
    if (totalTasks > 0) {
      const progressPercent = Math.round((completedCount / totalTasks) * 100);
      response += `\n\n📈 You're ${progressPercent}% done with your current tasks!`;
      
      if (progressPercent >= 80) {
        response += " You're almost there! 🎉";
      } else if (progressPercent >= 50) {
        response += " You're over halfway - keep going! 💪";
      }
    }
    
    response += "\n\nWhat's holding you back? I can help you tackle it!";
    return response;
  }

  private handleTaskBreakdown(message: string): string {
    const incompleteTasks = this.todoList.filter(t => !t.completed);
    
    if (incompleteTasks.length === 0) {
      return "🎯 I'd love to help break down a complex task! First, add the main task to your list, then I can help you break it into smaller, manageable steps.\n\nFor example, if you have 'Plan vacation', I can help break it down into:\n• Research destinations\n• Check budget\n• Book flights\n• Reserve accommodation\n\nWhat task would you like to work on?";
    }
    
    return `🔍 I can help break down any of these tasks into smaller steps:\n\n` +
           incompleteTasks.map((task, i) => `${i + 1}. ${task.task}`).join('\n') +
           `\n\n💡 Which task feels overwhelming or complex? I'll help you break it down into manageable pieces.\n\n` +
           `Or tell me about a new complex task you're thinking about!`;
  }

  private handleTimeManagement(message: string): string {
    const timeManagementTips = [
      "⏰ Time Management Tips:\n\n🎯 Prioritize using the Eisenhower Matrix:\n• Urgent + Important = Do first\n• Important + Not urgent = Schedule\n• Urgent + Not important = Delegate\n• Neither = Eliminate",
      
      "📅 Daily Planning Strategy:\n\n🌅 Morning: Plan your top 3 priorities\n⚡ Afternoon: Handle quick tasks\n🌙 Evening: Review and prepare for tomorrow\n\n💡 Always leave buffer time between tasks!",
      
      "🍅 Try Time-Boxing:\n\n• Pomodoro: 25 min work, 5 min break\n• Time blocks: Assign specific hours to specific tasks\n• Batch similar tasks together\n• Set boundaries and stick to them!"
    ];
    
    const tip = timeManagementTips[Math.floor(Math.random() * timeManagementTips.length)];
    return tip + "\n\nWhich aspect of time management would you like to focus on?";
  }

  private handleProgressTracking(): string {
    const totalTasks = this.todoList.length;
    const completedTasks = this.getCompletedCount();
    const pendingTasks = totalTasks - completedTasks;
    
    if (totalTasks === 0) {
      return "📊 No tasks yet! Ready to start planning your day?\n\n💡 Here's how to get started:\n• Add 3-5 important tasks for today\n• Break large tasks into smaller steps\n• Prioritize by importance and urgency\n\nWhat's your first priority?";
    }
    
    let response = `📈 Progress Report:\n\n`;
    response += `✅ Completed: ${completedTasks} tasks\n`;
    response += `⏳ Pending: ${pendingTasks} tasks\n`;
    response += `📊 Progress: ${Math.round((completedTasks / totalTasks) * 100)}%\n\n`;
    
    if (completedTasks === 0) {
      response += "🚀 Ready to get started? Pick your first task and let's build some momentum!";
    } else if (completedTasks === totalTasks) {
      response += "🎉 Congratulations! You've completed everything! Time to:\n• Add new goals\n• Plan tomorrow\n• Celebrate your achievement!";
    } else if (completedTasks / totalTasks >= 0.7) {
      response += "💪 You're doing great! Almost there - just a few more tasks to go!";
    } else {
      response += "📋 Keep going! You've made progress. What would you like to tackle next?";
    }
    
    return response;
  }

  private handleGreeting(): string {
    const greetings = [
      "👋 Hello! Ready to be productive today? I'm here to help you stay organized!",
      "🌟 Hi there! Let's make today amazing. What would you like to accomplish?",
      "🚀 Hey! I'm your productivity partner. How can I help you get things done?",
      "💪 Hello! Ready to tackle your goals? I'm here to help you stay focused!"
    ];
    
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    const taskCount = this.todoList.filter(t => !t.completed).length;
    
    if (taskCount > 0) {
      return `${greeting}\n\n📝 You have ${taskCount} pending tasks. Want to review them or add something new?`;
    }
    
    return `${greeting}\n\n🎯 Your slate is clean! What would you like to focus on today?`;
  }

  private handleHelpRequest(message: string): string {
    return `🤖 I'm your AI productivity assistant! Here's what I can help you with:\n\n` +
           `📝 **Task Management:**\n• "Add task: buy groceries"\n• "Show my tasks"\n• "Help me prioritize"\n\n` +
           `⏰ **Time Management:**\n• "How should I organize my day?"\n• "I need help with deadlines"\n• "Time management tips"\n\n` +
           `🎯 **Productivity:**\n• "I'm feeling overwhelmed"\n• "Break down this complex task"\n• "I need motivation"\n\n` +
           `📊 **Progress Tracking:**\n• "Show my progress"\n• "How am I doing?"\n\n` +
           `Just ask me anything about productivity, tasks, or organization!`;
  }

  private async callHuggingFaceAPI(message: string): Promise<string> {
    // Check if API key is properly configured
    if (!this.HF_API_KEY || this.HF_API_KEY === '') {
      return this.getFallbackResponse(message);
    }

    const headers = {
      'Authorization': `Bearer ${this.HF_API_KEY}`,
      'Content-Type': 'application/json'
    };

    const payload = {
      inputs: message,
      parameters: {
        max_length: 100,
        temperature: 0.7,
        do_sample: true,
        return_full_text: false
      }
    };

    try {
      const response = await this.http.post<any>(this.HF_API_URL, payload, { headers }).toPromise();
      
      if (response && response.length > 0) {
        if (response[0].generated_text) {
          return response[0].generated_text.trim() || this.getFallbackResponse(message);
        }
        if (response[0].error) {
          console.error('Hugging Face API Error:', response[0].error);
          return this.getFallbackResponse(message);
        }
      }
      
      return this.getFallbackResponse(message);
    } catch (error) {
      console.error('Error calling Hugging Face API:', error);
      return this.getFallbackResponse(message);
    }
  }

  private enhanceWithProductivityContext(apiResponse: string, originalMessage: string): string {
    const taskCount = this.todoList.filter(t => !t.completed).length;
    let enhancement = "";
    
    if (taskCount > 0 && !apiResponse.toLowerCase().includes('task')) {
      enhancement = `\n\n📝 By the way, you have ${taskCount} pending tasks. Need help managing them?`;
    }
    
    return apiResponse + enhancement;
  }

  private getContextualFallbackResponse(message: string): string {
    const contextualResponses = [
      "🤔 I understand you're asking about that. As your productivity assistant, how can I help you turn this into actionable steps?",
      "💡 That's interesting! Is there a task or goal related to this that I can help you organize?",
      "🎯 I see what you mean. Would you like me to help you create a plan or add this to your task list?",
      "📝 Got it! Is there something specific you'd like to accomplish related to this?",
      "⚡ I understand. How can I help you take action on this? Should we break it down into tasks?"
    ];
    
    const response = contextualResponses[Math.floor(Math.random() * contextualResponses.length)];
    const taskCount = this.todoList.filter(t => !t.completed).length;
    
    if (taskCount > 0) {
      return `${response}\n\n📊 Current status: ${taskCount} pending tasks. Want to review them?`;
    }
    
    return response + "\n\n🚀 Ready to add some goals to your list?";
  }

  private getFallbackResponse(message: string): string {
    const fallbackResponses = [
      "That's interesting! Tell me more about that.",
      "I see what you mean. How can I help you with that?",
      "Thanks for sharing that with me! Is there anything specific you'd like assistance with?",
      "I'm here to help. What would you like to know?",
      "That sounds great! Anything else I can help you with today?",
      "I understand. Feel free to ask me about managing your todos or anything else!",
      "Interesting perspective! How does that relate to your daily tasks?",
      "Got it! Is there a way I can assist you with that?"
    ];
    
    // Add a note about API key if it's not configured
    const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    
    if (!this.HF_API_KEY || this.HF_API_KEY === '') {
      return `${randomResponse}\n\n💡 Note: To enable full AI conversations, please add your Hugging Face API key in the app.ts file.`;
    }
    
    return randomResponse;
  }

  private addAIResponse(response: string): void {
    const aiMessage: ChatMessage = {
      id: Date.now(),
      content: response,
      isUser: false,
      timestamp: new Date()
    };
    this.chatMessages.push(aiMessage);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const chatMessages = document.querySelector('.chat-messages');
      if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }, 100);
  }

  trackChatByFn(index: number, item: ChatMessage): number {
    return item.id;
  }
}