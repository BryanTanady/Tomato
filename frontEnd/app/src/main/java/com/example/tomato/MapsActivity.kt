package com.example.tomato

import JwtManager
import PostHelper
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.graphics.Color
import android.location.Location
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import android.widget.AutoCompleteTextView
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.GetCredentialException
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.example.tomato.databinding.ActivityMapsBinding
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.LatLng
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import com.google.android.libraries.places.api.Places
import com.google.android.libraries.places.api.model.AutocompleteSessionToken
import com.google.android.libraries.places.api.net.PlacesClient
import com.google.firebase.messaging.FirebaseMessaging
import com.google.gson.Gson
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject

data class SignInResponse(val token: String, val userID: String)

class MapsActivity : AppCompatActivity(), OnMapReadyCallback {
    private lateinit var mMap: GoogleMap
    private lateinit var binding: ActivityMapsBinding
    private val activityScope = CoroutineScope(Dispatchers.Main)

    companion object {
        private const val TAG = "MapsActivity"


    }

    private var userPostOnly: Boolean = false


    //Location Search
    private lateinit var placesClient: PlacesClient
    private lateinit var sessionToken: AutocompleteSessionToken
    private lateinit var autoCompleteTextView: AutoCompleteTextView
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var clusterHelper: MapClusterHelper
    private var searchLatitude: Double? = null
    private var searchLongitude: Double? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMapsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        if (!Places.isInitialized()) {
            Places.initialize(applicationContext, BuildConfig.MAP_API_KEY)
        }

        val mapFragment = supportFragmentManager
            .findFragmentById(R.id.mapFragment) as SupportMapFragment
        mapFragment.getMapAsync(this)

        //Init sign in button
        findViewById<Button>(R.id.sign_in_button).setOnClickListener {
            val credentialManager = CredentialManager.create(this)
            val signInWithGoogleOption = GetSignInWithGoogleOption.Builder(BuildConfig.WEB_CLIENT_ID)
                .setNonce(commonFunction.generateHashedNonce())
                .build()
            val request = GetCredentialRequest.Builder()
                .addCredentialOption(signInWithGoogleOption)
                .build()

            activityScope.launch {
                try {
                    val result = credentialManager.getCredential(request = request, context = this@MapsActivity)
                    handleSignIn(result)
                } catch (e: GetCredentialException) {
                    Log.d(TAG, "Get credential exception", e)
                }
            }
        }

        //Init filter button
        findViewById<Button>(R.id.filter_post_button).setOnClickListener {
            val options = arrayOf("Show only your posts", "Show all viewable posts")

            AlertDialog.Builder(this@MapsActivity)
                .setTitle("Post Filter")
                .setItems(options) { _, which ->
                    userPostOnly = which == 0
                    clusterHelper.getPostsOnScreen(mMap, userPostOnly)
                }
                .setCancelable(true)
                .show()

        }

        commonFunction.initNavBarButtons(this@MapsActivity, this)

        // Update profile (show clickable image) if user is logged in
        updateProfile()

        // Init search location functionality
        initSearchLocation()

        // Init trigger list of chat layout
        initChatList()

