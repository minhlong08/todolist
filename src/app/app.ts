import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

export interface TodoItem {
  id: number;
  task: string;
  completed: boolean;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  todoList: TodoItem[] = [];
  newTask: string = '';

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
}