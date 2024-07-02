const express = require('express')
const router = express.Router()
const { hash, compare } = require('bcryptjs')
// importing the helper functions
const {
	createAccessToken,
	createRefreshToken,
	sendAccessToken,
	sendRefreshToken,
	createPasswordResetToken,
} = require('../utils/tokens')
// importing the user model
const {
	transporter,
	createPasswordResetUrl,
	passwordResetTemplate,
	passwordResetConfirmationTemplate,
	accountCreated,
} = require('../utils/email')
const User = require('../models/user')
const Post = require('../models/posts')

const { verify } = require('jsonwebtoken')
const { protected } = require('../utils/protected')

router.get('/posts', async (req, res) => {
	try {
		const posts = await Post.find()
		res.json(posts)
	} catch (error) {
		res.status(500).json({ message: 'Error fetching posts!' })
	}
})
// Sign In request
router.post('/signin', async (req, res) => {
	try {
		const { email, password } = req.body
		// 1. check if user exists

		const user = await User.findOne({ email: email })
		// console.log(user)

		// if user doesn't exist, return error
		if (!user) return res.render('login_page', { message: "User doesn't exist! 😢", type: 'warning' })
		// 2. if user exists, check if password is correct
		const isMatch = await compare(password, user.password)

		// if password is incorrect, return error
		if (!isMatch) return res.render('login_page', { message: 'Password is incorrect! ⚠️', type: 'warning' })

		// 3. if password is correct, create the tokens
		const accessToken = createAccessToken(user._id)
		const refreshToken = createRefreshToken(user._id)

		// 4. put refresh token in database
		user.refreshtoken = refreshToken
		await user.save()

		// 5. send the response
		sendRefreshToken(res, refreshToken)
		// sendAccessToken(req, res, accessToken)

		res.render('home_page', {
			user: { email: user.email, refreshtoken: user.refreshtoken, username: user.username },
		})
	} catch (error) {
		res.render('login_page', { message: 'Error signing in!', type: 'warning' })
	}
})
router.post('/create-post', async (req, res) => {
	try {
		const { email, post, username } = req.body
		const currentDate = new Date()

		const newPost = new Post({ email, post, username, createdAt: currentDate })

		try {
			await newPost.save()
		} catch (error) {
			console.error(error)
		}

		res.json({ message: 'Post created successfully!' })
	} catch (error) {
		console.error('Error creating post:', error)
		res.status(500).json({ message: 'Error creating post!' })
	}
})
// Sign Up request
router.post('/signup', async (req, res) => {
	try {
		const { email, password, username } = req.body
		// 1. check if user already exists
		const user = await User.findOne({ email: email })
		const userByUsername = await User.findOne({ username: username })
		// if user exists already, return error
		if (user) {
			res.render('register_page', { message: 'User already exists! Try logging in. 😄', type: 'warning' })
		} else if (userByUsername) {
			res.render('register_page', { message: 'Username already exists! Try a different one. 😄', type: 'warning' })
		} else {
			// 2. if user doesn't exist, create a new user
			// hashing the password
			const passwordHash = await hash(password, 10)
			const newUser = new User({
				email: email,
				username: username,
				password: passwordHash,
			})
			// 3. save the user to the database
			await newUser.save()
			const emailConfirmation = accountCreated(newUser)
			transporter.sendMail(emailConfirmation, (err, info) => {
				if (err)
					return res.status(500).json({
						message: 'Error sending email! 😢',
						type: 'error',
					})
				return res.json({
					message: 'Email sent! 📧',
					type: 'success',
				})
			})
			// 4. send the response
			// res.redirect('/login')
			res.render('login_page', { message: 'User created successfully! 🥳 You can log in now' })
		}
	} catch (error) {
		res.render('register_page', { message: 'Error creating user!', type: 'error' })
	}
})

// Sign Out request

router.post('/logout', (_req, res) => {
	// clear cookies
	res.clearCookie('refreshtoken')
	res.redirect('/login')
})

