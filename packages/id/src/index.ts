import { customAlphabet } from "nanoid";

const nanoid = customAlphabet(
	/* cspell:disable-next-line */
	"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
	24,
);

export const generateId = (size?: number) => {
	return nanoid(size);
};
