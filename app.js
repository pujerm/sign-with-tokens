// for using environment variables
require('dotenv').config()
const path = require('path')

const session = require('express-session')
// importing dependencies
const express = require('express')
const cookieParser = require('cookie-parser')

// importing the routes

const authRouter = require('./routes/auth')

// 1. this is the port on which the server will run
const port = process.env.PORT || 8080

// creating the express app
const app = express()

app.set('view engine', 'ejs')

app.set('views', path.join(__dirname, 'views'))
// 2. adding middleware to parse the cookies and more
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static('public'))
app.use('/models/scripts', express.static('models/scripts'))

// 3. adding the routes
app.get('/', (req, res) => {
	res.render('login_page')
})
app.get('/login', (req, res) => {
	res.render('login_page')
})
app.use('/auth', authRouter)

app.get('/register', (req, res) => {
	res.render('register_page')
})
app.get('/resetpassword', (req, res) => {
	res.render('resetPassword_page')
})
app.get('/auth/reset-password/:id/:token', (req, res) => {
	res.render('newPassword_page')
})
const mongoose = require('mongoose')
// connecting to the database
mongoose
	.connect(process.env.MONGO_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => {
		console.log('MongoDB connection is established successfully! 🎉')
	})

// 4. starting the server
app.listen(port, function () {
	console.log(`🚀 Listening on port ${port}`)
})