// Refresh Token request
router.post('/refresh_token', async (req, res) => {
	try {
		const { refreshtoken } = req.cookies
		// if we don't have a refresh token, return error
		if (!refreshtoken)
			return res.status(500).json({
				message: 'No refresh token! 🤔',
				type: 'error',
			})
		// if we have a refresh token, you have to verify it
		let id
		try {
			id = verify(refreshtoken, process.env.REFRESH_TOKEN_SECRET).id
		} catch (error) {
			return res.status(500).json({
				message: 'Invalid refresh token! 🤔',
				type: 'error',
			})
		}
		// if the refresh token is invalid, return error
		if (!id)
			return res.status(500).json({
				message: 'Invalid refresh token! 🤔',
				type: 'error',
			})
		// if the refresh token is valid, check if the user exists
		const user = await User.findById(id)
		// if the user doesn't exist, return error
		if (!user)
			return res.status(500).json({
				message: "User doesn't exist! 😢",
				type: 'error',
			})
		// if the user exists, check if the refresh token is correct. return error if it is incorrect.
		if (user.refreshtoken !== refreshtoken)
			return res.status(500).json({
				message: 'Invalid refresh token! 🤔',
				type: 'error',
			})
		// if the refresh token is correct, create the new tokens
		const accessToken = createAccessToken(user._id)
		const refreshToken = createRefreshToken(user._id)
		// update the refresh token in the database
		user.refreshtoken = refreshToken
		// send the new tokes as response
		sendRefreshToken(res, refreshToken)
		return res.json({
			message: 'Refreshed successfully! 🤗',
			type: 'success',
			accessToken,
		})
	} catch (error) {
		res.status(500).json({
			type: 'error',
			message: 'Error refreshing token!',
			error,
		})
	}
})

// protected route
router.get('/protected', protected, async (req, res) => {
	try {
		// if user exists in the request, send the data
		if (req.user)
			return res.json({
				message: 'You are logged in! 🤗',
				type: 'success',
				user: req.user,
			})
		// if user doesn't exist, return error
		return res.status(500).json({
			message: 'You are not logged in! 😢',
			type: 'error',
		})
	} catch (error) {
		res.status(500).json({
			type: 'error',
			message: 'Error getting protected route!',
			error,
		})
	}
})

// send password reset email

router.post('/send-password-reset-email', async (req, res) => {
	try {
		// get the user from the request body
		const { email } = req.body
		// find the user by email
		const user = await User.findOne({ email })
		// if the user doesn't exist, return error

		if (!user) return res.render('resetPassword_page', { message: "User doesn't exist! 😢", type: 'error' })

		const user2 = {
			_id: user._id,
			email: user.email,
			password: user.password,
		}

		const token = createPasswordResetToken({ ...user2, createdAt: Date.now() })

		const url = createPasswordResetUrl(user2._id, token)
		// send the email
		const mailOptions = passwordResetTemplate(user2, url)
		transporter.sendMail(mailOptions, (err, info) => {
			if (err) return res.render('resetPassword_page', { message: 'Error sending email! 😢', type: 'error' })
		})
		res.render('resetPassword_page', {
			message: 'Password reset link has been sent to your email! 📧',
		})
	} catch (error) {
		res.status(500).json({
			type: 'error',
			message: 'Error sending email!',
			error,
		})
	}
})

router.post('/reset-password/:id/:token', async (req, res) => {
	try {
		// get the user details from the url

		const id = req.params.id
		const token = req.params.token

		// const { id, token } = req.params
		// get the new password the request body
		const { newPassword } = req.body
		// find the user by id
		const user = await User.findById(id)

		// if the user doesn't exist, return error

		if (!user)
			return res.status(500).json({
				message: "User doesn't exist! 😢",
				type: 'error',
			})
		// verify if the token is valid
		const isValid = verify(token, user.password)
		// if the password reset token is invalid, return error
		if (!isValid)
			return res.status(500).json({
				message: 'Invalid token! 😢',
				type: 'error',
			})
		// set the user's password to the new password
		user.password = await hash(newPassword, 10)
		// save the user
		await user.save()
		// send the email
		const mailOptions = passwordResetConfirmationTemplate(user)
		transporter.sendMail(mailOptions, (err, info) => {
			if (err)
				return res.status(500).json({
					message: 'Error sending email! 😢',
					type: 'error',
				})

			return res.render('login_page', {
				message: 'The password has been changed and confirmation has been sent by e-mail.! 📧',
			})
		})
	} catch (error) {
		res.status(500).json({
			type: 'error',
			message: 'Error sending email!',
			error,
		})
	}
})

module.exports = router
