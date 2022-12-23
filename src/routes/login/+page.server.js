import { validateData } from '$lib/utils';
import { loginUserDto } from '$lib/schemas';
import { invalid, redirect } from '@sveltejs/kit';

export const load = ({ locals }) => {
	if (locals.pb.authStore.isValid) {
		throw redirect(303, '/');
	}
};

export const actions = {
	login: async ({ request, locals })  => {
		const { formData, errors } = await validateData(await request.formData(), loginUserDto);

		if (errors) {
			return invalid(400, {
				data: formData,
				errors: errors.fieldErrors
			});
		}
		try {
			await locals.pb.collection('users').authWithPassword(formData.email, formData.password);
			if (!locals.pb?.authStore?.model?.verified) {
				locals.pb.authStore.clear();
				return {
					notVerified: true
				};
			}
		} catch (err) {
			console.log('Error: ', err);
			//const e = err as ClientResponseError;

			const { password, ...rest } = formData;

			return {
				data: rest,
				invalidCredentials: true
			};
		}
		throw redirect(303, '/');
	}
};
