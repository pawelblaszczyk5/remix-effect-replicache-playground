export type Todo = {
	createdAt: number;
	id: string;
	isCompleted: boolean;
	isPrivate: boolean;
	owner: string;
	text: string;
};

export type CreateTodoData = Pick<Todo, "createdAt" | "id" | "isPrivate" | "owner" | "text">;
export type DeleteTodoData = Todo["id"];
export type UpdateTodoCompletionData = Pick<Todo, "id" | "isCompleted">;
