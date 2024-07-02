const tweetInput = document.getElementById('tweet-input')
const tweetBtn = document.getElementById('tweet-btn')
const notesList = document.getElementById('notes-list')
const logoutBtn = document.getElementById('logout-btn')

// console.log(userEmail)

fetch('/auth/posts')
	.then(response => response.json())
	.then(data => {
		// console.log(data)
		renderPosts(data)
		// Do something with the data
	})
	.catch(error => {
		console.error('Error fetching posts:', error)
	})
// console.log(tweets)

function renderPosts(posts) {
	if (!posts || !Array.isArray(posts)) {
		console.error('Invalid posts array')
		return
	}
	const postList = document.getElementById('post-list')
	postList.innerHTML = '' // Clear the list

	posts.reverse().forEach(post => {
		const createdAt = new Date(post.createdAt)
		const formattedDate = createdAt
			.toLocaleString('pl-PL', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				timeZone: 'Europe/Warsaw',
			})
			.replace('///g', '-')
			.replace('/:/g', ' ')

		const postHTML = `
		<li class="post">
		  <h4>${post.username}, ${formattedDate}</h4>
		  <p>${post.post}</p>
		</li>
	  `
		postList.innerHTML += postHTML
	})
}
tweetBtn.addEventListener('click', e => {
	e.preventDefault()

	const newTweetText = tweetInput.value.trim()
	if (newTweetText) {
		// assuming you have the user's email stored in a variable
		const newPost = { email: userEmail, post: newTweetText, username: username }
		fetch('/auth/create-post', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(newPost),
			withCredentials: true, // add this line
		})
			.then(response => response.json())
			.then(data => {
				console.log(data)
				tweetInput.value = ''
			})
			.catch(error => {
				console.error('Error creating post:', error)
			})
	}

	const refreshToken = userRefreshToken
	const xhr = new XMLHttpRequest()
	xhr.open('POST', '/auth/refresh_token', true)
	xhr.setRequestHeader('Cookie', `refreshtoken=${refreshToken}`)
	xhr.onload = function () {
		if (xhr.status === 200) {
			const accessToken = xhr.responseText
			const xhr2 = new XMLHttpRequest()
			xhr2.open('GET', '/auth/protected', true)
			xhr2.setRequestHeader('Authorization', `Bearer ${accessToken}`)
			xhr2.setRequestHeader('Cookie', `refreshtoken=${refreshToken}`)
			xhr2.onload = function () {
				if (xhr2.status === 200) {
					// redirect to home_page.ejs
					window.location.href = '/home_page'
				}
			}
			xhr2.send()
		}
	}
	xhr.send()
	fetch('/auth/posts')
		.then(response => response.json())
		.then(data => {
			// console.log(data)
			renderPosts(data)
			// Do something with the data
		})
		.catch(error => {
			console.error('Error fetching posts:', error)
		})
})
