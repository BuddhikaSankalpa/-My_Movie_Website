let key = "9bad24af"

/* ===========================
   SEARCH FUNCTION
=========================== */
function Search() {
    let movieName = document.getElementById("movieInput").value.trim()
    if (!movieName) return

    closeSuggestions()
    showLoader(true)
    hideResult()
    hideError()

    let url = "https://www.omdbapi.com/?t=" + encodeURIComponent(movieName) + "&apikey=" + key

    let httpRequest = new XMLHttpRequest()
    httpRequest.open("GET", url)
    httpRequest.responseType = "json"

    httpRequest.onload = function () {
        showLoader(false)
        let movie = httpRequest.response

        if (!movie || movie.Response === "False") {
            showError()
            return
        }

        document.getElementById("movieTitle").innerHTML = movie.Title || "N/A"
        document.getElementById("movieYear").innerHTML = movie.Year || ""
        document.getElementById("movieGenre").innerHTML = movie.Genre ? movie.Genre.split(",")[0] : ""
        document.getElementById("movieRated").innerHTML = movie.Rated || ""

        let ratingEl = document.querySelector("#imdbRating b")
        if (ratingEl) ratingEl.textContent = movie.imdbRating || "N/A"

        document.getElementById("movieRuntime").innerHTML = movie.Runtime || ""
        document.getElementById("Plot").innerHTML = movie.Plot || ""
        document.getElementById("movieDirector").innerHTML = movie.Director || "N/A"
        document.getElementById("movieActors").innerHTML = movie.Actors || "N/A"

        let posterEl = document.getElementById("Poster")
        if (movie.Poster && movie.Poster !== "N/A") {
            posterEl.src = movie.Poster
            posterEl.style.display = "block"
        } else {
            posterEl.src = ""
            posterEl.style.display = "none"
        }

        showResult()
    }

    httpRequest.onerror = function () {
        showLoader(false)
        showError()
    }

    httpRequest.send()
}

function showLoader(state) {
    let loader = document.getElementById("loader")
    if (state) loader.classList.remove("hidden")
    else loader.classList.add("hidden")
}

function showResult() {
    document.getElementById("resultSection").classList.remove("hidden")
    setTimeout(() => {
        document.getElementById("resultSection").scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100)
}

function hideResult() {
    document.getElementById("resultSection").classList.add("hidden")
}

function showError() {
    document.getElementById("errorMsg").classList.remove("hidden")
}

function hideError() {
    document.getElementById("errorMsg").classList.add("hidden")
}

// Press Enter to search + autocomplete init
document.addEventListener("DOMContentLoaded", function () {
    let input = document.getElementById("movieInput")
    if (input) {
        input.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                closeSuggestions()
                Search()
            } else if (e.key === "ArrowDown") {
                e.preventDefault()
                navigateSuggestions(1)
            } else if (e.key === "ArrowUp") {
                e.preventDefault()
                navigateSuggestions(-1)
            } else if (e.key === "Escape") {
                closeSuggestions()
            }
        })
        input.addEventListener("input", handleSuggestionInput)
    }
    // Close on outside click
    document.addEventListener("click", function (e) {
        const searchBox   = document.getElementById("searchBox")
        const suggestions = document.getElementById("suggestions")
        if (!searchBox.contains(e.target) && !suggestions.contains(e.target)) {
            closeSuggestions()
        }
    })
    // Reposition suggestions on scroll/resize
    window.addEventListener("scroll", positionSuggestions, true)
    window.addEventListener("resize", positionSuggestions)

    initBrowseRows()
    initHeroParticles()
    loadHeroPosters()
})

/* ===========================
   AUTO-SUGGESTION
=========================== */
let suggestionDebounce = null
let currentHighlight = -1
let lastSuggestions = []

function handleSuggestionInput() {
    const input = document.getElementById("movieInput")
    const query = input.value.trim()

    clearTimeout(suggestionDebounce)
    currentHighlight = -1

    if (query.length < 2) {
        closeSuggestions()
        return
    }

    // Show loading
    showSuggestionsLoader()

    // Debounce 320ms — avoids spamming the API on every keystroke
    suggestionDebounce = setTimeout(() => {
        fetchSuggestions(query)
    }, 320)
}

