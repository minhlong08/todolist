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
  private readonly HF_API_URL = 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium';

  constructor(private http: HttpClient) {
    // Add welcome message
    this.chatMessages.push({
      id: Date.now(),
      content: "Hi! I'm your AI assistant. I can help you manage your todos or just chat with you. How can I help?",
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
      // Check if message is todo-related and handle it
      if (this.isTodoRelatedMessage(messageToSend)) {
        const response = this.handleTodoCommand(messageToSend);
        this.addAIResponse(response);
      } else {
        // Send to Hugging Face API
        const aiResponse = await this.callHuggingFaceAPI(messageToSend);
        this.addAIResponse(aiResponse);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      this.addAIResponse("Sorry, I'm having trouble connecting right now. Please try again later.");
    } finally {
      this.isLoading = false;
      this.scrollToBottom();
    }
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