        // Init user's current location and map display
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        // Request location permissions first
        if (LocationPermission.checkLocationPermission(this)) {
            initMap()
        } else {
            LocationPermission.requestLocationPermission(this)
        }

    }


    override fun onRequestPermissionsResult(
        requestCode: Int, permissions: Array<out String>, grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == LOCATION_PERMISSION_REQUEST_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                initMap()
            }
        }
    }

    private fun initMap() {
        val mapFragment = supportFragmentManager
            .findFragmentById(R.id.mapFragment) as SupportMapFragment
        mapFragment.getMapAsync(this)
    }

    private fun getUserLocation() {
        if (LocationPermission.checkLocationPermission(this)) {
            fusedLocationClient.lastLocation.addOnSuccessListener { location: Location? ->
                Log.d(TAG, "User location: $location")
                location?.let {
                    val userLatLng = LatLng(it.latitude, it.longitude)
                    mMap.moveCamera(CameraUpdateFactory.newLatLngZoom(userLatLng, 15f))
                }
            }
        }
    }


    private fun initChatList(){
        val chatButton = findViewById<ImageView>(R.id.map_activity_chat_button)
        chatButton.setOnClickListener {
            if (UserCredentialManager.isLoggedIn(this@MapsActivity)) {
                startActivity(Intent(this@MapsActivity, ChooseChatActivity::class.java))
            }
            else {
                android.app.AlertDialog.Builder(this@MapsActivity)
                    .setTitle("Login is required to chat with others")
                    .setNegativeButton("Okay", null)
                    .show()
            }
        }
    }
    private fun initSearchLocation(){
        // Initialize Places Client and Session Token
        placesClient = Places.createClient(this)
        sessionToken = AutocompleteSessionToken.newInstance()

        // Find AutoCompleteTextView in the layout
        autoCompleteTextView = findViewById(R.id.locationAutoCompleteTextView)
        // Instantiate the autocomplete helper

        PlaceAutocompleteHelper(
            context = this,
            autoCompleteTextView = autoCompleteTextView,
            placesClient = placesClient,
            sessionToken = sessionToken,
            onPredictionSelected = { prediction ->
                // Handle the selected prediction
                val placeId = prediction.placeId
                val fetchPlaceRequest = com.google.android.libraries.places.api.net.FetchPlaceRequest.builder(
                    placeId,
                    listOf(com.google.android.libraries.places.api.model.Place.Field.LAT_LNG)
                ).build()

                placesClient.fetchPlace(fetchPlaceRequest)
                    .addOnSuccessListener { response ->
                        val place = response.place
                        place.latLng?.let {
                            searchLatitude = it.latitude
                            searchLongitude = it.longitude
                        }
                    }
                    .addOnFailureListener { exception ->
                        // Handle failure
                    }
            },

        )

        autoCompleteTextView.setOnEditorActionListener { _, actionId, event ->
            val isEnterPressed = actionId == EditorInfo.IME_ACTION_SEARCH ||
                    actionId == EditorInfo.IME_ACTION_DONE ||
                    (event?.action == KeyEvent.ACTION_DOWN && event.keyCode == KeyEvent.KEYCODE_ENTER)
            if (isEnterPressed) {
                if (searchLatitude != null && searchLongitude != null) {
                    moveMapCameraTo(searchLatitude!!, searchLongitude!!)
                }
                autoCompleteTextView.clearFocus()
                autoCompleteTextView.clearComposingText()
                autoCompleteTextView.text = null

                true // Consume the event.
            } else {
                false
            }
        }
    }

    private fun moveMapCameraTo(latitude: Double, longitude: Double) {
        val latLng = LatLng(latitude, longitude)
        val cameraUpdate = CameraUpdateFactory.newLatLngZoom(latLng, 15f)
        mMap.animateCamera(cameraUpdate)
    }


    private fun updateProfile(){
        val sign_in_button = findViewById<Button>(R.id.sign_in_button)
        val profile_button = findViewById<ImageView>(R.id.map_activity_profile_button)
        if (UserCredentialManager.isLoggedIn(this)) {
            sign_in_button.visibility = View.GONE
            profile_button.visibility = View.VISIBLE
            val (username, profilePicture) = UserCredentialManager.getUserProfile(this)
            Glide.with(this)
                .load(profilePicture)
                .into(profile_button)
            profile_button.setOnClickListener {
                startActivity(Intent(this, ProfileActivity::class.java))
            }
        }
        else{
            sign_in_button.visibility = View.VISIBLE
            profile_button.visibility = View.GONE
        }
    }

    private fun handleSignIn(result: GetCredentialResponse) {
        val credential = result.credential
        if (credential !is CustomCredential || credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
            Log.e(TAG, "Unexpected type of credential")
            return
        }

        try {
            val googleCredential = GoogleIdTokenCredential.createFrom(credential.data)
            googleCredential.displayName?.let { username ->
                UserCredentialManager.saveUserProfile(this@MapsActivity, username, googleCredential.profilePictureUri.toString())
            }
            sendSignInRequest(googleCredential.idToken)
        } catch (e: GoogleIdTokenParsingException) {
            Log.e(TAG, "Received an invalid google id token response", e)
        }
    }

    private fun sendSignInRequest(token: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {

                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(android.Manifest.permission.POST_NOTIFICATIONS),
                    1
                )
            }
        }
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (!task.isSuccessful) {
                // Handle failure
                Log.w("Firebase", "Fetching FCM registration token failed", task.exception)
            }
            else {
                val body = JSONObject()
                    .put("googleToken", token)
                    .put("firebaseToken", task.result)
                    .toString()

                lifecycleScope.launch {
                    val response = HTTPRequest.sendPostRequest(
                        "${BuildConfig.SERVER_ADDRESS}/user/auth",
                        body,
                        this@MapsActivity
                    )
                    Log.d(TAG, "sendPostRequest: $response")
                    if (response != null) {
                        val signInResponse = Gson().fromJson(response, SignInResponse::class.java)
                        JwtManager.saveToken(this@MapsActivity, signInResponse.token)
                        val userID = signInResponse.userID
                        UserCredentialManager.saveUserId(this@MapsActivity, userID)
                        updateProfile()
                    }
                }
            }
        }
    }

    @SuppressLint("PotentialBehaviorOverride")
    override fun onMapReady(googleMap: GoogleMap) {
        mMap = googleMap
        clusterHelper = MapClusterHelper(this, mMap)
        googleMap.setOnCameraIdleListener {
            clusterHelper.getPostsOnScreen(googleMap, userPostOnly)
        }

        if (LocationPermission.checkLocationPermission(this)) {
            mMap.isMyLocationEnabled = true
            getUserLocation()

        }

        mMap.setOnMarkerClickListener { marker ->
            Toast.makeText(this, "Loading post...", Toast.LENGTH_SHORT).show()
            val tag = marker.tag
            Log.d(TAG, "Marker clicked: $tag")
            if (tag is String) {
                Log.d(TAG, "Single post clicked: $tag")
                // TODO: Open post details using tag (post ID)
            } else if (tag is List<*>) {
                Log.d(TAG, "Aggregated marker clicked with ${tag.size} posts")
                // TODO: Handle aggregated marker click (e.g., zoom in or show list)
            }
            if((tag as List<PostItemRaw>).size == 1){
                PostHelper.showPostActivity(tag[0], this@MapsActivity)

            }
            else{
                clusterHelper.showClusterDialog(tag as List<PostItemRaw>)
            }
            true
        }
    }

}

