package com.example.tomato

import PostHelper
import android.util.Base64
import android.Manifest
import android.app.DatePickerDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Geocoder
import android.location.Location
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import android.widget.ViewSwitcher
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.gms.location.LocationServices
import com.google.gson.Gson
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

class UploadPostActivity : AppCompatActivity() {

    private lateinit var recyclerView: RecyclerView
    private lateinit var imageAdapter: ImageAdapter
    private lateinit var uploadViewSwitch: ViewSwitcher
    private var postVisibility: String = ""

    private var imageUris = mutableListOf<Uri>()
    private var postLatitude: Double = 0.0
    private var postLongitude: Double = 0.0
    private var postLocationName: String = ""
    private var postDate: String = ""

    companion object {
        private const val TAG = "UploadPostActivity"
    }

    // Register post Visibility launcher (the form to obtain the post's visibility)
    private val postVisibilityActivityLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            val data = result.data
            postVisibility = data?.getStringExtra("visibility") ?: ""
        }

        if(postVisibility != ""){
            updateVisibility()
        }
    }

    private val postLocationActivityLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            val data = result.data
            postLatitude = data?.getDoubleExtra("latitude", -1.0) ?: -1.0
            postLongitude = data?.getDoubleExtra("longitude", -1.0) ?: -1.0
            postLocationName = data?.getStringExtra("locationName") ?: ""
        }

        if (postLocationName != ""){
            updateLocation()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_upload_post)
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }
        initImageViewer()
        addClickListenersToPostInfoButtons()
        Log.d(TAG, "onCreate")

        val backButton = findViewById<ImageView>(R.id.upload_post_back)
        backButton.setOnClickListener {
            finish()
        }
    }

    private fun addClickListenersToPostInfoButtons() {
        // Add click listener to the + button (add photos) so it opens album/gallery.
        val addPhotosButton = findViewById<ImageView>(R.id.addPhotoButton)
        addPhotosButton.setOnClickListener {
            getMultipleImagesLauncher.launch("image/*")
        }

        // Add click listener to the location button (set location for the post)
        val locationButton = findViewById<LinearLayout>(R.id.addLocation)
        locationButton.setOnClickListener {
            val intent = Intent(this, ChooseLocationActivity::class.java)
            postLocationActivityLauncher.launch(intent)
        }

        // Add click listener for Visibility button
        val visibilityButton = findViewById<LinearLayout>(R.id.setVisibility)
        visibilityButton.setOnClickListener {
            val intent = Intent(this, ChoosePostVisibilityActivity::class.java)
            postVisibilityActivityLauncher.launch(intent)
        }

        // Add click listener for Date button
        val dateButton = findViewById<LinearLayout>(R.id.setDate)
        dateButton.setOnClickListener {
            // Get the current date from Calendar instance
            val calendar = Calendar.getInstance()
            val year = calendar.get(Calendar.YEAR)
            val month = calendar.get(Calendar.MONTH)
            val day = calendar.get(Calendar.DAY_OF_MONTH)

            // Create a DatePickerDialog
            val datePickerDialog = DatePickerDialog(
                this,
                { _, selectedYear, selectedMonth, selectedDay ->
                    // This block is executed when the user selects a date.
                    // Note: selectedMonth is zero-based (0 = January, 11 = December)
                    val chosenDate = "$selectedDay/${selectedMonth + 1}/$selectedYear"
                    postDate = chosenDate
                    updateDate()
                },
                year, month, day
            )

            // Show the DatePickerDialog
            datePickerDialog.show()
        }

        // Add click listener to upload post
        val uploadPostButton = findViewById<Button>(R.id.upload_post_button)
        uploadPostButton.setOnClickListener {
            uploadPost()
        }
    }

    private fun uploadPost(){
        // Ensure the post contains required items
        if (verifyUploadRequirement()) {

            // Convert ImageURIs to Bytes (Raw data)
            val imageBytes: List<ByteArray> = imageUris.mapNotNull { uri ->
                commonFunction.getCompressedImageByteArray(this, uri)
            }

            // Convert the Bytes to Base64 encoded strings
            val base64Strings: List<String> = imageBytes.map { bytes ->
                Base64.encodeToString(bytes, Base64.NO_WRAP)
            }

            // JSON-ify the base64strings array so it can be parsed easily on the server
            val imageArray = JSONArray(base64Strings)
            val noteText = findViewById<TextView>(R.id.noteText)


            val note = noteText.text.toString()
            val postIsPrivate = postVisibility == "Private"
            val dateFormatter = SimpleDateFormat("dd/MM/yyyy")
            val date: Date? = dateFormatter.parse(postDate)

            val body = JSONObject().put("latitude", postLatitude).put("longitude", postLongitude)
                .put("images", imageArray).put("date", date)
                .put("note", note).put("isPrivate", postIsPrivate)
                .toString()

            lifecycleScope.launch {
                val response = HTTPRequest.sendPostRequest(
                    "${BuildConfig.SERVER_ADDRESS}/posts",
                    body, this@UploadPostActivity
                )
                //TODO: Handle response
                if (response != null) {
                    Toast.makeText(
                        this@UploadPostActivity,
                        "Post uploaded successfully",
                        Toast.LENGTH_SHORT
                    ).show()
                    val gson = Gson()
                    val post = gson.fromJson(response, PostItemRaw::class.java)
                    PostHelper.showPostActivity(post, this@UploadPostActivity)

                    //clear fields
                    imageUris = mutableListOf()
                    postVisibility = ""
                    postLocationName = ""
                    postDate = ""

                    noteText.text = ""
                    updateViewSwitch()
                    updateVisibility()
                    updateLocation()
                    updateDate()
                } else {
                    Toast.makeText(
                        this@UploadPostActivity,
                        "Post upload failed",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }

            val backButton = findViewById<ImageView>(R.id.upload_post_back)
            backButton.setOnClickListener {
                finish()
            }
        }
    }

    private fun verifyUploadRequirement(): Boolean{
        if(imageUris.isEmpty()){
            Toast.makeText(this, "Please add at least one image", Toast.LENGTH_SHORT).show()
            return false
        }
        if(postVisibility == ""){
            Toast.makeText(this, "Please set a visibility", Toast.LENGTH_SHORT).show()
            return false
        }
        if(postLocationName == ""){
            Toast.makeText(this, "Please set a location", Toast.LENGTH_SHORT).show()
            return false
        }
        if(postDate == ""){
            Toast.makeText(this, "Please set a date", Toast.LENGTH_SHORT).show()
            return false
        }

        return true
    }

    private fun updateLocation(){
        if(postLocationName == ""){
            setLogoColor(R.drawable.upload_post_location, R.id.setLocationImage, R.color.black)
            val locationText = findViewById<TextView>(R.id.setLocationText)
            locationText.text = "Location"
        }
        else{
            setLogoColor(R.drawable.upload_post_location, R.id.setLocationImage, R.color.blue)
            val locationText = findViewById<TextView>(R.id.setLocationText)
            locationText.text = postLocationName

        }
    }

    private fun updateVisibility(){
        if(postVisibility == ""){
            setLogoColor(R.drawable.visibility, R.id.setVisibilityImage, R.color.black)
            val visibilityText = findViewById<TextView>(R.id.setVisibilityText)
            visibilityText.text = "Visibility"
        }
        else{
            setLogoColor(R.drawable.visibility, R.id.setVisibilityImage, R.color.blue)
            val visibilityText = findViewById<TextView>(R.id.setVisibilityText)
            visibilityText.text = postVisibility

        }
    }

    private fun updateDate(){
        val dateText = findViewById<TextView>(R.id.setDateText)
        if(postDate == ""){
            setLogoColor(R.drawable.upload_post_date, R.id.setDateImage, R.color.black)
            dateText.text = "Date"
        }
        else {
            dateText.text = postDate
            setLogoColor(R.drawable.upload_post_date, R.id.setDateImage, R.color.blue)
        }
    }


    private fun initImageViewer(){
        // Init viewSwitcher & Show the empty view
        uploadViewSwitch = findViewById(R.id.uploadViewSwitch)
        uploadViewSwitch.displayedChild = 0

        // Set up RecyclerView (the horizontal scrollable view of the uploaded images)
        recyclerView = findViewById(R.id.uploaded_image_recycler)
        recyclerView.layoutManager =
            LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false)
        imageAdapter = ImageAdapter(imageUris, ::updateViewSwitch)
        recyclerView.adapter = imageAdapter

    }

    private fun setLogoColor(logoID: Int, imageID: Int, colorID: Int){
        val logo = ContextCompat.getDrawable(this, logoID)
        val image = findViewById<ImageView>(imageID)
        val color = ContextCompat.getColor(this, colorID)
        logo?.setTint(color)
        image.setImageDrawable(logo)
    }

    private fun updateViewSwitch(){
        if(imageUris.isEmpty()){
            uploadViewSwitch.displayedChild = 0
        }
        else{
            uploadViewSwitch.displayedChild = 1
        }
    }

    private val getMultipleImagesLauncher = registerForActivityResult(
        ActivityResultContracts.GetMultipleContents()
    ) {
        uris: List<Uri> ->
        // Filter out duplicate images
        val newUris = uris.filter { it !in imageUris }

        // Warn users if there are images not uploaded due to duplication
        if (newUris.count() != uris.count()) {
            val duplicateCount = uris.count() - newUris.count()
            Toast.makeText(
                this,
                "$duplicateCount duplicate images are not uploaded",
                Toast.LENGTH_SHORT
            ).show()
        }
        imageAdapter.addImage(newUris)
    }
}

