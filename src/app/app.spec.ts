import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should add a new task', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    
    app.addTask('Test task');
    expect(app.todoList.length).toBe(1);
    expect(app.todoList[0].task).toBe('Test task');
    expect(app.todoList[0].completed).toBeFalsy();
  });

  it('should delete a task', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    
    app.addTask('Test task');
    const taskId = app.todoList[0].id;
    app.deleteTask(taskId);
    
    expect(app.todoList.length).toBe(0);
  });

  it('should toggle task completion', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    
    app.addTask('Test task');
    const taskId = app.todoList[0].id;
    
    expect(app.todoList[0].completed).toBeFalsy();
    app.toggleCompleted(taskId);
    expect(app.todoList[0].completed).toBeTruthy();
    
    app.toggleCompleted(taskId);
    expect(app.todoList[0].completed).toBeFalsy();
  });

  it('should not add empty tasks', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    
    app.addTask('   ');
    expect(app.todoList.length).toBe(0);
  });
});