function fetchSuggestions(query) {
    // OMDB search endpoint (returns up to 10 results)
    const url = "https://www.omdbapi.com/?s=" + encodeURIComponent(query) + "&apikey=" + key
    const xhr = new XMLHttpRequest()
    xhr.open("GET", url)
    xhr.responseType = "json"
    xhr.onload = function () {
        const data = xhr.response
        if (!data || data.Response === "False" || !data.Search) {
            showSuggestionsEmpty(query)
            return
        }
        lastSuggestions = data.Search
        renderSuggestions(data.Search)
    }
    xhr.onerror = function () { closeSuggestions() }
    xhr.send()
}

function highlightMatch(title, query) {
    if (!query) return title
    const regex = new RegExp("(" + query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi")
    return title.replace(regex, '<mark style="background:rgba(0,240,255,0.2);color:var(--cyan);border-radius:2px;padding:0 2px">$1</mark>')
}

function positionSuggestions() {
    const input = document.getElementById("movieInput")
    const box   = document.getElementById("suggestions")
    if (!input || !box) return
    const rect = input.getBoundingClientRect()
    box.style.top    = rect.bottom + "px"
    box.style.left   = rect.left + "px"
    box.style.width  = rect.width + "px"
}

function renderSuggestions(results) {
    const box   = document.getElementById("suggestions")
    const input = document.getElementById("movieInput")
    box.innerHTML = ""

    results.forEach((item, idx) => {
        const row = document.createElement("div")
        row.className = "suggestion-item"
        row.dataset.index = idx

        // Poster
        let posterEl
        if (item.Poster && item.Poster !== "N/A") {
            posterEl = document.createElement("img")
            posterEl.className = "suggestion-item__poster"
            posterEl.src = item.Poster
            posterEl.alt = item.Title
            posterEl.loading = "lazy"
        } else {
            posterEl = document.createElement("div")
            posterEl.className = "suggestion-item__poster-placeholder"
            posterEl.textContent = "🎬"
        }

        // Type badge
        const typeClass = item.Type === "movie"  ? "suggestion-item__type--movie"
                        : item.Type === "series" ? "suggestion-item__type--series"
                        : "suggestion-item__type--game"

        const info = document.createElement("div")
        info.className = "suggestion-item__info"
        info.innerHTML = `
            <div class="suggestion-item__title">${highlightMatch(item.Title, input.value.trim())}</div>
            <div class="suggestion-item__meta">
                <span class="suggestion-item__year">${item.Year || ""}</span>
                <span class="suggestion-item__type ${typeClass}">${item.Type || "movie"}</span>
            </div>
        `

        row.appendChild(posterEl)
        row.appendChild(info)

        row.addEventListener("click", () => {
            input.value = item.Title
            closeSuggestions()
            Search()
        })

        row.addEventListener("mouseenter", () => {
            currentHighlight = idx
            updateHighlight()
        })

        box.appendChild(row)
    })

    positionSuggestions()
    input.classList.add("open")
    box.style.display = "block"
    box.classList.add("active")
}

function showSuggestionsLoader() {
    const box   = document.getElementById("suggestions")
    const input = document.getElementById("movieInput")
    box.innerHTML = `
        <div class="suggestions__loader">
            <div class="suggestions__loader-spin"></div>
            Searching movies…
        </div>
    `
    positionSuggestions()
    input.classList.add("open")
    box.style.display = "block"
    box.classList.add("active")
}

function showSuggestionsEmpty(query) {
    const box = document.getElementById("suggestions")
    box.innerHTML = `
        <div class="suggestions__empty">
            <span>🔍</span>
            No results for "<strong style="color:#fff">${query}</strong>"
        </div>
    `
    positionSuggestions()
    box.style.display = "block"
    box.classList.add("active")
}

function closeSuggestions() {
    const box   = document.getElementById("suggestions")
    const input = document.getElementById("movieInput")
    if (box)   { box.classList.remove("active"); box.style.display = "none"; box.innerHTML = "" }
    if (input) input.classList.remove("open")
    currentHighlight = -1
}

function navigateSuggestions(dir) {
    const items = document.querySelectorAll(".suggestion-item")
    if (!items.length) return
    currentHighlight = Math.max(0, Math.min(items.length - 1, currentHighlight + dir))
    updateHighlight()
    // Update input with highlighted title
    const input = document.getElementById("movieInput")
    if (lastSuggestions[currentHighlight]) {
        input.value = lastSuggestions[currentHighlight].Title
    }
}

function updateHighlight() {
    document.querySelectorAll(".suggestion-item").forEach((el, i) => {
        el.classList.toggle("highlighted", i === currentHighlight)
    })
    // Scroll highlighted into view
    const highlighted = document.querySelector(".suggestion-item.highlighted")
    if (highlighted) highlighted.scrollIntoView({ block: "nearest" })
}

/* ===========================
   HERO PARTICLES
=========================== */
function initHeroParticles() {
    const canvas = document.getElementById("heroParticles")
    if (!canvas) return
    const ctx = canvas.getContext("2d")

    function resize() {
        canvas.width  = canvas.offsetWidth
        canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener("resize", resize)

    const COLORS = ["rgba(0,240,255,", "rgba(180,0,255,", "rgba(255,0,170,"]
    const particles = Array.from({ length: 60 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.8 + 0.3,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: Math.random() * 0.5 + 0.1
    }))

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        particles.forEach(p => {
            p.x += p.vx; p.y += p.vy
            if (p.x < 0) p.x = canvas.width
            if (p.x > canvas.width) p.x = 0
            if (p.y < 0) p.y = canvas.height
            if (p.y > canvas.height) p.y = 0
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
            ctx.fillStyle = p.color + p.alpha + ")"
            ctx.fill()
        })
        requestAnimationFrame(draw)
    }
    draw()
}