/**
 * Manages the uploaded imageps of the RecyclerView (the horizontal scrollable view of uploaded images).
 */
class ImageAdapter(private val imageUris: MutableList<Uri>, private val updateUI: () -> Unit) : RecyclerView.Adapter<ImageAdapter.ImageViewHolder>() {

    class ImageViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val imageView: ImageView = itemView.findViewById(R.id.upload_post_postImage)
        val removeButton: ImageButton = itemView.findViewById(R.id.removeImageButton)
    }

    /**
     * Customize the view to the image item on the RecyclerView.
     */
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ImageViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.upload_post_image_item, parent, false)
        return ImageViewHolder(view)
    }

    override fun onBindViewHolder(holder: ImageViewHolder, position: Int) {
        holder.imageView.setImageURI(imageUris[position])
        holder.removeButton.setOnClickListener() {
            removeImage(position)

        }
    }

    override fun getItemCount(): Int = imageUris.size

    fun addImage(newUris: List<Uri>) {
        imageUris.addAll(newUris)
        notifyItemRangeInserted(imageUris.size - newUris.size, newUris.size)
        updateUI()
    }

    fun removeImage(position: Int) {
        imageUris.removeAt(position)
        notifyItemRemoved(position)   // Notify RecyclerView about the removal
        notifyItemRangeChanged(position, imageUris.size)  // Update indexes of remaining items
        updateUI()
    }
}
