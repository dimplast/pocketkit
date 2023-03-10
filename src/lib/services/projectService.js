import { serializeNonPOJOs } from '$lib/utils';
import { serialize } from 'object-to-formdata';
import { ClientResponseError } from 'pocketbase';
import {createProjectDto, updateProjectTags} from '$lib/schemas'
import {validateData} from '$lib/utils'
import {error, redirect} from '@sveltejs/kit'


export const getProjects = async (locals, filter = '') => {

    
	try {
		let projects = serializeNonPOJOs(
			await locals.pb.collection('projects').getFullList(undefined, {
				sort: '-created',
				expand:
					'project_votes(project), projects_technologies(project).technology, project_topics(project), comments(project)',
				filter: filter
			})
		);


      

		projects = projects.map((project) => {
			if (!project.expand?.['project_votes(project)']) {
				project.expand['project_votes(project)'] = [];
			}

			if (!project.expand?.['projects_technologies(project)']) {
				project.expand['projects_technologies(project)'] = [];
			}

			if (!project.expand?.['projects_topics(project)']) {
				project.expand['projects_topics(project)'] = [];
			}
			if (!project.expand?.['comments(project)']) {
				project.expand['comments(project)'] = [];
			}
            
			return project;
		});

       


		return projects;
	} catch (err) {
		console.log('Error:', err);
		if (err instanceof ClientResponseError) {
			throw error(err.status, err.data.message);
		} else {
			throw error(500, 'Something went wrong with fetching the projects.');
		}
	}
};

export const getProject = async (locals, id) => {
	try {
		const project = serializeNonPOJOs(
			await locals.pb.collection('projects').getOne(id, {
				expand:
					'project_votes(project), projects_technologies(project).technology, project_topics(project), comments(project)'
			})
		);
		if (!project.expand?.['project_votes(project)']) {
			project.expand['project_votes(project)'] = [];
		}

		if (!project.expand?.['projects_technologies(project)']) {
			project.expand['projects_technologies(project)'] = [];
		}

		if (!project.expand?.['projects_topics(project)']) {
			project.expand['projects_topics(project)'] = [];
		}
		if (!project.expand?.['comments(project)']) {
			project.expand['comments(project)'] = [];
		}

		return project;
	} catch (err) {
		if (err instanceof ClientResponseError) {
			throw error(err.status, err.data.message);
		} else {
			throw error(500, 'Something went wrong getting the project');
		}
	}
};

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
		const e = err
		throw error(e.status, e.data.message);
	}
};

export const updateProject = async (locals,	request, projectId, redirectTo) => {
	let data = await request.formData();

	const thumb = data.get('thumbnail')

	if (thumb.size === 0) {
		data.delete('thumbnail');
	}

	const { formData, errors } = await validateData(data, createProjectDto);
	
	console.log('formdata from updata project',formData)

	let serializedFormData
	
	const { thumbnail, ...rest } = formData;

	if (errors) {
		return invalid(400, {
			data: rest,
			errors: errors.fieldErrors
		});
	}

	const { formData: tags } = await validateData(data, updateProjectTags, true);

	try {
		formData.user = locals?.user?.id;

		if (formData?.thumbnail?.size === 0) {
			const { thumbnail, ...rest } = formData;
			serializedFormData = serialize(rest);
		} else {
			serializedFormData = serialize(formData);
		}
		await locals.pb.collection('projects').update(projectId, serializedFormData);

		const currentTechnologies = serializeNonPOJOs(
			await locals.pb.collection('projects_technologies').getFullList(undefined, {
				filter: `project = "${projectId}"`
			})
		);

		const currentTopics = serializeNonPOJOs(
			await locals.pb.collection('projects_topics').getFullList(undefined, {
				filter: `project = "${projectId}"`
			})
		);

		const { toCreate: techToCreate, toDelete: techToDelete } = generateCreateDeleteLists(
			currentTechnologies,
			tags.technologies,
			'technology'
		);

		if (techToDelete.length > 0) {
			const deleteTechnologyPromises = Promise.all(
				techToDelete.map((record) => {
					return locals.pb
						.collection('projects_technologies')
						.delete(record, { $autoCancel: false });
				})
			);
			await deleteTechnologyPromises;
		}

		if (techToCreate.length > 0) {
			const createTechnologyPromises = Promise.all(
				techToCreate.map((id) => {
					return locals.pb
						.collection('projects_technologies')
						.create({ project: projectId, technology: id }, { $autoCancel: false });
				})
			);
			await createTechnologyPromises;
		}

		const { toCreate: topicsToCreate, toDelete: topicsToDelete } = generateCreateDeleteLists(
			currentTopics,
			tags.topics,
			'topic'
		);

		if (topicsToDelete.length > 0) {
			const deleteTopicsPromises = Promise.all(
				topicsToDelete.map((record) => {
					return locals.pb.collection('projects_topics').delete(record, { $autoCancel: false });
				})
			);
			await deleteTopicsPromises;
		}

		if (topicsToCreate.length > 0) {
			const createTopicsPromises = Promise.all(
				topicsToCreate.map((id) => {
					return locals.pb
						.collection('projects_topics')
						.create({ project: projectId, topic: id }, { $autoCancel: false });
				})
			);
			await createTopicsPromises;
		}
	} catch (err) {
		console.log('Error:', err);
		//const e = err as ClientResponseError;
		//throw error(err.status, err.data.message);
	}

	throw redirect(303, redirectTo);
};

export const updateProjectVote = async (locals, projectId) => {
	try {
		const existingVote = await locals.pb.collection('project_votes').getFullList(1, {
			filter: `user = "${locals?.user?.id}" && project = "${projectId}"`,
			sort: '-created'
		});
		if (existingVote.length < 1) {
			await locals.pb.collection('project_votes').create({
				user: locals?.user?.id,
				project: projectId
			});
		} else {
			const vote = serializeNonPOJOs(existingVote[0]);
			await locals.pb.collection('project_votes').delete(vote.id);
		}
	} catch (err) {
		console.log('Error:', err);
		throw error(500, 'Something went wrong with voting.');
	}
};

export const getUsersProjects = async (locals) => {
	try {
		let projects = serializeNonPOJOs(
			await locals.pb.collection('projects').getFullList(undefined, {
				expand:
					'project_votes(project), projects_technologies(project).technology, project_topics(project), comments(project)',
				filter: `user = "${locals?.user?.id}"`
			})
		);
		projects = projects.map((project) => {
			if (!project.expand?.['project_votes(project)']) {
				project.expand['project_votes(project)'] = [];
			}

			if (!project.expand?.['projects_technologies(project)']) {
				project.expand['projects_technologies(project)'] = [];
			}

			if (!project.expand?.['projects_topics(project)']) {
				project.expand['projects_topics(project)'] = [];
			}
			if (!project.expand?.['comments(project)']) {
				project.expand['comments(project)'] = [];
			}
			return project;
		});
		return projects;
	} catch (err) {
		console.log('Error:', err);
		//const e = err as ClientResponseError;
		throw error(err.status, err.data.message);
	}
};

export const deleteRecord = async (locals, collectionName, recordId, redirectTo) => {
	try {
		await locals.pb.collection(collectionName).delete(recordId);
	} catch (err) {
		console.log('Error:', err);
		//const e = err as ClientResponseError;
		throw error(err.status, err.data.message);
	}
	throw redirect(303, redirectTo);
};