/* ===========================
   HERO FLOATING POSTERS
=========================== */
function loadHeroPosters() {
    const heroMovies = ["Dune", "Inception", "Parasite", "The Batman"]
    const ids = ["heroPoster1","heroPoster2","heroPoster3","heroPoster4"]

    heroMovies.forEach((title, i) => {
        const url = "https://www.omdbapi.com/?t=" + encodeURIComponent(title) + "&apikey=" + key
        const xhr = new XMLHttpRequest()
        xhr.open("GET", url)
        xhr.responseType = "json"
        xhr.onload = function () {
            const movie = xhr.response
            if (!movie || movie.Response === "False") return
            const el = document.getElementById(ids[i])
            if (!el) return
            const img = el.querySelector("img")
            if (img && movie.Poster && movie.Poster !== "N/A") {
                img.src = movie.Poster
                img.alt = movie.Title
                el.style.opacity = "1"
            }
        }
        xhr.send()
    })
}

/* ===========================
   BROWSE ROWS (Netflix-style)
=========================== */

function scrollRow(trackId, direction) {
    const track = document.getElementById(trackId)
    if (!track) return
    const scrollAmount = 600
    track.scrollBy({ left: direction * scrollAmount, behavior: "smooth" })
}

const ROWS = [
    {
        trackId: "top10Track",
        movies: [
            "Avengers: Endgame",
            "The Dark Knight",
            "Inception",
            "Interstellar",
            "The Godfather",
            "Pulp Fiction",
            "The Matrix",
            "Parasite",
            "Joker",
            "Oppenheimer"
        ],
        ranked: true,
        tag: "Top 10"
    },
    {
        trackId: "trendingTrack",
        movies: [
            "Dune",
            "Spider-Man: No Way Home",
            "Everything Everywhere All at Once",
            "Top Gun: Maverick",
            "The Batman",
            "Doctor Strange in the Multiverse of Madness",
            "Thor: Love and Thunder",
            "Black Panther: Wakanda Forever",
            "Nope",
            "Tár",
            "Bullet Train",
            "Amsterdam",
            "Glass Onion",
            "The Menu"
        ],
        ranked: false,
        tag: "Trending"
    },
    {
        trackId: "actionTrack",
        movies: [
            "John Wick",
            "Mad Max: Fury Road",
            "Mission: Impossible – Fallout",
            "Die Hard",
            "Gladiator",
            "The Raid",
            "Fury",
            "Edge of Tomorrow",
            "Heat",
            "Extraction",
            "Nobody",
            "The Gray Man",
            "Atomic Blonde",
            "Fast Five"
        ],
        ranked: false,
        tag: "Action"
    },
    {
        trackId: "scifiTrack",
        movies: [
            "Blade Runner 2049",
            "Arrival",
            "Ex Machina",
            "The Martian",
            "Gravity",
            "District 9",
            "Annihilation",
            "Moon",
            "Coherence",
            "Upgrade",
            "Looper",
            "Predestination",
            "Vivarium",
            "Possessor"
        ],
        ranked: false,
        tag: "Sci-Fi"
    }
]

function initBrowseRows() {
    ROWS.forEach(row => {
        const track = document.getElementById(row.trackId)
        if (!track) return

        // Create skeleton placeholders first
        row.movies.forEach((_, i) => {
            const card = createSkeletonCard(row.ranked, i + 1)
            track.appendChild(card)
        })

        // Fetch each movie and populate
        row.movies.forEach((title, i) => {
            fetchMovieForCard(title, track, i, row.ranked, row.tag)
        })

        // Drag to scroll
        enableDragScroll(track)
    })
}

