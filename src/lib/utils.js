
const { randomBytes } = await import('node:crypto');


export const serializeNonPOJOs = (obj) => {
	return structuredClone(obj);
};

export const generateUsername = (name) => {
	const id = randomBytes(2).toString('hex');
	return `${name.slice(0, 5)}${id}`;
};


export const validateData = async (formData, schema, zfd = false) => {
	const body = Object.fromEntries(formData);

	if (zfd) {
		try {
			const data = schema.parse(formData);
			return {
				formData: data,
				errors: null
			};
		} catch (err) {
			console.log('Error:', err);
			//const errors = (err as ZodError).flatten();
			return {
				formData,
				errors
			};
		}
	} else {
		try {
			const data = schema.parse(body);
			return {
				formData: data,
				errors: null
			};
		} catch (err) {
			console.log('Error:', err);
			//const errors = (err as ZodError).flatten();
			return {
				formData: body,
				errors
			};
		}
	}
};

