import { createCommentDto, updateCommentDto } from '$lib/schemas';
import { serializeNonPOJOs, validateData } from '$lib/utils';
import { error, invalid } from '@sveltejs/kit';
import { ClientResponseError } from 'pocketbase';

export const getComments = async (locals, projectId) => {
	try {
		let commentReplies = serializeNonPOJOs(
			await locals.pb.collection('comment_replies').getFullList(undefined, {
				sort: '-created',
				filter: `comment.project = "${projectId}"`,
				expand: 'reply, reply.comment_votes(comment), reply.user'
			})
		);

		const replyIdFilter = commentReplies
			.map((commentReply) => `id != "${commentReply.expand?.reply?.id}"`)
			.join(' && ');

		let comments

		if (replyIdFilter) {
			comments = serializeNonPOJOs(
				await locals.pb.collection('comments').getFullList(undefined, {
					sort: '-created',
					filter: `project = "${projectId}" && (${replyIdFilter})`,
					expand:
						'user, comment_replies(comment).reply.user, comment_votes(comment), comment_replies(comment).reply'
				})
			);

			comments.forEach((comment) => {
				comment.expand['comment_replies(comment)'] = comment.expand[
					'comment_replies(comment)'
				]?.map((commentReply) => {
					let updatedReply;
					commentReplies.forEach((reply) => {
						if (reply.id === commentReply?.id) {
							if (reply.expand.reply) {
								if (reply.expand?.reply?.expand['comment_votes(comment)']) {
									updatedReply = reply;
								} else {
									reply.expand.reply.expand['comment_votes(comment)'] = [];
									updatedReply = reply;
								}
							}
						}
					});
					return updatedReply;
				});
			});
		} else {
			comments = serializeNonPOJOs(
				await locals.pb.collection('comments').getFullList(undefined, {
					sort: '-created',
					filter: `project = "${projectId}"`,
					expand: 'user, comment_replies(comment).reply.user, comment_votes(comment)'
				})
			);
		}

		comments = comments.map((comment) => {
			if (!comment.expand?.['comment_replies(comment)']) {
				comment.expand['comment_replies(comment)'] = [];
			}
			if (!comment.expand?.['comment_votes(comment)']) {
				comment.expand['comment_votes(comment)'] = [];
			}
			return comment;
		});

		return comments;
	} catch (err) {
		console.log('Error: ', err);
		//const e = err as ClientResponseError;
		throw error(err.status);
	}
};

export const createComment = async (locals,	request, projectId) => {

	const body = await request.formData();
	body.append('user', locals.user.id);
	body.append('project', projectId);

	const { formData, errors } = await validateData(body, createCommentDto);

	if (errors) {
		return invalid(400, {
			data: formData,
			errors: errors.fieldErrors
		});
	}

	try {
		await locals.pb.collection('comments').create(formData);
		return {
			success: true
		};
	} catch (err) {
		console.log('Error:', err);

		//const e = err as ClientResponseError;
		throw error(err.status, err.data.message);
	}
};

export const updateComment = async (locals,	request) => {
	const { formData, errors } = await validateData(await request.formData(), updateCommentDto);

	if (errors) {
		return invalid(400, {
			updateData: formData,
			updateErrors: errors.fieldErrors
		});
	}

	try {
		await locals.pb.collection('comments').update(formData.id, formData);
		return {
			success: true
		};
	} catch (err) {
		console.log('Error:', err);
		//const e = err as ClientResponseError;
		throw error(err.status, err.data.message);
	}
};

export const createReply = async (locals, request) => {
	
    const { formData, errors } = await validateData(await request.formData(), createCommentDto);

	if (errors) {
		return invalid(400, {
			data: formData,
			errors: errors.fieldErrors
		});
	}
	let createdCommentId

	try {
		if (formData.parentId) {
			const { id } = await locals.pb.collection('comments').create(formData);
			createdCommentId = id;
			await locals.pb
				.collection('comment_replies')
				.create({ comment: formData.parentId, reply: id });

			return {
				success: true
			};
		}

		throw error(400, 'A reply must have a parentId');
	} catch (err) {
		console.log('Error:', err);

		//TODO: Check ClientResponseError for failure to create reply, then delete comment before throwing
		if (err instanceof ClientResponseError) {
			throw error(err.status, err.data.message);
		}

		throw error(400, 'A reply must have a parent!');
	}
};

export const deleteComment = async (locals, id) => {

	console.log('DEEEEEELLLLLLEEEETTTTEEEEEE------------------------------------')
	try {
		const comment = serializeNonPOJOs(
			await locals.pb.collection('comments').getOne(id, {
				expand: 'comment_replies(comment).reply'
			})
		);

		if (comment.expand['comment_replies(comment)']) {
			if (comment.expand['comment_replies(comment)'].length > 0) {
				for (const commentReply of comment.expand['comment_replies(comment)']) {
					if (commentReply) {
						await locals.pb.collection('comments').delete(commentReply.expand.reply.id);
					}
				}
			}
		}

		await locals.pb.collection('comments').delete(comment.id);
	} catch (err) {
		if (err instanceof ClientResponseError) {
			throw error(err.status, err.data.message);
		} else {
			throw error(500, 'Something went wrong while deleting your comment.');
		}
	}
};

export const updateCommentVote = async (locals, commentId) => {
	try {
		const existingVote = await locals.pb.collection('comment_votes').getFullList(1, {
			filter: `user = "${locals?.user?.id}" && comment = "${commentId}"`,
			sort: '-created'
		});
		if (existingVote.length < 1) {
			await locals.pb.collection('comment_votes').create({
				user: locals?.user?.id,
				comment: commentId
			});
		} else {
			const vote = serializeNonPOJOs(existingVote[0]);
			await locals.pb.collection('comment_votes').delete(vote.id);
		}
	} catch (err) {
		console.log('Error:', err);
		throw error(500, 'Something went wrong with voting.');
	}
};