class PostClusterAdapter(
    private val posts: List<PostItemRaw>,
    private val context: Context
) : RecyclerView.Adapter<PostClusterAdapter.PostViewHolder>() {

    class PostViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val imageView: ImageView = itemView.findViewById(R.id.map_activity_post_image)
        val locationTextView: TextView = itemView.findViewById(R.id.map_activity_post_location)

        fun bind(post: PostItemRaw){
            val image = post.images[0]
            val byteArray = image.fileData.data.map { it.toByte() }.toByteArray()
            val options = BitmapFactory.Options().apply {
                inSampleSize = calculateInSampleSize(byteArray, 100, 100)
            }
            val bitmap = BitmapFactory.decodeByteArray(byteArray, 0, byteArray.size, options)

            imageView.setImageBitmap(bitmap)
            val location = commonFunction.parseLocation(post.latitude, post.longitude, itemView.context)
            locationTextView.text = location


            itemView.setOnClickListener{
                PostHelper.showPostActivity(post, itemView.context)
            }

            itemView.setOnTouchListener { _, event ->

                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        // Apply a dark overlay
                        imageView.setColorFilter(Color.argb(50, 0, 0, 0))
                    }
                    MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                        // Clear the overlay
                        imageView.clearColorFilter()
                    }

                    MotionEvent.ACTION_BUTTON_PRESS -> {
                        itemView.performClick()
                    }
                }
                // Return false to allow the click event to be processed
                false
            }

        }
        private fun calculateInSampleSize(byteArray: ByteArray, reqWidth: Int, reqHeight: Int): Int {
            val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeByteArray(byteArray, 0, byteArray.size, options)
            val (height: Int, width: Int) = options.run { outHeight to outWidth }
            var inSampleSize = 1
            if (height > reqHeight || width > reqWidth) {
                val halfHeight = height / 2
                val halfWidth = width / 2
                while (halfHeight / inSampleSize >= reqHeight && halfWidth / inSampleSize >= reqWidth) {
                    inSampleSize *= 2
                }
            }
            return inSampleSize
        }

    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): PostViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.map_activity_post_item, parent, false)
        return PostViewHolder(view)
    }

    override fun onBindViewHolder(holder: PostViewHolder, position: Int) {
        holder.bind(posts[position])
    }

    override fun getItemCount(): Int = posts.size

}


