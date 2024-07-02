const { Schema, model } = require('mongoose')

// defining the post schema
const postSchema = new Schema({
	email: {
		type: String,
		required: true,
	},
	post: {
		type: String,
		required: true,
	},
	username: {
		type: String,
		required: true,
	},
	createdAt: Date,
})

// exporting the post model
module.exports = model('Post', postSchema)
