import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TodoCard } from '@/features/todo/ui/TodoCard';
import { createTodo } from '@/test/factories/todo';
import { marked } from 'marked';

describe('TodoCard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows locked reason when dependency is incomplete', async () => {
    const todo = createTodo({
      dependency: ['dep-1'],
      status: 'Unlocked',
    });
    const dependency = createTodo({ id: 'dep-1', title: '先行タスク', status: 'Locked' });

    render(
      <TodoCard
        todo={todo}
        dependentTodos={[dependency]}
        filter="locked"
        selected={false}
        isExpanded={false}
        currentInProgressId={null}
        onSelect={vi.fn()}
        onExpandedChange={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onComplete={vi.fn()}
        onStartTodo={vi.fn()}
      />,
    );

    expect(await screen.findByText('依存タスク「先行タスク」が未完了です。')).toBeInTheDocument();
  });

  it('triggers start action from button', () => {
    const onStartTodo = vi.fn();
    const todo = createTodo({ status: 'Unlocked' });

    render(
      <TodoCard
        todo={todo}
        dependentTodos={[]}
        filter="unlocked"
        selected
        isExpanded={false}
        currentInProgressId={null}
        onSelect={vi.fn()}
        onExpandedChange={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onComplete={vi.fn()}
        onStartTodo={onStartTodo}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '着手' }));

    expect(onStartTodo).toHaveBeenCalledWith(todo.id);
  });

  it('renders meeting card without normal-task controls', () => {
    const meeting = createTodo({
      id: 'meeting-1',
      taskType: 'Meeting',
      status: 'Unlocked',
      startableAt: '2026-04-04T09:00:00.000Z',
      dueDate: '2026-04-04T11:00:00.000Z',
    });

    render(
      <TodoCard
        todo={meeting}
        dependentTodos={[]}
        filter="unlocked"
        selected={false}
        isExpanded={false}
        currentInProgressId={null}
        onSelect={vi.fn()}
        onExpandedChange={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onComplete={vi.fn()}
        onStartTodo={vi.fn()}
      />,
    );

    expect(screen.getByText('開始日時:')).toBeInTheDocument();
    expect(screen.queryByText('工数:')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '着手' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '完了' })).not.toBeInTheDocument();
  });

  it('handles markdown parse promise and description toggle', async () => {
    vi.spyOn(marked, 'parse').mockImplementation((text: string) =>
      Promise.resolve(`<p>${text}</p>`),
    );
    const onExpandedChange = vi.fn();

    const longDescriptionTodo = createTodo({
      description: 'a'.repeat(120),
    });

    render(
      <TodoCard
        todo={longDescriptionTodo}
        dependentTodos={[]}
        filter="all"
        selected={false}
        isExpanded={false}
        currentInProgressId={null}
        onSelect={vi.fn()}
        onExpandedChange={onExpandedChange}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onComplete={vi.fn()}
        onStartTodo={vi.fn()}
      />,
    );

    const expandButton = await screen.findByRole('button', { name: '展開' });
    fireEvent.click(expandButton);
    expect(onExpandedChange).toHaveBeenCalledWith(longDescriptionTodo.id, true);
  });

  it('renders collapse label when expanded', async () => {
    const longDescriptionTodo = createTodo({
      description: 'a'.repeat(120),
    });

    render(
      <TodoCard
        todo={longDescriptionTodo}
        dependentTodos={[]}
        filter="all"
        selected={false}
        isExpanded
        currentInProgressId={null}
        onSelect={vi.fn()}
        onExpandedChange={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onComplete={vi.fn()}
        onStartTodo={vi.fn()}
      />,
    );

    expect(await screen.findByRole('button', { name: '折りたたむ' })).toBeInTheDocument();
  });

  it('invokes select, edit, delete and complete handlers', () => {
    const onSelect = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onComplete = vi.fn();
    const todo = createTodo({ status: 'Unlocked' });

    render(
      <TodoCard
        todo={todo}
        dependentTodos={[]}
        filter="unlocked"
        selected={false}
        isExpanded={false}
        currentInProgressId={null}
        onSelect={onSelect}
        onExpandedChange={vi.fn()}
        onEdit={onEdit}
        onDelete={onDelete}
        onComplete={onComplete}
        onStartTodo={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('option'));
    fireEvent.click(screen.getByRole('button', { name: '編集' }));
    fireEvent.click(screen.getByRole('button', { name: '削除' }));
    fireEvent.click(screen.getByRole('button', { name: '完了' }));

    expect(onSelect).toHaveBeenCalledWith(todo.id);
    expect(onEdit).toHaveBeenCalledWith(todo.id);
    expect(onDelete).toHaveBeenCalledWith(todo.id);
    expect(onComplete).toHaveBeenCalledWith(todo.id);
  });
});
