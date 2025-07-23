package com.example.tomato

import android.app.Dialog
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.BitmapShader
import android.graphics.BlurMaskFilter
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.RadialGradient
import android.graphics.Shader
import android.view.WindowManager
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.Marker
import com.google.android.gms.maps.model.MarkerOptions
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.lang.Math.max
import java.lang.Math.min


class MapClusterHelper(private val activity: MapsActivity,
                       private val mMap: GoogleMap
){

    fun showClusterDialog(posts: List<PostItemRaw>) {
        val dialog = Dialog(activity)
        dialog.setContentView(R.layout.map_activity_post_preview_dialog)

        val recyclerView = dialog.findViewById<RecyclerView>(R.id.post_recycler_view)
        recyclerView.layoutManager = LinearLayoutManager(activity, LinearLayoutManager.HORIZONTAL, false)
        recyclerView.adapter = PostClusterAdapter(posts, activity)

        val screenWidth = activity.resources.displayMetrics.widthPixels
        // Customize the dialog window
        dialog.window?.apply {
            setBackgroundDrawableResource(R.drawable.map_activity_dialog_background) // Set rounded background
            setLayout((screenWidth * 0.8).toInt(), WindowManager.LayoutParams.WRAP_CONTENT)
            decorView.setPadding(0, 0, 0, 0)
        }
        dialog.show()
    }

    fun getMedianColor(bitmap: Bitmap): Int {
        val sampleStep = 4
        val reds = mutableListOf<Int>()
        val greens = mutableListOf<Int>()
        val blues = mutableListOf<Int>()
        for (y in 0 until bitmap.height step sampleStep) {
            for (x in 0 until bitmap.width step sampleStep) {
                val color = bitmap.getPixel(x, y)
                if (Color.alpha(color) > 50) {
                    reds.add(Color.red(color))
                    greens.add(Color.green(color))
                    blues.add(Color.blue(color))
                }
            }
        }
        return if (reds.isNotEmpty()) {
            reds.sort(); greens.sort(); blues.sort()
            Color.rgb(reds[reds.size / 2], greens[greens.size / 2], blues[blues.size / 2])
        } else Color.YELLOW
    }




    private fun createCircularBitmap(source: Bitmap, targetSize: Int): Bitmap {
        val scale = if (source.width < source.height) targetSize.toFloat() / source.width else targetSize.toFloat() / source.height
        val scaledWidth = (source.width * scale).toInt()
        val scaledHeight = (source.height * scale).toInt()
        val scaledBitmap = Bitmap.createScaledBitmap(source, scaledWidth, scaledHeight, true)
        val startX = (scaledWidth - targetSize).coerceAtLeast(0) / 2
        val startY = (scaledHeight - targetSize).coerceAtLeast(0) / 2
        val safeWidth = min(targetSize, scaledWidth - startX)
        val safeHeight = min(targetSize, scaledHeight - startY)
        val croppedBitmap = Bitmap.createBitmap(scaledBitmap, startX, startY, safeWidth, safeHeight)
        scaledBitmap.recycle()
        val output = Bitmap.createBitmap(targetSize, targetSize, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(output)
        canvas.drawColor(Color.TRANSPARENT, PorterDuff.Mode.CLEAR)
        val paint = Paint().apply {
            isAntiAlias = true
            shader = BitmapShader(croppedBitmap, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP)
        }
        canvas.drawCircle(targetSize / 2f, targetSize / 2f, targetSize / 2f, paint)
        croppedBitmap.recycle()
        return output
    }

    private fun addGlow(circularBitmap: Bitmap, glowColor: Int): Bitmap {
        val glowRadius = 50f
        val padding = (glowRadius * 2).toInt()
        val glowBitmap = Bitmap.createBitmap(
            circularBitmap.width + padding,
            circularBitmap.height + padding,
            Bitmap.Config.ARGB_8888
        )
        val canvas = Canvas(glowBitmap)
        val paint = Paint().apply {
            shader = RadialGradient(
                glowBitmap.width / 2f,
                glowBitmap.height / 2f,
                circularBitmap.width / 2f + glowRadius,
                intArrayOf(glowColor, Color.TRANSPARENT),
                floatArrayOf(0f, 1f),
                Shader.TileMode.CLAMP
            )
            maskFilter = BlurMaskFilter(glowRadius, BlurMaskFilter.Blur.NORMAL)
        }
        canvas.drawCircle(glowBitmap.width / 2f, glowBitmap.height / 2f, circularBitmap.width / 2f + glowRadius, paint)
        canvas.drawBitmap(circularBitmap, padding / 2f, padding / 2f, null)
        return glowBitmap
    }


    fun createMarkerBitmap(image: PostImage, count: Int = 1): Bitmap {

        fun Int.dpToPx(context: Context): Int = (this * context.resources.displayMetrics.density).toInt()

        val targetSize = postSize.dpToPx(activity)
        val imageByteArray = image.fileData.data.map { it.toByte() }.toByteArray()
        val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(imageByteArray, 0, imageByteArray.size, options)
        options.inSampleSize = commonFunction.calculateInSampleSize(options, targetSize, targetSize)
        options.inJustDecodeBounds = false
        val originalBitmap = BitmapFactory.decodeByteArray(imageByteArray, 0, imageByteArray.size, options)
            ?: return Bitmap.createBitmap(targetSize, targetSize, Bitmap.Config.ARGB_8888)
        val circularBitmap = createCircularBitmap(originalBitmap, targetSize)
        originalBitmap.recycle()
        val dominantColor = getMedianColor(circularBitmap)
        val darkerDominantColor = darkenColor(dominantColor, 0.35f)
        val glowBitmap = addGlow(circularBitmap, darkerDominantColor)
        circularBitmap.recycle()
        val finalBitmap = if (count > 1) {
            addBadge(glowBitmap, count)
        } else {
            glowBitmap
        }
        return finalBitmap
    }
    fun darkenColor(color: Int, factor: Float): Int {
        // Ensure the factor is within a sensible range
        val safeFactor = factor.coerceIn(0f, 1f)
        val r = (Color.red(color) * safeFactor).toInt().coerceIn(0, 255)
        val g = (Color.green(color) * safeFactor).toInt().coerceIn(0, 255)
        val b = (Color.blue(color) * safeFactor).toInt().coerceIn(0, 255)
        return Color.rgb(r, g, b)
    }


    private fun addBadge(baseBitmap: Bitmap, count: Int): Bitmap {
        val badgeSize = 75 // Size of the badge in pixels
        val badgePaint = Paint().apply {
            color = Color.RED
            style = Paint.Style.FILL
        }
        val textPaint = Paint().apply {
            color = Color.WHITE
            textSize = 40f
            textAlign = Paint.Align.CENTER
        }

        val bitmap = Bitmap.createBitmap(baseBitmap.width, baseBitmap.height, baseBitmap.config!!)
        val canvas = Canvas(bitmap)
        canvas.drawBitmap(baseBitmap, 0f, 0f, null)
        val badgeX = baseBitmap.width - badgeSize / 1.25f
        val badgeY = badgeSize / 1.25f
        canvas.drawCircle(badgeX, badgeY, badgeSize / 2f, badgePaint)
        canvas.drawText(count.toString(), badgeX, badgeY + 5f, textPaint) // Adjust Y for text centering
        baseBitmap.recycle()
        return bitmap
    }

    fun showSinglePostMarker(post: PostItemRaw, location: LatLng): Marker {
        val firstImage = post.images[0]
        val bitmap = createMarkerBitmap(firstImage)
        return mMap.addMarker(
            MarkerOptions()
                .position(location)
                .icon(BitmapDescriptorFactory.fromBitmap(bitmap))
        )!!
    }

    fun showAggregatedMarker(representativePost: PostItemRaw, count: Int, location: LatLng): Marker {
        val firstImage = representativePost.images[0]
        val bitmap = createMarkerBitmap(firstImage, count)
        return mMap.addMarker(
            MarkerOptions()
                .position(location)
                .icon(BitmapDescriptorFactory.fromBitmap(bitmap))
        )!!
    }

    fun getPostsOnScreen(googleMap: GoogleMap, userPostOnly: Boolean) {
        lastFetchJob?.cancel()
        lastFetchJob = activity.lifecycleScope.launch {
            delay(fetchDelay.toLong())
            val visibleRegion = googleMap.projection.visibleRegion
            val startLat = min(visibleRegion.farLeft.latitude, visibleRegion.nearRight.latitude)
            val endLat = max(visibleRegion.farLeft.latitude, visibleRegion.nearRight.latitude)
            val startLong = min(visibleRegion.farLeft.longitude, visibleRegion.nearRight.longitude)
            val endLong = max(visibleRegion.farLeft.longitude, visibleRegion.nearRight.longitude)
            var url = "${BuildConfig.SERVER_ADDRESS}/posts?" +
                    "start_lat=$startLat&end_lat=$endLat&" +
                    "start_long=$startLong&end_long=$endLong"
            if(UserCredentialManager.isLoggedIn(activity)){
                url = "${BuildConfig.SERVER_ADDRESS}/posts-authenticated?" +
                        "userPostOnly=$userPostOnly&" +
                        "start_lat=$startLat&end_lat=$endLat&" +
                        "start_long=$startLong&end_long=$endLong"
            }

            val response = withContext(Dispatchers.IO) {
                HTTPRequest.sendGetRequest(url, activity)
            }

            if (response != null) {

                val gson = Gson()
                val postArray = gson.fromJson(response, Array<PostItemRaw>::class.java)
                val projection = mMap.projection
                val clusters = mutableMapOf<Pair<Int, Int>, MutableList<PostItemRaw>>()

                // Group posts into grid cells based on screen coordinates
                for (post in postArray) {
                    val screenPoint = projection.toScreenLocation(LatLng(post.latitude, post.longitude))
                    val cellX = (screenPoint.x / gridSize).toInt()
                    val cellY = (screenPoint.y / gridSize).toInt()
                    val key = Pair(cellX, cellY)
                    clusters.getOrPut(key) { mutableListOf() }.add(post)
                }

                // Clear existing markers and add new ones
                mMap.clear()
                for (cluster in clusters.values) {
                    if (cluster.size == 1) {
                        val post = cluster[0]
                        val postLocation = LatLng(post.latitude, post.longitude)
                        val marker = showSinglePostMarker(post, postLocation)
                        marker.tag = cluster
                    } else {
                        val averageLat = cluster.map { it.latitude }.average()
                        val averageLng = cluster.map { it.longitude }.average()
                        val location = LatLng(averageLat, averageLng)
                        val representativePost = cluster[0] // Use first post as representative
                        val marker = showAggregatedMarker(representativePost, cluster.size, location)
                        marker.tag = cluster
                    }
                }
            }
        }
    }



}
