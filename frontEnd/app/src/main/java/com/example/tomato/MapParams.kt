package com.example.tomato
import kotlinx.coroutines.Job

val fetchDelay = 500 // Minimum idling time before fetching posts
val postSize = 80 // The circular image size on the map
val gridSize = 3 * postSize // Distance threshold in pixels for clustering
var lastFetchJob: Job? = null