function createSkeletonCard(ranked, rank) {
    if (ranked) {
        const wrapper = document.createElement("div")
        wrapper.className = "ranked-item"

        const num = document.createElement("div")
        num.className = "ranked-item__number"
        num.textContent = rank
        wrapper.appendChild(num)

        const card = document.createElement("div")
        card.className = "browse-card skeleton"
        const img = document.createElement("img")
        img.className = "browse-card__img"
        img.alt = ""
        card.appendChild(img)
        wrapper.appendChild(card)
        return wrapper
    } else {
        const card = document.createElement("div")
        card.className = "browse-card skeleton"
        const img = document.createElement("img")
        img.className = "browse-card__img"
        img.alt = ""
        card.appendChild(img)
        return card
    }
}

function fetchMovieForCard(title, track, index, ranked, tag) {
    const url = "https://www.omdbapi.com/?t=" + encodeURIComponent(title) + "&apikey=" + key
    const xhr = new XMLHttpRequest()
    xhr.open("GET", url)
    xhr.responseType = "json"
    xhr.onload = function () {
        const movie = xhr.response
        if (!movie || movie.Response === "False") return
        const item = track.children[index]
        if (!item) return
        // For ranked rows the wrapper is .ranked-item, card is its last child
        const card = ranked ? item.querySelector(".browse-card") : item
        if (!card) return
        populateCard(card, movie, tag)
    }
    xhr.send()
}

function populateCard(card, movie, tag) {
    card.innerHTML = ""
    card.className = "browse-card"

    // Poster image
    const img = document.createElement("img")
    img.className = "browse-card__img"
    img.src = (movie.Poster && movie.Poster !== "N/A") ? movie.Poster : "https://via.placeholder.com/150x225/0f0f1e/00f0ff?text=No+Poster"
    img.alt = movie.Title
    card.appendChild(img)

    // Play icon
    const play = document.createElement("div")
    play.className = "browse-card__play"
    play.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>`
    card.appendChild(play)

    // Overlay info
    const overlay = document.createElement("div")
    overlay.className = "browse-card__overlay"
    overlay.innerHTML = `
        <div class="browse-card__name">${movie.Title}</div>
        <div class="browse-card__year">${movie.Year || ""}</div>
        ${movie.imdbRating && movie.imdbRating !== "N/A" ? `<div class="browse-card__imdb">⭐ ${movie.imdbRating}</div>` : ""}
    `
    card.appendChild(overlay)

    // Tag
    const tagWrap = document.createElement("div")
    tagWrap.className = "browse-card__tag"
    tagWrap.innerHTML = `<span class="browse-card__label">${tag}</span>`
    card.appendChild(tagWrap)

    // Click to search
    card.addEventListener("click", () => {
        document.getElementById("movieInput").value = movie.Title
        Search()
        window.scrollTo({ top: 0, behavior: "smooth" })
    })
}

function enableDragScroll(track) {
    let isDown = false, startX, scrollLeft

    track.addEventListener("mousedown", e => {
        isDown = true
        track.classList.add("grabbing")
        startX = e.pageX - track.offsetLeft
        scrollLeft = track.scrollLeft
    })
    track.addEventListener("mouseleave", () => { isDown = false; track.classList.remove("grabbing") })
    track.addEventListener("mouseup", () => { isDown = false; track.classList.remove("grabbing") })
    track.addEventListener("mousemove", e => {
        if (!isDown) return
        e.preventDefault()
        const x = e.pageX - track.offsetLeft
        track.scrollLeft = scrollLeft - (x - startX) * 1.5
    })
}



/*let key = "9bad24af"

function Search(){
    let movieName = document.getElementById("movieInput").value
    
    let url = "https://www.omdbapi.com/?t="+movieName+"&apikey="+key
    console.log(movieName)

    let httpRequest = new XMLHttpRequest()
    httpRequest.open("GET", url)

    httpRequest.responseType = "json"
    httpRequest.onload = function(){
        console.log(httpRequest.response) 

        let moveie = httpRequest.response

        document.getElementById("movieTitle").innerHTML = moveie.Title
        document.getElementById("movieYear").innerHTML = moveie.Year
        document.getElementById("Poster").src = moveie.Poster
        document.getElementById("Plot").innerHTML = moveie.Plot
    }

    httpRequest.send()
}*/