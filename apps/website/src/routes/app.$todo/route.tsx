import { useParams } from "@remix-run/react";

const TodoRoute = () => {
	const params = useParams();

	return <h1>Hello todo app {params["todo"]}</h1>;
};

export default TodoRoute;
